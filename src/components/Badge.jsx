import React from "react";
import { Star, Zap, Shield, TrendingUp, AlertCircle, Award } from "lucide-react";

const TIER_STYLES = {
  gold: {
    bg: "linear-gradient(145deg, rgba(251,113,133,0.24) 0%, rgba(251,113,133,0.06) 100%)",
    border: "rgba(251,113,133,0.38)",
    color: "#FECDD3",
    glow: "0 8px 32px -12px rgba(244,63,94,0.3)",
  },
  rose: {
    bg: "linear-gradient(145deg, rgba(251,113,133,0.18) 0%, rgba(251,113,133,0.05) 100%)",
    border: "rgba(251,113,133,0.32)",
    color: "#FECDD3",
    glow: "0 8px 28px -14px rgba(251,113,133,0.25)",
  },
  white: {
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.1)",
    color: "#C5CAD6",
    glow: "none",
  },
};

function BadgeIcon({ id, size }) {
  const s = size || 11;
  if (id?.includes("top") || id?.includes("grade")) return <Star size={s} strokeWidth={2.4} fill="currentColor" />;
  if (id?.includes("cashflow") || id?.includes("fast")) return <Zap size={s} strokeWidth={2.4} />;
  if (id?.includes("new-build")) return <Shield size={s} strokeWidth={2.4} />;
  if (id?.includes("yield")) return <TrendingUp size={s} strokeWidth={2.4} />;
  if (id?.includes("cliff")) return <AlertCircle size={s} strokeWidth={2.4} />;
  return <Award size={s} strokeWidth={2.2} />;
}

/** Compact pill — detail shelf & reports only; not for browse cards */
export function Badge({ badge, compact, medal }) {
  const tier = TIER_STYLES[badge.tier] || TIER_STYLES.white;

  if (medal) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 14,
          background: tier.bg,
          border: `1px solid ${tier.border}`,
          boxShadow: tier.glow,
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: "rgba(0,0,0,0.25)",
          border: `1px solid ${tier.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: badge.color || tier.color,
        }}>
          <BadgeIcon id={badge.id} size={18} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            color: badge.color || tier.color,
            fontSize: 14, fontWeight: 700, letterSpacing: -0.02, lineHeight: 1.25,
          }}>
            {badge.label}
          </div>
        </div>
      </div>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 4 : 6,
        padding: compact ? "3px 8px" : "5px 10px",
        borderRadius: 999,
        background: tier.bg,
        border: `1px solid ${tier.border}`,
        color: badge.color || tier.color,
        fontSize: compact ? 9 : 10,
        fontWeight: 700,
        letterSpacing: 0.15,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      <BadgeIcon id={badge.id} size={compact ? 9 : 11} />
      {badge.label}
    </span>
  );
}

export function BadgeRow({ badges, max = 3, compact, medal }) {
  if (!badges?.length) return null;
  if (medal) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {badges.slice(0, max).map(b => (
          <Badge key={b.id} badge={b} medal />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? 4 : 6 }}>
      {badges.slice(0, max).map(b => (
        <Badge key={b.id} badge={b} compact={compact} />
      ))}
    </div>
  );
}

/** Score without SOLID / WATCH / TOP PICK tier labels */
export function ScoreNumber({ score, size = "md" }) {
  const fontSize = size === "lg" ? 48 : size === "sm" ? 18 : 28;
  return (
    <span style={{
      fontFamily: 'ui-serif, Georgia, serif',
      fontSize,
      fontWeight: 600,
      letterSpacing: "-0.04em",
      color: "#F5F7FA",
      lineHeight: 1,
    }}>
      {score}
    </span>
  );
}

/** @deprecated Use ScoreNumber — tier labels removed from UI */
export function ScorePill({ score }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "baseline", gap: 4,
      padding: "4px 0",
    }}>
      <ScoreNumber score={score} size="sm" />
      <span style={{ fontSize: 10, color: "#5C6477", fontWeight: 600 }}>grade</span>
    </div>
  );
}

/** Detail page — achievements shelf */
export function BadgeShelf({ badges, score, suburbRank, suburbTotal }) {
  if (!badges?.length && score == null) return null;
  return (
    <div style={{
      marginBottom: 28,
      padding: "22px 24px",
      borderRadius: 20,
      background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
    }}>
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16, marginBottom: badges.length ? 18 : 0,
      }}>
        <div>
          <div style={{
            fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
            color: "#FB7185", fontWeight: 600, marginBottom: 6,
          }}>
            How this property stacks up
          </div>
          {score != null && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <ScoreNumber score={score} size="lg" />
              <span style={{ fontSize: 13, color: "rgba(245,247,250,0.45)", fontWeight: 500 }}>
                overall score
              </span>
            </div>
          )}
        </div>
        {suburbRank != null && suburbTotal > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontFamily: 'ui-serif, Georgia, serif', fontSize: 28, fontWeight: 500,
              color: "#FB7185", letterSpacing: "-0.03em", lineHeight: 1,
            }}>
              #{suburbRank}
            </div>
            <div style={{ fontSize: 12, color: "rgba(245,247,250,0.45)", marginTop: 4 }}>
              of {suburbTotal} in suburb
            </div>
          </div>
        )}
      </div>
      {badges.length > 0 && <BadgeRow badges={badges} max={6} medal />}
    </div>
  );
}
