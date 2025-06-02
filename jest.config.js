module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/?(*.)+(spec|test).ts'], // Include /tests/ directory
  moduleNameMapper: { // If using path aliases in tsconfig, replicate here
    '^@src/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverage: true,
  coverageReporters: ["json", "lcov", "text", "clover"]
};
