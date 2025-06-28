import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'wwwroot')));

app.post('/upload', (req, res) => {
  if (!req.files || !req.body.path) {
    return res.status(400).json({ error: 'file and path required' });
  }
  const file = req.files.file;
  const relPath = req.body.path.replace(/^\/+/, '');
  const dest = path.join(__dirname, 'wwwroot', relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  file.mv(dest, err => {
    if (err) return res.status(500).json({ error: 'failed to save file' });
    res.json({ success: true, path: '/' + relPath });
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
