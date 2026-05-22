import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Zap } from "lucide-react";
import { printVendorProspect } from "../utils/vendorProspectPrint.js";
import { fmtPrice, getPropertyHeroImage } from "../core/propertyImages.js";
import SocialShareButtons, { buildShareUrls } from "./SocialShareButtons.jsx";

/** 30-year cashflow brick for share preview cards. */
function CashflowBrickPreview({ cashflow, breakEven, compact = false }) {
  if (!cashflow?.length) {
    return (
      <div style={{
        padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.04)",
        border: "1px dashed rgba(255,255,255,0.12)",
        fontSize: 12, color: "rgba(245,247,250,0.45)", textAlign: "center",
      }}>
        30-year model loading…
      </div>
    );
  }
  const cols = 30;
  const cellW = compact ? 7 : 9;
  const cellH = compact ? 26 : 32;
  const max = Math.max(...cashflow.map(Math.abs), 1);

  return (
    <div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10,
        padding: "8px 12px", borderRadius: 10,
        background: breakEven ? "rgba(34,197,94,0.12)" : "rgba(244,63,94,0.12)",
        border: breakEven ? "1px solid rgba(34,197,94,0.28)" : "1px solid rgba(244,63,94,0.28)",
      }}>
        <span style={{
          fontFamily: 'ui-serif, Georgia, serif', fontSize: compact ? 16 : 19, fontWeight: 600,
          color: breakEven ? "#4ADE80" : "#F87171", lineHeight: 1.25,
        }}>
          {breakEven
            ? <>Pays back from <strong>year {breakEven}</strong></>
            : <>Never breaks even in 30 years</>}
        </span>
      </div>
      <div style={{
        display: "flex", gap: 2, flexWrap: "nowrap", justifyContent: "center",
        padding: "12px 10px", borderRadius: 12,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {Array.from({ length: cols }, (_, y) => {
          const v = cashflow.slice(y * 12, y * 12 + 12).reduce((s, x) => s + x, 0);
          const t = Math.min(1, Math.abs(v) / max);
          const bg = v >= 0
            ? `rgba(34,197,94,${0.45 + t * 0.5})`
            : `rgba(244,63,94,${0.45 + t * 0.5})`;
          return (
            <div key={y} style={{
              width: cellW, height: cellH, borderRadius: 2, background: bg, flexShrink: 0,
            }} title={`Year ${y + 1}`} />
          );
        })}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 8,
        fontSize: 10, color: "rgba(245,247,250,0.4)", fontWeight: 600,
      }}>
        <span>Year 1</span><span>Year 15</span><span>Year 30</span>
      </div>
    </div>
  );
}

/**
 * Agent share hub — live listings (social) vs vendor prospects (PDF).
 */
