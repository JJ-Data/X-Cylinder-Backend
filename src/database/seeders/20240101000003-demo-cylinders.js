'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Align with current schema (from SHOW CREATE TABLE cylinders):
    // id, code, size_kg, status, outlet_id, created_at, updated_at

    const cylinders = [];

    const outlets = [
      { id: 1, prefix: 'MAIN' },
      { id: 2, prefix: 'NORTH' },
      { id: 3, prefix: 'SOUTH' },
    ];

    const sizes = [
      { sizeKg: 5, count: 10 },
      { sizeKg: 10, count: 8 },
      { sizeKg: 15, count: 5 },
      { sizeKg: 50, count: 2 },
    ];

    for (const outlet of outlets) {
      for (const s of sizes) {
        for (let i = 1; i <= s.count; i++) {
          const code = `${outlet.prefix}-${String(s.sizeKg).padStart(2, '0')}KG-${String(i).padStart(3, '0')}`;

          // Status enum is: available | leased | maintenance | retired
          const r = Math.random();
          const status = r < 0.7 ? 'available' : r < 0.9 ? 'leased' : 'maintenance';

          cylinders.push({
            code,
            size_kg: s.sizeKg,
            status,
            outlet_id: outlet.id,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }
    }

    await queryInterface.bulkInsert('cylinders', cylinders, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('cylinders', null, {});
  },
};
