'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Defensive: only insert columns that exist in the current DB schema.
    let transferTable;
    try {
      transferTable = await queryInterface.describeTable('transfer_records');
    } catch (e) {
      console.log('transfer_records table not found, skipping demo transfer records');
      return;
    }

    const pickCols = (obj) => {
      const out = {};
      for (const k of Object.keys(obj)) {
        if (transferTable[k]) out[k] = obj[k];
      }
      return out;
    };
    // Get outlets
    const outlets = await queryInterface.sequelize.query(
      `SELECT id FROM outlets WHERE status = 'active' ORDER BY id`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    if (outlets.length < 2) {
      console.log('Not enough outlets to create transfer records');
      return;
    }
    
    // Get staff members who can perform transfers
    const staff = await queryInterface.sequelize.query(
      `SELECT id, outlet_id FROM users WHERE role IN ('admin','user') AND outlet_id IS NOT NULL ORDER BY id`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    // Get some cylinders to transfer
    const cylinders = await queryInterface.sequelize.query(
      `SELECT id, outlet_id FROM cylinders WHERE status = 'available' ORDER BY id LIMIT 10`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    const transferRecords = [];
    const now = new Date();
    
    cylinders.forEach((cylinder, index) => {
      // Create 1-2 transfer records per cylinder
      const numTransfers = Math.floor(Math.random() * 2) + 1;
      let currentOutletId = cylinder.outlet_id;
      
      for (let i = 0; i < numTransfers; i++) {
        // Find a different outlet to transfer to
        const otherOutlets = outlets.filter(o => o.id !== currentOutletId);
        if (otherOutlets.length === 0) continue;
        
        const toOutlet = otherOutlets[Math.floor(Math.random() * otherOutlets.length)];
        const transferringStaff = staff.find(s => s.outlet_id === currentOutletId) || staff[0];
        const transferDate = new Date(now.getTime() - (i * 20 + Math.random() * 30) * 24 * 60 * 60 * 1000);
        
        const reasons = [
          'Stock balancing',
          'Customer request',
          'Inventory optimization',
          'Outlet shortage',
          'Seasonal demand'
        ];
        
        transferRecords.push({
          cylinder_id: cylinder.id,
          from_outlet_id: currentOutletId,
          to_outlet_id: toOutlet.id,
          transferred_by_id: transferringStaff.id,
          transfer_date: transferDate,
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          notes: i === 0 ? `Transferred from outlet ${currentOutletId} to outlet ${toOutlet.id}` : null,
          created_at: transferDate,
          updated_at: transferDate
        });
        
        // Update current outlet for next transfer
        currentOutletId = toOutlet.id;
      }
      
      // Update the cylinder's current outlet to match the last transfer
      if (transferRecords.length > 0) {
        const lastTransfer = transferRecords[transferRecords.length - 1];
        // Align with current cylinders schema: update outlet_id
        await queryInterface.sequelize.query(
          `UPDATE cylinders SET outlet_id = ${lastTransfer.to_outlet_id} WHERE id = ${cylinder.id}`
        );
      }
    });
    
    if (transferRecords.length > 0) {
      // Sort by date to ensure proper ordering
      transferRecords.sort((a, b) => a.transfer_date.getTime() - b.transfer_date.getTime());
      
      const rows = transferRecords.map(pickCols);
      await queryInterface.bulkInsert('transfer_records', rows, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('transfer_records', null, {});
  }
};