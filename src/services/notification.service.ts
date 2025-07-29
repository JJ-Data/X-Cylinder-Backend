import { EmailService } from './email/EmailService';
import { BaseEmailTemplate } from './email/templates/BaseTemplate';
import { LeaseConfirmationEmail, LeaseConfirmationData } from './email/templates/LeaseConfirmationEmail';
import { RefillReceiptEmail, RefillReceiptData } from './email/templates/RefillReceiptEmail';
import { SwapReceiptEmail, SwapReceiptData } from './email/templates/SwapReceiptEmail';
import { ReturnOverdueEmail, ReturnOverdueData } from './email/templates/ReturnOverdueEmail';
import { WelcomeEmail } from './email/templates/WelcomeEmail';
import { PasswordResetEmail } from './email/templates/PasswordResetEmail';
import { EmailVerificationEmail } from './email/templates/EmailVerificationEmail';
import { PasswordChangeConfirmationEmail } from './email/templates/PasswordChangeConfirmationEmail';
import { LoginNotificationEmail } from './email/templates/LoginNotificationEmail';
import { PaymentReminderEmail } from './email/templates/PaymentReminderEmail';
import { EmailOptions, EmailResult } from './email/providers/EmailProvider.interface';
import { logger } from '@utils/logger';

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

export enum NotificationTemplate {
  LEASE_CONFIRMATION = 'lease_confirmation',
  REFILL_RECEIPT = 'refill_receipt',
  SWAP_RECEIPT = 'swap_receipt',
  RETURN_OVERDUE = 'return_overdue',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_CHANGE_CONFIRMATION = 'password_change_confirmation',
  LOGIN_NOTIFICATION = 'login_notification',
  PAYMENT_REMINDER = 'payment_reminder'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  pushToken?: string;
  name?: string;
  preferences?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
}

export interface NotificationRequest {
  template: NotificationTemplate;
  recipient: NotificationRecipient;
  data: any;
  priority?: NotificationPriority;
  channels?: NotificationType[];
  scheduledFor?: Date;
  metadata?: {
    entityType?: string;
    entityId?: string | number;
    source?: string;
  };
}

export interface NotificationResult {
  success: boolean;
  channels: {
    [key in NotificationType]?: {
      success: boolean;
      messageId?: string;
      error?: string;
    };
  };
  metadata?: any;
}

export class NotificationService {
  private emailService: EmailService;
  private static instance: NotificationService;

