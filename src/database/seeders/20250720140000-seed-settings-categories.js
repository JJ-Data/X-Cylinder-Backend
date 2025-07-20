'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    await queryInterface.bulkInsert('setting_categories', [
      {
        id: 1,
        name: 'PRICING',
        description: 'General pricing settings for all operations',
        icon: 'price-tag',
        is_active: true,
        display_order: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        name: 'LEASE',
        description: 'Cylinder lease specific settings and pricing',
        icon: 'calendar',
        is_active: true,
        display_order: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        name: 'REFILL',
        description: 'Gas refill operations and pricing settings',
        icon: 'gas-pump',
        is_active: true,
        display_order: 3,
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        name: 'SWAP',
        description: 'Cylinder swap operations and fee settings',
        icon: 'refresh',
        is_active: true,
        display_order: 4,
        created_at: now,
        updated_at: now,
      },
      {
        id: 5,
        name: 'REGISTRATION',
        description: 'Customer registration and onboarding settings',
        icon: 'user-plus',
        is_active: true,
        display_order: 5,
        created_at: now,
        updated_at: now,
      },
      {
        id: 6,
        name: 'PENALTIES',
        description: 'Penalty rates and fine settings',
        icon: 'alert-triangle',
        is_active: true,
        display_order: 6,
        created_at: now,
        updated_at: now,
      },
      {
        id: 7,
        name: 'DEPOSITS',
        description: 'Security deposit amounts and policies',
        icon: 'shield',
        is_active: true,
        display_order: 7,
        created_at: now,
        updated_at: now,
      },
      {
        id: 8,
        name: 'BUSINESS_RULES',
        description: 'General business operation rules and limits',
        icon: 'settings',
        is_active: true,
        display_order: 8,
        created_at: now,
        updated_at: now,
      },
      {
        id: 9,
        name: 'DISCOUNTS',
        description: 'Customer tier discounts and promotional settings',
        icon: 'percent',
        is_active: true,
        display_order: 9,
        created_at: now,
        updated_at: now,
      },
      {
        id: 10,
        name: 'TAXES',
        description: 'Tax rates and calculation settings',
        icon: 'calculator',
        is_active: true,
        display_order: 10,
        created_at: now,
        updated_at: now,
      },
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('setting_categories', null, {});
  }
};