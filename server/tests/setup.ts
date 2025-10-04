// Jest setup file
// This file runs before each test file

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'info'; // Use info level to capture logs
process.env.WEATHER_API_KEY = 'test-api-key';
process.env.DEFAULT_LOCATION = 'London';
process.env.TEMP_UNIT = 'C';

// Don't mock the logger - let it work normally for integration tests

// Mock uuid to avoid ES module issues
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-123')
}));
