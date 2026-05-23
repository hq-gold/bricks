/**
 * Bricks cashflow + tax engine.
 *
 * 360-month after-tax cashflow model under 2026 budget rules.
 * Pure functions, no React. Consumed by:
 *   - bricks-premium.jsx (PropertyCard, ConsideringDetail, BrowseScreen, etc.)
 *   - scoring.js / propertyInsights.js via SCORING_ENGINE
 *   - screens/BudgetScreen.jsx for the proof-of-concept 360-square hero
 */

export const MODEL_DEFAULTS = Object.freeze({
  rate: 0.0639,
  deposit: 0.20,
  rentGrowth: 0.030,
  vacancyWeeks: 2,
  loanType: "io",
  loanTermYears: 30,
  cashCostsPctHouse: 0.013,
  cashCostsPctApartment: 0.022,
  mgmtPctOfRent: 0.075,
  maintPctOfRent: 0.060,
  constructionPctOfPrice: 0.55,
  div40NewBuildBase: 0.035,
  div40DiminishingRate: 0.20,
  vacancyFraction: 2 / 52,
  legalsBase: 2000,
  buildingPestEstablished: 500,
  sellingCostsPct: 0.03,
  cgtDiscount: 0.50,
  // 2026 budget assumes long-run CPI ~3% p.a. for cost-base indexation. Used
  // ONLY for the new CGT method (post 1 July 2027 gains on established stock).
  cpiAssumption: 0.030,
  cgtMinTaxRate: 0.30,
});

// ════════════════════════════════════════════════════════════════════════════
// 2026 BUDGET POLICY DATES
// Anchor everything (NG grandfathering, CGT cliff) to these so a single
// constant change can shift the model.
// ════════════════════════════════════════════════════════════════════════════
export const BUDGET_2026 = Object.freeze({
  // 7:30pm AEST 12 May 2026 — properties exchanged before this kept full NG forever.
  ngCutoffDate: new Date("2026-05-12T19:30:00+10:00"),
  // 1 July 2027 — new CGT regime begins, NG quarantine starts for established post-budget.
  cgtCutoffDate: new Date("2027-07-01T00:00:00+10:00"),
});

/**
 * Effective marginal-tax-rate brackets — Stage-3 cuts (1 July 2024) PLUS
 * the 2% Medicare levy. These are the rates used when a property loss is
 * refunded as a tax deduction (or a property gain is taxed as income).
 *
 *   Tax-free: 0 – $18,200
 *   16% + 2% Medicare = 18%   (effective 18% on $18,200–$45,000)
 *   30% + 2% Medicare = 32%   ($45,000–$135,000)
 *   37% + 2% Medicare = 39%   ($135,000–$190,000)
 *   45% + 2% Medicare = 47%   ($190,000+)
 *
 * Used everywhere a user picks "their tax bracket" so the same property
 * shows the same after-tax cashflow on Browse, Detail, Goals, and MatchMe.
 */
export const TAX_BRACKETS = [
  { id: "18", rate: 0.18, label: "18%", income: "Up to $45k" },
  { id: "32", rate: 0.32, label: "32%", income: "$45k – $135k" },
  { id: "39", rate: 0.39, label: "39%", income: "$135k – $190k" },
  { id: "47", rate: 0.47, label: "47%", income: "$190k+" },
];
export const DEFAULT_BRACKET_ID = "39";
export const DEFAULT_MARGINAL_RATE = 0.39;

// Land tax — annual, by state, on (estimated) unimproved land value (FY2025-26).
export function landTaxAnnual({ state, landValue }) {
  switch (state) {
    case "NSW": {
      if (landValue <= 1_075_000) return 0;
      return 100 + 0.016 * (landValue - 1_075_000);
    }
    case "VIC": {
      if (landValue <= 50_000) return 0;
      if (landValue <= 100_000) return 500;
      if (landValue <= 300_000) return 975 + 0.001 * (landValue - 100_000);
      if (landValue <= 600_000) return 1_350 + 0.006 * (landValue - 300_000);
      if (landValue <= 1_000_000) return 3_150 + 0.009 * (landValue - 600_000);
      return 6_750 + 0.024 * (landValue - 1_000_000);
    }
    case "QLD": {
      if (landValue <= 600_000) return 0;
      if (landValue <= 1_000_000) return 500 + 0.01 * (landValue - 600_000);
      return 4_500 + 0.0165 * (landValue - 1_000_000);
    }
    case "SA": {
      if (landValue <= 732_000) return 0;
      if (landValue <= 1_176_000) return 0.005 * (landValue - 732_000);
      return 2_220 + 0.015 * (landValue - 1_176_000);
    }
    case "WA": {
      if (landValue <= 300_000) return 0;
      if (landValue <= 420_000) return 300 + 0.0025 * (landValue - 300_000);
      if (landValue <= 1_000_000) return 600 + 0.009 * (landValue - 420_000);
      return 5_820 + 0.018 * (landValue - 1_000_000);
    }
    default: return 0;
  }
}

