/**
 * Shared sort lens used by Research (list + map). The "Fastest to break-even"
 * default is what makes the Research page feel different from every other
 * property site — it's a lens for the cashflow engine, not just price.
 */
import React from "react";
import { Zap, Star, TrendingUp, Shield, ArrowRight } from "lucide-react";
import {
  fmt,
  generateCashflow,
  yearTurnsPositive,
  ngBenefitValue,
} from "../core/cashflow.js";

export const SORT_OPTIONS = [
  {
    id: "positive",
    label: "Fastest to break-even",
    short: "FASTEST",
    icon: Zap,
    reason: (p) => {
      const y = yearTurnsPositive(generateCashflow(p));
      return y ? `Positive year ${y}` : "Never positive";
    },
  },
  {
    id: "score",
    label: "Best all-rounder",
    short: "ALL-ROUNDER",
    icon: Star,
    reason: (p) => {
      const y = yearTurnsPositive(generateCashflow(p));
      return y ? `Breaks even year ${y}` : "Long break-even";
    },
  },
  {
    id: "holdingCost",
    label: "Costs you least",
    short: "COSTS LEAST",
    icon: TrendingUp,
    reason: (p) => {
      const cf = generateCashflow(p);
      const bleed = cf.reduce((s, x) => s + (x < 0 ? -x : 0), 0);
      return `${fmt(bleed)} total out-of-pocket`;
    },
  },
  {
    id: "taxbenefit",
    label: "Best tax position",
    short: "BEST TAX",
    icon: Shield,
    reason: (p) => `${fmt(Math.abs(ngBenefitValue(p)))} in tax benefits`,
  },
  {
    id: "price-low",
    label: "Lowest price",
    short: "LOWEST PRICE",
    icon: ArrowRight,
    reason: (p) => `${fmt(p.price)} entry`,
  },
];

export function SortToolbar({ sortBy, onSortBy }) {
  return (
    <div className="sort-row" style={{
      display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap",
    }}>
      <div className="sort-segment" style={{
        display: "inline-flex", alignItems: "center", gap: 2,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset",
        borderRadius: 999, padding: 4,
      }}>
        {SORT_OPTIONS.map(s => {
          const active = sortBy === s.id;
          const SortIcon = s.icon;
          return (
            <button key={s.id} onClick={() => onSortBy(s.id)}
              className={active ? "sort-btn sort-btn-active" : "sort-btn"}
              style={{
                position: "relative",
                background: active
                  ? "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)"
                  : "transparent",
                color: active ? "#FFFFFF" : "rgba(245,247,250,0.6)",
                border: "none",
                borderRadius: 999, padding: "9px 15px",
                fontSize: 13, fontWeight: active ? 700 : 500, letterSpacing: -0.05,
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "background 0.2s, color 0.2s",
                display: "inline-flex", alignItems: "center", gap: 6,
                boxShadow: active
                  ? "0 1px 0 rgba(255,255,255,0.22) inset, 0 6px 18px -6px rgba(244,63,94,0.9)"
                  : "none",
              }}>
              <SortIcon size={13} strokeWidth={active ? 2.6 : 2}
                color={active ? "#FFFFFF" : "rgba(245,247,250,0.45)"} />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
