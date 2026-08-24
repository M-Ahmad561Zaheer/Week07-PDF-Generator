`README.md` ko exact implementation ke sath update kar lein:

```markdown
# PDF Report Generator – Data to Document Pipeline

An automated PDF report generation API built with Node.js, Express, SQLite, and Playwright. It aggregates relational order data using SQL, renders a structured HTML template, prints a multi-page PDF document using headless Chromium, and serves the artifact over HTTP links with built-in idempotency checks.

---

## PDF Report Preview

![Executive Sales Report Preview](./public/report-preview.png)

---

## Tech Stack

* **Language/Runtime:** Node.js 22+
* **Web Framework:** Express.js
* **Database Engine:** SQLite (via Node built-in `node:sqlite` module)
* **PDF Renderer:** Playwright (Headless Chromium)

---

## Aggregation SQL Queries

```sql
-- Total Orders Count
SELECT COUNT(*) as count FROM orders;

-- Total Revenue Sum
SELECT SUM(amount) as sum FROM orders;

-- Top 5 Products by Revenue
SELECT product, SUM(amount) as revenue, COUNT(*) as sales_count
FROM orders
GROUP BY product
ORDER BY revenue DESC
LIMIT 5;

-- Orders Per Day (Last 7 Days)
SELECT created_at, COUNT(*) as orders_count, SUM(amount) as daily_revenue
FROM orders
GROUP BY created_at
ORDER BY created_at DESC
LIMIT 7;

```

---

## Setup & Running Locally

### 1. Installation

```bash
npm install
npx playwright install chromium

```

### 2. Seed Database & Test Aggregation

```bash
node seed.js
node test-report.js

```

### 3. Start API Server

```bash
node server.js

```

---

## API Proof & Idempotency Testing

### Generate Report (POST `/reports`)

```bash
curl -i -X POST http://localhost:3000/reports

```

* Response (`201 Created`):
```json
{"id":1,"file":"/reports/1/file"}

```



### Double-Click / Idempotency Test

```bash
curl -i -X POST http://localhost:3000/reports

```

* Response (`200 OK`):
```json
{"id":1,"file":"/reports/1/file","cached":true}

```



### Download PDF Artifact

```bash
curl -o my-report.pdf http://localhost:3000/reports/1/file

```

---

## Stage 4 & Stage 5 Reflection

* **Stage 4 (Moving Work Out of Request):** PDF generation with headless Chromium takes ~1.5–3 seconds per request. For high-concurrency environments or complex multi-page reports, this work should be offloaded to a background job queue (e.g., Inngest or BullMQ) to avoid blocking HTTP worker threads and client timeouts.
* **Stage 5 (Idempotency Protection):** The once-per-day idempotency check prevents duplicate expensive PDF rendering jobs caused by double-clicks or automated retry logic. In business systems, missing this check can lead to duplicate invoices being generated or redundant customer notification emails being dispatched.


