import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Sparkles, ArrowRight, Target, Edit3, RefreshCw } from "lucide-react";
import {
  GOAL_CATALOGUE,
  saveGoals,
  loadStoredGoals,
} from "../components/GoalsOnboarding.jsx";
import {
  MODEL_DEFAULTS,
  generateCashflow,
  calcAchievements,
  fmt,
  fmtFull,
  cellSpectrum,
  yearTurnsPositive,
} from "../core/cashflow.js";
import WealthGrid from "../components/WealthGrid.jsx";
import { computeWealthProjection, fmtMoneyShort } from "../core/wealthProjection.js";

/**
 * GoalsScreen — the emotional centre of the app.
 * One simple page: pick goals, pick a property, watch when each goal hits on
 * the 30-year cashflow brick. Everything else (numbers, advanced metrics)
 * lives elsewhere. This page is for the question only buyers actually ask:
 * "what is this property paying for in my life?"
 */

// Compact 30-year brick with emoji markers above each year a goal hits.
// We keep cells big (18px) because this brick is the page's hero.
// horizonYear (optional 1–30) draws a vertical "your exit" line so people
// who plan to hold for 10 or 20 years see exactly where their story ends.
function GoalsBrick({ cashflow, achievements, breakEven, horizonYear }) {
  const COLS = 30;
  const ROWS = 12;
  const CELL = 18;
  const GAP = 3;
  const gridWidth = COLS * CELL + (COLS - 1) * GAP;

  // Group achievements by yearHit so we can stack emojis when multiple goals
  // hit in the same year (e.g. dinners + bali both crossed at year 4).
  // We dedupe by emoji+name+amount so two goals that look identical (legacy
  // SEED_GOALS + a freshly-picked catalogue goal sharing the same emoji)
  // can't double up on the brick.
  const markersByYear = useMemo(() => {
    const map = new Map();
    const seen = new Set();
    for (const a of achievements) {
      if (!a.yearHit || a.yearHit > 30) continue;
      const dedupeKey = `${a.emoji}|${a.name}|${a.amount}|${a.type}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      if (!map.has(a.yearHit)) map.set(a.yearHit, []);
      map.get(a.yearHit).push(a);
    }
    return map;
  }, [achievements]);

  // Render one cell column-major (matches CashflowGrid)
  const cells = useMemo(() => {
    const out = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        out.push({
          idx: c * ROWS + r,
          value: cashflow[c * ROWS + r] ?? 0,
          col: c,
          row: r,
        });
      }
    }
    return out;
  }, [cashflow]);

  return (
    <div style={{ position: "relative", width: gridWidth, margin: "0 auto" }}>
      {/* Marker row — emoji + tiny year label, above the brick */}
      <div style={{ position: "relative", height: 64, marginBottom: 4 }}>
        {[...markersByYear.entries()].map(([year, list]) => {
          const x = (year - 1) * (CELL + GAP) + CELL / 2;
          // Stack vertically inside a fixed column so multiple goals don't overlap
          return (
            <div key={year} style={{
              position: "absolute",
              left: x, top: 0, bottom: 0,
              transform: "translateX(-50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              pointerEvents: "none",
            }}>
              <div style={{
                display: "flex", flexDirection: "column", gap: 1, alignItems: "center",
              }}>
                {list.slice(0, 3).map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.4 + year * 0.025 + i * 0.05, duration: 0.45,
                      ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      fontSize: 18, lineHeight: 1,
                      filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.55))",
                    }}>
                    {a.emoji}
                  </motion.div>
                ))}
                {list.length > 3 && (
                  <div style={{
                    fontSize: 9, color: "rgba(245,247,250,0.55)", fontWeight: 700,
                    background: "rgba(255,255,255,0.08)", borderRadius: 999,
                    padding: "1px 5px",
                  }}>+{list.length - 3}</div>
                )}
              </div>
              <div style={{ width: 1, height: 8, background: "rgba(251,191,36,0.6)" }} />
              <div style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: 0.18,
                color: "#FCD34D", textTransform: "uppercase", marginTop: 1,
              }}>Y{year}</div>
            </div>
          );
        })}
      </div>

      {/* The brick itself */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
        gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`,
        gap: `${GAP}px`, gridAutoFlow: "column",
        position: "relative",
      }}>
        {cells.map(c => {
          const s = cellSpectrum(c.value);
          // After the user's chosen exit year, dim cells so the in-horizon
          // window stays the visual focus.
          const dim = horizonYear && c.col >= horizonYear;
          return (
            <motion.div key={c.idx}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: dim ? s.opacity * 0.28 : s.opacity, scale: 1 }}
              transition={{ delay: c.col * 0.015, duration: 0.4,
                ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: CELL, height: CELL, borderRadius: 3,
                background: s.color,
              }} />
          );
        })}
        {/* Vertical "your exit" line at the chosen horizon year */}
        {horizonYear && horizonYear <= COLS && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.85 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            style={{
              position: "absolute",
              left: horizonYear * (CELL + GAP) - GAP / 2 - 0.75,
              top: -6, bottom: -6,
              width: 1.5,
              background: "linear-gradient(180deg, rgba(96,165,250,0.85) 0%, rgba(96,165,250,0.25) 100%)",
              boxShadow: "0 0 6px rgba(96,165,250,0.55)",
              pointerEvents: "none",
            }} />
        )}
      </div>

      {/* Year axis below the brick — every 5 years */}
      <div style={{ position: "relative", height: 18, marginTop: 6 }}>
        {[1, 5, 10, 15, 20, 25, 30].map(y => {
          const x = (y - 1) * (CELL + GAP) + CELL / 2;
          return (
            <div key={y} style={{
              position: "absolute",
              left: x, top: 0,
              transform: "translateX(-50%)",
              fontSize: 10, fontWeight: 600, letterSpacing: 0.1,
              color: "rgba(245,247,250,0.4)",
            }}>Y{y}</div>
          );
        })}
      </div>

      {/* Break-even pill, anchored at the year cashflow turns positive */}
      {breakEven && (
        <div style={{
          position: "absolute", bottom: -42,
          left: ((breakEven - 1) * (CELL + GAP) + CELL / 2),
          transform: "translateX(-50%)",
        }}>
          <div style={{
            background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
            color: "#0B0E14",
            fontSize: 10.5, fontWeight: 900, letterSpacing: 0.15,
            padding: "4px 10px", borderRadius: 999,
            whiteSpace: "nowrap",
            boxShadow: "0 8px 18px -6px rgba(16,185,129,0.5)",
          }}>
            PAYS YOU FROM Y{breakEven}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact goals editor — a chip for every goal in the catalogue.
// Tap to toggle; if selected, the dollar amount is editable inline.
function GoalsEditor({ goals, onChange }) {
  const goalsById = useMemo(() => {
    const map = new Map();
    for (const g of goals) {
      const baseId = g.id.replace(/^g_/, "");
      map.set(baseId, g);
    }
    return map;
  }, [goals]);

  const toggle = useCallback((cat) => {
    const baseId = cat.id;
    if (goalsById.has(baseId)) {
      onChange(goals.filter(g => g.id !== `g_${baseId}`));
    } else {
      const newGoal = {
        id: `g_${baseId}`,
        emoji: cat.emoji,
        name: cat.name,
        amount: cat.defaultAmount,
        type: cat.type,
      };
      onChange([...goals, newGoal]);
    }
  }, [goals, goalsById, onChange]);

  const updateAmount = useCallback((id, amount) => {
    onChange(goals.map(g => g.id === id ? { ...g, amount: Number(amount) || 0 } : g));
  }, [goals, onChange]);

  return (
    <div className="goals-editor-grid" style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: 10,
    }}>
      {GOAL_CATALOGUE.map(cat => {
        const selected = goalsById.has(cat.id);
        const goal = goalsById.get(cat.id);
        const hint = cat.hint;
        return (
          <div key={cat.id}
            style={{
              position: "relative",
              background: selected
                ? "linear-gradient(180deg, rgba(251,113,133,0.16) 0%, rgba(251,113,133,0.06) 100%)"
                : "rgba(255,255,255,0.03)",
              border: selected
                ? "1px solid rgba(251,113,133,0.5)"
                : "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: "12px 14px",
              transition: "background 0.2s, border-color 0.2s",
            }}>
            <button onClick={() => toggle(cat)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%",
                background: "transparent", border: "none",
                cursor: "pointer", padding: 0, textAlign: "left",
                marginBottom: selected ? 8 : 0,
              }}>
              <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{cat.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: "#F5F7FA", fontSize: 13, fontWeight: 600,
                  letterSpacing: -0.01, lineHeight: 1.2,
                }}>{cat.name}</div>
                <div style={{
                  color: "rgba(245,247,250,0.42)", fontSize: 10.5,
                  marginTop: 2,
                }}>{selected ? "Tap to remove" : "Tap to add"}</div>
              </div>
            </button>
            {selected && goal && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10, padding: "8px 10px",
              }}>
                <span style={{ color: "rgba(245,247,250,0.5)", fontSize: 12.5 }}>$</span>
                <input
                  type="number"
                  min={0} step={500}
                  value={goal.amount}
                  onChange={e => updateAmount(goal.id, e.target.value)}
                  style={{
                    flex: 1, width: 0, minWidth: 0,
                    background: "transparent", border: "none", outline: "none",
                    color: "#F5F7FA", fontSize: 13, fontWeight: 600,
                    fontVariantNumeric: "tabular-nums", fontFamily: "inherit",
                  }} />
                <span style={{ color: "rgba(245,247,250,0.42)", fontSize: 10.5 }}>{hint}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Pick which property to visualise the goals against. Three quick suggestions
// + a select dropdown for the rest.
function PropertyPicker({ properties, selectedId, onSelect }) {
  // Prefer the top three by earliest break-even (most likely to cover goals)
  const topPicks = useMemo(() => {
    const scored = properties.map(p => ({
      p,
      breakEven: yearTurnsPositive(generateCashflow(p)) ?? 999,
    }));
    scored.sort((a, b) => a.breakEven - b.breakEven);
    return scored.slice(0, 3).map(s => s.p);
  }, [properties]);

  return (
    <div className="goals-picker" style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8,
    }}>
      <span style={{
        fontSize: 11.5, letterSpacing: 0.18, textTransform: "uppercase",
        color: "rgba(245,247,250,0.55)", fontWeight: 700, marginRight: 4,
      }}>See against</span>
      {topPicks.map(p => {
        const selected = p.id === selectedId;
        const label = (p.suburb || "").split(",")[0].trim();
        return (
          <button key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              cursor: "pointer",
              background: selected
                ? "linear-gradient(135deg, rgba(251,113,133,0.22) 0%, rgba(251,113,133,0.08) 100%)"
                : "rgba(255,255,255,0.04)",
              border: selected
                ? "1px solid rgba(251,113,133,0.55)"
                : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "8px 12px",
              color: selected ? "#FECDD3" : "rgba(245,247,250,0.85)",
              fontSize: 12.5, fontWeight: 600,
              letterSpacing: -0.01,
            }}>
            {label} · ${(p.price / 1000).toFixed(0)}k
          </button>
        );
      })}
      <select
        value={topPicks.find(p => p.id === selectedId) ? "" : (selectedId || "")}
        onChange={e => {
          const v = e.target.value;
          if (v === "") return; // ignore the placeholder option
          onSelect(Number(v));
        }}
        style={{
          cursor: "pointer",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "8px 12px",
          color: "rgba(245,247,250,0.85)",
          fontSize: 12.5, fontWeight: 600,
          appearance: "none",
        }}>
        <option value="" style={{ background: "#0A0D12" }}>or pick another property…</option>
        {properties
          .filter(p => !topPicks.find(tp => tp.id === p.id))
          .map(p => (
            <option key={p.id} value={p.id} style={{ background: "#0A0D12" }}>
              {(p.suburb || "").split(",")[0].trim()} · ${(p.price / 1000).toFixed(0)}k
            </option>
          ))}
      </select>
    </div>
  );
}

