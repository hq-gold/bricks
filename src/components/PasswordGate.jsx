import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, Sparkles } from "lucide-react";

// Soft access gate, not security. Just a polite "you're invited" wall while
// we're showing the early build to real estate agents and dev partners.
// Keep this lowercase, no spaces — easy to share verbally.
const PASSWORD = "2026budget";

// localStorage key. Bump if you ever want to invalidate everyone.
const STORAGE_KEY = "bricks-access-v1";

function isUnlocked() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function setUnlocked() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch { /* ignore */ }
}

export default function PasswordGate({ children }) {
  // Default to unlocked false until we check localStorage on mount — avoids
  // briefly flashing the app to returning users.
  const [unlocked, setUnlockedState] = useState(() => isUnlocked());
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!unlocked) inputRef.current?.focus();
  }, [unlocked]);

  const submit = useCallback((e) => {
    e?.preventDefault?.();
    const guess = value.trim().toLowerCase();
    if (guess === PASSWORD) {
      setSubmitting(true);
      setUnlocked();
      // Brief celebration moment before transition
      setTimeout(() => setUnlockedState(true), 520);
    } else {
      setError(true);
      setTimeout(() => setError(false), 600);
    }
  }, [value]);

  return (
    <AnimatePresence mode="wait">
      {!unlocked ? (
        <motion.div
          key="gate"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "#05070A",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            WebkitFontSmoothing: "antialiased",
            color: "#F5F7FA",
            overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "32px 24px",
          }}
        >
          {/* Atmospheric background — same image as Research */}
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: 'url("/the_bricks.png")',
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.75,
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse 60% 50% at 50% 38%, rgba(244,63,94,0.10), transparent 70%)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg, rgba(5,7,10,0.55) 0%, rgba(5,7,10,0.78) 55%, rgba(5,7,10,0.92) 100%)",
            }} />
          </div>

          {/* Animated rose glow blob — adds life without distracting */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", zIndex: 0,
              width: 600, height: 600, borderRadius: "50%",
              top: "30%", left: "50%", transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, rgba(244,63,94,0.18) 0%, transparent 60%)",
              filter: "blur(40px)", pointerEvents: "none",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative", zIndex: 1,
              width: "100%", maxWidth: 460,
              textAlign: "center",
            }}
          >
            {/* Logo */}
            <motion.img
              src="/logo.png"
              alt="The Bricks"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              style={{
                height: 36, width: "auto", display: "block",
                margin: "0 auto 36px",
              }}
            />

            {/* Eyebrow — hairline rules + invite-only badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.45 }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 14,
                marginBottom: 22,
              }}
            >
              <span style={{
                width: 36, height: 1,
                background: "linear-gradient(to right, transparent, rgba(245,247,250,0.28))",
              }} />
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "5px 12px", borderRadius: 999,
                background: "rgba(251,113,133,0.12)", border: "1px solid rgba(251,113,133,0.32)",
                fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
                color: "#FECDD3",
              }}>
                <Sparkles size={11} strokeWidth={2.4} color="#FB7185" fill="#FB7185" />
                Private preview
              </span>
              <span style={{
                width: 36, height: 1,
                background: "linear-gradient(to left, transparent, rgba(245,247,250,0.28))",
              }} />
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.55 }}
              style={{
                margin: 0,
                fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
                fontSize: "clamp(36px, 5.5vw, 52px)",
                fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1.05,
                color: "#F5F7FA",
              }}
            >
              The 30-year{" "}
              <span className="gradient-text" style={{
                fontStyle: "italic", fontWeight: 500,
                background: "linear-gradient(90deg, #FDE2E8 0%, #FB7185 48%, #FB923C 100%)",
                WebkitBackgroundClip: "text", backgroundClip: "text",
                WebkitTextFillColor: "transparent", color: "transparent",
              }}>
                truth
              </span>{" "}
              about Aussie property.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.48, duration: 0.5 }}
              style={{
                margin: "20px 0 36px",
                fontSize: 16, fontWeight: 400, lineHeight: 1.55, letterSpacing: -0.005,
                color: "rgba(245,247,250,0.65)",
                maxWidth: 380, marginLeft: "auto", marginRight: "auto",
              }}
            >
              Modelled under the 2026 budget reforms. Currently in private preview — enter your access code to continue.
            </motion.p>

            {/* Form */}
            <motion.form
              onSubmit={submit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              style={{ position: "relative", maxWidth: 380, margin: "0 auto" }}
            >
              <motion.div
                animate={error ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  position: "relative",
                  background: "rgba(255,255,255,0.04)",
                  border: error
                    ? "1px solid rgba(244,63,94,0.55)"
                    : "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 999,
                  boxShadow: error
                    ? "0 0 0 4px rgba(244,63,94,0.12), 0 1px 0 rgba(255,255,255,0.06) inset"
                    : "0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 60px -28px rgba(0,0,0,0.7)",
                  backdropFilter: "blur(20px)",
                  display: "flex", alignItems: "center",
                  padding: "4px 4px 4px 18px",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              >
                <Lock size={15} strokeWidth={2.2} color="#FB7185" style={{ flexShrink: 0, marginRight: 10 }} />
                <input
                  ref={inputRef}
                  type="password"
                  placeholder="Access code"
                  value={value}
                  onChange={(e) => { setValue(e.target.value); setError(false); }}
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    flex: 1, minWidth: 0,
                    background: "transparent", border: "none", outline: "none",
                    color: "#F5F7FA",
                    fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em",
                    padding: "13px 0",
                    fontFamily: "inherit",
                  }}
                />
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.04 }}
                  disabled={submitting}
                  style={{
                    flexShrink: 0,
                    width: 42, height: 42, borderRadius: 999,
                    background: submitting
                      ? "linear-gradient(135deg, #4ADE80, #16A34A)"
                      : "linear-gradient(135deg, #FB7185 0%, #C9374F 100%)",
                    border: "none", cursor: submitting ? "default" : "pointer",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    color: "#fff",
                    boxShadow: submitting
                      ? "0 8px 24px -8px rgba(74,222,128,0.6)"
                      : "0 8px 24px -8px rgba(244,63,94,0.7)",
                    transition: "background 0.3s, box-shadow 0.3s",
                  }}
                  aria-label="Enter"
                >
                  <AnimatePresence mode="wait">
                    {submitting ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 360, damping: 18 }}
                        style={{ display: "inline-flex" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </motion.span>
                    ) : (
                      <motion.span
                        key="arrow"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        style={{ display: "inline-flex" }}
                      >
                        <ArrowRight size={17} strokeWidth={2.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    style={{
                      marginTop: 14, fontSize: 12.5,
                      color: "rgba(254,205,211,0.8)", fontWeight: 600,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    That code didn&apos;t work. Try again or get in touch.
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85, duration: 0.5 }}
              style={{
                marginTop: 36,
                fontSize: 12, color: "rgba(245,247,250,0.36)",
                letterSpacing: "-0.005em",
              }}
            >
              No account needed. We don&apos;t store anything.
            </motion.div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
