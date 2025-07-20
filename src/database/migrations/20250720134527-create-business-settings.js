'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create setting categories table
    await queryInterface.createTable('setting_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        allowNull: false,
      },
    });

    // Create business settings table
    await queryInterface.createTable('business_settings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'setting_categories',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      setting_key: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      setting_value: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      data_type: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'json', 'array'),
        allowNull: false,
        defaultValue: 'string',
      },
      // Scope and context fields
      outlet_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'outlets',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      cylinder_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      customer_tier: {
        type: Sequelize.ENUM('regular', 'business', 'premium'),
        allowNull: true,
      },
      operation_type: {
        type: Sequelize.ENUM('LEASE', 'REFILL', 'SWAP', 'REGISTRATION', 'PENALTY', 'DEPOSIT'),
        allowNull: true,
      },
      // Temporal settings
      effective_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      expiry_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // Metadata
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        allowNull: false,
      },
    });

    // Create pricing rules table
    await queryInterface.createTable('pricing_rules', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rule_type: {
        type: Sequelize.ENUM('base_price', 'discount', 'surcharge', 'conditional', 'volume_discount'),
        allowNull: false,
      },
      // Rule conditions and actions (JSON for flexibility)
      conditions: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'JSON object defining rule conditions',
      },
      actions: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'JSON object defining rule actions',
      },
      // Scope
      applies_to: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'JSON object defining what this rule applies to',
      },
      outlet_ids: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of outlet IDs, null means all outlets',
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      effective_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      expiry_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        allowNull: false,
      },
    });

    // Create settings audit table
    await queryInterface.createTable('settings_audit', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      setting_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'business_settings',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      rule_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'pricing_rules',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      action: {
        type: Sequelize.ENUM('created', 'updated', 'deleted', 'activated', 'deactivated'),
        allowNull: false,
      },
      old_value: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      new_value: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      changed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      change_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        allowNull: false,
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex('business_settings', ['setting_key', 'outlet_id', 'cylinder_type'], {
      name: 'idx_setting_scope'
    });
    
    await queryInterface.addIndex('business_settings', ['effective_date', 'expiry_date'], {
      name: 'idx_setting_dates'
    });
    
    await queryInterface.addIndex('business_settings', ['category_id', 'is_active'], {
      name: 'idx_category_active'
    });
    
    await queryInterface.addIndex('pricing_rules', ['rule_type', 'is_active'], {
      name: 'idx_rule_type_active'
    });
    
    await queryInterface.addIndex('pricing_rules', ['effective_date', 'expiry_date'], {
      name: 'idx_rule_dates'
    });
    
    await queryInterface.addIndex('settings_audit', ['setting_id', 'created_at'], {
      name: 'idx_audit_setting'
    });
    
    await queryInterface.addIndex('settings_audit', ['changed_by', 'created_at'], {
      name: 'idx_audit_user'
    });
  },

  async down (queryInterface, Sequelize) {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable('settings_audit');
    await queryInterface.dropTable('pricing_rules');
    await queryInterface.dropTable('business_settings');
    await queryInterface.dropTable('setting_categories');
  }
};
