import React, { useEffect, useRef } from "react";

/**
 * Bespoke "brick rain" — confetti that mimics the 30-year cashflow bricks
 * which are the visual signature of The Bricks. Most pieces are rose
 * (positive ranking energy), with occasional green sparks (break-even).
 * The shapes match the brick grid: small chamfered rectangles with a
 * subtle inner highlight, not generic rainbow rectangles.
 */
const PALETTE = [
  // Brand rose — dominant
  { fill: "rgba(251,113,133,0.95)", glow: "rgba(251,113,133,0.7)" },
  { fill: "rgba(244,63,94,0.92)",   glow: "rgba(244,63,94,0.65)" },
  { fill: "rgba(253,164,175,0.95)", glow: "rgba(253,164,175,0.7)" },
  { fill: "rgba(254,205,211,0.92)", glow: "rgba(254,205,211,0.6)" },
  // Cream / blush — for sparkle
  { fill: "rgba(253,226,232,0.95)", glow: "rgba(253,226,232,0.55)" },
  // Occasional green — the "break-even" cell
  { fill: "rgba(74,222,128,0.85)",  glow: "rgba(74,222,128,0.5)" },
];

export default function ConfettiBurst({ seed = 0, intensity = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!seed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let running = true;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = window.innerWidth;
    const H = window.innerHeight;

    // Two volleys: a centre burst + a wider sweep — feels celebratory,
    // not overwhelming. Total ≈ 70 pieces at intensity 1.
    const count = Math.round(70 * intensity);
    const cx = W * 0.5;

    const particles = Array.from({ length: count }, (_, i) => {
      // Choose a palette weighted toward rose; green is rare (~1 in 8)
      const colorIdx = i % 8 === 3 ? 5 : Math.floor(Math.random() * 5);
      const color = PALETTE[colorIdx];
      // 1 in 6 is a tiny "spark" (just a dot of cream/rose for shimmer)
      const isSpark = i % 6 === 0;
      // Wide brick-shaped rectangle to match the cashflow grid bricks
      const w = isSpark ? 2.5 + Math.random() * 1.5 : 4 + Math.random() * 3.5;
      const h = isSpark ? 2.5 + Math.random() * 1.5 : 9 + Math.random() * 5;
      // Two volleys: roughly half from centre, half from a wider arc
      const wide = i % 2 === 0;
      const spread = wide ? W * 0.7 : W * 0.3;
      return {
        x: cx + (Math.random() - 0.5) * spread,
        y: -10 - Math.random() * 80,
        vx: (Math.random() - 0.5) * (wide ? 4.5 : 2.5),
        vy: 1 + Math.random() * 2.5,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.12,
        w, h,
        color,
        life: 1,
        decay: 0.0035 + Math.random() * 0.0035,
        spark: isSpark,
        // Slight horizontal drift for floaty feel
        drift: (Math.random() - 0.5) * 0.02,
        // Each brick falls at its own settle speed
        gravity: 0.06 + Math.random() * 0.05,
      };
    });

    let frame = 0;

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of particles) {
        p.vy += p.gravity;
        p.vx += p.drift;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        // Particles only start fading once they pass the upper third
        if (p.y > H * 0.35) p.life -= p.decay;
        if (p.life <= 0 || p.y > H + 30) continue;
        alive++;

        const a = Math.max(0, Math.min(1, p.life));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);

        if (p.spark) {
          // Soft glowing dot — small bloom
          ctx.shadowColor = p.color.glow;
          ctx.shadowBlur = 6;
          ctx.fillStyle = p.color.fill;
          ctx.beginPath();
          ctx.arc(0, 0, p.w * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Soft outer glow gives the rose pieces presence at small sizes
          ctx.shadowColor = p.color.glow;
          ctx.shadowBlur = 8;
          ctx.fillStyle = p.color.fill;
          // Brick — gently rounded corners (1.2px)
          const r = 1.2;
          const x = -p.w / 2, y = -p.h / 2;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + p.w - r, y);
          ctx.quadraticCurveTo(x + p.w, y, x + p.w, y + r);
          ctx.lineTo(x + p.w, y + p.h - r);
          ctx.quadraticCurveTo(x + p.w, y + p.h, x + p.w - r, y + p.h);
          ctx.lineTo(x + r, y + p.h);
          ctx.quadraticCurveTo(x, y + p.h, x, y + p.h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fill();
          // Subtle top sheen — single highlight strip on the upper face
          ctx.shadowBlur = 0;
          ctx.globalAlpha = a * 0.35;
          ctx.fillStyle = "#fff";
          ctx.fillRect(x + 1, y + 1, p.w - 2, Math.max(1, p.h * 0.18));
        }
        ctx.restore();
      }
      frame++;
      if (alive > 0 && frame < 280) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [seed, intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        pointerEvents: "none",
      }}
    />
  );
}
