// Jest setup file for ES modules
import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock process.env for tests
process.env.NODE_ENV = 'test';
process.env.TARGET_URL = 'https://test.example.com';
process.env.TARGET_FRAMEWORK = 'laravel';
process.env.TARGET_AUTH = 'sanctum';

// Global test utilities
global.testUtils = {
  // Helper to create test data
  createTestData: (overrides = {}) => ({
    target: {
      url: 'https://test.example.com',
      framework: 'laravel',
      auth: 'sanctum',
      baseURL: 'https://api.test.example.com',
      version: 'v1',
      timeout: 30000,
    },
    k6: {
      defaults: {
        vus: 1,
        duration: '10s',
        rampUp: '5s',
        thresholds: {
          http_req_duration: 'p(95)<500',
          http_req_failed: 'rate<1%',
        },
      },
    },
    ...overrides,
  }),
};
