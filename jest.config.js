export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    roots: ['<rootDir>/server/tests'],
    testMatch: ['**/*.test.ts'],
    collectCoverageFrom: [
        'server/src/**/*.ts',
        '!server/src/**/*.d.ts',
        '!server/src/**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/server/tests/setup.ts'],
    extensionsToTreatAsEsm: ['.ts'],
    globals: {
        'ts-jest': {
            useESM: true
        }
    }
};
