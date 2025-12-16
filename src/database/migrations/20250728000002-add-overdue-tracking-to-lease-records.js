'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Guard: ensure table exists
    const tables = (await queryInterface.showAllTables())
      .map((t) => (typeof t === 'string' ? t : t.tableName || t.name))
      .filter(Boolean)
      .map((t) => String(t).toLowerCase());

    if (!tables.includes('lease_records')) {
      console.log('⚠️ Skipping migration: lease_records table does not exist.');
      return;
    }

    const desc = await queryInterface.describeTable('lease_records');

    // Add columns only if they don't exist
    if (!desc.late_fees) {
      await queryInterface.addColumn('lease_records', 'late_fees', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      });
    }

    if (!desc.last_notification_sent) {
      await queryInterface.addColumn('lease_records', 'last_notification_sent', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!desc.notification_count) {
      await queryInterface.addColumn('lease_records', 'notification_count', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }

    if (!desc.last_overdue_check) {
      await queryInterface.addColumn('lease_records', 'last_overdue_check', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // Add indexes safely (won't crash if they already exist)
    // NOTE: expected_return_date must exist for this index to work.
    const desc2 = await queryInterface.describeTable('lease_records');

    if (desc2.expected_return_date) {
      try {
        await queryInterface.addIndex('lease_records', ['expected_return_date'], {
          name: 'idx_lease_records_expected_return_date',
        });
      } catch (e) {
        // ignore if index already exists
      }
    } else {
      console.log(
        '⚠️ Skipping index idx_lease_records_expected_return_date: expected_return_date column not found.'
      );
    }

    try {
      await queryInterface.addIndex('lease_records', ['last_overdue_check'], {
        name: 'idx_lease_records_last_overdue_check',
      });
    } catch (e) {
      // ignore if index already exists
    }
  },

  async down(queryInterface) {
    const tables = (await queryInterface.showAllTables())
      .map((t) => (typeof t === 'string' ? t : t.tableName || t.name))
      .filter(Boolean)
      .map((t) => String(t).toLowerCase());

    if (!tables.includes('lease_records')) return;

    // Remove indexes first (ignore errors if missing)
    try {
      await queryInterface.removeIndex('lease_records', 'idx_lease_records_expected_return_date');
    } catch (e) {}

    try {
      await queryInterface.removeIndex('lease_records', 'idx_lease_records_last_overdue_check');
    } catch (e) {}

    // Remove columns only if they exist
    const desc = await queryInterface.describeTable('lease_records');

    if (desc.late_fees) {
      await queryInterface.removeColumn('lease_records', 'late_fees');
    }
    if (desc.last_notification_sent) {
      await queryInterface.removeColumn('lease_records', 'last_notification_sent');
    }
    if (desc.notification_count) {
      await queryInterface.removeColumn('lease_records', 'notification_count');
    }
    if (desc.last_overdue_check) {
      await queryInterface.removeColumn('lease_records', 'last_overdue_check');
    }
  },
};
