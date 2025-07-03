import { TransferRecord, Cylinder, Outlet, User } from '../models';
import { Op, WhereOptions, Order, Includeable } from 'sequelize';
import { AppError } from '../utils/errors';
import { Parser } from 'json2csv';
import type { TransferRecordAttributes } from '../types/transfer.types';
import type { CylinderAttributes } from '../types/cylinder.types';

interface TransferFilters {
  fromDate?: Date;
  toDate?: Date;
  fromOutletId?: number;
  toOutletId?: number;
  cylinderCode?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface TransferStatistics {
  totalTransfers: number;
  pendingTransfers: number;
  completedTransfers: number;
  rejectedTransfers: number;
  transfersByDay: Array<{
    date: string;
    count: number;
  }>;
  topCylinders: Array<{
    cylinderCode: string;
    cylinderId: number;
    transferCount: number;
  }>;
  transfersByOutlet: Array<{
    outletId: number;
    outletName: string;
    sentCount: number;
    receivedCount: number;
  }>;
}

class TransferService {
  async getTransferHistory(filters: TransferFilters): Promise<any> {
    const {
      fromDate,
      toDate,
      fromOutletId,
      toOutletId,
      cylinderCode,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const where: WhereOptions<TransferRecordAttributes> = {};
    const cylinderWhere: WhereOptions<CylinderAttributes> = {};

    // Build where conditions
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) (where.createdAt as any)[Op.gte] = fromDate;
      if (toDate) (where.createdAt as any)[Op.lte] = toDate;
    }

    if (fromOutletId) where.fromOutletId = fromOutletId;
    if (toOutletId) where.toOutletId = toOutletId;
    if (status) where.status = status;
    if (cylinderCode) cylinderWhere.cylinderCode = { [Op.like]: `%${cylinderCode}%` };

    const include: Includeable[] = [
      {
        model: Cylinder,
        as: 'cylinder',
        where: Object.keys(cylinderWhere).length > 0 ? cylinderWhere : undefined,
        attributes: ['id', 'cylinderCode', 'type', 'qrCode']
      },
      {
        model: Outlet,
        as: 'fromOutlet',
        attributes: ['id', 'name', 'location']
      },
      {
        model: Outlet,
        as: 'toOutlet',
        attributes: ['id', 'name', 'location']
      },
      {
        model: User,
        as: 'transferredBy',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: User,
        as: 'initiatedBy',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: User,
        as: 'acceptedBy',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }
    ];

    const order: Order = [[sortBy, sortOrder]];
    const offset = (page - 1) * limit;

    const { rows: transfers, count: total } = await TransferRecord.findAndCountAll({
      where,
      include,
      order,
      limit,
      offset,
      distinct: true
    });

    return {
      transfers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getTransferById(id: number): Promise<any> {
    const transfer = await TransferRecord.findByPk(id, {
      include: [
        {
          model: Cylinder,
          as: 'cylinder',
          attributes: ['id', 'cylinderCode', 'type', 'qrCode', 'currentGasVolume', 'maxGasVolume']
        },
        {
          model: Outlet,
          as: 'fromOutlet',
          attributes: ['id', 'name', 'location', 'contactPhone', 'contactEmail']
        },
        {
          model: Outlet,
          as: 'toOutlet',
          attributes: ['id', 'name', 'location', 'contactPhone', 'contactEmail']
        },
        {
          model: User,
          as: 'transferredBy',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'initiatedBy',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'acceptedBy',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          required: false
        }
      ]
    });

    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    return transfer;
  }

  async getTransferStatistics(filters: {
    fromDate?: Date;
    toDate?: Date;
    outletId?: number;
  }): Promise<TransferStatistics> {
    const { fromDate, toDate, outletId } = filters;
    const where: WhereOptions<TransferRecordAttributes> = {};

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) (where.createdAt as any)[Op.gte] = fromDate;
      if (toDate) (where.createdAt as any)[Op.lte] = toDate;
    }

