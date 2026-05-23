/** Monthly equity, loan balance, and milestone helpers for the wealth brick. */

export function computeWealthProjection(vars, cashflow) {
  const loan0 = vars.price * (1 - vars.deposit / 100);
  const depositEquity = Math.round(vars.price * (vars.deposit / 100));
  const monthlyRate = (vars.rate / 100) / 12;
  const termM = 30 * 12;
  const piM = monthlyRate > 0
    ? loan0 * monthlyRate / (1 - Math.pow(1 + monthlyRate, -termM))
    : loan0 / termM;

  const monthlyEquity = [];
  const loanBalance = [];
  let bal = loan0;
  let cumCash = 0;

  for (let m = 0; m < 360; m++) {
    if (vars.loanType === "pi" && bal > 0) {
      const interest = bal * monthlyRate;
      bal = Math.max(0, bal - (piM - interest));
    }
    cumCash += cashflow[m] ?? 0;
    const years = (m + 1) / 12;
    const value = vars.price * Math.pow(1 + vars.growthPct / 100, years);
    monthlyEquity.push(Math.round(value - bal + cumCash));
    loanBalance.push(Math.round(bal));
  }

  const equitySeries = [];
  for (let y = 1; y <= 30; y++) {
    equitySeries.push(monthlyEquity[y * 12 - 1] ?? 0);
  }

  return { monthlyEquity, loanBalance, equitySeries, depositEquity, loan0: Math.round(loan0) };
}

export function calcWealthMilestones(monthlyEquity, depositEquity) {
  const targets = [
    { id: "deposit", label: "Your deposit", target: depositEquity },
    { id: "double", label: "Doubles your deposit", target: depositEquity * 2 },
    { id: "2m", label: "$2M net worth", target: 2_000_000 },
    { id: "5m", label: "$5M net worth", target: 5_000_000 },
    { id: "10m", label: "$10M net worth", target: 10_000_000 },
  ];

  return targets.map(t => {
    let monthHit = null;
    for (let m = 0; m < monthlyEquity.length; m++) {
      if (monthlyEquity[m] >= t.target) {
        monthHit = m;
        break;
      }
    }
    return {
      ...t,
      monthHit,
      yearHit: monthHit != null ? Math.floor(monthHit / 12) + 1 : null,
    };
  }).filter(m => m.yearHit != null);
}

/** Premium established terraces — lead with wealth, not yield. */
export function isWealthFirstProperty(property, vars) {
  const price = vars?.price ?? property?.price ?? 0;
  const build = vars?.build ?? property?.build ?? "existing";
  return build === "existing" && price >= 2_000_000;
}

export function studioSliderBounds(propertyPrice, currentPrice, currentRent) {
  const p = propertyPrice || 1_000_000;
  const priceMin = Math.max(300_000, Math.round(p * 0.55 / 10_000) * 10_000);
  const priceMax = Math.max(
    priceMin + 200_000,
    Math.round(p * 1.45 / 10_000) * 10_000,
    Math.ceil((currentPrice || p) / 10_000) * 10_000,
  );
  const rentMin = 200;
  const rentMax = Math.max(
    3500,
    Math.ceil((p * 0.055) / 52 / 25) * 25,
    Math.ceil((currentRent || 0) / 25) * 25,
  );
  return { priceMin, priceMax, rentMin, rentMax };
}

export function fmtMoneyShort(n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`.replace(".0M", "M");
  if (abs >= 1000) return `$${Math.round(abs / 1000)}k`;
  return `$${Math.round(abs)}`;
}
