/**
 * Bricks Investment Grade Score (0–100).
 * Single source of truth for reports, badges, and leaderboards.
 * Cashflow helpers are injected so generateCashflow() stays in bricks-premium.jsx.
 */

const WEIGHTS = Object.freeze({
  speed: 22,
  confidence: 28,
  ng: 22,
  wealth: 13,
  suburbYield: 8,
  suburbGrowth: 7,
});

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * @param {object} property
 * @param {object|null} suburbStats from suburbData.js
 * @param {object} engine — { generateCashflow, yearTurnsPositive, ngBenefitValue, yieldPercentile, growthPercentile }
 */
export function computeBricksScore(property, suburbStats, engine) {
  const cf = engine.generateCashflow(property);
  const positiveYear = engine.yearTurnsPositive(cf) || 30;
  const c = property.confidence || {};
  // Honour the user-chosen deposit if it's been set on the property override,
  // otherwise fall back to the engine default (20%). This means dragging the
  // Scenario Studio deposit slider actually moves the Bricks Score.
  const depositPct = (property.deposit != null ? property.deposit : 0.20);
  const deposit = property.price * depositPct;
  const totalCf = cf.reduce((s, x) => s + x, 0);
  const cfMultiple = deposit > 0 ? totalCf / deposit : 0;

  const speedPts = Math.max(0, WEIGHTS.speed - Math.max(0, positiveYear - 3) * 1.2);

  const growthPts = ((c.growth?.score || 50) / 100) * (WEIGHTS.confidence * 0.43);
  const riskPts = ((100 - (c.risk?.score || 50)) / 100) * (WEIGHTS.confidence * 0.29);
  const liquidPts = ((c.liquid?.score || 50) / 100) * (WEIGHTS.confidence * 0.28);

  const ngVal = engine.ngBenefitValue(property);
  const ngPts = Math.min(WEIGHTS.ng, Math.max(0, ngVal / 9000));

  const yr30Multiplier = Math.pow(1 + (property.growthPct || 5) / 100, 30);
  const wealthPts = Math.min(WEIGHTS.wealth, (yr30Multiplier - 1) * 2);

  let suburbYieldPts = WEIGHTS.suburbYield * 0.5;
  let suburbGrowthPts = WEIGHTS.suburbGrowth * 0.5;
  let supplyPenalty = 0;
  let cliffPenalty = 0;

  if (suburbStats) {
    const yp = engine.yieldPercentile(property, suburbStats);
    const gp = engine.growthPercentile(property, suburbStats);
    suburbYieldPts = (yp / 100) * WEIGHTS.suburbYield;
    suburbGrowthPts = (gp / 100) * WEIGHTS.suburbGrowth;
    if (suburbStats.daApprovals24m > 80) supplyPenalty = 4;
    else if (suburbStats.daApprovals24m > 50) supplyPenalty = 2;
  }

  if (property.build === "existing") cliffPenalty = 6;

  const raw =
    speedPts +
    growthPts +
    riskPts +
    liquidPts +
    ngPts +
    wealthPts +
    suburbYieldPts +
    suburbGrowthPts -
    supplyPenalty -
    cliffPenalty;

  const score = Math.round(clamp(raw, 0, 100));

  return {
    score,
    breakdown: {
      speedPts: round1(speedPts),
      growthPts: round1(growthPts),
      riskPts: round1(riskPts),
      liquidPts: round1(liquidPts),
      ngPts: round1(ngPts),
      wealthPts: round1(wealthPts),
      suburbYieldPts: round1(suburbYieldPts),
      suburbGrowthPts: round1(suburbGrowthPts),
      supplyPenalty,
      cliffPenalty,
      positiveYear,
      cfMultiple: round1(cfMultiple),
      ngVal: Math.round(ngVal),
    },
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

export function scoreTier(score) {
  if (score >= 78) return { label: "TOP PICK", color: "#10B981", bg: "rgba(16,185,129,0.18)", border: "rgba(16,185,129,0.36)" };
  if (score >= 65) return { label: "STRONG", color: "#22C55E", bg: "rgba(34,197,94,0.16)", border: "rgba(34,197,94,0.32)" };
  if (score >= 52) return { label: "SOLID", color: "#60A5FA", bg: "rgba(96,165,250,0.16)", border: "rgba(34,197,94,0.28)" };
  if (score >= 40) return { label: "WATCH", color: "#F59E0B", bg: "rgba(245,158,11,0.16)", border: "rgba(245,158,11,0.32)" };
  return { label: "CAUTION", color: "#F87171", bg: "rgba(248,113,113,0.16)", border: "rgba(248,113,113,0.32)" };
}

/** Rank properties in a suburb by score; returns sorted list with rank metadata. */
export function rankPropertiesInSuburb(properties, suburbKey, engine, getSuburbStats) {
  const stats = getSuburbStats(suburbKey);
  const inSuburb = properties.filter(p => {
    const k = engine.suburbKeyFromProperty(p);
    return k === suburbKey;
  });
  const scored = inSuburb.map(p => {
    const st = getSuburbStats(p);
    const { score } = computeBricksScore(p, st, engine);
    return { property: p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((row, i) => ({
    ...row,
    rank: i + 1,
    suburbStats: stats,
    total: scored.length,
  }));
}

/** Historical rank line for vendor report (uses open-data-shaped suburb stats). */
export function historicalRankLine(property, score, suburbStats) {
  if (!suburbStats) return null;
  const sales = suburbStats.salesLast12m || 100;
  const pct = clamp(score / 100, 0.05, 0.98);
  const rank = Math.max(1, Math.round(sales * (1 - pct)));
  const suburbName = suburbStats.name || property.suburb?.split(",")[0];
  return {
    rank,
    total: sales,
    text: `Would have ranked #${rank} of ${sales} ${suburbName} homes sold in the last 12 months (government sales data).`,
  };
}
