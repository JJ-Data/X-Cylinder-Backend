'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const cylinders = [];

    // Generate cylinders for each outlet
    const outlets = [
      { id: 1, prefix: 'MAIN' },
      { id: 2, prefix: 'NORTH' },
      { id: 3, prefix: 'SOUTH' },
    ];

    const types = [
      { type: '5kg', maxVolume: 5.0, count: 10 },
      { type: '10kg', maxVolume: 10.0, count: 8 },
      { type: '15kg', maxVolume: 15.0, count: 5 },
      { type: '50kg', maxVolume: 50.0, count: 2 },
    ];

    for (const outlet of outlets) {
      for (const cylinderType of types) {
        for (let i = 1; i <= cylinderType.count; i++) {
          const cylinderCode = `${outlet.prefix}-${cylinderType.type.toUpperCase()}-${String(i).padStart(3, '0')}`;
          const qrCode = `QR-${cylinderCode}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

          cylinders.push({
            code: cylinderCode,
            type: cylinderType.type,
            status:
              i <= cylinderType.count * 0.7
                ? 'available'
                : i <= cylinderType.count * 0.9
                  ? 'leased'
                  : 'refilling',
            current_outlet_id: outlet.id,
            qr_code: qrCode,
            manufacture_date: new Date(
              2020 + Math.floor(Math.random() * 3),
              Math.floor(Math.random() * 12),
              Math.floor(Math.random() * 28) + 1
            ),
            last_inspection_date: new Date(
              2023,
              Math.floor(Math.random() * 12),
              Math.floor(Math.random() * 28) + 1
            ),
            current_gas_volume: cylinderType.maxVolume * (0.2 + Math.random() * 0.6), // Random between 20% and 80%
            max_gas_volume: cylinderType.maxVolume,
            notes: null,
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