export function landFractionOf(property) {
  const t = (property.type || "").toLowerCase();
  if (t.includes("apartment") || t.includes("unit")) return 0.20;
  if (t.includes("townhouse") || t.includes("terrace")) return 0.40;
  return 0.55;
}

export function isApartment(property) {
  const t = (property.type || "").toLowerCase();
  return t.includes("apartment") || t.includes("unit") || t.includes("walk-up") || t.includes("tower");
}

// ════════════════════════════════════════════════════════════════════════════
// ACQUISITION COSTS — year-zero cash outlay an investor actually writes.
// Sources: state revenue offices (FY2025-26 schedules), Genworth LMI table.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Investor stamp duty (transfer duty) on a property purchase.
 * Returns AUD. Assumes investor purchase (no FHB exemptions).
 * Foreign-purchaser surcharges are NOT included.
 */
export function stampDuty({ price, state, isInvestor = true }) {
  const p = price;
  let duty = 0;
  switch (state) {
    case "NSW": {
      if (p <= 14_000) duty = p * 0.0125;
      else if (p <= 32_000) duty = 175 + 0.015 * (p - 14_000);
      else if (p <= 85_000) duty = 445 + 0.0175 * (p - 32_000);
      else if (p <= 319_000) duty = 1_372.5 + 0.035 * (p - 85_000);
      else if (p <= 1_064_000) duty = 9_562.5 + 0.045 * (p - 319_000);
      else if (p <= 3_757_000) duty = 43_087.5 + 0.055 * (p - 1_064_000);
      else duty = 191_202 + 0.07 * (p - 3_757_000);
      break;
    }
    case "VIC": {
      if (p <= 25_000) duty = p * 0.014;
      else if (p <= 130_000) duty = 350 + 0.024 * (p - 25_000);
      else if (p <= 960_000) duty = 2_870 + 0.06 * (p - 130_000);
      else if (p <= 2_000_000) duty = p * 0.055;
      else duty = 110_000 + 0.065 * (p - 2_000_000);
      break;
    }
    case "QLD": {
      if (p <= 5_000) duty = 0;
      else if (p <= 75_000) duty = 0.015 * (p - 5_000);
      else if (p <= 540_000) duty = 1_050 + 0.035 * (p - 75_000);
      else if (p <= 1_000_000) duty = 17_325 + 0.045 * (p - 540_000);
      else duty = 38_025 + 0.0575 * (p - 1_000_000);
      if (isInvestor) duty += Math.max(0, p - 5_000) * 0.02;
      break;
    }
    case "SA": {
      if (p <= 12_000) duty = p * 0.01;
      else if (p <= 30_000) duty = 120 + 0.02 * (p - 12_000);
      else if (p <= 50_000) duty = 480 + 0.03 * (p - 30_000);
      else if (p <= 100_000) duty = 1_080 + 0.035 * (p - 50_000);
      else if (p <= 200_000) duty = 2_830 + 0.04 * (p - 100_000);
      else if (p <= 250_000) duty = 6_830 + 0.0425 * (p - 200_000);
      else if (p <= 300_000) duty = 8_955 + 0.0475 * (p - 250_000);
      else if (p <= 500_000) duty = 11_330 + 0.05 * (p - 300_000);
      else duty = 21_330 + 0.055 * (p - 500_000);
      break;
    }
    case "WA": {
      if (p <= 120_000) duty = p * 0.019;
      else if (p <= 150_000) duty = 2_280 + 0.0285 * (p - 120_000);
      else if (p <= 360_000) duty = 3_135 + 0.038 * (p - 150_000);
      else if (p <= 725_000) duty = 11_115 + 0.0475 * (p - 360_000);
      else duty = 28_453 + 0.0515 * (p - 725_000);
      break;
    }
    case "ACT": {
      if (p <= 200_000) duty = p * 0.0118;
      else if (p <= 300_000) duty = 2_360 + 0.022 * (p - 200_000);
      else if (p <= 500_000) duty = 4_560 + 0.034 * (p - 300_000);
      else if (p <= 750_000) duty = 11_360 + 0.0432 * (p - 500_000);
      else if (p <= 1_000_000) duty = 22_160 + 0.0532 * (p - 750_000);
      else if (p <= 1_455_000) duty = 35_460 + 0.0632 * (p - 1_000_000);
      else duty = p * 0.045;
      break;
    }
    case "TAS": {
      if (p <= 3_000) duty = 50;
      else if (p <= 25_000) duty = 50 + 0.0175 * (p - 3_000);
      else if (p <= 75_000) duty = 435 + 0.0225 * (p - 25_000);
      else if (p <= 200_000) duty = 1_560 + 0.035 * (p - 75_000);
      else if (p <= 375_000) duty = 5_935 + 0.04 * (p - 200_000);
      else if (p <= 725_000) duty = 12_935 + 0.0425 * (p - 375_000);
      else duty = 27_810 + 0.045 * (p - 725_000);
      break;
    }
    case "NT": {
      if (p <= 525_000) duty = (0.06571441 * Math.pow(p / 1000, 2)) + 15 * (p / 1000);
      else if (p <= 3_000_000) duty = p * 0.0495;
      else if (p <= 5_000_000) duty = p * 0.0575;
      else duty = p * 0.0595;
      break;
    }
    default: duty = p * 0.045;
  }
  return Math.max(0, Math.round(duty));
}

