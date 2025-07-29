/**
 * Jest Test Setup
 * Global configuration and setup for all test files
 */

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/feedbackhub_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
process.env.OPENAI_API_KEY = 'test-key-for-testing'; // Prevent OpenAI warnings in tests

// Increase timeout for database operations
jest.setTimeout(30000);

// Mock external services that might not be available in test environment
jest.mock('../services/ai/openaiService', () => ({
  isAvailable: jest.fn(() => false),
  analyzeFeedback: jest.fn(),
  generateEmbedding: jest.fn()
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Global test helpers
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: process.env.DEBUG_TESTS ? console.log : jest.fn(),
  debug: process.env.DEBUG_TESTS ? console.debug : jest.fn(),
  info: process.env.DEBUG_TESTS ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error,
}; 