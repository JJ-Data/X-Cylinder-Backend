import { EmailService } from './EmailService';
import { EmailQueueService, EmailJobData, EmailPriority } from './emailQueue.service';
import { BaseEmailTemplate } from './templates/BaseTemplate';
import { EmailOptions, EmailResult } from './providers/EmailProvider.interface';
import { EmailLog, EmailStatus, EmailTemplate } from '@models/EmailLog.model';
import { logger } from '@utils/logger';
import { Job } from 'bull';
import { Op } from 'sequelize';

export interface BulkEmailRecipient {
  email: string;
  name?: string;
  metadata?: Record<string, any>;
  customData?: Record<string, any>; // For template personalization
}

export interface BulkEmailOptions {
  template?: EmailTemplate;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateData?: Record<string, any>; // Global template data
  
  // Delivery options
  priority?: EmailPriority;
  batchSize?: number;
  delayBetweenBatches?: number; // milliseconds
  scheduledFor?: Date;
  
  // Tracking options
  campaignId?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  
  // Unsubscribe options
  includeUnsubscribeLink?: boolean;
  unsubscribeUrl?: string;
  
  // Metadata
  metadata?: Record<string, any>;
}

export interface BulkEmailProgress {
  totalRecipients: number;
  processed: number;
  sent: number;
  failed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  startTime: Date;
  estimatedCompletion?: Date;
  errors: string[];
}

export interface BulkEmailResult {
  campaignId: string;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  processingTime: number;
  batchResults: Array<{
    batchNumber: number;
    successCount: number;
    failureCount: number;
    errors: string[];
  }>;
  overallSuccess: boolean;
}

export class BulkEmailService {
  private emailService: EmailService;
  private emailQueueService: EmailQueueService;
  private static instance: BulkEmailService;

  private constructor() {
    this.emailService = EmailService.getInstance();
    this.emailQueueService = EmailQueueService.getInstance();
  }

  public static getInstance(): BulkEmailService {
    if (!BulkEmailService.instance) {
      BulkEmailService.instance = new BulkEmailService();
    }
    return BulkEmailService.instance;
  }

  /**
   * Send bulk emails using queue system
   */
  async sendBulkEmails(
    recipients: BulkEmailRecipient[],
    options: BulkEmailOptions,
    progressCallback?: (progress: BulkEmailProgress) => void
  ): Promise<BulkEmailResult> {
    const startTime = new Date();
    const campaignId = options.campaignId || `campaign_${Date.now()}`;
    const batchSize = options.batchSize || 50;
    const totalBatches = Math.ceil(recipients.length / batchSize);

    logger.info('Starting bulk email campaign', {
      campaignId,
      totalRecipients: recipients.length,
      batchSize,
      totalBatches,
      template: options.template,
    });

    // Initialize progress tracking
    const progress: BulkEmailProgress = {
      totalRecipients: recipients.length,
      processed: 0,
      sent: 0,
      failed: 0,
      percentage: 0,
      currentBatch: 0,
      totalBatches,
      startTime,
      errors: [],
    };

    const batchResults: Array<{
      batchNumber: number;
      successCount: number;
      failureCount: number;
      errors: string[];
    }> = [];

    try {
      // Process recipients in batches
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        progress.currentBatch = batchNumber;

        logger.debug('Processing bulk email batch', {
          campaignId,
          batchNumber,
          batchSize: batch.length,
        });

        const batchResult = await this.processBatch(
          batch,
          options,
          campaignId,
          batchNumber
        );

        batchResults.push(batchResult);
        progress.processed += batch.length;
        progress.sent += batchResult.successCount;
        progress.failed += batchResult.failureCount;
        progress.percentage = Math.round((progress.processed / recipients.length) * 100);
        progress.errors.push(...batchResult.errors);

        // Calculate estimated completion time
        const elapsed = Date.now() - startTime.getTime();
        const avgTimePerRecipient = elapsed / progress.processed;
        const remainingRecipients = recipients.length - progress.processed;
        progress.estimatedCompletion = new Date(Date.now() + (avgTimePerRecipient * remainingRecipients));

        // Call progress callback if provided
        if (progressCallback) {
          progressCallback({ ...progress });
        }

        // Delay between batches if specified
        if (i + batchSize < recipients.length && options.delayBetweenBatches) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
        }
      }

      const processingTime = Date.now() - startTime.getTime();
      const result: BulkEmailResult = {
        campaignId,
        totalRecipients: recipients.length,
        successCount: progress.sent,
        failureCount: progress.failed,
        processingTime,
        batchResults,
        overallSuccess: progress.failed === 0,
      };

      logger.info('Bulk email campaign completed', {
        ...result,
        successRate: `${Math.round((progress.sent / recipients.length) * 100)}%`,
      });

