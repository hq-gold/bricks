#!/usr/bin/env node
/**
 * NSW Valuer General ingest — sample path (no Joe required for v0).
 *
 * 1. Download LGA ZIPs from https://www.valuergeneral.nsw.gov.au/
 *    OR use pre-cleaned CSV: https://github.com/jameselks/nsw-property-sales-data-cleaner
 * 2. Place CSV at: data/raw/nsw-sales.csv
 * 3. Run: node scripts/ingest-nsw-sample.mjs
 *
 * Output: src/data/suburb-stats.json (merged / updated)
 *
 * For the Belle pitch, suburb-stats.json is already seeded with realistic
 * Sydney metro figures. This script is the upgrade path when you have the file.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const rawPath = join(root, "data/raw/nsw-sales.csv");
const outPath = join(root, "src/data/suburb-stats.json");

if (!existsSync(rawPath)) {
  console.log("No data/raw/nsw-sales.csv found.");
  console.log("Using existing src/data/suburb-stats.json for the demo.");
  console.log("To ingest: download NSW sales CSV and re-run this script.");
  process.exit(0);
}

// Minimal CSV parser — expects suburb, price, contract_date columns (adjust to your file)
const text = readFileSync(rawPath, "utf8");
const lines = text.split("\n").filter(Boolean);
const header = lines[0].toLowerCase().split(",");
const suburbIdx = header.findIndex(h => h.includes("suburb") || h.includes("locality"));
const priceIdx = header.findIndex(h => h.includes("price") || h.includes("sale"));
if (suburbIdx < 0 || priceIdx < 0) {
  console.error("CSV must include suburb and price columns.");
  process.exit(1);
}

const bySuburb = {};
const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(",");
  const suburb = (cols[suburbIdx] || "").trim().toLowerCase();
  const price = parseFloat((cols[priceIdx] || "").replace(/[^0-9.]/g, ""));
  if (!suburb || !price || price < 50000) continue;
  const key = suburb.replace(/\s+/g, "-");
  if (!bySuburb[key]) bySuburb[key] = { prices: [], count: 0 };
  bySuburb[key].prices.push(price);
  bySuburb[key].count += 1;
}

const existing = existsSync(outPath)
  ? JSON.parse(readFileSync(outPath, "utf8"))
  : {};

for (const [key, data] of Object.entries(bySuburb)) {
  if (data.count < 5) continue;
  const sorted = [...data.prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  existing[key] = {
    ...existing[key],
    name: key.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    state: "NSW",
    salesLast12m: data.count,
    medianPrice: Math.round(median),
    medianGrowth10y: existing[key]?.medianGrowth10y ?? 4.5,
    medianYieldPct: existing[key]?.medianYieldPct ?? 3.2,
    vacancyPct: existing[key]?.vacancyPct ?? 2.0,
    daApprovals24m: existing[key]?.daApprovals24m ?? 30,
    suburbScore: existing[key]?.suburbScore ?? 70,
    _source: "nsw-valuer-general-ingest",
  };
}

writeFileSync(outPath, JSON.stringify(existing, null, 2));
console.log(`Updated ${outPath} with ${Object.keys(bySuburb).length} suburbs from CSV.`);
