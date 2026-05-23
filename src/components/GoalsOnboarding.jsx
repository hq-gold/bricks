import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, X, Sparkles } from "lucide-react";

// First-run goals capture. We show this once, after the password gate. It writes
// to localStorage so investors don't see it again. Goals shape stays compatible
// with calcAchievements (yearly / cumulative).

const STORAGE_KEY = "bricks-goals-v1";

// Curated catalogue of common life-money goals. The user multi-selects, then
// confirms or tweaks the dollar amount on the second step. Amounts default to
// realistic AUD figures for 2026.
export const GOAL_CATALOGUE = [
  { id: "bali", emoji: "🏝️", name: "Family Bali trip", defaultAmount: 8000, type: "yearly", hint: "/ year" },
  { id: "dinners", emoji: "🍷", name: "Friday dinners out", defaultAmount: 6000, type: "yearly", hint: "/ year" },
  { id: "car", emoji: "🚗", name: "New car every 5 years", defaultAmount: 12000, type: "yearly", hint: "/ year" },
  { id: "school", emoji: "🎓", name: "Private school fees", defaultAmount: 28000, type: "yearly", hint: "/ year" },
  { id: "mortgage", emoji: "🏠", name: "Pay off our home loan", defaultAmount: 35000, type: "yearly", hint: "/ year" },
  { id: "kids", emoji: "👶", name: "Help the kids buy a place", defaultAmount: 150000, type: "cumulative", hint: "one-off" },
  { id: "freedom", emoji: "🌴", name: "Financial freedom", defaultAmount: 120000, type: "yearly", hint: "/ year passive" },
  { id: "second", emoji: "🏖️", name: "A holiday house", defaultAmount: 700000, type: "cumulative", hint: "one-off" },
  { id: "boat", emoji: "⛵", name: "Boat / RV / toys", defaultAmount: 80000, type: "cumulative", hint: "one-off" },
  { id: "retire", emoji: "👴", name: "Retire by 55", defaultAmount: 90000, type: "yearly", hint: "/ year passive" },
];

export function hasCompletedOnboarding() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

export function loadStoredGoals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // Dedupe by emoji+name+amount+type so legacy storage from earlier sessions
    // (where we mixed SEED_GOALS ids with catalogue ids) can't show the same
    // goal twice on the brick.
    const seen = new Set();
    const deduped = [];
    for (const g of parsed) {
      if (!g || !g.emoji) continue;
      const k = `${g.emoji}|${g.name}|${g.amount}|${g.type}`;
      if (seen.has(k)) continue;
      seen.add(k);
      deduped.push(g);
    }
    return deduped.length ? deduped : null;
  } catch {
    return null;
  }
}

export function saveGoals(goals) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  } catch { /* ignore */ }
}

