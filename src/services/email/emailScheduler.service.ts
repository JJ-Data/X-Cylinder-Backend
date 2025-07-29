import * as cron from 'node-cron';
import { EmailQueueService, EmailJobData, EmailPriority } from './emailQueue.service';
import { BulkEmailService, BulkEmailRecipient, BulkEmailOptions } from './bulkEmail.service';
import { BaseEmailTemplate } from './templates/BaseTemplate';
import { EmailLog, EmailStatus, EmailTemplate } from '@models/EmailLog.model';
import { logger } from '@utils/logger';

export enum ScheduleFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export interface EmailSchedule {
  id: string;
  name: string;
  description?: string;
  frequency: ScheduleFrequency;
  cronExpression?: string; // For custom frequencies
  startDate: Date;
  endDate?: Date;
  timezone?: string;
  
  // Email configuration
  template?: EmailTemplate;
  recipients: BulkEmailRecipient[];
  emailOptions: BulkEmailOptions;
  
  // Status
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  
  // Metadata
  createdBy?: number;
  metadata?: Record<string, any>;
}

export interface ScheduledEmailJob {
  scheduleId: string;
  cronTask?: cron.ScheduledTask;
  schedule: EmailSchedule;
}

export interface ScheduleExecutionResult {
  scheduleId: string;
  executionTime: Date;
  success: boolean;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  error?: string;
  campaignId?: string;
}

export class EmailSchedulerService {
  private scheduledJobs: Map<string, ScheduledEmailJob> = new Map();
  private emailQueueService: EmailQueueService;
  private bulkEmailService: BulkEmailService;
  private static instance: EmailSchedulerService;

  private constructor() {
    this.emailQueueService = EmailQueueService.getInstance();
    this.bulkEmailService = BulkEmailService.getInstance();
  }

  public static getInstance(): EmailSchedulerService {
    if (!EmailSchedulerService.instance) {
      EmailSchedulerService.instance = new EmailSchedulerService();
    }
    return EmailSchedulerService.instance;
  }

  /**
   * Create a new email schedule
   */
  async createSchedule(schedule: Omit<EmailSchedule, 'id' | 'runCount' | 'isActive'>): Promise<EmailSchedule> {
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullSchedule: EmailSchedule = {
      ...schedule,
      id: scheduleId,
      runCount: 0,
      isActive: true,
      nextRun: this.calculateNextRun(schedule.frequency, schedule.startDate, schedule.cronExpression),
    };

    // Validate the schedule
    this.validateSchedule(fullSchedule);

    // Create the cron job
    const cronTask = this.createCronJob(fullSchedule);

    const scheduledJob: ScheduledEmailJob = {
      scheduleId,
      cronTask,
      schedule: fullSchedule,
    };

    this.scheduledJobs.set(scheduleId, scheduledJob);

    logger.info('Email schedule created', {
      scheduleId,
      name: schedule.name,
      frequency: schedule.frequency,
      startDate: schedule.startDate,
      recipientCount: schedule.recipients.length,
      nextRun: fullSchedule.nextRun,
    });

    return fullSchedule;
  }

