'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('email_verification_tokens', {
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
      verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    // Add indexes
    await queryInterface.addIndex('email_verification_tokens', ['token'], {
      unique: true,
      name: 'email_verification_tokens_token_unique',
    });

    await queryInterface.addIndex('email_verification_tokens', ['user_id'], {
      name: 'email_verification_tokens_user_id',
    });

    await queryInterface.addIndex('email_verification_tokens', ['expires_at'], {
      name: 'email_verification_tokens_expires_at',
    });

    await queryInterface.addIndex('email_verification_tokens', ['verified'], {
      name: 'email_verification_tokens_verified',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('email_verification_tokens');
  },
};