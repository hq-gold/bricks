import React, { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, Share2, Copy, Check, Zap, MapPin, ChevronRight, ExternalLink } from "lucide-react";
import ConfettiBurst from "../components/ConfettiBurst.jsx";
import PageHero from "../components/PageHero.jsx";
import SocialShareButtons, { buildShareUrls } from "../components/SocialShareButtons.jsx";
import { SORT_OPTIONS } from "../components/SortToolbar.jsx";
import { getPropertyHeroImage, fmtPrice } from "../core/propertyImages.js";
import { getListingAgent } from "../data/demo-agencies.js";
import {
  generateCashflow,
  yearTurnsPositive,
  ngBenefitValue,
  fmt,
} from "../core/cashflow.js";
import { computeBricksScore } from "../scoring.js";
import { getSuburbStats } from "../suburbData.js";
import { createScoringEngine } from "../propertyInsights.js";
import { navigateTo } from "../routing.js";

const SCORE_ENGINE = createScoringEngine({
  generateCashflow,
  yearTurnsPositive,
  ngBenefitValue,
});

// Only show the cashflow brick when the sort is *directly* derived from
// the brick — otherwise it's just decoration that confuses the ranking.
const CASHFLOW_VISIBLE_SORTS = new Set(["positive", "holdingCost"]);

function bricksScore(property) {
  return computeBricksScore(property, getSuburbStats(property), SCORE_ENGINE).score;
}

function suburbSlug(name) {
  return name.split(",")[0].trim().toLowerCase().replace(/\s+/g, "-");
}

function suburbLabelFromSlug(slug, suburbs) {
  if (slug === "overall") return "All Australia";
  return suburbs.find(s => s.slug === slug)?.label || slug.replace(/-/g, " ");
}

/** Compact 30-year brick — taller cells, subtle gradient between cells. */
function MiniBrick({ cashflow, breakEven }) {
  if (!cashflow?.length) return null;
  const max = Math.max(...cashflow.map(Math.abs), 1);
  return (
    <div style={{
      display: "flex", gap: 1, alignItems: "stretch",
      padding: "3px 4px", borderRadius: 4,
      background: "rgba(0,0,0,0.28)",
      border: "1px solid rgba(255,255,255,0.05)",
    }}>
      {Array.from({ length: 30 }, (_, y) => {
        const v = cashflow.slice(y * 12, y * 12 + 12).reduce((s, x) => s + x, 0);
        const t = Math.min(1, Math.abs(v) / max);
        const positive = v >= 0;
        const bg = positive
          ? `linear-gradient(180deg, rgba(74,222,128,${0.85 + t * 0.1}) 0%, rgba(34,197,94,${0.55 + t * 0.35}) 100%)`
          : `linear-gradient(180deg, rgba(244,63,94,${0.85 + t * 0.1}) 0%, rgba(190,18,60,${0.55 + t * 0.35}) 100%)`;
        // Year where it turns positive gets a tiny notch on top
        const isBreakEven = breakEven && y + 1 === breakEven;
        return (
          <div key={y} style={{
            width: 4, height: 18, borderRadius: 1.5,
            background: bg, flexShrink: 0,
            boxShadow: isBreakEven ? "0 -2px 0 rgba(74,222,128,0.9)" : "none",
          }} />
        );
      })}
    </div>
  );
}

function sortProperties(arr, sortBy) {
  const copy = [...arr];
  if (sortBy === "positive") {
    copy.sort((a, b) => (yearTurnsPositive(generateCashflow(a)) ?? 99) - (yearTurnsPositive(generateCashflow(b)) ?? 99));
  } else if (sortBy === "taxbenefit") {
    copy.sort((a, b) => ngBenefitValue(b) - ngBenefitValue(a));
  } else if (sortBy === "holdingCost") {
    const bleed = (p) => generateCashflow(p).reduce((s, x) => s + (x < 0 ? -x : 0), 0);
    copy.sort((a, b) => bleed(a) - bleed(b));
  } else if (sortBy === "price-low") {
    copy.sort((a, b) => a.price - b.price);
  } else {
    copy.sort((a, b) => bricksScore(b) - bricksScore(a));
  }
  return copy;
}

