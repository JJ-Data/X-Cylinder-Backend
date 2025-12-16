'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Defensive: only insert columns that exist in the current DB schema.
    let leaseTable;
    try {
      leaseTable = await queryInterface.describeTable('lease_records');
    } catch (e) {
      console.log('lease_records table not found, skipping demo lease records');
      return;
    }

    const pickCols = (obj) => {
      const out = {};
      for (const k of Object.keys(obj)) {
        if (leaseTable[k]) out[k] = obj[k];
      }
      return out;
    };
    // Get some cylinders that are marked as 'leased'
    const leasedCylinders = await queryInterface.sequelize.query(
      `SELECT id, outlet_id FROM cylinders WHERE status = 'leased' LIMIT 20`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    // Get customer IDs (in current schema, role is only admin|user; customers are users without outlet)
    const customers = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE role = 'user' AND outlet_id IS NULL ORDER BY id`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    // Get staff IDs (users attached to an outlet)
    const staff = await queryInterface.sequelize.query(
      `SELECT id, outlet_id FROM users WHERE role IN ('admin','user') AND outlet_id IS NOT NULL ORDER BY id`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    const leaseRecords = [];
    const now = new Date();
    
    // Create lease records for leased cylinders
    leasedCylinders.forEach((cylinder, index) => {
      if (!customers.length || !staff.length) return;
      const customer = customers[index % customers.length];
      const staffMember = staff.find(s => s.outlet_id === cylinder.outlet_id) || staff[0];
      const leaseDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within last 30 days
      
      leaseRecords.push({
        cylinder_id: cylinder.id,
        customer_id: customer.id,
        outlet_id: cylinder.outlet_id,
        staff_id: staffMember.id,
        lease_date: leaseDate,
        expected_return_date: new Date(leaseDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days after lease
        actual_return_date: null,
        return_staff_id: null,
        lease_status: 'active',
        deposit_amount: 500.00,
        lease_amount: 50.00,
        refund_amount: null,
        notes: null,
        created_at: leaseDate,
        updated_at: new Date()
      });
    });
    
    // Create some returned lease records
    const availableCylinders = await queryInterface.sequelize.query(
      `SELECT id, outlet_id FROM cylinders WHERE status = 'available' LIMIT 10`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    availableCylinders.forEach((cylinder, index) => {
      if (!customers.length || !staff.length) return;
      const customer = customers[index % customers.length];
      const staffMember = staff.find(s => s.outlet_id === cylinder.outlet_id) || staff[0];
      const leaseDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000 - Math.random() * 30 * 24 * 60 * 60 * 1000); // 60-90 days ago
      const returnDate = new Date(leaseDate.getTime() + (20 + Math.random() * 20) * 24 * 60 * 60 * 1000); // Returned after 20-40 days
      
      leaseRecords.push({
        cylinder_id: cylinder.id,
        customer_id: customer.id,
        outlet_id: cylinder.outlet_id,
        staff_id: staffMember.id,
        lease_date: leaseDate,
        expected_return_date: new Date(leaseDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        actual_return_date: returnDate,
        return_staff_id: staffMember.id,
        lease_status: 'returned',
        deposit_amount: 500.00,
        lease_amount: 50.00,
        refund_amount: 450.00, // Deposit minus some charges
        notes: 'Cylinder returned in good condition',
        created_at: leaseDate,
        updated_at: returnDate
      });
    });
    
    if (leaseRecords.length > 0) {
      const rows = leaseRecords.map(pickCols);
      await queryInterface.bulkInsert('lease_records', rows, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('lease_records', null, {});
  }
};