'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('lease_records', 'late_fees', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    });

    await queryInterface.addColumn('lease_records', 'last_notification_sent', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('lease_records', 'notification_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    });

    await queryInterface.addColumn('lease_records', 'last_overdue_check', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add indexes for performance
    await queryInterface.addIndex('lease_records', ['expected_return_date'], {
      name: 'idx_lease_records_expected_return_date'
    });

    await queryInterface.addIndex('lease_records', ['last_overdue_check'], {
      name: 'idx_lease_records_last_overdue_check'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('lease_records', 'idx_lease_records_expected_return_date');
    await queryInterface.removeIndex('lease_records', 'idx_lease_records_last_overdue_check');

    // Remove columns
    await queryInterface.removeColumn('lease_records', 'late_fees');
    await queryInterface.removeColumn('lease_records', 'last_notification_sent');
    await queryInterface.removeColumn('lease_records', 'notification_count');
    await queryInterface.removeColumn('lease_records', 'last_overdue_check');
  }
};