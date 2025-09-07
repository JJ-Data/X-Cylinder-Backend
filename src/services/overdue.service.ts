import { LeaseRecord, User, Cylinder, Outlet } from '@models/index';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '@config/database';
import { emailService } from '@services/email/EmailService';
import { ReturnOverdueEmail, ReturnOverdueData } from '@services/email/templates/ReturnOverdueEmail';
import { config } from '@config/environment';
import { settingsService } from './settings.service';

export interface OverdueLeaseRecord {
  id: number;
  leaseId: string;
  customerId: number;
  cylinderId: number;
  expectedReturnDate: Date;
  daysOverdue: number;
  customerName: string;
  customerEmail: string;
  cylinderCode: string;
  cylinderType: string;
  outletName: string;
  outletLocation: string;
  outletPhone?: string;
  lastNotificationSent?: Date;
  notificationCount: number;
}

export class OverdueService {
  /**
   * Find all overdue lease records
   */
  public static async findOverdueLeases(): Promise<OverdueLeaseRecord[]> {
    const now = new Date();
    
    const overdueLeases = await LeaseRecord.findAll({
      where: {
        [Op.and]: [
          {
            expectedReturnDate: {
              [Op.lt]: now
            }
          },
          {
            expectedReturnDate: {
              [Op.ne]: undefined
            }
          }
        ],
        leaseStatus: {
          [Op.in]: ['active', 'overdue']
        }
      },
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Cylinder,
          as: 'cylinder',
          attributes: ['id', 'cylinderCode', 'cylinderType']
        },
        {
          model: Outlet,
          as: 'outlet',
          attributes: ['id', 'name', 'address', 'phoneNumber']
        }
      ]
    });

    return overdueLeases.map(lease => {
      const expectedReturnDate = lease.getDataValue('expectedReturnDate') as Date;
      const expectedReturn = new Date(expectedReturnDate);
      const daysOverdue = Math.floor((now.getTime() - expectedReturn.getTime()) / (1000 * 60 * 60 * 24));
      
      const customer = (lease as any).customer;
      const cylinder = (lease as any).cylinder;
      const outlet = (lease as any).outlet;

      return {
        id: lease.getDataValue('id') as number,
        leaseId: (lease.getDataValue('id') as number).toString(),
        customerId: lease.getDataValue('customerId') as number,
        cylinderId: lease.getDataValue('cylinderId') as number,
        expectedReturnDate: expectedReturn,
        daysOverdue,
        customerName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Unknown Customer',
        customerEmail: customer?.email || 'no-email@unknown.com',
        cylinderCode: cylinder?.cylinderCode || 'Unknown',
        cylinderType: cylinder?.cylinderType || 'Unknown',
        outletName: outlet?.name || 'Unknown Outlet',
        outletLocation: outlet?.address || 'Unknown Location',
        outletPhone: outlet?.phoneNumber,
        lastNotificationSent: lease.getDataValue('lastNotificationSent') as Date | undefined,
        notificationCount: (lease.getDataValue('notificationCount') as number) || 0
      };
    });
  }

  /**
   * Process overdue leases and send notifications
   */
  public static async processOverdueLeases(): Promise<{
    processed: number;
    notificationsSent: number;
    errors: string[];
  }> {
    const transaction = await sequelize.transaction();
    let processed = 0;
    let notificationsSent = 0;
    const errors: string[] = [];

    try {
      const overdueLeases = await this.findOverdueLeases();
      console.log(`Found ${overdueLeases.length} overdue leases to process`);

      // Get late fee settings
      const lateFeeSettings = await settingsService.getSetting('late_fees');
      const lateFeePerDay = lateFeeSettings?.daily_late_fee || 5.00;

      for (const overdueLease of overdueLeases) {
        try {
          await this.processIndividualOverdueLease(overdueLease, lateFeePerDay, transaction);
          processed++;
          
          // Send notification if needed
          if (await this.shouldSendNotification(overdueLease)) {
            await this.sendOverdueNotification(overdueLease, lateFeePerDay, transaction);
            notificationsSent++;
          }
        } catch (error) {
          const errorMsg = `Failed to process lease ${overdueLease.leaseId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      await transaction.commit();
      console.log(`Processed ${processed} overdue leases, sent ${notificationsSent} notifications`);

      return {
        processed,
        notificationsSent,
        errors
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Process individual overdue lease record
   */
  private static async processIndividualOverdueLease(
    overdueLease: OverdueLeaseRecord,
    lateFeePerDay: number,
    transaction: Transaction
  ): Promise<void> {
    // Update lease status to overdue if still active
    const lease = await LeaseRecord.findByPk(overdueLease.id, { transaction });
    if (!lease) return;

    if (lease.getDataValue('leaseStatus') === 'active') {
      await lease.update({
        leaseStatus: 'overdue'
      }, { transaction });
    }

    // Calculate and update late fees
    const totalLateFees = overdueLease.daysOverdue * lateFeePerDay;
    await lease.update({
      lateFees: totalLateFees,
      lastOverdueCheck: new Date()
    }, { transaction });
  }

  /**
   * Determine if notification should be sent
   */
  private static async shouldSendNotification(overdueLease: OverdueLeaseRecord): Promise<boolean> {
    const { daysOverdue, lastNotificationSent, notificationCount } = overdueLease;

    // First notification: send immediately when overdue
    if (notificationCount === 0) {
      return true;
    }

    // If last notification was sent, check interval
    if (lastNotificationSent) {
      const daysSinceLastNotification = Math.floor(
        (Date.now() - lastNotificationSent.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send reminder every 3 days for first 2 weeks, then weekly
      if (daysOverdue <= 14) {
        return daysSinceLastNotification >= 3;
      } else {
        return daysSinceLastNotification >= 7;
      }
    }

    return false;
  }

  /**
   * Send overdue notification email
   */
  private static async sendOverdueNotification(
    overdueLease: OverdueLeaseRecord,
    lateFeePerDay: number,
    transaction: Transaction
  ): Promise<void> {
    const {
      leaseId, cylinderCode, cylinderType, expectedReturnDate, daysOverdue,
      customerName, customerEmail, outletName, outletLocation, outletPhone,
      notificationCount
    } = overdueLease;

    // Determine notice type
    const noticeType: 'first' | 'final' = (daysOverdue >= 14 || notificationCount >= 3) ? 'final' : 'first';
    
    const totalLateFees = daysOverdue * lateFeePerDay;

    const emailData: ReturnOverdueData = {
      customerName,
      leaseId,
      cylinderCode,
      cylinderType,
      originalReturnDate: expectedReturnDate,
      daysOverdue,
      lateFeePerDay,
      totalLateFees,
      noticeType,
      outletName,
      outletLocation,
      outletPhone,
      companyName: config.companyName || 'CylinderX',
      supportEmail: config.supportEmail || 'support@cylinderx.com'
    };

    try {
      const overdueEmail = new ReturnOverdueEmail(emailData);
      await emailService.sendTemplate(customerEmail, overdueEmail);

      // Update notification tracking
      await LeaseRecord.update({
        lastNotificationSent: new Date(),
        notificationCount: notificationCount + 1
      }, {
        where: { id: overdueLease.id },
        transaction
      });

      console.log(`Sent ${noticeType} overdue notification for lease ${leaseId} to ${customerEmail}`);
    } catch (error) {
      console.error(`Failed to send overdue notification for lease ${leaseId}:`, error);
      throw error;
    }
  }

  /**
   * Get overdue statistics
   */
  public static async getOverdueStatistics(): Promise<{
    totalOverdue: number;
    overdueByDays: { [key: string]: number };
    totalLateFees: number;
    avgDaysOverdue: number;
  }> {
    const overdueLeases = await this.findOverdueLeases();
    
    const lateFeeSettings = await settingsService.getSetting('late_fees');
    const lateFeePerDay = lateFeeSettings?.daily_late_fee || 5.00;

    const overdueByDays: { [key: string]: number } = {
      '1-3': 0,
      '4-7': 0,
      '8-14': 0,
      '15-30': 0,
      '30+': 0
    };

    let totalLateFees = 0;
    let totalDaysOverdue = 0;

    overdueLeases.forEach(lease => {
      const { daysOverdue } = lease;
      totalDaysOverdue += daysOverdue;
      totalLateFees += daysOverdue * lateFeePerDay;

      if (daysOverdue <= 3) {
        overdueByDays['1-3'] = (overdueByDays['1-3'] || 0) + 1;
      } else if (daysOverdue <= 7) {
        overdueByDays['4-7'] = (overdueByDays['4-7'] || 0) + 1;
      } else if (daysOverdue <= 14) {
        overdueByDays['8-14'] = (overdueByDays['8-14'] || 0) + 1;
      } else if (daysOverdue <= 30) {
        overdueByDays['15-30'] = (overdueByDays['15-30'] || 0) + 1;
      } else {
        overdueByDays['30+'] = (overdueByDays['30+'] || 0) + 1;
      }
    });

    return {
      totalOverdue: overdueLeases.length,
      overdueByDays,
      totalLateFees,
      avgDaysOverdue: overdueLeases.length > 0 ? totalDaysOverdue / overdueLeases.length : 0
    };
  }

  /**
   * Manual trigger for specific lease
   */
  public static async sendOverdueNotificationForLease(leaseId: number): Promise<void> {
    const lease = await LeaseRecord.findOne({
      where: { id: leaseId },
      include: [
        { model: User, as: 'customer' },
        { model: Cylinder, as: 'cylinder' },
        { model: Outlet, as: 'outlet' }
      ]
    });

    if (!lease) {
      throw new Error(`Lease ${leaseId} not found`);
    }

    const expectedReturn = new Date(lease.getDataValue('expectedReturnDate') as Date);
    const now = new Date();
    const daysOverdue = Math.floor((now.getTime() - expectedReturn.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) {
      throw new Error(`Lease ${leaseId} is not overdue`);
    }

    const customer = (lease as any).customer;
    const cylinder = (lease as any).cylinder;
    const outlet = (lease as any).outlet;

    const overdueLease: OverdueLeaseRecord = {
      id: lease.getDataValue('id') as number,
      leaseId: (lease.getDataValue('id') as number).toString(),
      customerId: lease.getDataValue('customerId') as number,
      cylinderId: lease.getDataValue('cylinderId') as number,
      expectedReturnDate: expectedReturn,
      daysOverdue,
      customerName: customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Unknown Customer',
      customerEmail: customer?.email || 'no-email@unknown.com',
      cylinderCode: cylinder?.cylinderCode || 'Unknown',
      cylinderType: cylinder?.cylinderType || 'Unknown',
      outletName: outlet?.name || 'Unknown Outlet',
      outletLocation: outlet?.address || 'Unknown Location',
      outletPhone: outlet?.phoneNumber,
      lastNotificationSent: lease.getDataValue('lastNotificationSent') as Date | undefined,
      notificationCount: (lease.getDataValue('notificationCount') as number) || 0
    };

    const lateFeeSettings = await settingsService.getSetting('late_fees');
    const lateFeePerDay = lateFeeSettings?.daily_late_fee || 5.00;

    const transaction = await sequelize.transaction();
    try {
      await this.sendOverdueNotification(overdueLease, lateFeePerDay, transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}