export default function AgentShareHub({
  open, onClose, property, agent, insights, liveMarketInsights,
  breakEven, cashflow, wealth10, wealth30,
  mode = "prospect",
  onOpenLive,
}) {
  const [copied, setCopied] = useState(false);

  const suburb = property?.suburb?.split(",")[0] || "your suburb";
  const price = fmtPrice(property?.price);
  const heroImage = property ? getPropertyHeroImage(property) : null;
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://thebricks.au";
  const rank = liveMarketInsights?.suburbRank ?? insights?.suburbRank;
  const rankTotal = liveMarketInsights?.suburbTotal ?? insights?.suburbTotal;
  const rankLine = rank && rankTotal
    ? `#${rank} of ${rankTotal} live on The Bricks in ${suburb}`
    : `Strong among live listings in ${suburb}`;

  const isLive = mode === "live";
  const accent = isLive ? "#4ADE80" : "#FB7185";

  const caption = useMemo(() => {
    if (isLive) {
      return [
        `🏠 Now live on The Bricks — ${property?.name}`,
        `${suburb} · Guide ${price}`,
        rank && rankTotal ? `Ranks ${rankLine} for investors comparing live listings today.` : null,
        breakEven ? `30-year model: pays an investor back from year ${breakEven}.` : null,
        `See the full listing + interactive 30-year model → ${shareUrl}`,
        `Listed by ${agent?.name}, ${agent?.agency}`,
      ].filter(Boolean).join("\n");
    }
    return [
      `${agent?.name?.split(" ")[0] || "Hi"} — thinking of selling in ${suburb}?`,
      ``,
      `I modelled your home (${property?.name}) against every property buyers can see live on The Bricks right now.`,
      rank && rankTotal
        ? `If you listed today, it would rank ${rankLine}.`
        : `It stacks up strongly against what's on the market today.`,
      breakEven ? `For an investor buyer, the model shows payback in year ${breakEven}.` : null,
      wealth30 != null ? `Projected equity by year 30: $${Math.round(wealth30 / 1000)}k (modelled).` : null,
      ``,
      `Happy to walk you through the full 30-year picture — ${agent?.phone || agent?.email || "give me a call"}.`,
      `${agent?.name} · ${agent?.agency}`,
    ].filter(Boolean).join("\n");
  }, [isLive, property, suburb, price, rank, rankTotal, rankLine, breakEven, shareUrl, agent, wealth30]);

  const openSocial = useCallback((channel) => {
    if (channel === "instagram" || channel === "copy") {
      navigator.clipboard?.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }
    const urls = buildShareUrls(caption, shareUrl);
    if (urls[channel]) window.open(urls[channel], "_blank", "noopener,noreferrer");
  }, [caption, shareUrl]);

  const handlePrint = useCallback(() => {
    printVendorProspect({
      property,
      agent,
      marketRank: rank,
      marketTotal: rankTotal,
      breakEven,
      wealth10,
      wealth30,
      previewUrl: shareUrl,
      suburb,
    });
  }, [property, agent, rank, rankTotal, breakEven, wealth10, wealth30, shareUrl, suburb]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(3,5,8,0.88)", backdropFilter: "blur(14px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, overflowY: "auto",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={e => e.stopPropagation()}
          style={{ width: "100%", maxWidth: 520 }}
        >
          {/* Modal header */}
          <div style={{
            marginBottom: 16, display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", gap: 14,
          }}>
            <div>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif',
                fontSize: 22, fontWeight: 500, color: "#F5F7FA",
                letterSpacing: "-0.02em", lineHeight: 1.2,
              }}>
                {isLive ? "Share this live listing" : "Vendor pitch preview"}
              </div>
              <div style={{ fontSize: 13.5, color: "rgba(245,247,250,0.5)", marginTop: 6, lineHeight: 1.5 }}>
                {isLive
                  ? "Property photo, 30-year cashflow, and payback year — ready for social."
                  : "How this home stacks up against everything live on The Bricks today."}
              </div>
            </div>
            <button type="button" onClick={onClose} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, width: 38, height: 38, cursor: "pointer",
              color: "#F5F7FA", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={18} />
            </button>
          </div>

          {/* Share card */}
          <div style={{
            borderRadius: 20, overflow: "hidden",
            background: "linear-gradient(165deg, rgba(11,14,20,0.95) 0%, rgba(18,21,28,0.98) 100%)",
            border: `1px solid ${accent}33`,
            boxShadow: `0 32px 80px -24px ${accent}44, 0 1px 0 rgba(255,255,255,0.06) inset`,
            marginBottom: 18,
          }}>
            {/* Hero photo — both modes */}
            {heroImage && (
              <div style={{ position: "relative", height: 180, background: "#15171F" }}>
                <img src={heroImage} alt={property?.name || ""}
                  style={{
                    width: "100%", height: "100%", objectFit: "cover", display: "block",
                    filter: "grayscale(0.1) contrast(1.04)",
                  }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to top, rgba(5,7,10,0.96) 0%, rgba(5,7,10,0.15) 55%, transparent 100%)",
                }} />
                <div style={{ position: "absolute", left: 18, bottom: 16, right: 18 }}>
                  <div style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
                    color: isLive ? "#86EFAC" : "#FECDD3", marginBottom: 6,
                  }}>
                    {isLive ? "Live on The Bricks" : "For the owner · not live yet"}
                  </div>
                  <div style={{
                    fontFamily: 'ui-serif, Georgia, serif', fontSize: 24, fontWeight: 500,
                    color: "#F5F7FA", lineHeight: 1.12, letterSpacing: "-0.02em",
                  }}>
                    {property?.name}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(245,247,250,0.62)", marginTop: 5 }}>
                    {suburb} · Guide {price}
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: "18px 20px 22px" }}>
              <div style={{
                padding: "11px 14px", borderRadius: 12, marginBottom: 16,
                background: isLive ? "rgba(34,197,94,0.08)" : "rgba(251,113,133,0.1)",
                border: isLive ? "1px solid rgba(34,197,94,0.22)" : "1px solid rgba(251,113,133,0.28)",
                display: "flex", alignItems: "flex-start", gap: 10,
              }}>
                <Zap size={14} fill={accent} color={accent} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                    color: "rgba(245,247,250,0.42)", marginBottom: 3,
                  }}>
                    vs live listings right now
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: isLive ? "#86EFAC" : "#FECDD3", lineHeight: 1.35 }}>
                    {isLive ? `Ranks ${rankLine}` : `If listed today: ${rankLine}`}
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "rgba(245,247,250,0.42)", fontWeight: 700, marginBottom: 10,
              }}>
                30-year cashflow model
              </div>
              <CashflowBrickPreview cashflow={cashflow} breakEven={breakEven} compact={isLive} />

              {agent?.photo && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, marginTop: 16,
                  paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <img src={agent.photo} alt={agent.name}
                    style={{
                      width: 42, height: 42, borderRadius: 999, objectFit: "cover",
                      border: `2px solid ${accent}55`,
                      boxShadow: "0 4px 14px -4px rgba(0,0,0,0.5)",
                    }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#F5F7FA" }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(245,247,250,0.45)", marginTop: 2 }}>{agent.agency}</div>
                  </div>
                </div>
              )}

              {!isLive && wealth30 != null && (
                <div style={{
                  marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)",
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
                }}>
                  <div style={{
                    padding: "12px 14px", borderRadius: 12,
                    background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)",
                  }}>
                    <div style={{ fontSize: 9, color: "rgba(245,247,250,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Equity Y10</div>
                    <div style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 22, color: "#93C5FD", marginTop: 4 }}>
                      ${Math.round((wealth10 || 0) / 1000)}k
                    </div>
                  </div>
                  <div style={{
                    padding: "12px 14px", borderRadius: 12,
                    background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)",
                  }}>
                    <div style={{ fontSize: 9, color: "rgba(245,247,250,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Equity Y30</div>
                    <div style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 22, color: "#93C5FD", marginTop: 4 }}>
                      ${Math.round(wealth30 / 1000)}k
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isLive ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,247,250,0.42)", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Share to social
              </div>
              <SocialShareButtons onShare={openSocial} layout="grid" />
              {onOpenLive && (
                <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onOpenLive}
                  style={{
                    width: "100%", padding: "13px 16px", borderRadius: 12, cursor: "pointer",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "#F5F7FA", fontWeight: 600, fontSize: 13.5, marginTop: 10,
                  }}>
                  Open live listing page
                </motion.button>
              )}
            </>
          ) : (
            <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={handlePrint}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 12, cursor: "pointer", border: "none",
                background: "linear-gradient(135deg,#FB7185,#C9374F)",
                color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 10,
                boxShadow: "0 12px 32px -10px rgba(244,63,94,0.7)",
              }}>
              Print one-sheet for the owner (PDF)
            </motion.button>
          )}

          <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => openSocial("copy")}
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 12, cursor: "pointer", marginTop: 10,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              color: copied ? "#4ADE80" : "#F5F7FA", fontWeight: 600, fontSize: 13.5,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            {copied ? <><Check size={15} /> Caption copied</> : "Copy caption to clipboard"}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
