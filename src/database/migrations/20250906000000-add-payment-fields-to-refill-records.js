'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Guard: ensure table exists
    const tables = (await queryInterface.showAllTables())
      .map((t) => (typeof t === 'string' ? t : t.tableName || t.name))
      .filter(Boolean)
      .map((t) => String(t).toLowerCase());

    if (!tables.includes('refill_records')) {
      console.log('⚠️ Skipping migration: refill_records table does not exist.');
      return;
    }

    const desc = await queryInterface.describeTable('refill_records');

    if (!desc.payment_method) {
      await queryInterface.addColumn('refill_records', 'payment_method', {
        type: Sequelize.ENUM('cash', 'pos', 'bank_transfer'),
        allowNull: true,
        defaultValue: 'cash',
      });
    }

    if (!desc.payment_reference) {
      await queryInterface.addColumn('refill_records', 'payment_reference', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const tables = (await queryInterface.showAllTables())
      .map((t) => (typeof t === 'string' ? t : t.tableName || t.name))
      .filter(Boolean)
      .map((t) => String(t).toLowerCase());

    if (!tables.includes('refill_records')) return;

    const desc = await queryInterface.describeTable('refill_records');

    if (desc.payment_reference) {
      await queryInterface.removeColumn('refill_records', 'payment_reference');
    }
    if (desc.payment_method) {
      await queryInterface.removeColumn('refill_records', 'payment_method');
    }
  },
};
