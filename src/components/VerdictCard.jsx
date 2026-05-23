import React from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Receipt, ArrowDownRight, Trophy } from "lucide-react";

// "What this means for you" — plain-English verdict on the property, derived
// from the same model the rest of the app uses. Designed to read like a friend
// who's just done your numbers, not like a spreadsheet.

function fmtDollarsShort(n) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 10_000) return `${n < 0 ? "−" : ""}$${Math.round(abs / 1000)}k`;
  if (abs >= 1000) return `${n < 0 ? "−" : ""}$${(abs / 1000).toFixed(1)}k`;
  return `${n < 0 ? "−" : ""}$${Math.round(abs)}`;
}

function fmtDollarsFull(n) {
  return `$${Math.round(Math.abs(n)).toLocaleString()}`;
}

/**
 * @param props
 *   property — the listing
 *   verdict — {
 *     y1MonthlyCashflow, breakEvenYear, lifetimeNet, lifetimeBleed,
 *     equityAt30, equityAt10, rateStressBreakEven,
 *     acquisition, exit, suburbRankPct, suburbName,
 *     marginalRate, depositPct, rate, build
 *   }
 */
export default function VerdictCard({ property, verdict, onOpenStudio }) {
  if (!verdict) return null;
  const {
    y1MonthlyCashflow, breakEvenYear, lifetimeNet, lifetimeBleed,
    equityAt30, equityAt10, rateStressBreakEven,
    acquisition, exit, suburbRankPct, suburbName,
    marginalRate, depositPct, rate, build, pporYears = 0,
  } = verdict;

  const isPositiveDayOne = y1MonthlyCashflow >= 0;
  const breakEvenLabel = breakEvenYear
    ? (breakEvenYear === 1 ? "year 1" : `year ${breakEvenYear}`)
    : null;
  const y1Weekly = (y1MonthlyCashflow * 12) / 52;

  // ─── Build the human paragraph ──────────────────────────────────────────
  const dollarsY1 = fmtDollarsFull(y1MonthlyCashflow);
  const dollarsLifetime = fmtDollarsShort(Math.abs(lifetimeNet));
  const dollarsEquity = fmtDollarsShort(equityAt30);
  const ratePct = `${(rate * 100).toFixed(2)}%`;
  const bracketLabel = `${Math.round(marginalRate * 100)}%`;
  const buildLabel = build === "new" ? "new build" : "established property";

  let opener;
  if (pporYears > 0) {
    opener = `Live in this ${buildLabel} for ${pporYears} year${pporYears === 1 ? "" : "s"} — costing you about ${dollarsY1}/month out of pocket — then it converts to a rental${breakEvenYear ? ` and turns cashflow-positive from ${breakEvenLabel}` : ""}.`;
  } else if (isPositiveDayOne) {
    opener = `This ${buildLabel} pays you from day one — about ${dollarsY1}/month after tax.`;
  } else if (breakEvenYear && breakEvenYear <= 30) {
    opener = `This ${buildLabel} costs you about ${dollarsY1}/month after tax for the first ${breakEvenYear - 1} year${breakEvenYear - 1 === 1 ? "" : "s"}, then turns green from ${breakEvenLabel}.`;
  } else {
    opener = `This ${buildLabel} stays cashflow-negative across the 30-year horizon at about ${dollarsY1}/month after tax — the payoff lives entirely in capital growth.`;
  }

  const closer = lifetimeNet >= 0
    ? `Over 30 years you put in ${fmtDollarsShort(lifetimeBleed)} of cash and pull out ${dollarsLifetime} in net rent + an estimated ${dollarsEquity} in equity.`
    : `Over 30 years your cash bleed nets to about ${dollarsLifetime}, against an estimated ${dollarsEquity} in equity — capital growth has to do the heavy lifting.`;

  const assumptions = `On your bracket (${bracketLabel}), ${Math.round(depositPct * 100)}% down at ${ratePct}.`;

  // ─── Rank context ───────────────────────────────────────────────────────
  const rankLine = suburbRankPct != null
    ? `Better than ${Math.round(suburbRankPct)}% of comparable ${build === "new" ? "new builds" : "established homes"}${suburbName ? ` in ${suburbName}` : ""}.`
    : null;

  // ─── Risk callout ───────────────────────────────────────────────────────
  let riskLine;
  if (rateStressBreakEven && breakEvenYear && rateStressBreakEven > breakEvenYear) {
    const delta = rateStressBreakEven - breakEvenYear;
    riskLine = `A 1% rate rise pushes break-even back ${delta} year${delta === 1 ? "" : "s"} — to year ${rateStressBreakEven}.`;
  } else if (rateStressBreakEven && breakEvenYear && rateStressBreakEven === breakEvenYear) {
    riskLine = `Break-even is resilient to a 1% rate rise — still ${breakEvenLabel}.`;
  } else if (!breakEvenYear) {
    riskLine = `It already doesn't turn positive on the base case. A 1% rate rise widens the gap by ~$${Math.round(property.price * 0.01 * (1 - depositPct) / 12).toLocaleString()}/month.`;
  } else {
    riskLine = `On the stress test (+1% rates) this property still turns positive — just not until year ${rateStressBreakEven || "30"}.`;
  }

  // ─── Stat tiles ─────────────────────────────────────────────────────────
  const tiles = [
    {
      label: "Year 1",
      value: `${y1Weekly < 0 ? "−" : "+"}$${Math.round(Math.abs(y1Weekly)).toLocaleString()}`,
      sub: "per week",
      tone: y1MonthlyCashflow < 0 ? "neg" : "pos",
    },
    {
      label: "Turns green",
      value: breakEvenYear ? `Year ${breakEvenYear}` : "—",
      sub: breakEvenYear ? "monthly +ve" : "stays −ve",
      tone: breakEvenYear && breakEvenYear <= 6 ? "pos" : breakEvenYear ? "warn" : "neg",
    },
    {
      label: "Cash in",
      value: fmtDollarsShort(lifetimeBleed),
      sub: "your max out-of-pocket",
      tone: "neutral",
    },
    {
      label: "Net 30yr",
      value: `${lifetimeNet < 0 ? "−" : "+"}${fmtDollarsShort(Math.abs(lifetimeNet))}`,
      sub: "after-tax cashflow",
      tone: lifetimeNet >= 0 ? "pos" : "neg",
    },
    {
      label: "Equity y30",
      value: fmtDollarsShort(equityAt30),
      sub: "value − loan",
      tone: "pos",
    },
  ];

  const toneColors = {
    pos: { fg: "#86EFAC", glow: "rgba(74,222,128,0.18)" },
    neg: { fg: "#FCA5A5", glow: "rgba(248,113,113,0.18)" },
    warn: { fg: "#FCD34D", glow: "rgba(252,211,77,0.15)" },
    neutral: { fg: "#F5F7FA", glow: "rgba(255,255,255,0.06)" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="verdict-card"
      style={{
        position: "relative",
        marginTop: 22, marginBottom: 32,
        borderRadius: 24, overflow: "hidden",
        background: "linear-gradient(180deg, rgba(251,113,133,0.06) 0%, rgba(255,255,255,0.025) 38%, rgba(255,255,255,0.018) 100%)",
        border: "1px solid rgba(251,113,133,0.22)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 30px 80px -40px rgba(244,63,94,0.32)",
      }}
    >
      {/* Rose glow accent */}
      <div aria-hidden style={{
        position: "absolute", top: -100, right: -80,
        width: 280, height: 280, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(251,113,133,0.22) 0%, transparent 60%)",
        filter: "blur(40px)", pointerEvents: "none",
      }} />

      <div style={{ position: "relative", padding: "30px 32px 26px" }}>
        {/* Eyebrow */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "5px 12px", borderRadius: 999,
          background: "rgba(251,113,133,0.12)",
          border: "1px solid rgba(251,113,133,0.32)",
          fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
          color: "#FECDD3", marginBottom: 16,
        }}>
          <Sparkles size={11} strokeWidth={2.4} color="#FB7185" fill="#FB7185" />
          The verdict
        </div>

        {/* Headline paragraph */}
        <div style={{
          fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
          fontSize: "clamp(20px, 2.2vw, 26px)",
          fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.32,
          color: "#F5F7FA",
          marginBottom: 14,
          maxWidth: 760,
        }}>
          {opener}{" "}
          <span style={{ color: "rgba(245,247,250,0.78)" }}>
            {closer}
          </span>
        </div>

        {/* Assumption / rank line */}
        <div style={{
          fontSize: 13, color: "rgba(245,247,250,0.55)", marginBottom: 22,
          letterSpacing: "-0.005em", lineHeight: 1.55,
        }}>
          {assumptions}{" "}
          {rankLine && (
            <span style={{ color: "#FECDD3" }}>
              <Trophy size={12} strokeWidth={2.4} style={{ verticalAlign: -1, marginRight: 3 }} />
              {rankLine}
            </span>
          )}
        </div>

        {/* Stat tiles */}
        <div className="verdict-tiles" style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 10,
          marginBottom: 18,
        }}>
          {tiles.map((t, i) => {
            const c = toneColors[t.tone];
            return (
              <div key={i} style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "13px 14px",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: c.glow,
                  borderRadius: "14px 14px 0 0",
                }} />
                <div style={{
                  fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: "rgba(245,247,250,0.45)", fontWeight: 600, marginBottom: 6,
                }}>{t.label}</div>
                <div style={{
                  fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em",
                  color: c.fg, fontVariantNumeric: "tabular-nums",
                  marginBottom: 2,
                }}>{t.value}</div>
                <div style={{
                  fontSize: 11, color: "rgba(245,247,250,0.4)", letterSpacing: "-0.005em",
                }}>{t.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Risk callout */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "12px 14px", borderRadius: 12,
          background: "rgba(252,211,77,0.06)",
          border: "1px solid rgba(252,211,77,0.18)",
          marginBottom: 18,
        }}>
          <AlertTriangle size={14} strokeWidth={2.4} color="#FCD34D" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{
            fontSize: 12.5, color: "rgba(254,243,199,0.85)", lineHeight: 1.5,
            letterSpacing: "-0.005em",
          }}>
            <span style={{ color: "#FCD34D", fontWeight: 700, marginRight: 6 }}>Biggest risk:</span>
            {riskLine}
          </div>
        </div>

        {/* Day-one cash strip */}
        {acquisition && (
          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14,
            padding: "13px 16px", borderRadius: 12,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              flexShrink: 0,
            }}>
              <Receipt size={14} strokeWidth={2.2} color="rgba(245,247,250,0.55)" />
              <div>
                <div style={{
                  fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: "rgba(245,247,250,0.45)", fontWeight: 700,
                }}>Day-one cash</div>
                <div style={{
                  fontSize: 17, fontWeight: 700, color: "#F5F7FA",
                  letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
                }}>{fmtDollarsFull(acquisition.total)}</div>
              </div>
            </div>
            <div style={{
              flex: 1, minWidth: 200, fontSize: 12,
              color: "rgba(245,247,250,0.55)", lineHeight: 1.5,
            }}>
              Deposit <strong style={{ color: "#F5F7FA" }}>{fmtDollarsShort(acquisition.deposit)}</strong> ·
              {" "}Stamp duty <strong style={{ color: "#F5F7FA" }}>{fmtDollarsShort(acquisition.stampDuty)}</strong>
              {acquisition.lmi > 0 && <> · LMI <strong style={{ color: "#F5F7FA" }}>{fmtDollarsShort(acquisition.lmi)}</strong></>}
              {" "}· Legals <strong style={{ color: "#F5F7FA" }}>${acquisition.legals.toLocaleString()}</strong>
              {acquisition.buildingPest > 0 && <> · B&amp;P <strong style={{ color: "#F5F7FA" }}>${acquisition.buildingPest.toLocaleString()}</strong></>}
            </div>
          </div>
        )}

        {/* Footnote */}
        <div style={{
          marginTop: 14,
          fontSize: 11, color: "rgba(245,247,250,0.35)", lineHeight: 1.5,
          letterSpacing: "-0.005em",
        }}>
          Same model the rest of the page uses. Drag any slider below to re-run this verdict on your situation. Not financial advice.
        </div>
      </div>
    </motion.div>
  );
}
