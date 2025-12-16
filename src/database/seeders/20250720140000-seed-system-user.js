'use strict';

const SYSTEM_USER_ID = 1;

function pick(obj, keys) {
  for (const k of keys) if (k in obj) return k;
  return null;
}

function parseEnum(typeStr) {
  // e.g. "ENUM('ADMIN','STAFF')" -> ["ADMIN","STAFF"]
  const m = String(typeStr).match(/^enum\((.*)\)$/i);
  if (!m) return null;
  return m[1].split(',').map((s) =>
    s
      .trim()
      .replace(/^'(.*)'$/, '$1')
      .replace(/^"(.*)"$/, '$1')
  );
}

function parseVarcharLen(typeStr) {
  // e.g. "VARCHAR(10)" -> 10
  const m = String(typeStr).match(/^varchar\((\d+)\)$/i);
  return m ? Number(m[1]) : null;
}

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      { replacements: [SYSTEM_USER_ID] }
    );
    if (existing.length) return;

    const cols = await queryInterface.describeTable('users');
    const row = { id: SYSTEM_USER_ID };

    // timestamps
    if (cols.created_at) row.created_at = new Date();
    if (cols.updated_at) row.updated_at = new Date();
    if (cols.createdAt) row.createdAt = new Date();
    if (cols.updatedAt) row.updatedAt = new Date();

    // role (fit ENUM or VARCHAR)
    const roleKey = pick(cols, ['role', 'user_role', 'account_role']);
    if (roleKey) {
      const typeStr = cols[roleKey].type;
      const enumVals = parseEnum(typeStr);

      if (enumVals && enumVals.length) {
        // prefer ADMIN if available, else first enum option
        row[roleKey] = enumVals.includes('ADMIN') ? 'ADMIN' : enumVals[0];
      } else {
        const maxLen = parseVarcharLen(typeStr);
        const preferred = 'ADMIN';
        row[roleKey] = maxLen ? preferred.slice(0, maxLen) : preferred;
      }
    }

    // optional: email/name/password only if columns exist
    const emailKey = pick(cols, ['email']);
    if (emailKey) row[emailKey] = 'system@local';

    const nameKey = pick(cols, ['full_name', 'fullname', 'name', 'username']);
    if (nameKey) row[nameKey] = 'System';

    const passKey = pick(cols, ['password', 'password_hash', 'passwordHash', 'hash']);
    if (passKey) row[passKey] = '!';

    await queryInterface.bulkInsert('users', [row]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { id: SYSTEM_USER_ID });
  },
};
