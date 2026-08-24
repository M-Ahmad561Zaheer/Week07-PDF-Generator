// generator.js
const { DatabaseSync } = require('node:sqlite');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function getReportData() {
  const db = new DatabaseSync('report.db');

  const totalOrders = db.prepare(`SELECT COUNT(*) as count FROM orders;`).get().count;
  const totalRevenue = db.prepare(`SELECT SUM(amount) as sum FROM orders;`).get().sum;

  const topProducts = db.prepare(`
    SELECT product, SUM(amount) as revenue, COUNT(*) as sales_count
    FROM orders
    GROUP BY product
    ORDER BY revenue DESC
    LIMIT 5;
  `).all();

  const dailyOrders = db.prepare(`
    SELECT created_at, COUNT(*) as orders_count, SUM(amount) as daily_revenue
    FROM orders
    GROUP BY created_at
    ORDER BY created_at DESC
    LIMIT 7;
  `).all();

  const allOrders = db.prepare(`
    SELECT id, customer, product, amount, created_at
    FROM orders
    ORDER BY created_at DESC;
  `).all();

  return { totalOrders, totalRevenue, topProducts, dailyOrders, allOrders };
}

function buildHTML(data) {
  const today = new Date().toISOString().split('T')[0];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; }
        h1 { font-size: 24px; color: #0f172a; margin-bottom: 5px; }
        .subtitle { font-size: 12px; color: #64748b; margin-bottom: 25px; }
        .grid { display: flex; gap: 20px; margin-bottom: 30px; }
        .card { flex: 1; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
        .card-val { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 5px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 12px; }
        th { background: #f1f5f9; font-weight: bold; color: #334155; }
        
        /* Page Break Fixes */
        tr { break-inside: avoid; }
        thead { display: table-header-group; }
      </style>
    </head>
    <body>
      <h1>Executive Sales Report</h1>
      <div class="subtitle">Generated on: ${today}</div>

      <div class="grid">
        <div class="card">
          <div class="card-title">Total Orders</div>
          <div class="card-val">${data.totalOrders}</div>
        </div>
        <div class="card">
          <div class="card-title">Total Revenue</div>
          <div class="card-val">$${data.totalRevenue.toFixed(2)}</div>
        </div>
      </div>

      <h2>Top 5 Products by Revenue</h2>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Units Sold</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${data.topProducts.map(p => `
            <tr>
              <td>${p.product}</td>
              <td>${p.sales_count}</td>
              <td>$${p.revenue.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2 style="margin-top: 30px;">All Orders History</h2>
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Product</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${data.allOrders.map(o => `
            <tr>
              <td>#${o.id}</td>
              <td>${o.customer}</td>
              <td>${o.product}</td>
              <td>$${o.amount.toFixed(2)}</td>
              <td>${o.created_at}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

async function generatePDF(outputPath) {
  const data = getReportData();
  const html = buildHTML(data);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'load' });

  const reportsDir = path.dirname(outputPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });

  await browser.close();
  return outputPath;
}

module.exports = { getReportData, generatePDF };