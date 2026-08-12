/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  setupFiles: ['./src/__tests__/setup.env.ts'],
  setupFilesAfterEnv: ['./src/__tests__/setup.db.ts'],
  globalSetup: './src/__tests__/setup.global.ts',
  globalTeardown: './src/__tests__/teardown.global.ts',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: false } }],
  },
  clearMocks: true,
  testTimeout: 30000,
  verbose: true,
};