    if (outletId) {
      (where as any)[Op.or] = [
        { fromOutletId: outletId },
        { toOutletId: outletId }
      ];
    }

    // Get transfer counts by status
    const [
      totalTransfers,
      pendingTransfers,
      completedTransfers,
      rejectedTransfers
    ] = await Promise.all([
      TransferRecord.count({ where }),
      TransferRecord.count({ where: { ...where, status: 'pending' } }),
      TransferRecord.count({ where: { ...where, status: 'completed' } }),
      TransferRecord.count({ where: { ...where, status: 'rejected' } })
    ]);

    // Get transfers by day
    const transfersByDay = await TransferRecord.findAll({
      where,
      attributes: [
        [TransferRecord.sequelize!.fn('DATE', TransferRecord.sequelize!.col('createdAt')), 'date'],
        [TransferRecord.sequelize!.fn('COUNT', TransferRecord.sequelize!.col('id')), 'count']
      ],
      group: ['date'],
      order: [['date', 'DESC']],
      limit: 30,
      raw: true
    }) as any[];

    // Get top cylinders
    const topCylinders = await TransferRecord.findAll({
      where,
      attributes: [
        'cylinderId',
        [TransferRecord.sequelize!.fn('COUNT', TransferRecord.sequelize!.col('TransferRecord.id')), 'transferCount']
      ],
      include: [{
        model: Cylinder,
        as: 'cylinder',
        attributes: ['cylinderCode']
      }],
      group: ['cylinderId', 'cylinder.id'],
      order: [[TransferRecord.sequelize!.fn('COUNT', TransferRecord.sequelize!.col('TransferRecord.id')), 'DESC']],
      limit: 10,
      raw: true,
      nest: true
    }) as any[];

    // Get transfers by outlet
    const sentTransfers = await TransferRecord.findAll({
      where: outletId ? { fromOutletId: outletId } : where,
      attributes: [
        'fromOutletId',
        [TransferRecord.sequelize!.fn('COUNT', TransferRecord.sequelize!.col('TransferRecord.id')), 'sentCount']
      ],
      include: [{
        model: Outlet,
        as: 'fromOutlet',
        attributes: ['name']
      }],
      group: ['fromOutletId', 'fromOutlet.id'],
      raw: true,
      nest: true
    }) as any[];

    const receivedTransfers = await TransferRecord.findAll({
      where: outletId ? { toOutletId: outletId } : where,
      attributes: [
        'toOutletId',
        [TransferRecord.sequelize!.fn('COUNT', TransferRecord.sequelize!.col('TransferRecord.id')), 'receivedCount']
      ],
      include: [{
        model: Outlet,
        as: 'toOutlet',
        attributes: ['name']
      }],
      group: ['toOutletId', 'toOutlet.id'],
      raw: true,
      nest: true
    }) as any[];

    // Combine outlet statistics
    const outletMap = new Map();
    
    sentTransfers.forEach((item: any) => {
      const outletId = item.fromOutletId;
      if (!outletMap.has(outletId)) {
        outletMap.set(outletId, {
          outletId,
          outletName: item.fromOutlet.name,
          sentCount: 0,
          receivedCount: 0
        });
      }
      outletMap.get(outletId).sentCount = parseInt(item.sentCount);
    });

    receivedTransfers.forEach((item: any) => {
      const outletId = item.toOutletId;
      if (!outletMap.has(outletId)) {
        outletMap.set(outletId, {
          outletId,
          outletName: item.toOutlet.name,
          sentCount: 0,
          receivedCount: 0
        });
      }
      outletMap.get(outletId).receivedCount = parseInt(item.receivedCount);
    });

    const transfersByOutlet = Array.from(outletMap.values());

