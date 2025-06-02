module.exports = { // Changed from export default
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      babelConfig: {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
          'babel-preset-solid'
        ],
      },
    }],
    '^.+\\.jsx?$': ['ts-jest', {
      babelConfig: {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          'babel-preset-solid'
        ],
      },
    }],
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.ts'],
  clearMocks: true,
  collectCoverage: true,
  coverageReporters: ["json", "lcov", "text", "clover"],
};
