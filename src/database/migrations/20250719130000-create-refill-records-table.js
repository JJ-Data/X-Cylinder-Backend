'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refill_records', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },

      outlet_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'outlets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      staff_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      cylinder_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'cylinders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      refill_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('refill_records', ['outlet_id']);
    await queryInterface.addIndex('refill_records', ['staff_id']);
    await queryInterface.addIndex('refill_records', ['customer_id']);
    await queryInterface.addIndex('refill_records', ['cylinder_id']);
    await queryInterface.addIndex('refill_records', ['refill_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refill_records');
  },
};
