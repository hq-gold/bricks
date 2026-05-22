# Bricks — Build Plan

**The single source of truth for building Bricks. Cursor reads this entire document at the start of every session. It contains the strategic context, the complete product specification, and a stepped execution plan.**

**How Cursor uses this document:** Read it in full. Then Matt names a step to begin (e.g. *"start Step 1.1"*). Cursor completes that step, stops, and waits for Matt's review and approval before moving on. Each step is a self-contained chunk of work; the size of the chunk is the natural unit, not a time estimate. Cursor moves at Cursor's pace.

**Fast path (active):** See `GO-TO-MARKET.md`. Pitch-first order: scoring + badges + suburb stats → vendor report → leaderboards → REAXML/billing with Joe. Steps 1.5–1.7, 1.9, 2.2–2.4 are in progress via `src/scoring.js`, `src/badges.js`, `src/data/suburb-stats.json`, hash routes, and vendor report screens.

---

## Part A — Strategic context

### A.1 What Bricks is

Bricks (`thebricks.au`) is an Australian property investment decision tool that shows a buyer the 30-year, after-tax cashflow truth of any property under the 2026 federal budget rules. Built in React/Vite, hosted on Vercel, single repository (`hq-gold/bricks`). The cashflow engine lives in `generateCashflow()` and produces a 360-month after-tax cashflow series. The headline visual is the 360-square "what your next 30 years actually looks like" brick, with the gold "pays you from year X" milestone pill.

Built by Matt Butler (Sydney, VP Marketing at Workiro) operating under Eyes Here Pty Limited (ABN 48 656 142 997). Near-term collaborator: Joe, senior engineer formerly at OpenAgent. First commercial customers: Matt's two existing agent contacts (Belle Property Eastern Suburbs and a junior at Ray White), then expansion.

Current codebase state: working dark-themed React app with home page (listings catalogue, 30-square cards), drill-down detail page (Scenario Studio with sliders, comparison engine, agent/broker CTA), Budget story page (scroll-scrubbed Sydney video with multi-scene narrative), referral capture wired to all CTAs, footer with legal placeholders, `useCountdown()` hook for "days until 1 July 2027". The cashflow engine is feature-complete and trustworthy. Twelve demo properties are seeded.

### A.2 The 2026 federal budget — the facts the engine encodes

From 1 July 2027, negative gearing for established residential property is abolished for properties purchased after 7:30pm AEST on 12 May 2026. Affected investors can no longer offset rental losses against salary or other personal income — losses can only be offset against residential rental income or future capital gains from rental properties, and excess losses carry forward. Existing owners (including those under contract before the announcement) are grandfathered. New builds remain exempt and retain both negative gearing and CGT discount access.

The 50% CGT discount is replaced from 1 July 2027 with cost base indexation plus a 30% minimum tax on net capital gains, for assets held by individuals, trusts, and partnerships. Transitional arrangements apply to gains arising after 1 July 2027; gains realised before that date continue under the existing 50% discount.

CBA forecasts house prices will be approximately 3% lower than they otherwise would have been, with established property bearing the heavier impact. This creates real urgency for investors making decisions in the 2026-2027 window — exactly the window Bricks operates in.

### A.3 The business model

Bricks earns money from real estate agents and mortgage brokers, not from consumers. Consumers get a free, beautiful, decision-support product that grows organically through agent-shared content and the inherent virality of "this is what your next 30 years looks like" cashflow visuals. Agents pay a monthly subscription (indicative $149-$299 per agent per month, final pricing set with first paid customer) for production tools: a co-branded vendor report generator, the leaderboard and badge system, the social card generator, and suburb intelligence. Mortgage brokers pay per-funded-loan referral fees — industry-standard 20-30% of the broker's upfront commission, which is 0.55-0.65% of the loan amount. On a $900k loan, Bricks earns roughly $1,200-1,800 per funded referral.

The wedge into the first agents: Matt's two existing contacts. The pitch is *"here is a tool that helps you win your next listing presentation, and a social asset you can share tomorrow"* — not *"upload your data"*.

### A.4 The data reality

**Freely and legally available — use as much as needed:**

