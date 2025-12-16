'use strict';

const SYSTEM_USER_ID = 1;

module.exports = {
  async up(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      { replacements: [SYSTEM_USER_ID] }
    );

    if (rows.length === 0) {
      await queryInterface.bulkInsert('users', [
        {
          id: SYSTEM_USER_ID,
          full_name: 'System',
          email: 'system@local',
          password_hash: '!',
          role: 'SUPER_ADMIN',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { id: SYSTEM_USER_ID });
  },
};
