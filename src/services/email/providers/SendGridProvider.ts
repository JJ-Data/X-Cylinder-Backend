import sgMail from '@sendgrid/mail';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
  EmailProviderConfig,
} from './EmailProvider.interface';
import { logger } from '@utils/logger';

interface SendGridConfig extends EmailProviderConfig {
  apiKey: string;
}

export class SendGridProvider extends EmailProvider {
  private sendGridConfig: SendGridConfig;

  constructor(config: SendGridConfig) {
    super(config);
    this.sendGridConfig = config;
    sgMail.setApiKey(config.apiKey);
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const msg: any = {
        to: options.to,
        from: options.from || this.config.from,
        subject: options.subject,
        ...(options.html && { html: options.html }),
        ...(options.text && { text: options.text }),
        ...(options.replyTo && { replyTo: options.replyTo }),
        ...(options.cc && { cc: options.cc }),
        ...(options.bcc && { bcc: options.bcc }),
        ...(options.attachments && {
          attachments: options.attachments.map((att) => ({
            filename: att.filename,
            content: att.content ? att.content.toString('base64') : '',
            type: att.contentType,
            disposition: 'attachment',
          })),
        }),
      };

      const [response] = await sgMail.send(msg);

      logger.info('Email sent successfully via SendGrid', {
        messageId: response.headers['x-message-id'],
        to: options.to,
      });

      return {
        messageId: response.headers['x-message-id'] || '',
        success: true,
      };
    } catch (error) {
      logger.error('Failed to send email via SendGrid', error);
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    // SendGrid doesn't provide a direct connection test endpoint
    // The API key validity will be checked when sending an email
    return true;
  }
}
