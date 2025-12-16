'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('Test@123', 10);

    await queryInterface.bulkInsert(
      'users',
      [
        {
          email: 'admin@cylinderx.com',
          password: hashedPassword,
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          outlet_id: 1, // Main Outlet
          payment_status: 'active',
          activated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          email: 'manager.main@cylinderx.com',
          password: hashedPassword,
          first_name: 'John',
          last_name: 'Manager',
          role: 'staff',
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          outlet_id: 1, // Main Outlet
          payment_status: 'active',
          activated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          email: 'manager.north@cylinderx.com',
          password: hashedPassword,
          first_name: 'Sarah',
          last_name: 'Manager',
          role: 'staff',
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          outlet_id: 2, // North Branch
          payment_status: 'active',
          activated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          email: 'staff1@cylinderx.com',
          password: hashedPassword,
          first_name: 'Mike',
          last_name: 'Staff',
          role: 'staff',
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          outlet_id: 1, // Main Outlet
          payment_status: 'active',
          activated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          email: 'staff2@cylinderx.com',
          password: hashedPassword,
          first_name: 'Lisa',
          last_name: 'Staff',
          role: 'staff',
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          outlet_id: 2, // North Branch
          payment_status: 'active',
          activated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          email: 'operator1@cylinderx.com',
          password: hashedPassword,
          first_name: 'Tom',
          last_name: 'Operator',
          role: 'refill_operator',
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          outlet_id: 1, // Main Outlet
          payment_status: 'active',
          activated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          email: 'operator2@cylinderx.com',
          password: hashedPassword,
          first_name: 'Emma',
          last_name: 'Operator',
          role: 'refill_operator',
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          outlet_id: 2, // North Branch
          payment_status: 'active',
          activated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          email: 'customer1@example.com',
          password: hashedPassword,
          first_name: 'Robert',
          last_name: 'Customer',
          role: 'customer',
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          outlet_id: null, // Customers don't belong to outlets
          payment_status: 'active',
          activated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          email: 'customer2@example.com',
          password: hashedPassword,
          first_name: 'Alice',
          last_name: 'Customer',
          role: 'customer',
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          outlet_id: null, // Customers don't belong to outlets
          payment_status: 'active',
          activated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          email: 'customer3@example.com',
          password: hashedPassword,
          first_name: 'David',
          last_name: 'Customer',
          role: 'customer',
          is_active: true,
          email_verified: false,
          email_verified_at: null,
          outlet_id: null, // Customers don't belong to outlets
          payment_status: 'pending',
          activated_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );

    // ✅ Update outlets with manager IDs (lookup by email, not hardcoded IDs)
    await queryInterface.sequelize.query(`
      UPDATE outlets
      SET manager_id = (
        SELECT id FROM users WHERE email = 'manager.main@cylinderx.com' LIMIT 1
      )
      WHERE id = 1;
    `);

    await queryInterface.sequelize.query(`
      UPDATE outlets
      SET manager_id = (
        SELECT id FROM users WHERE email = 'manager.north@cylinderx.com' LIMIT 1
      )
      WHERE id = 2;
    `);
  },

  async down(queryInterface, Sequelize) {
    // First remove manager references from outlets
    await queryInterface.sequelize.query(`UPDATE outlets SET manager_id = NULL`);

    // Delete only the users we inserted (safer than deleting all users)
    await queryInterface.bulkDelete('users', {
      email: [
        'admin@cylinderx.com',
        'manager.main@cylinderx.com',
        'manager.north@cylinderx.com',
        'staff1@cylinderx.com',
        'staff2@cylinderx.com',
        'operator1@cylinderx.com',
        'operator2@cylinderx.com',
        'customer1@example.com',
        'customer2@example.com',
        'customer3@example.com',
      ],
    });
  },
};
