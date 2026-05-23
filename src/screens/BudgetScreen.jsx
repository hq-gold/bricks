/**
 * BudgetScreen — scrollytelling story page.
 *
 * Eight full-viewport scenes that walk a visitor from "I didn't know this
 * affected me" to "I can't buy without this." Two investors, same money, same
 * week — one buys on the old numbers, one runs Bricks. We follow them to 2057.
 *
 * Lazy-loaded by App so the marketing scenes never block the Research-first
 * critical path. Imports CashflowGrid back from bricks-premium.jsx; that
 * circular reference is safe because this module loads after the parent has
 * finished evaluating (React.lazy resolves the import at render time).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check, ChevronRight, Clock, X } from "lucide-react";
import {
  MODEL_DEFAULTS,
  generateCashflow,
  calcDollarMilestones,
  yearTurnsPositive,
} from "../core/cashflow.js";
import { useCountdown } from "../hooks/useCountdown.js";
import { CashflowGrid } from "../bricks-premium.jsx";

// ════════════════════════════════════════════════════════════════════════════
// SCROLL-SCRUBBED BACKDROP
// ════════════════════════════════════════════════════════════════════════════
// Two implementations stacked:
//  1) JPEG / WebP sequence (preferred). The scroll position picks the right
//     frame from a pre-rendered set and assigns its src to a single <img>.
//     Browsers cache decoded images, so frame swaps are cheap and reliably
//     hit the next paint — much smoother than seeking a <video> on every
//     wheel tick.
//  2) MP4 fallback. If the first frame 404s (i.e. nobody has run ffmpeg yet),
//     we keep the current video-with-scroll-scrub behaviour so the page is
//     never broken.
//
// To enable the JPEG sequence locally:
//   1. Install ffmpeg (e.g. `brew install ffmpeg`).
//   2. From the repo root, run:
//        mkdir -p public/budget-frames
//        ffmpeg -i public/budget-bg.mp4 \
//               -vf "fps=12,scale=1280:-2" \
//               -q:v 4 \
//               public/budget-frames/frame-%03d.jpg
//      (12 fps × ~5s clip ≈ 60 frames; -q:v 4 keeps each <50KB; tweak
//      `scale` if you want lighter/heavier files)
//   3. Reload — the page detects the frames automatically and switches.
//
// VIDEO_FRAME_COUNT must match what ffmpeg produces. If you change the fps
// or the clip length, update this to keep the scrub mapping accurate.

const VIDEO_SRC          = "/budget-bg.mp4";
const VIDEO_FRAMES_DIR   = "/budget-frames";
const VIDEO_FRAME_COUNT  = 60;
const VIDEO_FRAME_EXT    = "jpg";          // change to "webp" if you prefer
const VIDEO_FRAME_DIGITS = 3;

// Clamp scrub range so we skip the pitch-black fade-in/out at the file edges.
const VIDEO_TIME_START_FRAC = 0.10;
const VIDEO_TIME_END_FRAC   = 0.92;

// Crop framing. The source clip is wide (1920×1080) but most desktop viewports
// match its aspect closely enough that objectFit: cover doesn't crop anything
// vertically — meaning the road occupies whatever portion of the source frame
// it occupies, which is too much. A modest scale-up anchored to the TOP edge
// keeps the night sky/skyline intact while the bottom (the road) falls off
// the container. transformOrigin "center top" is what makes that work.
const VIDEO_OBJECT_POSITION = "center top";
const VIDEO_SCALE           = 1.35;

// 30% black overlay — lifts text contrast on every scene without driving the
// scene fully dark. Bumped from 25% per the latest hero pass.
const VIDEO_OVERLAY_OPACITY = 0.30;

const padFrameNum = (n) => String(n).padStart(VIDEO_FRAME_DIGITS, "0");
const frameUrl    = (i)  => `${VIDEO_FRAMES_DIR}/frame-${padFrameNum(i)}.${VIDEO_FRAME_EXT}`;

// Cached preload promise so re-mounting the screen doesn't re-fetch frames.
let framesPromise = null;

function preloadFrames() {
  if (framesPromise) return framesPromise;
  framesPromise = new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => {
      // First frame loaded → kick off the rest in parallel and resolve once
      // they all complete. Browsers cap concurrent image fetches per origin
      // (~6) so this naturally throttles itself; we just wait for finalise.
      const imgs = [probe];
      let remaining = VIDEO_FRAME_COUNT - 1;
      if (remaining <= 0) { resolve(imgs); return; }
      const finish = () => { if (--remaining <= 0) resolve(imgs); };
      for (let i = 2; i <= VIDEO_FRAME_COUNT; i++) {
        const img = new Image();
        img.onload  = finish;
        img.onerror = finish;          // missing mid-frame: don't block the rest
        img.src = frameUrl(i);
        imgs.push(img);
      }
    };
    probe.onerror = () => resolve(null);  // no frames at all → fallback to MP4
    probe.src = frameUrl(1);
  });
  return framesPromise;
}

function VideoBackdrop() {
  const { scrollYProgress } = useScroll();
  const videoRef = useRef(null);
  const imgRef   = useRef(null);
  // null = still probing; true = JPEG sequence is live; false = no frames found
  const [framesReady, setFramesReady] = useState(null);

  // Probe + preload on first mount
  useEffect(() => {
    let cancelled = false;
    preloadFrames().then((imgs) => {
      if (cancelled) return;
      setFramesReady(!!imgs && imgs.length === VIDEO_FRAME_COUNT);
    });
    return () => { cancelled = true; };
  }, []);

  // Scroll → frame/time mapping (rAF-throttled)
  useEffect(() => {
    let rafId = 0;
    let pendingFrac = null;

    const applyFrames = () => {
      rafId = 0;
      const img = imgRef.current;
      if (!img) return;
      const p = pendingFrac == null ? 0 : Math.min(1, Math.max(0, pendingFrac));
      // Map scroll to the interior [START, END] slice of the clip
      const interior = VIDEO_TIME_START_FRAC + (VIDEO_TIME_END_FRAC - VIDEO_TIME_START_FRAC) * p;
      const idx = Math.min(VIDEO_FRAME_COUNT, Math.max(1,
        Math.round(interior * (VIDEO_FRAME_COUNT - 1)) + 1
      ));
      const next = frameUrl(idx);
      if (img.src !== next) img.src = next;
    };

    const applyVideo = () => {
      rafId = 0;
      const v = videoRef.current;
      if (!v || !v.duration || !isFinite(v.duration)) return;
      const p = pendingFrac == null ? 0 : Math.min(1, Math.max(0, pendingFrac));
      const t0 = v.duration * VIDEO_TIME_START_FRAC;
      const t1 = v.duration * VIDEO_TIME_END_FRAC;
      v.currentTime = Math.min(v.duration - 0.05, Math.max(0, t0 + (t1 - t0) * p));
    };

    const unsub = scrollYProgress.on("change", (frac) => {
      pendingFrac = frac;
      if (rafId) return;
      const handler = framesReady ? applyFrames : applyVideo;
      rafId = requestAnimationFrame(handler);
    });
    return () => {
      unsub();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [scrollYProgress, framesReady]);

  const sharedStyle = {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    objectFit: "cover",
    objectPosition: VIDEO_OBJECT_POSITION,
    transform: `scale(${VIDEO_SCALE})`,
    transformOrigin: "center top",
  };

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {/* Solid base so the page is never blank during probe/preload */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #0A1422 0%, #11141E 45%, #1A0E16 100%)",
      }} />

      {/* Video fallback. Always rendered while frames probe; once frames are
          ready the <img> on top hides it. We never hard-unmount it so the
          fallback is instantaneous if frames fail mid-session. */}
      {framesReady !== true && (
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted playsInline preload="auto"
          style={sharedStyle}
        />
      )}

      {/* JPEG-sequence layer. Visible only after we've confirmed the frames
          exist. Using a single <img> with src swaps; browsers reuse decoded
          buffers so frame changes don't trigger network. */}
      {framesReady && (
        <img
          ref={imgRef}
          src={frameUrl(1)}
          alt=""
          style={sharedStyle}
        />
      )}

      {/* Uniform 25% black overlay — flat, not gradient, so the headlines
          sit on the same legible base no matter where in the story you are. */}
      <div style={{
        position: "absolute", inset: 0,
        background: `rgba(0,0,0,${VIDEO_OVERLAY_OPACITY})`,
      }} />
    </div>
  );
}

