import React from "react";

// Page wrappers that host PageHero apply paddingTop:56 to clear the
// floating nav. We bleed the hero up by 56px so the image extends
// under the glass nav — eliminates the black seam at the top.
const NAV_BLEED = 56;

const heroBgBleed = {
  position: "absolute",
  top: -NAV_BLEED,
  left: 0,
  right: 0,
  width: "100%",
  pointerEvents: "none",
  overflow: "hidden",
};

/** Same atmospheric hero as Research — reuse on agent tools */
export default function PageHero({ height = 420 }) {
  // Add the nav bleed back into the rendered DOM height so the visible
  // hero area below the nav stays at the value the caller asked for.
  const rendered = height + NAV_BLEED;
  return (
    <div className="hero-bg-bleed" style={{ ...heroBgBleed, height: rendered }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: 'url("/the_bricks.png")',
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        opacity: 0.68,
      }} />
      {/* Top fade — softens the area under the floating nav */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 160,
        background: "linear-gradient(to bottom, rgba(5,7,10,0.7) 0%, rgba(5,7,10,0.35) 60%, transparent 100%)",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 55% 65% at 50% 30%, rgba(244,63,94,0.05), transparent 70%), radial-gradient(ellipse 120% 90% at 50% 38%, transparent 45%, rgba(5,7,10,0.5) 100%)",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 220,
        background: "linear-gradient(to bottom, transparent, #05070A 96%)",
      }} />
    </div>
  );
}
