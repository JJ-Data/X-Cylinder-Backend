import { RefillRecord, Cylinder, User, Outlet } from '@models/index';
import { CreateRefillDto, BulkRefillDto, RefillRecordPublicData } from '@app-types/refill.types';
import { AppError } from '@utils/errors';
import { CONSTANTS } from '@config/constants';
import { sequelize } from '@config/database';
import { Transaction, Op } from 'sequelize';
import { simplifiedPricingService } from './pricing-simplified.service';
import { OperationType } from '@models/BusinessSetting.model';
import { EmailService } from './email.service';
import { RefillReceiptEmail, RefillReceiptData } from './email/templates/RefillReceiptEmail';
import { logger } from '@utils/logger';

export class RefillService {
  async createRefill(
    data: CreateRefillDto,
    operatorId: number,
    outletId: number,
    transaction?: Transaction
  ): Promise<RefillRecordPublicData> {
    const t = transaction || (await sequelize.transaction());

    try {
      // Verify cylinder exists
      const cylinder = await Cylinder.findByPk(data.cylinderId, { transaction: t });
      if (!cylinder) {
        throw new AppError('Cylinder not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }

      // Verify cylinder is at the operator's outlet
      if (cylinder.getDataValue('currentOutletId') !== outletId) {
        throw new AppError('Cylinder is not at this outlet', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      // Note: Leased cylinders CAN be refilled - customers can refill their leased cylinders anytime

      // Validate amounts
      if (data.refillCost !== undefined && data.refillCost < 0) {
        throw new AppError('Refill cost cannot be negative', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      if (data.preRefillVolume < 0 || data.postRefillVolume < 0) {
        throw new AppError('Volumes cannot be negative', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      // Validate volume logic
      if (data.postRefillVolume < data.preRefillVolume) {
        throw new AppError(
          'Post-refill volume cannot be less than pre-refill volume',
          CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      const maxVolume = cylinder.getDataValue('maxGasVolume');
      if (maxVolume && data.postRefillVolume > maxVolume) {
        throw new AppError(
          'Post-refill volume exceeds cylinder capacity',
          CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Calculate volume added
      const volumeAdded = data.postRefillVolume - data.preRefillVolume;

      // Calculate refill cost if not provided
      let refillCost = data.refillCost;
      if (!refillCost) {
        const cylinderType = cylinder.getDataValue('type') as string;
        
        const refillPricing = await simplifiedPricingService.calculatePrice({
          operationType: OperationType.REFILL,
          cylinderType,
          outletId,
          gasAmount: volumeAdded,
        });
        refillCost = refillPricing.totalPrice;
      }

      // Create refill record with calculated volume and cost
      const refill = await RefillRecord.create(
        {
          cylinderId: data.cylinderId,
          operatorId,
          outletId,
          refillDate: new Date(),
          preRefillVolume: data.preRefillVolume,
          postRefillVolume: data.postRefillVolume,
          refillCost,
          paymentMethod: data.paymentMethod || 'cash',
          paymentReference: data.paymentReference,
          notes: data.notes ? `${data.notes}\nVolume Added: ${volumeAdded}kg` : `Volume Added: ${volumeAdded}kg`,
          batchNumber: data.batchNumber,
        },
        { transaction: t }
      );

      // Update cylinder gas volume (keep existing status - don't change leased cylinders to available)
      await cylinder.update(
        {
          currentGasVolume: data.postRefillVolume,
          // Keep the existing status - if it's leased, it stays leased
        },
        { transaction: t }
      );

      if (!transaction) {
        await t.commit();
      }

      // Safely get refill ID
      const refillId = refill.getDataValue('id');
      if (!refillId) {
        throw new AppError('Failed to get refill ID', CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }

      // Get the full refill record with associated data for email
      const fullRefillRecord = await this.getRefillById(refillId);

      // Send refill receipt email
      try {
        await this.sendRefillReceiptEmail(fullRefillRecord);
      } catch (emailError) {
        logger.error('Failed to send refill receipt email:', emailError);
        // Don't throw error - refill was successful, email is secondary
      }

      return fullRefillRecord;
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  async bulkRefill(
    data: BulkRefillDto,
    operatorId: number,
    outletId: number
  ): Promise<{
    successful: number;
    failed: Array<{ cylinderCode: string; error: string }>;
  }> {
    const results = {
      successful: 0,
      failed: [] as Array<{ cylinderCode: string; error: string }>,
    };

    // Process each refill
    for (const refillData of data.refills) {
      const transaction = await sequelize.transaction();

      try {
        // Find cylinder by code
        const cylinder = await Cylinder.findOne({
          where: { cylinderCode: refillData.cylinderCode },
          transaction,
        });

        if (!cylinder) {
          results.failed.push({
            cylinderCode: refillData.cylinderCode,
            error: 'Cylinder not found',
          });
          await transaction.rollback();
          continue;
        }

        // Get and validate cylinder ID
        const cylinderId = cylinder.getDataValue('id');
        if (!cylinderId) {
          results.failed.push({
            cylinderCode: refillData.cylinderCode,
            error: 'Failed to get cylinder ID',
          });
          await transaction.rollback();
          continue;
        }

        // Create refill
        await this.createRefill(
          {
            cylinderId,
            preRefillVolume: refillData.preRefillVolume,
            postRefillVolume: refillData.postRefillVolume,
            refillCost: refillData.refillCost,
            batchNumber: data.batchNumber,
            notes: data.notes,
          },
          operatorId,
          outletId,
          transaction
        );

        await transaction.commit();
        results.successful++;
      } catch (error: any) {
        await transaction.rollback();
        results.failed.push({
          cylinderCode: refillData.cylinderCode,
          error: error.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  async getRefillById(id: number): Promise<RefillRecordPublicData> {
    const refill = await RefillRecord.findByPk(id, {
      include: [
        {
          model: Cylinder,
          as: 'cylinder',
          attributes: ['id', 'cylinderCode', 'type', 'qrCode'],
        },
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
        {
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name', 'location'],
        },
      ],
    });

    if (!refill) {
      throw new AppError('Refill record not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    return refill.toJSON() as RefillRecordPublicData;
  }

  async getCylinderRefills(
    cylinderId: number,
    filters?: {
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    refills: RefillRecordPublicData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters?.page || CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(filters?.limit || CONSTANTS.DEFAULT_PAGE_SIZE, CONSTANTS.MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const where: any = { cylinderId };

    if (filters?.dateFrom || filters?.dateTo) {
      where.refillDate = {};
      if (filters.dateFrom) {
        where.refillDate[Op.gte] = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.refillDate[Op.lte] = filters.dateTo;
      }
    }

    const { count, rows } = await RefillRecord.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
        {
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name'],
        },
      ],
      order: [['refillDate', 'DESC']],
    });

    return {
      refills: rows.map((refill) => refill.toJSON() as RefillRecordPublicData),
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getOperatorRefills(
    operatorId: number,
    filters?: {
      outletId?: number;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    refills: RefillRecordPublicData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters?.page || CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(filters?.limit || CONSTANTS.DEFAULT_PAGE_SIZE, CONSTANTS.MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const where: any = { operatorId };

    if (filters?.outletId) {
      where.outletId = filters.outletId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.refillDate = {};
      if (filters.dateFrom) {
        where.refillDate[Op.gte] = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.refillDate[Op.lte] = filters.dateTo;
      }
    }

    const { count, rows } = await RefillRecord.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: Cylinder,
          as: 'cylinder',
          attributes: ['id', 'cylinderCode', 'type'],
        },
        {
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name'],
        },
      ],
      order: [['refillDate', 'DESC']],
    });

    return {
      refills: rows.map((refill) => refill.toJSON() as RefillRecordPublicData),
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getOutletRefills(
    outletId: number,
    filters?: {
      operatorId?: number;
      cylinderId?: number;
      batchNumber?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    refills: RefillRecordPublicData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters?.page || CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(filters?.limit || CONSTANTS.DEFAULT_PAGE_SIZE, CONSTANTS.MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const where: any = { outletId };

    if (filters?.operatorId) {
      where.operatorId = filters.operatorId;
    }

    if (filters?.cylinderId) {
      where.cylinderId = filters.cylinderId;
    }

    if (filters?.batchNumber) {
      where.batchNumber = filters.batchNumber;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.refillDate = {};
      if (filters.dateFrom) {
        where.refillDate[Op.gte] = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.refillDate[Op.lte] = filters.dateTo;
      }
    }

    const { count, rows } = await RefillRecord.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: Cylinder,
          as: 'cylinder',
          attributes: ['id', 'cylinderCode', 'type', 'qrCode'],
        },
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
      order: [['refillDate', 'DESC']],
    });

    return {
      refills: rows.map((refill) => refill.toJSON() as RefillRecordPublicData),
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getRefillStatistics(filters?: {
    outletId?: number;
    operatorId?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    totalRefills: number;
    totalVolumeAdded: number;
    totalCost: number;
    averageVolumePerRefill: number;
    refillsByType: Record<string, number>;
    refillsByOperator?: Record<string, number>;
  }> {
    const where: any = {};

    if (filters?.outletId) {
      where.outletId = filters.outletId;
    }

    if (filters?.operatorId) {
      where.operatorId = filters.operatorId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.refillDate = {};
      if (filters.dateFrom) {
        where.refillDate[Op.gte] = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.refillDate[Op.lte] = filters.dateTo;
      }
    }

    const refills = await RefillRecord.findAll({
      where,
      include: [
        {
          model: Cylinder,
          as: 'cylinder',
          attributes: ['type'],
        },
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
    });

    const statistics: {
      totalRefills: number;
      totalVolumeAdded: number;
      totalCost: number;
      averageVolumePerRefill: number;
      refillsByType: Record<string, number>;
      refillsByOperator?: Record<string, number>;
    } = {
      totalRefills: refills.length,
      totalVolumeAdded: 0,
      totalCost: 0,
      averageVolumePerRefill: 0,
      refillsByType: {} as Record<string, number>,
      refillsByOperator: {} as Record<string, number>,
    };

    refills.forEach((refill) => {
      const volumeAdded =
        refill.getDataValue('postRefillVolume') - refill.getDataValue('preRefillVolume');
      statistics.totalVolumeAdded += volumeAdded;

      // Safely parse refill cost
      const refillCost = refill.getDataValue('refillCost');
      statistics.totalCost += refillCost ? parseFloat(String(refillCost)) : 0;

      // Group by cylinder type
      const cylinder = refill.get('cylinder') as any;
      const type = cylinder.type;
      statistics.refillsByType[type] = (statistics.refillsByType[type] || 0) + 1;

      // Group by operator (only if not filtering by specific operator)
      if (!filters?.operatorId) {
        const operator = refill.get('operator') as any;
        const operatorName = `${operator.firstName} ${operator.lastName}`;
        statistics.refillsByOperator![operatorName] =
          (statistics.refillsByOperator![operatorName] || 0) + 1;
      }
    });

    statistics.averageVolumePerRefill =
      statistics.totalRefills > 0 ? statistics.totalVolumeAdded / statistics.totalRefills : 0;

    // Remove operator stats if filtering by operator
    if (filters?.operatorId && statistics.refillsByOperator) {
      delete statistics.refillsByOperator;
    }

    return statistics;
  }

  private async sendRefillReceiptEmail(refillRecord: RefillRecordPublicData): Promise<void> {
    const operator = refillRecord.operator;
    const cylinder = refillRecord.cylinder;
    const outlet = refillRecord.outlet;

    if (!operator?.email) {
      logger.warn(`No email found for operator ID: ${refillRecord.operatorId}`);
      return;
    }

    const emailData: RefillReceiptData = {
      to: operator.email,
      customerName: `${operator.firstName} ${operator.lastName}`.trim(), // Using operator as recipient for now
      refillId: refillRecord.id.toString(),
      cylinderCode: cylinder?.cylinderCode || 'N/A',
      cylinderType: cylinder?.type || 'Standard',
      preRefillVolume: refillRecord.preRefillVolume,
      postRefillVolume: refillRecord.postRefillVolume,
      refillAmount: refillRecord.volumeAdded,
      refillCost: refillRecord.refillCost || 0,
      refillDate: new Date(refillRecord.refillDate),
      outletName: outlet?.name || 'Unknown Outlet',
      outletLocation: outlet?.location || 'Location not specified',
      operatorName: operator ? `${operator.firstName} ${operator.lastName}`.trim() : 'Staff Member',
      batchNumber: refillRecord.batchNumber || undefined,
      notes: refillRecord.notes || undefined,
      companyName: process.env.COMPANY_NAME || 'CylinderX',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@cylinderx.com'
    };

    const emailTemplate = new RefillReceiptEmail(emailData);
    const emailService = new EmailService();
    
    await emailService.sendEmail(
      emailData.to,
      emailTemplate.getSubject(),
      emailTemplate.getHtml()
    );

    logger.info(`Refill receipt email sent to ${operator.email} for refill ID: ${refillRecord.id}`);
  }
}

export const refillService = new RefillService();
