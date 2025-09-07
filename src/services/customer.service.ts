import { User, LeaseRecord, Outlet } from '@models/index';
import { OutletAttributes } from '@app-types/outlet.types';
import { UserCreationAttributes, UserPublicData } from '@app-types/user.types';
import { AppError } from '@utils/errors';
import { CONSTANTS } from '@config/constants';
import { config } from '@config/environment';
import { sequelize } from '@config/database';
import { Transaction, Op } from 'sequelize';
import * as crypto from 'crypto';
import { emailService } from '@services/email/EmailService';
import { CustomerRegistrationEmail } from '@services/email/templates/CustomerRegistrationEmail';
import { CustomerWelcomeEmail } from '@services/email/templates/CustomerWelcomeEmail';
import { logger } from '@utils/logger';

export interface CustomerRegistrationData {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  outletId?: number;
}

export interface PaymentLinkData {
  userId: number;
  amount: number;
  paymentLink: string;
  expiresAt: Date;
}

export interface PaymentData {
  paymentAmount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'card';
  paymentReference?: string;
}

export class CustomerService {
  private generatePaymentReference(userId: number): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256').update(`${userId}-${timestamp}`).digest('hex');
    return `PAY-${userId}-${hash.substring(0, 8).toUpperCase()}`;
  }

  async registerCustomer(
    data: CustomerRegistrationData,
    staffId?: number,
    transaction?: Transaction
  ): Promise<{
    customer: UserPublicData;
  }> {
    const t = transaction || (await sequelize.transaction());

    try {
      // Check if email already exists
      const existingUser = await User.findOne({
        where: { email: data.email },
        transaction: t,
      });

      if (existingUser) {
        throw new AppError('Email already registered', CONSTANTS.HTTP_STATUS.CONFLICT);
      }

      // Create customer account with active status (no payment required)
      const customer = await User.create(
        {
          ...data,
          role: CONSTANTS.USER_ROLES.CUSTOMER,
          paymentStatus: 'active', // Auto-activate without payment
          isActive: true, // Active immediately
          emailVerified: false,
          activatedAt: new Date(), // Set activation date
        },
        { transaction: t }
      );

      // Send welcome email
      try {
        const firstName = customer.getDataValue('firstName') as string;
        const customerEmail = customer.getDataValue('email') as string;
        
        const welcomeEmailTemplate = new CustomerWelcomeEmail({
          firstName,
          email: customerEmail,
          activationDate: new Date(),
          supportEmail: config.supportEmail,
          companyName: config.companyName
        });

        await emailService.sendTemplate(customerEmail, welcomeEmailTemplate);
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
        // Don't throw - registration should succeed even if email fails
      }

      if (!transaction) {
        await t.commit();
      }

      return {
        customer: customer.toPublicJSON(),
      };
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  /**
   * @deprecated Payment is no longer required for customer registration.
   * This method is kept for backward compatibility.
   */
  async activateCustomer(
    userId: number,
    paymentData: PaymentData,
    transaction?: Transaction
  ): Promise<UserPublicData> {
    const t = transaction || (await sequelize.transaction());

    try {
      const customer = await User.findByPk(userId, { transaction: t });
      if (!customer) {
        throw new AppError('Customer not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
      }

      // If customer is already active, just return their data (backward compatibility)
      if (customer.getDataValue('paymentStatus') === 'active') {
        if (!transaction) {
          await t.commit();
        }
        return customer.toPublicJSON();
      }

      // For backward compatibility, activate any pending customers
      // (This handles edge cases where old customers might still be pending)
      await customer.update(
        {
          paymentStatus: 'active',
          isActive: true,
          activatedAt: new Date(),
        },
        { transaction: t }
      );

      // Send welcome email
      try {
        const firstName = customer.getDataValue('firstName') as string;
        const customerEmail = customer.getDataValue('email') as string;
        
        const welcomeEmailTemplate = new CustomerWelcomeEmail({
          firstName,
          email: customerEmail,
          activationDate: new Date(),
          supportEmail: config.supportEmail,
          companyName: config.companyName
        });

        await emailService.sendTemplate(customerEmail, welcomeEmailTemplate);
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
        // Don't throw - activation should succeed even if email fails
      }

      if (!transaction) {
        await t.commit();
      }

      return customer.toPublicJSON();
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  async getCustomerById(id: number): Promise<
    UserPublicData & {
      outlet?: Pick<OutletAttributes, 'id' | 'name' | 'location'>;
      activeLeases: number;
      totalLeases: number;
    }
  > {
    const customer = await User.findByPk(id, {
      include: [
        {
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name', 'location'],
        },
      ],
    });

    if (!customer) {
      throw new AppError('Customer not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    if (customer.getDataValue('role') !== CONSTANTS.USER_ROLES.CUSTOMER) {
      throw new AppError('User is not a customer', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
    }

    // Get lease statistics
    const [activeLeases, totalLeases] = await Promise.all([
      LeaseRecord.count({
        where: {
          customerId: id,
          leaseStatus: 'active',
        },
      }),
      LeaseRecord.count({
        where: { customerId: id },
      }),
    ]);

    const customerData = customer.toPublicJSON();
    return {
      ...customerData,
      outlet: customer.get('outlet'),
      activeLeases,
      totalLeases,
    };
  }

  async searchCustomers(filters: {
    searchTerm?: string;
    outletId?: number;
    paymentStatus?: 'pending' | 'active' | 'inactive';
    hasActiveLeases?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    customers: Array<UserPublicData & { activeLeases: number }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters.page || CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(filters.limit || CONSTANTS.DEFAULT_PAGE_SIZE, CONSTANTS.MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const where: Record<string, any> = {
      role: CONSTANTS.USER_ROLES.CUSTOMER,
    };

    if (filters.searchTerm) {
      where[Op.or as any] = [
        { email: { [Op.like]: `%${filters.searchTerm}%` } },
        { firstName: { [Op.like]: `%${filters.searchTerm}%` } },
        { lastName: { [Op.like]: `%${filters.searchTerm}%` } },
      ];
    }

    if (filters.outletId) {
      where.outletId = filters.outletId;
    }

    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        {
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Get active lease counts for each customer
    const customerIds = rows
      .map((customer) => customer.getDataValue('id'))
      .filter((id): id is number => id !== undefined);
    const activeLeaseCounts = (await LeaseRecord.findAll({
      where: {
        customerId: { [Op.in]: customerIds },
        leaseStatus: 'active',
      },
      attributes: ['customerId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['customerId'],
      raw: true,
    })) as unknown as Array<{ customerId: number; count: string }>;

    const leaseCountMap = activeLeaseCounts.reduce(
      (acc, item) => {
        acc[item.customerId] = parseInt(item.count.toString());
        return acc;
      },
      {} as Record<number, number>
    );

    // Filter by active leases if requested
    let filteredRows = rows;
    if (filters.hasActiveLeases !== undefined) {
      filteredRows = rows.filter((customer) => {
        const customerId = customer.getDataValue('id');
        if (customerId === undefined) return false;
        const hasActive = (leaseCountMap[customerId] || 0) > 0;
        return filters.hasActiveLeases ? hasActive : !hasActive;
      });
    }

    const customers = filteredRows.map((customer) => {
      const customerId = customer.getDataValue('id');
      return {
        ...customer.toPublicJSON(),
        activeLeases: customerId !== undefined ? leaseCountMap[customerId] || 0 : 0,
      };
    });

    return {
      customers,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getCustomersByOutlet(outletId: number): Promise<UserPublicData[]> {
    const customers = await User.findAll({
      where: {
        role: CONSTANTS.USER_ROLES.CUSTOMER,
        outletId,
        paymentStatus: 'active',
      },
      order: [
        ['firstName', 'ASC'],
        ['lastName', 'ASC'],
      ],
    });

    return customers.map((customer) => customer.toPublicJSON());
  }

  async deactivateCustomer(id: number, reason: string): Promise<void> {
    const customer = await User.findByPk(id);
    if (!customer) {
      throw new AppError('Customer not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    if (customer.getDataValue('role') !== CONSTANTS.USER_ROLES.CUSTOMER) {
      throw new AppError('User is not a customer', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
    }

    // Check for active leases
    const activeLeases = await LeaseRecord.count({
      where: {
        customerId: id,
        leaseStatus: 'active',
      },
    });

    if (activeLeases > 0) {
      throw new AppError(
        'Cannot deactivate customer with active leases. Please return all cylinders first.',
        CONSTANTS.HTTP_STATUS.BAD_REQUEST
      );
    }

    await customer.update({
      isActive: false,
      paymentStatus: 'inactive',
      // notes: reason, // TODO: Add notes field to User model if needed
    } as Partial<UserCreationAttributes>);
  }

  async resendPaymentLink(userId: number): Promise<PaymentLinkData> {
    const customer = await User.findByPk(userId);
    if (!customer) {
      throw new AppError('Customer not found', CONSTANTS.HTTP_STATUS.NOT_FOUND);
    }

    if (customer.getDataValue('paymentStatus') !== 'pending') {
      throw new AppError('Customer is not in pending status', CONSTANTS.HTTP_STATUS.BAD_REQUEST);
    }

    // Generate new payment link
    const paymentReference = this.generatePaymentReference(userId);
    const paymentLink: PaymentLinkData = {
      userId,
      amount: 500, // TODO: Make this configurable
      paymentLink: `${process.env.PAYMENT_GATEWAY_URL}/pay/${paymentReference}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    // Send email with new payment link
    try {
      const firstName = customer.getDataValue('firstName') as string;
      const reminderContent = `Hello ${firstName},\n\nThis is a reminder to complete your CylinderX registration.\n\nPayment Link: ${paymentLink.paymentLink}\nAmount: $${paymentLink.amount}\nExpires: ${paymentLink.expiresAt}\n\nPlease complete your payment to activate your account.\n\nThank you!`;
      await emailService.sendEmail({
        to: customer.getDataValue('email') as string,
        subject: 'Complete Your CylinderX Registration - Payment Link',
        text: reminderContent,
        html: reminderContent.replace(/\n/g, '<br>')
      });
    } catch (emailError) {
      logger.error('Failed to send payment reminder email:', emailError);
      // Don't throw - function should succeed even if email fails
    }

    return paymentLink;
  }
}

export const customerService = new CustomerService();
