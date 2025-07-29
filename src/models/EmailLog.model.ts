import { DataTypes, Model } from 'sequelize';
import { sequelize } from '@config/database';
import { BaseModelAttributes } from '@app-types/common.types';

export enum EmailStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum EmailProvider {
  AWS_SES = 'aws-ses',
  SENDGRID = 'sendgrid',
  RESEND = 'resend',
  SMTP = 'smtp',
}

export enum EmailTemplate {
  LEASE_CONFIRMATION = 'lease_confirmation',
  REFILL_RECEIPT = 'refill_receipt',
  SWAP_RECEIPT = 'swap_receipt',
  RETURN_OVERDUE = 'return_overdue',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_CHANGE_CONFIRMATION = 'password_change_confirmation',
  LOGIN_NOTIFICATION = 'login_notification',
  PAYMENT_REMINDER = 'payment_reminder',
  CUSTOM = 'custom',
}

export interface EmailLogAttributes extends BaseModelAttributes {
  // Core email information
  recipient: string;
  recipientName?: string;
  subject: string;
  templateType: EmailTemplate;

  // Status and tracking
  status: EmailStatus;
  messageId?: string;

  // Provider information
  provider: EmailProvider;
  queueJobId?: string;

  // Timing information
  queuedAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  failedAt?: Date;

  // Content metadata
  contentSize?: number;
  hasAttachments?: boolean;

  // Error information
  errorMessage?: string;
  errorCode?: string;
  retryCount?: number;

  // Business context
  entityType?: string; // 'lease', 'refill', 'swap', 'user', etc.
  entityId?: number;
  userId?: number; // Recipient user ID if applicable

  // Additional metadata
  metadata?: Record<string, any>;

  // Tracking information
  userAgent?: string;
  ipAddress?: string;
  clickCount?: number;

  // Campaign/batch information
  campaignId?: string;
  batchId?: string;
}

export interface EmailLogCreationAttributes
  extends Omit<EmailLogAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export interface EmailLogUpdateAttributes
  extends Partial<
    Pick<
      EmailLogAttributes,
      | 'status'
      | 'messageId'
      | 'sentAt'
      | 'deliveredAt'
      | 'openedAt'
      | 'clickedAt'
      | 'failedAt'
      | 'errorMessage'
      | 'errorCode'
      | 'retryCount'
      | 'userAgent'
      | 'ipAddress'
      | 'clickCount'
      | 'metadata'
    >
  > {}

export interface EmailLogInstance
  extends Model<EmailLogAttributes, EmailLogCreationAttributes>,
    EmailLogAttributes {}

export const EmailLog = sequelize.define<EmailLogInstance>(
  'EmailLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    recipient: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'recipient',
      validate: {
        isEmail: true,
      },
    },
    recipientName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'recipient_name',
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'subject',
    },
    templateType: {
      type: DataTypes.ENUM(...Object.values(EmailTemplate)),
      allowNull: false,
      field: 'template_type',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(EmailStatus)),
      allowNull: false,
      defaultValue: EmailStatus.QUEUED,
      field: 'status',
    },
    messageId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'message_id',
    },
    provider: {
      type: DataTypes.ENUM(...Object.values(EmailProvider)),
      allowNull: false,
      field: 'provider',
    },
    queueJobId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'queue_job_id',
    },
    queuedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'queued_at',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at',
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'delivered_at',
    },
    openedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'opened_at',
    },
    clickedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'clicked_at',
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'failed_at',
    },
    contentSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'content_size',
      validate: {
        min: 0,
      },
    },
    hasAttachments: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'has_attachments',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
    errorCode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'error_code',
    },
    retryCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'retry_count',
      validate: {
        min: 0,
      },
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'entity_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'metadata',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
    },
    ipAddress: {
      type: DataTypes.STRING(45), // Supports IPv6
      allowNull: true,
      field: 'ip_address',
    },
    clickCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'click_count',
      validate: {
        min: 0,
      },
    },
    campaignId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'campaign_id',
    },
    batchId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'batch_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    tableName: 'email_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['recipient'],
        name: 'idx_email_logs_recipient',
      },
      {
        fields: ['status'],
        name: 'idx_email_logs_status',
      },
      {
        fields: ['template_type'],
        name: 'idx_email_logs_template_type',
      },
      {
        fields: ['provider'],
        name: 'idx_email_logs_provider',
      },
      {
        fields: ['created_at'],
        name: 'idx_email_logs_created_at',
      },
      {
        fields: ['sent_at'],
        name: 'idx_email_logs_sent_at',
      },
      {
        fields: ['entity_type', 'entity_id'],
        name: 'idx_email_logs_entity',
      },
      {
        fields: ['user_id'],
        name: 'idx_email_logs_user_id',
      },
      {
        fields: ['campaign_id'],
        name: 'idx_email_logs_campaign_id',
      },
      {
        fields: ['batch_id'],
        name: 'idx_email_logs_batch_id',
      },
      {
        fields: ['message_id'],
        name: 'idx_email_logs_message_id',
      },
      {
        fields: ['queue_job_id'],
        name: 'idx_email_logs_queue_job_id',
      },
      // Composite indexes for analytics
      {
        fields: ['template_type', 'status', 'created_at'],
        name: 'idx_email_logs_analytics_template',
      },
      {
        fields: ['provider', 'status', 'created_at'],
        name: 'idx_email_logs_analytics_provider',
      },
      {
        fields: ['status', 'sent_at'],
        name: 'idx_email_logs_delivery_tracking',
      },
    ],
  }
);

export default EmailLog;
