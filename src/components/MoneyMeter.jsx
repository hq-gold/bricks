import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Banknote } from "lucide-react";

// "Where every dollar of rent actually goes" — a horizontal stacked breakdown.
// Designed to be visceral and screenshot-friendly. We use month 13 (start of
// year 2) so the picture is stable past any first-year noise.
//
// Inputs expected: monthlyDetail array from generateScenario, plus the build
// label for human framing.

function fmtFull(n) {
  return `$${Math.round(Math.abs(n)).toLocaleString()}`;
}

export default function MoneyMeter({ monthlyDetail, build, marginalRate }) {
  // We average months 13-24 (year 2) so rent growth and depreciation have
  // settled into a representative rhythm — year 1 includes month-0 fees.
  const avg = useMemo(() => {
    if (!monthlyDetail?.length) return null;
    const slice = monthlyDetail.slice(12, 24);
    if (slice.length === 0) return null;
    const sum = slice.reduce((acc, m) => ({
      rent: acc.rent + m.rent,
      interest: acc.interest + m.interest,
      principal: acc.principal + m.principal,
      cashCosts: acc.cashCosts + m.cashCosts,
      taxBenefit: acc.taxBenefit + m.taxBenefit,
      taxOwed: acc.taxOwed + m.taxOwed,
    }), { rent: 0, interest: 0, principal: 0, cashCosts: 0, taxBenefit: 0, taxOwed: 0 });
    const n = slice.length;
    return {
      rent: sum.rent / n,
      interest: sum.interest / n,
      principal: sum.principal / n,
      cashCosts: sum.cashCosts / n,
      taxBenefit: sum.taxBenefit / n,
      taxOwed: sum.taxOwed / n,
    };
  }, [monthlyDetail]);

  if (!avg) return null;

  const rent = avg.rent;
  // Net "what's left" — what actually hits the user's pocket each month.
  const net = rent - avg.interest - avg.principal - avg.cashCosts + avg.taxBenefit - avg.taxOwed;

  // Visual stack: we use absolute outflow totals against the rent inflow.
  // When tax benefit > 0 it adds to the user's pocket so we show it as a
  // separate "in" lane on the right.
  const outflows = [
    { id: "interest", label: "Mortgage interest", amount: avg.interest, color: "#F87171", glow: "rgba(248,113,113,0.22)" },
    avg.principal > 0 && { id: "principal", label: "Principal paydown", amount: avg.principal, color: "#FB923C", glow: "rgba(251,146,60,0.22)" },
    { id: "costs", label: "Costs · rates · strata · mgmt", amount: avg.cashCosts, color: "#FACC15", glow: "rgba(250,204,21,0.22)" },
    avg.taxOwed > 0 && { id: "tax", label: "Tax owed", amount: avg.taxOwed, color: "#A78BFA", glow: "rgba(167,139,250,0.22)" },
  ].filter(Boolean);

  const totalOut = outflows.reduce((s, o) => s + o.amount, 0);
  const totalIn = rent + Math.max(0, avg.taxBenefit);

  // Bar segments scale against the bigger of (total in, total out + |net negative|)
  // so the bar always reads as 100%.
  const scale = Math.max(totalIn, totalOut + Math.max(0, -net));
  const pct = (n) => (n / scale) * 100;

  const isPocketPositive = net >= 0;

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
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 7,
          background: "rgba(245,158,11,0.16)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Banknote size={12} color="#FACC15" strokeWidth={2.4} />
        </div>
        <div style={{
          fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase",
          fontWeight: 700, color: "rgba(250,204,21,0.9)",
        }}>Where every dollar goes</div>
      </div>
      <div style={{
        fontFamily: 'ui-serif, Georgia, serif',
        fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.2,
        color: "#F5F7FA", marginBottom: 4,
      }}>
        Year 2 — every {fmtFull(rent)} of rent
      </div>
      <div style={{
        fontSize: 12.5, color: "rgba(245,247,250,0.55)", marginBottom: 18,
      }}>
        After interest, costs, and {Math.round(marginalRate * 100)}% tax effects, you {isPocketPositive ? "pocket" : "still write a cheque for"}{" "}
        <strong style={{ color: isPocketPositive ? "#86EFAC" : "#FCA5A5" }}>{fmtFull(net)}</strong> per month.
      </div>

      {/* Inflow bar — rent comes in (+ tax refund if any) */}
      <div style={{ marginBottom: 14 }}>
        <Row label="Rent collected" amount={rent} color="#34D399" pct={pct(rent)} glow="rgba(52,211,153,0.22)" lead />
        {avg.taxBenefit > 0 && (
          <Row label="Negative gearing refund" amount={avg.taxBenefit} color="#60A5FA" pct={pct(avg.taxBenefit)} glow="rgba(96,165,250,0.22)" lead />
        )}
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "10px 0 14px" }} />

      <div>
        {outflows.map(o => (
          <Row key={o.id} label={o.label} amount={o.amount} color={o.color} pct={pct(o.amount)} glow={o.glow} />
        ))}
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0 12px" }} />

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderRadius: 11,
        background: isPocketPositive
          ? "linear-gradient(135deg, rgba(74,222,128,0.16) 0%, rgba(74,222,128,0.04) 100%)"
          : "linear-gradient(135deg, rgba(248,113,113,0.14) 0%, rgba(248,113,113,0.03) 100%)",
        border: `1px solid ${isPocketPositive ? "rgba(74,222,128,0.30)" : "rgba(248,113,113,0.28)"}`,
      }}>
        <div style={{
          fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
          fontWeight: 700, color: isPocketPositive ? "#86EFAC" : "#FCA5A5",
        }}>
          {isPocketPositive ? "Lands in your pocket" : "You cover the gap"}
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700, color: isPocketPositive ? "#86EFAC" : "#FCA5A5",
          letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
        }}>
          {net >= 0 ? "+" : "−"}{fmtFull(net)}
          <span style={{ fontSize: 11, color: "rgba(245,247,250,0.45)", marginLeft: 5, fontWeight: 500 }}>/mo</span>
        </div>
      </div>

      <div style={{
        marginTop: 12, fontSize: 11, color: "rgba(245,247,250,0.35)", lineHeight: 1.5,
      }}>
        Stable year-2 average. Drag any slider above and this updates with you.
      </div>
    </motion.div>
  );
}

function Row({ label, amount, color, pct, glow, lead }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: 12.5, color: "rgba(245,247,250,0.72)", fontWeight: 500,
          letterSpacing: "-0.005em",
          display: "inline-flex", alignItems: "center", gap: 7,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 999, background: color,
            boxShadow: `0 0 8px ${glow}`,
          }} />
          {label}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700, color: lead ? color : "rgba(245,247,250,0.85)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {lead ? "+" : "−"}{fmtFull(amount)}
        </span>
      </div>
      <div style={{
        height: 5, borderRadius: 999, overflow: "hidden",
        background: "rgba(255,255,255,0.04)",
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: "100%",
            background: `linear-gradient(90deg, ${color} 0%, ${color}99 100%)`,
            boxShadow: `0 0 12px ${glow}`,
          }}
        />
      </div>
    </div>
  );
}
