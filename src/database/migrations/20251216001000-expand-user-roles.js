'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Expand allowed roles
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('admin','staff','refill_operator','customer','user')
      NOT NULL DEFAULT 'user';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert back to original (admin/user only)
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('admin','user')
      NOT NULL DEFAULT 'user';
    `);
  },
};