- **NSW Valuer General Bulk Property Sales Information** — every property sale in NSW from 1990 to present (35+ years), with address, price, contract and settlement dates, zoning, and more. Released as monthly ZIP files per Local Government Area in delimited flat ASCII format. Licensed under Creative Commons Attribution 4.0 (open access, redistributable with attribution). Primary source: `valuergeneral.nsw.gov.au`. A pre-cleaned, daily-updated CSV mirror of the last 6 years is maintained at `nswpropertysalesdata.com` (GitHub source: `jameselks/nsw-property-sales-data-cleaner`) — useful shortcut for initial ingestion. This is the foundation of every historical ranking and defensible suburb intelligence feature.

- **Victorian Property Sales Data** — equivalent for VIC at `propertysales.land.vic.gov.au`.

- **Queensland Property Sales** — equivalent for QLD via `qld.gov.au` open data portal.

- **ABS (Australian Bureau of Statistics)** — suburb-level median prices, rental yields, vacancy rates, demographics, building approvals, income. Bulk-downloadable, free.

- **RBA data** — cash rate history, household debt, savings rates.

- **SQM Research** — weekly vacancy rate data, free tier.

- **Council DA portals** — Development Approvals by council. Forward-looking supply pipeline data.

**Available only via direct agent partnership (REAXML feed):**

- Current live listings — price, address, beds/baths/cars, photos, agent contact.
- Off-market vendor pipeline (only what an individual agent volunteers).
- Per-property rental estimates with confidence intervals — agents have this from their letting management systems.

**Not legal at scale — never attempt:**

- Mass scraping of `realestate.com.au`, `domain.com.au`, or `allhomes.com.au`. REA Group sued Domain in federal court in 2024 for scraping listings; terms of service are explicit. Single-page user-initiated fetches (user pastes a URL, app fetches that one page) are a different posture and may be acceptable; mass crawling is not.
- CoreLogic / PropTrack paid data without a paid licence.

**For the initial demo:** the "live listings" layer is populated with realistic dummy data (40-50 plausible properties per major suburb) flagged in code with `source: "demo"`. The historical layer is real (NSW Valuer General). This means we can honestly tell agents: *"the historical engine runs on real government open data and scales nationally. The live listings layer is dummy now and gets replaced by REAXML feeds when our first agent partner signs."*

### A.5 What NOT to build

Cursor: without explicit direction, do not:

- Mass-scrape `realestate.com.au`, `domain.com.au`, or `allhomes.com.au`
- Build off-market property database features
- Build buyer-facing search
- Build AI chatbot features
- Modify `generateCashflow()` or core cashflow logic
- Replace the 12 curated home page demo properties (expansion is additive)
- Add new npm dependencies without asking first
- Move past a step's stop condition without Matt's explicit approval

### A.6 Design language

Dark theme. Italic-serif gradient accents on headlines. Near-black `#05070A` background. Coral/rose `#FB7185` → `#F0556B` primary accent. Gold `#F59E0B` for break-even moments. Green for positive cashflow. Blue for equity. The 360-square brick visual is the most recognisable element — protect and reuse it. Refer to existing `bricks-premium.jsx` for established patterns. CSS-in-JS with inline style objects. Functional React with hooks.

For social cards: louder than the in-app experience. Instagram Stories are a hostile environment and cards must win three scroll-seconds. Bigger type, more contrast, badge prominent, agent's face anchoring trust.

### A.7 Stakeholders the product must serve

The product is judged by whether it concretely serves these ten stakeholders. Reference during ambiguity:

1. **Sophie (38, IT contractor)** — first-time investment buyer, needs a second opinion that isn't selling anything.
2. **David (52, experienced investor)** — three IPs already, needs to model post-cliff scenarios for his next purchase.
3. **Aisha (31, Belle Property agent)** — needs a vendor-presentation tool no competitor has.
4. **Tom (28, Ray White junior)** — needs a way to look bigger than he is to win listings.
5. **James (44, mortgage broker)** — needs predictable, pre-qualified buyer leads with clean attribution.
6. **Joe (36, ex-OpenAgent engineer)** — potential co-founder, needs a real product and a real plan.
7. **Rebecca (49, vendor)** — needs a defensible reason to pick one agent over another.
8. **Marcus (26, scrolling Instagram)** — top of funnel, needs an entry that doesn't feel like marketing.
9. **Karen (58, agency principal)** — second-wave customer, needs agency-wide tooling.
10. **Matt** — operator, needs to convert this into a fundable business inside the post-budget window.

