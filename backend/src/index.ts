import { fileURLToPath } from 'node:url';
import { server } from './server.js';
import { Logger } from './utils/helpers.js';

const PORT = process.env.PORT || 8000;
const VITE_SERVER_URL = process.env.VITE_SERVER_URL || `http://localhost:${PORT}`;

// Only listen if this file is run directly (not imported)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => {
    Logger.info(`Server running on ${VITE_SERVER_URL}`);
  });
}

export { server } from './server.js';
