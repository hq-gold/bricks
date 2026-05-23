import React, { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronRight, Lock, Phone, Mail, Zap, Share2, Printer, ExternalLink } from "lucide-react";
import PageHero from "../components/PageHero.jsx";
import { DEMO_AGENT } from "../data/demo-agent.js";
import { CATHERINE_DIXON } from "../data/catherine-dixon.js";
import { getPropertyInsights } from "../propertyInsights.js";
import { generateCashflow, yearTurnsPositive } from "../core/cashflow.js";
import { getPropertyHeroImage, fmtPrice } from "../core/propertyImages.js";
import AgentShareHub from "../components/AgentShareHub.jsx";
import { AgentAvatar } from "../components/AgentShareChrome.jsx";
import { navigateTo } from "../routing.js";
import { printVendorProspect } from "../utils/vendorProspectPrint.js";

/* ----- shared bits ---------------------------------------------------- */

function SectionHeader({ badge, title, accentLine, description, accent = "#FB7185" }) {
  const eyebrowColor = accent === "#4ADE80" ? "#86EFAC" : "#FECDD3";
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 12,
        marginBottom: 14,
      }}>
        <span style={{
          width: 32, height: 1,
          background: `linear-gradient(to right, transparent, ${accent}66)`,
        }} />
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "6px 12px", borderRadius: 999,
          background: `${accent}18`, border: `1px solid ${accent}40`,
          fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase",
          color: eyebrowColor,
        }}>
          {badge}
        </span>
      </div>
      <h2 style={{
        margin: "0 0 10px",
        fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
        fontSize: "clamp(26px, 4vw, 36px)",
        fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1.1, color: "#F5F7FA",
        maxWidth: 700,
      }}>
        {title}{" "}
        {accentLine && (
          <span className="gradient-text" style={{
            fontStyle: "italic", fontWeight: 500,
            background: "linear-gradient(90deg, #FDE2E8 0%, #FB7185 50%, #FB923C 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text",
            WebkitTextFillColor: "transparent", color: "transparent",
          }}>
            {accentLine}
          </span>
        )}
      </h2>
      <p style={{
        margin: 0, fontSize: 15.5, color: "rgba(245,247,250,0.55)",
        lineHeight: 1.6, maxWidth: 640,
      }}>
        {description}
      </p>
    </div>
  );
}

/** 30-year brick row — same DNA as the cashflow grid, smaller. */
function MiniBrickStrip({ cashflow, breakEven, size = "md" }) {
  if (!cashflow?.length) return null;
  const max = Math.max(...cashflow.map(Math.abs), 1);
  const cellW = size === "lg" ? 5 : 4;
  const cellH = size === "lg" ? 22 : 14;
  const gap = size === "lg" ? 2 : 1.5;
  return (
    <div>
      <div style={{
        fontSize: size === "lg" ? 11 : 10, fontWeight: 700, marginBottom: 7,
        color: breakEven ? "#4ADE80" : "#F87171",
      }}>
        {breakEven ? `Pays back from year ${breakEven}` : "No payback in 30 years"}
      </div>
      <div style={{ display: "flex", gap }}>
        {Array.from({ length: 30 }, (_, y) => {
          const v = cashflow.slice(y * 12, y * 12 + 12).reduce((s, x) => s + x, 0);
          const t = Math.min(1, Math.abs(v) / max);
          const bg = v >= 0
            ? `rgba(34,197,94,${0.4 + t * 0.5})`
            : `rgba(244,63,94,${0.4 + t * 0.5})`;
          return (
            <div key={y} style={{
              width: cellW, height: cellH, borderRadius: 1.5,
              background: bg, flexShrink: 0,
            }} />
          );
        })}
      </div>
    </div>
  );
}

