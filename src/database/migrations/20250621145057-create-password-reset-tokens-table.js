'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('password_reset_tokens', {
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
        onDelete: 'CASCADE',
      },
      token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      used: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('password_reset_tokens', ['token'], {
      unique: true,
      name: 'password_reset_tokens_token_unique',
    });

    await queryInterface.addIndex('password_reset_tokens', ['user_id'], {
      name: 'password_reset_tokens_user_id_index',
    });

    await queryInterface.addIndex('password_reset_tokens', ['expires_at'], {
      name: 'password_reset_tokens_expires_at_index',
    });

    await queryInterface.addIndex('password_reset_tokens', ['used'], {
      name: 'password_reset_tokens_used_index',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('password_reset_tokens');
  },
};