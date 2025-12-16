'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lease_records', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },

      // Common lease links (you can extend later)
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

      outlet_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'outlets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      lease_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      return_date: { type: Sequelize.DATE, allowNull: true },

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

    await queryInterface.addIndex('lease_records', ['customer_id']);
    await queryInterface.addIndex('lease_records', ['cylinder_id']);
    await queryInterface.addIndex('lease_records', ['outlet_id']);
    await queryInterface.addIndex('lease_records', ['lease_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lease_records');
  },
};
