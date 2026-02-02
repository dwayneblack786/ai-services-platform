const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');

module.exports = [
  {
    // Global ignores
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '*.js', // Ignore JS files in root like jest.config.js, test-grpc.js
      'tests/setup.ts' // Setup files can be more lenient
    ]
  },
  {
    // TypeScript files
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      
      // Console usage - warn in source, allow in tests
      'no-console': ['warn', { 
        allow: ['warn', 'error', 'info', 'debug']
      }],
      
      // General code quality
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-throw-literal': 'error',
      'prefer-template': 'warn',
      'prefer-arrow-callback': 'warn',
      'no-duplicate-imports': 'error',
      
      // Error handling
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-unsafe-finally': 'error',
      
      // Best practices
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'error',
      'require-await': 'warn',
      
      // Style (minimal, let Prettier handle most)
      'semi': ['error', 'always'],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'comma-dangle': ['warn', 'only-multiline']
    }
  },
  {
    // Test files - more lenient
    files: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly'
      }
    },
    rules: {
      'no-console': 'off', // Allow console in tests
      '@typescript-eslint/no-explicit-any': 'off', // More lenient in tests
      '@typescript-eslint/no-non-null-assertion': 'off'
    }
  },
  {
    // Scripts and utilities - more lenient
    files: ['src/scripts/**/*.ts'],
    rules: {
      'no-console': 'off', // Scripts often need console output
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },
  {
    // Config files - allow console for validation/startup messages
    files: ['src/config/**/*.ts'],
    rules: {
      'no-console': ['warn', { 
        allow: ['warn', 'error', 'info', 'debug', 'log']
      }]
    }
  }
];
