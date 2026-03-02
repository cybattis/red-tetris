import { fileURLToPath } from 'node:url';
import { server } from './server.js';
import { Logger } from './utils/helpers';

const PORT = process.env.PORT || 8000;

// Only listen if this file is run directly (not imported)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => {
    Logger.info(`Server running on http://localhost:${PORT}`);
  });
}

export { server } from './server.js';
