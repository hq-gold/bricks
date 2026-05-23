import React from "react";
import { motion } from "framer-motion";
import { LineChart, TrendingUp, Layers, Coins } from "lucide-react";

// Sophisticated-investor returns at a glance: IRR, cash-on-cash, money
// multiple. The kind of numbers a buyer's agent quotes — usually missing
// from listing sites. Pulled from computeReturns() so they're consistent
// with everything else on the page.

function pctFmt(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function xFmt(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}×`;
}

function dollarsK(n) {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${n < 0 ? "−" : ""}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1000) return `${n < 0 ? "−" : ""}$${Math.round(abs / 1000)}k`;
  return `${n < 0 ? "−" : ""}$${Math.round(abs)}`;
}

export default function ReturnsStrip({ returns, horizonYears = 30 }) {
  if (!returns) return null;
  const { cashOnCash, irrCashflowOnly, irrAllIn, moneyMultiple, totalCashIn, y1Net } = returns;

  const irrTone = (irrAllIn || 0) >= 0.10 ? "#86EFAC"
    : (irrAllIn || 0) >= 0.06 ? "#FCD34D"
    : "#FCA5A5";

  const tiles = [
    {
      icon: TrendingUp,
      label: `${horizonYears}-yr IRR`,
      sub: "Year-1 cash + sale at horizon",
      value: pctFmt(irrAllIn),
      accent: irrTone,
    },
    {
      icon: Coins,
      label: "Cash-on-cash",
      sub: "Year-1 net ÷ year-0 cash",
      value: pctFmt(cashOnCash),
      accent: cashOnCash >= 0 ? "#86EFAC" : "#FCA5A5",
    },
    {
      icon: Layers,
      label: "Money multiple",
      sub: "Out vs in over horizon",
      value: xFmt(moneyMultiple),
      accent: moneyMultiple >= 2 ? "#86EFAC" : moneyMultiple >= 1 ? "#FCD34D" : "#FCA5A5",
    },
    {
      icon: LineChart,
      label: "Total cash in",
      sub: "Day-0 + bleed years",
      value: dollarsK(totalCashIn),
      accent: "#F5F7FA",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        marginBottom: 24,
        borderRadius: 18,
        background: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset",
        padding: "22px 24px 20px",
      }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase",
          fontWeight: 700, color: "rgba(167,139,250,0.9)", marginBottom: 6,
        }}>
          Returns the spreadsheet kids ask for
        </div>
        <div style={{
          fontFamily: 'ui-serif, Georgia, serif',
          fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.2,
          color: "#F5F7FA",
        }}>
          Bring this to your accountant.
        </div>
      </div>

      <div className="returns-grid" style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
      }}>
        {tiles.map((t, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.34 }}
            style={{
              position: "relative",
              padding: "13px 14px 12px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
              fontWeight: 700, color: "rgba(245,247,250,0.5)", marginBottom: 8,
            }}>
              <t.icon size={11} strokeWidth={2.4} color={t.accent} />
              {t.label}
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, color: t.accent,
              letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
              marginBottom: 4,
            }}>{t.value}</div>
            <div style={{
              fontSize: 10.5, color: "rgba(245,247,250,0.42)",
              letterSpacing: "-0.005em", lineHeight: 1.4,
            }}>{t.sub}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
