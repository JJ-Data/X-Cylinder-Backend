export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

export interface EmailProviderConfig {
  from: string;
  fromName: string;
  replyTo?: string;
}

export interface EmailResult {
  messageId: string;
  success: boolean;
  error?: string;
}

export abstract class EmailProvider {
  protected config: EmailProviderConfig;

  constructor(config: EmailProviderConfig) {
    this.config = config;
  }

  abstract sendEmail(options: EmailOptions): Promise<EmailResult>;
  abstract verifyConnection(): Promise<boolean>;
}