/** Listing card — uniform, photo-left, with a clear "View full listing" CTA. */
function ListingCard({ row, accent, onOpen, primaryAction, secondaryAction, isLast }) {
  const p = row.property;
  const hero = getPropertyHeroImage(p);
  const cf = generateCashflow(p);
  const be = yearTurnsPositive(cf);
  const liveRank = row.liveMarketInsights;
  const topBadge = row.insights.badges[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      style={{
        borderRadius: 18, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.025)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -28px rgba(0,0,0,0.6)",
        marginBottom: isLast ? 0 : 12,
      }}
      className="agent-listing-row"
    >
      <div className="agent-listing-row-grid" style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: 0,
      }}>
        <button type="button" onClick={() => onOpen(p.id)}
          className="agent-listing-photo"
          style={{
            position: "relative", padding: 0, border: "none", cursor: "pointer",
            background: "#15171F", textAlign: "left",
            minHeight: 180,
          }}>
          <img src={hero} alt={p.name}
            style={{
              width: "100%", height: "100%", objectFit: "cover", display: "block",
              filter: "grayscale(0.18) contrast(1.04)",
              minHeight: 180,
            }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to right, transparent 60%, rgba(5,7,10,0.5) 100%)",
          }} />
          <div style={{
            position: "absolute", top: 12, left: 14,
            fontFamily: 'ui-serif, Georgia, serif',
            fontSize: 32, fontWeight: 500, lineHeight: 1,
            color: "rgba(245,247,250,0.4)",
            letterSpacing: "-0.04em",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          }}>
            {row.rank}
          </div>
        </button>

        <div style={{ padding: "18px 22px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16 }}>
          <button type="button" onClick={() => onOpen(p.id)}
            style={{
              cursor: "pointer", textAlign: "left", background: "none", border: "none",
              padding: 0, minWidth: 0, color: "inherit",
            }}>
            <div style={{
              fontFamily: 'ui-serif, Georgia, serif',
              fontSize: 19, fontWeight: 500,
              color: "#F5F7FA", letterSpacing: "-0.02em", lineHeight: 1.15,
            }}>
              {p.name}
            </div>
            <div style={{ fontSize: 13, color: "rgba(245,247,250,0.5)", marginTop: 5 }}>
              {p.suburb} · Guide {fmtPrice(p.price)}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {liveRank?.suburbRank != null && liveRank.suburbTotal > 0 && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 999,
                  background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.25)",
                  fontSize: 11, fontWeight: 700, color: "#FECDD3",
                }}>
                  <Zap size={10} fill="#FB7185" color="#FB7185" />
                  #{liveRank.suburbRank} of {liveRank.suburbTotal} live
                </div>
              )}
              {topBadge && (
                <div style={{
                  fontSize: 10, fontWeight: 600, color: "rgba(251,113,133,0.85)",
                  padding: "5px 9px", borderRadius: 999,
                  background: "rgba(251,113,133,0.08)",
                  border: "1px solid rgba(251,113,133,0.18)",
                  letterSpacing: "0.04em",
                }}>
                  {topBadge.label}
                </div>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <MiniBrickStrip cashflow={cf} breakEven={be} />
            </div>
          </button>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {primaryAction && (
              <motion.button
                type="button" whileTap={{ scale: 0.98 }}
                onClick={(e) => { e.stopPropagation(); primaryAction.onClick(row); }}
                style={{
                  cursor: "pointer", padding: "10px 14px", borderRadius: 10,
                  background: "linear-gradient(135deg, rgba(251,113,133,0.22) 0%, rgba(251,113,133,0.08) 100%)",
                  border: "1px solid rgba(251,113,133,0.35)",
                  color: "#FECDD3",
                  fontWeight: 700, fontSize: 12.5,
                  display: "inline-flex", alignItems: "center", gap: 6,
                  boxShadow: "0 8px 22px -10px rgba(244,63,94,0.5)",
                }}>
                {primaryAction.icon}
                {primaryAction.label}
              </motion.button>
            )}
            {secondaryAction && (
              <motion.button
                type="button" whileTap={{ scale: 0.98 }}
                onClick={(e) => { e.stopPropagation(); secondaryAction.onClick(row); }}
                style={{
                  cursor: "pointer", padding: "10px 14px", borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(245,247,250,0.85)", fontWeight: 600, fontSize: 12.5,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                {secondaryAction.icon}
                {secondaryAction.label}
              </motion.button>
            )}
            <motion.button
              type="button" whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); onOpen(p.id); }}
              className="agent-view-listing"
              style={{
                cursor: "pointer", padding: "10px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "#F5F7FA",
                fontWeight: 700, fontSize: 12.5,
                display: "inline-flex", alignItems: "center", gap: 6,
                marginLeft: "auto",
                letterSpacing: "-0.01em",
              }}>
              <ExternalLink size={12} strokeWidth={2.2} />
              View full listing
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Rank a property against only what's live on The Bricks. */
function getLiveMarketInsights(property, allProperties, engine) {
  const livePool = allProperties.filter(
    p => !(p.agentPreview || p.source === "agent-preview") && p.status !== "owned",
  );
  const pool = livePool.some(x => x.id === property.id) ? livePool : [...livePool, property];
  return getPropertyInsights(property, pool, engine);
}

/* ----- main screen ---------------------------------------------------- */

export default function AgentPreviewScreen({
  properties,
  engine,
  onOpenProperty,
}) {
  const agent = CATHERINE_DIXON;
  const [shareRow, setShareRow] = useState(null);
  const [shareMode, setShareMode] = useState("prospect");

  const liveListings = useMemo(
    () => properties.filter(p => p.agentLive && !p.agentPreview && p.source !== "agent-preview"),
    [properties],
  );

  const vendorProspects = useMemo(
    () => properties.filter(p => p.source === "agent-preview" || p.agentPreview),
    [properties],
  );

  const rankRows = useCallback((pool) => {
    return pool
      .map(p => ({
        property: p,
        insights: getPropertyInsights(p, properties, engine),
        liveMarketInsights: getLiveMarketInsights(p, properties, engine),
      }))
      .sort((a, b) => b.insights.score - a.insights.score)
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }, [properties, engine]);

  const rankedLive = useMemo(() => rankRows(liveListings), [liveListings, rankRows]);
  const rankedProspects = useMemo(() => rankRows(vendorProspects), [vendorProspects, rankRows]);

  const shareProperty = shareRow?.property;
  const shareInsights = shareRow?.insights;
  const shareLiveMarket = shareRow?.liveMarketInsights;
  const shareCashflow = useMemo(
    () => (shareProperty ? generateCashflow(shareProperty) : null),
    [shareProperty],
  );
  const shareBreakEven = useMemo(
    () => (shareCashflow ? yearTurnsPositive(shareCashflow) : null),
    [shareCashflow],
  );
  const shareWealth = useMemo(() => {
    if (!shareProperty || !shareCashflow) return { w10: null, w30: null };
    const loan0 = shareProperty.price * 0.8;
    const gr = (shareProperty.growthPct || 5) / 100;
    let cum = 0;
    const eq = [];
    for (let y = 1; y <= 30; y++) {
      cum += shareCashflow.slice((y - 1) * 12, y * 12).reduce((s, x) => s + x, 0);
      eq.push(Math.round(shareProperty.price * Math.pow(1 + gr, y) - loan0 + cum));
    }
    return { w10: eq[9], w30: eq[29] };
  }, [shareProperty, shareCashflow]);

  const openShare = (row, mode) => {
    setShareMode(mode);
    setShareRow(row);
  };

  const handlePrintProspect = useCallback((row) => {
    const p = row.property;
    const cf = generateCashflow(p);
    const be = yearTurnsPositive(cf);
    const gr = (p.growthPct || 5) / 100;
    const loan0 = p.price * 0.8;
    let cum = 0;
    const eq = [];
    for (let y = 1; y <= 30; y++) {
      cum += cf.slice((y - 1) * 12, y * 12).reduce((s, x) => s + x, 0);
      eq.push(Math.round(p.price * Math.pow(1 + gr, y) - loan0 + cum));
    }
    printVendorProspect({
      property: p,
      agent,
      marketRank: row.liveMarketInsights?.suburbRank,
      marketTotal: row.liveMarketInsights?.suburbTotal,
      breakEven: be,
      wealth10: eq[9],
      wealth30: eq[29],
      previewUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      suburb: p.suburb?.split(",")[0],
    });
  }, [agent]);

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 56px)" }}>
      <PageHero height={520} />

      <div className="screen-content" style={{
        position: "relative", zIndex: 1,
        maxWidth: 940, margin: "0 auto",
        padding: "0 32px 110px",
      }}>
        {/* HERO — front-page rhythm */}
        <div className="agent-preview-hero" style={{
          paddingTop: 88, marginBottom: 48,
        }}>
          {/* Eyebrow with hairline rules */}
          <div style={{
            marginBottom: 22,
            display: "inline-flex", alignItems: "center", gap: 14,
          }}>
            <span style={{
              width: 32, height: 1,
              background: "linear-gradient(to right, transparent, rgba(245,247,250,0.28))",
            }} />
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "6px 13px", borderRadius: 999,
              background: "linear-gradient(135deg, rgba(244,63,94,0.14) 0%, rgba(244,63,94,0.04) 100%)",
              border: "1px solid rgba(244,63,94,0.28)",
              fontSize: 10.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase",
              color: "#FECDD3",
            }}>
              <Lock size={11} strokeWidth={2.5} color="#FB7185" />
              Private agent workspace
            </span>
          </div>

          {/* Big serif headline matching front-page rhythm */}
          <h1 className="agent-preview-h1" style={{
            margin: "0 0 18px",
            fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
            fontSize: "clamp(38px, 5.5vw, 56px)",
            fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1.06,
            color: "#F5F7FA",
            maxWidth: 760,
          }}>
            Your private workspace,{" "}
            <span className="gradient-text" style={{
              fontStyle: "italic", fontWeight: 500,
              background: "linear-gradient(90deg, #FDE2E8 0%, #FB7185 50%, #FB923C 100%)",
              WebkitBackgroundClip: "text", backgroundClip: "text",
              WebkitTextFillColor: "transparent", color: "transparent",
            }}>
              {agent.name.split(" ")[0]}.
            </span>
          </h1>

          <p className="agent-preview-sub" style={{
            margin: "0 0 28px",
            fontSize: 18, lineHeight: 1.55, letterSpacing: -0.005,
            color: "rgba(245,247,250,0.72)", maxWidth: 640,
          }}>
            Two tools, two audiences. <strong style={{ color: "#F5F7FA", fontWeight: 600 }}>Live listings</strong> are
            on The Bricks now — share the 30-year model on social to reach buyers.
            <strong style={{ color: "#F5F7FA", fontWeight: 600 }}> Vendor prospects</strong> are homes you&apos;re
            pitching to owners — show them where their property would rank.
          </p>

          {/* Agent identity card — richer treatment */}
          <div className="agent-id-card" style={{
            padding: "20px 22px",
            borderRadius: 20,
            background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(251,113,133,0.04) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 60px -24px rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", gap: 18,
            flexWrap: "wrap",
          }}>
            <AgentAvatar agent={agent} size={72} radius={18} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif',
                fontSize: 22, fontWeight: 500, color: "#F5F7FA",
                letterSpacing: "-0.02em", lineHeight: 1.15,
              }}>
                {agent.name}
              </div>
              <div style={{ marginTop: 3, fontSize: 13, color: "rgba(245,247,250,0.55)", fontWeight: 500 }}>
                {agent.agency}
              </div>
            </div>
            <div style={{
              display: "flex", flexDirection: "column", gap: 7,
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              paddingLeft: 18,
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "rgba(245,247,250,0.62)", fontWeight: 500 }}>
                <Phone size={12} strokeWidth={2.2} color="#FB7185" />
                {agent.phone}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "rgba(245,247,250,0.62)", fontWeight: 500 }}>
                <Mail size={12} strokeWidth={2.2} color="#FB7185" />
                {agent.email}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1 — Live listings */}
        <div style={{ marginBottom: 56 }}>
          <SectionHeader
            badge="Section 1 · Live listings"
            title="On The Bricks"
            accentLine="right now"
            description="These are your real, live listings. Share the 30-year cashflow model on social to attract investor-buyers. Each share links back to the live listing page."
            accent="#4ADE80"
          />
          {rankedLive.length === 0 ? (
            <div style={{
              padding: 36, textAlign: "center", borderRadius: 20,
              border: "1px solid rgba(34,197,94,0.15)",
              background: "rgba(255,255,255,0.025)",
              color: "rgba(245,247,250,0.45)", fontSize: 13.5,
            }}>
              No live listings yet — publish a property to Research first.
            </div>
          ) : (
            rankedLive.map((row, i) => (
              <ListingCard
                key={row.property.id}
                row={row}
                accent="#4ADE80"
                onOpen={onOpenProperty}
                isLast={i === rankedLive.length - 1}
                primaryAction={{
                  label: "Share on social",
                  icon: <Share2 size={13} strokeWidth={2.2} />,
                  onClick: (r) => openShare(r, "live"),
                }}
              />
            ))
          )}
        </div>

        {/* Section 2 — Vendor prospects */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader
            badge="Section 2 · Vendor prospects"
            title="Owners you're trying"
            accentLine="to win"
            description="Modelled previews only. Show an owner how their home would rank against every property buyers can see live on The Bricks today. Print a one-sheet for a meeting or letterbox — not for social media."
            accent="#FB7185"
          />
          {rankedProspects.length === 0 ? (
            <div style={{
              padding: 36, textAlign: "center", borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.025)",
              color: "rgba(245,247,250,0.45)", fontSize: 13.5,
            }}>
              No vendor prospects yet — model one below.
            </div>
          ) : (
            rankedProspects.map((row, i) => (
              <ListingCard
                key={row.property.id}
                row={row}
                accent="#FB7185"
                onOpen={onOpenProperty}
                isLast={i === rankedProspects.length - 1}
                primaryAction={{
                  label: "Print one-sheet",
                  icon: <Printer size={13} strokeWidth={2.2} />,
                  onClick: handlePrintProspect,
                }}
                secondaryAction={{
                  label: "Preview pitch",
                  icon: <ChevronRight size={13} strokeWidth={2.2} />,
                  onClick: (r) => openShare(r, "prospect"),
                }}
              />
            ))
          )}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => navigateTo({ type: "report-new" })}
          style={{
            marginTop: 8, width: "100%", padding: "18px", borderRadius: 16,
            cursor: "pointer", border: "1px dashed rgba(251,113,133,0.4)",
            background: "rgba(251,113,133,0.05)",
            color: "#FECDD3", fontWeight: 700, fontSize: 14.5,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
            letterSpacing: "-0.01em",
          }}
        >
          <Plus size={16} strokeWidth={2.2} />
          Model a new vendor prospect
        </motion.button>

        <p style={{
          marginTop: 32, fontSize: 12, color: "#5C6477", lineHeight: 1.65, textAlign: "center",
        }}>
          Vendor prospects compare against live listings on The Bricks today — so owners
          see exactly how attractive their home would look to buyers if they listed with you.
        </p>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .agent-preview-h1 { font-size: clamp(32px, 7vw, 44px) !important; }
          .agent-preview-sub { font-size: 16px !important; }
          .agent-preview-hero { padding-top: 64px !important; margin-bottom: 36px !important; }
          .agent-id-card { gap: 14px !important; padding: 16px !important; }
          .agent-id-card > :last-child {
            border-left: none !important; padding-left: 0 !important;
            border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;
            width: 100%;
          }
        }
        @media (max-width: 640px) {
          .agent-listing-row-grid { grid-template-columns: 1fr !important; }
          .agent-listing-photo { min-height: 200px !important; }
          .agent-listing-photo img { min-height: 200px !important; }
        }
      `}</style>

      <AgentShareHub
        open={!!shareRow}
        onClose={() => setShareRow(null)}
        property={shareProperty}
        agent={agent}
        insights={shareInsights}
        liveMarketInsights={shareLiveMarket}
        breakEven={shareBreakEven}
        cashflow={shareCashflow}
        wealth10={shareWealth.w10}
        wealth30={shareWealth.w30}
        mode={shareMode}
        onOpenLive={shareMode === "live" && shareProperty
          ? () => { setShareRow(null); onOpenProperty(shareProperty.id); }
          : undefined}
      />
    </div>
  );
}
