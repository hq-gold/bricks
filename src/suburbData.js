import suburbStatsJson from "./data/suburb-stats.json";

const SUBURB_STATS = suburbStatsJson;

/** "Surry Hills, NSW" → "surry-hills" */
export function suburbKeyFromProperty(property) {
  const raw = (property?.suburb || "").split(",")[0].trim().toLowerCase();
  return raw.replace(/\s+/g, "-");
}

export function getSuburbStats(propertyOrKey) {
  const key =
    typeof propertyOrKey === "string"
      ? propertyOrKey
      : suburbKeyFromProperty(propertyOrKey);
  return SUBURB_STATS[key] || null;
}

export function listSuburbKeys() {
  return Object.keys(SUBURB_STATS);
}

export function allSuburbStats() {
  return SUBURB_STATS;
}

/** Yield percentile vs suburb median (0–100, higher = better yield). */
export function yieldPercentile(property, suburbStats) {
  if (!suburbStats?.medianYieldPct || !property?.yieldPct) return 50;
  const ratio = property.yieldPct / suburbStats.medianYieldPct;
  return Math.round(Math.min(99, Math.max(1, (ratio - 0.75) * 200)));
}

/** Growth percentile vs suburb 10y trend (0–100). */
export function growthPercentile(property, suburbStats) {
  if (!suburbStats?.medianGrowth10y || property?.growthPct == null) return 50;
  const delta = property.growthPct - suburbStats.medianGrowth10y;
  return Math.round(Math.min(99, Math.max(1, 50 + delta * 12)));
}
