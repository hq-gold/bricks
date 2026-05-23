/**
 * Top-down "Match me to a property" engine.
 *
 * The user tells us their situation (deposit, income, strategy, plan, horizon)
 * and we rank the catalogue against THEM. This is the opposite of how every
 * other property site works — they make the buyer do the filtering.
 *
 * No backend, no API. Pure local scoring on top of the same cashflow engine
 * the rest of the app uses, so results are consistent with the detail page.
 */

import {
  generateScenario,
  acquisitionCosts,
  yearTurnsPositive,
} from "./cashflow.js";

/**
 * Map a salary band to a marginal rate. Conservative Australian brackets,
 * including 2% Medicare levy where it applies.
 */
export function marginalRateFor(salary) {
  if (salary >= 190_000) return 0.47;
  if (salary >= 135_000) return 0.39;
  if (salary >= 45_000) return 0.32;
  if (salary >= 18_200) return 0.18;
  return 0;
}

/**
 * @param prefs
 *   deposit: AUD
 *   salary: AUD/year (or null → use marginalRate directly)
 *   marginalRate: 0..1 (overrides salary)
 *   strategy: "cashflow" | "growth" | "balanced"
 *   states: string[] (e.g. ["NSW", "VIC"]) — empty = anywhere
 *   types: string[] (e.g. ["House", "Apartment"]) — empty = any
 *   maxBudget: AUD
 *   plan: "ip" | "livein-1" | "livein-3" | "livein-6"
 *   horizonYears: 10 | 20 | 30
 */
