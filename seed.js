// seed.js
const { DatabaseSync } = require('node:sqlite');
const database = new DatabaseSync('report.db');

// Reset database schema (Safe to run multiple times)
database.exec(`DROP TABLE IF EXISTS orders;`);
database.exec(`
  CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer TEXT NOT NULL,
    product TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const products = ['Keyboard', 'Mouse', 'Monitor', 'Headset', 'Desk Mat', 'Webcam'];
const customers = ['Ahmad', 'Ali', 'Zain', 'Sara', 'Usman', 'Fatima', 'Hassan'];

const insertStmt = database.prepare(`
  INSERT INTO orders (customer, product, amount, created_at)
  VALUES (?, ?, ?, ?)
`);

// Insert ~200 random orders over the last 30 days
for (let i = 0; i < 200; i++) {
  const customer = customers[Math.floor(Math.random() * customers.length)];
  const product = products[Math.floor(Math.random() * products.length)];
  const amount = parseFloat((Math.random() * 195 + 5).toFixed(2));
  
  const randomDaysAgo = Math.floor(Math.random() * 30);
  const date = new Date();
  date.setDate(date.getDate() - randomDaysAgo);
  const createdAt = date.toISOString().split('T')[0];

  insertStmt.run(customer, product, amount, createdAt);
}

const countResult = database.prepare(`SELECT COUNT(*) as total FROM orders;`).get();
console.log(`Successfully seeded report.db! Total rows: ${countResult.total}`);