/**
 * Lenders Mortgage Insurance — capitalised, ~Genworth scale.
 * Only applies when LVR > 80%.
 */
export function lmiCost({ loan, propertyValue }) {
  if (!propertyValue || propertyValue <= 0) return 0;
  const lvr = loan / propertyValue;
  if (lvr <= 0.80) return 0;
  // Simplified band schedule (% of loan), approximates Genworth/QBE tables.
  let pct;
  if (lvr <= 0.82) pct = 0.0072;
  else if (lvr <= 0.85) pct = 0.0098;
  else if (lvr <= 0.88) pct = 0.0145;
  else if (lvr <= 0.90) pct = 0.0192;
  else if (lvr <= 0.92) pct = 0.0285;
  else if (lvr <= 0.95) pct = 0.0367;
  else pct = 0.0420;
  return Math.round(loan * pct);
}

/**
 * Total year-zero cash outlay required to settle the property.
 * Returns line items + total. Caller decides whether to capitalise LMI
 * into the loan or treat as cash.
 */
export function acquisitionCosts({
  price,
  state = "NSW",
  deposit = MODEL_DEFAULTS.deposit,
  build = "new",
  isInvestor = true,
  capitaliseLMI = false,
}) {
  const duty = stampDuty({ price, state, isInvestor });
  const loan = price * (1 - deposit);
  const lmi = lmiCost({ loan, propertyValue: price });
  const legals = MODEL_DEFAULTS.legalsBase;
  const buildingPest = build === "new" ? 0 : MODEL_DEFAULTS.buildingPestEstablished;
  const depositCash = price * deposit;
  const lmiCash = capitaliseLMI ? 0 : lmi;
  const total = depositCash + duty + legals + buildingPest + lmiCash;
  return {
    deposit: Math.round(depositCash),
    stampDuty: duty,
    lmi,
    lmiCash: Math.round(lmiCash),
    legals,
    buildingPest,
    total: Math.round(total),
    loan: Math.round(loan + (capitaliseLMI ? lmi : 0)),
    lvr: loan / price,
  };
}

