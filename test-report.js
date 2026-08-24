// test-report.js
const { DatabaseSync } = require('node:sqlite');
const { getReportData } = require('./generator');

const db = new DatabaseSync('report.db');
const data = getReportData(db);

console.log('--- Stage 2 Aggregation Data Test ---');
console.log(JSON.stringify(data, null, 2));