export default function GoalsOnboarding({ open, onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set(["bali", "school", "freedom"]));
  const [amounts, setAmounts] = useState(() => {
    const initial = {};
    for (const g of GOAL_CATALOGUE) initial[g.id] = g.defaultAmount;
    return initial;
  });

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const toggle = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedGoals = useMemo(
    () => GOAL_CATALOGUE.filter(g => selectedIds.has(g.id)),
    [selectedIds],
  );

  const finalise = useCallback(() => {
    const goals = selectedGoals.map(g => ({
      id: `g_${g.id}`,
      emoji: g.emoji,
      name: g.name,
      amount: Number(amounts[g.id]) || g.defaultAmount,
      type: g.type,
    }));
    saveGoals(goals);
    onComplete?.(goals);
  }, [selectedGoals, amounts, onComplete]);

  const skip = useCallback(() => {
    // Persist an empty array so we don't re-prompt
    saveGoals([]);
    onSkip?.();
  }, [onSkip]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.32 }}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(5,7,10,0.86)",
          backdropFilter: "blur(14px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            width: "100%", maxWidth: 640,
            background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 24, overflow: "hidden",
            boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset, 0 60px 120px -40px rgba(0,0,0,0.8)",
            color: "#F5F7FA",
            maxHeight: "90vh",
            display: "flex", flexDirection: "column",
          }}
        >
          {/* Glow accent */}
          <div aria-hidden style={{
            position: "absolute", top: -120, left: -80,
            width: 320, height: 320, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,113,133,0.16) 0%, transparent 60%)",
            filter: "blur(40px)", pointerEvents: "none",
          }} />

          {/* Close */}
          <button onClick={skip} aria-label="Skip"
            style={{
              position: "absolute", top: 18, right: 18, zIndex: 2,
              width: 32, height: 32, borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(245,247,250,0.7)",
            }}
          >
            <X size={15} strokeWidth={2.4} />
          </button>

          {/* Step indicator */}
          <div style={{
            display: "flex", gap: 6, padding: "20px 28px 0",
          }}>
            {[0, 1].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 999,
                background: i <= step ? "linear-gradient(90deg, #FB7185, #F43F5E)" : "rgba(255,255,255,0.08)",
                transition: "background 0.3s",
              }} />
            ))}
          </div>

          <div style={{ padding: "24px 32px 32px", overflowY: "auto" }}>
            {/* Eyebrow */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "5px 11px", borderRadius: 999,
              background: "rgba(251,113,133,0.12)",
              border: "1px solid rgba(251,113,133,0.32)",
              fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
              color: "#FECDD3", marginBottom: 18,
            }}>
              <Sparkles size={11} strokeWidth={2.4} color="#FB7185" fill="#FB7185" />
              {step === 0 ? "Step 1 of 2" : "Step 2 of 2"}
            </div>

            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.32 }}
                >
                  <h2 style={{
                    margin: "0 0 10px",
                    fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
                    fontSize: "clamp(26px, 3.5vw, 34px)",
                    fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.12,
                  }}>
                    What is this property{" "}
                    <span style={{
                      fontStyle: "italic", fontWeight: 500,
                      background: "linear-gradient(90deg, #FDE2E8 0%, #FB7185 60%, #FB923C 100%)",
                      WebkitBackgroundClip: "text", backgroundClip: "text",
                      WebkitTextFillColor: "transparent", color: "transparent",
                    }}>for</span>?
                  </h2>
                  <p style={{
                    margin: "0 0 22px",
                    fontSize: 14.5, color: "rgba(245,247,250,0.62)",
                    lineHeight: 1.55, letterSpacing: "-0.005em",
                  }}>
                    Pick a few. We&apos;ll re-read every cashflow forecast through these — so instead of &quot;$8,000 in year 4&quot; you&apos;ll see &quot;Bali trips covered by year 4.&quot;
                  </p>

                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: 8, marginBottom: 4,
                  }}>
                    {GOAL_CATALOGUE.map(g => {
                      const selected = selectedIds.has(g.id);
                      return (
                        <motion.button
                          key={g.id}
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={() => toggle(g.id)}
                          style={{
                            position: "relative",
                            background: selected
                              ? "linear-gradient(180deg, rgba(251,113,133,0.18) 0%, rgba(251,113,133,0.06) 100%)"
                              : "rgba(255,255,255,0.03)",
                            border: selected
                              ? "1px solid rgba(251,113,133,0.55)"
                              : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 14, padding: "14px 12px",
                            color: "#F5F7FA",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex", flexDirection: "column",
                            gap: 4,
                            transition: "background 0.2s, border-color 0.2s",
                          }}
                        >
                          {selected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 360, damping: 18 }}
                              style={{
                                position: "absolute", top: 8, right: 8,
                                width: 18, height: 18, borderRadius: 999,
                                background: "#FB7185",
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              <Check size={11} strokeWidth={3} color="#fff" />
                            </motion.div>
                          )}
                          <div style={{ fontSize: 22, lineHeight: 1 }}>{g.emoji}</div>
                          <div style={{
                            fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em",
                            lineHeight: 1.25,
                          }}>{g.name}</div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.32 }}
                >
                  <h2 style={{
                    margin: "0 0 10px",
                    fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
                    fontSize: "clamp(26px, 3.5vw, 34px)",
                    fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.12,
                  }}>
                    How much does each{" "}
                    <span style={{
                      fontStyle: "italic", fontWeight: 500,
                      background: "linear-gradient(90deg, #FDE2E8 0%, #FB7185 60%, #FB923C 100%)",
                      WebkitBackgroundClip: "text", backgroundClip: "text",
                      WebkitTextFillColor: "transparent", color: "transparent",
                    }}>cost</span>?
                  </h2>
                  <p style={{
                    margin: "0 0 22px",
                    fontSize: 14.5, color: "rgba(245,247,250,0.62)",
                    lineHeight: 1.55, letterSpacing: "-0.005em",
                  }}>
                    Numbers in AUD. These are just starting points — tweak whatever doesn&apos;t feel right.
                  </p>

                  {selectedGoals.length === 0 && (
                    <div style={{
                      padding: "20px", borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(245,247,250,0.55)", fontSize: 14, textAlign: "center",
                    }}>
                      No goals selected. Go back and pick at least one.
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedGoals.map(g => (
                      <div key={g.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", borderRadius: 12,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}>
                        <div style={{ fontSize: 22, lineHeight: 1 }}>{g.emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#F5F7FA", letterSpacing: "-0.01em" }}>
                            {g.name}
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(245,247,250,0.45)", marginTop: 2 }}>
                            {g.hint}
                          </div>
                        </div>
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 10, padding: "8px 12px",
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          <span style={{ color: "rgba(245,247,250,0.55)", fontSize: 13.5 }}>$</span>
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={amounts[g.id]}
                            onChange={(e) => setAmounts(a => ({ ...a, [g.id]: e.target.value }))}
                            style={{
                              width: 86, background: "transparent",
                              border: "none", outline: "none",
                              color: "#F5F7FA", fontSize: 14, fontWeight: 600,
                              textAlign: "right",
                              fontFamily: "inherit",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer actions */}
          <div style={{
            padding: "16px 28px 22px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12,
          }}>
            {step === 0 ? (
              <button onClick={skip} style={{
                background: "transparent", border: "none",
                color: "rgba(245,247,250,0.5)", fontSize: 13, fontWeight: 500,
                cursor: "pointer", padding: "10px 4px",
                letterSpacing: "-0.005em",
              }}>
                Skip — I&apos;ll set these later
              </button>
            ) : (
              <button onClick={() => setStep(0)} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "transparent", border: "none",
                color: "rgba(245,247,250,0.7)", fontSize: 13.5, fontWeight: 600,
                cursor: "pointer", padding: "10px 4px",
                letterSpacing: "-0.005em",
              }}>
                <ArrowLeft size={14} strokeWidth={2.4} />
                Back
              </button>
            )}

            {step === 0 ? (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setStep(1)}
                disabled={selectedIds.size === 0}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  background: selectedIds.size === 0
                    ? "rgba(255,255,255,0.05)"
                    : "linear-gradient(135deg, #FB7185 0%, #C9374F 100%)",
                  border: "none", borderRadius: 999,
                  padding: "11px 20px",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  letterSpacing: "-0.01em",
                  cursor: selectedIds.size === 0 ? "default" : "pointer",
                  boxShadow: selectedIds.size === 0
                    ? "none"
                    : "0 14px 28px -10px rgba(244,63,94,0.55)",
                  transition: "background 0.2s, box-shadow 0.2s",
                }}
              >
                Next
                <ArrowRight size={14} strokeWidth={2.6} />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={finalise}
                disabled={selectedGoals.length === 0}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  background: selectedGoals.length === 0
                    ? "rgba(255,255,255,0.05)"
                    : "linear-gradient(135deg, #FB7185 0%, #C9374F 100%)",
                  border: "none", borderRadius: 999,
                  padding: "11px 22px",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  letterSpacing: "-0.01em",
                  cursor: selectedGoals.length === 0 ? "default" : "pointer",
                  boxShadow: selectedGoals.length === 0
                    ? "none"
                    : "0 14px 28px -10px rgba(244,63,94,0.55)",
                  transition: "background 0.2s, box-shadow 0.2s",
                }}
              >
                <Check size={14} strokeWidth={2.8} />
                Save my goals
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
