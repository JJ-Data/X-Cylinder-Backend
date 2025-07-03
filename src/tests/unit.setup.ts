// Mock sequelize before any imports
jest.mock('@config/database', () => ({
  sequelize: {
    transaction: jest.fn(),
    define: jest.fn(),
    sync: jest.fn(),
    authenticate: jest.fn(),
    close: jest.fn(),
    query: jest.fn(),
  },
}));

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    splat: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

// Global test configuration
jest.setTimeout(10000);

// Suppress console errors during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Suppress unhandled rejection warnings in tests
process.on('unhandledRejection', () => {
  // Silently ignore in tests
});