#!/usr/bin/env ts-node

import { sequelize } from '../config/database';

async function clearLoginSessions() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    
    console.log('Clearing login sessions table...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.query('TRUNCATE TABLE login_sessions');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ Login sessions cleared successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing login sessions:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  clearLoginSessions();
}

export { clearLoginSessions };