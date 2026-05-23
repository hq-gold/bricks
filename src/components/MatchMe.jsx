import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Wallet, Briefcase, Target, MapPin, Home, Compass, Sparkles, Check, ChevronRight } from "lucide-react";
import { findMatches, marginalRateFor } from "../core/matchEngine.js";

// "Tell us your situation, we'll find your 5 best properties" — the top-down
// 60-second match. Two steps, then results. No login, no spam.

const STATE_OPTIONS = [
  { id: "NSW", l: "NSW" },
  { id: "VIC", l: "VIC" },
  { id: "QLD", l: "QLD" },
  { id: "WA", l: "WA" },
  { id: "SA", l: "SA" },
  { id: "ACT", l: "ACT" },
  { id: "TAS", l: "TAS" },
];

const TYPE_OPTIONS = [
  { id: "house", l: "House" },
  { id: "townhouse", l: "Townhouse" },
  { id: "apartment", l: "Apartment" },
];

const STRATEGY_OPTIONS = [
  { id: "cashflow", l: "Cashflow first", desc: "Pay me back fast" },
  { id: "growth", l: "Growth first", desc: "Build long-term wealth" },
  { id: "balanced", l: "Balanced", desc: "Bit of both" },
];

const PLAN_OPTIONS = [
  { id: "ip", l: "Pure investment", desc: "Rented from day one" },
  { id: "livein-1", l: "Live 1yr, then rent", desc: "Settle in, then convert" },
  { id: "livein-3", l: "Live 3yr, then rent", desc: "Family stepping stone" },
  { id: "livein-6", l: "Live 6yr, then rent", desc: "Long PPOR, CGT-friendly" },
];

function formatMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}

// Tax bracket reference — keep aligned with Browse hero's bracketRates
const BRACKETS = [
  { id: "low",  pct: 19, rate: 0.19, label: "19% bracket", sub: "$18.2k–$45k" },
  { id: "mid",  pct: 30, rate: 0.30, label: "30% bracket", sub: "$45k–$135k" },
  { id: "high", pct: 37, rate: 0.37, label: "37% bracket", sub: "$135k–$190k" },
  { id: "top",  pct: 45, rate: 0.45, label: "45% bracket", sub: "$190k+" },
];

