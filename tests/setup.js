// Global test setup
const logger = require('../src/utils/logger');

// Suppress logs during testing
logger.transports.forEach(transport => {
  transport.silent = true;
});

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Mock environment variables
process.env.KAFKA_BROKERS = 'localhost:9092';

// Global teardown
afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 100));
});
