const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { generatePDF } = require('./generator');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new DatabaseSync('report.db');

app.use(express.json());

// Bookkeeping table initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// 1. Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 2. POST /reports (Idempotent endpoint)
app.post('/reports', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { force } = req.body || {};

    // Check if report already exists for today
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

    // Insert record and get ID
    const insertResult = db.prepare(`INSERT INTO reports (path, created_at) VALUES (?, ?);`).run('pending', today);
    const reportId = insertResult.lastInsertRowid;
    const filePath = path.join(__dirname, 'reports', `${reportId}.pdf`);

    // Render PDF and update DB path
    // Inside POST /reports endpoint in server.js
    await generatePDF(db, filePath);
    db.prepare(`UPDATE reports SET path = ? WHERE id = ?;`).run(filePath, reportId);

    return res.status(201).json({
      id: reportId,
      file: `/reports/${reportId}/file`
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. GET /reports/:id (Metadata endpoint)
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

// 4. GET /reports/:id/file (Download PDF artifact)
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