### A.8 The conversation we are building toward

When everything in this document ships, Matt sits down with Joe and the two agent contacts and says: *"Here is Bricks. Here is the engine — it ranks every property in Sydney against real historical sales, awards badges, slots them into suburb leaderboards. Here is the vendor report — you type a property in, you get a beautiful co-branded PDF you leave on a vendor's kitchen table. Here is the social card — every property you list, we auto-generate an Instagram Story with your face and our analysis. When you say yes, we add your real listings via REAXML feed, the dummy data disappears, and your stock is the stock being ranked."*

---

## Part B — Step-by-step build plan

Four phases. Each phase contains numbered steps. Each step is a self-contained chunk that ends with *"Stop and wait for Matt's approval before proceeding to Step X.Y."* Cursor does not batch steps or move past a stop condition unprompted.

---

### PHASE 1 — The Gamification Layer

The engine that everything downstream consumes. Build this first.

---

#### Step 1.1 — Discovery and confirmation

Before writing any code:

1. State in your own words what Phase 1 is for, what its success condition is, and what the four phases collectively achieve. If anything is unclear, ask one focused question.
2. Open `bricks-premium.jsx`. Locate and list back: where `generateCashflow()` lives, where `calcDollarMilestones()` lives, where the existing property data array is, where the design tokens and colours are defined, and where any existing "score" or "rank" logic exists.
3. Propose the new file structure for `scoring.js`, `badges.js`, the historical data loader, the suburb intelligence page, the leaderboard pages, and new components. Match existing conventions. Do not create files yet.

Stop and wait for Matt's approval before proceeding to Step 1.2.

---

#### Step 1.2 — Propose the Bricks Investment Grade Score formula

Propose the formula in detail. The score is 0-100, derived from a weighted combination of:

- Years to positive cashflow under the 2026 budget rules (new builds advantaged — they retain negative gearing)
- 30-year total after-tax cashflow as a multiple of deposit
- Suburb growth percentile based on historical sales data
- Rental yield percentile within suburb
- Supply risk penalty based on council DA approvals in the suburb (24-month rolling)
- Cliff risk penalty for established properties purchased after 1 July 2027

Show the formula as both prose and pseudocode. Propose specific weights, normalisation methods, and edge case handling (e.g. property in a suburb with no historical data, missing rent estimate). Explain why these weights, not others.

This formula lives in `scoring.js` and is the single source of truth for every report, badge, and leaderboard in Bricks. Do not write code yet — propose only.

Stop and wait for Matt's approval before proceeding to Step 1.3.

---

#### Step 1.3 — Propose the badge taxonomy

Propose 12-15 starter badges. For each:

- Name (short, brag-worthy)
- Visual treatment (colour from brand palette, icon family, copy)
- Earn condition (precise logical expression — e.g. `score >= 90 AND suburb_rank == 1`)
- Scope (national / suburb / property type / temporal)
- Priority (which badges outrank others when multiple are earned — only the top 1-2 display on a card)

Three tiers: top-rank (loudest, gold), category leaders (rose), qualifiers (white). Include or improve on: *"Top 5 in [Suburb] this month"*, *"#1 for cashflow in [Suburb]"*, *"Top 10% post-budget grade nationally"*, *"Faster to break-even than 92% of comparable properties"*, *"New build advantage"*, *"Lowest 30-year bleed in [Suburb]"*, *"Highest rental yield in [Suburb]"*, *"Investor grade A+"*.

Badges are the atomic unit of bragging. They render identically on a property card, in a report, and on a social card.

Stop and wait for Matt's approval before proceeding to Step 1.4.

---

#### Step 1.4 — Propose the historical data ingest strategy

Propose how to ingest NSW Valuer General Bulk Property Sales data. Cover:

