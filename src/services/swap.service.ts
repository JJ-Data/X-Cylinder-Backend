import { SwapRecord, LeaseRecord, Cylinder, User, Outlet } from '@models/index';
import { CreateSwapDto, SwapFilters, SwapRecordPublicData, SwapStatistics, SwapReceiptData } from '@app-types/swap.types';
import { AppError } from '@utils/errors';
import { CONSTANTS } from '@config/constants';
import { sequelize } from '@config/database';
import { Transaction, Op } from 'sequelize';
import { simplifiedSettingsService } from './settings-simplified.service';
import { simplifiedPricingService } from './pricing-simplified.service';
import { OperationType } from '@models/BusinessSetting.model';
import { EmailService } from './email.service';
import { SwapReceiptEmail } from './email/templates/SwapReceiptEmail';
import { logger } from '@utils/logger';

export class SwapService {
  async createSwap(
    data: CreateSwapDto,
    staffId: number,
    transaction?: Transaction
  ): Promise<SwapRecordPublicData> {
    const t = transaction || (await sequelize.transaction());

    try {
      let lease: any;

      // Find lease by ID, cylinder code, or QR code
      if (data.leaseId) {
        lease = await LeaseRecord.findByPk(data.leaseId, {
          include: [
            { model: Cylinder, as: 'cylinder' },
            { model: User, as: 'customer' },
          ],
          transaction: t,
        });
      } else if (data.cylinderCode) {
        const cylinder = await Cylinder.findOne({
          where: { cylinderCode: data.cylinderCode },
          transaction: t,
        });
        
        if (cylinder) {
          lease = await LeaseRecord.findOne({
            where: { 
              cylinderId: cylinder.getDataValue('id'),
              leaseStatus: 'active'
            },
            include: [
              { model: Cylinder, as: 'cylinder' },
              { model: User, as: 'customer' },
            ],
            transaction: t,
          });
        }
      } else if (data.qrCode) {
        const cylinder = await Cylinder.findOne({
          where: { qrCode: data.qrCode },
          transaction: t,
        });
        
        if (cylinder) {
          lease = await LeaseRecord.findOne({
            where: { 
              cylinderId: cylinder.getDataValue('id'),
              leaseStatus: 'active'
            },
            include: [
              { model: Cylinder, as: 'cylinder' },
              { model: User, as: 'customer' },
            ],
            transaction: t,
          });
        }
      }

      if (!lease) {
        throw new AppError('Active lease not found for the specified cylinder', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }

      if (lease.getDataValue('leaseStatus') !== 'active') {
        throw new AppError('Lease is not active', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      // Verify the new cylinder exists and is available
      const newCylinder = await Cylinder.findByPk(data.newCylinderId, { transaction: t });
      if (!newCylinder) {
        throw new AppError('New cylinder not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }

      if (newCylinder.getDataValue('status') !== 'available') {
        throw new AppError('New cylinder is not available for swap', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      // Verify cylinders are the same type
      const oldCylinder = lease.cylinder;
      if (oldCylinder.getDataValue('type') !== newCylinder.getDataValue('type')) {
        throw new AppError('Cylinders must be of the same type for swap', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      // Verify staff member exists
      const staff = await User.findByPk(staffId, { transaction: t });
      if (!staff) {
        throw new AppError('Staff member not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }

      if (!['admin', 'staff'].includes(staff.getDataValue('role'))) {
        throw new AppError('Only admin and staff members can perform swaps', CONSTANTS.HTTP_STATUS.FORBIDDEN);
      }

      const outletId = lease.getDataValue('outletId');
      
      // Calculate swap fee based on condition
      let swapFee: number = data.swapFee || 0;
      if (!data.swapFee) {
        const condition = data.condition === 'damaged' ? 'damaged' : data.condition === 'poor' ? 'poor' : 'good';
        
        const swapPricing = await simplifiedPricingService.calculatePrice({
          operationType: OperationType.SWAP,
          outletId,
          condition,
        });
        swapFee = swapPricing.totalPrice;
      }
      
      // Calculate gas refill cost
      const oldCylinderGasVolume = data.weightRecorded || oldCylinder.getDataValue('currentGasVolume') || 0;
      const newCylinderGasVolume = newCylinder.getDataValue('maxGasVolume') || newCylinder.getDataValue('currentGasVolume');
      const gasVolumeDifference = Math.max(0, newCylinderGasVolume - oldCylinderGasVolume);
      
      let refillCost = 0;
      if (gasVolumeDifference > 0) {
        const refillPricing = await simplifiedPricingService.calculatePrice({
          operationType: OperationType.REFILL,
          outletId,
          gasAmount: gasVolumeDifference,
        });
        refillCost = refillPricing.totalPrice;
      }

      // Create swap record with gas tracking
      const swapData = {
        leaseId: lease.getDataValue('id'),
        oldCylinderId: oldCylinder.getDataValue('id'),
        newCylinderId: data.newCylinderId,
        staffId,
        condition: data.condition,
        weightRecorded: data.weightRecorded,
        damageNotes: data.damageNotes,
        swapFee,
        reasonForFee: data.reasonForFee || `Condition fee: ${data.condition}, Gas refill: ${gasVolumeDifference.toFixed(2)}kg`,
        oldCylinderGasVolume,
        newCylinderGasVolume,
        gasVolumeDifference,
        refillCost,
        notes: data.notes,
      };

      const swap = await SwapRecord.create(swapData, { transaction: t });

      // Update lease record to point to new cylinder
      await lease.update(
        { cylinderId: data.newCylinderId },
        { transaction: t }
      );

      // Update cylinder statuses
      await oldCylinder.update(
        { 
          status: data.condition === 'damaged' ? 'damaged' : 'available',
          currentGasVolume: data.weightRecorded || 0,
        },
        { transaction: t }
      );

      await newCylinder.update(
        { status: 'leased' },
        { transaction: t }
      );

      if (!transaction) {
        await t.commit();
      }

      // Get the full swap record with associated data for email
      const fullSwapRecord = await this.getSwapById(swap.getDataValue('id') as number);

      // Send swap receipt email
      try {
        await this.sendSwapReceiptEmail(fullSwapRecord);
      } catch (emailError) {
        logger.error('Failed to send swap receipt email:', emailError);
        // Don't throw error - swap was successful, email is secondary
      }

      return fullSwapRecord;
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  async getSwaps(filters: SwapFilters): Promise<{
    swaps: SwapRecordPublicData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || CONSTANTS.DEFAULT_PAGE;
    const limit = filters.limit || CONSTANTS.DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * limit;

    const whereClause: any = {};

    // Apply filters
    if (filters.leaseId) {
      whereClause.leaseId = filters.leaseId;
    }

    if (filters.staffId) {
      whereClause.staffId = filters.staffId;
    }

    if (filters.oldCylinderId) {
      whereClause.oldCylinderId = filters.oldCylinderId;
    }

    if (filters.newCylinderId) {
      whereClause.newCylinderId = filters.newCylinderId;
    }

    if (filters.condition) {
      whereClause.condition = filters.condition;
    }

    if (filters.dateFrom || filters.dateTo) {
      whereClause.swapDate = {};
      if (filters.dateFrom) {
        whereClause.swapDate[Op.gte] = filters.dateFrom;
      }
      if (filters.dateTo) {
        whereClause.swapDate[Op.lte] = filters.dateTo;
      }
    }

    // Include customer filter through lease
    const includeClause: any[] = [
      {
        model: LeaseRecord,
        as: 'lease',
        include: [
          {
            model: User,
            as: 'customer',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
          {
            model: Outlet,
            as: 'outlet',
            attributes: ['id', 'name', 'location'],
          },
        ],
      },
      {
        model: Cylinder,
        as: 'oldCylinder',
        attributes: ['id', 'cylinderCode', 'type', 'status'],
      },
      {
        model: Cylinder,
        as: 'newCylinder',
        attributes: ['id', 'cylinderCode', 'type', 'status'],
      },
      {
        model: User,
        as: 'staff',
        attributes: ['id', 'email', 'firstName', 'lastName'],
      },
    ];

    // Apply customer filter if provided
    if (filters.customerId) {
      includeClause[0].include[0].where = { id: filters.customerId };
    }

    // Apply outlet filter if provided
    if (filters.outletId) {
      includeClause[0].include[1].where = { id: filters.outletId };
    }

    const { count, rows } = await SwapRecord.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['swapDate', 'DESC']],
      limit,
      offset,
    });

    return {
      swaps: rows.map((swap) => swap.toJSON() as SwapRecordPublicData),
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getSwapById(id: number): Promise<SwapRecordPublicData> {
    const swap = await SwapRecord.findByPk(id, {
      include: [
        {
          model: LeaseRecord,
          as: 'lease',
          include: [
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'email', 'firstName', 'lastName'],
            },
            {
              model: Outlet,
              as: 'outlet',
              attributes: ['id', 'name', 'location'],
            },
          ],
        },
        {
          model: Cylinder,
          as: 'oldCylinder',
          attributes: ['id', 'cylinderCode', 'type', 'status', 'currentGasVolume'],
        },
        {
          model: Cylinder,
          as: 'newCylinder',
          attributes: ['id', 'cylinderCode', 'type', 'status', 'currentGasVolume', 'maxGasVolume'],
        },
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    });

    if (!swap) {
      throw new AppError('Swap record not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    return swap.toJSON() as SwapRecordPublicData;
  }

  async getSwapsByCustomer(
    customerId: number,
    filters?: {
      condition?: 'good' | 'poor' | 'damaged';
      page?: number;
      limit?: number;
    }
  ): Promise<{
    swaps: SwapRecordPublicData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters?.page || CONSTANTS.DEFAULT_PAGE;
    const limit = filters?.limit || CONSTANTS.DEFAULT_PAGE_SIZE;

    const swapFilters: SwapFilters = {
      customerId,
      condition: filters?.condition,
      page,
      limit,
    };

    return await this.getSwaps(swapFilters);
  }

  async getSwapStatistics(outletId?: number): Promise<SwapStatistics> {
    const baseWhere: any = {};
    
    // Apply outlet filter through lease association
    const leaseInclude: any = {
      model: LeaseRecord,
      as: 'lease',
      attributes: [],
    };

    if (outletId) {
      leaseInclude.where = { outletId };
    }

    // Get total swaps and condition breakdown
    const [totalSwaps, conditionStats] = await Promise.all([
      SwapRecord.count({
        include: outletId ? [leaseInclude] : undefined,
      }),
      SwapRecord.findAll({
        attributes: [
          'condition',
          [sequelize.fn('COUNT', sequelize.col('SwapRecord.id')), 'count'],
        ],
        include: outletId ? [leaseInclude] : undefined,
        group: ['condition'],
      }),
    ]);

    // Get fee statistics
    const feeStats = await SwapRecord.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('swap_fee')), 'totalFees'],
        [sequelize.fn('AVG', sequelize.col('swap_fee')), 'averageFee'],
        [sequelize.fn('AVG', sequelize.col('weight_recorded')), 'averageWeight'],
      ],
      include: outletId ? [leaseInclude] : undefined,
    });

    // Get most active staff
    const staffStats = await SwapRecord.findAll({
      attributes: [
        'staffId',
        [sequelize.fn('COUNT', sequelize.col('SwapRecord.id')), 'swapCount'],
      ],
      include: [
        {
          model: User,
          as: 'staff',
          attributes: ['firstName', 'lastName'],
        },
        ...(outletId ? [leaseInclude] : []),
      ],
      group: ['staffId', 'staff.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('SwapRecord.id')), 'DESC']],
      limit: 1,
    });

    // Get recent swaps
    const recentSwaps = await this.getSwaps({
      outletId,
      limit: 5,
      page: 1,
    });

    // Process condition statistics
    const swapsByCondition = {
      good: 0,
      poor: 0,
      damaged: 0,
    };

    conditionStats.forEach((stat: any) => {
      const condition = stat.getDataValue('condition') as keyof typeof swapsByCondition;
      swapsByCondition[condition] = parseInt(stat.getDataValue('count'));
    });

    // Process staff statistics
    const mostActiveStaff = staffStats.length > 0 && staffStats[0] ? {
      staffId: staffStats[0].getDataValue('staffId') as number,
      staffName: (staffStats[0] as any).staff 
        ? `${(staffStats[0] as any).staff.getDataValue('firstName')} ${(staffStats[0] as any).staff.getDataValue('lastName')}`
        : 'Unknown Staff',
      swapCount: parseInt(String((staffStats[0] as any).getDataValue('swapCount')) || '0'),
    } : {
      staffId: 0,
      staffName: 'N/A',
      swapCount: 0,
    };

    return {
      totalSwaps,
      swapsByCondition,
      totalFees: parseFloat(String((feeStats as any)?.getDataValue('totalFees')) || '0'),
      averageSwapFee: parseFloat(String((feeStats as any)?.getDataValue('averageFee')) || '0'),
      averageWeight: parseFloat(String((feeStats as any)?.getDataValue('averageWeight')) || '0'),
      mostActiveStaff,
      recentSwaps: recentSwaps.swaps,
    };
  }

  async getSwapReceiptData(swapId: number): Promise<SwapReceiptData> {
    const swap = await this.getSwapById(swapId);

    // Extract data for receipt
    const receiptData: SwapReceiptData = {
      swap,
      customer: {
        id: swap.lease.customer.id,
        email: swap.lease.customer.email,
        firstName: swap.lease.customer.firstName,
        lastName: swap.lease.customer.lastName,
      },
      outlet: {
        id: swap.lease.outlet.id,
        name: swap.lease.outlet.name,
        location: swap.lease.outlet.location,
      },
      oldCylinder: {
        id: swap.oldCylinder.id,
        cylinderCode: swap.oldCylinder.cylinderCode,
        type: swap.oldCylinder.type,
        currentGasVolume: parseFloat(String(swap.oldCylinder.currentGasVolume)),
      },
      newCylinder: {
        id: swap.newCylinder.id,
        cylinderCode: swap.newCylinder.cylinderCode,
        type: swap.newCylinder.type,
        currentGasVolume: parseFloat(String(swap.newCylinder.currentGasVolume)),
        maxGasVolume: parseFloat(String(swap.newCylinder.maxGasVolume)),
      },
    };

    return receiptData;
  }

  async markReceiptPrinted(swapId: number): Promise<void> {
    const swap = await SwapRecord.findByPk(swapId);
    
    if (!swap) {
      throw new AppError('Swap record not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    await swap.update({ receiptPrinted: true });
  }

  async findCylinder(identifier: {
    leaseId?: number;
    cylinderCode?: string;
    qrCode?: string;
  }): Promise<{
    lease: any;
    cylinder: any;
  }> {
    let lease: any;

    // Find lease by ID, cylinder code, or QR code
    if (identifier.leaseId) {
      lease = await LeaseRecord.findByPk(identifier.leaseId, {
        include: [
          {
            model: Cylinder,
            as: 'cylinder',
            attributes: ['id', 'cylinderCode', 'type', 'status', 'currentGasVolume'],
          },
          {
            model: User,
            as: 'customer',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
          {
            model: Outlet,
            as: 'outlet',
            attributes: ['id', 'name', 'location'],
          },
        ],
      });
    } else if (identifier.cylinderCode) {
      const cylinder = await Cylinder.findOne({
        where: { cylinderCode: identifier.cylinderCode },
      });
      
      if (cylinder) {
        lease = await LeaseRecord.findOne({
          where: { 
            cylinderId: cylinder.getDataValue('id'),
            leaseStatus: 'active'
          },
          include: [
            {
              model: Cylinder,
              as: 'cylinder',
              attributes: ['id', 'cylinderCode', 'type', 'status', 'currentGasVolume'],
            },
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'email', 'firstName', 'lastName'],
            },
            {
              model: Outlet,
              as: 'outlet',
              attributes: ['id', 'name', 'location'],
            },
          ],
        });
      }
    } else if (identifier.qrCode) {
      const cylinder = await Cylinder.findOne({
        where: { qrCode: identifier.qrCode },
      });
      
      if (cylinder) {
        lease = await LeaseRecord.findOne({
          where: { 
            cylinderId: cylinder.getDataValue('id'),
            leaseStatus: 'active'
          },
          include: [
            {
              model: Cylinder,
              as: 'cylinder',
              attributes: ['id', 'cylinderCode', 'type', 'status', 'currentGasVolume'],
            },
            {
              model: User,
              as: 'customer',
              attributes: ['id', 'email', 'firstName', 'lastName'],
            },
            {
              model: Outlet,
              as: 'outlet',
              attributes: ['id', 'name', 'location'],
            },
          ],
        });
      }
    }

    if (!lease) {
      throw new AppError('No active lease found for the specified cylinder', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    return {
      lease: {
        id: lease.getDataValue('id'),
        leaseStatus: lease.getDataValue('leaseStatus'),
        customer: {
          id: lease.customer.getDataValue('id'),
          email: lease.customer.getDataValue('email'),
          firstName: lease.customer.getDataValue('firstName'),
          lastName: lease.customer.getDataValue('lastName'),
        },
        outlet: {
          id: lease.outlet.getDataValue('id'),
          name: lease.outlet.getDataValue('name'),
          location: lease.outlet.getDataValue('location'),
        },
      },
      cylinder: {
        id: lease.cylinder.getDataValue('id'),
        cylinderCode: lease.cylinder.getDataValue('cylinderCode'),
        type: lease.cylinder.getDataValue('type'),
        status: lease.cylinder.getDataValue('status'),
        currentGasVolume: parseFloat(String(lease.cylinder.getDataValue('currentGasVolume'))),
      },
    };
  }

  async getAvailableCylinders(type?: string): Promise<{
    id: number;
    cylinderCode: string;
    type: string;
    status: string;
    currentGasVolume: number;
    maxGasVolume: number;
  }[]> {
    const whereClause: any = {
      status: 'available',
      currentGasVolume: {
        [Op.gt]: 0, // Only cylinders with gas
      },
    };

    if (type) {
      whereClause.type = type;
    }

    const cylinders = await Cylinder.findAll({
      where: whereClause,
      attributes: ['id', 'cylinderCode', 'type', 'status', 'currentGasVolume', 'maxGasVolume'],
      order: [['currentGasVolume', 'DESC']], // Full cylinders first
      limit: 50, // Reasonable limit
    });

    return cylinders.map(cylinder => ({
      id: cylinder.getDataValue('id') as number,
      cylinderCode: String(cylinder.getDataValue('cylinderCode')),
      type: String(cylinder.getDataValue('type')),
      status: String(cylinder.getDataValue('status')),
      currentGasVolume: parseFloat(String(cylinder.getDataValue('currentGasVolume'))),
      maxGasVolume: parseFloat(String(cylinder.getDataValue('maxGasVolume'))),
    }));
  }

  private async sendSwapReceiptEmail(swapRecord: SwapRecordPublicData): Promise<void> {
    const customer = swapRecord.lease?.customer;
    const outlet = swapRecord.lease?.outlet;
    const staff = swapRecord.staff;
    const oldCylinder = swapRecord.oldCylinder;
    const newCylinder = swapRecord.newCylinder;

    if (!customer?.email) {
      logger.warn(`No email found for customer in swap ID: ${swapRecord.id}`);
      return;
    }

    const emailData: any = {
      to: customer.email,
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      swapId: swapRecord.id.toString(),
      oldCylinderCode: oldCylinder?.cylinderCode || 'N/A',
      newCylinderCode: newCylinder?.cylinderCode || 'N/A',
      cylinderType: newCylinder?.type || oldCylinder?.type || 'Standard',
      oldCylinderCondition: swapRecord.condition,
      newCylinderCondition: 'good', // Assume new cylinder is in good condition
      swapReason: swapRecord.reasonForFee || `Cylinder condition: ${swapRecord.condition}`,
      swapFee: swapRecord.swapFee,
      swapDate: new Date(swapRecord.swapDate),
      outletName: outlet?.name || 'Unknown Outlet',
      outletLocation: outlet?.location || 'Location not specified',
      operatorName: staff ? `${staff.firstName} ${staff.lastName}`.trim() : 'Staff Member',
      notes: swapRecord.notes || undefined,
      companyName: process.env.COMPANY_NAME || 'CylinderX',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@cylinderx.com'
    };

    const emailTemplate = new SwapReceiptEmail(emailData);
    const emailService = new EmailService();
    
    await emailService.sendEmail(
      emailData.to,
      emailTemplate.getSubject(),
      emailTemplate.getHtml()
    );

    logger.info(`Swap receipt email sent to ${customer.email} for swap ID: ${swapRecord.id}`);
  }
}

export const swapService = new SwapService();