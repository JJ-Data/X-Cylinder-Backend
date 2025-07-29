'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Make password column nullable to support customers without passwords
     */
    await queryInterface.changeColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Revert password column back to NOT NULL
     * Note: This will fail if there are users with null passwords
     */
    await queryInterface.changeColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  }
};
