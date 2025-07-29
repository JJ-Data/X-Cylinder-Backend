import nodemailer, { Transporter } from 'nodemailer';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
  EmailProviderConfig,
} from './EmailProvider.interface';
import { logger } from '@utils/logger';

interface SMTPConfig extends EmailProviderConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized?: boolean;
  };
}

export class SMTPProvider extends EmailProvider {
  private transporter: Transporter;
  private smtpConfig: SMTPConfig;

  constructor(config: SMTPConfig) {
    super(config);
    this.smtpConfig = config;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure || config.port === 465, // true for 465, false for other ports
      auth: config.auth,
      tls: config.tls,
    });
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const mailOptions = {
        from: `${this.config.fromName} <${this.config.from}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || this.config.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType,
        })),
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully via SMTP', {
        messageId: info.messageId,
        to: options.to,
      });

      return {
        messageId: info.messageId,
        success: true,
      };
    } catch (error) {
      logger.error('Failed to send email via SMTP', error);
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed', error);
      return false;
    }
  }
}
