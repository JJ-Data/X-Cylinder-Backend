'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // outlet_id column
    await queryInterface.addColumn('users', 'outlet_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // payment_status + activated_at (your model + seeders use these)
    await queryInterface.addColumn('users', 'payment_status', {
      type: Sequelize.ENUM('pending', 'active', 'inactive'),
      allowNull: true,
      defaultValue: 'pending',
    });

    await queryInterface.addColumn('users', 'activated_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex('users', ['outlet_id'], { name: 'users_outlet_id_index' });
    await queryInterface.addIndex('users', ['payment_status'], {
      name: 'users_payment_status_index',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'users_payment_status_index');
    await queryInterface.removeIndex('users', 'users_outlet_id_index');
    await queryInterface.removeColumn('users', 'activated_at');
    await queryInterface.removeColumn('users', 'payment_status');
    await queryInterface.removeColumn('users', 'outlet_id');
  },
};
