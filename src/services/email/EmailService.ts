import { config } from '@config/environment';
import { EmailProvider, EmailOptions, EmailResult } from './providers/EmailProvider.interface';
import { AWSEmailProvider } from './providers/AWSEmailProvider';
import { SendGridProvider } from './providers/SendGridProvider';
import { ResendProvider } from './providers/ResendProvider';
import { SMTPProvider } from './providers/SMTPProvider';
import { BaseEmailTemplate } from './templates/BaseTemplate';
import { logger } from '@utils/logger';

export type EmailProviderType = 'aws-ses' | 'sendgrid' | 'resend' | 'smtp';

export class EmailService {
  private provider: EmailProvider;
  private static instance: EmailService;

  private constructor() {
    this.provider = this.initializeProvider();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initializeProvider(): EmailProvider {
    const providerType = config.email.provider as EmailProviderType;
    const defaultConfig = {
      from: config.email.from,
      fromName: config.email.fromName,
      replyTo: config.email.replyTo,
    };

    switch (providerType) {
      case 'aws-ses':
        return new AWSEmailProvider({
          ...defaultConfig,
          region: config.email.aws?.region || 'us-east-1',
          accessKeyId: config.email.aws?.accessKeyId,
          secretAccessKey: config.email.aws?.secretAccessKey,
        });

      case 'sendgrid':
        if (!config.email.sendgrid?.apiKey) {
          throw new Error('SendGrid API key is required');
        }
        return new SendGridProvider({
          ...defaultConfig,
          apiKey: config.email.sendgrid.apiKey,
        });

      case 'resend':
        if (!config.email.resend?.apiKey) {
          throw new Error('Resend API key is required');
        }
        return new ResendProvider({
          ...defaultConfig,
          apiKey: config.email.resend.apiKey,
        });

      case 'smtp':
      default:
        return new SMTPProvider({
          ...defaultConfig,
          host: config.email.smtp?.host || 'localhost',
          port: config.email.smtp?.port || 587,
          secure: config.email.smtp?.secure,
          auth: {
            user: config.email.smtp?.auth?.user || '',
            pass: config.email.smtp?.auth?.pass || '',
          },
          tls: config.email.smtp?.tls,
        });
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      return await this.provider.sendEmail(options);
    } catch (error) {
      logger.error('Error sending email', error);
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  async sendTemplate<T extends BaseEmailTemplate>(
    to: string | string[],
    template: T,
    options?: Partial<EmailOptions>
  ): Promise<EmailResult> {
    const emailOptions: EmailOptions = {
      to,
      subject: template.getSubject(),
      html: template.getHtml(),
      text: template.getText(),
      ...options,
    };

    return this.sendEmail(emailOptions);
  }

  async verifyConnection(): Promise<boolean> {
    try {
      return await this.provider.verifyConnection();
    } catch (error) {
      logger.error('Error verifying email connection', error);
      return false;
    }
  }

  async sendBulkEmails(emailsList: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // Send emails in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < emailsList.length; i += batchSize) {
      const batch = emailsList.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((email) => this.sendEmail(email)));
      results.push(...batchResults);

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < emailsList.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
