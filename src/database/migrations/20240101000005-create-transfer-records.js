// src/database/migrations/20240101000005-create-transfer-records.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transfer_records', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      // adjust these to match your app/model
      from_outlet_id: { type: Sequelize.INTEGER, allowNull: false },
      to_outlet_id: { type: Sequelize.INTEGER, allowNull: false },

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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('transfer_records');
  },
};