export function piMonthlyRepayment(loan, annualRate, years) {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return loan / n;
  return loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * 360-month after-tax cashflow series.
 *
 * Backwards-compatible: returns a plain number[] of monthly cashflows.
 * For richer outputs (acquisition cash, equity, CGT-on-exit, carried-forward losses)
 * use generateScenario() — which calls this internally then layers metadata on top.
 *
 * 2026 BUDGET TREATMENT (now phased correctly):
 *   - NEW BUILDS: full negative gearing forever — losses × marginalRate refunded each year.
 *   - ESTABLISHED, GRANDFATHERED (purchasedPreBudget = true, i.e. exchanged before
 *     7:30pm AEST 12 May 2026): full negative gearing forever, same as new builds.
 *   - ESTABLISHED, POST-BUDGET (the default for any property on Bricks today —
 *     you'd be buying it now, post-12-May-2026): full NG continues until 30 June 2027,
 *     then losses are QUARANTINED from 1 July 2027 — they can only offset other
 *     residential property income (or CGT on disposal). We track the carry-forward
 *     bucket and release it against future positive rental income or the sale gain.
 */
export function generateCashflow(input) {
  return generateScenario(input).monthly;
}

/**
 * Full scenario: monthly cashflow + acquisition + equity + CGT-on-exit.
 * All numbers are nominal AUD unless noted.
 */
export function generateScenario(input) {
  const {
    price, yieldPct, growthPct = 5,
    rate = MODEL_DEFAULTS.rate,
    deposit = MODEL_DEFAULTS.deposit,
    marginalRate = DEFAULT_MARGINAL_RATE,
    build = "new",
    state = "NSW",
    months = 360,
    loanType = MODEL_DEFAULTS.loanType,
    type,
    capitaliseLMI = false,
    sellYear = null,
    // PPOR → IP transition. When > 0, the first `pporYears` years are treated
    // as owner-occupier: no rent income, no NG, no depreciation tax effect — just
    // the carrying cost of owning. After that, the property converts to an IP
    // and normal investor mechanics resume.
    // The 6-year absence rule means if total years-rented ≤ 6 with no other PPOR,
    // CGT can still be exempt on sale — we surface this as a UI note rather than
    // automatically apply it (the user's circumstances vary).
    pporYears = 0,
    // 2026 BUDGET HOOKS — defaults assume the user is buying NOW, post-budget.
    // Set purchasedPreBudget = true for the user's existing portfolio (it's
    // grandfathered and keeps full NG + 50% CGT forever).
    purchasedPreBudget = false,
    // Years from "today" (2026) until the user buys. Used to know whether the
    // 1 July 2027 NG cliff falls inside the 30-year holding window.
    yearsUntilPurchase = 0,
    cpiAssumption = MODEL_DEFAULTS.cpiAssumption,
  } = input;
  const property = { type, state, price, build };

  const acq = acquisitionCosts({ price, state, deposit, build, capitaliseLMI });
  const loan = acq.loan;
  const rentGrowth = MODEL_DEFAULTS.rentGrowth;
  const vacancyAdj = 1 - MODEL_DEFAULTS.vacancyFraction;

  const apt = isApartment(property);
  const cashCostsPct = apt ? MODEL_DEFAULTS.cashCostsPctApartment : MODEL_DEFAULTS.cashCostsPctHouse;

  const landFr = landFractionOf(property);
  const landValue = price * landFr;
  const landTaxYr = landTaxAnnual({ state, landValue });

  // Div 43 (capital works) — built on actual construction cost, claimable for 40 years
  // from completion. New = full schedule. Established post-1987 = remaining years on
  // the surveyor's schedule; we simplify with a half schedule for "existing".
  const constructionCost = price * MODEL_DEFAULTS.constructionPctOfPrice;
  const div43Annual = constructionCost * 0.025 * (build === "new" ? 1 : 0.5);

  // Div 40 (plant & equipment) — only available on new builds. Base is a % of
  // CONSTRUCTION cost (not full price), diminishing-value method.
  const div40Base = build === "new"
    ? constructionCost * MODEL_DEFAULTS.div40NewBuildBase
    : 0;

  const piRepaymentM = piMonthlyRepayment(loan, rate, MODEL_DEFAULTS.loanTermYears);
  let loanBalance = loan;

  // 2026 BUDGET — NG eligibility, properly phased.
  //   New build: full NG, refundable forever.
  //   Established + grandfathered (bought before 12 May 2026): full NG forever.
  //   Established + post-budget purchase: NG refundable until the cliff
  //     (1 July 2027), then quarantined to property/CGT income only.
  //
  // Calculation: the user buys at month 0; if they're buying TODAY (yearsUntilPurchase=0)
  // and the cliff is ~14 months away, the first 14 months get full NG, after which
  // losses go into the carry-forward bucket.
  const ngAlwaysRefundable = build === "new" || purchasedPreBudget;
  // Months from purchase until the NG cliff (1 July 2027). Established post-
  // budget purchasers get full NG until then; new-builds and grandfathered
  // purchasers never hit the cliff.
  const monthsUntilCliff = ngAlwaysRefundable
    ? Infinity
    : Math.max(0, Math.round((14 - yearsUntilPurchase * 12)));

  const arr = [];
  const monthlyDetail = [];
  let carryForwardLoss = 0;
  let cumulativeDiv43 = 0;
  let cumulativeDiv40 = 0;
  let totalCashflow = 0;

  const pporMonths = Math.max(0, Math.min(months, Math.round(pporYears * 12)));

  for (let m = 0; m < months; m++) {
    const yr = m / 12;
    const yearIdx = Math.floor(yr);
    const isPporPhase = m < pporMonths;
    // IP year index resets when the property converts from PPOR to IP — that's
    // when depreciation and the rent clock start counting.
    const ipYearIdx = isPporPhase ? 0 : Math.max(0, yearIdx - Math.floor(pporMonths / 12));

    const rentRefYears = isPporPhase ? 0 : yearIdx - Math.floor(pporMonths / 12);
    const annualGrossRent = isPporPhase
      ? 0
      : price * (yieldPct / 100) * Math.pow(1 + rentGrowth, rentRefYears);
    const annualNetRent = annualGrossRent * vacancyAdj;
    const rentMonthly = annualNetRent / 12;

    const interestM = (loanBalance * rate) / 12;
    let principalM = 0;
    if (loanType === "pi") {
      principalM = Math.max(0, piRepaymentM - interestM);
      loanBalance = Math.max(0, loanBalance - principalM);
    }

    const cashCostsMFixed = (price * cashCostsPct) / 12;
    const cashCostsMRentLinked = (annualGrossRent * (MODEL_DEFAULTS.mgmtPctOfRent + MODEL_DEFAULTS.maintPctOfRent)) / 12;
    const landTaxM = isPporPhase ? 0 : landTaxYr / 12;
    const totalCashCostsM = cashCostsMFixed + cashCostsMRentLinked + landTaxM;

    // Depreciation only counts as an IP. During PPOR years it accrues no tax effect.
    const div43Available = !isPporPhase && ipYearIdx < 40;
    const div43M = div43Available ? div43Annual / 12 : 0;
    const div40YearlyDeduction = isPporPhase
      ? 0
      : div40Base * MODEL_DEFAULTS.div40DiminishingRate
        * Math.pow(1 - MODEL_DEFAULTS.div40DiminishingRate, ipYearIdx);
    const div40M = div40YearlyDeduction / 12;
    const totalDepreciationM = div43M + div40M;

    cumulativeDiv43 += div43M;
    cumulativeDiv40 += div40M;

    let taxBenefitM = 0;
    let taxOwedM = 0;

    if (!isPporPhase) {
      const taxableIncomeM = rentMonthly - interestM - totalCashCostsM - totalDepreciationM;
      // NG is refundable for new builds and grandfathered established purchases
      // forever; for post-budget established purchases it's refundable only up
      // to the 1 July 2027 cliff, then losses are quarantined.
      const ngRefundableThisMonth = ngAlwaysRefundable || m < monthsUntilCliff;
      if (taxableIncomeM < 0) {
        if (ngRefundableThisMonth) {
          taxBenefitM = (-taxableIncomeM) * marginalRate;
        } else {
          carryForwardLoss += -taxableIncomeM;
        }
      } else if (taxableIncomeM > 0) {
        const offset = Math.min(taxableIncomeM, carryForwardLoss);
        carryForwardLoss -= offset;
        const stillTaxable = taxableIncomeM - offset;
        taxOwedM = stillTaxable * marginalRate;
      }
    }
    // PPOR phase: no income tax effects. The owner just pays the mortgage and costs.

    const cashflowM =
        rentMonthly
      - interestM
      - principalM
      - totalCashCostsM
      + taxBenefitM
      - taxOwedM;

    arr.push(cashflowM);
    monthlyDetail.push({
      rent: rentMonthly,
      interest: interestM,
      principal: principalM,
      cashCosts: totalCashCostsM,
      depreciation: totalDepreciationM,
      taxBenefit: taxBenefitM,
      taxOwed: taxOwedM,
      net: cashflowM,
      phase: isPporPhase ? "ppor" : "ip",
    });
    totalCashflow += cashflowM;
  }

  // CGT exit modelling — sale at end of `sellYear` (if provided) or at year 30 by default.
  const exitYear = sellYear || 30;
  const exitMonth = Math.min(months, exitYear * 12);
  const exitYrFraction = exitMonth / 12;
  const salePrice = price * Math.pow(1 + (growthPct / 100), exitYrFraction);
  const sellingCosts = salePrice * MODEL_DEFAULTS.sellingCostsPct;

  // Cost base adjustment: capital works claimed reduces the cost base (ATO rule).
  // Plant & equipment Div 40 doesn't reduce cost base (it's plant, not capital works).
  const div43ClaimedToExit = Math.min(exitMonth, 40 * 12)
    ? cumulativeDiv43 * (Math.min(exitMonth, 40 * 12) / months)
    : 0;
  const adjustedCostBase = price - div43ClaimedToExit;
  const grossGain = Math.max(0, salePrice - sellingCosts - adjustedCostBase);

  // Apply any remaining carried-forward NG loss against the gain (the 2026 quarantine
  // policy explicitly allows this on disposal).
  const gainAfterCarried = Math.max(0, grossGain - carryForwardLoss);
  const carriedUsedOnSale = Math.min(carryForwardLoss, grossGain);

  // ────────────────────────────────────────────────────────────────────────
  // 2026 BUDGET — DUAL-PERIOD CGT
  //
  // Pre-1 July 2027 portion of the gain → old 50% discount (always available).
  // Post-1 July 2027 portion → indexation method + 30% minimum tax (NEW REGIME),
  //   UNLESS the asset is grandfathered (purchased before 12 May 2026) — those
  //   investors keep the 50% discount forever on the entire gain.
  //
  // Investors in NEW BUILDS get the legislated CHOICE between methods on the
  // post-2027 portion — we automatically pick whichever yields the lower tax.
  // ────────────────────────────────────────────────────────────────────────

  // What fraction of the holding period falls before vs after the cliff?
  // yearsUntilPurchase=0 means buy today; cliff is ~1 year out.
  const yearsToCliff = Math.max(0, 1 - yearsUntilPurchase);
  const postCliffYears = Math.max(0, exitYrFraction - yearsToCliff);
  const postCliffFrac = exitYrFraction > 0
    ? Math.min(1, postCliffYears / exitYrFraction)
    : 0;

  // Split the net taxable gain into pre/post cliff portions.
  const preCliffGain = gainAfterCarried * (1 - postCliffFrac);
  const postCliffGain = gainAfterCarried * postCliffFrac;

  // OLD METHOD — 50% discount × marginal rate.
  const taxOldOnPre = preCliffGain * MODEL_DEFAULTS.cgtDiscount * marginalRate;
  const taxOldOnPost = postCliffGain * MODEL_DEFAULTS.cgtDiscount * marginalRate;

  // NEW METHOD — CPI indexation + 30% minimum tax floor.
  // We index the relevant cost-base PORTION over the post-cliff years, so the
  // taxable real gain is gain − (cost-base × ((1+CPI)^postYears − 1)) scaled to
  // the post-cliff slice. Min-30% floor compares against the marginal-rate calc.
  const costBasePostShare = adjustedCostBase * postCliffFrac;
  const indexationUplift = postCliffYears > 0
    ? costBasePostShare * (Math.pow(1 + cpiAssumption, postCliffYears) - 1)
    : 0;
  const realPostGain = Math.max(0, postCliffGain - indexationUplift);
  const taxNewOnPostMarginal = realPostGain * marginalRate;
  const taxNewOnPostMinFloor = realPostGain * MODEL_DEFAULTS.cgtMinTaxRate;
  const taxNewOnPost = Math.max(taxNewOnPostMarginal, taxNewOnPostMinFloor);

  // Which method applies post-cliff?
  //   • Grandfathered (bought before 12 May 2026) → OLD method on whole gain.
  //   • New build → INVESTOR CHOICE → take the cheaper of old/new on post-cliff.
  //   • Established post-budget → NEW method (no choice).
  let cgtTax;
  let cgtRegime;
  if (purchasedPreBudget) {
    cgtTax = taxOldOnPre + taxOldOnPost;
    cgtRegime = "grandfathered-50pct";
  } else if (build === "new") {
    const postTax = Math.min(taxOldOnPost, taxNewOnPost);
    cgtTax = taxOldOnPre + postTax;
    cgtRegime = postTax === taxNewOnPost ? "new-build-chose-indexation" : "new-build-chose-50pct";
  } else {
    cgtTax = taxOldOnPre + taxNewOnPost;
    cgtRegime = "established-indexation";
  }

  const loanBalanceAtExit = loanType === "pi" ? loanBalance : (price * (1 - deposit));
  const netProceeds = salePrice - sellingCosts - cgtTax - loanBalanceAtExit;
  const equityAtExit = salePrice - loanBalanceAtExit;

  return {
    monthly: arr,
    monthlyDetail,
    totalCashflow,
    acquisition: acq,
    exit: {
      sellYear: exitYear,
      salePrice: Math.round(salePrice),
      sellingCosts: Math.round(sellingCosts),
      adjustedCostBase: Math.round(adjustedCostBase),
      grossGain: Math.round(grossGain),
      carryForwardLoss: Math.round(carryForwardLoss),
      carriedUsedOnSale: Math.round(carriedUsedOnSale),
      cgtTax: Math.round(cgtTax),
      cgtRegime,
      preCliffGain: Math.round(preCliffGain),
      postCliffGain: Math.round(postCliffGain),
      indexationUplift: Math.round(indexationUplift),
      loanBalanceAtExit: Math.round(loanBalanceAtExit),
      equityAtExit: Math.round(equityAtExit),
      netProceeds: Math.round(netProceeds),
    },
    inputs: {
      price, yieldPct, growthPct, rate, deposit, marginalRate, build, state, loanType,
      purchasedPreBudget, yearsUntilPurchase,
    },
    policy: {
      ngAlwaysRefundable,
      monthsUntilCliff: Number.isFinite(monthsUntilCliff) ? monthsUntilCliff : null,
    },
  };
}

export function calcAchievements(cashflow, goals) {
  return goals.map(goal => {
    let yearHit = null;
    if (goal.type === "yearly") {
      for (let y = 1; y <= 30; y++) {
        const annual = cashflow.slice((y - 1) * 12, y * 12).reduce((s, x) => s + x, 0);
        if (annual >= goal.amount) { yearHit = y; break; }
      }
    } else {
      let cum = 0;
      for (let m = 0; m < 360; m++) {
        cum += cashflow[m];
        if (cum >= goal.amount) { yearHit = Math.ceil((m + 1) / 12); break; }
      }
    }
    return { ...goal, yearHit };
  });
}

export function fmt(n) {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 100) / 10}k`;
  return `$${Math.round(n)}`;
}
export function fmtFull(n) { return `$${Math.round(n).toLocaleString()}`; }

export function cellSpectrum(cf) {
  if (cf <= -2000) return { color: "#7F1D1D", opacity: 1.0  };
  if (cf <= -1200) return { color: "#DC2626", opacity: 1.0  };
  if (cf <=  -600) return { color: "#EF4444", opacity: 0.92 };
  if (cf <=  -200) return { color: "#F87171", opacity: 0.82 };
  if (cf <=     0) return { color: "#FB923C", opacity: 0.78 };
  if (cf <=   200) return { color: "#F59E0B", opacity: 0.88 };
  if (cf <=   500) return { color: "#EAB308", opacity: 0.95 };
  if (cf <=  1000) return { color: "#84CC16", opacity: 1.0  };
  if (cf <=  1500) return { color: "#22C55E", opacity: 1.0  };
  return                  { color: "#10B981", opacity: 1.0  };
}

/** Year each monthly-cashflow milestone is first crossed. */
export function calcDollarMilestones(cashflow) {
  const targets = [0, 500, 1000, 1500];
  return targets.map(target => {
    let yearHit = null;
    for (let m = 0; m < cashflow.length; m++) {
      if (cashflow[m] >= target) { yearHit = Math.ceil((m + 1) / 12); break; }
    }
    return { target, yearHit };
  });
}

export function yearTurnsPositive(cashflow) {
  for (let m = 0; m < cashflow.length; m++) {
    if (cashflow[m] >= 0) return Math.ceil((m + 1) / 12);
  }
  return null;
}

export function week1Cost(cashflow) {
  const yr1 = cashflow.slice(0, 12).reduce((s, x) => s + x, 0);
  return yr1 / 52;
}

/** Dollar value of NG eligibility over 30 years (new vs same property as established). */
// ════════════════════════════════════════════════════════════════════════════
// RETURNS — IRR + cash-on-cash + multiple. Sophisticated-investor metrics
// derived from the same scenario the rest of the app uses, so numbers match.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Compute the internal rate of return of a cashflow series given an initial
 * outlay and a terminal value. Cashflows are in months; we annualise the
 * result so it can be reported as a typical % per year.
 *
 * Uses bisection (robust, no derivative needed). Returns a decimal (0.087
 * = 8.7% p.a.) or null if the series doesn't have a sign change in 30 years
 * (meaning no IRR exists).
 */
export function irrMonthly(cashflows, terminalValue = 0) {
  if (!cashflows?.length) return null;
  const series = [...cashflows];
  series[series.length - 1] = (series[series.length - 1] || 0) + terminalValue;

  const npv = (rate) => {
    let v = 0;
    for (let i = 0; i < series.length; i++) v += series[i] / Math.pow(1 + rate, i);
    return v;
  };

  let lo = -0.999 / 12;
  let hi = 1.0 / 12;
  let fLo = npv(lo);
  let fHi = npv(hi);
  if (Number.isNaN(fLo) || Number.isNaN(fHi)) return null;
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 90; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (!Number.isFinite(fMid)) return null;
    if (Math.abs(fMid) < 1e-2) return Math.pow(1 + mid, 12) - 1;
    if (fLo * fMid < 0) { hi = mid; fHi = fMid; }
    else { lo = mid; fLo = fMid; }
  }
  const monthly = (lo + hi) / 2;
  return Math.pow(1 + monthly, 12) - 1;
}

/**
 * Compose returns metrics for a scenario.
 * Inputs:
 *   scenario  — output of generateScenario()
 *   horizonYears — how long the user plans to hold (defaults to 30)
 *
 * Output:
 *   {
 *     cashOnCash,        // year-1 net cashflow / total cash invested
 *     irrCashflowOnly,   // IRR ignoring sale (pure income return)
 *     irrAllIn,          // IRR including sale at horizon
 *     moneyMultiple,     // (total cashflow + exit equity) / total cash in
 *     totalCashIn,       // acquisition + any negative monthly bleed
 *     totalCashOut,      // any positive monthly cashflow + sale proceeds
 *   }
 */
export function computeReturns(scenario, horizonYears = 30) {
  if (!scenario?.monthly?.length) return null;
  const months = Math.min(scenario.monthly.length, horizonYears * 12);
  const window = scenario.monthly.slice(0, months);

  const acqTotal = scenario.acquisition?.total || 0;
  const y1Net = window.slice(0, 12).reduce((s, x) => s + x, 0);
  const totalBleed = window.reduce((s, x) => s + (x < 0 ? -x : 0), 0);
  const totalPositive = window.reduce((s, x) => s + (x > 0 ? x : 0), 0);
  const totalCashIn = acqTotal + totalBleed;

  // Cash-on-cash — most investors define it as year-1 (rough but standard)
  const cashOnCash = acqTotal > 0 ? y1Net / acqTotal : 0;

  // IRR — series with initial outlay then monthly cashflows
  const seriesCashflowOnly = [-acqTotal, ...window];
  const irrCashflowOnly = irrMonthly(seriesCashflowOnly, 0);

  // IRR all-in — adds exit net proceeds (sale − costs − CGT − remaining loan).
  // We do NOT add the deposit back: the deposit was a real cash outflow at
  // year zero so it stays as the negative leg of the IRR series. Net proceeds
  // is what the bank deposits in your account on settlement.
  const exitProceeds = scenario.exit?.netProceeds || 0;
  const irrAllIn = irrMonthly(seriesCashflowOnly, exitProceeds);

  // Money multiple — every dollar that came back to the investor (positive
  // monthly cashflow + net sale proceeds AFTER CGT, costs and remaining loan)
  // divided by every dollar they put in (acquisition + any monthly bleed).
  // Note: we previously used equityAtExit (gross of CGT) which double-counted —
  // netProceeds already nets out CGT, selling costs and the loan payoff.
  const moneyMultiple = totalCashIn > 0
    ? (totalPositive + Math.max(0, scenario.exit?.netProceeds || 0)) / totalCashIn
    : 0;

  return {
    cashOnCash,
    irrCashflowOnly,
    irrAllIn,
    moneyMultiple,
    totalCashIn: Math.round(totalCashIn),
    totalPositive: Math.round(totalPositive),
    y1Net: Math.round(y1Net),
  };
}

export function ngBenefitValue(property) {
  const cfNew = generateCashflow({ ...property, build: "new" });
  const cfExisting = generateCashflow({ ...property, build: "existing" });
  const sumNew = cfNew.reduce((s, x) => s + x, 0);
  const sumExist = cfExisting.reduce((s, x) => s + x, 0);
  return sumNew - sumExist;
}
