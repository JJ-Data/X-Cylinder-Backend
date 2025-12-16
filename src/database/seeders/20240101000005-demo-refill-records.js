'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Defensive: only insert columns that exist in the current DB schema.
    let refillTable;
    try {
      refillTable = await queryInterface.describeTable('refill_records');
    } catch (e) {
      console.log('refill_records table not found, skipping demo refill records');
      return;
    }

    const pickCols = (obj) => {
      const out = {};
      for (const k of Object.keys(obj)) {
        if (refillTable[k]) out[k] = obj[k];
      }
      return out;
    };

    // Operators: in current schema, role is only admin|user; treat users with an outlet as staff/operators.
    const operators = await queryInterface.sequelize.query(
      `SELECT id, outlet_id FROM users WHERE role IN ('admin','user') AND outlet_id IS NOT NULL ORDER BY id`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    // Get cylinders
    const cylinders = await queryInterface.sequelize.query(
      `SELECT id, outlet_id, size_kg FROM cylinders ORDER BY id LIMIT 30`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    const refillRecords = [];
    const now = new Date();
    
    cylinders.forEach((cylinder, index) => {
      // Find an operator from the same outlet
      const operator = operators.find(op => op.outlet_id === cylinder.outlet_id) || operators[0];
      
      // Generate 1-3 refill records per cylinder
      const numRefills = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numRefills; i++) {
        const refillDate = new Date(now.getTime() - (i * 30 + Math.random() * 20) * 24 * 60 * 60 * 1000); // Spaced out over time
        const maxVol = Number(cylinder.size_kg || 12.5);
        const preRefillVolume = parseFloat((Math.random() * maxVol * 0.3).toFixed(2)); // 0-30% full
        const postRefillVolume = parseFloat((maxVol * (0.9 + Math.random() * 0.1)).toFixed(2)); // 90-100% full
        const volumeAdded = parseFloat((postRefillVolume - preRefillVolume).toFixed(2));
        const costPerKg = 50; // Cost per kg
        const refillCost = parseFloat((volumeAdded * costPerKg).toFixed(2));
        
        refillRecords.push({
          cylinder_id: cylinder.id,
          operator_id: operator.id,
          outlet_id: cylinder.outlet_id,
          refill_date: refillDate,
          pre_refill_volume: preRefillVolume,
          post_refill_volume: postRefillVolume,
          refill_cost: refillCost,
          notes: i === 0 ? 'Regular refill' : null,
          batch_number: `BATCH-${refillDate.getFullYear()}${String(refillDate.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          created_at: refillDate,
          updated_at: refillDate
        });
      }
    });
    
    if (refillRecords.length > 0) {
      // Sort by date to ensure proper ordering
      refillRecords.sort((a, b) => a.refill_date.getTime() - b.refill_date.getTime());

      const rows = refillRecords.map(pickCols);
      await queryInterface.bulkInsert('refill_records', rows, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('refill_records', null, {});
  }
};