export default function MatchMe({ open, onClose, properties, onOpenProperty }) {
  const [step, setStep] = useState(0);
  const [deposit, setDeposit] = useState(180_000);
  const [salary, setSalary] = useState(140_000);
  // Explicit bracket override — null means "follow my salary".
  // Once user clicks a bracket chip we honour their pick verbatim.
  const [bracketOverride, setBracketOverride] = useState(null);
  const [strategy, setStrategy] = useState("balanced");
  const [states, setStates] = useState(new Set(["NSW", "VIC", "QLD"]));
  const [types, setTypes] = useState(new Set(["house", "townhouse", "apartment"]));
  const [maxBudget, setMaxBudget] = useState(1_200_000);
  const [plan, setPlan] = useState("ip");
  const [horizonYears, setHorizonYears] = useState(20);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Effective marginal rate: explicit override wins, else derived from salary
  const effectiveMR = useMemo(
    () => bracketOverride != null ? bracketOverride : marginalRateFor(salary),
    [bracketOverride, salary]
  );

  const prefs = useMemo(() => ({
    deposit,
    salary,
    marginalRate: effectiveMR,
    strategy,
    states: [...states],
    types: [...types],
    maxBudget,
    plan,
    horizonYears,
  }), [deposit, salary, effectiveMR, strategy, states, types, maxBudget, plan, horizonYears]);

  const matches = useMemo(
    () => step === 2 ? findMatches(properties || [], prefs, 5) : [],
    [step, properties, prefs],
  );

  const toggle = (setter) => (id) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "fixed", inset: 0, zIndex: 950,
          background: "rgba(5,7,10,0.88)",
          backdropFilter: "blur(16px)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "60px 20px 20px",
          overflowY: "auto",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 18 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            width: "100%", maxWidth: step === 2 ? 920 : 680,
            background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 24, overflow: "hidden",
            boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset, 0 70px 130px -40px rgba(0,0,0,0.85)",
            color: "#F5F7FA",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          }}
        >
          {/* Atmospheric accent */}
          <div aria-hidden style={{
            position: "absolute", top: -160, left: -100,
            width: 360, height: 360, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,113,133,0.16) 0%, transparent 60%)",
            filter: "blur(50px)", pointerEvents: "none",
          }} />

          {/* Close */}
          <button onClick={onClose} aria-label="Close"
            style={{
              position: "absolute", top: 18, right: 18, zIndex: 4,
              width: 32, height: 32, borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(245,247,250,0.7)",
            }}>
            <X size={15} strokeWidth={2.4} />
          </button>

          {/* Progress */}
          <div style={{ display: "flex", gap: 6, padding: "20px 28px 0" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 999,
                background: i <= step ? "linear-gradient(90deg, #FB7185, #F43F5E)" : "rgba(255,255,255,0.08)",
                transition: "background 0.3s",
              }} />
            ))}
          </div>

          <div style={{ padding: "22px 32px 24px", position: "relative", zIndex: 1 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "5px 11px", borderRadius: 999,
              background: "rgba(251,113,133,0.12)",
              border: "1px solid rgba(251,113,133,0.32)",
              fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
              color: "#FECDD3", marginBottom: 16,
            }}>
              <Sparkles size={11} strokeWidth={2.4} color="#FB7185" fill="#FB7185" />
              {step === 0 ? "60 seconds" : step === 1 ? "Almost there" : "Your matches"}
            </div>

            <AnimatePresence mode="wait">
              {/* ─── STEP 1 ── */}
              {step === 0 && (
                <motion.div key="s0"
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.3 }}>
                  <h2 style={headlineStyle}>What&apos;s your{" "}
                    <span style={accentStyle}>situation</span>?</h2>
                  <p style={leadStyle}>Two answers we need. We&apos;ll figure out your tax bracket.</p>

                  <FieldLabel icon={Wallet} text={`Deposit you can put down — ${formatMoney(deposit)}`} />
                  <RangeInput value={deposit} min={20_000} max={600_000} step={5_000}
                    onChange={setDeposit} />

                  <div style={{ height: 14 }} />

                  <FieldLabel
                    icon={Briefcase}
                    text={`Your annual income — ${formatMoney(salary)}`}
                    sub={bracketOverride != null
                      ? `Bracket override: ${Math.round(bracketOverride * 100)}%`
                      : `Auto bracket: ${Math.round(marginalRateFor(salary) * 100)}%`} />
                  <RangeInput value={salary} min={45_000} max={400_000} step={5_000}
                    onChange={(v) => { setSalary(v); }} />

                  <div style={{ height: 14 }} />

                  <FieldLabel
                    icon={Wallet}
                    text="Tax bracket"
                    sub={bracketOverride != null ? "Tap auto to follow your income" : "Tap one to override the auto-pick"} />
                  <div className="match-bracket-row" style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 6, marginBottom: 6,
                  }}>
                    <button
                      onClick={() => setBracketOverride(null)}
                      style={{
                        cursor: "pointer", borderRadius: 9,
                        padding: "8px 8px",
                        background: bracketOverride == null
                          ? "linear-gradient(135deg, rgba(251,113,133,0.22), rgba(251,113,133,0.10))"
                          : "rgba(255,255,255,0.04)",
                        border: bracketOverride == null
                          ? "1px solid rgba(251,113,133,0.45)"
                          : "1px solid rgba(255,255,255,0.08)",
                        color: bracketOverride == null ? "#FECDD3" : "rgba(245,247,250,0.65)",
                        fontSize: 11.5, fontWeight: 700, letterSpacing: -0.02,
                        textAlign: "center",
                      }}>
                      Auto
                    </button>
                    {BRACKETS.map(b => {
                      const selected = bracketOverride === b.rate;
                      return (
                        <button key={b.id}
                          onClick={() => setBracketOverride(b.rate)}
                          title={b.sub}
                          style={{
                            cursor: "pointer", borderRadius: 9,
                            padding: "8px 8px",
                            background: selected
                              ? "linear-gradient(135deg, rgba(251,113,133,0.22), rgba(251,113,133,0.10))"
                              : "rgba(255,255,255,0.04)",
                            border: selected
                              ? "1px solid rgba(251,113,133,0.45)"
                              : "1px solid rgba(255,255,255,0.08)",
                            color: selected ? "#FECDD3" : "rgba(245,247,250,0.65)",
                            fontSize: 11.5, fontWeight: 700, letterSpacing: -0.02,
                            textAlign: "center",
                          }}>
                          {b.pct}%
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ height: 22 }} />

                  <FieldLabel icon={Target} text="Your strategy" />
                  <ChipRow value={strategy} options={STRATEGY_OPTIONS} onChange={setStrategy} columns={3} />
                </motion.div>
              )}

              {/* ─── STEP 2 ── */}
              {step === 1 && (
                <motion.div key="s1"
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.3 }}>
                  <h2 style={headlineStyle}>Where &amp; what{" "}
                    <span style={accentStyle}>kind</span>?</h2>
                  <p style={leadStyle}>Anywhere is fine, but if you have a preference we&apos;ll honour it.</p>

                  <FieldLabel icon={MapPin} text="States" />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
                    {STATE_OPTIONS.map(o => {
                      const on = states.has(o.id);
                      return (
                        <button key={o.id} onClick={() => toggle(setStates)(o.id)}
                          style={pillStyle(on)}>
                          {on && <Check size={11} strokeWidth={3} />}
                          {o.l}
                        </button>
                      );
                    })}
                  </div>

                  <FieldLabel icon={Home} text="Property type" />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 22 }}>
                    {TYPE_OPTIONS.map(o => {
                      const on = types.has(o.id);
                      return (
                        <button key={o.id} onClick={() => toggle(setTypes)(o.id)}
                          style={pillStyle(on)}>
                          {on && <Check size={11} strokeWidth={3} />}
                          {o.l}
                        </button>
                      );
                    })}
                  </div>

                  <FieldLabel icon={Wallet} text={`Max budget — ${formatMoney(maxBudget)}`} />
                  <RangeInput value={maxBudget} min={400_000} max={3_000_000} step={25_000}
                    onChange={setMaxBudget} />

                  <div style={{ height: 22 }} />

                  <FieldLabel icon={Compass} text="Your plan" />
                  <ChipRow value={plan} options={PLAN_OPTIONS} onChange={setPlan} columns={2} />

                  <div style={{ height: 14 }} />

                  <FieldLabel icon={Target} text={`Hold for ${horizonYears} years`} />
                  <div style={{
                    display: "flex", gap: 4, padding: 4,
                    background: "rgba(255,255,255,0.04)", borderRadius: 9,
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}>
                    {[10, 20, 30].map(y => {
                      const on = horizonYears === y;
                      return (
                        <button key={y} onClick={() => setHorizonYears(y)}
                          style={{
                            cursor: "pointer", border: "none", borderRadius: 6, flex: 1,
                            padding: "8px 10px", fontSize: 11.5, fontWeight: 600,
                            background: on ? "rgba(255,255,255,0.12)" : "transparent",
                            color: on ? "#F5F7FA" : "rgba(245,247,250,0.5)",
                          }}>
                          {y} yr
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ─── STEP 3 — RESULTS ── */}
              {step === 2 && (
                <motion.div key="s2"
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.3 }}>
                  <h2 style={headlineStyle}>Your top{" "}
                    <span style={accentStyle}>{matches.length}</span>{" "}
                    {matches.length === 1 ? "match" : "matches"}.</h2>
                  <p style={leadStyle}>
                    Modelled on your deposit ({formatMoney(deposit)}), {Math.round(effectiveMR * 100)}% bracket and {horizonYears}-year hold.
                  </p>

                  {matches.length === 0 ? (
                    <div style={{
                      padding: "28px", borderRadius: 14,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      textAlign: "center", color: "rgba(245,247,250,0.6)", fontSize: 14,
                    }}>
                      Nothing in our current catalogue matches all your filters. Try widening states, types, or budget.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {matches.map((m, i) => (
                        <MatchRow key={m.property.id} match={m} rank={i + 1}
                          onOpen={() => { onOpenProperty?.(m.property.id); onClose?.(); }} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div style={{
            padding: "14px 28px 22px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12,
          }}>
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)}
                style={subtleBtnStyle}>
                <ArrowLeft size={14} strokeWidth={2.4} />
                Back
              </button>
            ) : (
              <button onClick={onClose} style={subtleBtnStyle}>
                Not now
              </button>
            )}

            {step < 2 ? (
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setStep(s => s + 1)}
                style={primaryBtnStyle}>
                {step === 0 ? "Next" : "Show my matches"}
                <ArrowRight size={14} strokeWidth={2.6} />
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setStep(0)}
                style={subtleBtnStyle}>
                Tweak inputs
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function MatchRow({ match, rank, onOpen }) {
  const { property, score, breakEven, exitEquity, irr, reasons, horizon } = match;
  const irrPct = (irr * 100).toFixed(1);
  const exitPct = score >= 78 ? "#86EFAC" : score >= 60 ? "#FCD34D" : "#FCA5A5";
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.995 }}
      onClick={onOpen}
      style={{
        textAlign: "left", cursor: "pointer",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14, padding: "14px 16px",
        color: "#F5F7FA",
        display: "grid",
        gridTemplateColumns: "44px 1fr auto auto",
        gap: 14, alignItems: "center",
      }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: "linear-gradient(135deg, rgba(251,113,133,0.22) 0%, rgba(244,63,94,0.10) 100%)",
        border: "1px solid rgba(251,113,133,0.35)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: "#FECDD3", fontWeight: 700, fontSize: 16,
        letterSpacing: "-0.02em",
      }}>#{rank}</div>

      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: 'ui-serif, Georgia, serif', fontSize: 17, fontWeight: 500,
          color: "#F5F7FA", letterSpacing: "-0.01em", marginBottom: 2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{property.name}</div>
        <div style={{ fontSize: 12, color: "rgba(245,247,250,0.55)", marginBottom: 6 }}>
          {property.suburb} · {property.type} · ${(property.price / 1000).toFixed(0)}k
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {reasons.slice(0, 3).map((r, i) => (
            <span key={i} style={{
              fontSize: 10.5, fontWeight: 500,
              padding: "3px 8px", borderRadius: 999,
              background: r.kind === "good" ? "rgba(74,222,128,0.10)"
                : r.kind === "warn" ? "rgba(252,211,77,0.10)"
                : "rgba(96,165,250,0.10)",
              border: r.kind === "good" ? "1px solid rgba(74,222,128,0.22)"
                : r.kind === "warn" ? "1px solid rgba(252,211,77,0.22)"
                : "1px solid rgba(96,165,250,0.22)",
              color: r.kind === "good" ? "#86EFAC"
                : r.kind === "warn" ? "#FCD34D"
                : "#BFDBFE",
              letterSpacing: "-0.005em",
            }}>{r.text}</span>
          ))}
        </div>
      </div>

      <div className="match-row-stats" style={{
        display: "flex", flexDirection: "column", gap: 4, textAlign: "right", flexShrink: 0,
        minWidth: 96,
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,247,250,0.4)", fontWeight: 700 }}>
            {horizon}-yr IRR
          </div>
          <div style={{
            fontSize: 17, fontWeight: 700, color: exitPct,
            letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", lineHeight: 1.05,
          }}>{irrPct}%</div>
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,247,250,0.4)", fontWeight: 700 }}>
            Equity y{horizon}
          </div>
          <div style={{
            fontSize: 14, fontWeight: 700, color: "#93C5FD",
            letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums", lineHeight: 1.05,
          }}>{formatMoney(exitEquity || 0)}</div>
        </div>
      </div>

      <ChevronRight size={18} color="rgba(245,247,250,0.45)" />
    </motion.button>
  );
}

function RangeInput({ value, min, max, step, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{
        width: "100%", height: 6, borderRadius: 999, appearance: "none",
        cursor: "pointer", outline: "none",
        background: `linear-gradient(to right, #E5485F 0%, #FB7185 ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
      }} />
  );
}

function ChipRow({ value, options, onChange, columns = 3 }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 7,
    }}>
      {options.map(o => {
        const on = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            style={{
              cursor: "pointer", textAlign: "left",
              background: on ? "rgba(251,113,133,0.14)" : "rgba(255,255,255,0.03)",
              border: on ? "1px solid rgba(251,113,133,0.45)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 11, padding: "10px 12px",
              color: "#F5F7FA",
            }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 2 }}>{o.l}</div>
            {o.desc && <div style={{ fontSize: 11, color: "rgba(245,247,250,0.5)" }}>{o.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ icon: Icon, text, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      {Icon && (
        <span style={{
          width: 22, height: 22, borderRadius: 7,
          background: "rgba(251,113,133,0.13)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={12} color="#FB7185" strokeWidth={2.4} />
        </span>
      )}
      <span style={{
        fontSize: 12.5, color: "rgba(245,247,250,0.7)", fontWeight: 500,
        letterSpacing: "-0.005em",
      }}>{text}</span>
      {sub && (
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#FECDD3", fontWeight: 600 }}>{sub}</span>
      )}
    </div>
  );
}

function pillStyle(on) {
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: on ? "rgba(251,113,133,0.14)" : "rgba(255,255,255,0.03)",
    border: on ? "1px solid rgba(251,113,133,0.45)" : "1px solid rgba(255,255,255,0.08)",
    borderRadius: 999, padding: "7px 13px",
    color: "#F5F7FA", fontSize: 12.5, fontWeight: 500,
    cursor: "pointer", letterSpacing: "-0.005em",
  };
}

const headlineStyle = {
  margin: "0 0 8px",
  fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
  fontSize: "clamp(26px, 3.4vw, 32px)",
  fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.12,
  color: "#F5F7FA",
};
const accentStyle = {
  fontStyle: "italic", fontWeight: 500,
  background: "linear-gradient(90deg, #FDE2E8 0%, #FB7185 60%, #FB923C 100%)",
  WebkitBackgroundClip: "text", backgroundClip: "text",
  WebkitTextFillColor: "transparent", color: "transparent",
  display: "inline-block",
  lineHeight: 1.22,
  padding: "0.04em 0 0.18em",
  marginBottom: "-0.18em",
  WebkitBoxDecorationBreak: "clone",
  boxDecorationBreak: "clone",
};
const leadStyle = {
  margin: "0 0 22px",
  fontSize: 14, color: "rgba(245,247,250,0.62)",
  lineHeight: 1.55, letterSpacing: "-0.005em",
};
const subtleBtnStyle = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "transparent", border: "none",
  color: "rgba(245,247,250,0.7)", fontSize: 13.5, fontWeight: 600,
  cursor: "pointer", padding: "10px 6px",
  letterSpacing: "-0.005em",
};
const primaryBtnStyle = {
  display: "inline-flex", alignItems: "center", gap: 7,
  background: "linear-gradient(135deg, #FB7185 0%, #C9374F 100%)",
  border: "none", borderRadius: 999,
  padding: "11px 22px",
  color: "#fff", fontSize: 14, fontWeight: 700,
  letterSpacing: "-0.01em",
  cursor: "pointer",
  boxShadow: "0 14px 28px -10px rgba(244,63,94,0.55)",
};
