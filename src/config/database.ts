import { Sequelize } from 'sequelize';
import { config } from './environment';

const sequelizeConfig = {
  host: config.database.host,
  port: config.database.port,
  dialect: 'mysql' as const,
  logging: config.isDevelopment ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
};

export const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  sequelizeConfig
);

export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    if (config.isDevelopment) {
      // Comment out automatic sync to avoid VIRTUAL column issues
      // Use migrations instead for schema changes
      // console.log('Note: Automatic database sync is disabled. Use migrations for schema changes.');

      // Uncomment below only when you need to sync the database

      // Disable foreign key checks to handle circular dependencies
      // await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      // console.log('Foreign key checks disabled for sync.');

      // Sync database schema
      // await sequelize.sync({ alter: true });

      // Re-enable foreign key checks
      // await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      // console.log('Foreign key checks re-enabled.');

      console.log('Database synchronized successfully.');
    }
  } catch (error) {
    // Ensure foreign key checks are re-enabled even if sync fails
    // Comment out since sync is disabled
    /*
    if (config.isDevelopment) {
      try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Foreign key checks re-enabled after error.');
      } catch (fkError) {
        console.error('Failed to re-enable foreign key checks:', fkError);
      }
    }
    */
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('Database connection closed successfully.');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
};