- **Source choice:** direct from `valuergeneral.nsw.gov.au` (raw, delimited ASCII, monthly per-LGA ZIPs), or via the pre-cleaned `nswpropertysalesdata.com` CSV mirror (6 years, daily-updated). Choose one for the initial build and explain why.
- **Initial slice:** how many years and which LGAs to load for the first working demo (start with Sydney metro LGAs).
- **Normalisation:** how to clean addresses, suburb names, property types; how to handle outliers, missing data, off-market sales in the dataset.
- **Derived statistics:** per-suburb median, percentile distributions, growth rates, rolling vacancy proxies.
- **Storage:** where the processed data lives — JSON in repo, SQLite, Supabase. Smallest path to a working demo.
- **Refresh:** how the data updates (manual script for now, automatable later).

Do not write code yet — propose only.

Stop and wait for Matt's approval before proceeding to Step 1.5.

---

#### Step 1.5 — Build the scoring engine

Implement the formula approved in Step 1.2 as `src/scoring.js`. Pure functions only. Inputs: property object plus suburb data. Outputs: integer 0-100 plus a breakdown object showing each factor's contribution (for debugging and the public methodology page).

Write tests:
- An excellent property (new build, high yield, growth suburb) scores 85+
- A poor property (established, low yield, declining suburb, post-cliff) scores under 40
- Edge cases (missing suburb data, zero rent, etc.) handled gracefully

Run the tests. Confirm all pass.

Stop and wait for Matt's approval before proceeding to Step 1.6.

---

#### Step 1.6 — Build the badge engine

Implement the taxonomy approved in Step 1.3 as `src/badges.js`. A pure function taking a property + score + suburb rank + suburb context, returning earned badges sorted by priority. No UI logic in this module.

Build `<Badge />` React component — the visual treatment. Renders identically wherever used. Test visually by adding to one existing property card temporarily.

Tests: each badge's earn condition fires correctly, priority ordering works, no card shows more than 3 badges (top 3 by priority).

Stop and wait for Matt's approval before proceeding to Step 1.7.

---

#### Step 1.7 — Build the historical data layer

Implement the ingest strategy approved in Step 1.4. Load the chosen NSW Valuer General slice, normalise it, derive per-suburb statistics, store as decided. Build a thin loader module exposing per-suburb stats to the scoring engine.

Verify: score the same hypothetical property against three different Sydney suburbs (Bondi, Mosman, Parramatta), confirm scores differ in plausible ways and real historical data drives the variance.

Stop and wait for Matt's approval before proceeding to Step 1.8.

---

#### Step 1.8 — Expand the demo listings

Generate 40-50 plausible demo properties for each of Bondi, Mosman, Newtown, Parramatta, and Surry Hills. Plausible addresses (real street names where possible), prices appropriate to the suburb, plausible beds/baths/cars, plausible agent names. Every demo listing flagged `source: "demo"` so they can be programmatically removed when REAXML feeds arrive. Add to existing property data structure; do not replace the 12 hand-curated heroes.

Verify: every demo property scores via the engine, earns appropriate badges, integrates into the existing home page grid.

Stop and wait for Matt's approval before proceeding to Step 1.9.

---

#### Step 1.9 — Build the per-suburb leaderboard page

Implement `/leaderboard/[suburb]` — a public page showing the top 5 properties in that suburb by Bricks Investment Grade Score. Scarcity is the point: only top 5, only this month. Each page has: suburb title, suburb context (median price, growth rate, vacancy), the 5 properties with full badge displays, "ranking refreshes monthly" temporal marker, OG image for social sharing.

Top-1 property gets visual weight — bigger card, distinctive treatment, dominant gold badge. The leaderboard feels like a magazine cover, not a spreadsheet.

Stop and wait for Matt's approval before proceeding to Step 1.10.

---

#### Step 1.10 — Build the suburb intelligence page

Implement `/suburb/[name]` — a per-suburb page driven entirely by open data. Show: median sale price 10-year trajectory (chart), rental yield bracket, vacancy rate trend, DA approval count (24-month rolling), demographic shift summary, Bricks Suburb Score (0-100) aggregating these. Link to the suburb's leaderboard.

This is the page agents email to vendors saying *"here's why your suburb is hot"*. It's also where Bricks earns SEO equity. Every suburb in the historical data gets one programmatically.

Stop and wait for Matt's approval before proceeding to Step 1.11.

---

#### Step 1.11 — Build the methodology page

