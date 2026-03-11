import '@testing-library/jest-dom';

(globalThis as Record<string, unknown>).__SOCKET_URL__ = 'http://localhost:3000';

const mockImportMeta = {
  env: {
    DEV: true,
    PROD: false,
    VITE_SOCKET_URL: 'http://localhost:3000',
    VITE_SERVER_URL: 'http://localhost:8000',
  },
};

Object.defineProperty(globalThis, 'import', {
  value: {
    meta: mockImportMeta,
  },
  configurable: true,
});