// ─── Scene shell — every section is 100vh, centered, with scroll-reveal ────
function Scene({ children, style, id }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return (
    <section ref={ref} id={id} className="bgt-scene" style={{
      minHeight: "100svh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative",
      padding: "80px 32px",
      ...style,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: "100%", maxWidth: 980, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {children}
      </motion.div>
    </section>
  );
}

// ─── A number that counts up when it scrolls into view ──────────────────────
function CountUp({ to, prefix = "", suffix = "", duration = 1.6, decimals = 0, className, style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf, start;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  const display = decimals > 0
    ? val.toFixed(decimals)
    : Math.round(val).toLocaleString();
  return <span ref={ref} className={className} style={style}>{prefix}{display}{suffix}</span>;
}

// ─── Eyebrow used inside scenes ──────────────────────────────────────────────
// Long eyebrow copy ("THE PART OF THE CGT CHANGE NOBODY'S READING") wraps to
// two lines on narrow viewports — text-align: center keeps both lines centred
// instead of left-rag, and max-width caps the wrap so it doesn't sprawl.
function SceneEyebrow({ children, tone = "muted" }) {
  const color = tone === "rose" ? "#FB7185" : "rgba(245,247,250,0.42)";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 14,
      marginBottom: 26,
      maxWidth: "100%",
    }}>
      <span style={{
        flexShrink: 0,
        width: 28, height: 1,
        background: `linear-gradient(to right, transparent, ${tone === "rose" ? "rgba(251,113,133,0.5)" : "rgba(245,247,250,0.22)"})`,
      }} />
      <span style={{
        fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase",
        color,
        textAlign: "center",
        lineHeight: 1.4,
      }}>{children}</span>
      <span style={{
        flexShrink: 0,
        width: 28, height: 1,
        background: `linear-gradient(to left, transparent, ${tone === "rose" ? "rgba(251,113,133,0.5)" : "rgba(245,247,250,0.22)"})`,
      }} />
    </div>
  );
}

// ─── Serif scene headline ────────────────────────────────────────────────────
function SceneH({ children, size = 52, style }) {
  return (
    <h2 className="bgt-h" style={{
      margin: 0,
      fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
      fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1.1,
      color: "#F5F7FA",
      fontSize: size,
      textAlign: "center",
      ...style,
    }}>{children}</h2>
  );
}

const ROSE_GRAD = "linear-gradient(115deg, #FDE2E8 0%, #FB7185 50%, #FB923C 100%)";
function GradText({ children }) {
  return <span className="gradient-text" style={{
    fontStyle: "italic", fontWeight: 500,
    background: ROSE_GRAD,
    WebkitBackgroundClip: "text", backgroundClip: "text",
    WebkitTextFillColor: "transparent", color: "transparent",
    textAlign: "center",
  }}>{children}</span>;
}

