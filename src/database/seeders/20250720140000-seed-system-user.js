'use strict';

const SYSTEM_USER_ID = 1;

function pick(obj, keys) {
  for (const k of keys) if (k in obj) return k;
  return null;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      { replacements: [SYSTEM_USER_ID] }
    );
    if (existing.length) return;

    // Read actual columns from DB
    const cols = await queryInterface.describeTable('users');

    const row = { id: SYSTEM_USER_ID };

    // timestamps (handle both snake_case and camelCase)
    if (cols.created_at) row.created_at = new Date();
    if (cols.updated_at) row.updated_at = new Date();
    if (cols.createdAt) row.createdAt = new Date();
    if (cols.updatedAt) row.updatedAt = new Date();

    // common required fields (only set if column exists)
    const emailKey = pick(cols, ['email', 'Email']);
    if (emailKey) row[emailKey] = 'system@local';

    const nameKey = pick(cols, ['full_name', 'fullname', 'name', 'username']);
    if (nameKey) row[nameKey] = 'System';

    const roleKey = pick(cols, ['role', 'user_role', 'account_role']);
    if (roleKey) row[roleKey] = 'SUPER_ADMIN';

    const statusKey = pick(cols, ['status', 'account_status', 'is_active']);
    if (statusKey) row[statusKey] = statusKey === 'is_active' ? true : 'ACTIVE';

    const passKey = pick(cols, ['password', 'password_hash', 'passwordHash', 'hash']);
    if (passKey) row[passKey] = '!'; // placeholder; not meant for login

    await queryInterface.bulkInsert('users', [row]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { id: SYSTEM_USER_ID });
  },
};
