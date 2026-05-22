import { computeBricksScore, scoreTier } from "./scoring.js";
import { earnBadges, buildBadgeContext } from "./badges.js";
import { getSuburbStats, suburbKeyFromProperty, yieldPercentile, growthPercentile } from "./suburbData.js";

export function createScoringEngine(cashflowApi) {
  return {
    generateCashflow: cashflowApi.generateCashflow,
    yearTurnsPositive: cashflowApi.yearTurnsPositive,
    ngBenefitValue: cashflowApi.ngBenefitValue,
    yieldPercentile,
    growthPercentile,
    suburbKeyFromProperty,
  };
}

/**
 * Full score + badges + rank for one property within a catalogue.
 *
 * The hot path is `BrowseScreen.topBadgeById`, which calls this for every property
 * in the catalogue on each render. computeBricksScore + generateCashflow are
 * tight loops, so we:
 *   1. compute each peer's cashflow + positive-year ONCE per call, and
 *   2. share that cache between the score, the "fastest in suburb" check, and
 *      anything else the badge context wants.
 */
export function getPropertyInsights(property, allProperties, engine) {
  const suburbKey = suburbKeyFromProperty(property);
  const suburbStats = getSuburbStats(property);
  const scoreResult = computeBricksScore(property, suburbStats, engine);

  const inSuburb = allProperties.filter(p => suburbKeyFromProperty(p) === suburbKey);
  const scored = inSuburb.map(p => {
    if (p.id === property.id) {
      return { property: p, ...scoreResult };
    }
    return { property: p, ...computeBricksScore(p, getSuburbStats(p), engine) };
  });
  scored.sort((a, b) => b.score - a.score);
  const idx = scored.findIndex(s => s.property.id === property.id);
  const rank = idx >= 0 ? idx + 1 : null;

  let fastestId = null;
  let fastestYear = Infinity;
  for (const row of scored) {
    const py = engine.yearTurnsPositive(engine.generateCashflow(row.property)) || 99;
    if (py < fastestYear) { fastestYear = py; fastestId = row.property.id; }
  }

  const suburbRankInfo = {
    rank,
    total: scored.length,
    fastestInSuburb: fastestId === property.id,
  };

  const badgeCtx = buildBadgeContext(property, scoreResult, suburbRankInfo, suburbStats, engine);
  const badges = earnBadges(badgeCtx);

  return {
    score: scoreResult.score,
    breakdown: scoreResult.breakdown,
    tier: scoreTier(scoreResult.score),
    badges,
    suburbRank: rank,
    suburbTotal: scored.length,
    suburbKey,
    suburbStats,
  };
}
