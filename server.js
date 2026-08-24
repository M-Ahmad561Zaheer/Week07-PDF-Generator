// server.js
const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { generatePDF } = require('./generator');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new DatabaseSync('report.db');

app.use(express.json());

// Initialize reports bookkeeping table
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// POST /reports (Idempotent: Single report per day)
app.post('/reports', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const { force } = req.body || {};

  // Stage 5 Check: Return existing report if generated today
  if (!force) {
    const existingReport = db.prepare(`SELECT * FROM reports WHERE created_at = ? ORDER BY id DESC LIMIT 1;`).get(today);
    if (existingReport) {
      return res.status(200).json({
        id: existingReport.id,
        file: `/reports/${existingReport.id}/file`,
        cached: true
      });
    }
  }

  // Create new report record ID
  const insertResult = db.prepare(`INSERT INTO reports (path, created_at) VALUES (?, ?);`).run('pending', today);
  const reportId = insertResult.lastInsertRowid;
  const filePath = path.join(__dirname, 'reports', `${reportId}.pdf`);

  // Render & store artifact
  await generatePDF(filePath);
  db.prepare(`UPDATE reports SET path = ? WHERE id = ?;`).run(filePath, reportId);

  res.status(201).json({
    id: reportId,
    file: `/reports/${reportId}/file`
  });
});

// GET /reports/:id (Metadata endpoint)
app.get('/reports/:id', (req, res) => {
  const report = db.prepare(`SELECT * FROM reports WHERE id = ?;`).get(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json({
    id: report.id,
    file: `/reports/${report.id}/file`,
    created_at: report.created_at
  });
});

// GET /reports/:id/file (Artifact download endpoint)
app.get('/reports/:id/file', (req, res) => {
  const report = db.prepare(`SELECT * FROM reports WHERE id = ?;`).get(req.params.id);
  if (!report || !fs.existsSync(report.path)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.sendFile(report.path);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});