Implement `/methodology` — a public page explaining how the Bricks Investment Grade Score is calculated, how badges are earned, how leaderboards work, what data sources we use, and the disclaimer that this is educational ranking, not financial advice. Beautiful, readable, defensible. Transparency is the credibility play.

Phase 1 complete. Stop and wait for Matt's approval before proceeding to Phase 2.

---

### PHASE 2 — The Vendor Report

The listing-presentation weapon. The single thing agents pay for that none of their competitors have.

---

#### Step 2.1 — Discovery and confirmation

State the vendor report's purpose, the moment it's used (an agent at a vendor's kitchen table during a listing presentation), and the emotional payoff for the vendor (the rank reveal moment). Confirm the report consumes Phase 1's scoring and badge engines without duplication. Propose the file structure for the input form, web report page, PDF generator, and report-specific components.

Stop and wait for Matt's approval before proceeding to Step 2.2.

---

#### Step 2.2 — Build the gamified input form

Implement `/agent/new-report` — the property input form. Fields: address (with suburb autocomplete), asking price, beds/baths/cars, building type (new / established), expected rent (with hint based on suburb median), land size (optional), vendor first name, report date.

The form *feels* gamified — not a boring HTML form. Apple Health onboarding style: one question at a time, progress dots, satisfying micro-animations, the next button feels good to press. Live previews build as the agent fills in: *"you've earned the New Build Advantage badge"*, *"your property ranks in the top 12% of Bondi"*. The form itself is part of the demo.

On submit, generate a UUID for the report and route to `/report/[uuid]`.

Stop and wait for Matt's approval before proceeding to Step 2.3.

---

#### Step 2.3 — Build the web report page

Implement `/report/[uuid]` — the beautiful web report. Sections in order:

1. **Header band:** agent's logo, photo, name, phone, email, agency. Vendor's first name and date. *"Prepared for [Vendor Name] by [Agent Name]"*.
2. **Hero rank reveal:** *"Your property at 14 Curlewis St currently ranks #3 of 47 investor-grade live listings in Bondi, and would have ranked #8 of 187 Bondi homes sold in the last 12 months."* Both the live rank (with subtle "demo data" footnote where applicable) and the historical rank (defensible primary number).
3. **Bricks Investment Grade Score:** the number, 0-100, prominent.
4. **Badges earned:** every badge, priority-ordered.
5. **The 360-square brick:** the headline cashflow visual, matching existing site treatment. *"Here is what your next 30 years actually looks like."*
6. **Suburb context:** pulled from the suburb intelligence page.
7. **Comparison table:** 3-5 comparables with their scores.
8. **Why this matters under the 2026 budget:** short narrative, ties to the cliff countdown, names the negative gearing change.
9. **Footer:** agent's contact, methodology link, disclaimer.

Mobile responsive. Public via UUID link. Beautiful enough that the vendor screenshots and shares it.

Stop and wait for Matt's approval before proceeding to Step 2.4.

---

#### Step 2.4 — Build the PDF generator

Implement `/report/[uuid]/pdf` — server-rendered PDF of the same report. This is the artefact the agent leaves on the vendor's kitchen table. Magazine-grade typography, not a browser print job.

Propose the generation method (Puppeteer rendering the web page is one path; React-PDF is another; a third-party API is a third). Smallest path to a working result, but output quality is non-negotiable.

Confirm one-click download from the web report page.

Stop and wait for Matt's approval before proceeding to Step 2.5.

---

#### Step 2.5 — End-to-end polish

Full flow test: agent identity (use a hardcoded demo agent for now), input form, gamified flow, web report, PDF download — all in one session. Test with three property types (new build apartment, established house, post-cliff established) and verify the report changes meaningfully.

Take screenshots. These go into the Joe pitch and the Belle Property pitch.

Phase 2 complete. Stop and wait for Matt's approval before proceeding to Phase 3.

---

### PHASE 3 — The Social Card Generator

The viral layer. The reason agents use Bricks even if they ignored everything else.

---

#### Step 3.1 — Discovery, architecture choice, and confirmation

State the social card layer's purpose, why it matters for agent acquisition (free distribution via agent posts), and what makes it visually different from in-app design (louder, three-scroll-second optimised, badge-dominant).

**Architectural decision in this step.** Bricks is currently a Vite app, not Next.js. `@vercel/og` (the standard server-side OG image library) is built primarily for Next.js / Vercel Edge Functions. Propose the generation approach from these options or another:

- (a) Migrate to Next.js
- (b) Use `satori` (the underlying engine of `@vercel/og`) directly within a Vercel serverless function from the Vite app
- (c) Use `workers-og` (Cloudflare Workers compatible) as an alternative
- (d) Use `@sahithyan/og` for Node-side generation
- (e) Another method you propose

Pick the path that produces beautiful 1080×1920 images with custom fonts and the exact Bricks design language, with the smallest architectural disruption. Explain the choice.

Stop and wait for Matt's approval before proceeding to Step 3.2.

---

#### Step 3.2 — Build the public property page

Implement `/p/[suburb]-[id]` — the landing page that social cards link to. Anyone arriving sees the full Bricks analysis: score, badges, 30-year brick visual, suburb context, agent's contact (if linked), soft CTAs to (a) get matched with an agent, (b) run their own property, (c) see the suburb leaderboard.

Optimised for someone arriving cold from a phone after tapping an Instagram Story. Tight copy, dominant visuals, clear next action.

Stop and wait for Matt's approval before proceeding to Step 3.3.

---

#### Step 3.3 — Build the Instagram Story card

Implement the 1080×1920 card, using the generation method approved in Step 3.1. Composition:

- **Top zone:** agent's photo (circular, gold border for top-rank properties), name and agency below.
- **Middle zone:** property's hero image (or a generated visual if no photo), one dominant badge overlay (*"#3 in Bondi this month"* — bold, instantly readable).
- **Bottom zone:** the headline number — *"Pays you from year 9"* or *"Bricks Score 87/100"* — in big italic-serif treatment matching the brand.
- **Corner:** small Bricks watermark plus short URL (e.g. `bricks.au/p/bondi-14curlewis`).

Wins three scroll-seconds. Bigger type than in-app. More contrast. Badge readable from thumbnail.

Add "Share to Instagram" button on every property page and report — one-tap download of the Story image to the agent's phone.

Stop and wait for Matt's approval before proceeding to Step 3.4.

---

#### Step 3.4 — Add the Feed Square variant and polish

Implement 1080×1080 square variant for Instagram feed posts. Same content language, recomposed for the square aspect ratio.

Test on real phones. Post real Stories. Verify cards look genuinely premium in the live environment. Adjust contrast, typography, layout based on phone-screen reality.

Phase 3 complete. Stop and wait for Matt's approval before proceeding to Phase 4.

---

### PHASE 4 — Agent SaaS Infrastructure

Build when there's a paid agent commitment with a specific price attached. Until then, reports use a hardcoded "demo agent" identity.

---

#### Step 4.1 — Supabase auth and agent accounts

Auth, agent profile (logo, photo, agency, contact, brand colour within Bricks design constraints), team association. Propose schema before building.

Stop and wait for Matt's approval before proceeding to Step 4.2.

---

#### Step 4.2 — Stripe subscription billing

Tiers (Starter, Pro), report quotas per tier, customer billing portal. Propose the tier structure and pricing before building.

Stop and wait for Matt's approval before proceeding to Step 4.3.

---

#### Step 4.3 — Agent dashboard

Reports generated this month, social cards downloaded, leaderboard placements, billing status. Propose layout before building.

Stop and wait for Matt's approval before proceeding to Step 4.4.

---

#### Step 4.4 — REAXML feed ingest

When a paid agent provides their feed, their real listings replace `source: "demo"` properties in their suburb. Propose the ingest pipeline before building.

Phase 4 complete.

---

## Part C — Reality checks (reread each session)

- **Is the cashflow engine still trustworthy?** Any change to `generateCashflow()` or `scoring.js` can invalidate every report. Touch carefully, version explicitly.
- **Does this feature help an agent win a listing?** If no, deprioritise.
- **Are we still legal?** No mass scraping. No claims constituting financial advice without lawyer-reviewed disclaimer language. The Bricks Investment Grade Score is educational ranking, not recommendation.

---

**This document is the contract.** Cursor follows it step by step. Matt updates it as strategy shifts. Treat it as code — version it, review it, never let it drift from reality.