  /**
   * Update an existing email schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<Omit<EmailSchedule, 'id' | 'runCount'>>
  ): Promise<EmailSchedule> {
    const existingJob = this.scheduledJobs.get(scheduleId);
    if (!existingJob) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // Stop the existing cron job
    if (existingJob.cronTask) {
      existingJob.cronTask.stop();
    }

    // Update the schedule
    const updatedSchedule: EmailSchedule = {
      ...existingJob.schedule,
      ...updates,
      nextRun: updates.frequency || updates.startDate || updates.cronExpression
        ? this.calculateNextRun(
            updates.frequency || existingJob.schedule.frequency,
            updates.startDate || existingJob.schedule.startDate,
            updates.cronExpression || existingJob.schedule.cronExpression
          )
        : existingJob.schedule.nextRun,
    };

    // Validate the updated schedule
    this.validateSchedule(updatedSchedule);

    // Create a new cron job if the schedule is active
    let cronTask: cron.ScheduledTask | undefined;
    if (updatedSchedule.isActive) {
      cronTask = this.createCronJob(updatedSchedule);
    }

    const updatedJob: ScheduledEmailJob = {
      scheduleId,
      cronTask,
      schedule: updatedSchedule,
    };

    this.scheduledJobs.set(scheduleId, updatedJob);

    logger.info('Email schedule updated', {
      scheduleId,
      name: updatedSchedule.name,
      isActive: updatedSchedule.isActive,
      nextRun: updatedSchedule.nextRun,
    });

    return updatedSchedule;
  }

  /**
   * Delete an email schedule
   */
  async deleteSchedule(scheduleId: string): Promise<boolean> {
    const existingJob = this.scheduledJobs.get(scheduleId);
    if (!existingJob) {
      return false;
    }

    // Stop the cron job
    if (existingJob.cronTask) {
      existingJob.cronTask.stop();
    }

    // Remove from memory
    this.scheduledJobs.delete(scheduleId);

    logger.info('Email schedule deleted', { scheduleId });
    return true;
  }

  /**
   * Get a specific email schedule
   */
  getSchedule(scheduleId: string): EmailSchedule | null {
    const job = this.scheduledJobs.get(scheduleId);
    return job ? job.schedule : null;
  }

  /**
   * Get all email schedules
   */
  getAllSchedules(): EmailSchedule[] {
    return Array.from(this.scheduledJobs.values()).map(job => job.schedule);
  }

  /**
   * Get active email schedules
   */
  getActiveSchedules(): EmailSchedule[] {
    return this.getAllSchedules().filter(schedule => schedule.isActive);
  }

  /**
   * Pause a schedule
   */
  async pauseSchedule(scheduleId: string): Promise<boolean> {
    const job = this.scheduledJobs.get(scheduleId);
    if (!job) {
      return false;
    }

    if (job.cronTask) {
      job.cronTask.stop();
    }

    job.schedule.isActive = false;

    logger.info('Email schedule paused', { scheduleId });
    return true;
  }

  /**
   * Resume a schedule
   */
  async resumeSchedule(scheduleId: string): Promise<boolean> {
    const job = this.scheduledJobs.get(scheduleId);
    if (!job) {
      return false;
    }

    // Create a new cron job
    job.cronTask = this.createCronJob(job.schedule);
    job.schedule.isActive = true;
    job.schedule.nextRun = this.calculateNextRun(
      job.schedule.frequency,
      new Date(),
      job.schedule.cronExpression
    );

    logger.info('Email schedule resumed', {
      scheduleId,
      nextRun: job.schedule.nextRun,
    });
    return true;
  }

  /**
   * Manually execute a schedule
   */
  async executeSchedule(scheduleId: string): Promise<ScheduleExecutionResult> {
    const job = this.scheduledJobs.get(scheduleId);
    if (!job) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    return this.executeScheduledEmail(job.schedule);
  }

