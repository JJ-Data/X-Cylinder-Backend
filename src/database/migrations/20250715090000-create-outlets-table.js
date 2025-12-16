'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('outlets', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      location: { type: Sequelize.TEXT, allowNull: false },
      contact_phone: { type: Sequelize.STRING(20), allowNull: false },
      contact_email: { type: Sequelize.STRING(255), allowNull: false },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      manager_id: { type: Sequelize.INTEGER, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('outlets', ['status'], { name: 'outlets_status_index' });
    await queryInterface.addIndex('outlets', ['manager_id'], { name: 'outlets_manager_id_index' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('outlets');
  },
};
