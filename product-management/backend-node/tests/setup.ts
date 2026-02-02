/**
 * Global test setup
 * Runs before all test suites
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.LOG_LEVEL = 'error'; // Minimize logs during tests

// Contract test environment variables
process.env.GRPC_SERVER_URL = process.env.GRPC_SERVER_URL || 'localhost:50051';
process.env.INFERO_API_URL = process.env.INFERO_API_URL || 'http://localhost:8136';

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for important test failures
  error: console.error,
};

// Set longer timeout for integration tests
jest.setTimeout(10000);
