import '@testing-library/jest-dom';

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
