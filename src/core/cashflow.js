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
  rate: 0.066,
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
});

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

export function piMonthlyRepayment(loan, annualRate, years) {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return loan / n;
  return loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * 360-month after-tax cashflow series.
 * Accepts a property-like object (or a {price, yieldPct, growthPct, rate, deposit, ...}).
 */
export function generateCashflow(input) {
  const {
    price, yieldPct, growthPct = 5,
    rate = MODEL_DEFAULTS.rate,
    deposit = MODEL_DEFAULTS.deposit,
    marginalRate = 0.39,
    build = "new",
    state = "NSW",
    months = 360,
    loanType = MODEL_DEFAULTS.loanType,
    type,
  } = input;
  const property = { type, state, price, build };

  const arr = [];
  const loan = price * (1 - deposit);
  const rentGrowth = MODEL_DEFAULTS.rentGrowth;
  const vacancyAdj = 1 - MODEL_DEFAULTS.vacancyFraction;

  const apt = isApartment(property);
  const cashCostsPct = apt ? MODEL_DEFAULTS.cashCostsPctApartment : MODEL_DEFAULTS.cashCostsPctHouse;

  const landFr = landFractionOf(property);
  const landValue = price * landFr;
  const landTaxYr = landTaxAnnual({ state, landValue });

  const constructionCost = price * MODEL_DEFAULTS.constructionPctOfPrice;
  const div43Annual = constructionCost * 0.025;

  const div40Base = build === "new" ? price * MODEL_DEFAULTS.div40NewBuildBase : 0;

  const piRepaymentM = piMonthlyRepayment(loan, rate, MODEL_DEFAULTS.loanTermYears);
  let loanBalance = loan;

  const ngAllowed = build === "new";

  for (let m = 0; m < months; m++) {
    const yr = m / 12;
    const yearIdx = Math.floor(yr);

    const annualGrossRent = price * (yieldPct / 100) * Math.pow(1 + rentGrowth, yr);
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
    const landTaxM = landTaxYr / 12;
    const totalCashCostsM = cashCostsMFixed + cashCostsMRentLinked + landTaxM;

    const div43M = (yearIdx < 40 ? div43Annual : 0) / 12;
    const div40YearlyDeduction = div40Base * MODEL_DEFAULTS.div40DiminishingRate
      * Math.pow(1 - MODEL_DEFAULTS.div40DiminishingRate, yearIdx);
    const div40M = div40YearlyDeduction / 12;
    const totalDepreciationM = div43M + div40M;

    const taxableIncomeM = rentMonthly - interestM - totalCashCostsM - totalDepreciationM;
    const taxBenefitM = (taxableIncomeM < 0 && ngAllowed)
      ? (-taxableIncomeM) * marginalRate
      : 0;
    const taxOwedM = taxableIncomeM > 0
      ? taxableIncomeM * marginalRate
      : 0;

    const cashflowM =
        rentMonthly
      - interestM
      - principalM
      - totalCashCostsM
      + taxBenefitM
      - taxOwedM;

    arr.push(cashflowM);
  }
  return arr;
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
export function ngBenefitValue(property) {
  const cfNew = generateCashflow({ ...property, build: "new" });
  const cfExisting = generateCashflow({ ...property, build: "existing" });
  const sumNew = cfNew.reduce((s, x) => s + x, 0);
  const sumExist = cfExisting.reduce((s, x) => s + x, 0);
  return sumNew - sumExist;
}
