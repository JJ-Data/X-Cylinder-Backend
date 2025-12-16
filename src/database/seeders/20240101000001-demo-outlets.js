'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    let outletsTable;
    try {
      outletsTable = await queryInterface.describeTable('outlets');
    } catch (e) {
      console.log('outlets table not found, skipping demo outlets');
      return;
    }

    const pickCols = (obj) => {
      const out = {};
      for (const k of Object.keys(obj)) {
        if (outletsTable[k]) out[k] = obj[k];
      }
      return out;
    };

    const rows = [
      {
        name: 'Main Outlet',
        location: '123 Main Street, City Center',
        contact_phone: '+1234567890',
        contact_email: 'main@cylinderx.com',
        status: 'active',
        manager_id: null, // Will be updated after users are seeded
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'North Branch',
        location: '456 North Avenue, North District',
        contact_phone: '+1234567891',
        contact_email: 'north@cylinderx.com',
        status: 'active',
        manager_id: null, // Will be updated after users are seeded
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'South Branch',
        location: '789 South Boulevard, South District',
        contact_phone: '+1234567892',
        contact_email: 'south@cylinderx.com',
        status: 'active',
        manager_id: null, // Will be updated after users are seeded
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'East Branch',
        location: '321 East Road, East District',
        contact_phone: '+1234567893',
        contact_email: 'east@cylinderx.com',
        status: 'inactive',
        manager_id: null, // Will be updated after users are seeded
        created_at: new Date(),
        updated_at: new Date()
      }
    ].map(pickCols);

    await queryInterface.bulkInsert('outlets', rows, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('outlets', null, {});
  }
};