  /**
   * Schedule a one-time email
   */
  async scheduleOneTimeEmail(
    executeAt: Date,
    recipients: BulkEmailRecipient[],
    emailOptions: BulkEmailOptions,
    metadata?: Record<string, any>
  ): Promise<string> {
    const scheduleId = `onetime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a one-time schedule
    const schedule: EmailSchedule = {
      id: scheduleId,
      name: `One-time email - ${executeAt.toISOString()}`,
      frequency: ScheduleFrequency.ONCE,
      startDate: executeAt,
      recipients,
      emailOptions,
      isActive: true,
      runCount: 0,
      metadata,
    };

    // Calculate delay in milliseconds
    const delay = executeAt.getTime() - Date.now();

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    // Queue the email with a delay
    const emailJobs: EmailJobData[] = recipients.map(recipient => ({
      to: recipient.email,
      subject: emailOptions.subject,
      html: emailOptions.htmlContent,
      text: emailOptions.textContent,
      templateType: emailOptions.template || EmailTemplate.CUSTOM,
      recipientType: 'customer',
      metadata: {
        scheduleId,
        recipientName: recipient.name,
        recipientMetadata: recipient.metadata,
        ...metadata,
      },
    }));

    // Queue emails with delay
    await Promise.all(
      emailJobs.map(emailJob =>
        this.emailQueueService.queueEmail(emailJob, {
          priority: emailOptions.priority || EmailPriority.NORMAL,
          delay,
          metadata: { scheduleId },
        })
      )
    );

    logger.info('One-time email scheduled', {
      scheduleId,
      executeAt,
      recipientCount: recipients.length,
      delay: `${delay}ms`,
    });

    return scheduleId;
  }

  /**
   * Create a cron job for a schedule
   */
  private createCronJob(schedule: EmailSchedule): cron.ScheduledTask {
    const cronExpression = this.getCronExpression(schedule);

    const task = cron.schedule(
      cronExpression,
      async () => {
        try {
          // Check if the schedule should still run
          if (!schedule.isActive) {
            return;
          }

          // Check end date
          if (schedule.endDate && new Date() > schedule.endDate) {
            schedule.isActive = false;
            task.stop();
            logger.info('Schedule ended due to end date', {
              scheduleId: schedule.id,
              endDate: schedule.endDate,
            });
            return;
          }

          await this.executeScheduledEmail(schedule);
        } catch (error) {
          logger.error('Scheduled email execution failed', {
            scheduleId: schedule.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
      {
        timezone: schedule.timezone || process.env.TZ || 'UTC',
      }
    );

    // Start the task
    task.start();

    return task;
  }

  /**
   * Execute a scheduled email
   */
  private async executeScheduledEmail(schedule: EmailSchedule): Promise<ScheduleExecutionResult> {
    const executionTime = new Date();
    const campaignId = `schedule_${schedule.id}_${Date.now()}`;

    logger.info('Executing scheduled email', {
      scheduleId: schedule.id,
      name: schedule.name,
      recipientCount: schedule.recipients.length,
      campaignId,
    });

    try {
      // Update run information
      schedule.lastRun = executionTime;
      schedule.runCount++;
      schedule.nextRun = this.calculateNextRun(
        schedule.frequency,
        executionTime,
        schedule.cronExpression
      );

      // Execute the bulk email
      const result = await this.bulkEmailService.sendBulkEmails(
        schedule.recipients,
        {
          ...schedule.emailOptions,
          campaignId,
          metadata: {
            ...schedule.emailOptions.metadata,
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            executionTime,
          },
        }
      );

      const executionResult: ScheduleExecutionResult = {
        scheduleId: schedule.id,
        executionTime,
        success: result.overallSuccess,
        recipientCount: result.totalRecipients,
        successCount: result.successCount,
        failureCount: result.failureCount,
        campaignId,
      };

      logger.info('Scheduled email executed successfully', {
        scheduleId: schedule.id,
        campaignId,
        recipientCount: result.totalRecipients,
        successCount: result.successCount,
        failureCount: result.failureCount,
        nextRun: schedule.nextRun,
      });

      return executionResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Scheduled email execution failed', {
        scheduleId: schedule.id,
        campaignId,
        error: errorMessage,
      });

      return {
        scheduleId: schedule.id,
        executionTime,
        success: false,
        recipientCount: schedule.recipients.length,
        successCount: 0,
        failureCount: schedule.recipients.length,
        error: errorMessage,
        campaignId,
      };
    }
  }

  /**
   * Get cron expression for a schedule
   */
  private getCronExpression(schedule: EmailSchedule): string {
    if (schedule.frequency === ScheduleFrequency.CUSTOM && schedule.cronExpression) {
      return schedule.cronExpression;
    }

    const startDate = schedule.startDate;
    const minute = startDate.getMinutes();
    const hour = startDate.getHours();
    const dayOfMonth = startDate.getDate();
    const month = startDate.getMonth() + 1; // JavaScript months are 0-indexed
    const dayOfWeek = startDate.getDay();

    switch (schedule.frequency) {
      case ScheduleFrequency.ONCE:
        // For one-time schedules, we use a specific date
        return `${minute} ${hour} ${dayOfMonth} ${month} *`;
      
      case ScheduleFrequency.DAILY:
        return `${minute} ${hour} * * *`;
      
      case ScheduleFrequency.WEEKLY:
        return `${minute} ${hour} * * ${dayOfWeek}`;
      
      case ScheduleFrequency.MONTHLY:
        return `${minute} ${hour} ${dayOfMonth} * *`;
      
      case ScheduleFrequency.YEARLY:
        return `${minute} ${hour} ${dayOfMonth} ${month} *`;
      
      default:
        throw new Error(`Unsupported frequency: ${schedule.frequency}`);
    }
  }

  /**
   * Calculate the next run time for a schedule
   */
  private calculateNextRun(
    frequency: ScheduleFrequency,
    fromDate: Date,
    cronExpression?: string
  ): Date {
    const now = new Date(fromDate);

    switch (frequency) {
      case ScheduleFrequency.ONCE:
        return fromDate;
      
      case ScheduleFrequency.DAILY:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      case ScheduleFrequency.WEEKLY:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      case ScheduleFrequency.MONTHLY:
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      
      case ScheduleFrequency.YEARLY:
        const nextYear = new Date(now);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear;
      
      case ScheduleFrequency.CUSTOM:
        if (!cronExpression) {
          throw new Error('Cron expression is required for custom frequency');
        }
        // For custom cron expressions, we approximate the next run
        // In a production system, you might want to use a cron parser library
        return new Date(now.getTime() + 60 * 60 * 1000); // Default to 1 hour
      
      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }
  }

  /**
   * Validate a schedule
   */
  private validateSchedule(schedule: EmailSchedule): void {
    if (!schedule.name || schedule.name.trim().length === 0) {
      throw new Error('Schedule name is required');
    }

    if (!schedule.startDate) {
      throw new Error('Start date is required');
    }

    if (schedule.endDate && schedule.endDate <= schedule.startDate) {
      throw new Error('End date must be after start date');
    }

    if (!schedule.recipients || schedule.recipients.length === 0) {
      throw new Error('At least one recipient is required');
    }

    if (!schedule.emailOptions.subject || schedule.emailOptions.subject.trim().length === 0) {
      throw new Error('Email subject is required');
    }

    if (!schedule.emailOptions.htmlContent && !schedule.emailOptions.textContent) {
      throw new Error('Email content (HTML or text) is required');
    }

    if (schedule.frequency === ScheduleFrequency.CUSTOM && !schedule.cronExpression) {
      throw new Error('Cron expression is required for custom frequency');
    }

    if (schedule.cronExpression && !cron.validate(schedule.cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    // Validate recipient emails
    const invalidEmails = schedule.recipients.filter(
      recipient => !this.isValidEmail(recipient.email)
    );
    if (invalidEmails.length > 0) {
      throw new Error(`Invalid email addresses found: ${invalidEmails.map(r => r.email).join(', ')}`);
    }
  }

  /**
   * Validate email address
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(): Promise<{
    totalSchedules: number;
    activeSchedules: number;
    schedulesRunToday: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
  }> {
    const allSchedules = this.getAllSchedules();
    const activeSchedules = allSchedules.filter(s => s.isActive);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedulesRunToday = allSchedules.filter(
      s => s.lastRun && s.lastRun >= today
    ).length;

    const totalExecutions = allSchedules.reduce((sum, s) => sum + s.runCount, 0);

    // Note: For accurate success/failure tracking, you would need to store execution results
    // This is a simplified version
    return {
      totalSchedules: allSchedules.length,
      activeSchedules: activeSchedules.length,
      schedulesRunToday,
      totalExecutions,
      successfulExecutions: totalExecutions, // Simplified
      failedExecutions: 0, // Simplified
    };
  }

  /**
   * Stop all scheduled jobs (for graceful shutdown)
   */
  stopAllSchedules(): void {
    logger.info('Stopping all email schedules');
    
    for (const [scheduleId, job] of this.scheduledJobs) {
      if (job.cronTask) {
        job.cronTask.stop();
        logger.debug('Stopped email schedule', { scheduleId });
      }
    }

    logger.info('All email schedules stopped');
  }
}

// Export singleton instance
export const emailSchedulerService = EmailSchedulerService.getInstance();