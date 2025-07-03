import { sequelize } from '@models/index';

beforeAll(async () => {
  // Sync database in test mode
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  // Close database connection
  await sequelize.close();
});