function WealthTile({ label, value, sub, accent, bg, border }) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{
        fontSize: 10, letterSpacing: 0.18, textTransform: "uppercase",
        color: "rgba(245,247,250,0.55)", fontWeight: 700, marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: 'ui-serif, Georgia, serif',
        fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em",
        color: accent, lineHeight: 1.05, marginBottom: 4,
        fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      <div style={{
        fontSize: 11, color: "rgba(245,247,250,0.5)",
        lineHeight: 1.35,
      }}>{sub}</div>
    </div>
  );
}

// Build a vars shape for computeWealthProjection from a property + assumptions.
function buildWealthVars(property, marginalRate) {
  const price = property?.price || 0;
  return {
    price,
    deposit: 20,
    rate: (MODEL_DEFAULTS.rate ?? 0.0639) * 100,
    growthPct: property?.growthPct || 5,
    marginalRate,
    build: property?.build || "existing",
    state: property?.state || "NSW",
    loanType: "io",
    rentPerWeek: Math.round(((property?.price || 0) * ((property?.yieldPct || 4) / 100)) / 52),
    rentGrowth: 3,
    pporYears: 0,
  };
}

export default function GoalsScreen({ properties, goals, onChangeGoals, onOpen, onTab }) {
  // Default to whichever property has the earliest break-even — the one most likely
  // to make the goal-marker viz feel like magic.
  const defaultPropertyId = useMemo(() => {
    if (!properties?.length) return null;
    const scored = properties.map(p => ({
      id: p.id,
      breakEven: yearTurnsPositive(generateCashflow(p)) ?? 999,
    }));
    scored.sort((a, b) => a.breakEven - b.breakEven);
    return scored[0].id;
  }, [properties]);
  const [selectedId, setSelectedId] = useState(defaultPropertyId);
  const [horizonYears, setHorizonYears] = useState(30);
  const [marginalRate, setMarginalRate] = useState(39);
  const selectedProperty = properties.find(p => p.id === selectedId) || properties[0];

  // Persist any goals change immediately
  const handleGoalsChange = useCallback((next) => {
    saveGoals(next);
    onChangeGoals(next);
  }, [onChangeGoals]);

  // Compute cashflow + goal achievements for the chosen property at the
  // user's chosen tax bracket — so what they see on the brick is what they'd
  // actually take home (negative gearing applied at THEIR marginal rate).
  const cashflowConfig = useMemo(() => {
    if (!selectedProperty) return null;
    return { ...selectedProperty, marginalRate: marginalRate / 100 };
  }, [selectedProperty, marginalRate]);
  const cashflow = useMemo(
    () => cashflowConfig ? generateCashflow(cashflowConfig) : new Array(360).fill(0),
    [cashflowConfig]
  );
  const breakEvenYear = useMemo(() => yearTurnsPositive(cashflow), [cashflow]);
  const achievements = useMemo(
    () => goals?.length ? calcAchievements(cashflow, goals) : [],
    [cashflow, goals]
  );
  const covered = achievements.filter(a => a.yearHit && a.yearHit <= horizonYears);
  const notCovered = achievements.filter(a => !a.yearHit || a.yearHit > horizonYears);

  // Wealth projection — monthly equity + loan balance for the WealthGrid.
  const wealthVars = useMemo(
    () => selectedProperty ? buildWealthVars(selectedProperty, marginalRate) : null,
    [selectedProperty, marginalRate],
  );
  const wealthProjection = useMemo(
    () => (wealthVars ? computeWealthProjection(wealthVars, cashflow) : null),
    [wealthVars, cashflow],
  );
  const equitySeries = wealthProjection?.equitySeries ?? [];
  const equityAtHorizon = equitySeries[horizonYears - 1] || 0;
  const lifetimeNetInHorizon = useMemo(() => {
    const months = horizonYears * 12;
    return cashflow.slice(0, months).reduce((s, x) => s + x, 0);
  }, [cashflow, horizonYears]);
  const totalWealth = equityAtHorizon + Math.max(0, lifetimeNetInHorizon);

  const noGoals = !goals || goals.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.32 }}
      style={{
        maxWidth: 1240, margin: "0 auto",
        padding: "16px 28px 80px",
      }}>
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        marginBottom: 32,
        paddingTop: 20,
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "5px 11px", borderRadius: 999,
          background: "rgba(251,113,133,0.10)",
          border: "1px solid rgba(251,113,133,0.28)",
          color: "#FECDD3",
          fontSize: 10.5, fontWeight: 700, letterSpacing: 0.16, textTransform: "uppercase",
          marginBottom: 14,
        }}>
          <Target size={11} strokeWidth={2.4} color="#FB7185" />
          Your goals
        </div>
        <h1 style={{
          margin: "0 0 12px",
          fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
          fontSize: "clamp(34px, 4.5vw, 52px)",
          fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "#F5F7FA",
        }}>
          What is this property{" "}
          <span style={{
            fontStyle: "italic", fontWeight: 500,
            background: "linear-gradient(90deg, #FDE2E8 0%, #FB7185 60%, #FB923C 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>actually paying for</span>?
        </h1>
        <p style={{
          margin: 0, maxWidth: 660,
          fontSize: 17, lineHeight: 1.55,
          color: "rgba(245,247,250,0.7)",
        }}>
          Re-read every cashflow forecast through your real life. Watch each goal
          land on the 30-year map — the year it gets covered, plain as day.
        </p>
      </div>

      {/* ── Goals editor ───────────────────────────────────────────── */}
      <section style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20, padding: "26px 26px 24px",
        marginBottom: 28,
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, marginBottom: 14,
        }}>
          <div>
            <div style={{
              fontSize: 11, letterSpacing: 0.18, textTransform: "uppercase",
              color: "rgba(245,247,250,0.5)", fontWeight: 700, marginBottom: 4,
            }}>Step 1</div>
            <h2 style={{
              margin: 0,
              fontFamily: 'ui-serif, Georgia, serif',
              fontSize: 22, fontWeight: 500, color: "#F5F7FA",
              letterSpacing: "-0.02em",
            }}>What are your goals?</h2>
          </div>
          {goals?.length > 0 && (
            <button
              onClick={() => handleGoalsChange([])}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                cursor: "pointer",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10, padding: "8px 12px",
                color: "rgba(245,247,250,0.6)",
                fontSize: 12, fontWeight: 600,
              }}>
              <RefreshCw size={11} strokeWidth={2.2} />
              Reset
            </button>
          )}
        </div>
        <GoalsEditor goals={goals || []} onChange={handleGoalsChange} />
        <p style={{
          margin: "16px 2px 0",
          fontSize: 12, lineHeight: 1.55, color: "rgba(245,247,250,0.45)",
        }}>
          Numbers are in AUD. Tap any goal to adjust the amount — defaults are a sensible starting point.
        </p>
      </section>

      {/* ── The visualisation ───────────────────────────────────────── */}
      {selectedProperty && (
        <section style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24, padding: "32px 30px 36px",
          position: "relative", overflow: "hidden",
        }}>
          <div aria-hidden style={{
            position: "absolute", top: -120, right: -100,
            width: 360, height: 360, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,113,133,0.10) 0%, transparent 65%)",
            filter: "blur(60px)", pointerEvents: "none",
          }} />

          <div style={{
            display: "flex", flexWrap: "wrap", justifyContent: "space-between",
            alignItems: "flex-end", gap: 16, marginBottom: 22,
          }}>
            <div>
              <div style={{
                fontSize: 11, letterSpacing: 0.18, textTransform: "uppercase",
                color: "rgba(245,247,250,0.5)", fontWeight: 700, marginBottom: 4,
              }}>Step 2 · Watch them land</div>
              <h2 style={{
                margin: 0,
                fontFamily: 'ui-serif, Georgia, serif',
                fontSize: 26, fontWeight: 500, color: "#F5F7FA",
                letterSpacing: "-0.02em", lineHeight: 1.15,
              }}>
                Your {horizonYears}-year map, marked with{" "}
                <span style={{ fontStyle: "italic" }}>your</span> milestones
              </h2>
            </div>
            <PropertyPicker
              properties={properties}
              selectedId={selectedId}
              onSelect={setSelectedId} />
          </div>

          {/* Horizon switch + tax bracket — shape the brick honestly to YOUR
              numbers. Tax bracket flips negative gearing on/off in real time. */}
          <div className="goals-horizon-row" style={{
            display: "flex", flexWrap: "wrap", alignItems: "center",
            gap: 18, marginBottom: 22,
          }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 11, letterSpacing: 0.18, textTransform: "uppercase",
                color: "rgba(245,247,250,0.55)", fontWeight: 700,
              }}>I plan to hold for</span>
              <div style={{
                display: "inline-flex", padding: 3, gap: 2,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 999,
              }}>
                {[10, 20, 30].map(y => {
                  const on = horizonYears === y;
                  return (
                    <button key={y} onClick={() => setHorizonYears(y)}
                      style={{
                        cursor: "pointer", border: "none",
                        borderRadius: 999, padding: "7px 14px",
                        fontSize: 12, fontWeight: 700, letterSpacing: -0.02,
                        background: on
                          ? "linear-gradient(135deg, rgba(96,165,250,0.22), rgba(96,165,250,0.10))"
                          : "transparent",
                        color: on ? "#BFDBFE" : "rgba(245,247,250,0.55)",
                        boxShadow: on
                          ? "0 0 0 1px rgba(96,165,250,0.45) inset"
                          : "none",
                      }}>
                      {y} years
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 11, letterSpacing: 0.18, textTransform: "uppercase",
                color: "rgba(245,247,250,0.55)", fontWeight: 700,
              }}>Tax bracket</span>
              <div style={{
                display: "inline-flex", padding: 3, gap: 2,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 999,
              }}>
                {[16, 30, 37, 45].map(b => {
                  const on = marginalRate === b;
                  return (
                    <button key={b} onClick={() => setMarginalRate(b)}
                      style={{
                        cursor: "pointer", border: "none",
                        borderRadius: 999, padding: "7px 12px",
                        fontSize: 12, fontWeight: 700, letterSpacing: -0.02,
                        background: on
                          ? "linear-gradient(135deg, rgba(251,191,36,0.22), rgba(251,191,36,0.08))"
                          : "transparent",
                        color: on ? "#FDE68A" : "rgba(245,247,250,0.55)",
                        boxShadow: on
                          ? "0 0 0 1px rgba(251,191,36,0.45) inset"
                          : "none",
                      }}>
                      {b}%
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{
            margin: "-12px 2px 22px", fontSize: 11.5, lineHeight: 1.5,
            color: "rgba(245,247,250,0.45)",
          }}>
            Brick shown is <strong style={{ color: "rgba(245,247,250,0.7)" }}>after-tax</strong> — negative gearing
            losses are refunded at your {marginalRate}% bracket each year (where eligible under 2026 budget rules).
          </div>

          {noGoals ? (
            <div style={{
              padding: "60px 24px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.025)",
              border: "1px dashed rgba(255,255,255,0.12)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 38, marginBottom: 8 }}>🎯</div>
              <div style={{
                fontSize: 17, fontWeight: 600, color: "#F5F7FA",
                letterSpacing: -0.01, marginBottom: 6,
              }}>
                Pick a goal above to start
              </div>
              <div style={{
                fontSize: 13.5, color: "rgba(245,247,250,0.55)",
                lineHeight: 1.5, maxWidth: 420, margin: "0 auto",
              }}>
                Each goal you add will land on the 30-year cashflow map at the year
                this property has earned enough to cover it.
              </div>
            </div>
          ) : (
            <>
              {/* Cashflow brick — goals as emojis */}
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 0.16, textTransform: "uppercase",
                color: "#FB7185", marginBottom: 4,
              }}>30-year cashflow · what pays for your life</div>
              <div style={{
                display: "flex", justifyContent: "center",
                padding: "12px 4px 60px",
                overflowX: "auto",
              }}>
                <GoalsBrick
                  cashflow={cashflow}
                  achievements={achievements}
                  breakEven={breakEvenYear}
                  horizonYear={horizonYears} />
              </div>

              {/* Wealth brick — equity built alongside the cashflow story */}
              {wealthProjection && (
                <div style={{
                  marginTop: -36, marginBottom: 24,
                  background: "linear-gradient(180deg, rgba(251,191,36,0.06), rgba(255,255,255,0.012))",
                  border: "1px solid rgba(251,191,36,0.18)",
                  borderRadius: 18, padding: "20px 22px",
                }}>
                  <div style={{
                    display: "flex", flexWrap: "wrap", alignItems: "baseline",
                    justifyContent: "space-between", gap: 10, marginBottom: 14,
                  }}>
                    <div>
                      <div style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.16, textTransform: "uppercase",
                        color: "#FBBF24", marginBottom: 4,
                      }}>30-year wealth · what you'll be worth</div>
                      <div style={{
                        fontFamily: 'ui-serif, Georgia, serif', fontSize: 18, fontWeight: 500,
                        color: "#F5F7FA", letterSpacing: "-0.01em",
                      }}>
                        Equity grows from your deposit to{" "}
                        <span style={{ color: "#FBBF24" }}>{fmtMoneyShort(equitySeries[29] || 0)}</span>
                        {" "}by year 30
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", overflowX: "auto" }}>
                    <WealthGrid
                      monthlyEquity={wealthProjection.monthlyEquity}
                      loanBalance={wealthProjection.loanBalance}
                      depositEquity={wealthProjection.depositEquity}
                      cell={9} gap={2}
                      showLoanStrip={false}
                      showYearCallouts
                    />
                  </div>
                </div>
              )}

              {/* Equity + wealth at horizon — answers "what am I worth at
                  the end of my hold?" without leaving the goals page. */}
              <div className="goals-wealth-strip" style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12, marginBottom: 4,
              }}>
                <WealthTile
                  label={`Equity at year ${horizonYears}`}
                  value={fmt(equityAtHorizon)}
                  sub="What you'd walk away with"
                  accent="#FBBF24"
                  bg="rgba(251,191,36,0.06)"
                  border="rgba(251,191,36,0.20)"
                />
                <WealthTile
                  label={`Cashflow ${horizonYears}yr`}
                  value={fmt(lifetimeNetInHorizon)}
                  sub={lifetimeNetInHorizon >= 0 ? "Net into your pocket (after-tax)" : "Total bleed before exit (after-tax)"}
                  accent={lifetimeNetInHorizon >= 0 ? "#86EFAC" : "#FCA5A5"}
                  bg={lifetimeNetInHorizon >= 0 ? "rgba(34,197,94,0.06)" : "rgba(244,63,94,0.06)"}
                  border={lifetimeNetInHorizon >= 0 ? "rgba(34,197,94,0.20)" : "rgba(244,63,94,0.20)"}
                />
                <WealthTile
                  label="Total wealth"
                  value={fmt(totalWealth)}
                  sub="Equity + net cashflow"
                  accent="#FCD34D"
                  bg="rgba(252,211,77,0.06)"
                  border="rgba(252,211,77,0.22)"
                />
              </div>

              {/* Goal coverage summary */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16, marginTop: 16,
              }} className="goals-coverage">
                <div style={{
                  background: "rgba(34,197,94,0.07)",
                  border: "1px solid rgba(34,197,94,0.22)",
                  borderRadius: 14, padding: "16px 18px",
                }}>
                  <div style={{
                    fontSize: 10.5, letterSpacing: 0.16, textTransform: "uppercase",
                    color: "#86EFAC", fontWeight: 700, marginBottom: 8,
                  }}>Covered by this property</div>
                  {covered.length === 0 ? (
                    <div style={{ fontSize: 13.5, color: "rgba(245,247,250,0.55)" }}>
                      None yet. Try a stronger cashflow property above, or scale your goal amounts down.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {covered
                        .sort((a, b) => a.yearHit - b.yearHit)
                        .map(a => (
                          <div key={a.id} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            fontSize: 13.5, color: "#F5F7FA",
                          }}>
                            <span style={{ fontSize: 16 }}>{a.emoji}</span>
                            <span style={{ flex: 1 }}>{a.name}</span>
                            <span style={{
                              color: "#86EFAC", fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                            }}>Year {a.yearHit}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div style={{
                  background: "rgba(244,63,94,0.06)",
                  border: "1px solid rgba(244,63,94,0.20)",
                  borderRadius: 14, padding: "16px 18px",
                }}>
                  <div style={{
                    fontSize: 10.5, letterSpacing: 0.16, textTransform: "uppercase",
                    color: "#FDA4AF", fontWeight: 700, marginBottom: 8,
                  }}>Not covered in {horizonYears} years</div>
                  {notCovered.length === 0 ? (
                    <div style={{ fontSize: 13.5, color: "rgba(245,247,250,0.55)" }}>
                      Every goal lands inside your {horizonYears}-year window on this property. That's the dream.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {notCovered.map(a => (
                        <div key={a.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          fontSize: 13.5, color: "#F5F7FA",
                        }}>
                          <span style={{ fontSize: 16, opacity: 0.55 }}>{a.emoji}</span>
                          <span style={{ flex: 1 }}>{a.name}</span>
                          <span style={{
                            color: "rgba(245,247,250,0.45)", fontWeight: 600,
                            fontSize: 12,
                          }}>{fmtFull(a.amount)} {a.type === "yearly" ? "/yr" : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CTA — drill into property */}
              <button onClick={() => onOpen?.(selectedProperty.id)}
                style={{
                  marginTop: 22, width: "100%",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #FB7185 0%, #C9374F 100%)",
                  border: "none", borderRadius: 14,
                  padding: "16px 22px",
                  color: "#fff", fontSize: 14.5, fontWeight: 700,
                  letterSpacing: "-0.01em",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 18px 36px -12px rgba(244,63,94,0.5)",
                }}>
                Open the full 30-year map for {(selectedProperty.suburb || "").split(",")[0].trim()}
                <ArrowRight size={15} strokeWidth={2.4} />
              </button>
            </>
          )}
        </section>
      )}

      <style>{`
        .goals-coverage { grid-template-columns: 1fr 1fr; }
        .goals-wealth-strip { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 720px) {
          .goals-coverage { grid-template-columns: 1fr; }
          .goals-wealth-strip { grid-template-columns: 1fr; }
          .goals-picker { width: 100%; }
          .goals-horizon-row { width: 100%; }
        }
      `}</style>
    </motion.div>
  );
}
