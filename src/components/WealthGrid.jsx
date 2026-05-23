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

/** Lerp a 0..1 ratio along a cool→hot value gradient.
 *  Cool indigo (early, low equity) → teal → green (peak wealth). */
function valueColor(t) {
  // 3-stop ramp: indigo → teal → green
  const stops = [
    { t: 0.0, c: [99, 102, 241] },    // indigo-500 — early months
    { t: 0.55, c: [45, 212, 191] },   // teal-400 — wealth building
    { t: 1.0, c: [74, 222, 128] },    // green-400 — peak
  ];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      a = stops[i]; b = stops[i + 1]; break;
    }
  }
  const span = Math.max(0.0001, b.t - a.t);
  const k = (t - a.t) / span;
  const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * k);
  const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * k);
  const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * k);
  return `rgb(${r},${g},${bl})`;
}

export default function WealthGrid({
  monthlyEquity,
  depositEquity,
  cols = 30,
  rows = 12,
  cell = 9,
  gap = 2,
  animate = true,
}) {
  const gridRef = useRef(null);
  const inView = useInView(gridRef, { once: true, amount: 0.3 });
  const shouldAnimate = animate && inView;

  const peak = Math.max(...monthlyEquity, 1);
  const finalEquity = monthlyEquity[monthlyEquity.length - 1] ?? 0;

  const milestones = useMemo(
    () => calcWealthMilestones(monthlyEquity, depositEquity || 0),
    [monthlyEquity, depositEquity],
  );

  // Pick ONE hero milestone — preference: $5M, $2M, doubles deposit, else final
  const hero = useMemo(() => {
    return (
      milestones.find(m => m.id === "5m") ||
      milestones.find(m => m.id === "2m") ||
      milestones.find(m => m.id === "double") ||
      null
    );
  }, [milestones]);

  const gridWidth = cols * cell + (cols - 1) * gap;
  const gridHeight = rows * cell + (rows - 1) * gap;
  const PILL_ROW_HEIGHT = 24;
  const PILL_TO_GRID_GAP = 6;
  const heroCol = hero ? Math.min(cols - 1, hero.yearHit - 1) : null;
  const heroLeftPx = heroCol != null ? heroCol * (cell + gap) + cell / 2 : 0;

  return (
    <ScaleToFit contentWidth={gridWidth}>
      <div ref={gridRef} style={{ width: gridWidth, position: "relative" }}>
        {/* Milestone pill row — single hero callout, mirrors CashflowGrid */}
        <div style={{ position: "relative", height: PILL_ROW_HEIGHT, marginBottom: PILL_TO_GRID_GAP }}>
          {hero && (
            <div style={{
              position: "absolute", left: `${heroLeftPx}px`,
              transform: "translateX(-50%)", top: 0,
            }}>
              <motion.div
                initial={animate ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  background: "rgba(74,222,128,0.18)",
                  color: "#86EFAC",
                  border: "1px solid rgba(74,222,128,0.35)",
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.1,
                  padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
                  textTransform: "uppercase",
                }}>
                {`${hero.label} · YR ${hero.yearHit}`}
              </motion.div>
            </div>
          )}
        </div>

        {hero && (
          <motion.div
            initial={animate ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 1 }}
            animate={shouldAnimate ? { scaleY: 1, opacity: 1 } : { scaleY: 1, opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute", left: heroLeftPx,
              top: PILL_ROW_HEIGHT + PILL_TO_GRID_GAP,
              width: 1, height: gridHeight, transformOrigin: "top center",
              background: "linear-gradient(180deg, rgba(134,239,172,0.55), rgba(134,239,172,0.06))",
              borderRadius: 999, zIndex: 2, pointerEvents: "none",
            }}
          />
        )}

        {/* The grid — 30 columns × 12 rows = 360 months */}
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
              const color = valueColor(t);
              const fromBottom = rows - 1 - r;
              const litThreshold = Math.max(1, Math.round(t * rows));
              const lit = fromBottom < litThreshold;
              return (
                <motion.div
                  key={`${c}-${r}`}
                  initial={false}
                  animate={{
                    backgroundColor: lit
                      ? color
                      : "rgba(255,255,255,0.035)",
                    opacity: lit ? (0.45 + (fromBottom / rows) * 0.55) : 1,
                  }}
                  transition={{ duration: 0.35, delay: shouldAnimate ? c * 0.012 : 0 }}
                  style={{ borderRadius: 2 }}
                />
              );
            }),
          )}
        </div>

        {/* Year ticks — same restraint as cashflow */}
        <div style={{
          display: "grid", gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
          gap: `${gap}px`, marginTop: 6,
        }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{
              fontSize: 8, textAlign: "center", color: "rgba(245,247,250,0.32)",
            }}>
              {[0, 9, 19, 29].includes(c) ? `Y${c + 1}` : ""}
            </div>
          ))}
        </div>
      </div>
    </ScaleToFit>
  );
}
