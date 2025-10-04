// Jest setup file
// This file runs before each test file

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
    // Suppress console.error and console.warn during tests unless explicitly needed
    console.error = jest.fn();
    console.warn = jest.fn();
});

afterEach(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.WEATHER_API_KEY = 'test-api-key';
process.env.DEFAULT_LOCATION = 'London';
process.env.TEMP_UNIT = 'C';
