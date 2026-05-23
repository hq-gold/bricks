import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, TrendingDown, Percent } from "lucide-react";
import { generateCashflow, yearTurnsPositive } from "../core/cashflow.js";

// "What if rates go up?" answered in one glance. Three columns: today,
// +1%, +2%. Each shows the same three numbers — break-even year, year-1
// monthly cost, lifetime net — so the eye can sweep across.

function fmtFull(n) {
  return `$${Math.round(Math.abs(n)).toLocaleString()}`;
}

function compactDollars(n) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${n < 0 ? "−" : ""}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1000) return `${n < 0 ? "−" : ""}$${Math.round(abs / 1000)}k`;
  return `${n < 0 ? "−" : ""}$${Math.round(abs)}`;
}

export default function SensitivityStrip({ cfConfig }) {
  const scenarios = useMemo(() => {
    if (!cfConfig) return [];
    return [
      { id: "today", label: "Today", rateOffset: 0, accent: "#86EFAC" },
      { id: "plus1", label: "+1%", rateOffset: 0.01, accent: "#FCD34D" },
      { id: "plus2", label: "+2%", rateOffset: 0.02, accent: "#FCA5A5" },
    ].map(s => {
      const cf = generateCashflow({ ...cfConfig, rate: cfConfig.rate + s.rateOffset });
      const breakEven = yearTurnsPositive(cf);
      const y1Monthly = cf.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
      const lifetime = cf.reduce((a, b) => a + b, 0);
      return {
        ...s,
        rate: cfConfig.rate + s.rateOffset,
        breakEven, y1Monthly, lifetime,
      };
    });
  }, [cfConfig]);

  if (scenarios.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        marginBottom: 28,
        borderRadius: 18,
        background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset",
        padding: "22px 24px 20px",
      }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 7,
          background: "rgba(252,165,165,0.16)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Percent size={11} color="#FCA5A5" strokeWidth={2.6} />
        </div>
        <div style={{
          fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase",
          fontWeight: 700, color: "rgba(252,165,165,0.9)",
        }}>If rates rise</div>
      </div>
      <div style={{
        fontFamily: 'ui-serif, Georgia, serif',
        fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.2,
        color: "#F5F7FA", marginBottom: 18,
      }}>
        Stress-test the deal in one glance.
      </div>

      <div className="sensitivity-grid" style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
      }}>
        {scenarios.map((s, i) => (
          <motion.div key={s.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.34 }}
            style={{
              position: "relative",
              padding: "14px 14px 13px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.025)",
              border: `1px solid ${s.accent}33`,
            }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: `${s.accent}66`,
              borderRadius: "14px 14px 0 0",
            }} />
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              marginBottom: 10,
            }}>
              <span style={{
                fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
                color: "rgba(245,247,250,0.5)", fontWeight: 700,
              }}>Rate</span>
              <span style={{
                fontSize: 14, fontWeight: 700, color: s.accent,
                letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
              }}>
                {(s.rate * 100).toFixed(2)}%
                {s.id !== "today" && (
                  <span style={{ fontSize: 11, marginLeft: 4, color: "rgba(245,247,250,0.4)", fontWeight: 500 }}>
                    {s.label}
                  </span>
                )}
              </span>
            </div>

            <SensStat label="Break-even"
              value={s.breakEven ? `Year ${s.breakEven}` : "Never"}
              accent={s.breakEven ? s.accent : "#FCA5A5"} />
            <SensStat label="Year-1 monthly"
              value={compactDollars(s.y1Monthly)}
              accent={s.y1Monthly >= 0 ? "#86EFAC" : "#F5F7FA"} />
            <SensStat label="Net 30-yr"
              value={compactDollars(s.lifetime)}
              accent={s.lifetime >= 0 ? "#86EFAC" : "#F5F7FA"}
              last />
          </motion.div>
        ))}
      </div>

      <div style={{
        marginTop: 12, fontSize: 11, color: "rgba(245,247,250,0.4)", lineHeight: 1.5,
      }}>
        Every other slider stays put — only the loan rate moves. Real loans re-price annually.
      </div>
    </motion.div>
  );
}

function SensStat({ label, value, accent, last }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0",
      borderTop: "1px solid rgba(255,255,255,0.04)",
      marginBottom: last ? 0 : 0,
    }}>
      <span style={{ fontSize: 11, color: "rgba(245,247,250,0.55)", letterSpacing: "-0.005em" }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 700, color: accent,
        letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums",
      }}>{value}</span>
    </div>
  );
}
