const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const { processCsvFile } = require('./uploader');
const { getAgeDistribution } = require('./db');

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}-${file.originalname}`);
  }
});
const upload = multer({ storage });

const app = express();

app.get('/', (req, res) => {
  res.send('CSV → JSON API is running! Use POST /upload to upload a file.');
});

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Use form-data key "file".' });
    return;
  }

  const filePath = req.file.path;
  console.log(`Received file: ${filePath}`);

  try {
    const result = await processCsvFile(filePath, { batchSize: BATCH_SIZE });
    const dist = await getAgeDistribution();

    const total = parseInt(dist.total, 10) || 0;
    const percent = (count) => total > 0 ? ((count / total) * 100).toFixed(2) : '0.00';

    res.json({
      message: '✅ File processed successfully',
      processedRows: result.totalProcessed,
      ageDistribution: {
        lt_20: { count: parseInt(dist.lt_20, 10) || 0, percent: percent(dist.lt_20) },
        between_20_40: { count: parseInt(dist.between_20_40, 10) || 0, percent: percent(dist.between_20_40) },
        between_40_60: { count: parseInt(dist.between_40_60, 10) || 0, percent: percent(dist.between_40_60) },
        gt_60: { count: parseInt(dist.gt_60, 10) || 0, percent: percent(dist.gt_60) },
        total
      }
    });
  } catch (err) {
    console.error('Processing error:', err);
    res.status(500).json({ error: 'Processing failed', details: err.message });
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) console.warn('Could not delete uploaded file', err);
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Upload endpoint: POST http://localhost:${PORT}/upload (form-data key "file")`);
});
