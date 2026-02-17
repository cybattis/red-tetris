import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const PORT = process.env.PORT || 8000;
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());

// Serve static files from frontend dist
app.use(express.static(join(__dirname, '../../frontend/dist')));

app.get('/health', (req, res) => {
  res.json({ status: __dirname });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
