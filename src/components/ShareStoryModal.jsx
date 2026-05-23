import React, { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Copy, Check } from "lucide-react";

/**
 * Instagram Story–style share card for agents (private preview list only).
 * Shows break-even year + sample cashflow figures — not internal "grade" jargon.
 */
export default function ShareStoryModal({
  open, onClose, property, insights,
  breakEven = null, cashflow = null,
}) {
  const [copied, setCopied] = React.useState(false);
  const cardRef = useRef(null);

  const topBadge = insights?.badges?.[0];
  const suburb = property?.suburb?.split(",")[0] || "Suburb";
  const suburbRank = insights?.suburbRank;
  const suburbTotal = insights?.suburbTotal;

  const yearCash = (y) => {
    if (!cashflow?.length) return null;
    return cashflow.slice((y - 1) * 12, y * 12).reduce((s, x) => s + x, 0);
  };
  const fmtK = (n) => {
    if (n == null) return "—";
    const abs = Math.abs(Math.round(n));
    const sign = n < 0 ? "−" : "+";
    return abs >= 1000 ? `${sign}$${(abs / 1000).toFixed(0)}k` : `${sign}$${abs}`;
  };

  const y1 = yearCash(1);
  const y10 = yearCash(10);
  const y30 = yearCash(30);

  const rankLine = suburbRank && suburbTotal
    ? `#${suburbRank} of ${suburbTotal} in ${suburb} (modelled)`
    : null;
  const breakEvenLine = breakEven
    ? `Breaks even year ${breakEven} — then pays you`
    : "Doesn't break even in 30 years (modelled)";

  const shareText = [
    `${property?.name || "Property"} · ${suburb}`,
    topBadge ? topBadge.label : null,
    rankLine,
    breakEvenLine,
    y1 != null ? `Year 1: ${fmtK(y1)}/yr` : null,
    y30 != null ? `Year 30: ${fmtK(y30)}/yr` : null,
    "30-year after-tax cashflow under the 2026 rules — thebricks.app",
  ].filter(Boolean).join("\n");

  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [shareText]);

  const tryNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: property?.name, text: shareText, url: window.location.origin });
        return;
      } catch {
        /* cancelled */
      }
    }
    copyText();
  }, [property?.name, shareText, copyText]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(3,5,8,0.88)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onClick={e => e.stopPropagation()}
          style={{ width: "100%", maxWidth: 400 }}
        >
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
          }}>
            <span style={{ color: "#F5F7FA", fontSize: 15, fontWeight: 700 }}>Share on social</span>
            <button type="button" onClick={onClose} style={{
              background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
              width: 36, height: 36, cursor: "pointer", color: "#F5F7FA",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={18} />
            </button>
          </div>

          <div
            ref={cardRef}
            style={{
              aspectRatio: "9/16",
              maxHeight: "min(70vh, 640px)",
              width: "100%",
              margin: "0 auto",
              borderRadius: 20,
              overflow: "hidden",
              background: "linear-gradient(165deg, #0A0D12 0%, #12151C 40%, #1a0a10 100%)",
              border: "1px solid rgba(251,113,133,0.25)",
              boxShadow: "0 32px 80px -24px rgba(244,63,94,0.45), 0 1px 0 rgba(255,255,255,0.08) inset",
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                color: "rgba(251,113,133,0.9)", marginBottom: 20,
              }}>
                Investment preview
              </div>
              {topBadge && (
                <div style={{
                  display: "inline-block",
                  padding: "10px 14px", borderRadius: 12, marginBottom: 16,
                  background: "linear-gradient(135deg, rgba(251,113,133,0.28) 0%, rgba(251,113,133,0.08) 100%)",
                  border: "1px solid rgba(251,113,133,0.4)",
                  color: "#FECDD3", fontSize: 13, fontWeight: 700, lineHeight: 1.3,
                }}>
                  {topBadge.label}
                </div>
              )}
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif',
                fontSize: 28, fontWeight: 500, letterSpacing: "-0.03em",
                color: "#F5F7FA", lineHeight: 1.15, marginBottom: 8,
              }}>
                {property?.name}
              </div>
              <div style={{ fontSize: 14, color: "rgba(245,247,250,0.55)" }}>{suburb}</div>
              {rankLine && (
                <div style={{
                  marginTop: 14, fontSize: 13, fontWeight: 700, color: "#FB7185",
                }}>
                  {rankLine}
                </div>
              )}
            </div>

            <div>
              {/* 30-year snapshot — the thing agents actually want to show off */}
              <div style={{
                padding: "16px 14px", borderRadius: 14, marginBottom: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{
                  fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "rgba(245,247,250,0.45)", fontWeight: 700, marginBottom: 10,
                }}>
                  30-year cashflow (modelled)
                </div>
                <div style={{
                  fontFamily: 'ui-serif, Georgia, serif',
                  fontSize: 22, fontWeight: 500, color: breakEven ? "#4ADE80" : "#F87171",
                  marginBottom: 12, lineHeight: 1.2,
                }}>
                  {breakEven ? `Pays you from year ${breakEven}` : "Never breaks even"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Year 1", val: y1 },
                    { label: "Year 10", val: y10 },
                    { label: "Year 30", val: y30 },
                  ].map(row => (
                    <div key={row.label} style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: 9, color: "rgba(245,247,250,0.4)", fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
                      }}>{row.label}</div>
                      <div style={{
                        fontFamily: 'ui-serif, Georgia, serif', fontSize: 15, fontWeight: 600,
                        color: (row.val ?? 0) >= 0 ? "#4ADE80" : "#F87171",
                      }}>{fmtK(row.val)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{
                fontSize: 14, lineHeight: 1.45, color: "rgba(245,247,250,0.75)", fontWeight: 500,
              }}>
                Post-2026 budget rules · not financial advice
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "rgba(245,247,250,0.35)" }}>thebricks.app</div>
            </div>
          </div>

          <p style={{
            margin: "14px 0 0", fontSize: 12, color: "rgba(245,247,250,0.45)", textAlign: "center", lineHeight: 1.5,
          }}>
            Screenshot for Stories, or copy the caption below.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={tryNativeShare}
              style={{
                flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#FB7185,#C9374F)",
                color: "#fff", fontWeight: 700, fontSize: 14,
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Share2 size={16} /> Share
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={copyText}
              style={{
                flex: 1, padding: "14px", borderRadius: 12, cursor: "pointer",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#F5F7FA", fontWeight: 600, fontSize: 14,
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {copied ? <Check size={16} color="#22C55E" /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy caption"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
