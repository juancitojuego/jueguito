// src/tests/setupTests.ts

// Optional: For better assertion messages and more matchers for DOM elements.
// import '@testing-library/jest-dom/extend-expect';
import '@testing-library/jest-dom'; // Alternative import for extend-expect

// You can add other global setup here if needed.
// For example, mocking global objects or functions.

// If you need to polyfill `structuredClone` for Jest environment (jsdom)
// import 'core-js/actual/structured-clone'; // or require('core-js/actual/structured-clone');

// Ensure that any SolidJS-specific globals or setup needed for tests
// (beyond what jest-environment-jsdom and babel-preset-solid provide)
// could potentially be initialized here, though typically not required.

// console.log('Jest setupTests.ts loaded');

// Mock import.meta.env for Jest environment
// Vite uses import.meta.env.DEV, import.meta.env.PROD, etc.
Object.defineProperty(globalThis, 'import.meta', {
  value: {
    env: {
      DEV: true, // Default to DEV mode for tests
      PROD: false,
      // Add any other Vite-specific env variables your code might access
    },
  },
  writable: true, // Allows tests to modify if necessary, though usually not needed
});
