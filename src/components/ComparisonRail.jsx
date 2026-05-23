import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { generateScenario, yearTurnsPositive } from "../core/cashflow.js";

// "Here's your property — and three friends." Side-by-side card rail that
// makes the comparison effortless. Same modelling assumptions for every
// column so the numbers really are apples to apples.

function fmtPrice(n) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n / 1000)}k`;
}
function fmtShort(n) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${n < 0 ? "−" : ""}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1000) return `${n < 0 ? "−" : ""}$${Math.round(abs / 1000)}k`;
  return `${n < 0 ? "−" : ""}$${Math.round(abs)}`;
}

function rowFor(property, sharedAssumptions) {
  const cfg = {
    price: property.price,
    yieldPct: property.yieldPct,
    growthPct: property.growthPct,
    build: property.build,
    state: property.state || "NSW",
    type: property.type,
    ...sharedAssumptions,
  };
  const sc = generateScenario(cfg);
  const monthly = sc.monthly;
  const breakEven = yearTurnsPositive(monthly);
  const y1Monthly = monthly.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  const lifetime = monthly.reduce((a, b) => a + b, 0);
  const equityAtExit = sc.exit?.equityAtExit ?? 0;
  return { property, breakEven, y1Monthly, lifetime, equityAtExit };
}

export default function ComparisonRail({ currentProperty, others, sharedAssumptions, onOpen }) {
  const rows = useMemo(() => {
    const sa = sharedAssumptions || {};
    const cur = rowFor(currentProperty, sa);
    const restRaw = (others || []).slice(0, 3).map(p => rowFor(p, sa));
    return { current: cur, others: restRaw };
  }, [currentProperty, others, sharedAssumptions]);

  const all = [rows.current, ...rows.others];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        marginBottom: 56,
        borderRadius: 22,
        background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "30px 28px 26px",
      }}>
      <div style={{
        fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
        color: "rgba(245,247,250,0.5)", fontWeight: 600, marginBottom: 6,
      }}>This property vs three friends</div>
      <div style={{
        fontFamily: 'ui-serif, Georgia, serif', fontSize: 24, fontWeight: 500,
        color: "#F5F7FA", letterSpacing: "-0.02em", marginBottom: 6, lineHeight: 1.2,
      }}>
        Same modelling rules. Honest comparison.
      </div>
      <p style={{
        fontSize: 13, color: "rgba(245,247,250,0.55)", margin: "0 0 22px", lineHeight: 1.5,
      }}>
        Identical bracket, deposit, rate, growth assumptions — only the property changes. Tap any to swap into the detail view.
      </p>

      <div className="comparison-rail-grid" style={{
        display: "grid",
        gridTemplateColumns: `repeat(${all.length}, minmax(0, 1fr))`,
        gap: 12,
      }}>
        {all.map((row, i) => {
          const isCurrent = i === 0;
          return (
            <motion.button
              key={row.property.id}
              whileHover={isCurrent ? {} : { y: -2 }}
              whileTap={isCurrent ? {} : { scale: 0.995 }}
              onClick={() => !isCurrent && onOpen?.(row.property.id)}
              disabled={isCurrent}
              style={{
                textAlign: "left",
                cursor: isCurrent ? "default" : "pointer",
                position: "relative",
                background: isCurrent
                  ? "linear-gradient(180deg, rgba(251,113,133,0.10), rgba(251,113,133,0.02))"
                  : "rgba(255,255,255,0.02)",
                border: isCurrent
                  ? "1px solid rgba(251,113,133,0.36)"
                  : "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "14px 14px 16px",
                color: "#F5F7FA",
              }}>
              {isCurrent && (
                <div style={{
                  position: "absolute", top: -10, left: 14,
                  background: "linear-gradient(135deg, #FB7185, #C9374F)",
                  color: "#fff", fontSize: 9.5, fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  padding: "3px 9px", borderRadius: 999,
                }}>This property</div>
              )}
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif',
                fontSize: 15, fontWeight: 500, color: "#F5F7FA",
                letterSpacing: "-0.01em", lineHeight: 1.25,
                marginBottom: 3,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{row.property.name}</div>
              <div style={{
                fontSize: 11, color: "rgba(245,247,250,0.5)",
                marginBottom: 14, letterSpacing: "-0.005em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{(row.property.suburb || "").split(",")[0]} · {fmtPrice(row.property.price)} · {row.property.build === "new" ? "new" : "established"}</div>

              <RailStat label="Turns green" value={row.breakEven ? `Yr ${row.breakEven}` : "Never"}
                accent={row.breakEven && row.breakEven <= 6 ? "#86EFAC" : row.breakEven ? "#FCD34D" : "#FCA5A5"} />
              <RailStat label="Year-1 / mo" value={fmtShort(row.y1Monthly)}
                accent={row.y1Monthly >= 0 ? "#86EFAC" : "#F5F7FA"} />
              <RailStat label="Net 30yr" value={fmtShort(row.lifetime)}
                accent={row.lifetime >= 0 ? "#86EFAC" : "#F5F7FA"} />
              <RailStat label="Equity y30" value={fmtShort(row.equityAtExit)}
                accent="#FECDD3" last />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function RailStat({ label, value, accent, last }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: "7px 0",
      borderTop: "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ fontSize: 10.5, color: "rgba(245,247,250,0.5)", letterSpacing: "-0.005em" }}>{label}</span>
      <span style={{
        fontSize: 12.5, fontWeight: 700, color: accent,
        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em",
      }}>{value}</span>
    </div>
  );
}