// ════════════════════════════════════════════════════════════════════════════
// THE TWO-INVESTOR MODEL — one set of numbers, used across scenes 5 & 6.
// Dave buys an established house; Mara buys a new build. Same $850k, same week.
// All figures are illustrative but built on the post-budget rules:
//  - established bought after 12 May 2026 → negative gearing quarantined
//  - new build → negative gearing retained, deductible against income
// ════════════════════════════════════════════════════════════════════════════
const STORY = {
  budget: 850_000,
  dave: {
    name: "Dave",
    kind: "Established house",
    annualBleedY1: 19_400,
    totalOutOfPocket: 214_000,
    breakEven: null,
    netAt2057: 268_000,
  },
  mara: {
    name: "Mara",
    kind: "New build",
    annualBleedY1: 6_200,
    totalOutOfPocket: 41_000,
    breakEven: 9,
    netAt2057: 612_000,
  },
};

// ─── Mini 30-year cashflow chart that draws itself on scroll ─────────────────
function CashflowChart({ variant }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  const years = 30;
  const data = useMemo(() => {
    const pts = [];
    for (let i = 0; i < years; i++) {
      if (variant === "bleed") {
        const v = -19400 + (i * 540) + Math.sin(i / 3) * 400;
        pts.push(v);
      } else {
        const v = -6200 + (i * 1450) + Math.sin(i / 4) * 300;
        pts.push(v);
      }
    }
    return pts;
  }, [variant]);

  const W = 520, H = 200, pad = 8;
  const max = Math.max(...data.map(Math.abs), 1);
  const zeroY = H / 2;
  const xFor = (i) => pad + (i / (years - 1)) * (W - pad * 2);
  const yFor = (v) => zeroY - (v / max) * (H / 2 - pad);

  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${xFor(years - 1).toFixed(1)} ${zeroY} L ${xFor(0).toFixed(1)} ${zeroY} Z`;

  const stroke = variant === "bleed" ? "#F43F5E" : "#22C55E";
  const fill = variant === "bleed" ? "rgba(244,63,94,0.16)" : "rgba(34,197,94,0.15)";

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 520, display: "block" }}>
      <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY}
        stroke="rgba(245,247,250,0.16)" strokeWidth="1" strokeDasharray="3 4" />
      <motion.path d={areaPath} fill={fill}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.6 }} />
      <motion.path d={linePath} fill="none" stroke={stroke} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{ duration: 1.8, ease: "easeInOut" }} />
      {variant === "build" && (
        <motion.circle cx={xFor(STORY.mara.breakEven)} cy={yFor(0)} r="5"
          fill="#22C55E" stroke="#05070A" strokeWidth="2"
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ duration: 0.4, delay: 1.6, type: "spring" }} />
      )}
    </svg>
  );
}

// ─── Budget story countdown clock — the deadline made visceral ──────────────
function BudgetCountdownClock() {
  const { days, hours, mins, secs } = useCountdown();
  const units = [
    { v: days, label: "days" },
    { v: hours, label: "hours" },
    { v: mins, label: "minutes" },
    { v: secs, label: "seconds" },
  ];
  return (
    <div style={{
      display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center",
    }}>
      {units.map((u) => (
        <div key={u.label} style={{
          minWidth: 92, padding: "18px 14px", borderRadius: 16,
          background: "rgba(244,63,94,0.06)",
          border: "1px solid rgba(244,63,94,0.18)",
          textAlign: "center",
        }}>
          <motion.div
            key={u.label === "seconds" ? u.v : undefined}
            initial={u.label === "seconds" ? { opacity: 0.4, y: -3 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              fontFamily: 'ui-serif, Georgia, serif', fontSize: 38, fontWeight: 600,
              color: "#FB7185", lineHeight: 1, fontVariantNumeric: "tabular-nums",
            }}>
            {String(u.v).padStart(2, "0")}
          </motion.div>
          <div style={{
            fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "rgba(245,247,250,0.45)", fontWeight: 600, marginTop: 8,
          }}>{u.label}</div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
export default function BudgetScreen({ onBrowse }) {
  const { days: daysUntilCliff } = useCountdown();

  const [propType, setPropType] = useState("established");

  // 360-square proof scene — established (bleeds) vs new build (turns positive).
  // Same price/yield/growth; the only difference is the post-budget tax treatment
  // the model applies to each build type — so the contrast is the budget itself.
  const [proofType, setProofType] = useState("established");
  const proofCashflow = useMemo(() => generateCashflow({
    price: 850000, yieldPct: 3.6, growthPct: 5,
    rate: MODEL_DEFAULTS.rate, deposit: MODEL_DEFAULTS.deposit,
    marginalRate: 0.39, state: "NSW", loanType: MODEL_DEFAULTS.loanType,
    build: proofType === "newbuild" ? "new" : "existing",
    type: "House",
  }), [proofType]);
  const proofMilestones = useMemo(() => calcDollarMilestones(proofCashflow), [proofCashflow]);
  const proofBreakEven = useMemo(() => yearTurnsPositive(proofCashflow), [proofCashflow]);
  const proofBleed = useMemo(
    () => proofCashflow.reduce((s, x) => s + (x < 0 ? -x : 0), 0),
    [proofCashflow]
  );

  return (
    <motion.div key="budget"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="bgt-root"
      style={{
        position: "relative", background: "#05070A",
        width: "100%",
        overflowX: "hidden",
        marginTop: -56,
        marginBottom: -32,
        borderRadius: 0,
      }}>
      <VideoBackdrop />

      {/* SCENE 1 — HERO */}
      <Scene id="bgt-hero" style={{ minHeight: "100svh" }}>
        <div style={{
          position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
        }}>
          {/* Soft rose halo behind the headline — kept; it's a nice touch on
              the eyebrow/title rather than the legacy bottom-fade-to-black,
              which we removed because it created a hard seam between the
              hero and the next scene now that the video runs continuously. */}
          <div style={{
            position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
            width: 900, height: 700,
            background: "radial-gradient(ellipse at center, rgba(244,63,94,0.10), transparent 65%)",
          }} />
        </div>

        <div style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 12.5, letterSpacing: "0.22em", color: "#FB7185", fontWeight: 600,
          marginBottom: 28,
        }}>
          7:30 PM · 12 MAY 2026 · THE BUDGET
        </div>
        {/* Hard <br/>'s give the desktop layout the line poetry the user
            wants, but on mobile they're hidden via CSS and the text reflows
            naturally. The {" "} tokens before each break preserve the word
            spacing in that reflow — without them you get "buycould". */}
        <SceneH size={60} style={{ maxWidth: 940, textWrap: "balance" }}>
          Negative gearing just died{" "}<br/>
          for established homes.<br/>
          <GradText>The house you were about to buy{" "}<br/>
          could now cost six figures more{" "}<br/>
          than the identical one next door.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "30px 0 0", maxWidth: 650,
          fontSize: 19, lineHeight: 1.5, color: "rgba(245,247,250,0.72)",
          textAlign: "center",
        }}>
          Same street. Same price tag. Bought one day apart — and the
          tax office now treats them as two completely different
          investments, for the next 30 years. Here's how to tell which
          side of the line yours is on.
        </p>
        <div style={{
          marginTop: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <span style={{
            fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase",
            color: "rgba(245,247,250,0.4)", fontWeight: 600,
          }}>What changed, and what to do</span>
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronRight size={18} color="rgba(245,247,250,0.4)" style={{ transform: "rotate(90deg)" }} />
          </motion.div>
        </div>
      </Scene>

      {/* SCENE 3 — THE TWO INVESTORS */}
      <Scene id="bgt-two">
        <SceneEyebrow>Same money. Same week.</SceneEyebrow>
        <SceneH size={46} style={{ maxWidth: 760, marginBottom: 14 }}>
          Two investors. <GradText>$850,000 each.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 48px", maxWidth: 560,
          fontSize: 18, lineHeight: 1.55, color: "rgba(245,247,250,0.6)", textAlign: "center",
        }}>
          They buy in the same suburb, the same month. One does what
          investors have always done. The other runs the numbers first.
        </p>

        <div className="bgt-two-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, width: "100%",
        }}>
          {[STORY.dave, STORY.mara].map((p, i) => (
            <div key={p.name} style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18, padding: "28px 26px",
              textAlign: "center",
            }}>
              <div style={{
                fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
                color: "rgba(245,247,250,0.4)", fontWeight: 600, marginBottom: 14,
              }}>{i === 0 ? "The usual way" : "The Bricks way"}</div>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif', fontSize: 30, fontWeight: 500,
                color: "#F5F7FA", marginBottom: 6,
              }}>{p.name}</div>
              <div style={{ fontSize: 15, color: "rgba(245,247,250,0.55)" }}>
                Buys a {p.kind.toLowerCase()}
              </div>
            </div>
          ))}
        </div>
        <p style={{
          margin: "32px 0 0", fontSize: 15, color: "rgba(245,247,250,0.45)", textAlign: "center",
        }}>
          Same budget. Same street. Keep scrolling — watch the gap open.
        </p>
      </Scene>

      {/* SCENE 4 — THE OLD MAP IS WRONG (interactive) */}
      <Scene id="bgt-dual">
        <SceneEyebrow tone="rose">The dual system</SceneEyebrow>
        <SceneH size={46} style={{ maxWidth: 820, marginBottom: 16 }}>
          One street apart.<br/>
          <GradText>Two completely different rules.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 36px", maxWidth: 580,
          fontSize: 18, lineHeight: 1.55, color: "rgba(245,247,250,0.6)", textAlign: "center",
        }}>
          After 1 July 2027, the tax office treats a new build and an
          established home as different species. Tap each one.
        </p>

        <div style={{
          display: "inline-flex", gap: 6, padding: 6,
          background: "rgba(255,255,255,0.04)", borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)", marginBottom: 28,
        }}>
          {[
            { id: "established", label: "Established home" },
            { id: "newbuild", label: "New build" },
          ].map(opt => {
            const active = propType === opt.id;
            return (
              <button key={opt.id} onClick={() => setPropType(opt.id)}
                style={{
                  cursor: "pointer", border: "none",
                  padding: "11px 22px", borderRadius: 10,
                  fontSize: 14, fontWeight: 600, letterSpacing: -0.03,
                  background: active
                    ? "linear-gradient(135deg, rgba(244,63,94,0.22), rgba(244,63,94,0.08))"
                    : "transparent",
                  color: active ? "#FECDD3" : "rgba(245,247,250,0.55)",
                  boxShadow: active ? "0 0 0 1px rgba(244,63,94,0.3) inset" : "none",
                  transition: "all 0.2s",
                }}>{opt.label}</button>
            );
          })}
        </div>

        <div style={{
          width: "100%", maxWidth: 620,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 18, padding: "8px 0", overflow: "hidden",
        }}>
          <AnimatePresence mode="wait">
            <motion.div key={propType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}>
              {[
                {
                  label: "Negative gearing",
                  est: "Quarantined — can't offset your salary",
                  nb: "Retained — offsets your salary in full",
                },
                {
                  label: "Your annual loss",
                  est: "Funded entirely out of your own pocket",
                  nb: "Softened by a tax refund each year",
                },
                {
                  label: "Capital gains tax",
                  est: "Indexation + 30% minimum on the real gain",
                  nb: "Choose the old 50% discount, or indexation",
                },
              ].map((row, idx) => {
                const good = propType === "newbuild";
                const val = good ? row.nb : row.est;
                return (
                  <div key={row.label} style={{
                    display: "flex", alignItems: "flex-start", gap: 16,
                    padding: "18px 26px",
                    borderTop: idx === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div style={{
                      flexShrink: 0, width: 22, height: 22, borderRadius: 999,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 1,
                      background: good ? "rgba(34,197,94,0.16)" : "rgba(244,63,94,0.16)",
                    }}>
                      {good
                        ? <Check size={13} color="#22C55E" strokeWidth={3} />
                        : <X size={13} color="#F43F5E" strokeWidth={3} />}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{
                        fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase",
                        color: "rgba(245,247,250,0.4)", fontWeight: 600, marginBottom: 4,
                      }}>{row.label}</div>
                      <div style={{
                        fontSize: 16, color: good ? "#D6F5E3" : "#FBD5DC", fontWeight: 500,
                      }}>{val}</div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
        <p style={{
          margin: "26px 0 0", fontSize: 15, color: "rgba(245,247,250,0.45)",
          maxWidth: 540, textAlign: "center", lineHeight: 1.5,
        }}>
          Same suburb. Same price. The only difference is which side of
          the line the property sits on — and almost no listing tells you.
        </p>
      </Scene>

      {/* SCENE — TWO LEVERS (negative gearing + CGT, named as forces) */}
      <Scene id="bgt-levers">
        <SceneEyebrow>Not one change. Two.</SceneEyebrow>
        <SceneH size={44} style={{ maxWidth: 800, marginBottom: 16 }}>
          The budget pulled <GradText>two levers at once</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 40px", maxWidth: 600,
          fontSize: 18, lineHeight: 1.55, color: "rgba(245,247,250,0.62)", textAlign: "center",
        }}>
          Most countries change one property tax rule at a time. Australia
          moved two together — and they interact. That's what makes the
          new maths impossible to do in your head.
        </p>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20,
          width: "100%", maxWidth: 720,
        }} className="bgt-two-grid">
          {[
            {
              tag: "Lever one",
              title: "Negative gearing",
              body: "On an established home, your yearly loss can no longer come off your salary. It's quarantined — locked away to use only against future property income.",
              foot: "Hits you every year you hold.",
            },
            {
              tag: "Lever two",
              title: "Capital gains tax",
              body: "The flat 50% discount is gone. In its place: an inflation-indexed system with a 30% minimum. Whether that helps or hurts depends on inflation, your rate, and how long you hold.",
              foot: "Hits you the day you sell.",
            },
          ].map(card => (
            <div key={card.title} style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18, padding: "26px 24px",
              textAlign: "left",
            }}>
              <div style={{
                fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
                color: "#FB7185", fontWeight: 700, marginBottom: 12,
              }}>{card.tag}</div>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif', fontSize: 24, fontWeight: 500,
                color: "#F5F7FA", marginBottom: 12,
              }}>{card.title}</div>
              <div style={{ fontSize: 15.5, lineHeight: 1.5, color: "rgba(245,247,250,0.62)", marginBottom: 14 }}>
                {card.body}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 600, color: "rgba(245,247,250,0.4)",
                paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)",
              }}>{card.foot}</div>
            </div>
          ))}
        </div>
        <p style={{
          margin: "30px 0 0", fontSize: 16, lineHeight: 1.55,
          color: "rgba(245,247,250,0.7)", maxWidth: 560, textAlign: "center",
        }}>
          One lever you'd notice. Two that interact — across 30 years,
          through inflation you can't predict — is not something anyone
          eyeballs from a listing.
        </p>
      </Scene>

      {/* SCENE — THE BLEED (Dave) */}
      <Scene id="bgt-bleed">
        <SceneEyebrow>Dave · the usual way</SceneEyebrow>
        <SceneH size={46} style={{ maxWidth: 760, marginBottom: 14 }}>
          Dave bought established.<br/>
          <GradText>This is the next 30 years.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 36px", maxWidth: 560,
          fontSize: 18, lineHeight: 1.55, color: "rgba(245,247,250,0.6)", textAlign: "center",
        }}>
          His property loses money every year. It always did — but the
          tax refund used to cover the shortfall. Now that refund is
          quarantined. The cheque doesn't come.
        </p>

        <div style={{
          width: "100%", maxWidth: 560,
          background: "rgba(244,63,94,0.04)",
          border: "1px solid rgba(244,63,94,0.14)",
          borderRadius: 20, padding: "32px 28px",
        }}>
          <CashflowChart variant="bleed" />
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 24,
            paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "rgba(245,247,250,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>Out of pocket, 30 years</div>
              <CountUp to={STORY.dave.totalOutOfPocket} prefix="–$"
                style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 34, fontWeight: 500, color: "#F87171" }} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "rgba(245,247,250,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>Year it pays you back</div>
              <div style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 34, fontWeight: 500, color: "#F87171" }}>Never</div>
            </div>
          </div>
        </div>
        <p style={{
          margin: "26px 0 0", fontSize: 15, color: "rgba(245,247,250,0.45)",
          maxWidth: 520, textAlign: "center", lineHeight: 1.5,
        }}>
          Dave didn't buy a bad property. He bought a normal one — on
          numbers that no longer exist.
        </p>
      </Scene>

      {/* SCENE 6 — THE SAME MONEY, DONE RIGHT (Mara) */}
      <Scene id="bgt-build">
        <SceneEyebrow tone="rose">Mara · the Bricks way</SceneEyebrow>
        <SceneH size={46} style={{ maxWidth: 760, marginBottom: 14 }}>
          Same $850,000.<br/>
          <GradText>A completely different 30 years.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 36px", maxWidth: 560,
          fontSize: 18, lineHeight: 1.55, color: "rgba(245,247,250,0.6)", textAlign: "center",
        }}>
          Mara ran the post-budget numbers before she signed. She bought
          a property that still gears, still claims depreciation — and
          turns cashflow-positive in year nine.
        </p>

        <div style={{
          width: "100%", maxWidth: 560,
          background: "rgba(34,197,94,0.04)",
          border: "1px solid rgba(34,197,94,0.16)",
          borderRadius: 20, padding: "32px 28px",
        }}>
          <CashflowChart variant="build" />
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 24,
            paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "rgba(245,247,250,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>Out of pocket, 30 years</div>
              <CountUp to={STORY.mara.totalOutOfPocket} prefix="–$"
                style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 34, fontWeight: 500, color: "#4ADE80" }} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "rgba(245,247,250,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>Year it pays you back</div>
              <div style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 34, fontWeight: 500, color: "#4ADE80" }}>Year {STORY.mara.breakEven}</div>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 32, padding: "26px 32px",
          background: "linear-gradient(135deg, rgba(244,63,94,0.08), rgba(251,146,60,0.06))",
          border: "1px solid rgba(251,113,133,0.2)",
          borderRadius: 18, textAlign: "center", maxWidth: 560, width: "100%",
        }}>
          <div style={{
            fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase",
            color: "rgba(245,247,250,0.5)", fontWeight: 600, marginBottom: 10,
          }}>The gap between Dave and Mara by 2057</div>
          <CountUp to={STORY.mara.netAt2057 - STORY.dave.netAt2057 + STORY.dave.totalOutOfPocket - STORY.mara.totalOutOfPocket} prefix="$"
            duration={2}
            style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 52, fontWeight: 500 }}
          />
          <div style={{ marginTop: 8, fontSize: 15, color: "rgba(245,247,250,0.55)" }}>
            Same money. Same week. One decision.
          </div>
        </div>
      </Scene>

      {/* SCENE — WHY EVERY CALCULATOR IS WRONG */}
      <Scene id="bgt-wrong">
        <SceneEyebrow tone="rose">The problem with most calculators</SceneEyebrow>
        <SceneH size={44} style={{ maxWidth: 820, marginBottom: 18 }}>
          The maths just changed.<br/>
          <GradText>Most calculators haven't caught up.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 36px", maxWidth: 620,
          fontSize: 18, lineHeight: 1.55, color: "rgba(245,247,250,0.62)", textAlign: "center",
        }}>
          For an established property bought now, the salary deduction
          disappears in 2027. A calculator that still counts it is
          flattering the property by tens of thousands of dollars.
        </p>

        <div style={{
          padding: "30px 36px", maxWidth: 540, width: "100%",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 18, textAlign: "center",
        }}>
          <div style={{ fontSize: 14, color: "rgba(245,247,250,0.55)", marginBottom: 8 }}>
            Treasury's own worked example puts the cost of getting it wrong at
          </div>
          <CountUp to={58851} prefix="$" duration={2}
            style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 50, fontWeight: 500, color: "#FB7185" }} />
          <div style={{ fontSize: 14, color: "rgba(245,247,250,0.5)", marginTop: 8 }}>
            in extra tax on a single property sale.
          </div>
        </div>

        <p style={{
          margin: "30px 0 0", maxWidth: 580, fontSize: 17, lineHeight: 1.55,
          color: "rgba(245,247,250,0.7)", textAlign: "center",
        }}>
          Bricks is beautiful — and right. The calculator that's actually
          been updated, and the only one that shows you 30 years at a glance.
        </p>
      </Scene>

      {/* SCENE — THE LOCK-IN */}
      <Scene id="bgt-lockin">
        <SceneEyebrow tone="rose">The part that stings</SceneEyebrow>
        <SceneH size={46} style={{ maxWidth: 840, marginBottom: 16 }}>
          The landlord next door<br/>
          <GradText>keeps every break you've lost.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 40px", maxWidth: 640,
          fontSize: 18, lineHeight: 1.55, color: "rgba(245,247,250,0.62)", textAlign: "center",
        }}>
          Anyone who already owns is grandfathered — they negative-gear
          forever. Buy the identical house today and you don't.
          Same street, same bricks, two different tax bills.
        </p>

        <div className="bgt-two-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
          maxWidth: 680, width: "100%",
        }}>
          {[
            { tag: "Bought before 12 May 2026", tax: "Full negative gearing", note: "Grandfathered — nothing changes, ever.", tone: "good" },
            { tag: "Bought today", tax: "Quarantined from 2027", note: "Losses can't touch your salary anymore.", tone: "bad" },
          ].map(c => (
            <div key={c.tag} style={{
              padding: "24px 22px", borderRadius: 16,
              background: c.tone === "good"
                ? "rgba(34,197,94,0.07)" : "rgba(244,63,94,0.07)",
              border: `1px solid ${c.tone === "good" ? "rgba(34,197,94,0.2)" : "rgba(244,63,94,0.2)"}`,
            }}>
              <div style={{
                fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase",
                color: "rgba(245,247,250,0.5)", fontWeight: 600, marginBottom: 10,
              }}>{c.tag}</div>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif', fontSize: 22, fontWeight: 500,
                color: c.tone === "good" ? "#4ADE80" : "#F87171", marginBottom: 8,
              }}>{c.tax}</div>
              <div style={{ fontSize: 13.5, color: "rgba(245,247,250,0.6)", lineHeight: 1.5 }}>
                {c.note}
              </div>
            </div>
          ))}
        </div>

        <p style={{
          margin: "32px 0 0", maxWidth: 580, fontSize: 16.5, lineHeight: 1.55,
          color: "rgba(245,247,250,0.65)", textAlign: "center",
        }}>
          It's a two-tier market now. Bricks won't pretend you're on
          the old side of the line.
        </p>
      </Scene>

      {/* SCENE — THE DOUBLE HIT */}
      <Scene id="bgt-doublehit">
        <SceneEyebrow>It hits twice</SceneEyebrow>
        <SceneH size={46} style={{ maxWidth: 820, marginBottom: 16 }}>
          Taxed harder buying in.<br/>
          <GradText>Taxed harder selling out.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 40px", maxWidth: 620,
          fontSize: 18, lineHeight: 1.55, color: "rgba(245,247,250,0.62)", textAlign: "center",
        }}>
          Negative gearing is only half of it. The 50% capital-gains
          discount is going too — replaced by indexation and a 30%
          minimum. The budget reaches you at both ends of the hold.
        </p>

        <div style={{
          display: "flex", alignItems: "stretch", gap: 14, flexWrap: "wrap",
          justifyContent: "center", maxWidth: 720, width: "100%",
        }}>
          {[
            { phase: "Going in", title: "Negative gearing", desc: "Rental losses no longer cut your salary tax.", icon: "↓" },
            { phase: "30 years", title: "The hold", desc: "Where Bricks shows you the real cashflow path.", icon: "—" },
            { phase: "Coming out", title: "Capital gains", desc: "The 50% discount becomes indexation + a 30% floor.", icon: "↑" },
          ].map((c, i) => (
            <div key={c.title} style={{
              flex: "1 1 200px", padding: "22px 20px", borderRadius: 16,
              background: i === 1 ? "rgba(251,113,133,0.08)" : "rgba(255,255,255,0.025)",
              border: `1px solid ${i === 1 ? "rgba(251,113,133,0.22)" : "rgba(255,255,255,0.08)"}`,
            }}>
              <div style={{
                fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                color: "rgba(245,247,250,0.45)", fontWeight: 600, marginBottom: 9,
              }}>{c.phase}</div>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif', fontSize: 20, fontWeight: 500,
                color: "#F5F7FA", marginBottom: 7,
              }}>{c.title}</div>
              <div style={{ fontSize: 13, color: "rgba(245,247,250,0.6)", lineHeight: 1.5 }}>
                {c.desc}
              </div>
            </div>
          ))}
        </div>
      </Scene>

      {/* SCENE — THE INDEXATION CATCH */}
      <Scene id="bgt-indexation">
        <SceneEyebrow tone="rose">The part of the CGT change nobody's reading</SceneEyebrow>
        {/* Non-breaking space between "pegged to" keeps "to" attached to its
            line — fixes the ragged orphan the user flagged. text-wrap: balance
            distributes lines evenly across the headline width on supporting
            browsers (all evergreens at this point). */}
        <SceneH size={44} style={{ maxWidth: 840, marginBottom: 16, textWrap: "balance" }}>
          Your future tax bill is now pegged{"\u00A0"}to<br/>
          <GradText>a government inflation number.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 34px", maxWidth: 640,
          fontSize: 18, lineHeight: 1.55, color: "rgba(245,247,250,0.62)", textAlign: "center",
        }}>
          The new capital gains system taxes your "real" gain — the sale
          price minus a cost base lifted by official CPI. The catch: if
          that index runs lower than the costs you actually live with,
          the tax office counts inflation as profit. And taxes you on it.
        </p>

        <div style={{
          width: "100%", maxWidth: 620,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 18, padding: "26px 26px",
        }}>
          <div style={{
            fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "rgba(245,247,250,0.45)", fontWeight: 600, marginBottom: 16,
          }}>How the new gain is worked out</div>
          {[
            { label: "Sale price", note: "what the property actually sells for" },
            { label: "− Indexed cost base", note: "what you paid, lifted by official CPI" },
            { label: "= Taxed gain", note: "with a 30% minimum rate applied", accent: true },
          ].map((r, i) => (
            <div key={r.label} style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              gap: 14, padding: "12px 0",
              borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
            }}>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif', fontSize: 18, fontWeight: 500,
                color: r.accent ? "#FB7185" : "#F5F7FA",
              }}>{r.label}</div>
              <div style={{
                fontSize: 13, color: "rgba(245,247,250,0.5)", textAlign: "right", maxWidth: 280,
              }}>{r.note}</div>
            </div>
          ))}
        </div>

        <p style={{
          margin: "28px 0 0", maxWidth: 600, fontSize: 16, lineHeight: 1.55,
          color: "rgba(245,247,250,0.7)", textAlign: "center",
        }}>
          It can cut both ways — high official inflation can lower the
          taxed gain. But you don't set that number, and you can't
          predict it 30 years out. Bricks lets you test the gain under
          different inflation paths, instead of hoping.
        </p>
      </Scene>

      {/* SCENE — THE 360-SQUARE PROOF */}
      <Scene id="bgt-proof">
        <SceneEyebrow tone="rose">This is what Bricks shows you</SceneEyebrow>
        <SceneH size={44} style={{ maxWidth: 820, marginBottom: 16 }}>
          360 squares. One per month.<br/>
          <GradText>Thirty years, at a glance.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 34px", maxWidth: 600,
          fontSize: 18, lineHeight: 1.55, color: "rgba(245,247,250,0.62)", textAlign: "center",
        }}>
          Every Bricks property gets the same picture: red is a month
          that costs you, green is a month that pays you. Tap between
          the two — same suburb, same budget — and watch the post-budget
          rules redraw the entire 30 years.
        </p>

        <div style={{
          display: "inline-flex", gap: 6, padding: 6,
          background: "rgba(255,255,255,0.04)", borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)", marginBottom: 26,
        }}>
          {[
            { id: "established", label: "Established — bought now" },
            { id: "newbuild", label: "New build — bought now" },
          ].map(opt => {
            const active = proofType === opt.id;
            return (
              <button key={opt.id} onClick={() => setProofType(opt.id)}
                style={{
                  cursor: "pointer", border: "none",
                  padding: "11px 20px", borderRadius: 10,
                  fontSize: 13.5, fontWeight: 600, letterSpacing: -0.03,
                  background: active
                    ? "linear-gradient(135deg, rgba(244,63,94,0.22), rgba(244,63,94,0.08))"
                    : "transparent",
                  color: active ? "#FECDD3" : "rgba(245,247,250,0.55)",
                  boxShadow: active ? "0 0 0 1px rgba(244,63,94,0.3) inset" : "none",
                  transition: "all 0.2s",
                }}>{opt.label}</button>
            );
          })}
        </div>

        <div style={{
          width: "100%", maxWidth: 600,
          background: proofType === "newbuild" ? "rgba(34,197,94,0.04)" : "rgba(244,63,94,0.04)",
          border: `1px solid ${proofType === "newbuild" ? "rgba(34,197,94,0.16)" : "rgba(244,63,94,0.14)"}`,
          borderRadius: 20, padding: "28px 26px",
          transition: "all 0.3s",
        }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <CashflowGrid cashflow={proofCashflow} cell={11} gap={2.5}
              milestones={proofMilestones} showLabels={true} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 24,
            paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "rgba(245,247,250,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>Year it pays you back</div>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif', fontSize: 32, fontWeight: 500,
                color: proofBreakEven ? "#4ADE80" : "#F87171",
              }}>{proofBreakEven ? `Year ${proofBreakEven}` : "Never"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "rgba(245,247,250,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>Cost to hold, 30 years</div>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif', fontSize: 32, fontWeight: 500,
                color: proofType === "newbuild" ? "#4ADE80" : "#F87171",
              }}>−${Math.round(proofBleed / 1000)}k</div>
            </div>
          </div>
        </div>

        <p style={{
          margin: "28px 0 0", maxWidth: 560, fontSize: 16, lineHeight: 1.55,
          color: "rgba(245,247,250,0.7)", textAlign: "center",
        }}>
          No spreadsheet. No 40-tab model. The whole 30 years — after the
          2026 budget — in one picture you can read in three seconds.
        </p>
      </Scene>

      {/* SCENE — THE COUNTDOWN */}
      <Scene id="bgt-countdown">
        <div style={{
          position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
            width: 700, height: 400,
            background: "radial-gradient(ellipse at center, rgba(244,63,94,0.14), transparent 68%)",
          }} />
        </div>

        <SceneEyebrow tone="rose">The clock is already running</SceneEyebrow>
        <SceneH size={48} style={{ maxWidth: 800, marginBottom: 16 }}>
          The rules bite on<br/>
          <GradText>1 July 2027.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 36px", maxWidth: 600,
          fontSize: 18, lineHeight: 1.55, color: "rgba(245,247,250,0.62)", textAlign: "center",
        }}>
          Established properties bought after budget night are on the
          new rules from this date. Every day of indecision narrows
          the window.
        </p>

        <BudgetCountdownClock />

        <p style={{
          margin: "34px 0 0", maxWidth: 560, fontSize: 16.5, lineHeight: 1.55,
          color: "rgba(245,247,250,0.65)", textAlign: "center",
        }}>
          You can't stop the clock. You can know exactly where each
          property stands before it runs out.
        </p>
      </Scene>

      {/* SCENE 8 — THE TURN / CTA */}
      <Scene id="bgt-cta" style={{ minHeight: "100svh" }}>
        <div style={{
          position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", bottom: "-10%", left: "50%", transform: "translateX(-50%)",
            width: 900, height: 600,
            background: "radial-gradient(ellipse at center, rgba(244,63,94,0.12), transparent 65%)",
          }} />
        </div>

        <SceneH size={54} style={{ maxWidth: 820, marginBottom: 20, textWrap: "balance" }}>
          You can't change the budget.<br/>
          <GradText>You can change{" "}<br/>which property you buy.</GradText>
        </SceneH>
        <p className="bgt-sub" style={{
          margin: "0 0 40px", maxWidth: 560,
          fontSize: 19, lineHeight: 1.55, color: "rgba(245,247,250,0.7)", textAlign: "center",
        }}>
          Bricks runs the post-budget numbers on every property — the
          true holding cost, the break-even year, and which side of the
          line it's on. Before you sign.
        </p>

        <motion.button
          onClick={onBrowse}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{
            cursor: "pointer", border: "none",
            background: "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)",
            color: "#FFFFFF",
            borderRadius: 14, padding: "18px 32px",
            fontSize: 17, fontWeight: 600, letterSpacing: -0.03,
            display: "inline-flex", alignItems: "center", gap: 10,
            boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset, 0 18px 44px -16px rgba(244,63,94,0.85)",
          }}>
          See how the numbers stack up after the budget
          <ArrowRight size={18} strokeWidth={2.4} />
        </motion.button>

        <div style={{
          marginTop: 28, display: "inline-flex", alignItems: "center", gap: 8,
          fontSize: 14, color: "rgba(245,247,250,0.5)",
        }}>
          <Clock size={14} color="#FB7185" />
          <span><strong style={{ color: "#FB7185", fontWeight: 600 }}>{daysUntilCliff} days</strong> until the rules change on 1 July 2027</span>
        </div>
      </Scene>

    </motion.div>
  );
}
