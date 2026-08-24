Awesome! Terminal logs **100% success** confirm kar rahe hain:

1. **First Request:** `201 Created` status ke sath PDF generator file create hui.


2. **Second Request (Idempotency):** `200 OK` status aur `"cached": true` ke sath wahi existing report ID return hui (duplication prevention working!).


3. **File Download:** `70.7 KB` ki complete PDF file successfully download ho gayi (`my-report.pdf`).



---

### Final Step: `README.md` Setup

Project root directory mein `README.md` file banayein aur is formatted text ko paste karke save kar lein:

```markdown
# PDF Report Generator – Data to Document Pipeline

An automated PDF report generation API built with Node.js, Express, SQLite, and Playwright. It aggregates relational order data using SQL, renders a structured HTML template, prints a multi-page PDF document using headless Chromium, and serves the artifact over HTTP links with built-in idempotency checks.

---

## Tech Stack

* **Language/Runtime:** Node.js 22+
* **Web Framework:** Express.js
* **Database Engine:** SQLite (via Node built-in `node:sqlite` module)
* **PDF Renderer:** Playwright (Headless Chromium)

---

## Architecture & Data Pipeline

1. **Query:** SQL aggregation queries reduce 200 raw order rows down to key metrics (Totals, Top 5 Products, Daily Trends).
2. **Render:** Aggregated numbers are injected into a styled HTML template.
3. **Print:** Playwright renders the HTML in headless Chromium and exports a PDF artifact with print-CSS page break protection.
4. **Store & Serve:** PDF files are persisted on disk inside `/reports` while the database stores metadata and file paths. Clients access reports via dedicated artifact download links (`GET /reports/:id/file`).

---

## Aggregation SQL Queries

```sql
-- Total Orders & Revenue
SELECT COUNT(*) as count, SUM(amount) as sum FROM orders;

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

### 1. Prerequisites

Ensure Node.js (v22+) is installed on your system.

### 2. Installation

```bash
npm install
npx playwright install chromium

```

### 3. Seed Database

Generate 200 random orders across products and customers over the last 30 days:

```bash
node seed.js

```

### 4. Start API Server

```bash
node server.js

```

---

## API Endpoints & Testing Proof

### Generate Report (POST `/reports`)

* Request:
```bash
curl -i -X POST http://localhost:3000/reports

```


* Response (`201 Created`):
```json
{"id":1,"file":"/reports/1/file"}

```



### Double-Click / Idempotency Test

Firing duplicate requests on the same day reuses the cached report without recreating PDF artifacts:

* Request:
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

## Stage 4 & Stage 5 Refection

* **Stage 4 (Moving Work Out of Request):** PDF generation with headless Chromium takes ~1.5–3 seconds per request. For high-concurrency environments or complex multi-page reports, this work should be offloaded to a background job queue (e.g., Inngest or BullMQ) to avoid blocking HTTP worker threads and client timeouts.
* **Stage 5 (Idempotency Protection):** The once-per-day idempotency check prevents duplicate expensive PDF rendering jobs caused by double-clicks or automated retry logic. In business systems, missing this check can lead to duplicate invoices being generated or redundant customer notification emails being dispatched.

```

---
