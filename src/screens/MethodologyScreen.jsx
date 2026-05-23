import React from "react";
import { ChevronLeft } from "lucide-react";
import PageHero from "../components/PageHero.jsx";

/**
 * Honest spec of what scoring.js / badges.js actually do today.
 * Anything we *don't* run yet is called out as "not yet" so the page never lies.
 */
export default function MethodologyScreen({ onBack }) {
  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 56px)" }}>
      <PageHero height={340} />

      <div className="screen-content" style={{
        position: "relative", zIndex: 1,
        maxWidth: 760, margin: "0 auto", padding: "0 24px 80px",
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "transparent", border: "none", color: "#8B92A5",
            cursor: "pointer", padding: 0, marginTop: 32, marginBottom: 32,
            fontSize: 13, fontWeight: 600,
          }}
        >
          <ChevronLeft size={16} /> Back
        </button>

        <p style={{
          margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "#FB7185",
        }}>
          Methodology · open by design
        </p>
        <h1 style={{
          margin: "0 0 14px",
          fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
          fontSize: "clamp(40px, 6vw, 56px)",
          fontWeight: 500,
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          color: "#F5F7FA",
        }}>
          How Bricks ranks properties
        </h1>
        <p style={{
          color: "rgba(245,247,250,0.6)",
          fontSize: 17, lineHeight: 1.55, marginBottom: 40, maxWidth: 600,
        }}>
          Educational analysis only — not financial, tax, or legal advice. Numbers are model outputs, not promises. Speak to a licensed adviser before you buy.
        </p>

        {SECTIONS.map((s, i) => (
          <section key={i} style={{
            marginBottom: 18, padding: "22px 24px",
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 18,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "#FB7185", marginBottom: 8,
            }}>
              {s.tag}
            </div>
            <h2 style={{
              margin: "0 0 12px", fontSize: 22, fontWeight: 600,
              color: "#F5F7FA", letterSpacing: "-0.02em",
            }}>
              {s.title}
            </h2>
            {s.body.map((p, j) => (
              <p key={j} style={{
                margin: "0 0 10px", color: "rgba(245,247,250,0.62)",
                fontSize: 14.5, lineHeight: 1.65,
              }}>
                {p}
              </p>
            ))}
            {s.bullets && (
              <ul style={{
                margin: "10px 0 0", paddingLeft: 20,
                color: "rgba(245,247,250,0.62)", fontSize: 14, lineHeight: 1.7,
              }}>
                {s.bullets.map((b, k) => <li key={k}>{b}</li>)}
              </ul>
            )}
          </section>
        ))}

        <p style={{
          marginTop: 24, fontSize: 12, color: "#5C6477", lineHeight: 1.6,
          padding: "16px 20px", borderRadius: 12,
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
        }}>
          Source code for the score is in <code>src/scoring.js</code>. Cashflow model in <code>generateCashflow()</code>. We will publish the formula in full when the first paid agent partner signs.
        </p>
      </div>
    </div>
  );
}

const SECTIONS = [
  {
    tag: "The score",
    title: "Bricks Investment Grade Score (0–100)",
    body: [
      "Every property is scored 0–100 from a weighted sum of six factors. Higher = better post-budget outcome for an Australian investor.",
    ],
    bullets: [
      "Years to positive after-tax cashflow (22 pts) — break even by year 3 = full marks.",
      "Confidence signals — growth, risk, liquidity (28 pts) — from the listing-level confidence panel.",
      "Negative gearing value over 30 years (22 pts) — strongly favours new builds, which retain NG after 2027.",
      "Wealth multiple after 30 years of compounding growth (13 pts).",
      "Yield percentile vs the suburb's median (8 pts) — needs suburb data.",
      "Growth percentile vs the suburb's 10-year trend (7 pts) — needs suburb data.",
      "Penalties: high DA-approval supply pressure (up to −4), established build cliff risk (−6).",
    ],
  },
  {
    tag: "Tags on cards",
    title: "What the small tag on each card means",
    body: [
      "Cards in Research show one small tag (e.g. \"Pays you from year 7\", \"New build · NG retained\") — the top achievement from a longer list of badges earned by the scoring engine.",
      "The full list of achievements appears on the property's detail page, alongside the grade number.",
    ],
  },
  {
    tag: "Suburb data",
    title: "Where the suburb numbers come from",
    body: [
      "Bricks ships with a small set of seeded suburb stats so the demo runs without a database. Suburb medians, 12-month sales volumes, 10-year growth, vacancy and DA-approval counts mirror open government data sources but are not yet a live feed.",
      "The intended live source is the NSW Valuer General bulk property sales file (Creative Commons), with equivalent state datasets for VIC, QLD, SA, WA. The ingest script lives at scripts/ingest-nsw-sample.mjs.",
      "Anything beyond the seeded pilot suburbs falls back to safe defaults — no fake \"national\" coverage.",
    ],
  },
  {
    tag: "Cashflow engine",
    title: "The 30-year after-tax model",
    body: [
      "360-month series. Conservative defaults: 6.39% interest, 80% LVR, interest-only by default, 2 weeks vacancy a year, holding costs by property type, Division 43 and Division 40 depreciation per ATO rules, state-by-state land tax.",
      "Post-2027 negative gearing rules are encoded: established properties bought after 7:30pm AEST 12 May 2026 keep full NG until 30 June 2027, then losses are quarantined to other property income; new builds and grandfathered (pre-budget) holdings retain full NG forever.",
      "CGT reforms are also modelled: gains arising before 1 July 2027 keep the 50% discount; post-1 July 2027 gains use CPI cost-base indexation with a 30% minimum tax. New-build investors automatically get the better-of-two-methods treatment on the post-2027 portion. Grandfathered holdings keep the 50% discount on the entire gain.",
    ],
  },
  {
    tag: "Live listings",
    title: "Agent-fed stock vs public catalogue",
    body: [
      "All properties in the public catalogue today are demo stock used to show how the product behaves — flagged source: \"demo\" in code so they can be cleanly replaced.",
      "Agent-fed listings live in a private \"Listing preview\" page until a REAXML feed is connected. They are not published, ranked publicly, or counted in suburb leaderboards.",
    ],
  },
];
