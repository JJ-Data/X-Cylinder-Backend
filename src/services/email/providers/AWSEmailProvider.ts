import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
  EmailProviderConfig,
} from './EmailProvider.interface';
import { logger } from '@utils/logger';

interface AWSSESConfig extends EmailProviderConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class AWSEmailProvider extends EmailProvider {
  private sesClient: SESClient;
  private awsConfig: AWSSESConfig;

  constructor(config: AWSSESConfig) {
    super(config);
    this.awsConfig = config;

    this.sesClient = new SESClient({
      region: config.region,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined, // Use default AWS credentials if not provided
    });
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const params = {
        Source: options.from || this.config.from,
        Destination: {
          ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
          CcAddresses: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : [],
          BccAddresses: options.bcc
            ? Array.isArray(options.bcc)
              ? options.bcc
              : [options.bcc]
            : [],
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            ...(options.html && {
              Html: {
                Data: options.html,
                Charset: 'UTF-8',
              },
            }),
            ...(options.text && {
              Text: {
                Data: options.text,
                Charset: 'UTF-8',
              },
            }),
          },
        },
        ReplyToAddresses: options.replyTo
          ? [options.replyTo]
          : this.config.replyTo
            ? [this.config.replyTo]
            : [],
      };

      const command = new SendEmailCommand(params);
      const response = await this.sesClient.send(command);

      logger.info('Email sent successfully via AWS SES', {
        messageId: response.MessageId,
        to: options.to,
      });

      return {
        messageId: response.MessageId || '',
        success: true,
      };
    } catch (error) {
      logger.error('Failed to send email via AWS SES', error);
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    // AWS SES doesn't have a direct connection test, so we'll just verify the client is configured
    // You could implement a test by sending to a verified email or checking verified domains
    return true;
  }
}
