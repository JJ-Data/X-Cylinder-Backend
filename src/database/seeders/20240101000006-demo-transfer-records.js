'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ✅ ALL awaits must live inside here
    const table = await queryInterface.describeTable('transfer_records');

    // Build rows using ONLY columns that exist
    const rows = [
      {
        // example fields (adjust to your schema)
        cylinder_id: 1,
        from_outlet_id: 1,
        to_outlet_id: 2,
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ].map((r) => {
      const safe = {};
      for (const [k, v] of Object.entries(r)) {
        if (table[k]) safe[k] = v;
      }
      return safe;
    });

    if (rows.length) {
      await queryInterface.bulkInsert('transfer_records', rows, {});
    }
  },

  async down(queryInterface, Sequelize) {
    // ✅ awaits also allowed here
    await queryInterface.bulkDelete('transfer_records', null, {});
  },
};