    return {
      totalTransfers,
      pendingTransfers,
      completedTransfers,
      rejectedTransfers,
      transfersByDay: transfersByDay.map(item => ({
        date: item.date,
        count: parseInt(item.count)
      })),
      topCylinders: topCylinders.map((item: any) => ({
        cylinderCode: item.cylinder.cylinderCode,
        cylinderId: item.cylinderId,
        transferCount: parseInt(item.transferCount)
      })),
      transfersByOutlet
    };
  }

  async exportTransfers(filters: TransferFilters, format: 'csv' | 'excel' = 'csv') {
    // Get all transfers without pagination for export
    const allFilters = { ...filters, limit: 10000, page: 1 };
    const { transfers } = await this.getTransferHistory(allFilters);

    // Transform data for export
    const exportData = transfers.map((transfer: any) => {
      const transferData = transfer.toJSON() as any;
      return {
        'Transfer ID': transferData.id,
        'Date': transferData.createdAt,
        'Cylinder Code': transferData.cylinder?.cylinderCode || '',
        'From Outlet': transferData.fromOutlet?.name || '',
        'To Outlet': transferData.toOutlet?.name || '',
        'Status': transferData.status,
        'Initiated By': `${transferData.transferredBy?.firstName || ''} ${transferData.transferredBy?.lastName || ''}`.trim(),
        'Accepted By': transferData.acceptedBy ? `${transferData.acceptedBy.firstName || ''} ${transferData.acceptedBy.lastName || ''}`.trim() : '',
        'Accepted Date': transferData.acceptedAt || '',
        'Rejected Date': transferData.rejectedAt || '',
        'Rejection Reason': transferData.rejectionReason || '',
        'Notes': transferData.notes || ''
      };
    });

    if (format === 'csv') {
      const fields = Object.keys(exportData[0] || {});
      const parser = new Parser({ fields });
      const csv = parser.parse(exportData);
      return {
        data: csv,
        contentType: 'text/csv',
        filename: `transfers-${new Date().toISOString().split('T')[0]}.csv`
      };
    }

    // For Excel format, we would use a library like exceljs
    // This is a placeholder for now
    throw new AppError('Excel export not implemented yet', 501);
  }

  async acceptTransfer(id: number, userId: number, notes?: string): Promise<any> {
    const transfer = await TransferRecord.findByPk(id);
    
    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    if (transfer.status !== 'pending') {
      throw new AppError('Only pending transfers can be accepted', 400);
    }

    // Check if user has permission (must be at the destination outlet)
    const user = await User.findByPk(userId, {
      include: [{ model: Outlet, as: 'outlet' }]
    });

    if (!user || user.outletId !== transfer.toOutletId) {
      throw new AppError('You can only accept transfers at your outlet', 403);
    }

    // Update cylinder's current outlet
    await Cylinder.update(
      { currentOutletId: transfer.toOutletId },
      { where: { id: transfer.cylinderId } }
    );

    // Update transfer
    await transfer.update({
      status: 'completed',
      acceptedById: userId,
      acceptedAt: new Date(),
      notes: notes || transfer.notes
    });

    // Return updated transfer with relations
    return this.getTransferById(id);
  }

  async rejectTransfer(id: number, userId: number, rejectionReason: string): Promise<any> {
    const transfer = await TransferRecord.findByPk(id);
    
    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    if (transfer.status !== 'pending') {
      throw new AppError('Only pending transfers can be rejected', 400);
    }

    // Check if user has permission (must be at the destination outlet)
    const user = await User.findByPk(userId, {
      include: [{ model: Outlet, as: 'outlet' }]
    });

    if (!user || user.outletId !== transfer.toOutletId) {
      throw new AppError('You can only reject transfers at your outlet', 403);
    }

    // Update transfer
    await transfer.update({
      status: 'rejected',
      acceptedById: userId,
      rejectedAt: new Date(),
      rejectionReason
    });

    // Return updated transfer with relations
    return this.getTransferById(id);
  }
}

export default new TransferService();