      return result;

    } catch (error) {
      logger.error('Bulk email campaign failed', {
        campaignId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: progress.processed,
      });

      throw error;
    }
  }

  /**
   * Send template-based bulk emails
   */
  async sendBulkTemplateEmails<T extends BaseEmailTemplate>(
    recipients: Array<BulkEmailRecipient & { templateData: any }>,
    templateClass: new (data: any) => T,
    options: Omit<BulkEmailOptions, 'htmlContent' | 'textContent'>,
    progressCallback?: (progress: BulkEmailProgress) => void
  ): Promise<BulkEmailResult> {
    // Convert template-based emails to standard format
    const emailOptions: BulkEmailOptions = {
      ...options,
      // Template will be applied per recipient
    };

    const enhancedRecipients = recipients.map(recipient => ({
      ...recipient,
      customData: {
        ...recipient.customData,
        templateClass: templateClass.name,
        templateData: recipient.templateData,
      },
    }));

    return this.sendBulkEmails(enhancedRecipients, emailOptions, progressCallback);
  }

  /**
   * Process a single batch of recipients
   */
  private async processBatch(
    batch: BulkEmailRecipient[],
    options: BulkEmailOptions,
    campaignId: string,
    batchNumber: number
  ): Promise<{
    batchNumber: number;
    successCount: number;
    failureCount: number;
    errors: string[];
  }> {
    const batchId = `${campaignId}_batch_${batchNumber}`;
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Prepare email jobs for the queue
    const emailJobs: EmailJobData[] = batch.map(recipient => {
      // Generate personalized content if template is provided
      let htmlContent = options.htmlContent;
      let textContent = options.textContent;
      let subject = options.subject;

      // Apply personalization
      if (recipient.customData) {
        subject = this.personalizeContent(subject, {
          ...options.templateData,
          ...recipient.customData,
          recipientName: recipient.name,
          recipientEmail: recipient.email,
        });

        if (htmlContent) {
          htmlContent = this.personalizeContent(htmlContent, {
            ...options.templateData,
            ...recipient.customData,
            recipientName: recipient.name,
            recipientEmail: recipient.email,
          });
        }

        if (textContent) {
          textContent = this.personalizeContent(textContent, {
            ...options.templateData,
            ...recipient.customData,
            recipientName: recipient.name,
            recipientEmail: recipient.email,
          });
        }
      }

      // Add unsubscribe link if requested
      if (options.includeUnsubscribeLink) {
        const unsubscribeUrl = options.unsubscribeUrl || `${process.env.APP_URL}/unsubscribe`;
        const unsubscribeLink = `${unsubscribeUrl}?email=${encodeURIComponent(recipient.email)}&campaign=${campaignId}`;
        
        if (htmlContent) {
          htmlContent += `<br><br><small><a href="${unsubscribeLink}">Unsubscribe</a></small>`;
        }
        if (textContent) {
          textContent += `\n\nUnsubscribe: ${unsubscribeLink}`;
        }
      }

      return {
        to: recipient.email,
        subject,
        html: htmlContent,
        text: textContent,
        templateType: options.template || EmailTemplate.CUSTOM,
        recipientType: 'customer',
        metadata: {
          campaignId,
          batchId,
          batchNumber,
          recipientName: recipient.name,
          recipientMetadata: recipient.metadata,
          ...options.metadata,
        },
      };
    });

    try {
      // Queue all emails in the batch
      if (options.scheduledFor) {
        // Schedule for future delivery
        const delay = options.scheduledFor.getTime() - Date.now();
        const jobs = await Promise.all(
          emailJobs.map(emailJob =>
            this.emailQueueService.queueEmail(emailJob, {
              priority: options.priority || EmailPriority.NORMAL,
              delay: Math.max(0, delay),
              metadata: { campaignId, batchId },
            })
          )
        );

        // For scheduled emails, we consider them successful when queued
        successCount = jobs.length;
        
        logger.info('Batch scheduled successfully', {
          campaignId,
          batchNumber,
          batchId,
          scheduledFor: options.scheduledFor,
          emailCount: jobs.length,
        });

      } else {
        // Use bulk email job for immediate delivery
        const bulkJob = await this.emailQueueService.queueBulkEmails(emailJobs, {
          priority: options.priority || EmailPriority.NORMAL,
          metadata: { campaignId, batchId, batchNumber },
        });

        // Wait for the bulk job to complete (for immediate feedback)
        const result = await this.waitForJobCompletion(bulkJob);
        
        if (result.success) {
          successCount = emailJobs.length;
        } else {
          failureCount = emailJobs.length;
          errors.push(result.error || 'Bulk job failed');
        }
      }

    } catch (error) {
      failureCount = emailJobs.length;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      
      logger.error('Batch processing failed', {
        campaignId,
        batchNumber,
        batchId,
        error: errorMessage,
      });
    }

    return {
      batchNumber,
      successCount,
      failureCount,
      errors,
    };
  }

  /**
   * Personalize content with template variables
   */
  private personalizeContent(content: string, data: Record<string, any>): string {
    let personalizedContent = content;
    
    // Simple template variable replacement: {{variableName}}
    Object.keys(data).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = data[key];
      personalizedContent = personalizedContent.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        String(value || '')
      );
    });

    return personalizedContent;
  }

  /**
   * Wait for a queue job to complete
   */
  private async waitForJobCompletion(job: Job<EmailJobData>): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await job.finished();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Job failed',
      };
    }
  }

  /**
   * Get bulk email campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalFailed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  }> {
    try {
      // Query EmailLog for campaign statistics
      const stats = await EmailLog.findAll({
        where: { campaignId },
        attributes: [
          'status',
          [EmailLog.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['status'],
        raw: true,
      });

      const statMap = stats.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat.status] = parseInt(stat.count);
        return acc;
      }, {});

      const totalSent = statMap[EmailStatus.SENT] || 0;
      const totalDelivered = statMap[EmailStatus.DELIVERED] || 0;
      const totalOpened = statMap[EmailStatus.OPENED] || 0;
      const totalClicked = statMap[EmailStatus.CLICKED] || 0;
      const totalBounced = statMap[EmailStatus.BOUNCED] || 0;
      const totalFailed = statMap[EmailStatus.FAILED] || 0;

      const total = totalSent + totalFailed;

      return {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalFailed,
        deliveryRate: total > 0 ? (totalDelivered / total) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        bounceRate: total > 0 ? (totalBounced / total) * 100 : 0,
      };
    } catch (error) {
      logger.error('Failed to get campaign stats', {
        campaignId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalBounced: 0,
        totalFailed: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
      };
    }
  }

  /**
   * Cancel a bulk email campaign
   */
  async cancelCampaign(campaignId: string): Promise<{
    cancelled: number;
    alreadyProcessed: number;
  }> {
    let cancelled = 0;
    let alreadyProcessed = 0;

    try {
      // Find all queued emails for this campaign
      const queuedEmails = await EmailLog.findAll({
        where: {
          campaignId,
          status: EmailStatus.QUEUED,
        },
      });

      // Cancel queue jobs and update email logs
      for (const email of queuedEmails) {
        const queueJobId = email.getDataValue('queueJobId');
        if (queueJobId) {
          const jobCancelled = await this.emailQueueService.cancelJob(queueJobId);
          if (jobCancelled) {
            await email.update({ status: EmailStatus.CANCELLED });
            cancelled++;
          } else {
            alreadyProcessed++;
          }
        }
      }

      logger.info('Campaign cancellation completed', {
        campaignId,
        cancelled,
        alreadyProcessed,
      });

      return { cancelled, alreadyProcessed };

    } catch (error) {
      logger.error('Failed to cancel campaign', {
        campaignId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(): Promise<Array<{
    campaignId: string;
    totalEmails: number;
    sentEmails: number;
    failedEmails: number;
    status: 'running' | 'completed' | 'failed';
    startTime: Date;
    lastActivity: Date;
  }>> {
    try {
      const campaigns = await EmailLog.findAll({
        attributes: [
          'campaignId',
          [EmailLog.sequelize!.fn('COUNT', '*'), 'totalEmails'],
          [EmailLog.sequelize!.fn('COUNT', EmailLog.sequelize!.literal(
            `CASE WHEN status IN ('sent', 'delivered', 'opened', 'clicked') THEN 1 END`
          )), 'sentEmails'],
          [EmailLog.sequelize!.fn('COUNT', EmailLog.sequelize!.literal(
            `CASE WHEN status IN ('failed', 'bounced') THEN 1 END`
          )), 'failedEmails'],
          [EmailLog.sequelize!.fn('MIN', EmailLog.sequelize!.col('created_at')), 'startTime'],
          [EmailLog.sequelize!.fn('MAX', EmailLog.sequelize!.col('updated_at')), 'lastActivity'],
        ],
        where: {
          campaignId: { [Op.ne]: null as any },
        },
        group: ['campaignId'],
        having: EmailLog.sequelize!.literal('COUNT(*) > 1'), // Only campaigns with multiple emails
        raw: true,
      });

      return campaigns.map((campaign: any) => {
        const totalEmails = parseInt(campaign.totalEmails);
        const sentEmails = parseInt(campaign.sentEmails);
        const failedEmails = parseInt(campaign.failedEmails);
        const processedEmails = sentEmails + failedEmails;

        let status: 'running' | 'completed' | 'failed' = 'running';
        if (processedEmails >= totalEmails) {
          status = failedEmails > sentEmails ? 'failed' : 'completed';
        }

        return {
          campaignId: campaign.campaignId,
          totalEmails,
          sentEmails,
          failedEmails,
          status,
          startTime: new Date(campaign.startTime),
          lastActivity: new Date(campaign.lastActivity),
        };
      });

    } catch (error) {
      logger.error('Failed to get active campaigns', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return [];
    }
  }
}

// Export singleton instance
export const bulkEmailService = BulkEmailService.getInstance();