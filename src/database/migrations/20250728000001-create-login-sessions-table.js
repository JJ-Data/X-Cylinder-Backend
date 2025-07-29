'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('login_sessions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      session_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true,
      },
      ip_address: {
        type: Sequelize.STRING(45), // IPv6 support
        allowNull: false,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      device_info: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      browser_info: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      login_type: {
        type: Sequelize.ENUM('normal', 'suspicious', 'new_device'),
        defaultValue: 'normal',
        allowNull: false,
      },
      is_suspicious: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      is_new_device: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      email_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      login_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      logout_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('login_sessions', ['user_id'], {
      name: 'idx_login_sessions_user_id'
    });

    await queryInterface.addIndex('login_sessions', ['session_id'], {
      name: 'idx_login_sessions_session_id'
    });

    await queryInterface.addIndex('login_sessions', ['ip_address'], {
      name: 'idx_login_sessions_ip_address'
    });

    await queryInterface.addIndex('login_sessions', ['login_time'], {
      name: 'idx_login_sessions_login_time'
    });

    await queryInterface.addIndex('login_sessions', ['is_active'], {
      name: 'idx_login_sessions_is_active'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('login_sessions', 'idx_login_sessions_user_id');
    await queryInterface.removeIndex('login_sessions', 'idx_login_sessions_session_id');
    await queryInterface.removeIndex('login_sessions', 'idx_login_sessions_ip_address');
    await queryInterface.removeIndex('login_sessions', 'idx_login_sessions_login_time');
    await queryInterface.removeIndex('login_sessions', 'idx_login_sessions_is_active');

    // Drop the table
    await queryInterface.dropTable('login_sessions');
  }
};