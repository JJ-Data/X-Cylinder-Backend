'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new profile fields to users table
    await queryInterface.addColumn('users', 'phone_number', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'alternate_phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'address', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'city', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'state', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'postal_code', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    // Add index on phone_number for faster searches
    await queryInterface.addIndex('users', ['phone_number'], {
      name: 'idx_users_phone_number'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the index first
    await queryInterface.removeIndex('users', 'idx_users_phone_number');

    // Remove the columns
    await queryInterface.removeColumn('users', 'phone_number');
    await queryInterface.removeColumn('users', 'alternate_phone');
    await queryInterface.removeColumn('users', 'address');
    await queryInterface.removeColumn('users', 'city');
    await queryInterface.removeColumn('users', 'state');
    await queryInterface.removeColumn('users', 'postal_code');
  }
};