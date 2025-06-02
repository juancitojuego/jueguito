// export default { // CommonJS is more standard for jest.config.js
module.exports = {
  preset: 'ts-jest', // Using ts-jest preset, js-with-ts is an option if mixed JS/TS files need TS processing
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json', // Ensure this points to your tsconfig file
      babelConfig: {
        presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }], // Transpile modern JS for Node
            'babel-preset-solid' // For SolidJS JSX transformation
        ],
      },
    }],
    // If you have plain .js/.jsx files that need Solid JSX and ES6+ transpilation:
    // Ensure babel-jest and @babel/preset-env are installed if you uncomment this.
    // '^.+\\.jsx?$': ['babel-jest', {
    //   presets: [['@babel/preset-env', { targets: { node: 'current' } }], 'babel-preset-solid'],
    // }],
    // If .js files contain JSX, babel-jest and @babel/preset-env would be needed.
  },
  moduleNameMapper: {
    // Handle CSS imports (if any)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle path aliases if you use them in tsconfig.json
    '^@src/(.*)$': '<rootDir>/src/$1',
    // Mappings for SolidJS specific exports, if not handled by preset or ts-jest correctly
    // For example, to ensure browser versions are used:
    // 'solid-js/web': '<rootDir>/node_modules/solid-js/web/dist/dev.cjs',
    // 'solid-js': '<rootDir>/node_modules/solid-js/dist/dev.cjs',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.ts'], // For global test setup
  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,
  globals: {
    // Define import.meta.env for ts-jest, as setupFilesAfterEnv might be too late for transformations
    'ts-jest': {
      // Add any ts-jest specific options here if needed in the future
      // diagnostics: { ignoreCodes: ['TS1343', 'TS2339'] }, // Example if needed to suppress specific TS errors
    },
    'import.meta': {
      env: {
        DEV: true, // Mock Vite's DEV variable
        PROD: false,
        // Add other env variables your app uses from import.meta.env
      },
    },
  },
  // Optional: collect coverage
  collectCoverage: true,
  coverageReporters: ["json", "lcov", "text", "clover"],
};
