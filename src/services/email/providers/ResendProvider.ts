import { Resend } from 'resend';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
  EmailProviderConfig,
} from './EmailProvider.interface';
import { logger } from '@utils/logger';

interface ResendConfig extends EmailProviderConfig {
  apiKey: string;
}

export class ResendProvider extends EmailProvider {
  private resend: Resend;
  private resendConfig: ResendConfig;

  constructor(config: ResendConfig) {
    super(config);
    this.resendConfig = config;
    this.resend = new Resend(config.apiKey);
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const result = await this.resend.emails.send({
        from: options.from || this.config.from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html || '',
        text: options.text,
        replyTo: options.replyTo || this.config.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
        })),
      });

      logger.info('Email sent successfully via Resend', {
        messageId: result.data?.id,
        to: options.to,
      });

      return {
        messageId: result.data?.id || '',
        success: true,
      };
    } catch (error) {
      logger.error('Failed to send email via Resend', error);
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      // Test the connection by fetching domains
      const result = await this.resend.domains.list();
      return result.data !== null;
    } catch (error) {
      logger.error('Resend connection verification failed', error);
      return false;
    }
  }
}