function sortHighlight(property, sortBy) {
  const cf = generateCashflow(property);
  switch (sortBy) {
    case "positive": {
      const y = yearTurnsPositive(cf);
      return { main: y ? `Y${y}` : "Never", sub: "break-even" };
    }
    case "holdingCost": {
      const bleed = cf.reduce((s, x) => s + (x < 0 ? -x : 0), 0);
      return { main: fmt(bleed), sub: "total cost" };
    }
    case "taxbenefit": {
      const v = ngBenefitValue(property);
      return { main: fmt(Math.abs(v)), sub: "tax benefit" };
    }
    case "price-low":
      return { main: fmtPrice(property.price), sub: "guide" };
    default:
      return { main: String(bricksScore(property)), sub: "score" };
  }
}

function LeaderboardRow({ row, sortBy, showCashflow, onOpen, index, total }) {
  const hero = getPropertyHeroImage(row.property);
  const statColor = sortBy === "positive" && row.breakEven ? "#4ADE80" : "#F5F7FA";
  const isPodium = row.rank <= 3;
  const rankColor = row.rank === 1 ? "#FB7185" : row.rank === 2 ? "rgba(229,231,235,0.85)" : row.rank === 3 ? "#D97706" : "rgba(245,247,250,0.32)";

  return (
    <motion.button
      type="button"
      onClick={() => onOpen?.(row.property.id)}
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      whileTap={{ scale: 0.997 }}
      className="lb-row"
      style={{
        display: "grid",
        gridTemplateColumns: showCashflow
          ? "28px 56px minmax(0,1fr) auto auto 32px 16px"
          : "28px 56px minmax(0,1fr) auto 32px 16px",
        gap: 12, alignItems: "center",
        padding: "10px 14px",
        borderBottom: index === total - 1 ? "none" : "1px solid rgba(255,255,255,0.045)",
        background: row.rank === 1
          ? "linear-gradient(90deg, rgba(251,113,133,0.06) 0%, transparent 60%)"
          : "transparent",
        cursor: onOpen ? "pointer" : "default",
        border: "none", width: "100%", textAlign: "left",
        fontFamily: "inherit", color: "inherit",
        transition: "background 0.15s",
      }}
    >
      {/* Rank — serif, podium tinted */}
      <span style={{
        fontFamily: 'ui-serif, Georgia, serif',
        fontSize: isPodium ? 22 : 17, fontWeight: 500,
        textAlign: "center", color: rankColor,
        letterSpacing: "-0.03em", lineHeight: 1,
      }}>
        {row.rank}
      </span>

      {/* Photo — greyscale, consistent */}
      <div style={{
        width: 56, height: 42, borderRadius: 8, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "#15171F", flexShrink: 0,
      }}>
        <img src={hero} alt="" style={{
          width: "100%", height: "100%", objectFit: "cover",
          filter: "grayscale(1) contrast(0.95) brightness(0.88)",
        }} />
      </div>

      {/* Name + suburb · agency — sans, matches PropertyCard */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          color: "rgba(245,247,250,0.92)",
          fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          lineHeight: 1.2,
        }}>
          {row.property.name}
        </div>
        <div style={{
          color: "rgba(245,247,250,0.45)",
          fontSize: 11.5, marginTop: 3, letterSpacing: "-0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {row.property.suburb.split(",")[0]} · {row.agent.agency} · {fmtPrice(row.property.price)}
        </div>
      </div>

      {/* Cashflow brick — only when the sort is cashflow-derived */}
      {showCashflow && (
        <div style={{ display: "flex", alignItems: "center" }} className="lb-brick">
          <MiniBrick cashflow={row.cashflow} breakEven={row.breakEven} />
        </div>
      )}

      {/* Big stat — serif numeral */}
      <div style={{ textAlign: "right", minWidth: 56 }}>
        <div style={{
          fontFamily: 'ui-serif, Georgia, serif',
          fontSize: 19, fontWeight: 500,
          color: statColor, letterSpacing: "-0.025em", lineHeight: 1,
          whiteSpace: "nowrap",
        }}>
          {row.stat.main}
        </div>
        <div style={{
          fontSize: 9, color: "rgba(245,247,250,0.4)", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 3,
        }}>
          {row.stat.sub}
        </div>
      </div>

      {/* Agent avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: 999, overflow: "hidden",
        border: `1.5px solid ${row.agent.brand}55`, flexShrink: 0,
      }} title={row.agent.name}>
        <img src={row.agent.photo} alt={row.agent.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {/* Chevron — clear click-through cue */}
      <ChevronRight size={14} color="rgba(245,247,250,0.35)" strokeWidth={2.2} />
    </motion.button>
  );
}

export default function LeaderboardScreen({
  properties,
  initialSuburb = "overall",
  onBack,
  onOpenProperty,
}) {
  const [sortBy, setSortBy] = useState("positive");
  const [suburbSlugVal, setSuburbSlugVal] = useState(initialSuburb);
  const [confettiSeed, setConfettiSeed] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSuburbSlugVal(initialSuburb);
  }, [initialSuburb]);

  const publicProps = useMemo(
    () => properties.filter(p => !(p.agentPreview || p.source === "agent-preview") && p.status !== "owned"),
    [properties],
  );

  const suburbOptions = useMemo(() => {
    const seen = new Map();
    for (const p of publicProps) {
      const label = p.suburb.split(",")[0].trim();
      const slug = suburbSlug(p.suburb);
      if (!seen.has(slug)) seen.set(slug, label);
    }
    return [
      { slug: "overall", label: "All Australia" },
      ...[...seen.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([slug, label]) => ({ slug, label })),
    ];
  }, [publicProps]);

  const filtered = useMemo(() => {
    if (suburbSlugVal === "overall") return publicProps;
    return publicProps.filter(p => suburbSlug(p.suburb) === suburbSlugVal);
  }, [publicProps, suburbSlugVal]);

  const ranked = useMemo(() => {
    return sortProperties(filtered, sortBy).slice(0, 10).map((p, i) => ({
      property: p,
      rank: i + 1,
      agent: getListingAgent(p),
      cashflow: generateCashflow(p),
      breakEven: yearTurnsPositive(generateCashflow(p)),
      stat: sortHighlight(p, sortBy),
    }));
  }, [filtered, sortBy]);

  const suburbLabel = suburbLabelFromSlug(suburbSlugVal, suburbOptions);
  const sortLabel = SORT_OPTIONS.find(s => s.id === sortBy)?.label || "Ranked";
  const showCashflow = CASHFLOW_VISIBLE_SORTS.has(sortBy);

  const bumpConfetti = useCallback(() => {
    setConfettiSeed(s => s + 1);
  }, []);

  useEffect(() => { bumpConfetti(); }, []);

  const changeSuburb = (slug) => {
    setSuburbSlugVal(slug);
    navigateTo({ type: "leaderboard", suburb: slug });
    bumpConfetti();
  };

  const changeSort = (id) => {
    setSortBy(id);
    bumpConfetti();
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}#/leaderboard/${suburbSlugVal}` : "";
  const shareCaption = useMemo(() => [
    `The Bricks Leaderboard — ${suburbLabel}`,
    `Ranked by: ${sortLabel}`,
    ranked[0] ? `#1 ${ranked[0].property.name} (${ranked[0].agent.agency})` : null,
    ranked[1] ? `#2 ${ranked[1].property.name} (${ranked[1].agent.agency})` : null,
    ranked[2] ? `#3 ${ranked[2].property.name} (${ranked[2].agent.agency})` : null,
    ``,
    `Live listings ranked across 30 years of after-tax cashflow.`,
    shareUrl,
  ].filter(Boolean).join("\n"), [suburbLabel, sortLabel, ranked, shareUrl]);

  const openShare = (channel) => {
    if (channel === "instagram" || channel === "copy") {
      navigator.clipboard?.writeText(shareCaption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }
    const urls = buildShareUrls(shareCaption, shareUrl);
    if (urls[channel]) window.open(urls[channel], "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <ConfettiBurst seed={confettiSeed} intensity={1} />
      <PageHero height={620} />

      <div className="screen-content" style={{
        position: "relative", zIndex: 1,
        maxWidth: 880, margin: "0 auto",
        padding: "0 32px 64px",
      }}>
        {/* HERO — front-page rhythm */}
        <div className="leaderboard-hero" style={{
          marginTop: 96, marginBottom: 36,
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          {/* Eyebrow with hairline rules — matches Research */}
          <div style={{
            marginBottom: 22,
            display: "inline-flex", alignItems: "center", gap: 16,
          }}>
            <span style={{
              width: 40, height: 1,
              background: "linear-gradient(to right, transparent, rgba(245,247,250,0.28))",
            }} />
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase",
              color: "rgba(245,247,250,0.5)",
            }}>
              <Trophy size={12} strokeWidth={2.5} color="#FB7185" fill="#FB7185" />
              Live listings · Agency leaderboard
            </span>
            <span style={{
              width: 40, height: 1,
              background: "linear-gradient(to left, transparent, rgba(245,247,250,0.28))",
            }} />
          </div>

          {/* Headline — clear that these are LIVE LISTINGS */}
          <h1 className="leaderboard-h1" style={{
            margin: 0,
            fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
            fontSize: 60, fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1.07,
            color: "#F5F7FA",
            maxWidth: 820,
          }}>
            10 live listings,{" "}
            <span className="gradient-text" style={{
              fontStyle: "italic", fontWeight: 500,
              background: "linear-gradient(90deg, #FDE2E8 0%, #FB7185 48%, #FB923C 100%)",
              WebkitBackgroundClip: "text", backgroundClip: "text",
              WebkitTextFillColor: "transparent", color: "transparent",
            }}>
              ranked.
            </span>
          </h1>

          <p className="leaderboard-sub" style={{
            margin: "20px 0 0",
            fontSize: 19, fontWeight: 400, lineHeight: 1.5, letterSpacing: -0.005,
            color: "rgba(245,247,250,0.72)",
            maxWidth: 600,
          }}>
            Real listings from real agencies, modelled across 30 years of after-tax cashflow.
          </p>
        </div>

        {/* Glass control bar — bracket-row pattern from Research */}
        <div className="leaderboard-controls" style={{
          position: "relative", zIndex: 1, marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          flexWrap: "wrap",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 40px -16px rgba(0,0,0,0.6)",
            borderRadius: 999, padding: "5px 5px 5px 16px",
            display: "inline-flex", alignItems: "center", gap: 10,
          }}>
            <MapPin size={13} strokeWidth={2.2} color="#FB7185" />
            <select
              value={suburbSlugVal}
              onChange={(e) => changeSuburb(e.target.value)}
              style={{
                appearance: "none", cursor: "pointer",
                padding: "9px 32px 9px 4px", borderRadius: 999,
                background: "transparent", border: "none",
                color: "#F5F7FA", fontWeight: 700, fontSize: 13,
                fontFamily: "inherit", outline: "none",
                letterSpacing: "-0.01em",
              }}
            >
              {suburbOptions.map(s => (
                <option key={s.slug} value={s.slug} style={{ background: "#0B0E14" }}>{s.label}</option>
              ))}
            </select>
            <ChevronDown size={13} color="rgba(245,247,250,0.5)"
              style={{ marginLeft: -28, marginRight: 12, pointerEvents: "none" }} />
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "11px 16px", borderRadius: 999,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset",
            fontSize: 12, fontWeight: 600,
            color: "rgba(245,247,250,0.7)",
          }}>
            <span style={{
              display: "inline-block", width: 6, height: 6, borderRadius: 999,
              background: "#4ADE80", boxShadow: "0 0 8px rgba(74,222,128,0.7)",
            }} />
            {filtered.length} live now
          </div>
        </div>

        {/* Sort pills — bracket-pill style */}
        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", gap: 7, paddingBottom: 6, marginBottom: 22,
          justifyContent: "center", flexWrap: "wrap",
        }}>
          {SORT_OPTIONS.map(opt => {
            const active = sortBy === opt.id;
            const Icon = opt.icon;
            return (
              <button key={opt.id} type="button" onClick={() => changeSort(opt.id)}
                style={{
                  cursor: "pointer", borderRadius: 999,
                  padding: "9px 14px", fontSize: 12, fontWeight: active ? 700 : 600,
                  whiteSpace: "nowrap",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: active
                    ? "linear-gradient(135deg, rgba(244,63,94,0.22) 0%, rgba(244,63,94,0.10) 100%)"
                    : "rgba(255,255,255,0.04)",
                  color: active ? "#FECDD3" : "rgba(245,247,250,0.6)",
                  boxShadow: active
                    ? "0 1px 0 rgba(255,255,255,0.08) inset, 0 0 0 1px rgba(244,63,94,0.32) inset, 0 8px 24px -8px rgba(244,63,94,0.55)"
                    : "0 1px 0 rgba(255,255,255,0.06) inset",
                  border: active ? "none" : "1px solid rgba(255,255,255,0.10)",
                  transition: "all 0.22s",
                  letterSpacing: "-0.01em",
                }}>
                <Icon size={12} strokeWidth={2.2} color={active ? "#FB7185" : "currentColor"} />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* THE TABLE — compact, screenshot-friendly, all 10 in one frame */}
        {ranked.length === 0 ? (
          <div style={{
            padding: 48, textAlign: "center", borderRadius: 18,
            background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(245,247,250,0.5)", fontSize: 14,
          }}>
            No live listings in this suburb yet.
          </div>
        ) : (
          <motion.div
            id="leaderboard-capture"
            layout
            style={{
              borderRadius: 18, overflow: "hidden",
              background: "rgba(11,14,20,0.82)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 32px 80px -28px rgba(0,0,0,0.75)",
            }}
          >
            {/* Table header — slim, all-caps, sticky-feel */}
            <div style={{
              padding: "11px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "grid",
              gridTemplateColumns: showCashflow
                ? "28px 56px minmax(0,1fr) auto auto 32px 16px"
                : "28px 56px minmax(0,1fr) auto 32px 16px",
              gap: 12, alignItems: "center",
              fontSize: 9.5, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "rgba(245,247,250,0.38)",
            }}>
              <span style={{ textAlign: "center" }}>#</span>
              <span></span>
              <span style={{ minWidth: 0 }}>Listing in {suburbLabel}</span>
              {showCashflow && <span>30-yr cashflow</span>}
              <span style={{ textAlign: "right", minWidth: 56 }}>{sortLabel}</span>
              <span></span>
              <span></span>
            </div>

            <AnimatePresence mode="popLayout">
              {ranked.map((row, i) => (
                <LeaderboardRow
                  key={`${row.property.id}-${sortBy}-${suburbSlugVal}`}
                  row={row}
                  sortBy={sortBy}
                  showCashflow={showCashflow}
                  onOpen={onOpenProperty}
                  index={i}
                  total={ranked.length}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Compact inline share strip — single row, no heavy framing */}
        <div className="leaderboard-share" style={{
          marginTop: 20,
          padding: "10px 14px 10px 16px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", gap: 12,
          flexWrap: "wrap",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            fontSize: 12, fontWeight: 600, color: "rgba(245,247,250,0.65)",
            letterSpacing: "-0.01em",
          }}>
            <Share2 size={13} color="#FB7185" />
            Share leaderboard
          </div>
          <div style={{
            flex: 1, minWidth: 200,
            display: "flex", justifyContent: "flex-end", flexWrap: "wrap",
          }}>
            <SocialShareButtons onShare={openShare} layout="inline" compact />
          </div>
          <button type="button" onClick={() => openShare("copy")}
            className="lb-copy-btn"
            style={{
              cursor: "pointer", padding: "8px 12px", borderRadius: 10,
              background: copied ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)",
              border: copied ? "1px solid rgba(74,222,128,0.35)" : "1px solid rgba(255,255,255,0.10)",
              color: copied ? "#86EFAC" : "rgba(245,247,250,0.78)",
              fontWeight: 600, fontSize: 12, letterSpacing: "-0.01em",
              display: "inline-flex", alignItems: "center", gap: 6,
              whiteSpace: "nowrap",
              transition: "all 0.18s",
            }}>
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy caption</>}
          </button>
        </div>

        {onBack && (
          <button type="button" onClick={onBack}
            style={{
              marginTop: 24, background: "none", border: "none", cursor: "pointer",
              color: "rgba(245,247,250,0.4)", fontSize: 13, fontWeight: 600,
              display: "block", marginLeft: "auto", marginRight: "auto",
              letterSpacing: "-0.01em",
            }}>
            ← Back to Research
          </button>
        )}
      </div>

      <style>{`
        .lb-row:hover {
          background: rgba(251,113,133,0.05) !important;
        }
        .lb-row:hover svg:last-child {
          color: #FB7185 !important;
          transform: translateX(2px);
        }
        .lb-row svg:last-child { transition: transform 0.15s, color 0.15s; }
        @media (max-width: 720px) {
          .leaderboard-h1 { font-size: clamp(34px, 7vw, 48px) !important; }
          .leaderboard-sub { font-size: 16px !important; margin-top: 16px !important; }
          .leaderboard-hero { margin-top: 72px !important; margin-bottom: 28px !important; }
        }
        @media (max-width: 600px) {
          .lb-brick { display: none !important; }
        }
      `}</style>
    </div>
  );
}
