import mysql from 'mysql2/promise';
import { config } from '@config/environment';

const createDatabase = async (): Promise<void> => {
  const connection = await mysql.createConnection({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.name}\`;`);
    console.log(`Database '${config.database.name}' created or already exists.`);
    
    if (config.isTest) {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.name}_test\`;`);
      console.log(`Test database '${config.database.name}_test' created or already exists.`);
    }
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  } finally {
    await connection.end();
  }
};

// Run if called directly
if (require.main === module) {
  createDatabase()
    .then(() => {
      console.log('Database creation complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database creation failed:', error);
      process.exit(1);
    });
}

export default createDatabase;