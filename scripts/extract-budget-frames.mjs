#!/usr/bin/env node
// ============================================================================
// extract-budget-frames.mjs
// ----------------------------------------------------------------------------
// Pre-renders the BudgetScreen scrubbing video into a JPEG frame sequence so
// the page can scroll-scrub on an <img> tag instead of seeking <video> on
// every wheel tick. <video> seeking is the source of the "jerky" feel the
// user reported — JPEG swaps stay buttery on cheap laptops + mobile Safari.
//
// Usage:
//   npm run extract:budget
//
// Inputs:
//   public/budget-bg.mp4               (the source clip)
// Outputs:
//   public/budget-frames/frame-001.jpg … frame-060.jpg
//
// Tunables (must match BudgetScreen.jsx VIDEO_FRAME_COUNT et al):
//   FRAME_COUNT — number of frames the React component will look up
//   FPS         — derived: FRAME_COUNT / clip duration
//   SCALE       — output width in pixels (height auto, preserves aspect)
//   QUALITY     — ffmpeg -q:v 1 (best) … 31 (worst); 5 keeps 1280px ~80–120KB
//
// ffmpeg comes from `ffmpeg-static` (cross-platform prebuilt binary, vendored
// via npm). If you'd rather use a system ffmpeg, set FFMPEG=/path/to/ffmpeg
// before running.
// ============================================================================

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SOURCE     = join(root, "public", "budget-bg.mp4");
const OUT_DIR    = join(root, "public", "budget-frames");
const FRAME_COUNT = 60;
const SCALE       = 1280;   // output width
const QUALITY     = 5;      // 2 is best, 31 worst — 5 is the sweet spot

// ─── Resolve ffmpeg ─────────────────────────────────────────────────────────
let ffmpegPath = process.env.FFMPEG;
if (!ffmpegPath) {
  try {
    const require = createRequire(import.meta.url);
    ffmpegPath = require("ffmpeg-static");
  } catch {
    /* fall through */
  }
}
if (!ffmpegPath || !existsSync(ffmpegPath)) {
  console.error("✗ ffmpeg not found. Install it with:");
  console.error("    npm install --save-dev ffmpeg-static");
  console.error("  (or set FFMPEG=/path/to/ffmpeg)");
  process.exit(1);
}

if (!existsSync(SOURCE)) {
  console.error(`✗ source video missing: ${SOURCE}`);
  process.exit(1);
}

// ─── Clean output dir ────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
for (const f of readdirSync(OUT_DIR)) {
  if (/^frame-\d+\.(jpg|webp|png)$/.test(f)) unlinkSync(join(OUT_DIR, f));
}

// ─── Probe duration ─────────────────────────────────────────────────────────
const probe = spawnSync(ffmpegPath, ["-i", SOURCE], { encoding: "utf8" });
const durMatch = probe.stderr.match(/Duration:\s+(\d+):(\d+):(\d+\.\d+)/);
if (!durMatch) {
  console.error("✗ couldn't read clip duration");
  console.error(probe.stderr);
  process.exit(1);
}
const [, hh, mm, ss] = durMatch;
const duration = parseInt(hh) * 3600 + parseInt(mm) * 60 + parseFloat(ss);
const fps = (FRAME_COUNT / duration).toFixed(3);

console.log(`▸ source     : ${SOURCE}`);
console.log(`▸ duration   : ${duration.toFixed(2)}s`);
console.log(`▸ frames     : ${FRAME_COUNT} @ ${fps} fps → ${OUT_DIR}`);
console.log(`▸ width      : ${SCALE}px (height auto, preserves aspect)`);
console.log(`▸ quality    : -q:v ${QUALITY}`);

// ─── Extract ────────────────────────────────────────────────────────────────
const args = [
  "-y",
  "-i", SOURCE,
  "-vf", `fps=${fps},scale=${SCALE}:-2`,
  "-frames:v", String(FRAME_COUNT),
  "-q:v", String(QUALITY),
  join(OUT_DIR, "frame-%03d.jpg"),
];

const run = spawnSync(ffmpegPath, args, { stdio: "inherit" });
if (run.status !== 0) {
  console.error(`✗ ffmpeg exited with status ${run.status}`);
  process.exit(run.status ?? 1);
}

const written = readdirSync(OUT_DIR).filter(f => /^frame-\d+\.jpg$/.test(f));
console.log(`✓ wrote ${written.length} frames`);
if (written.length !== FRAME_COUNT) {
  console.warn(`⚠ expected ${FRAME_COUNT}, got ${written.length} — update VIDEO_FRAME_COUNT in BudgetScreen.jsx`);
}
