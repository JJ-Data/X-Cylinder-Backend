import { LeaseRecord, Cylinder, User, Outlet } from '@models/index';
import { CreateLeaseDto, ReturnCylinderDto, LeaseRecordPublicData } from '@app-types/lease.types';
import { AppError } from '@utils/errors';
import { CONSTANTS } from '@config/constants';
import { sequelize } from '@config/database';
import { Transaction, Op } from 'sequelize';
import { simplifiedPricingService } from './pricing-simplified.service';
import { OperationType } from '@models/BusinessSetting.model';
import { EmailService } from './email.service';
import { LeaseConfirmationEmail, LeaseConfirmationData } from './email/templates/LeaseConfirmationEmail';
import { logger } from '@utils/logger';

export class LeaseService {
  async createLease(
    data: CreateLeaseDto,
    staffId: number,
    outletId: number,
    transaction?: Transaction
  ): Promise<LeaseRecordPublicData> {
    const t = transaction || (await sequelize.transaction());

    try {
      // Verify customer exists and is active
      const customer = await User.findByPk(data.customerId);
      if (!customer) {
        throw new AppError('Customer not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }

      if (customer.getDataValue('role') !== CONSTANTS.USER_ROLES.CUSTOMER) {
        throw new AppError('User is not a customer', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      if (customer.getDataValue('paymentStatus') !== 'active') {
        throw new AppError(
          'Customer account is not active. Payment required.',
          CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Find cylinder by ID, code, or QR code
      let cylinder: any;
      
      if (data.cylinderId) {
        cylinder = await Cylinder.findByPk(data.cylinderId, { transaction: t });
      } else if (data.cylinderCode) {
        cylinder = await Cylinder.findOne({
          where: { cylinderCode: data.cylinderCode },
          transaction: t,
        });
      } else if (data.qrCode) {
        cylinder = await Cylinder.findOne({
          where: { qrCode: data.qrCode },
          transaction: t,
        });
      }
      
      if (!cylinder) {
        throw new AppError('Cylinder not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }

      if (cylinder.getDataValue('status') !== 'available') {
        throw new AppError(
          'Cylinder is not available for lease',
          CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      if (cylinder.getDataValue('currentOutletId') !== outletId) {
        throw new AppError('Cylinder is not at this outlet', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      // Check if customer has any overdue leases
      const overdueLease = await LeaseRecord.findOne({
        where: {
          customerId: data.customerId,
          leaseStatus: 'active',
          expectedReturnDate: {
            [Op.lt]: new Date(),
          },
        },
        transaction: t,
      });

      if (overdueLease) {
        throw new AppError(
          'Customer has overdue cylinders. Please return them first.',
          CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Calculate pricing if not provided
      let depositAmount = data.depositAmount;
      let leaseAmount = data.leaseAmount || 0; // Default to 0 if not provided

      // Only calculate deposit if not provided
      if (!depositAmount) {
        const cylinderType = cylinder.getDataValue('cylinderType');
        
        const pricingResult = await simplifiedPricingService.calculatePrice({
          operationType: OperationType.LEASE,
          cylinderType,
          quantity: 1,
          outletId,
          duration: 30, // Default lease duration
        });
        depositAmount = pricingResult.deposit || 0;
      }

      // Validate amounts
      if (depositAmount < 0 || leaseAmount < 0) {
        throw new AppError('Amounts cannot be negative', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      // Validate expected return date if provided (optional)
      if (data.expectedReturnDate && data.expectedReturnDate <= new Date()) {
        throw new AppError(
          'Expected return date must be in the future',
          CONSTANTS.HTTP_STATUS.BAD_REQUEST
        );
      }

      // Create lease record
      const lease = await LeaseRecord.create(
        {
          cylinderId: cylinder.getDataValue('id'),
          customerId: data.customerId,
          outletId,
          staffId,
          leaseDate: new Date(),
          expectedReturnDate: data.expectedReturnDate,
          depositAmount,
          leaseAmount,
          paymentMethod: data.paymentMethod || 'cash',
          notes: data.notes,
          leaseStatus: 'active',
        },
        { transaction: t }
      );

      // Update cylinder status
      await cylinder.update({ status: 'leased' }, { transaction: t });

      if (!transaction) {
        await t.commit();
      }

      // Safely get lease ID
      const leaseId = lease.getDataValue('id');
      if (!leaseId) {
        throw new AppError('Failed to get lease ID', CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }

      // Get the full lease record with associated data for email
      const fullLeaseRecord = await this.getLeaseById(leaseId);

      // Send lease confirmation email
      try {
        await this.sendLeaseConfirmationEmail(fullLeaseRecord);
      } catch (emailError) {
        logger.error('Failed to send lease confirmation email:', emailError);
        // Don't throw error - lease was successful, email is secondary
      }

      return fullLeaseRecord;
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  async returnCylinder(
    data: ReturnCylinderDto,
    returnStaffId: number,
    transaction?: Transaction
  ): Promise<LeaseRecordPublicData> {
    const t = transaction || (await sequelize.transaction());

    try {
      // Get lease record
      const lease = await LeaseRecord.findByPk(data.leaseId, {
        include: [{ model: Cylinder, as: 'cylinder' }],
        transaction: t,
      });

      if (!lease) {
        throw new AppError('Lease record not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }

      if (lease.getDataValue('leaseStatus') !== 'active') {
        throw new AppError('Lease is not active', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      const cylinder = lease.get('cylinder');
      if (!cylinder) {
        throw new AppError('Cylinder data not found', CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }

      // Validate refund amount
      if (data.refundAmount && data.refundAmount < 0) {
        throw new AppError('Refund amount cannot be negative', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
      }

      // Build return notes
      let returnNotes = `Return: ${data.notes || 'No notes'}`;
      if (data.condition && data.condition !== 'good') {
        returnNotes += `\nCondition: ${data.condition}`;
        if (data.damageNotes) {
          returnNotes += ` - ${data.damageNotes}`;
        }
      }
      if (data.gasRemaining !== undefined) {
        returnNotes += `\nGas Remaining: ${data.gasRemaining}kg`;
      }

      // Update lease record
      await lease.update(
        {
          actualReturnDate: new Date(),
          returnStaffId,
          leaseStatus: 'returned',
          refundAmount: data.refundAmount,
          notes: lease.getDataValue('notes')
            ? `${lease.getDataValue('notes')}\n${returnNotes}`
            : returnNotes,
        },
        { transaction: t }
      );

      // Update cylinder status and gas volume
      const updateData: any = { 
        status: data.condition === 'damaged' ? 'damaged' : 'available' 
      };
      
      if (data.gasRemaining !== undefined) {
        updateData.currentGasVolume = data.gasRemaining;
      }
      
      await Cylinder.update(
        updateData,
        { where: { id: (cylinder as any).id }, transaction: t }
      );

      if (!transaction) {
        await t.commit();
      }

      // Safely get lease ID
      const leaseId = lease.getDataValue('id');
      if (!leaseId) {
        throw new AppError('Failed to get lease ID', CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }

      return await this.getLeaseById(leaseId);
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  async getLeases(filters: {
    cylinderId?: number;
    customerId?: number;
    outletId?: number;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    leases: LeaseRecordPublicData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const where: any = {};
    
    if (filters.cylinderId) {
      where.cylinderId = filters.cylinderId;
    }
    
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    
    if (filters.outletId) {
      where.outletId = filters.outletId;
    }
    
    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }

    const { count, rows } = await LeaseRecord.findAndCountAll({
      where,
      include: [
        {
          model: Cylinder,
          as: 'cylinder',
          attributes: ['id', 'cylinderCode', 'type', 'qrCode'],
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
        {
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name', 'location'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      leases: rows.map((lease) => lease.toJSON() as LeaseRecordPublicData),
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getLeaseById(id: number): Promise<LeaseRecordPublicData> {
    const lease = await LeaseRecord.findByPk(id, {
      include: [
        {
          model: Cylinder,
          as: 'cylinder',
          attributes: ['id', 'cylinderCode', 'type', 'qrCode'],
        },
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
        {
          model: User,
          as: 'returnStaff',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
        {
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name', 'location'],
        },
      ],
    });

    if (!lease) {
      throw new AppError('Lease record not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    return lease.toJSON() as LeaseRecordPublicData;
  }

  async getCustomerLeases(
    customerId: number,
    filters?: {
      status?: 'active' | 'returned' | 'overdue';
      page?: number;
      limit?: number;
    }
  ): Promise<{
    leases: LeaseRecordPublicData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters?.page || CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(filters?.limit || CONSTANTS.DEFAULT_PAGE_SIZE, CONSTANTS.MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const where: any = { customerId };

    if (filters?.status) {
      if (filters.status === 'overdue') {
        where.leaseStatus = 'active';
        where.expectedReturnDate = { [Op.lt]: new Date() };
      } else {
        where.leaseStatus = filters.status;
      }
    }

    const { count, rows } = await LeaseRecord.findAndCountAll({
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
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name', 'location'],
        },
      ],
      order: [['leaseDate', 'DESC']],
    });

    return {
      leases: rows.map((lease) => lease.toJSON() as LeaseRecordPublicData),
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getOutletLeases(
    outletId: number,
    filters?: {
      status?: 'active' | 'returned' | 'overdue';
      customerId?: number;
      cylinderId?: number;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    leases: LeaseRecordPublicData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters?.page || CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(filters?.limit || CONSTANTS.DEFAULT_PAGE_SIZE, CONSTANTS.MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const where: any = { outletId };

    if (filters?.status) {
      if (filters.status === 'overdue') {
        where.leaseStatus = 'active';
        where.expectedReturnDate = { [Op.lt]: new Date() };
      } else {
        where.leaseStatus = filters.status;
      }
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.cylinderId) {
      where.cylinderId = filters.cylinderId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.leaseDate = {};
      if (filters.dateFrom) {
        where.leaseDate[Op.gte] = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.leaseDate[Op.lte] = filters.dateTo;
      }
    }

    const { count, rows } = await LeaseRecord.findAndCountAll({
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
          as: 'customer',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
      ],
      order: [['leaseDate', 'DESC']],
    });

    return {
      leases: rows.map((lease) => lease.toJSON() as LeaseRecordPublicData),
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getActiveLeasesByCylinder(cylinderId: number): Promise<LeaseRecordPublicData | null> {
    const lease = await LeaseRecord.findOne({
      where: {
        cylinderId,
        leaseStatus: 'active',
      },
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'email', 'firstName', 'lastName'],
        },
        {
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name'],
        },
      ],
    });

    return lease ? (lease.toJSON() as LeaseRecordPublicData) : null;
  }

  async updateOverdueLeases(): Promise<number> {
    const result = await LeaseRecord.update(
      { leaseStatus: 'overdue' },
      {
        where: {
          leaseStatus: 'active',
          expectedReturnDate: {
            [Op.lt]: new Date(),
          },
        },
      }
    );

    return result[0]; // Number of updated records
  }

  async getLeaseStatistics(outletId?: number): Promise<{
    totalActive: number;
    totalReturned: number;
    totalOverdue: number;
    averageLeaseDuration: number;
    totalRevenue: number;
    totalDeposits: number;
  }> {
    const baseWhere: any = {};
    if (outletId) {
      baseWhere.outletId = outletId;
    }

    const [activeCount, returnedLeases, overdueCount] = await Promise.all([
      LeaseRecord.count({
        where: { ...baseWhere, leaseStatus: 'active' },
      }),
      LeaseRecord.findAll({
        where: { ...baseWhere, leaseStatus: 'returned' },
        attributes: [
          'leaseAmount',
          'depositAmount',
          'refundAmount',
          'leaseDate',
          'actualReturnDate',
        ],
      }),
      LeaseRecord.count({
        where: {
          ...baseWhere,
          leaseStatus: 'active',
          expectedReturnDate: { [Op.lt]: new Date() },
        },
      }),
    ]);

    // Calculate statistics from returned leases
    let totalRevenue = 0;
    let totalDeposits = 0;
    let totalDuration = 0;
    let durationCount = 0;

    returnedLeases.forEach((lease) => {
      const leaseAmount = lease.getDataValue('leaseAmount');
      const depositAmount = lease.getDataValue('depositAmount');
      const refundAmount = lease.getDataValue('refundAmount');
      const actualReturnDate = lease.getDataValue('actualReturnDate');
      const leaseDate = lease.getDataValue('leaseDate');

      // Calculate revenue with proper type safety
      totalRevenue += leaseAmount ? parseFloat(String(leaseAmount)) : 0;

      // Calculate deposits with proper type safety
      const deposit = depositAmount ? parseFloat(String(depositAmount)) : 0;
      const refund = refundAmount ? parseFloat(String(refundAmount)) : 0;
      totalDeposits += deposit - refund;

      // Calculate duration with proper null checks
      if (actualReturnDate && leaseDate) {
        const duration = new Date(actualReturnDate).getTime() - new Date(leaseDate).getTime();
        totalDuration += duration;
        durationCount++;
      }
    });

    const averageLeaseDuration =
      durationCount > 0
        ? Math.round(totalDuration / durationCount / (1000 * 60 * 60 * 24)) // Convert to days
        : 0;

    return {
      totalActive: activeCount,
      totalReturned: returnedLeases.length,
      totalOverdue: overdueCount,
      averageLeaseDuration,
      totalRevenue,
      totalDeposits,
    };
  }

  private async sendLeaseConfirmationEmail(leaseRecord: LeaseRecordPublicData): Promise<void> {
    const customer = leaseRecord.customer;
    const cylinder = leaseRecord.cylinder;
    const outlet = leaseRecord.outlet;
    const staff = leaseRecord.staff;

    if (!customer?.email) {
      logger.warn(`No email found for customer ID: ${leaseRecord.customerId}`);
      return;
    }

    // Build return instructions based on whether we have an expected return date
    const returnInstructions = leaseRecord.expectedReturnDate
      ? `Please return the cylinder to any ${process.env.COMPANY_NAME || 'CylinderX'} outlet by the expected return date. Ensure the cylinder is in good condition to receive your full security deposit refund.`
      : `Please return the cylinder to any ${process.env.COMPANY_NAME || 'CylinderX'} outlet when you no longer need it. Ensure the cylinder is in good condition to receive your full security deposit refund.`;

    const emailData: LeaseConfirmationData = {
      to: customer.email,
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      leaseId: leaseRecord.id.toString(),
      cylinderCode: cylinder?.cylinderCode || 'N/A',
      cylinderType: cylinder?.type || 'Standard',
      cylinderSize: '20kg', // Default size - could be enhanced with actual cylinder size data
      leaseStartDate: new Date(leaseRecord.leaseDate),
      expectedReturnDate: leaseRecord.expectedReturnDate ? new Date(leaseRecord.expectedReturnDate) : undefined,
      leaseCost: parseFloat(leaseRecord.leaseAmount.toString()),
      depositAmount: parseFloat(leaseRecord.depositAmount.toString()),
      outletName: outlet?.name || 'Unknown Outlet',
      outletLocation: outlet?.location || 'Location not specified',
      staffName: staff ? `${staff.firstName} ${staff.lastName}`.trim() : 'Staff Member',
      returnInstructions,
      companyName: process.env.COMPANY_NAME || 'CylinderX',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@cylinderx.com'
    };

    const emailTemplate = new LeaseConfirmationEmail(emailData);
    const emailService = new EmailService();
    
    await emailService.sendEmail(
      emailData.to,
      emailTemplate.getSubject(),
      emailTemplate.getHtml()
    );

    logger.info(`Lease confirmation email sent to ${customer.email} for lease ID: ${leaseRecord.id}`);
  }
}

export const leaseService = new LeaseService();
