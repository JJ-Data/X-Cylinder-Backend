import { Cylinder, Outlet, LeaseRecord, RefillRecord, User, TransferRecord } from '@models/index';
import {
  CylinderCreationAttributes,
  CylinderUpdateAttributes,
  CylinderPublicData,
} from '@app-types/cylinder.types';
import { AppError } from '@utils/errors';
import { CONSTANTS } from '@config/constants';
import { sequelize } from '@config/database';
import { Transaction, Op } from 'sequelize';
import * as crypto from 'crypto';
import { qrService } from './qr.service';

export class CylinderService {
  private generateQRCode(cylinderCode: string): string {
    // Generate a unique QR code identifier
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256').update(`${cylinderCode}-${timestamp}`).digest('hex');
    return `QR-${cylinderCode}-${hash.substring(0, 8)}`;
  }

  async createCylinder(
    data: CylinderCreationAttributes,
    transaction?: Transaction
  ): Promise<CylinderPublicData> {
    try {
      // Verify outlet exists
      const outlet = await Outlet.findByPk(data.currentOutletId);
      if (!outlet) {
        throw new AppError('Outlet not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }

      // Generate QR code if not provided
      const cylinderData = {
        ...data,
        qrCode: data.qrCode || this.generateQRCode(data.cylinderCode),
        currentGasVolume: data.currentGasVolume || 0,
      };

      const cylinder = await Cylinder.create(cylinderData, { transaction });
      return cylinder.toJSON() as CylinderPublicData;
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError(
          'Cylinder with this code already exists',
          CONSTANTS.HTTP_STATUS.CONFLICT
        );
      }
      throw error;
    }
  }

  async updateCylinder(
    id: number,
    data: CylinderUpdateAttributes,
    transaction?: Transaction
  ): Promise<CylinderPublicData> {
    const cylinder = await Cylinder.findByPk(id);
    if (!cylinder) {
      throw new AppError('Cylinder not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    // If updating outlet, verify it exists
    if (data.currentOutletId) {
      const outlet = await Outlet.findByPk(data.currentOutletId);
      if (!outlet) {
        throw new AppError('Outlet not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }
    }

    await cylinder.update(data, { transaction });
    return cylinder.toJSON() as CylinderPublicData;
  }

  async getCylinderById(id: number): Promise<CylinderPublicData> {
    const cylinder = await Cylinder.findByPk(id, {
      include: [
        {
          model: Outlet,
          as: 'currentOutlet',
          attributes: ['id', 'name', 'location'],
        },
      ],
    });

    if (!cylinder) {
      throw new AppError('Cylinder not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    return cylinder.toJSON() as CylinderPublicData;
  }

  async getCylinderByCode(cylinderCode: string): Promise<CylinderPublicData> {
    const cylinder = await Cylinder.findOne({
      where: { cylinderCode },
      include: [
        {
          model: Outlet,
          as: 'currentOutlet',
          attributes: ['id', 'name', 'location'],
        },
      ],
    });

    if (!cylinder) {
      throw new AppError('Cylinder not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    return cylinder.toJSON() as CylinderPublicData;
  }

  async getCylinderByQRCode(qrCode: string): Promise<CylinderPublicData> {
    const cylinder = await Cylinder.findOne({
      where: { qrCode },
      include: [
        {
          model: Outlet,
          as: 'currentOutlet',
          attributes: ['id', 'name', 'location'],
        },
      ],
    });

    if (!cylinder) {
      throw new AppError('Cylinder not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    return cylinder.toJSON() as CylinderPublicData;
  }

  async searchCylinders(filters: {
    outletId?: number;
    status?: string;
    type?: string;
    searchTerm?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    cylinders: CylinderPublicData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters.page || CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(filters.limit || CONSTANTS.DEFAULT_PAGE_SIZE, CONSTANTS.MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const where: any = {};

    if (filters.outletId) {
      where.currentOutletId = filters.outletId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.searchTerm) {
      where[Op.or] = [
        { cylinderCode: { [Op.like]: `%${filters.searchTerm}%` } },
        { qrCode: { [Op.like]: `%${filters.searchTerm}%` } },
      ];
    }

    const { count, rows } = await Cylinder.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: Outlet,
          as: 'currentOutlet',
          attributes: ['id', 'name', 'location'],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    return {
      cylinders: rows.map((cylinder) => cylinder.toJSON() as CylinderPublicData),
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getAvailableCylinders(outletId: number, type?: string): Promise<CylinderPublicData[]> {
    const where: any = {
      currentOutletId: outletId,
      status: 'available',
    };

    if (type) {
      where.type = type;
    }

    const cylinders = await Cylinder.findAll({
      where,
      include: [
        {
          model: Outlet,
          as: 'currentOutlet',
          attributes: ['id', 'name', 'location'],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    return cylinders.map((cylinder) => cylinder.toJSON() as CylinderPublicData);
  }

  async getCylinderHistory(cylinderId: number): Promise<{
    cylinder: CylinderPublicData;
    leaseHistory: any[];
    refillHistory: any[];
    transferHistory: any[];
  }> {
    const cylinder = await this.getCylinderById(cylinderId);

    const [leaseHistory, refillHistory, transferHistory] = await Promise.all([
      LeaseRecord.findAll({
        where: { cylinderId },
        include: [
          { model: User, as: 'customer', attributes: ['id', 'email', 'firstName', 'lastName'] },
          { model: User, as: 'staff', attributes: ['id', 'email', 'firstName', 'lastName'] },
          { model: Outlet, as: 'outlet', attributes: ['id', 'name'] },
        ],
        order: [['leaseDate', 'DESC']],
        limit: 10,
      }),
      RefillRecord.findAll({
        where: { cylinderId },
        include: [
          { model: User, as: 'operator', attributes: ['id', 'email', 'firstName', 'lastName'] },
          { model: Outlet, as: 'outlet', attributes: ['id', 'name'] },
        ],
        order: [['refillDate', 'DESC']],
        limit: 10,
      }),
      TransferRecord.findAll({
        where: { cylinderId },
        include: [
          { model: Outlet, as: 'fromOutlet', attributes: ['id', 'name'] },
          { model: Outlet, as: 'toOutlet', attributes: ['id', 'name'] },
          { model: User, as: 'initiatedBy', attributes: ['id', 'email', 'firstName', 'lastName'] },
          { model: User, as: 'acceptedBy', attributes: ['id', 'email', 'firstName', 'lastName'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
    ]);

    return {
      cylinder,
      leaseHistory: leaseHistory.map((record) => record.toJSON()),
      refillHistory: refillHistory.map((record) => record.toJSON()),
      transferHistory: transferHistory.map((record) => record.toJSON()),
    };
  }

  async retireCylinder(id: number, reason: string): Promise<void> {
    const cylinder = await Cylinder.findByPk(id);
    if (!cylinder) {
      throw new AppError('Cylinder not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    if (cylinder.getDataValue('status') === 'leased') {
      throw new AppError('Cannot retire a leased cylinder', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
    }

    await cylinder.update({
      status: 'retired',
      notes: reason,
    });
  }

  async bulkCreateCylinders(cylinders: CylinderCreationAttributes[]): Promise<number> {
    const transaction = await sequelize.transaction();

    try {
      const createdCylinders = await Promise.all(
        cylinders.map((cylinderData) => {
          const data = {
            ...cylinderData,
            qrCode: cylinderData.qrCode || this.generateQRCode(cylinderData.cylinderCode),
            currentGasVolume: cylinderData.currentGasVolume || 0,
          };
          return Cylinder.create(data, { transaction });
        })
      );

      await transaction.commit();
      return createdCylinders.length;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getCylinderQRCode(cylinderId: number): Promise<{
    dataURL: string;
    qrData: string;
    cylinder: CylinderPublicData;
  }> {
    const cylinder = await this.getCylinderById(cylinderId);
    
    const qrResult = await qrService.generateCylinderQR({
      cylinderId: cylinder.id,
      cylinderCode: cylinder.cylinderCode,
      type: cylinder.type,
      outletId: cylinder.currentOutletId,
      qrCode: cylinder.qrCode,
    });

    return {
      ...qrResult,
      cylinder,
    };
  }

  async generateBulkQRCodes(cylinderIds: number[]): Promise<{
    success: Array<{ cylinderId: number; dataURL: string }>;
    failed: Array<{ cylinderId: number; error: string }>;
  }> {
    const results = {
      success: [] as Array<{ cylinderId: number; dataURL: string }>,
      failed: [] as Array<{ cylinderId: number; error: string }>,
    };

    await Promise.all(
      cylinderIds.map(async (cylinderId) => {
        try {
          const qrData = await this.getCylinderQRCode(cylinderId);
          results.success.push({
            cylinderId,
            dataURL: qrData.dataURL,
          });
        } catch (error: any) {
          results.failed.push({
            cylinderId,
            error: error.message || 'Failed to generate QR code',
          });
        }
      })
    );

    return results;
  }

  async transferCylinder(
    cylinderId: number,
    toOutletId: number,
    transferredById: number,
    reason?: string,
    notes?: string
  ): Promise<any> {
    const transaction = await sequelize.transaction();

    try {
      // Get cylinder with current outlet
      const cylinder = await Cylinder.findByPk(cylinderId, {
        include: [
          {
            model: Outlet,
            as: 'currentOutlet',
          },
          {
            model: LeaseRecord,
            as: 'leaseRecords',
            where: { leaseStatus: 'active' },
            required: false,
          },
        ],
        transaction,
      });

      if (!cylinder) {
        throw new AppError('Cylinder not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }

      // Check if cylinder is currently leased
      const leaseRecords = cylinder.get('leaseRecords') as any[] || [];
      if (leaseRecords.length > 0) {
        throw new AppError(
          'Cannot transfer cylinder that is currently leased',
          CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Check if cylinder is available
      if (cylinder.status !== 'available') {
        throw new AppError(
          `Cannot transfer cylinder with status: ${cylinder.status}`,
          CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Verify target outlet exists
      const targetOutlet = await Outlet.findByPk(toOutletId, { transaction });
      if (!targetOutlet) {
        throw new AppError('Target outlet not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }

      // Check if it's the same outlet
      if (cylinder.currentOutletId === toOutletId) {
        throw new AppError(
          'Cannot transfer cylinder to the same outlet',
          CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      const fromOutletId = cylinder.currentOutletId;

      // Create transfer record
      const transferRecord = await TransferRecord.create(
        {
          cylinderId,
          fromOutletId,
          toOutletId,
          transferredById,
          transferDate: new Date(),
          status: 'pending',
          reason,
          notes,
        },
        { transaction }
      );

      // Update cylinder's current outlet
      await cylinder.update({ currentOutletId: toOutletId }, { transaction });

      await transaction.commit();

      // Fetch the complete transfer record with associations
      const completeTransferRecord = await TransferRecord.findByPk(transferRecord.id, {
        include: [
          {
            model: Cylinder,
            as: 'cylinder',
            attributes: ['id', 'cylinderCode', 'type'],
          },
          {
            model: Outlet,
            as: 'fromOutlet',
            attributes: ['id', 'name'],
          },
          {
            model: Outlet,
            as: 'toOutlet',
            attributes: ['id', 'name'],
          },
          {
            model: User,
            as: 'transferredBy',
            attributes: ['id', 'firstName', 'lastName'],
          },
        ],
      });

      return completeTransferRecord;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

export const cylinderService = new CylinderService();
