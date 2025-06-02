const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettierPluginRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  {
    files: ['src/**/*.ts'], // Apply these rules only to TypeScript files in src
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Start with ESLint's recommended rules
      // 'eslint:recommended', // This is often a base
      // Then TypeScript-specific recommended rules
      ...tsPlugin.configs.recommended.rules,
      // ...tsPlugin.configs.recommendedTypeChecked.rules, // Or this for more type-aware rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  prettierPluginRecommended,
  {
    files: ['src/**/*.ts'], // Ensure Prettier rules also target TS files
    rules: {
      "prettier/prettier": ["warn", {"endOfLine": "auto"}]
    }
  }
];
