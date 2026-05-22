/**
 * Bricks badge engine — pure functions, no UI.
 */

export const BADGE_DEFS = [
  {
    id: "suburb-top-5",
    name: "Top 5 in suburb",
    tier: "gold",
    color: "#FB7185",
    priority: 100,
    test: (ctx) => ctx.suburbRank >= 1 && ctx.suburbRank <= 5,
    label: (ctx) => `Top 5 in ${ctx.suburbName} this month`,
  },
  {
    id: "suburb-cashflow-1",
    name: "#1 cashflow",
    tier: "gold",
    color: "#FB7185",
    priority: 95,
    test: (ctx) => ctx.suburbRank === 1 && ctx.fastestInSuburb,
    label: (ctx) => `#1 for cashflow in ${ctx.suburbName}`,
  },
  {
    id: "grade-a-plus",
    name: "Investor grade A+",
    tier: "gold",
    color: "#FB7185",
    priority: 90,
    test: (ctx) => ctx.score >= 85,
    label: () => "Investor grade A+",
  },
  {
    id: "national-top-10",
    name: "Top 10% nationally",
    tier: "rose",
    color: "#FB7185",
    priority: 75,
    test: (ctx) => ctx.score >= 78,
    label: () => "Top 10% post-budget grade",
  },
  {
    id: "fast-break-even",
    name: "Fast break-even",
    tier: "rose",
    color: "#FB7185",
    priority: 70,
    test: (ctx) => ctx.positiveYear != null && ctx.positiveYear <= 8,
    label: (ctx) => `Pays you from year ${ctx.positiveYear}`,
  },
  {
    id: "new-build-advantage",
    name: "New build advantage",
    tier: "rose",
    color: "#22C55E",
    priority: 65,
    test: (ctx) => ctx.build === "new",
    label: () => "New build · NG retained",
  },
  {
    id: "yield-leader",
    name: "Yield leader",
    tier: "rose",
    color: "#FB7185",
    priority: 60,
    test: (ctx) => ctx.yieldPercentile >= 85,
    label: (ctx) => `Top yield in ${ctx.suburbName}`,
  },
  {
    id: "low-bleed",
    name: "Lowest bleed",
    tier: "white",
    color: "#E2E8F0",
    priority: 40,
    test: (ctx) => ctx.score >= 55 && ctx.positiveYear != null && ctx.positiveYear <= 12,
    label: (ctx) => `Low 30-year bleed · ${ctx.suburbName}`,
  },
  {
    id: "cliff-warning",
    name: "Cliff risk",
    tier: "white",
    color: "#F87171",
    priority: 10,
    test: (ctx) => ctx.build === "existing" && ctx.score < 55,
    label: () => "Post-2027 NG quarantined",
  },
];

/**
 * @param {object} ctx — score, suburbRank, suburbName, positiveYear, build, yieldPercentile, fastestInSuburb
 */
export function earnBadges(ctx) {
  return BADGE_DEFS.filter(b => b.test(ctx))
    .sort((a, b) => b.priority - a.priority)
    .map(b => ({
      id: b.id,
      name: b.name,
      tier: b.tier,
      color: b.color,
      label: typeof b.label === "function" ? b.label(ctx) : b.label,
    }));
}

export function buildBadgeContext(property, scoreResult, suburbRankInfo, suburbStats, engine) {
  const cf = engine.generateCashflow(property);
  const positiveYear = engine.yearTurnsPositive(cf);
  const suburbName = suburbStats?.name || property.suburb?.split(",")[0] || "Suburb";
  const yieldPercentile = suburbStats
    ? engine.yieldPercentile(property, suburbStats)
    : 50;
  return {
    score: scoreResult.score,
    positiveYear,
    build: property.build,
    suburbRank: suburbRankInfo?.rank ?? 99,
    suburbName,
    yieldPercentile,
    fastestInSuburb: suburbRankInfo?.fastestInSuburb ?? false,
  };
}
