// jest.config.js
module.exports = {
  preset: 'ts-jest', // Use ts-jest preset
  testEnvironment: 'node', // Test environment for Node.js
  roots: ['<rootDir>/tests'], // Look for tests in the 'tests' directory
  testMatch: [ // Patterns Jest uses to detect test files
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: { // A map from regular expressions to paths to transformers
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      // ts-jest configuration options
      tsconfig: 'tsconfig.json', // Explicitly point to the tsconfig.json file
      // diagnostics: { // Optional: configure how diagnostics are handled
      //   ignoreCodes: [], // You can ignore specific TS error codes during tests
      //   warnOnly: true, // If true, TS errors will be warnings, not failures
      // },
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // File extensions Jest will look for
  // collectCoverage: true, // Uncomment to enable test coverage collection
  // coverageDirectory: "coverage", // Directory where coverage reports will be saved
  // coverageReporters: ["json", "lcov", "text", "clover"], // Coverage report formats
};