  private constructor() {
    this.emailService = EmailService.getInstance();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Send a notification using the specified template and data
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    const startTime = Date.now();
    const result: NotificationResult = {
      success: false,
      channels: {}
    };

    try {
      // Determine which channels to use
      const channels = this.determineChannels(request);
      
      // Send notification through each channel
      const channelPromises = channels.map(channel => 
        this.sendThroughChannel(channel, request)
      );

      const channelResults = await Promise.allSettled(channelPromises);

      // Process results
      let overallSuccess = false;
      channels.forEach((channel, index) => {
        const channelResult = channelResults[index];
        if (channelResult && channelResult.status === 'fulfilled' && channelResult.value?.success) {
          result.channels[channel] = channelResult.value;
          overallSuccess = true;
        } else {
          result.channels[channel] = {
            success: false,
            error: channelResult && channelResult.status === 'rejected' 
              ? (channelResult.reason as Error)?.message || 'Unknown error'
              : channelResult && channelResult.status === 'fulfilled' 
                ? channelResult.value?.error || 'Failed to send'
                : 'Unknown error'
          };
        }
      });

      result.success = overallSuccess;

      // Log notification attempt
      const duration = Date.now() - startTime;
      logger.info('Notification sent', {
        template: request.template,
        recipient: request.recipient.email || request.recipient.phone,
        channels: Object.keys(result.channels),
        success: result.success,
        duration: `${duration}ms`,
        metadata: request.metadata
      });

      return result;

    } catch (error) {
      logger.error('Failed to send notification', {
        template: request.template,
        recipient: request.recipient.email || request.recipient.phone,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: request.metadata
      });

      return {
        success: false,
        channels: {},
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Send multiple notifications in batch
   */
  async sendBatchNotifications(requests: NotificationRequest[]): Promise<NotificationResult[]> {
    const batchSize = 10; // Process in batches to avoid overwhelming the system
    const results: NotificationResult[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(request => this.sendNotification(request))
      );
      results.push(...batchResults);

      // Small delay between batches to prevent rate limiting
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Send email notification with specific template and data
   */
  async sendEmailNotification<T extends BaseEmailTemplate>(
    to: string,
    template: NotificationTemplate,
    data: any,
    options?: {
      priority?: NotificationPriority;
      metadata?: any;
    }
  ): Promise<EmailResult> {
    const emailTemplate = this.createEmailTemplate(template, { to, ...data });
    
    const emailOptions: EmailOptions = {
      to,
      subject: emailTemplate.getSubject(),
      html: emailTemplate.getHtml(),
      text: emailTemplate.getText()
    };

    try {
      const result = await this.emailService.sendEmail(emailOptions);
      
      logger.info('Email notification sent', {
        template,
        to,
        success: result.success,
        messageId: result.messageId,
        priority: options?.priority || NotificationPriority.NORMAL,
        metadata: options?.metadata
      });

      return result;
    } catch (error) {
      logger.error('Failed to send email notification', {
        template,
        to,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: options?.metadata
      });

      return {
        success: false,
        messageId: '',
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  /**
   * Determine which notification channels to use based on request and preferences
   */
  private determineChannels(request: NotificationRequest): NotificationType[] {
    const { recipient, channels } = request;
    
    // If specific channels are requested, use those
    if (channels && channels.length > 0) {
      return channels.filter(channel => this.isChannelAvailable(channel, recipient));
    }

    // Otherwise, determine based on recipient preferences and availability
    const availableChannels: NotificationType[] = [];
    
    // Email is the primary channel for most notifications
    if (recipient.email && recipient.preferences?.email !== false) {
      availableChannels.push(NotificationType.EMAIL);
    }
    
    // SMS for urgent notifications (when implemented)
    if (recipient.phone && recipient.preferences?.sms !== false) {
      // Only add SMS for high priority notifications
      if (request.priority === NotificationPriority.HIGH || request.priority === NotificationPriority.URGENT) {
        availableChannels.push(NotificationType.SMS);
      }
    }
    
    // Push notifications (when implemented)
    if (recipient.pushToken && recipient.preferences?.push !== false) {
      availableChannels.push(NotificationType.PUSH);
    }

    // Fallback to email if no channels are available
    if (availableChannels.length === 0 && recipient.email) {
      availableChannels.push(NotificationType.EMAIL);
    }

    return availableChannels;
  }

  /**
   * Check if a notification channel is available for the recipient
   */
  private isChannelAvailable(channel: NotificationType, recipient: NotificationRecipient): boolean {
    switch (channel) {
      case NotificationType.EMAIL:
        return !!recipient.email;
      case NotificationType.SMS:
        return !!recipient.phone;
      case NotificationType.PUSH:
        return !!recipient.pushToken;
      default:
        return false;
    }
  }

  /**
   * Send notification through a specific channel
   */
  private async sendThroughChannel(
    channel: NotificationType,
    request: NotificationRequest
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    switch (channel) {
      case NotificationType.EMAIL:
        return this.sendEmailChannel(request);
      case NotificationType.SMS:
        return this.sendSMSChannel(request);
      case NotificationType.PUSH:
        return this.sendPushChannel(request);
      default:
        return {
          success: false,
          error: `Unsupported notification channel: ${channel}`
        };
    }
  }

  /**
   * Send notification via email channel
   */
  private async sendEmailChannel(request: NotificationRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!request.recipient.email) {
      return { success: false, error: 'No email address provided' };
    }

    try {
      const emailTemplate = this.createEmailTemplate(request.template, {
        to: request.recipient.email,
        ...request.data
      });

      const emailOptions: EmailOptions = {
        to: request.recipient.email,
        subject: emailTemplate.getSubject(),
        html: emailTemplate.getHtml(),
        text: emailTemplate.getText()
      };

      const result = await this.emailService.sendEmail(emailOptions);
      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  /**
   * Send notification via SMS channel (placeholder for future implementation)
   */
  private async sendSMSChannel(request: NotificationRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement SMS sending logic
    logger.warn('SMS notifications not yet implemented', {
      template: request.template,
      recipient: request.recipient.phone
    });
    
    return {
      success: false,
      error: 'SMS notifications not yet implemented'
    };
  }

  /**
   * Send notification via Push channel (placeholder for future implementation)
   */
  private async sendPushChannel(request: NotificationRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // TODO: Implement push notification logic
    logger.warn('Push notifications not yet implemented', {
      template: request.template,
      recipient: request.recipient.pushToken
    });
    
    return {
      success: false,
      error: 'Push notifications not yet implemented'
    };
  }

  /**
   * Create an email template instance based on the template type and data
   */
  private createEmailTemplate(template: NotificationTemplate, data: any): BaseEmailTemplate {
    switch (template) {
      case NotificationTemplate.LEASE_CONFIRMATION:
        return new LeaseConfirmationEmail(data as LeaseConfirmationData);
      case NotificationTemplate.REFILL_RECEIPT:
        return new RefillReceiptEmail(data as RefillReceiptData);
      case NotificationTemplate.SWAP_RECEIPT:
        return new SwapReceiptEmail(data as any); // Using any due to interface conflict
      case NotificationTemplate.RETURN_OVERDUE:
        return new ReturnOverdueEmail(data as ReturnOverdueData);
      case NotificationTemplate.WELCOME:
        return new WelcomeEmail(data);
      case NotificationTemplate.PASSWORD_RESET:
        return new PasswordResetEmail(data);
      case NotificationTemplate.EMAIL_VERIFICATION:
        return new EmailVerificationEmail(data);
      case NotificationTemplate.PASSWORD_CHANGE_CONFIRMATION:
        return new PasswordChangeConfirmationEmail(data);
      case NotificationTemplate.LOGIN_NOTIFICATION:
        return new LoginNotificationEmail(data);
      case NotificationTemplate.PAYMENT_REMINDER:
        return new PaymentReminderEmail(data);
      default:
        throw new Error(`Unsupported email template: ${template}`);
    }
  }

  /**
   * Validate notification request
   */
  private validateRequest(request: NotificationRequest): void {
    if (!request.template) {
      throw new Error('Notification template is required');
    }

    if (!request.recipient) {
      throw new Error('Notification recipient is required');
    }

    if (!request.recipient.email && !request.recipient.phone && !request.recipient.pushToken) {
      throw new Error('At least one contact method is required for the recipient');
    }

    if (!request.data) {
      throw new Error('Notification data is required');
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(filters?: {
    template?: NotificationTemplate;
    channel?: NotificationType;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    totalNotifications: number;
    successRate: number;
    channelBreakdown: Record<NotificationType, number>;
    templateBreakdown: Record<NotificationTemplate, number>;
  }> {
    // TODO: Implement with EmailLog model when created
    logger.info('Notification stats requested', filters);
    
    return {
      totalNotifications: 0,
      successRate: 0,
      channelBreakdown: {
        [NotificationType.EMAIL]: 0,
        [NotificationType.SMS]: 0,
        [NotificationType.PUSH]: 0
      },
      templateBreakdown: {
        [NotificationTemplate.LEASE_CONFIRMATION]: 0,
        [NotificationTemplate.REFILL_RECEIPT]: 0,
        [NotificationTemplate.SWAP_RECEIPT]: 0,
        [NotificationTemplate.RETURN_OVERDUE]: 0,
        [NotificationTemplate.WELCOME]: 0,
        [NotificationTemplate.PASSWORD_RESET]: 0,
        [NotificationTemplate.EMAIL_VERIFICATION]: 0,
        [NotificationTemplate.PASSWORD_CHANGE_CONFIRMATION]: 0,
        [NotificationTemplate.LOGIN_NOTIFICATION]: 0,
        [NotificationTemplate.PAYMENT_REMINDER]: 0
      }
    };
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();