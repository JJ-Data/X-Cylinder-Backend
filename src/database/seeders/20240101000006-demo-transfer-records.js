'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ✅ This DB doesn't have a transfer_records table, so don't crash prod.
    // If you later add transfers, you can update this seeder to insert demo rows.
    const [tables] = await queryInterface.sequelize.query("SHOW TABLES LIKE 'transfer_records'");

    if (!tables || tables.length === 0) {
      console.log("[demo-transfer-records] Skipped: 'transfer_records' table not found.");
      return;
    }

    // If the table ever exists, insert demo rows here (optional)
    // const table = await queryInterface.describeTable("transfer_records");
    // await queryInterface.bulkInsert("transfer_records", [], {});
  },

  async down(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query("SHOW TABLES LIKE 'transfer_records'");

    if (!tables || tables.length === 0) return;

    await queryInterface.bulkDelete('transfer_records', null, {});
  },
};
