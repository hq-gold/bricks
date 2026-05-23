import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useCountdown } from "../hooks/useCountdown.js";

/**
 * The 2026 budget cliff CTA band — looping Sydney video on the left, pitch +
 * call-to-action on the right. Used on the property detail page and the
 * Browse home page (footer band) so the cliff stays top-of-mind.
 *
 * Self-contained: pulls the live days-until-cliff from the shared countdown
 * hook so both placements stay in sync.
 */
export default function BudgetCTABand({ onOpenBudget, marginTop = 56, marginBottom = 56 }) {
  const { days: daysUntilCliff } = useCountdown();

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 24, overflow: "hidden",
      marginTop, marginBottom,
    }}>
      <div className="cta-grid" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "stretch",
      }}>
        {/* Video half — countdown is the dramatic centrepiece */}
        <div style={{ position: "relative", minHeight: 280, background: "#0A0D12" }}>
          <video
            src="/budget-bg.mp4"
            autoPlay muted loop playsInline
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover",
            }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background:
              "linear-gradient(180deg, rgba(5,7,10,0.5) 0%, rgba(5,7,10,0.15) 35%, rgba(5,7,10,0.5) 100%), " +
              "linear-gradient(100deg, rgba(5,7,10,0) 55%, rgba(5,7,10,0.6) 100%)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "0 24px",
          }}>
            <div style={{
              fontSize: 10.5, letterSpacing: "0.22em", textTransform: "uppercase",
              color: "rgba(245,247,250,0.7)", fontWeight: 700, marginBottom: 10,
              textShadow: "0 2px 8px rgba(0,0,0,0.7)",
            }}>
              Negative gearing cliff
            </div>
            <div className="cta-countdown" style={{
              fontFamily: 'ui-serif, Georgia, serif',
              fontSize: 64, fontWeight: 600, letterSpacing: "-0.04em",
              lineHeight: 1, color: "#FFFFFF",
              textShadow: "0 4px 24px rgba(0,0,0,0.7)",
            }}>
              {daysUntilCliff}
            </div>
            <div style={{
              fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase",
              color: "rgba(245,247,250,0.85)", fontWeight: 600, marginTop: 6,
              textShadow: "0 2px 8px rgba(0,0,0,0.7)",
            }}>
              days until 1 July 2027
            </div>
            <div style={{
              marginTop: 14, height: 1, width: 60,
              background: "linear-gradient(90deg, transparent, rgba(251,113,133,0.7), transparent)",
            }} />
            <div style={{
              marginTop: 10,
              fontSize: 11.5, lineHeight: 1.45,
              color: "rgba(245,247,250,0.7)", textAlign: "center",
              maxWidth: 240,
              textShadow: "0 2px 8px rgba(0,0,0,0.7)",
            }}>
              When established property loses negative gearing.
            </div>
          </div>
        </div>

        {/* Text half */}
        <div style={{
          padding: "40px 36px",
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
            color: "#FB7185", fontWeight: 600, marginBottom: 12,
          }}>The 2026 budget</div>
          <div style={{
            fontFamily: 'ui-serif, Georgia, serif', fontSize: 30, fontWeight: 500,
            color: "#F5F7FA", letterSpacing: "-0.025em", lineHeight: 1.18, marginBottom: 14,
          }}>
            The rules just changed. This is the story behind every number here.
          </div>
          <p style={{
            fontSize: 14.5, lineHeight: 1.6, color: "rgba(245,247,250,0.62)",
            margin: "0 0 24px",
          }}>
            Negative gearing, capital gains tax, the July 2027 cliff — the budget
            rewrote what makes a property worth owning. Walk through what it means.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => onOpenBudget && onOpenBudget()}
            style={{
              cursor: "pointer", border: "none", alignSelf: "flex-start",
              background: "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)",
              color: "#FFFFFF", borderRadius: 13, padding: "14px 24px",
              fontSize: 14.5, fontWeight: 600, letterSpacing: -0.02,
              display: "inline-flex", alignItems: "center", gap: 9,
              boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset, 0 14px 34px -14px rgba(244,63,94,0.85)",
            }}>
            See the 2026 budget story
            <ArrowRight size={16} strokeWidth={2.4} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
