'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('email_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      recipient: {
        type: Sequelize.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      recipient_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      template_type: {
        type: Sequelize.ENUM(
          'lease_confirmation',
          'refill_receipt',
          'swap_receipt',
          'return_overdue',
          'welcome',
          'password_reset',
          'email_verification',
          'password_change_confirmation',
          'login_notification',
          'payment_reminder',
          'custom'
        ),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          'queued',
          'sending',
          'sent',
          'delivered',
          'opened',
          'clicked',
          'bounced',
          'failed',
          'cancelled'
        ),
        allowNull: false,
        defaultValue: 'queued',
      },
      message_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      provider: {
        type: Sequelize.ENUM('aws-ses', 'sendgrid', 'resend', 'smtp'),
        allowNull: false,
      },
      queue_job_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      queued_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      opened_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      clicked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      content_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      has_attachments: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      error_code: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45), // Supports IPv6
        allowNull: true,
      },
      click_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      campaign_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      batch_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('email_logs', ['recipient'], {
      name: 'idx_email_logs_recipient'
    });

    await queryInterface.addIndex('email_logs', ['status'], {
      name: 'idx_email_logs_status'
    });

    await queryInterface.addIndex('email_logs', ['template_type'], {
      name: 'idx_email_logs_template_type'
    });

    await queryInterface.addIndex('email_logs', ['provider'], {
      name: 'idx_email_logs_provider'
    });

    await queryInterface.addIndex('email_logs', ['created_at'], {
      name: 'idx_email_logs_created_at'
    });

    await queryInterface.addIndex('email_logs', ['sent_at'], {
      name: 'idx_email_logs_sent_at'
    });

    await queryInterface.addIndex('email_logs', ['entity_type', 'entity_id'], {
      name: 'idx_email_logs_entity'
    });

    await queryInterface.addIndex('email_logs', ['user_id'], {
      name: 'idx_email_logs_user_id'
    });

    await queryInterface.addIndex('email_logs', ['campaign_id'], {
      name: 'idx_email_logs_campaign_id'
    });

    await queryInterface.addIndex('email_logs', ['batch_id'], {
      name: 'idx_email_logs_batch_id'
    });

    await queryInterface.addIndex('email_logs', ['message_id'], {
      name: 'idx_email_logs_message_id'
    });

    await queryInterface.addIndex('email_logs', ['queue_job_id'], {
      name: 'idx_email_logs_queue_job_id'
    });

    // Composite indexes for analytics
    await queryInterface.addIndex('email_logs', ['template_type', 'status', 'created_at'], {
      name: 'idx_email_logs_analytics_template'
    });

    await queryInterface.addIndex('email_logs', ['provider', 'status', 'created_at'], {
      name: 'idx_email_logs_analytics_provider'
    });

    await queryInterface.addIndex('email_logs', ['status', 'sent_at'], {
      name: 'idx_email_logs_delivery_tracking'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('email_logs');
  }
};
