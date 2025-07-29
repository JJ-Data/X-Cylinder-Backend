import Queue, { Job, JobOptions, QueueOptions } from 'bull';
import { Queue as BullQueue } from 'bull';
import { EmailService } from './EmailService';
import { EmailOptions, EmailResult } from './providers/EmailProvider.interface';
import { logger } from '@utils/logger';
import { config } from '@config/environment';

export interface EmailJobData extends EmailOptions {
  templateType?: string;
  recipientType?: 'customer' | 'staff' | 'admin';
  entityType?: string;
  entityId?: string | number;
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface EmailJobResult extends EmailResult {
  processedAt: Date;
  processingTime: number;
  queuedAt: Date;
}

export enum EmailPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  URGENT = 15
}

export interface EmailQueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  totalProcessed: number;
}

export class EmailQueueService {
  private emailQueue!: BullQueue<EmailJobData>;
  private emailService: EmailService;
  private static instance: EmailQueueService;

  private constructor() {
    this.emailService = EmailService.getInstance();
    this.initializeQueue();
  }

  public static getInstance(): EmailQueueService {
    if (!EmailQueueService.instance) {
      EmailQueueService.instance = new EmailQueueService();
    }
    return EmailQueueService.instance;
  }

  private initializeQueue(): void {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    };

