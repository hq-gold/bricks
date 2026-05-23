import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Heart } from "lucide-react";

// Re-frames a property's 30-year cashflow as the user's actual life goals.
// Instead of "+$8,000 in year 4", they see "Bali trips covered by year 4."
// Goal shape (from GoalsOnboarding / SEED_GOALS):
//   { id, emoji, name, amount, type: "yearly" | "cumulative" }
//
// We compute yearHit via the standard calcAchievements helper, then sort
// soonest-first. Goals that never hit in 30 years are surfaced separately
// so the user sees a complete picture, not a cherry-picked one.

export default function GoalsTimeline({ goals, achievements, onEditGoals }) {
  const sorted = useMemo(() => {
    if (!achievements?.length) return { hit: [], missed: [] };
    const merged = achievements.map((a, i) => ({ ...a, ...goals[i] }));
    const hit = merged
      .filter(g => g.yearHit != null)
      .sort((a, b) => a.yearHit - b.yearHit);
    const missed = merged.filter(g => g.yearHit == null);
    return { hit, missed };
  }, [achievements, goals]);

  if (!goals || goals.length === 0) {
    return null;
  }

  const { hit, missed } = sorted;
  const firstYear = hit[0]?.yearHit;
  const firstName = hit[0]?.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        marginBottom: 28,
        borderRadius: 20, overflow: "hidden",
        background: "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 60px -36px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ padding: "24px 26px 22px" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16, gap: 14, flexWrap: "wrap",
        }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "4px 10px", borderRadius: 999,
              background: "rgba(167,139,250,0.12)",
              border: "1px solid rgba(167,139,250,0.28)",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#DDD6FE", marginBottom: 10,
            }}>
              <Heart size={10} strokeWidth={2.6} color="#A78BFA" fill="#A78BFA" />
              What this property pays for
            </div>
            <div style={{
              fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
              fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em",
              color: "#F5F7FA", lineHeight: 1.2,
            }}>
              {firstYear ? (
                <>Your <em style={{ fontStyle: "italic", color: "#FECDD3" }}>{firstName?.toLowerCase()}</em> — covered from year {firstYear}.</>
              ) : (
                <>None of your goals are covered by year 30 on this property.</>
              )}
            </div>
          </div>
          {onEditGoals && (
            <button onClick={onEditGoals} style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 999, padding: "7px 14px",
              color: "rgba(245,247,250,0.7)", fontSize: 12, fontWeight: 600,
              cursor: "pointer", letterSpacing: "-0.005em",
              display: "inline-flex", alignItems: "center", gap: 6,
              flexShrink: 0,
            }}>
              <Sparkles size={11} strokeWidth={2.4} />
              Edit goals
            </button>
          )}
        </div>

        {/* Hit goals — chronological strip */}
        {hit.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(150px, 1fr))`,
            gap: 8,
            marginBottom: missed.length > 0 ? 16 : 0,
          }}>
            {hit.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.34 }}
                style={{
                  position: "relative",
                  padding: "12px 13px 11px",
                  borderRadius: 12,
                  background: "linear-gradient(180deg, rgba(74,222,128,0.10) 0%, rgba(74,222,128,0.02) 100%)",
                  border: "1px solid rgba(74,222,128,0.22)",
                }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 6,
                }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{g.emoji}</span>
                  <span style={{
                    fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase",
                    color: "#86EFAC", fontWeight: 700,
                    marginLeft: "auto",
                  }}>
                    Yr {g.yearHit}
                  </span>
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: "#F5F7FA",
                  letterSpacing: "-0.01em", lineHeight: 1.35,
                  marginBottom: 2,
                }}>
                  {g.name}
                </div>
                <div style={{
                  fontSize: 10.5, color: "rgba(245,247,250,0.45)",
                  letterSpacing: "-0.005em",
                }}>
                  ${g.amount.toLocaleString()}{g.type === "yearly" ? "/yr" : " one-off"}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Missed goals — honest disclosure */}
        {missed.length > 0 && (
          <div style={{
            paddingTop: hit.length > 0 ? 14 : 0,
            borderTop: hit.length > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
          }}>
            <div style={{
              fontSize: 11, color: "rgba(245,247,250,0.4)",
              letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700,
              marginBottom: 9,
            }}>
              Not covered by year 30 on the base case
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {missed.map(g => (
                <div key={g.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "6px 11px", borderRadius: 999,
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  fontSize: 11.5, fontWeight: 500,
                  color: "rgba(245,247,250,0.55)",
                }}>
                  <span style={{ fontSize: 13, lineHeight: 1 }}>{g.emoji}</span>
                  {g.name}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{
          marginTop: 14, fontSize: 11,
          color: "rgba(245,247,250,0.35)", lineHeight: 1.5,
        }}>
          Year a goal is &quot;covered&quot; = the first year this property&apos;s after-tax cashflow alone meets the goal amount. Capital growth not counted.
        </div>
      </div>
    </motion.div>
  );
}