export function scoreMatch(property, prefs) {
  if (!property || property.status === "owned") return null;
  if (property.agentPreview || property.source === "agent-preview") return null;

  // Hard filters first — out-of-budget or wrong shape is a zero.
  if (prefs.maxBudget && property.price > prefs.maxBudget) return null;
  if (prefs.states?.length && !prefs.states.includes(property.state)) return null;
  if (prefs.types?.length) {
    const t = (property.type || "").toLowerCase();
    const matches = prefs.types.some(tt => t.includes(tt.toLowerCase()));
    if (!matches) return null;
  }

  // Affordability — minimum 5% deposit serviceability. We don't simulate full
  // serviceability (HEM/DTI) yet; for now we just check the deposit can cover
  // 5% of the price plus stamp duty + LMI cap.
  const acq = acquisitionCosts({
    price: property.price,
    state: property.state || "NSW",
    deposit: Math.max(0.05, (prefs.deposit || 0) / property.price),
    build: property.build,
  });
  // If their deposit can't even cover deposit + duty + legals + LMI cash, it's
  // not really a match — but we soft-penalise rather than hard-exclude (some
  // users have LMI capitalised or family help).
  const cashAvailable = prefs.deposit || 0;
  const cashShortfall = Math.max(0, acq.total - cashAvailable);
  const cashShortfallPenalty = cashShortfall > 0
    ? Math.min(40, (cashShortfall / Math.max(1, cashAvailable)) * 30)
    : 0;

  // Build the scenario the user would actually run on this property.
  const marginalRate = prefs.marginalRate != null
    ? prefs.marginalRate
    : marginalRateFor(prefs.salary || 0);
  const pporYears = prefs.plan === "livein-1" ? 1
    : prefs.plan === "livein-3" ? 3
    : prefs.plan === "livein-6" ? 6
    : 0;
  const depositPct = Math.min(0.5, Math.max(0.05, (prefs.deposit || property.price * 0.2) / property.price));
  const scenario = generateScenario({
    price: property.price,
    yieldPct: property.yieldPct,
    growthPct: property.growthPct,
    rate: 0.0639,
    deposit: depositPct,
    marginalRate,
    build: property.build,
    state: property.state || "NSW",
    type: property.type,
    loanType: "io",
    pporYears,
    capitaliseLMI: false,
  });

  const monthly = scenario.monthly;
  const horizon = prefs.horizonYears || 30;
  const horizonMonths = horizon * 12;

  // Horizon-windowed metrics — only the months the user actually plans to hold.
  const window = monthly.slice(0, horizonMonths);
  const totalCashflow = window.reduce((s, x) => s + x, 0);
  const totalBleed = window.reduce((s, x) => s + (x < 0 ? -x : 0), 0);
  const breakEven = yearTurnsPositive(window) || horizon;
  const exitValue = property.price * Math.pow(1 + (property.growthPct / 100), horizon);
  const exitEquity = exitValue - (property.price * (1 - depositPct));
  // Simple horizon IRR proxy: (exit equity + total cashflow) / total cash invested
  const totalCashIn = acq.total + totalBleed;
  const totalReturn = exitEquity + totalCashflow;
  const irr = totalCashIn > 0 ? Math.pow(Math.max(0.001, totalReturn / totalCashIn), 1 / horizon) - 1 : 0;

  // ── Per-strategy weighting ──────────────────────────────────────────────
  // We compute three sub-scores then blend per strategy. Always 0..100.
  const cashflowSub = clamp(0, 100, 100 - (breakEven - 1) * 6 - (totalBleed / property.price) * 100);
  const growthSub = clamp(0, 100, ((property.growthPct || 5) - 3) * 14 + (exitEquity / property.price) * 20);
  const irrSub = clamp(0, 100, irr * 100 * 6);

  let raw;
  if (prefs.strategy === "cashflow") {
    raw = cashflowSub * 0.6 + irrSub * 0.25 + growthSub * 0.15;
  } else if (prefs.strategy === "growth") {
    raw = growthSub * 0.6 + irrSub * 0.25 + cashflowSub * 0.15;
  } else {
    raw = cashflowSub * 0.35 + growthSub * 0.35 + irrSub * 0.30;
  }

  // NG eligibility bonus for high earners — material under 2026 rules
  if (marginalRate >= 0.37 && property.build === "new") raw += 6;
  if (marginalRate >= 0.37 && property.build === "existing") raw -= 6;

  raw -= cashShortfallPenalty;

  const score = clamp(0, 100, raw);

  // Build human reasoning — these are what the buyer sees beside each match.
  const reasons = [];
  if (breakEven && breakEven <= 5 && prefs.strategy !== "growth") {
    reasons.push({ kind: "good", text: `Cashflow-positive by year ${breakEven}` });
  }
  if (property.growthPct >= 6 && prefs.strategy !== "cashflow") {
    reasons.push({ kind: "good", text: `${property.growthPct.toFixed(1)}% projected annual growth` });
  }
  if (property.build === "new" && marginalRate >= 0.37) {
    reasons.push({ kind: "good", text: `New build — keeps negative gearing on your bracket` });
  }
  if (property.build === "existing" && marginalRate >= 0.37) {
    reasons.push({ kind: "warn", text: `Established — NG losses quarantined post-2027` });
  }
  if (cashShortfall > 0) {
    reasons.push({ kind: "warn", text: `Day-one cash gap of $${Math.round(cashShortfall).toLocaleString()}` });
  }
  if (pporYears > 0 && pporYears <= 6) {
    reasons.push({ kind: "info", text: `Live in ${pporYears}yr → potential PPOR CGT exemption` });
  }
  if (irr >= 0.08) {
    reasons.push({ kind: "good", text: `~${Math.round(irr * 100)}% all-in annualised return on your inputs` });
  }

  return {
    property,
    score: Math.round(score),
    breakEven,
    totalCashflow: Math.round(totalCashflow),
    totalBleed: Math.round(totalBleed),
    exitEquity: Math.round(exitEquity),
    irr,
    acquisition: acq,
    cashShortfall: Math.round(cashShortfall),
    reasons,
    horizon,
  };
}

export function findMatches(properties, prefs, n = 5) {
  const scored = properties
    .map(p => scoreMatch(p, prefs))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, n);
}

function clamp(lo, hi, n) {
  return Math.max(lo, Math.min(hi, n));
}
