export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '\\.module\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: './tsconfig.test.json',
    }],
  },

  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  testMatch: [
    '<rootDir>/tests/**/*.(test|spec).(ts|tsx)',
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],

  collectCoverage: true,
  collectCoverageFrom: [
    // Utils (already tested)
    'src/utils/*.{ts,tsx}',
    
    // Store and Redux logic
    'src/store/**/*.{ts,tsx}',
    
    // Custom hooks
    'src/hooks/*.{ts,tsx}',
    
    // React components
    'src/components/**/*.{tsx}',
    
    // Pages
    'src/pages/*.{tsx}',
    
    // Types (local types, not shared)
    'src/types/*.{ts}',
    
    // Exclusions
    '!src/**/*.d.ts',
    '!src/vite-env.d.ts',
    '!src/main.tsx', // Entry point
    '!src/App.tsx', // Main app wrapper (integration test territory)
    '!src/**/index.ts', // Re-export files
    '!src/**/*.module.css.d.ts', // CSS module type definitions
  ],

  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'html',
    'lcov',
  ],

  coverageThreshold: {
    global: {
      branches: 50,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  clearMocks: true,
  restoreMocks: true,

  verbose: true,
};
