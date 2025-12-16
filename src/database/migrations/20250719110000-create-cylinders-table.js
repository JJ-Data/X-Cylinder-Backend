'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cylinders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },

      code: { type: Sequelize.STRING(100), allowNull: false, unique: true }, // serial/unique identifier
      size_kg: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      status: {
        type: Sequelize.ENUM('available', 'leased', 'maintenance', 'retired'),
        allowNull: false,
        defaultValue: 'available',
      },

      outlet_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'outlets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

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

    await queryInterface.addIndex('cylinders', ['status']);
    await queryInterface.addIndex('cylinders', ['outlet_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cylinders');
  },
};