    const queueOptions: QueueOptions = {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3'),
        backoff: {
          type: 'exponential',
          delay: parseInt(process.env.EMAIL_RETRY_DELAY || '30000'), // 30 seconds
        },
        removeOnComplete: parseInt(process.env.EMAIL_KEEP_COMPLETED || '100'),
        removeOnFail: parseInt(process.env.EMAIL_KEEP_FAILED || '50'),
      },
    };

    this.emailQueue = new Queue<EmailJobData>('email-queue', queueOptions);

    this.setupQueueProcessors();
    this.setupQueueEventHandlers();

    logger.info('Email queue initialized', {
      redis: { host: redisConfig.host, port: redisConfig.port },
      concurrency: this.getConcurrency(),
    });
  }

  private setupQueueProcessors(): void {
    const concurrency = this.getConcurrency();

    // Main email processor
    this.emailQueue.process('send-email', concurrency, this.processEmailJob.bind(this));

    // Bulk email processor with lower concurrency
    this.emailQueue.process('send-bulk-email', Math.max(1, concurrency / 2), this.processBulkEmailJob.bind(this));

    // High priority processor
    this.emailQueue.process('send-urgent-email', concurrency * 2, this.processEmailJob.bind(this));
  }

  private setupQueueEventHandlers(): void {
    this.emailQueue.on('completed', (job: Job<EmailJobData>, result: EmailJobResult) => {
      logger.info('Email job completed', {
        jobId: job.id,
        recipient: Array.isArray(job.data.to) ? job.data.to.join(', ') : job.data.to,
        templateType: job.data.templateType,
        processingTime: result.processingTime,
        success: result.success,
      });
    });

    this.emailQueue.on('failed', (job: Job<EmailJobData>, error: Error) => {
      logger.error('Email job failed', {
        jobId: job.id,
        recipient: Array.isArray(job.data.to) ? job.data.to.join(', ') : job.data.to,
        templateType: job.data.templateType,
        error: error.message,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      });
    });

    this.emailQueue.on('stalled', (job: Job<EmailJobData>) => {
      logger.warn('Email job stalled', {
        jobId: job.id,
        recipient: Array.isArray(job.data.to) ? job.data.to.join(', ') : job.data.to,
        templateType: job.data.templateType,
      });
    });

    this.emailQueue.on('progress', (job: Job<EmailJobData>, progress: number) => {
      if (job.data.templateType === 'bulk-email') {
        logger.debug('Bulk email progress', {
          jobId: job.id,
          progress: `${progress}%`,
        });
      }
    });

    this.emailQueue.on('error', (error: Error) => {
      logger.error('Email queue error', { error: error.message });
    });
  }

  private getConcurrency(): number {
    return parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '5');
  }

  /**
   * Add an email to the queue
   */
  async queueEmail(
    emailData: EmailJobData,
    options?: {
      priority?: EmailPriority;
      delay?: number;
      attempts?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<Job<EmailJobData>> {
    const jobOptions: JobOptions = {
      priority: options?.priority || EmailPriority.NORMAL,
      delay: options?.delay,
      attempts: options?.attempts,
    };

    const jobData: EmailJobData = {
      ...emailData,
      metadata: {
        queuedAt: new Date(),
        ...options?.metadata,
      },
    };

    // Determine job type based on priority
    const jobType = options?.priority === EmailPriority.URGENT ? 'send-urgent-email' : 'send-email';

    const job = await this.emailQueue.add(jobType, jobData, jobOptions);

    logger.debug('Email queued', {
      jobId: job.id,
      recipient: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      templateType: emailData.templateType,
      priority: options?.priority || EmailPriority.NORMAL,
      delay: options?.delay,
    });

    return job;
  }

  /**
   * Add multiple emails to the queue as bulk job
   */
  async queueBulkEmails(
    emails: EmailJobData[],
    options?: {
      priority?: EmailPriority;
      batchSize?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<Job<EmailJobData>> {
    const bulkJobData: EmailJobData = {
      to: emails.map(email => Array.isArray(email.to) ? email.to.join(', ') : email.to).join('; '),
      subject: `Bulk Email - ${emails.length} recipients`,
      html: 'Bulk email job',
      templateType: 'bulk-email',
      metadata: {
        emails,
        batchSize: options?.batchSize || 10,
        queuedAt: new Date(),
        ...options?.metadata,
      },
    };

    const jobOptions: JobOptions = {
      priority: options?.priority || EmailPriority.NORMAL,
    };

    const job = await this.emailQueue.add('send-bulk-email', bulkJobData, jobOptions);

    logger.info('Bulk email queued', {
      jobId: job.id,
      emailCount: emails.length,
      batchSize: options?.batchSize || 10,
    });

    return job;
  }

  /**
   * Process individual email job
   */
  private async processEmailJob(job: Job<EmailJobData>): Promise<EmailJobResult> {
    const startTime = Date.now();
    
    try {
      const { metadata, templateType, recipientType, entityType, entityId, retryCount, ...emailOptions } = job.data;

      const result = await this.emailService.sendEmail(emailOptions);
      const processingTime = Date.now() - startTime;

      const jobResult: EmailJobResult = {
        ...result,
        processedAt: new Date(),
        processingTime,
        queuedAt: metadata?.queuedAt || new Date(),
      };

      // TODO: Log to EmailLog model when implemented
      logger.debug('Email processed', {
        jobId: job.id,
        success: result.success,
        processingTime,
        templateType,
        recipientType,
        entityType,
        entityId,
      });

      return jobResult;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error processing email job', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      });

      throw error;
    }
  }

  /**
   * Process bulk email job
   */
  private async processBulkEmailJob(job: Job<EmailJobData>): Promise<EmailJobResult> {
    const startTime = Date.now();
    
    try {
      const { metadata } = job.data;
      const emails = metadata?.emails as EmailJobData[];
      const batchSize = metadata?.batchSize || 10;

      if (!emails || !Array.isArray(emails)) {
        throw new Error('Invalid bulk email data');
      }

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      // Process emails in batches
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (emailData) => {
          try {
            const { metadata: emailMetadata, templateType, recipientType, entityType, entityId, retryCount, ...emailOptions } = emailData;
            const result = await this.emailService.sendEmail(emailOptions);
            
            if (result.success) {
              successCount++;
            } else {
              failureCount++;
              if (result.error) errors.push(result.error);
            }
            
            return result;
          } catch (error) {
            failureCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(errorMessage);
            return { success: false, messageId: '', error: errorMessage };
          }
        });

        await Promise.all(batchPromises);

        // Update progress
        const progress = Math.round(((i + batch.length) / emails.length) * 100);
        await job.progress(progress);

        // Small delay between batches to prevent overwhelming the email service
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const processingTime = Date.now() - startTime;
      const overallSuccess = successCount > 0 && failureCount === 0;

      const jobResult: EmailJobResult = {
        success: overallSuccess,
        messageId: `bulk-${job.id}`,
        error: errors.length > 0 ? errors.join('; ') : undefined,
        processedAt: new Date(),
        processingTime,
        queuedAt: metadata?.queuedAt || new Date(),
      };

      logger.info('Bulk email processed', {
        jobId: job.id,
        totalEmails: emails.length,
        successCount,
        failureCount,
        processingTime,
        successRate: `${Math.round((successCount / emails.length) * 100)}%`,
      });

      return jobResult;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Error processing bulk email job', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      });

      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<EmailQueueStats> {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      this.emailQueue.getWaiting(),
      this.emailQueue.getActive(),
      this.emailQueue.getCompleted(),
      this.emailQueue.getFailed(),
      this.emailQueue.getDelayed(),
      Promise.resolve([]), // getPaused not available
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: paused.length,
      totalProcessed: completed.length + failed.length,
    };
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job<EmailJobData> | null> {
    return this.emailQueue.getJob(jobId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info('Email job cancelled', { jobId });
      return true;
    }
    return false;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.retry();
      logger.info('Email job retried', { jobId });
      return true;
    }
    return false;
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    await this.emailQueue.pause();
    logger.info('Email queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    await this.emailQueue.resume();
    logger.info('Email queue resumed');
  }

  /**
   * Clean old jobs from the queue
   */
  async cleanQueue(options?: {
    grace?: number;
    status?: 'completed' | 'failed' | 'active' | 'waiting';
    limit?: number;
  }): Promise<Job<EmailJobData>[]> {
    const grace = options?.grace || 24 * 60 * 60 * 1000; // 24 hours
    const status = (options?.status || 'completed') as any;
    const limit = options?.limit || 100;

    const cleaned = await this.emailQueue.clean(grace, status, limit);
    
    logger.info('Email queue cleaned', {
      status,
      cleaned: cleaned.length,
      grace: `${grace}ms`,
    });

    return cleaned;
  }

  /**
   * Get queue health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    details: {
      redisConnection: boolean;
      queueStats: EmailQueueStats;
      averageProcessingTime?: number;
      errorRate?: number;
    };
  }> {
    try {
      const stats = await this.getQueueStats();
      const redisConnection = await this.testRedisConnection();
      
      // Calculate error rate
      const totalProcessed = stats.totalProcessed;
      const errorRate = totalProcessed > 0 ? (stats.failed / totalProcessed) * 100 : 0;
      
      // Determine health status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      if (!redisConnection) {
        status = 'critical';
      } else if (errorRate > 10 || stats.failed > 50) {
        status = 'warning';
      } else if (stats.waiting > 1000) {
        status = 'warning';
      }

      return {
        status,
        details: {
          redisConnection,
          queueStats: stats,
          errorRate: Math.round(errorRate * 100) / 100,
        },
      };
    } catch (error) {
      logger.error('Failed to get queue health status', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        status: 'critical',
        details: {
          redisConnection: false,
          queueStats: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
            totalProcessed: 0,
          },
        },
      };
    }
  }

  /**
   * Test Redis connection
   */
  private async testRedisConnection(): Promise<boolean> {
    try {
      await this.emailQueue.isReady();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gracefully close the queue
   */
  async close(): Promise<void> {
    await this.emailQueue.close();
    logger.info('Email queue closed');
  }
}

// Export singleton instance
export const emailQueueService = EmailQueueService.getInstance();