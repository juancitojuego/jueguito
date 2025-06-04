// export default { // CommonJS is more standard for jest.config.js
module.exports = {
  preset: 'ts-jest', // Using ts-jest preset, js-with-ts is an option if mixed JS/TS files need TS processing
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json', // Ensure this points to your tsconfig file
      useESM: true,
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
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mappings for SolidJS specific exports, if not handled by preset or ts-jest correctly
    // For example, to ensure browser versions are used:
    // 'solid-js/web': '<rootDir>/node_modules/solid-js/web/dist/dev.cjs',
    // 'solid-js': '<rootDir>/node_modules/solid-js/dist/dev.cjs',
  },
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  // Optional: collect coverage
  collectCoverage: true,
  coverageReporters: ["json", "lcov", "text", "clover"],
};
