import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Users, ArrowRight } from "lucide-react";

// "You've opened 3 properties — want a buyer's agent to do the legwork?"
// Slides up from the bottom-right on desktop, bottom sheet on mobile. Counts
// opens in localStorage so it fires once at the right moment.
//
// Design intent: this is the only revenue moment we surface to the buyer. We
// route them to a real buyer's agent (not a faceless "Bricks expert") because
// that's where the value chain genuinely sits — independent agents who walk
// shortlists with their clients and earn fees from the buyer side.

const STORAGE_KEY = "bricks-opens-v1";
const TRIGGER_COUNT = 3;
const DISMISS_KEY = "bricks-concierge-dismissed-v1";

function readOpens() {
  try {
    const v = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  } catch { return 0; }
}

function setOpens(n) {
  try { localStorage.setItem(STORAGE_KEY, String(n)); } catch {}
}

function isDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
}

function markDismissed() {
  try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
}

// Track an open from anywhere. Use this whenever a property detail mounts.
export function trackPropertyOpen() {
  const n = readOpens() + 1;
  setOpens(n);
  return n;
}

export default function ConciergeNudge({ onRequest }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isDismissed()) return;
    // Poll once a second so it appears the moment they cross 3 opens, no matter
    // which page they're on. Cheap, no perf concern.
    const tick = () => {
      if (isDismissed()) return;
      if (readOpens() >= TRIGGER_COUNT) setShow(true);
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => clearInterval(id);
  }, []);

  const close = () => {
    markDismissed();
    setShow(false);
  };

  const accept = () => {
    markDismissed();
    setShow(false);
    onRequest?.();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="nudge"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="concierge-nudge"
          style={{
            position: "fixed", zIndex: 800,
            right: 22, bottom: 22,
            width: 360, maxWidth: "calc(100vw - 32px)",
            background: "linear-gradient(180deg, rgba(15,18,26,0.96), rgba(8,10,14,0.96))",
            border: "1px solid rgba(251,113,133,0.32)",
            borderRadius: 20, overflow: "hidden",
            boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset, 0 30px 80px -30px rgba(0,0,0,0.85)",
            color: "#F5F7FA",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          }}
        >
          <div aria-hidden style={{
            position: "absolute", top: -80, right: -50,
            width: 200, height: 200, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,113,133,0.22) 0%, transparent 60%)",
            filter: "blur(28px)", pointerEvents: "none",
          }} />

          <button onClick={close} aria-label="Close"
            style={{
              position: "absolute", top: 12, right: 12, zIndex: 2,
              width: 26, height: 26, borderRadius: 999,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(245,247,250,0.6)",
            }}>
            <X size={12} strokeWidth={2.4} />
          </button>

          <div style={{ position: "relative", padding: "20px 22px 18px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "4px 10px", borderRadius: 999,
              background: "rgba(251,113,133,0.14)",
              border: "1px solid rgba(251,113,133,0.32)",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#FECDD3", marginBottom: 10,
            }}>
              <Users size={10} strokeWidth={2.6} color="#FB7185" />
              You&apos;ve been busy
            </div>
            <div style={{
              fontFamily: 'ui-serif, Georgia, serif',
              fontSize: 19, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.25,
              color: "#F5F7FA", marginBottom: 10,
            }}>
              Want a buyer&apos;s agent to walk through your shortlist with you?
            </div>
            <div style={{
              fontSize: 12.5, color: "rgba(245,247,250,0.6)", lineHeight: 1.55,
              marginBottom: 16, letterSpacing: "-0.005em",
            }}>
              15 minutes, free, no obligation. An independent buyer&apos;s agent will run the 30-year cashflow against your situation and tell you which properties on your list actually stack up — and which ones to keep walking past.
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <motion.button whileTap={{ scale: 0.96 }} onClick={accept}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  background: "linear-gradient(135deg, #FB7185 0%, #C9374F 100%)",
                  border: "none", borderRadius: 999,
                  padding: "10px 18px",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  letterSpacing: "-0.01em",
                  cursor: "pointer",
                  boxShadow: "0 14px 28px -10px rgba(244,63,94,0.55)",
                  flexShrink: 0,
                }}>
                <Phone size={12} strokeWidth={2.6} />
                Find me an agent
                <ArrowRight size={12} strokeWidth={2.6} />
              </motion.button>
              <button onClick={close} style={{
                background: "transparent", border: "none",
                color: "rgba(245,247,250,0.5)", fontSize: 12, fontWeight: 500,
                cursor: "pointer", padding: "8px 4px",
              }}>
                Maybe later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
