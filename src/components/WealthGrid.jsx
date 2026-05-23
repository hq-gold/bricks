import React, { useMemo, useRef, useLayoutEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { calcWealthMilestones, fmtMoneyShort } from "../core/wealthProjection.js";

function ScaleToFit({ contentWidth, children }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [innerH, setInnerH] = useState(null);

  useLayoutEffect(() => {
    const measure = () => {
      const avail = wrapRef.current?.offsetWidth || contentWidth;
      const s = Math.min(1, avail / contentWidth);
      setScale(s);
      const childH = wrapRef.current?.firstChild?.offsetHeight;
      if (childH) setInnerH(childH * s);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [contentWidth]);

  return (
    <div ref={wrapRef} style={{
      width: "100%", maxWidth: contentWidth, minWidth: 0,
      height: innerH ?? undefined,
      overflowX: "clip", overflowY: "visible",
    }}>
      <div style={{
        width: contentWidth,
        transform: `scale(${scale})`, transformOrigin: "top left",
      }}>
        {children}
      </div>
    </div>
  );
}

const TIMELINE_YEARS = [1, 8, 15, 22, 30];

export default function WealthGrid({
  monthlyEquity,
  loanBalance,
  depositEquity,
  cell = 9,
  gap = 2,
  animate = true,
}) {
  const gridRef = useRef(null);
  const inView = useInView(gridRef, { once: true, amount: 0.3 });
  const shouldAnimate = animate && inView;
  const cols = 30;
  const rows = 12;

  const peak = Math.max(...monthlyEquity, 1);
  const finalEquity = monthlyEquity[monthlyEquity.length - 1] ?? 0;
  const milestones = useMemo(
    () => calcWealthMilestones(monthlyEquity, depositEquity),
    [monthlyEquity, depositEquity],
  );

  const heroMilestone = useMemo(() => {
    const big = milestones.find(m => m.id === "5m") || milestones.find(m => m.id === "2m");
    if (big) return big;
    return milestones.find(m => m.id === "double") || null;
  }, [milestones]);

  const gridWidth = cols * cell + (cols - 1) * gap;
  const gridHeight = rows * cell + (rows - 1) * gap;
  const PILL_ROW_HEIGHT = 24;
  const PILL_TO_GRID_GAP = 6;
  const heroCol = heroMilestone ? heroMilestone.yearHit - 1 : 29;
  const heroLeftPx = heroCol * (cell + gap) + cell / 2;

  const timelinePoints = useMemo(() => {
    return TIMELINE_YEARS.map(yr => ({
      year: yr,
      equity: monthlyEquity[yr * 12 - 1] ?? 0,
    }));
  }, [monthlyEquity]);

  const loanAtYear = useMemo(() => {
    return TIMELINE_YEARS.map(yr => ({
      year: yr,
      loan: loanBalance[yr * 12 - 1] ?? 0,
    }));
  }, [loanBalance]);

  const maxLoan = Math.max(...loanBalance, 1);

  return (
    <ScaleToFit contentWidth={gridWidth}>
      <div ref={gridRef} style={{ width: gridWidth, position: "relative" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "relative", height: PILL_ROW_HEIGHT, marginBottom: PILL_TO_GRID_GAP }}>
            <div style={{
              position: "absolute", top: 6, right: 1,
              color: "#5C6477", fontSize: 8, fontWeight: 800,
              letterSpacing: 0.8, textTransform: "uppercase", opacity: 0.75,
            }}>
              Y1 → Y30
            </div>
            <div style={{
              position: "absolute", left: `${heroLeftPx}px`, transform: "translateX(-50%)", top: 0,
            }}>
              <motion.div
                initial={animate ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 45%, #D97706 100%)",
                  color: "#0B0E14",
                  fontSize: 10.5, fontWeight: 900, letterSpacing: 0.12,
                  padding: "4px 10px", borderRadius: 4, whiteSpace: "nowrap",
                  boxShadow: "0 2px 10px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.45)",
                }}>
                {heroMilestone
                  ? `${heroMilestone.label.toUpperCase()} · YEAR ${heroMilestone.yearHit}`
                  : `BUILDS ${fmtMoneyShort(finalEquity).toUpperCase()} BY YEAR 30`}
              </motion.div>
            </div>
          </div>

          {heroMilestone && (
            <motion.div
              initial={animate ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 1 }}
              animate={shouldAnimate ? { scaleY: 1, opacity: 1 } : { scaleY: 1, opacity: 1 }}
              transition={{ delay: 1.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute", left: heroLeftPx, top: PILL_ROW_HEIGHT + PILL_TO_GRID_GAP,
                width: 2, height: gridHeight, transformOrigin: "top center",
                background: "linear-gradient(180deg, rgba(251,191,36,0.85), rgba(251,191,36,0.08))",
                borderRadius: 999, zIndex: 2, pointerEvents: "none",
              }}
            />
          )}

          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
            gridTemplateRows: `repeat(${rows}, ${cell}px)`,
            gap: `${gap}px`, gridAutoFlow: "column",
          }}>
            {Array.from({ length: cols }).map((_, c) =>
              Array.from({ length: rows }).map((_, r) => {
                const idx = c * rows + r;
                const eq = monthlyEquity[idx] ?? 0;
                const t = Math.min(1, Math.max(0, eq / peak));
                const fromBottom = rows - 1 - r;
                const litThreshold = Math.round(t * rows);
                const lit = fromBottom < litThreshold;
                const intensity = lit ? 0.25 + (fromBottom / rows) * 0.75 : 0;
                return (
                  <motion.div
                    key={`${c}-${r}`}
                    initial={false}
                    animate={{
                      backgroundColor: lit
                        ? `rgba(251,191,36,${0.2 + intensity * 0.75})`
                        : "rgba(255,255,255,0.035)",
                      boxShadow: lit && t > 0.85
                        ? "0 0 6px rgba(251,191,36,0.35)"
                        : "none",
                    }}
                    transition={{ duration: 0.35, delay: shouldAnimate ? c * 0.012 : 0 }}
                    style={{ borderRadius: 2 }}
                  />
                );
              }),
            )}
          </div>
        </div>

        {/* Equity year callouts */}
        <div style={{
          display: "grid", gridTemplateColumns: `repeat(${TIMELINE_YEARS.length}, 1fr)`,
          gap: 6, marginTop: 14,
        }}>
          {timelinePoints.map(pt => (
            <div key={pt.year} style={{ textAlign: "center" }}>
              <motion.div
                key={pt.equity}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{
                  fontFamily: 'ui-serif, Georgia, serif', fontSize: 12, fontWeight: 600,
                  color: "#FBBF24", lineHeight: 1.1,
                }}>
                {fmtMoneyShort(pt.equity)}
              </motion.div>
              <div style={{ fontSize: 9, color: "rgba(245,247,250,0.42)", marginTop: 3 }}>Yr {pt.year}</div>
            </div>
          ))}
        </div>

        {/* Loan paydown strip */}
        <div style={{
          marginTop: 14, paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
            color: "rgba(245,247,250,0.38)", marginBottom: 8,
          }}>
            Loan remaining · shrinks as you hold
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 28 }}>
            {loanAtYear.map(pt => {
              const h = Math.max(2, Math.round((pt.loan / maxLoan) * 26));
              return (
                <div key={pt.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <motion.div
                    key={pt.loan}
                    initial={{ height: 0 }} animate={{ height: h }}
                    transition={{ duration: 0.4, delay: shouldAnimate ? 0.2 : 0 }}
                    style={{
                      width: "100%", maxWidth: 24, borderRadius: 2,
                      background: "linear-gradient(180deg, rgba(244,63,94,0.75), rgba(244,63,94,0.25))",
                    }}
                  />
                  <div style={{ fontSize: 8, color: "rgba(245,247,250,0.32)" }}>Y{pt.year}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScaleToFit>
  );
}
