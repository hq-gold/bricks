import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, Suspense, lazy } from "react";
import PropertyMap from "./PropertyMap.jsx";
import { computeBricksScore } from "./scoring.js";
import { getSuburbStats } from "./suburbData.js";
import { getPropertyInsights, createScoringEngine } from "./propertyInsights.js";
import { BadgeShelf } from "./components/Badge.jsx";
import ShareStoryModal from "./components/ShareStoryModal.jsx";
import { loadStoredGoals } from "./components/GoalsOnboarding.jsx";
import MatchMe from "./components/MatchMe.jsx";
import GoalsScreen from "./screens/GoalsScreen.jsx";
import ConciergeNudge, { trackPropertyOpen } from "./components/ConciergeNudge.jsx";
import BudgetCTABand from "./components/BudgetCTABand.jsx";
import { AgentShareHeader, AgentContactDock, ListingAgentPromo } from "./components/AgentShareChrome.jsx";
import { parseRoute, navigateTo } from "./routing.js";
import MethodologyScreen from "./screens/MethodologyScreen.jsx";
import AgentPreviewScreen from "./screens/AgentPreviewScreen.jsx";
import LeaderboardScreen from "./screens/LeaderboardScreen.jsx";
import { DEMO_AGENT } from "./data/demo-agent.js";
import { CATHERINE_PROPS } from "./data/catherine-listings.js";
import { getListingAgent } from "./data/demo-agencies.js";
import VendorReportForm from "./screens/VendorReportForm.jsx";
import WealthGrid from "./components/WealthGrid.jsx";
import {
  computeWealthProjection,
  studioSliderBounds,
  fmtMoneyShort,
} from "./core/wealthProjection.js";

// Budget scrollytelling page — ~1k lines of marketing scenes. Lazy-loaded
// so the Research-first critical path stays small (saves ~50KB on first load,
// and keeps the file Cursor has to parse much shorter).
const BudgetScreen = lazy(() => import("./screens/BudgetScreen.jsx"));
import MapScreen from "./screens/MapScreen.jsx";
import { SortToolbar, SORT_OPTIONS } from "./components/SortToolbar.jsx";
import { motion, AnimatePresence, useInView, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import {
  Settings, Plus, ChevronLeft, TrendingUp, TrendingDown, ArrowDownRight, Minus, Home as HomeIcon,
  Target, Sparkles, MapPin, Building2, Trees, Waves, Sun, Mountain,
  X, ArrowRight, ArrowLeft, Share2, Shield, Droplets,
  FileText, AlertCircle, Lightbulb, ChevronRight,
  Briefcase, Hammer, CheckCircle2, Check, Zap, Lock, Heart, Bookmark, Users,
  Bed, Bath, Car, Maximize2, Map as MapIcon, List as ListIcon,
  Search, Bell, BarChart3, Star, SlidersHorizontal,
  Clock, Info, Menu as MenuIcon, Trophy,
  Tag, Wallet, Percent, Banknote, LineChart, Receipt,
} from "lucide-react";

const COLORS = [
  { name: "mint",   hex: "#2DD4BF", rgb: "45,212,191"  },
  { name: "pink",   hex: "#F472B6", rgb: "244,114,182" },
  { name: "yellow", hex: "#FACC15", rgb: "250,204,21"  },
  { name: "purple", hex: "#A78BFA", rgb: "167,139,250" },
  { name: "blue",   hex: "#60A5FA", rgb: "96,165,250"  },
  { name: "coral",  hex: "#FB7185", rgb: "251,113,133" },
  { name: "lime",   hex: "#A3E635", rgb: "163,230,53"  },
  { name: "orange", hex: "#FB923C", rgb: "251,146,60"  },
  { name: "sky",    hex: "#38BDF8", rgb: "56,189,248"  },
  { name: "rose",   hex: "#F43F5E", rgb: "244,63,94"   },
];
const PROP_ICONS = [
  { id: "home", Icon: HomeIcon }, { id: "bldg", Icon: Building2 },
  { id: "tree", Icon: Trees }, { id: "wave", Icon: Waves },
  { id: "sun", Icon: Sun }, { id: "mtn", Icon: Mountain },
];
const ICON_LOOKUP = Object.fromEntries(PROP_ICONS.map(i => [i.id, i.Icon]));

const SEED_GOALS = [
  { id: "g1", emoji: "🏝️", name: "Family Bali trip",   amount: 8000,   type: "yearly" },
  { id: "g2", emoji: "🍷", name: "Friday dinners out",  amount: 6000,   type: "yearly" },
  { id: "g3", emoji: "🚗", name: "New car every 5 yrs", amount: 12000,  type: "yearly" },
  { id: "g4", emoji: "🎓", name: "Private school fees", amount: 28000,  type: "yearly" },
  { id: "g5", emoji: "🌴", name: "Financial freedom",   amount: 120000, type: "yearly" },
];

const SEED_PROPS = [
  {
    id: 1, name: "Sunbury Townhouse", suburb: "Sunbury, VIC", state: "VIC",
    price: 639900, yieldPct: 4.3, growthPct: 5.6, color: 0, icon: "home",
    type: "Townhouse", build: "new", status: "considering",
    confidence: {
      growth: { score: 76, reasons: ["Population +2.4% last 12mo", "Sunbury rail upgrade $890M (2028)", "Median up 4.1% YoY"] },
      risk:   { score: 22, reasons: ["New build · builder warranty 7yr", "Strata-free townhouse", "Construction phase 9mo"] },
      liquid: { score: 71, reasons: ["28-day median DOM", "Auction clearance 64%", "9 comparable sales last 90d"] },
    },
    comps: [
      { addr: "12 Eumemmerring St", price: 624000, dom: 21, days: 18 },
      { addr: "8B Macedon Pl",      price: 651000, dom: 34, days: 42 },
      { addr: "21 Stockwell Cres",  price: 632500, dom: 19, days: 76 },
    ],
  },
  {
    id: 2, name: "Surry Hills Apartment", suburb: "Surry Hills, NSW", state: "NSW",
    price: 1245000, yieldPct: 3.6, growthPct: 4.9, color: 1, icon: "bldg",
    type: "Apartment", build: "new", status: "considering",
    confidence: {
      growth: { score: 68, reasons: ["Inner-city scarcity premium", "Tech employment +6.2%", "Median plateau (caution)"] },
      risk:   { score: 38, reasons: ["Strata 64 units", "Building 2024 · post-defect-law", "Yield-to-cost gap wide"] },
      liquid: { score: 82, reasons: ["18-day median DOM", "Deepest buyer pool in AU", "22 comparable sales last 90d"] },
    },
    comps: [
      { addr: "401/52 Foveaux St", price: 1180000, dom: 14, days: 21 },
      { addr: "8B Brisbane St",    price: 1295000, dom: 22, days: 47 },
    ],
  },
  {
    id: 3, name: "Bardon Heights", suburb: "Bardon, QLD", state: "QLD",
    price: 850000, yieldPct: 4.7, growthPct: 7.1, color: 2, icon: "sun",
    type: "House & Land", build: "new", status: "owned",
    purchased: { date: "Mar 2024", price: 782000, currentValue: 849000, equity: 134000 },
    activity: [
      { icon: "💵", title: "Rent received",        detail: "$2,850 · auto-deposit",                 when: "4 days ago" },
      { icon: "📉", title: "RBA held cash rate",   detail: "No change to $3,142/mo repayment",      when: "6 days ago" },
      { icon: "🏘️", title: "Comp sold $895k",      detail: "8 Latrobe Tce · +5.3% vs your buy",     when: "12 days ago" },
      { icon: "📊", title: "Vacancy 1.9% in 4065", detail: "Stable · rental demand strong",         when: "this week" },
    ],
    digest: "This week your Bardon property did what good ones do — it earned. Rent transferred on schedule. The bigger story: a comparable sold at $895k, putting you ~$113k ahead on paper since settlement and beating your 5-year plan by 14 months. One thing on the radar: rental listings in 4065 ticked up 22% this month. Not enough to move vacancy yet, but worth flagging if your lease ends in the next 90 days. Net-net: this single property is now fully covering your Bali fund and ~76% of your annual car budget. Hold the line.",
    actions: [
      { id: "a1", icon: AlertCircle, color: "#FACC15", title: "Lease renewal in 47 days", detail: "Tenant since Mar 2024. Comparable rent up 5.1% — consider review." },
      { id: "a2", icon: Lightbulb,   color: "#60A5FA", title: "Refinance opportunity",    detail: "Three lenders beat your 6.50%. Est. $2,400/yr saving." },
      { id: "a3", icon: FileText,    color: "#A78BFA", title: "Tax pack ready Jun 30",    detail: "BMT schedule, lease records, expense ledger pre-assembled." },
    ],
    docs: [
      { name: "Settlement docs",       kind: "Contract",     date: "Mar 2024" },
      { name: "Lease agreement",       kind: "Active lease", date: "Mar 2024 – Mar 2026" },
      { name: "Depreciation schedule", kind: "BMT 2024",     date: "Mar 2024" },
      { name: "Insurance policy",      kind: "Allianz",      date: "Renews Aug 2026" },
      { name: "Loan documents",        kind: "Macquarie",    date: "30yr P&I" },
    ],
    professionals: [
      { role: "Property manager", name: "Sarah K · Place", status: "active" },
      { role: "Accountant",       name: "Thompson & Co",   status: "Workiro" },
      { role: "Mortgage broker",  name: "Alex M · Lendi",  status: "active" },
    ],
  },
  {
    id: 4, name: "Westhaven Subiaco", suburb: "Subiaco, WA", state: "WA",
    price: 695000, yieldPct: 5.1, growthPct: 5.4, color: 3, icon: "bldg",
    type: "Apartment", build: "new", status: "considering",
    confidence: {
      growth: { score: 79, reasons: ["Perth median +8.2% YoY", "Subiaco renewal precinct", "Migration +14% YoY"] },
      risk:   { score: 29, reasons: ["Strata 42 units", "Builder iCIRT 4-star", "Yield cushions rate risk"] },
      liquid: { score: 74, reasons: ["24-day median DOM", "Perth clearance 68%", "Wide buyer demographic"] },
    },
    comps: [
      { addr: "8/45 Townshend Rd", price: 678000, dom: 19, days: 31 },
      { addr: "12/210 Hay St",     price: 712000, dom: 28, days: 64 },
    ],
  },
];

// ─── CASHFLOW MODEL ─── Expert-level Australian investment property cashflow.
//
// Built from industry research (Picki, Citadel, BMT, Westpac, ATO, William Buck, CBA budget paper).
// Every assumption is explicit and documented. Defaults are conservative/realistic, not optimistic.
//
// KEY CORRECTIONS vs prior naive model:
//   1. Mortgage logic: interest-only (IO) by default — most investors use IO for first 5-10 yrs.
//      P&I option available. Previously the model "amortised" interest deduction but never
//      charged principal against cashflow — best-of-both-worlds and wrong.
//   2. Holding costs: was 1.3% of price flat. Now property-type-aware: ~1.5% houses, ~2.5%
//      apartments (strata adds 1-2% on top). Industry consensus: $25-55k/yr typical.
//   3. Vacancy: was 0. Now 2 weeks/yr = ~3.85% rent haircut (industry standard).
//   4. Depreciation: was a single decaying rate. Now split correctly — Div 43 flat 2.5% of
//      construction cost (≈70% of price) for 40 yrs; Div 40 diminishing-value for new builds
//      only post-2017 ($25-40k base, ~15% decay).
//   5. NG post-2027 budget rule: was hard-zero for existing builds. Reality is more nuanced —
//      losses are QUARANTINED (carried forward against future rental income / capital gains).
//      For most retail investors with no other rentals this is effectively zero short-term
//      cashflow benefit but DOES eventually reduce CGT on sale.
//   6. Rate stress: default rate raised from 6.5% to 6.6% (post May 2026 RBA hike).
//   7. Rent growth: 3% — conservative. Long-term ABS avg ~3%; current 3.8% moderating.
//
// FORMULA (annualised, simplified):
//   gross_rent  = price × yield × (1+rentGrowth)^year × (1 - vacancy)
//   interest    = loan × rate                                  [IO: flat. P&I: amortises]
//   principal   = repayment - interest                          [P&I only]
//   costs       = (cashCostsPct × price) + landTaxAnnual
//   div43       = 0.025 × constructionCost                      [flat, post-1987 buildings]
//   div40       = newBuild ? dim_value_schedule(yr) : 0
//   depreciation_total = div43 + div40
//   taxable_loss = gross_rent - interest - costs - depreciation_total
//   tax_benefit  = max(0, -taxable_loss) × marginalRate     [if NG allowed]
//                  OR  0                                     [if quarantined - existing post-2027]
//   cash_outflow = -(rent - interest - principal - costs) + tax_benefit
//
// SOURCES (audited 14 May 2026):
//   - 2026-27 Federal Budget Tax Reform (budget.gov.au, William Buck, Baker McKenzie)
//   - ATO interest expense rules (ato.gov.au)
//   - BMT/Duotax depreciation schedules
//   - Picki/Citadel holding cost surveys
//   - ABS rent inflation series + KPMG outlook
//   - CommBank housing outlook 14 May 2026

// Cashflow + tax engine (MODEL_DEFAULTS, generateCashflow, fmt, fmtFull,
// calcAchievements, calcDollarMilestones, yearTurnsPositive, week1Cost,
// cellSpectrum, ngBenefitValue) lives in src/core/cashflow.js — see header
// of that file for the full formula documentation.
//
// Property helpers (propertyMeta, propertyListing, propertyTier,
// propertyTypeKey, historicalGrowth10y, wealthCreated) live in
// src/core/property.js.
import {
  MODEL_DEFAULTS,
  generateCashflow,
  calcAchievements,
  fmt,
  fmtFull,
  cellSpectrum,
  calcDollarMilestones,
  yearTurnsPositive,
  week1Cost,
  ngBenefitValue,
} from "./core/cashflow.js";
import {
  propertyMeta,
  propertyListing,
  propertyTier,
  propertyTypeKey,
  historicalGrowth10y,
  wealthCreated,
} from "./core/property.js";

export const SCORING_ENGINE = createScoringEngine({
  generateCashflow,
  yearTurnsPositive,
  ngBenefitValue,
});

/** Bricks Investment Grade Score — delegates to scoring.js */
export function bricksScore(property) {
  const st = getSuburbStats(property);
  return computeBricksScore(property, st, SCORING_ENGINE).score;
}

// The corner badge — context-aware. All metrics are either documented math or historical.
function heroFigure(property, sortId) {
  const cf = generateCashflow(property);
  // Lifetime cumulative cashflow (30 yrs of monthly cashflow summed)
  // This is the TOTAL DOLLAR VALUE the property puts in your pocket over the loan life.
  const lifetimeCashflow = cf.reduce((s, x) => s + x, 0);
  const lifetimeFmt = (v) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${v < 0 ? "–" : "+"}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${v < 0 ? "–" : "+"}$${Math.round(abs / 1_000)}k`;
    return `${v < 0 ? "–" : "+"}$${Math.round(abs)}`;
  };
  switch (sortId) {
    case "positive": {
      const y = yearTurnsPositive(cf);
      const color = y && y <= 10 ? "#22C55E" : y && y <= 18 ? "#FACC15" : "#F87171";
      return { big: y ? `Y${y}` : "—", small: "break-even", color };
    }
    case "taxbenefit": {
      const v = ngBenefitValue(property);
      return { big: `${v >= 0 ? "+" : "–"}${fmt(Math.abs(v))}`, small: "tax benefit", color: v >= 0 ? "#22C55E" : "#F43F5E" };
    }
    case "holdingCost": {
      const bleed = cf.reduce((s, x) => s + (x < 0 ? -x : 0), 0);
      const color = bleed <= 40_000 ? "#22C55E" : bleed <= 100_000 ? "#FACC15" : "#F87171";
      return { big: `–${lifetimeFmt(bleed).replace(/^[+–]/, "")}`, small: "out-of-pocket", color };
    }
    case "yield":      return { big: `${property.yieldPct.toFixed(1)}%`,  small: "yield today",  color: "#60A5FA" };
    case "price-low":  return { big: fmt(property.price),                  small: "entry price",  color: "#60A5FA" };
    case "score":
    default: {
      // Best overall — show lifetime cash value (what this puts in your pocket over 30 yrs
      // after all expenses, interest, depreciation tax shield, and NG. Excludes capital gain.)
      const color = lifetimeCashflow >= 100_000 ? "#22C55E" :
                    lifetimeCashflow >=  20_000 ? "#84CC16" :
                    lifetimeCashflow >=       0 ? "#FACC15" :
                    lifetimeCashflow >= -50_000 ? "#FB923C" : "#F87171";
      return { big: lifetimeFmt(lifetimeCashflow), small: "30yr net cash", color };
    }
  }
}

// Property hero image — Unsplash URLs, with a CSS gradient fallback always behind
const IMAGE_URLS = {
  1:  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80",  // Sunbury townhouse
  2:  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80",     // Surry Hills apt
  3:  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80",  // Bardon house
  4:  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80",  // Subiaco apt
  11: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=900&q=80",  // Mascot
  12: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80",  // Brunswick East
  13: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=900&q=80",  // Mooloolaba
  14: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=900&q=80",  // Adelaide tower
  15: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=900&q=80",  // Cottesloe
  21: "https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?w=900&q=80",  // Carlton terrace
  22: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=900&q=80",  // Marrickville cottage
  23: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=900&q=80",     // Toowong walk-up
  24: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=900&q=80",  // Glenelg
  // Eastern Sydney public listings
  31: "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=900&q=80",  // Bondi penthouse
  32: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80",  // Bronte garden apt
  33: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=80",  // Coogee terrace
  34: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80",  // Paddington terrace
  35: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=900&q=80",  // Maroubra townhouse
  36: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80",  // Randwick apt
  37: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=900&q=80",  // Clovelly cottage
  38: "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=900&q=80",  // Woollahra terrace
  39: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80",     // Bellevue Hill apt
  40: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80",  // Tamarama glass house
  41: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=900&q=80",  // Bondi Junction tower
  42: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80",     // Kingsford walk-up
  43: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&q=80",  // Queens Park family
  // Agent-preview private stock
  51: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=900&q=80",  // Vaucluse family
  52: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80",  // Double Bay garden apt
  53: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80",     // Rose Bay new build
  // Catherine Dixon — BresicWhitney (61 uses /listings/norfolk-21/ gallery)
  61: "/listings/norfolk-21/hero.jpg",
  62: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80",
  63: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=80",
  64: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80",
  65: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80",
  66: "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=900&q=80",
};
function getPropertyImage(property) {
  if (property?.gallery?.length) return property.gallery[0];
  if (property?.heroImage) return property.heroImage;
  return IMAGE_URLS[property.id] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80";
}

// Gallery — 4 themed shots per property (hero + 3 interior/exterior variants).
// These broaden the visual story for the detail screen without bloating the seed data.
const GALLERY_POOLS = {
  apartment: [
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80",
    "https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=900&q=80",
  ],
  house: [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&q=80",
    "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=900&q=80",
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=900&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=80",
  ],
  townhouse: [
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=80",
    "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=900&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80",
  ],
};
function getPropertyGallery(property) {
  if (property?.gallery?.length) {
    const g = property.gallery;
    if (g.length >= 4) return g.slice(0, 4);
    return [...g, ...g.slice(1)].slice(0, 4);
  }
  const hero = getPropertyImage(property);
  const type = propertyTypeKey(property);
  const pool = GALLERY_POOLS[type] || GALLERY_POOLS.house;
  // Deterministic by ID so a property always shows the same gallery
  const id = property.id || 0;
  const supporting = [
    pool[(id * 3 + 1) % pool.length],
    pool[(id * 3 + 3) % pool.length],
    pool[(id * 3 + 5) % pool.length],
  ].filter(x => x !== hero);
  return [hero, ...supporting.slice(0, 3)];
}

// Hero image component with gradient fallback always painted behind
export function PropertyHero({ property, height = 150, grayscale = false }) {
  const color = COLORS[property.color];
  return (
    <div style={{
      position: "relative", height, overflow: "hidden",
      background: `linear-gradient(135deg, rgba(${color.rgb},0.55) 0%, rgba(${color.rgb},0.15) 100%), #0B0E14`,
    }}>
      <img
        src={getPropertyImage(property)}
        alt={property.name}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", display: "block",
          filter: grayscale ? "grayscale(1) contrast(0.85) brightness(0.75)" : "none",
        }}
      />
      {/* Bottom-of-image gradient so overlaid text stays readable */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, transparent 30%, rgba(11,14,20,0.85) 100%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

// SUBURB_COORDS, STATE_CENTER, EASTERN_SYDNEY_BOUNDS, getSuburbCoord
//   → src/core/coords.js
// useCountdown → src/hooks/useCountdown.js
// Note: local aggregateBySuburb (line ~7200) is the rich variant that adds
// avgBE / avgTax / build mix / score — kept inline.
import {
  SUBURB_COORDS,
  STATE_CENTER,
  EASTERN_SYDNEY_BOUNDS,
  getSuburbCoord,
} from "./core/coords.js";
import { useCountdown } from "./hooks/useCountdown.js";
function useAnimNum(target, dur = 900) {
  const [v, setV] = useState(target);
  const sT = useRef(0); const sV = useRef(target);
  useEffect(() => {
    sV.current = v; sT.current = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - sT.current) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(sV.current + (target - sV.current) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line
  }, [target]);
  return v;
}

const iconBtn = {
  background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
  width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
  color: "#F5F7FA", cursor: "pointer",
};

function SectionHeading({ children, style }) {
  return <div style={{
    color: "#8B92A5", fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6,
    textTransform: "uppercase", marginBottom: 8, marginLeft: 2, marginTop: 4, ...style,
  }}>{children}</div>;
}

// ─── ScaleToFit — shrinks a fixed-width child to fit narrow screens ─────────
// The brick grids are built on fixed pixel geometry (for the animated dropline,
// pill clamping, etc). Rather than rewrite that, we measure the available width
// and scale the whole thing down on mobile. Never scales above 1× (no blurring
// on desktop). Reserves the correct scaled height so surrounding layout is exact.
// ─── Callout icon — clean monochrome markers for the brick milestone ladder ──
// Replaces the emoji ladder with calm line icons that keep the premium tone.
function CalloutIcon({ kind, size = 15 }) {
  const map = {
    bleed:  { Icon: TrendingDown, color: "#F87171" },
    cost:   { Icon: ArrowDownRight, color: "#FB923C" },
    even:   { Icon: Minus, color: "#FACC15" },
    pays:   { Icon: TrendingUp, color: "#4ADE80" },
    strong: { Icon: TrendingUp, color: "#34D399" },
  };
  const { Icon, color } = map[kind] || map.even;
  return <Icon size={size} color={color} strokeWidth={2.4} />;
}

// ════════════════════════════════════════════════════════════════════════════
// REFERRAL CAPTURE — the revenue path. A slide-up, progressive, same-page
// lead capture. Short to fill; rich in what it sends (property + cashflow +
// slider context is attached automatically — the user types almost nothing).
// ════════════════════════════════════════════════════════════════════════════

const ReferralContext = React.createContext(null);

function useReferral() {
  return React.useContext(ReferralContext);
}

// Wrap the app. Exposes openReferral({ kind, property, context }).
function ReferralProvider({ children }) {
  const [request, setRequest] = useState(null); // { kind, property, context } | null

  const openReferral = (payload) => setRequest(payload || { kind: "agent" });
  const closeReferral = () => setRequest(null);

  return (
    <ReferralContext.Provider value={{ openReferral, closeReferral }}>
      {children}
      <AnimatePresence>
        {request && (
          <ReferralCapture
            key="referral"
            kind={request.kind}
            property={request.property}
            context={request.context}
            onClose={closeReferral}
          />
        )}
      </AnimatePresence>
    </ReferralContext.Provider>
  );
}

// ─── the capture flow itself ────────────────────────────────────────────────
function ReferralCapture({ kind = "agent", property, context, onClose }) {
  const isAgent = kind === "agent";
  const isBroker = kind === "broker";
  const isExpert = kind === "expert";
  // Visual accent palette per kind
  const accent = isBroker ? "#93C5FD" : isExpert ? "#A78BFA" : "#FB7185";
  const accentDeep = isBroker ? "#3B82F6" : isExpert ? "#7C3AED" : "#C9374F";
  const accentSoft = isBroker ? "rgba(96,165,250,0.13)" : isExpert ? "rgba(167,139,250,0.13)" : "rgba(244,63,94,0.13)";

  // step: 0 = name, 1 = contact, 2 = stage (qualifier), 3 = success
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState(null);
  const [note, setNote] = useState("");

  // Centered modal on desktop, bottom sheet on mobile — different patterns
  // for different devices (thumbs reach the bottom; desktop eyes expect centre).
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 600 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const suburb = (property?.suburb || "").split(",")[0].trim() || "your area";

  const STAGES = [
    { id: "research", label: "Just researching", note: "Getting the lay of the land" },
    { id: "3to6",     label: "Buying in 3–6 months", note: "Actively looking" },
    { id: "now",      label: "Ready to buy now", note: "Looking to move quickly" },
    { id: "financed", label: "Finance already sorted", note: "Pre-approved and ready" },
  ];

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = phone.replace(/\D/g, "").length >= 8;

  const totalSteps = 3;
  const progress = step >= totalSteps ? 1 : step / totalSteps;

  // assemble the lead payload — what would be sent to the agent/broker.
  // NOTE FOR PRODUCTION: this object is the lead. Here it is logged and shown.
  // Wire this to: (1) insert into Supabase `referral_leads`, (2) email partner.
  function submitLead() {
    const lead = {
      kind,
      name, email, phone, stage,
      note: note.trim() || null,
      property: property ? {
        id: property.id, name: property.name,
        suburb: property.suburb, price: property.price,
      } : null,
      cashflowContext: context || null,
      submittedAt: new Date().toISOString(),
    };
    // eslint-disable-next-line no-console
    console.log("[Bricks] referral lead captured →", lead);
    setStep(3);
  }

  function next() {
    if (step === 0 && name.trim()) setStep(1);
    else if (step === 1 && emailValid && phoneValid) setStep(2);
  }

  const headline = isExpert
    ? "Walk through your shortlist with a Bricks expert"
    : isBroker
      ? "Match with a mortgage broker"
      : "Match with a buyer's agent";
  const blurb = isExpert
    ? `15 minutes, free. We'll model your situation against the properties you've opened and tell you which actually pays you back — and which to walk away from.`
    : isBroker
      ? `A mortgage broker who'll hunt the whole market for your rate and structure. Free, no obligation.`
      : `A buyer's agent who knows ${suburb} — to negotiate and find stock you can't see. Free to be matched.`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(3,5,8,0.78)", backdropFilter: "blur(6px)",
        display: "flex", justifyContent: "center", alignItems: "center",
        // centred on every screen — a bottom sheet gets covered by the mobile
        // keyboard when a field is focused. Padding keeps it off the edges.
        padding: isMobile ? "16px" : "24px",
      }}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="referral-sheet"
        style={{
          width: "100%", maxWidth: 520,
          background: "linear-gradient(180deg, #10141B 0%, #0A0D12 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "22px",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.8)",
          padding: "0 0 28px",
          maxHeight: "90vh", overflowY: "auto",
          position: "relative",
        }}>

        {/* progress */}
        <div style={{ padding: "22px 22px 0" }}>
          {step < 3 && (
            <div style={{
              height: 3, borderRadius: 99, background: "rgba(255,255,255,0.07)",
              overflow: "hidden", marginBottom: 20,
            }}>
              <motion.div
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.35 }}
                style={{ height: "100%", background: `linear-gradient(90deg, ${accent}, ${accentDeep})` }}
              />
            </div>
          )}
        </div>

        {/* close */}
        <button onClick={onClose} aria-label="Close"
          style={{
            position: "absolute", top: 14, right: 16,
            width: 30, height: 30, borderRadius: 99,
            background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(245,247,250,0.6)",
          }}>
          <X size={15} strokeWidth={2.4} />
        </button>

        <div style={{ padding: "0 26px" }}>

          {/* ─── STEPS 0–2: header ─── */}
          {step < 3 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: accentSoft, borderRadius: 99, padding: "5px 11px",
                marginBottom: 12,
              }}>
                {isExpert
                  ? <Sparkles size={13} color={accent} strokeWidth={2.2} />
                  : isBroker
                    ? <Briefcase size={13} color={accent} strokeWidth={2.2} />
                    : <Users size={13} color={accent} strokeWidth={2.2} />}
                <span style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: "0.04em" }}>
                  {isExpert ? "BRICKS EXPERT" : isBroker ? "MORTGAGE BROKER" : "BUYER'S AGENT"}
                </span>
              </div>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif', fontSize: 23, fontWeight: 500,
                color: "#F5F7FA", letterSpacing: "-0.02em", lineHeight: 1.2,
              }}>{headline}</div>
              {step === 0 && (
                <p style={{
                  margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.5,
                  color: "rgba(245,247,250,0.6)",
                }}>{blurb}</p>
              )}
            </div>
          )}

          {/* property context chip — shows we already know the property */}
          {step < 3 && property && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "10px 12px", marginBottom: 20,
            }}>
              <MapPin size={14} color={accent} strokeWidth={2} style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 600, color: "#F5F7FA",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{property.name}</div>
                <div style={{ fontSize: 11, color: "rgba(245,247,250,0.5)" }}>
                  {property.suburb} · ${(property.price / 1000).toFixed(0)}k · we'll attach your numbers
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 0 — NAME ─── */}
          {step === 0 && (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
              <FieldLabel>First, who are we matching?</FieldLabel>
              <SheetInput
                value={name} onChange={setName} placeholder="Your name"
                accent={accent} autoFocus
                onEnter={next}
              />
              <SheetButton accent={accent} accentDeep={accentDeep}
                disabled={!name.trim()} onClick={next}>
                Continue
              </SheetButton>
            </motion.div>
          )}

          {/* ─── STEP 1 — CONTACT ─── */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
              <FieldLabel>{`Nice to meet you, ${name.trim().split(" ")[0]}. How should they reach you?`}</FieldLabel>
              <SheetInput
                value={email} onChange={setEmail} placeholder="Email address"
                accent={accent} type="email" autoFocus
                valid={email.length === 0 || emailValid}
              />
              <div style={{ height: 10 }} />
              <SheetInput
                value={phone} onChange={setPhone} placeholder="Mobile number"
                accent={accent} type="tel"
                valid={phone.length === 0 || phoneValid}
                onEnter={next}
              />
              <p style={{
                fontSize: 11, color: "rgba(245,247,250,0.4)", margin: "10px 2px 0",
                lineHeight: 1.5,
              }}>
                A good agent calls — that's how the best deals start. Your details
                go only to the matched professional.
              </p>
              <SheetButton accent={accent} accentDeep={accentDeep}
                disabled={!emailValid || !phoneValid} onClick={next}>
                Continue
              </SheetButton>
            </motion.div>
          )}

          {/* ─── STEP 2 — STAGE (the qualifier) ─── */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
              <FieldLabel>Last thing — where are you up to?</FieldLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
                {STAGES.map(s => {
                  const on = stage === s.id;
                  return (
                    <button key={s.id} onClick={() => setStage(s.id)}
                      style={{
                        cursor: "pointer", textAlign: "left",
                        background: on ? accentSoft : "rgba(255,255,255,0.03)",
                        border: `1px solid ${on ? accent : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 13, padding: "13px 15px",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 12, transition: "all 0.14s",
                      }}>
                      <div>
                        <div style={{
                          fontSize: 14, fontWeight: 600,
                          color: on ? "#FFFFFF" : "#F5F7FA",
                        }}>{s.label}</div>
                        <div style={{ fontSize: 11.5, color: "rgba(245,247,250,0.5)", marginTop: 1 }}>
                          {s.note}
                        </div>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: 99, flexShrink: 0,
                        border: `2px solid ${on ? accent : "rgba(255,255,255,0.18)"}`,
                        background: on ? accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {on && <Check size={11} color="#0A0D12" strokeWidth={4} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* optional free-text — appears after a stage is chosen */}
              <AnimatePresence>
                {stage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ overflow: "hidden" }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600, color: "rgba(245,247,250,0.7)",
                      margin: "16px 0 8px",
                    }}>
                      Anything you'd want them to know? <span style={{ color: "rgba(245,247,250,0.4)", fontWeight: 400 }}>(optional)</span>
                    </div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, 400))}
                      placeholder={isAgent
                        ? "e.g. after a 2-bed with parking, can only inspect weekends, flexible on suburb…"
                        : "e.g. self-employed, have a HECS debt, after the lowest possible rate…"}
                      rows={3}
                      style={{
                        width: "100%", boxSizing: "border-box", resize: "none",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12, padding: "12px 14px",
                        color: "#F5F7FA", fontSize: 13.5, fontFamily: "inherit",
                        lineHeight: 1.5, outline: "none",
                      }}
                    />
                    <div style={{
                      fontSize: 10.5, color: "rgba(245,247,250,0.35)",
                      textAlign: "right", marginTop: 4,
                    }}>{note.length}/400</div>
                  </motion.div>
                )}
              </AnimatePresence>

              <SheetButton accent={accent} accentDeep={accentDeep}
                disabled={!stage} onClick={submitLead}>
                {isAgent ? "Match me with an agent" : "Match me with a broker"}
              </SheetButton>
            </motion.div>
          )}

          {/* ─── STEP 3 — SUCCESS ─── */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: "center", padding: "12px 0 6px" }}>
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 14, stiffness: 220, delay: 0.05 }}
                style={{
                  width: 64, height: 64, borderRadius: 99, margin: "0 auto 20px",
                  background: `linear-gradient(135deg, ${accent}, ${accentDeep})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 12px 32px -8px ${accent}`,
                }}>
                <Check size={32} color="#FFFFFF" strokeWidth={3} />
              </motion.div>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif', fontSize: 24, fontWeight: 500,
                color: "#F5F7FA", letterSpacing: "-0.02em", marginBottom: 10,
              }}>
                You're matched, {name.trim().split(" ")[0]}.
              </div>
              <p style={{
                margin: "0 auto 22px", maxWidth: 360, fontSize: 14, lineHeight: 1.55,
                color: "rgba(245,247,250,0.65)",
              }}>
                We're connecting you with a {isAgent ? "buyer's agent" : "mortgage broker"} who
                knows {suburb}{property ? ` and the numbers on ${property.name}` : ""}.
                Expect a call within one business day.
              </p>
              {/* what they'll have in hand — reinforces value */}
              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 13, padding: "14px 16px", marginBottom: 22,
                textAlign: "left",
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: accent, letterSpacing: "0.05em",
                  marginBottom: 8,
                }}>THEY'LL ALREADY HAVE</div>
                {[
                  property ? `The property: ${property.name}` : "Your property shortlist",
                  "Your 30-year Bricks cashflow projection",
                  "Your budget assumptions and timing",
                  ...(note.trim() ? ["Your note about what you're after"] : []),
                ].map(t => (
                  <div key={t} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "3px 0",
                    fontSize: 12.5, color: "rgba(245,247,250,0.7)",
                  }}>
                    <Check size={13} color={accent} strokeWidth={2.6} />
                    {t}
                  </div>
                ))}
              </div>
              <button onClick={onClose}
                style={{
                  cursor: "pointer", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", color: "#F5F7FA",
                  borderRadius: 12, padding: "12px 26px", fontSize: 13.5, fontWeight: 600,
                }}>
                Done
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function FieldLabel({ children }) {
  return <div style={{
    fontSize: 14.5, fontWeight: 600, color: "#F5F7FA",
    marginBottom: 12, lineHeight: 1.35,
  }}>{children}</div>;
}

function SheetInput({ value, onChange, placeholder, accent, type = "text", autoFocus, valid = true, onEnter }) {
  return (
    <input
      type={type} value={value} autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
      placeholder={placeholder}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${valid ? "rgba(255,255,255,0.12)" : "rgba(248,113,113,0.6)"}`,
        borderRadius: 12, padding: "14px 16px",
        color: "#F5F7FA", fontSize: 15, fontFamily: "inherit",
        outline: "none",
      }}
    />
  );
}

function SheetButton({ children, accent, accentDeep, disabled, onClick }) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.015 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      style={{
        width: "100%", marginTop: 18, cursor: disabled ? "default" : "pointer",
        border: "none", borderRadius: 13, padding: "15px 20px",
        fontSize: 14.5, fontWeight: 700, letterSpacing: -0.02,
        background: disabled
          ? "rgba(255,255,255,0.06)"
          : `linear-gradient(135deg, ${accent}, ${accentDeep})`,
        color: disabled ? "rgba(245,247,250,0.3)" : "#FFFFFF",
        boxShadow: disabled ? "none" : `0 12px 28px -12px ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
      {children}
      {!disabled && <ArrowRight size={16} strokeWidth={2.4} />}
    </motion.button>
  );
}


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
    // ResizeObserver picks up parent-width changes that don't fire window resize
    // (e.g. the drill-down sliding in, the side rail collapsing, etc).
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
      width: "100%", maxWidth: contentWidth,
      // CRITICAL: flex items default to min-width: auto (≥ content size). Without
      // this override, flex parents will refuse to shrink us below the inner
      // 388px brick and the grid bleeds off-screen on mobile.
      minWidth: 0,
      height: innerH ?? undefined,
      // The unscaled inner div takes contentWidth of layout space even with
      // transform: scale(<1). Clip horizontally so it can't overflow the parent
      // panel, keep vertical visible so milestone pills above the grid stay drawn.
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

export function CashflowGrid({ cashflow, cols = 30, rows = 12, cell = 8, gap = 2, animate = true, milestones = [], showLabels = false }) {
  // Scroll-trigger animations: only play when the grid enters the viewport.
  // Property cards below the fold otherwise miss their animation.
  const gridRef = useRef(null);
  const inView = useInView(gridRef, { once: true, amount: 0.3 });
  const shouldAnimate = animate && inView;

  const cells = useMemo(() => {
    const out = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        out.push({ idx: c * rows + r, value: cashflow[c * rows + r] ?? 0, col: c, row: r });
      }
    }
    return out;
  }, [cashflow, cols, rows]);
  const gridWidth = cols * cell + (cols - 1) * gap;
  const gridHeight = rows * cell + (rows - 1) * gap;

  // Find the first column that contains any cell crossing into the green (positive)
  const breakEvenCol = useMemo(() => {
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if ((cashflow[c * rows + r] ?? 0) >= 0) return c;
      }
    }
    return -1;
  }, [cashflow, cols, rows]);
  const breakEvenX = breakEvenCol >= 0 ? breakEvenCol * (cell + gap) : -1;

  // Animation sequencing timings — tells a story:
  //   1. Cells fill in column-by-column (0 to ~0.6s)
  //   2. Pill drops in AFTER cells are settled (delay 0.85s)
  //   3. Dropline animates down through grid (delay 1.05s, duration 0.55s)
  //   4. Break-even cells start sustained glow (delay 1.55s)
  const CELL_SWEEP_END = cols * 0.014 + 0.4;     // ~0.82s
  const PILL_DELAY     = CELL_SWEEP_END + 0.05;  // ~0.87s
  const LINE_DELAY     = PILL_DELAY + 0.2;       // ~1.07s
  const GLOW_DELAY     = LINE_DELAY + 0.5;       // ~1.57s

  // Compact format — handles negative ($173) and positive ($1k) values
  const formatMs = (n) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? "–" : "";
    return abs >= 1000 ? `${sign}$${Math.round(abs/1000)}k` : `${sign}$${Math.round(abs)}`;
  };
  const visibleMs = milestones.filter(m => m.yearHit !== null);
  const breakEven = visibleMs.find(m => m.target === 0);

  // ── Evenly-spaced timeline checkpoints — 5 interior years across the 30-year span ──
  // Interior-biased (skip year 1 and year 30) so labels never touch the grid edges.
  // The label rendering also has clamping for an extra safety net on very narrow grids.
  const TIMELINE_YEARS = [3, 9, 15, 22, 28];
  const timelinePoints = useMemo(() => {
    return TIMELINE_YEARS.map(yr => {
      const startMonth = (yr - 1) * 12;
      const endMonth = Math.min(startMonth + 12, cashflow.length);
      const slice = cashflow.slice(startMonth, endMonth);
      if (slice.length === 0) return null;
      const avgMonthly = slice.reduce((s, x) => s + x, 0) / slice.length;
      return { year: yr, avgMonthly: Math.round(avgMonthly) };
    }).filter(Boolean);
  }, [cashflow]);

  // Pill + line geometry: pill sits ABOVE grid with breathing space; line runs through grid
  const PILL_ROW_HEIGHT = 22;  // pill row
  const PILL_TO_GRID_GAP = 6;  // breathing room between pill and grid squares
  const beColIndex = breakEven ? breakEven.yearHit - 1 : -1;
  const beLeftPx = beColIndex * (cell + gap) + cell / 2;
  // Measure actual rendered pill width — much more reliable than estimating from font metrics.
  // useLayoutEffect runs synchronously before paint, so the clamp is correct on the very first
  // visible frame (no flash of misalignment). Fallback estimate is generous so initial render
  // never overflows the grid edge.
  const pillRef = useRef(null);
  const [measuredPillWidth, setMeasuredPillWidth] = useState(0);
  useLayoutEffect(() => {
    if (pillRef.current) {
      const w = pillRef.current.getBoundingClientRect().width;
      if (w > 0 && Math.abs(w - measuredPillWidth) > 0.5) setMeasuredPillWidth(w);
    }
  });
  // Generous fallback so first render never overflows; +8px for halo each side
  const pillWidth = (measuredPillWidth || 140) + 10;
  const PILL_EDGE_PAD  = 6;
  const pillMinX = pillWidth / 2 + PILL_EDGE_PAD;
  const pillMaxX = gridWidth - pillWidth / 2 - PILL_EDGE_PAD;
  const pillClampedX = breakEven ? Math.max(pillMinX, Math.min(pillMaxX, beLeftPx)) : beLeftPx;
  // Triangle pointer: follows the actual dropline position, clamped to stay within pill bounds.
  // Inset 8px from pill edge — close enough to visually connect to line at extreme cases.
  const TRIANGLE_MAX_OFFSET = pillWidth / 2 - 8;
  const triangleOffsetRaw = breakEven ? (beLeftPx - pillClampedX) : 0;
  const triangleOffset = Math.max(-TRIANGLE_MAX_OFFSET, Math.min(TRIANGLE_MAX_OFFSET, triangleOffsetRaw));
  // Chart label goes on opposite side from pill so they don't compete
  const labelOnRight = !breakEven || beColIndex < cols / 2;

  // Color for each milestone — negative = red, positive = gradient by magnitude
  const colorFor = (target) => {
    if (target < 0)    return { bg: "rgba(244,63,94,0.18)",  text: "#F87171", line: "#F43F5E" };
    if (target <= 500)  return { bg: "rgba(234,179,8,0.18)",  text: "#EAB308", line: "#EAB308" };
    if (target <= 1000) return { bg: "rgba(132,204,22,0.20)", text: "#A3E635", line: "#84CC16" };
    if (target <= 1500) return { bg: "rgba(34,197,94,0.20)",  text: "#4ADE80", line: "#22C55E" };
    return                { bg: "rgba(16,185,129,0.24)", text: "#34D399", line: "#10B981" };
  };

  return (
    <ScaleToFit contentWidth={gridWidth}>
      <div ref={gridRef} style={{ width: gridWidth, position: "relative" }}>
      {/* Pill row + grid wrapped together so the line can span both */}
      <div style={{ position: "relative" }}>
        {/* Pill row — contains the break-even celebration AND the chart label.
            The label is positioned on the opposite side from the pill so they never compete. */}
        <div style={{ position: "relative", height: PILL_ROW_HEIGHT, marginBottom: PILL_TO_GRID_GAP }}>
          {/* Chart label — minimal, just communicates the time axis */}
          <div style={{
            position: "absolute",
            top: 5,
            [labelOnRight ? "right" : "left"]: 1,
            color: "#5C6477", fontSize: 8, fontWeight: 800,
            letterSpacing: 0.8, textTransform: "uppercase",
            lineHeight: 1, pointerEvents: "none",
            opacity: 0.75,
          }}>
            Y1 → Y30
          </div>

          {breakEven && (
            <div style={{
              position: "absolute",
              left: `${pillClampedX}px`,
              transform: "translateX(-50%)",
              top: 0,
            }}>
              <motion.div
                initial={animate ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : (animate ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 })}
                transition={{
                  delay: PILL_DELAY,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ position: "relative" }}>
              {/* Sustained soft glow halo — only after pill has dropped in */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={shouldAnimate ? {
                  opacity: [0, 0.30, 0.55, 0.30],
                } : (animate ? { opacity: 0 } : { opacity: 0.4 })}
                transition={{
                  delay: PILL_DELAY + 0.4,
                  duration: 2.6,
                  times: [0, 0.2, 0.5, 1],
                  repeat: Infinity, ease: "easeInOut",
                }}
                style={{
                  position: "absolute", inset: -4,
                  borderRadius: 8,
                  background: "radial-gradient(ellipse, rgba(251,191,36,0.45) 0%, rgba(251,191,36,0) 70%)",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
              <div ref={pillRef} style={{
                position: "relative", zIndex: 1,
                background: "linear-gradient(135deg, #FCD34D 0%, #F59E0B 50%, #FBBF24 100%)",
                color: "#0B0E14",
                fontSize: 10.5, fontWeight: 900, letterSpacing: 0.15,
                padding: "3px 9px", borderRadius: 4,
                whiteSpace: "nowrap",
                boxShadow: "0 2px 8px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.4)",
                lineHeight: 1.1,
              }}>
                PAYS YOU FROM YEAR {breakEven.yearHit}
              </div>
              {/* Smart triangle — points at the ACTUAL dropline, not pill centre.
                  When pill is clamped to an edge, triangle slides toward the line position
                  so the visual story stays coherent. */}
              <div style={{
                position: "absolute",
                bottom: -3,
                left: "50%", transform: `translateX(calc(-50% + ${triangleOffset}px))`,
                width: 0, height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "4px solid #F59E0B",
                zIndex: 0,
              }} />
              </motion.div>
            </div>
          )}
        </div>
        {/* The dropline — starts at bottom of pill, runs through entire grid height. Animates DOWN after pill drops. */}
        {breakEven && (
          <motion.div
            initial={animate ? { scaleY: 0, originY: 0, opacity: 0 } : { scaleY: 1, opacity: 1 }}
            animate={shouldAnimate ? { scaleY: 1, opacity: 1 } : (animate ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 1 })}
            transition={{ delay: LINE_DELAY, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              top: PILL_ROW_HEIGHT - 2,
              height: gridHeight + 4,
              left: `${beLeftPx - 0.75}px`,
              width: 1.5,
              background: "linear-gradient(180deg, #FBBF24 0%, rgba(251,191,36,0.65) 50%, rgba(251,191,36,0.18) 100%)",
              boxShadow: "0 0 4px rgba(251,191,36,0.4)",
              pointerEvents: "none",
              transformOrigin: "top",
              zIndex: 2,
            }}
          />
        )}

        {/* The grid itself */}
        <div style={{
          display: "grid", gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
          gridTemplateRows: `repeat(${rows}, ${cell}px)`, gap: `${gap}px`, gridAutoFlow: "column",
          position: "relative",
        }}>
          {cells.map((c) => {
            const s = cellSpectrum(c.value);
            // Cells in the break-even column get a SUSTAINED glow AFTER the line lands —
            // not a one-time bounce that flashes and disappears.
            const isBreakEvenCell = c.col === breakEvenCol && c.value >= 0;
            const delay = shouldAnimate ? c.col * 0.014 + c.row * 0.002 : 0;
            return (
              <motion.div key={c.idx}
                initial={animate ? { opacity: 0, scale: 0.4 } : false}
                animate={shouldAnimate
                  ? (isBreakEvenCell ? {
                      // Two-phase: appear with rest (no bounce), then sustained glow after line lands
                      opacity: s.opacity,
                      scale: 1,
                      boxShadow: [
                        "0 0 0 rgba(34,197,94,0)",
                        "0 0 0 rgba(34,197,94,0)",
                        "0 0 8px rgba(34,197,94,0.85)",
                        "0 0 3px rgba(34,197,94,0.45)",
                        "0 0 8px rgba(34,197,94,0.85)",
                      ],
                    } : { opacity: s.opacity, scale: 1 })
                  : { opacity: animate ? 0 : s.opacity, scale: animate ? 0.4 : 1 }
                }
                transition={isBreakEvenCell ? {
                  delay,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                  boxShadow: {
                    delay: GLOW_DELAY,
                    duration: 2.6,
                    times: [0, 0.1, 0.4, 0.7, 1],
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                } : {
                  delay,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: cell, height: cell,
                  borderRadius: cell > 8 ? 2.5 : 1.5,
                  background: s.color,
                }} />
            );
          })}
          {/* Soft green flash at break-even column — synced with line arrival */}
          {shouldAnimate && breakEvenCol >= 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 0.8, 0], scale: [0.3, 2.6, 3.4] }}
              transition={{
                delay: GLOW_DELAY,
                duration: 0.9, ease: "easeOut", times: [0, 0.3, 1],
              }}
              style={{
                position: "absolute",
                left: breakEvenX + cell / 2 - 12,
                top: gridHeight / 2 - 12,
                width: 24, height: 24, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(34,197,94,0.55) 0%, rgba(34,197,94,0) 70%)",
                pointerEvents: "none",
              }}
            />
          )}
          {/* Cell scan-line sweep — synced with cell fill-in */}
          {shouldAnimate && (
            <motion.div
              initial={{ opacity: 0.45, left: -4 }}
              animate={{ opacity: 0, left: gridWidth + 4 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{
                position: "absolute", top: -2, bottom: -2, width: 24,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                pointerEvents: "none", filter: "blur(2px)",
              }}
            />
          )}
        </div>
      </div>

      {/* Evenly-spaced cashflow timeline — 5 interior checkpoints across 30 years.
          Each shows the average monthly cashflow at that point, colour-coded.
          Tick mark sits at the exact year column. Label centers under tick where it can;
          only the first and last labels may clamp to fit within the grid edges. */}
      {timelinePoints.length > 0 && (
        <div style={{ position: "relative", height: 30, marginTop: 4 }}>
          {timelinePoints.map((m, i) => {
            const idealX = ((m.year - 0.5) / cols) * gridWidth;
            // Label-width allowance — slightly bigger than half label width.
            // Only edge labels (Y3 / Y28) may overflow on very narrow grids; the rest center freely.
            const LABEL_HALF = 26;
            const labelX = Math.max(LABEL_HALF, Math.min(gridWidth - LABEL_HALF, idealX));
            const c = colorFor(m.avgMonthly);
            return (
              <React.Fragment key={m.year}>
                {/* Tick mark — always at the exact year column, not clamped.
                    Non-animated centering parent wraps the animated child to avoid the
                    Framer transform-override bug (motion's y/opacity transform replaces
                    inline translateX(-50%), causing the element to drift). */}
                <div style={{
                  position: "absolute",
                  left: `${idealX}px`, top: 0,
                  transform: "translateX(-50%)",
                }}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={shouldAnimate ? { opacity: 0.55 } : { opacity: 0 }}
                    transition={{ delay: PILL_DELAY + i * 0.04, duration: 0.3 }}
                    style={{ width: 1, height: 4, background: c.line }}
                  />
                </div>
                {/* Label — clamped to fit only at edges. Same centering-parent pattern. */}
                <div style={{
                  position: "absolute",
                  left: `${labelX}px`, top: 6,
                  transform: "translateX(-50%)",
                }}>
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
                    transition={{ delay: PILL_DELAY + i * 0.04, duration: 0.32, ease: "easeOut" }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                    }}>
                    {/* Value pill */}
                    <div style={{
                      background: c.bg, color: c.text,
                      fontSize: 8.5, fontWeight: 800, letterSpacing: 0.1,
                      padding: "1.5px 4px", borderRadius: 3,
                      whiteSpace: "nowrap",
                      border: `1px solid ${c.line}33`,
                      lineHeight: 1.1,
                    }}>
                      {formatMs(m.avgMonthly)}
                    </div>
                    {/* Year underneath in muted text */}
                    <div style={{ color: "#5C6477", fontSize: 7.5, fontWeight: 600, letterSpacing: 0.2, lineHeight: 1, marginTop: 1 }}>
                      Y{m.year}
                    </div>
                  </motion.div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {showLabels && (
        <div style={{ position: "relative", marginTop: 8, height: 14 }}>
          {[1, 5, 10, 15, 20, 25, 30].map(y => (
            <div key={y} style={{
              position: "absolute", left: `${((y - 0.5) / cols) * 100}%`, transform: "translateX(-50%)",
              color: "#5C6477", fontSize: 10, fontWeight: 500, letterSpacing: 0.3,
            }}>Y{y}</div>
          ))}
        </div>
      )}
      </div>
    </ScaleToFit>
  );
}

function PropertyCard({ property, goals, onOpen, rank, daysUntilCliff, wishlisted, onToggleWishlist, topBadgeLabel }) {
  const cashflow = useMemo(() => generateCashflow(property), [property]);
  const baseMilestones = useMemo(() => calcDollarMilestones(cashflow), [cashflow]);
  // Y1 average monthly cost (negative cashflow) — adds a defensible "today" data point
  const y1MoCost = useMemo(() => {
    const y1 = cashflow.slice(0, 12).reduce((s, x) => s + x, 0) / 12;
    return y1 < 0 ? Math.round(y1) : null;
  }, [cashflow]);
  const milestones = useMemo(() =>
    y1MoCost != null
      ? [...baseMilestones, { target: y1MoCost, yearHit: 1 }]
      : baseMilestones,
    [baseMilestones, y1MoCost]);
  const ngLocked = useMemo(() => ngBenefitValue(property), [property]);
  const meta = useMemo(() => propertyMeta(property), [property]);
  const past10y = useMemo(() => historicalGrowth10y(property), [property]);
  const isOwned = property.status === "owned";
  const isNew = property.build === "new";
  const hero = rank?.hero;
  const marginalRate = Math.round((property.marginalRate || 0.39) * 100);

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onClick={onOpen} whileTap={{ scale: 0.995 }}
      style={{
        background: "rgba(255,255,255,0.025)",
        borderRadius: 20, cursor: "pointer", overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 30px 60px -30px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column",
        transition: "transform 0.25s, box-shadow 0.25s, border-color 0.25s",
      }}
      whileHover={{
        y: -3,
        boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 40px 80px -30px rgba(0,0,0,0.8)",
      }}>

      {/* PHOTO — grayscale for investor-grade data-product feel, not glossy lifestyle */}
      <div style={{ position: "relative", width: "100%", height: 150, flexShrink: 0 }}>
        <PropertyHero property={property} height={150} grayscale={true} />
        {rank && (
          <div style={{
            position: "absolute", top: 12, left: 12,
            padding: "5px 11px", borderRadius: 999,
            background: "rgba(10,12,16,0.92)",
            boxShadow: "0 0 0 1px rgba(244,63,94,0.5) inset, 0 4px 14px -4px rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "inline-flex", alignItems: "center", gap: 5,
            color: "#FB7185",
          }}>
            <Zap size={10} strokeWidth={2.5} fill="#FB7185" />
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, color: "#FB7185" }}>
              #{rank.position} {rank.sortShort}
            </span>
          </div>
        )}
        {topBadgeLabel && (
          <div style={{
            position: "absolute", bottom: 10, left: 12,
            maxWidth: "calc(100% - 80px)",
            fontSize: 9.5, fontWeight: 600, color: "rgba(245,247,250,0.75)",
            padding: "4px 8px", borderRadius: 6,
            background: "rgba(5,7,10,0.72)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.08)",
            lineHeight: 1.3,
            pointerEvents: "none",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {topBadgeLabel}
          </div>
        )}
        {onToggleWishlist && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(property.id); }}
            style={{
              position: "absolute", top: 12, right: 12,
              paddingLeft: 9, paddingRight: 10, height: 28, borderRadius: 999,
              background: wishlisted ? "rgba(244,63,94,0.22)" : "rgba(0,0,0,0.45)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${wishlisted ? "rgba(244,63,94,0.40)" : "rgba(255,255,255,0.10)"}`,
              display: "inline-flex", alignItems: "center", gap: 5,
              cursor: "pointer", color: wishlisted ? "#FB7185" : "rgba(245,247,250,0.9)",
            }}>
            <Bookmark size={12} strokeWidth={2.4}
              fill={wishlisted ? "#FB7185" : "none"} color={wishlisted ? "#FB7185" : "currentColor"} />
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.1 }}>
              {wishlisted ? "Shortlisted" : "Shortlist"}
            </span>
          </motion.button>
        )}
      </div>

      {/* CONTENT — generous vertical spacing */}
      <div style={{ padding: "18px 20px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Price + name row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ color: "#F5F7FA", fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {fmt(property.price)}
            </div>
            <div style={{ color: "rgba(245,247,250,0.85)", fontSize: 14, marginTop: 8, letterSpacing: -0.05, fontWeight: 500 }}>
              {property.name}
            </div>
            <div style={{ color: "rgba(245,247,250,0.45)", fontSize: 12, marginTop: 2, letterSpacing: -0.05 }}>
              {property.suburb}
            </div>
          </div>
        </div>

        {/* Icon row + NEW BUILD */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          paddingTop: 10,
          color: "rgba(245,247,250,0.55)",
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Bed size={12} strokeWidth={1.8} />{meta.beds}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Bath size={12} strokeWidth={1.8} />{meta.baths}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Car size={12} strokeWidth={1.8} />{meta.parking}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Maximize2 size={11} strokeWidth={1.8} />{meta.area}m²
          </span>
          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
            color: isNew ? "#22C55E" : "#F87171" }}>
            {isNew ? "New build" : "Existing"}
          </span>
        </div>

      </div>

      {/* THE CASHFLOW GRID — the only place we let strong colour live */}
      <div style={{ padding: "16px 22px 22px" }}>
        <div style={{
          color: "rgba(245,247,250,0.45)", fontSize: 11.5, marginBottom: 10,
          letterSpacing: -0.05, display: "inline-flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ color: "rgba(96,165,250,0.7)" }}>↗</span>
          {property.suburb.split(",")[0]} median +{Math.round(past10y)}% over the past 10 years
        </div>
        <div style={{ overflow: "hidden", display: "flex", justifyContent: "center" }}>
          <CashflowGrid cashflow={cashflow} cols={30} rows={12} cell={9} gap={2.5} milestones={milestones} />
        </div>

        {/* Card footer — In → Out → multiple, one punchy line */}
        <div style={{
          marginTop: 14, padding: "14px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          {(() => {
            // In  = total out-of-pocket across every month it costs you
            // Out = total cashflow it pays you across every month it's positive
            let cashIn = 0, cashOut = 0;
            for (const m of cashflow) {
              if (m < 0) cashIn += -m; else cashOut += m;
            }
            const fmtK = (n) => n >= 1000
              ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`
              : `$${Math.round(n)}`;
            // the skim stat: every $1 of cashflow in, how much comes back
            const multiple = cashIn > 0 ? cashOut / cashIn : (cashOut > 0 ? 99 : 0);
            const profits = multiple >= 1;
            return (
              <>
                <div style={{
                  display: "flex", alignItems: "center", gap: 0,
                  borderRadius: 10, overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.055)",
                }}>
                  {/* IN */}
                  <div style={{
                    flex: 1, padding: "9px 8px", textAlign: "center",
                    background: "rgba(248,113,113,0.045)", alignSelf: "stretch",
                    display: "flex", flexDirection: "column", justifyContent: "center",
                  }}>
                    <div style={{
                      color: "rgba(245,247,250,0.45)", fontSize: 8.5, fontWeight: 600,
                      letterSpacing: 0.5, textTransform: "uppercase",
                    }}>You put in</div>
                    <div style={{
                      color: "#F87171", fontSize: 15, fontWeight: 700,
                      letterSpacing: "-0.02em", lineHeight: 1, marginTop: 3,
                    }}>{fmtK(cashIn)}</div>
                  </div>
                  {/* chevron — transparent cell, clean glyph */}
                  <div style={{
                    flexShrink: 0, width: 20, alignSelf: "stretch",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <ChevronRight size={13} color="rgba(245,247,250,0.3)" strokeWidth={3} />
                  </div>
                  {/* OUT */}
                  <div style={{
                    flex: 1, padding: "9px 8px", textAlign: "center",
                    background: "rgba(34,197,94,0.045)", alignSelf: "stretch",
                    display: "flex", flexDirection: "column", justifyContent: "center",
                  }}>
                    <div style={{
                      color: "rgba(245,247,250,0.45)", fontSize: 8.5, fontWeight: 600,
                      letterSpacing: 0.5, textTransform: "uppercase",
                    }}>You get back</div>
                    <div style={{
                      color: cashOut > 0 ? "#22C55E" : "rgba(245,247,250,0.4)",
                      fontSize: 15, fontWeight: 700,
                      letterSpacing: "-0.02em", lineHeight: 1, marginTop: 3,
                    }}>{cashOut > 0 ? fmtK(cashOut) : "—"}</div>
                  </div>
                  {/* chevron — transparent cell, clean glyph */}
                  <div style={{
                    flexShrink: 0, width: 20, alignSelf: "stretch",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <ChevronRight size={13} color="rgba(245,247,250,0.3)" strokeWidth={3} />
                  </div>
                  {/* RETURN — calm greyscale when healthy, red only as a warning */}
                  <div style={{
                    flex: 1, padding: "9px 8px", textAlign: "center",
                    background: profits ? "rgba(255,255,255,0.03)" : "rgba(248,113,113,0.06)",
                    alignSelf: "stretch",
                    display: "flex", flexDirection: "column", justifyContent: "center",
                  }}>
                    <div style={{
                      color: "rgba(245,247,250,0.45)", fontSize: 8.5, fontWeight: 600,
                      letterSpacing: 0.5, textTransform: "uppercase",
                    }}>Return</div>
                    <div style={{
                      color: profits ? "#F5F7FA" : "#F87171",
                      fontSize: 15, fontWeight: 800,
                      letterSpacing: "-0.02em", lineHeight: 1, marginTop: 3,
                    }}>{multiple >= 10 ? "10×+" : `${multiple.toFixed(1)}×`}</div>
                  </div>
                </div>
                <div style={{
                  color: "rgba(245,247,250,0.35)", fontSize: 9.5, marginTop: 7,
                  textAlign: "center", letterSpacing: -0.03,
                }}>
                  Total cashflow over 30 years · capital growth not counted
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </motion.div>
  );
}

function CardStat({ label, value, sub, tone }) {
  const colors = {
    bad:  { bg: "rgba(248,113,113,0.04)", val: "#F87171" },
    warn: { bg: "rgba(251,146,60,0.04)",  val: "#FB923C" },
    good: { bg: "#15171F",                val: "#22C55E" },
    hero: { bg: "rgba(16,185,129,0.06)",  val: "#10B981" },
  };
  const c = colors[tone] ?? colors.good;
  return (
    <div style={{ background: c.bg, padding: "9px 8px" }}>
      <div style={{ color: "#5C6477", fontSize: 9, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: c.val, fontSize: 15, fontWeight: 700, marginTop: 3, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      <div style={{ color: "#5C6477", fontSize: 9.5, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function TabBtn({ active, onClick, Icon, label, badge }) {
  return (
    <motion.button whileTap={{ scale: 0.92 }} onClick={onClick} style={{
      background: "transparent", border: "none",
      color: active ? "#F5F7FA" : "#5C6477",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      cursor: "pointer", padding: "6px 10px", position: "relative",
    }}>
      <div style={{ position: "relative", lineHeight: 1 }}>
        <Icon size={20} strokeWidth={2} />
        {badge > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -8,
            background: "#F43F5E", color: "#F5F7FA",
            fontSize: 9, fontWeight: 800,
            padding: "1px 5px", borderRadius: 999,
            minWidth: 14, textAlign: "center", lineHeight: 1.2,
            border: "1.5px solid #0B0E14",
          }}>{badge}</span>
        )}
      </div>
      <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 0.2 }}>{label}</span>
    </motion.button>
  );
}

function BottomNav({ active, onTab, onAdd, wishlistCount = 0 }) {
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      background: "rgba(11,14,20,0.92)", backdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", justifyContent: "space-around",
      padding: "10px 8px 24px", zIndex: 10,
    }}>
      <TabBtn active={active === "browse"} onClick={() => onTab("browse")} Icon={Sparkles} label="Hunt" />
      <TabBtn active={active === "saved"}  onClick={() => onTab("saved")}  Icon={Bookmark} label="Shortlist" badge={wishlistCount} />
      <TabBtn active={active === "budget"} onClick={() => onTab("budget")} Icon={Zap} label="Budget" />
      <TabBtn active={false} onClick={onAdd} Icon={Plus} label="Track" />
      <TabBtn active={active === "settings"} onClick={() => onTab("settings")} Icon={Settings} label="More" />
    </div>
  );
}

function HomeScreen({ properties, goals, onOpen }) {
  const owned = properties.filter(p => p.status === "owned");
  const considering = properties.filter(p => p.status === "considering");
  return (
    <motion.div key="home" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.22 }}
      style={{ padding: "60px 16px 110px", height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ color: "#5C6477", fontSize: 10, fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase" }}>
            B R I C K S
          </div>
          <div style={{ color: "#F5F7FA", fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 3 }}>
            Your portfolio
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.92 }} style={iconBtn}><Settings size={17} /></motion.button>
      </div>
      {owned.length > 0 && (
        <>
          <SectionHeading>Owned · {owned.length}</SectionHeading>
          {owned.map(p => <PropertyCard key={p.id} property={p} goals={goals} onOpen={() => onOpen(p.id)} />)}
        </>
      )}
      {considering.length > 0 && (
        <>
          <SectionHeading style={{ marginTop: 16 }}>Considering · {considering.length}</SectionHeading>
          {considering.map(p => <PropertyCard key={p.id} property={p} goals={goals} onOpen={() => onOpen(p.id)} />)}
        </>
      )}
      <div style={{ textAlign: "center", color: "#5C6477", fontSize: 11, padding: "16px 0" }}>
        Tap a property to see when it hits your goals
      </div>
    </motion.div>
  );
}

function ConfidenceCard({ Icon, label, data, max = 100, higherBetter = true, delay = 0 }) {
  const animVal = useAnimNum(data.score);
  const pct = data.score / max;
  const goodness = higherBetter ? pct : 1 - pct;
  let band, bandColor;
  if (goodness >= 0.7) { band = "Strong"; bandColor = "#34D399"; }
  else if (goodness >= 0.45) { band = "Moderate"; bandColor = "#FACC15"; }
  else { band = "Weak"; bandColor = "#F87171"; }
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      style={{ background: "#15171F", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 14, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${bandColor}24`, color: bandColor,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={15} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ color: "#F5F7FA", fontSize: 13, fontWeight: 600 }}>{label}</div>
            <div style={{ color: bandColor, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 1 }}>{band}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: bandColor, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{Math.round(animVal)}</div>
          <div style={{ color: "#5C6477", fontSize: 9.5, marginTop: 2 }}>/ {max}{higherBetter ? "" : " · lower better"}</div>
        </div>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ delay: delay + 0.2, duration: 0.7 }}
          style={{ height: "100%", background: bandColor, borderRadius: 2 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {data.reasons.map((r, i) => (
          <div key={i} style={{ color: "#C5CAD6", fontSize: 11.5, display: "flex", gap: 6, alignItems: "flex-start" }}>
            <span style={{ color: bandColor, marginTop: 1, flexShrink: 0 }}>•</span><span>{r}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ToggleOption({ active, onClick, color, label, sub }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{
        background: active ? color.hex : "transparent",
        color: active ? "#0B0E14" : "#8B92A5",
        border: "none", borderRadius: 8, padding: "10px 8px", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 1, transition: "all 0.18s",
      }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "-0.01em" }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 600, opacity: active ? 0.7 : 0.85 }}>{sub}</span>
    </motion.button>
  );
}
function Stat({ label, value, accent }) {
  return (
    <div style={{ background: "#15171F", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 11, padding: 10 }}>
      <div style={{ color: "#5C6477", fontSize: 9.5, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: accent ?? "#F5F7FA", fontSize: 17, fontWeight: 700, marginTop: 3, letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

// ─── DETAIL ROUTER ──────────────────────────────────────────────────────────

function DetailScreen({ property, goals, onBack, onOpen, onOpenBudget, wishlisted, onToggleWishlist }) {
  return property.status === "owned"
    ? <OwnedDetail property={property} goals={goals} onBack={onBack} />
    : <ConsideringDetail property={property} goals={goals} onBack={onBack} onOpen={onOpen}
        onOpenBudget={onOpenBudget}
        wishlisted={wishlisted} onToggleWishlist={onToggleWishlist} />;
}

// Photo gallery — swipeable horizontal scroll, 4 images per property
function PhotoGallery({ property }) {
  const images = useMemo(() => getPropertyGallery(property), [property]);
  const [active, setActive] = useState(0);

  return (
    <div>
      <div style={{
        display: "flex", gap: 6,
        overflowX: "auto", overflowY: "hidden",
        marginLeft: -16, marginRight: -16,
        padding: "0 16px",
        scrollSnapType: "x mandatory",
        scrollbarWidth: "none",
      }}>
        {images.map((src, i) => (
          <div key={i}
            onScroll={() => setActive(i)}
            style={{
              flexShrink: 0,
              width: "92%", height: 220,
              borderRadius: 14, overflow: "hidden",
              scrollSnapAlign: "center",
              background: "#15171F",
            }}>
            <img src={src} alt={`Property photo ${i + 1}`}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        ))}
      </div>
      {/* Dot indicator */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
        {images.map((_, i) => (
          <div key={i} style={{
            width: i === active ? 16 : 5, height: 5, borderRadius: 999,
            background: i === active ? "#F5F7FA" : "rgba(255,255,255,0.18)",
            transition: "width 0.18s ease",
          }} />
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CONSIDERING DETAIL — the property drill-down. Rebuilt verdict-first.
// Leads with the post-budget cashflow verdict (Bricks's actual differentiator),
// lets the user adjust every assumption, and ends on a reasoned buyer's-agent CTA.
// ════════════════════════════════════════════════════════════════════════════

// ─── Studio slider — draggable lever with live value + micro-feedback ───────
function StudioSlider({ label, value, min, max, step, fmt, onChange, hint, icon: Icon }) {
  const effMin = Math.min(min, value);
  const effMax = Math.max(max, value);
  const pct = effMax === effMin ? 100 : ((value - effMin) / (effMax - effMin)) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 12.5, color: "rgba(245,247,250,0.7)", fontWeight: 500,
          display: "inline-flex", alignItems: "center", gap: 7,
        }}>
          {Icon && (
            <span style={{
              width: 22, height: 22, borderRadius: 7, flexShrink: 0,
              background: "rgba(251,113,133,0.13)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={12} color="#FB7185" strokeWidth={2.2} />
            </span>
          )}
          {label}
        </span>
        <motion.span key={value}
          initial={{ scale: 1.15, color: "#FB7185" }} animate={{ scale: 1, color: "#F5F7FA" }}
          transition={{ duration: 0.25 }}
          style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {fmt(value)}
        </motion.span>
      </div>
      <input type="range" min={effMin} max={effMax} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: "100%", height: 6, borderRadius: 999, appearance: "none",
          cursor: "pointer", outline: "none",
          background: `linear-gradient(to right, #E5485F 0%, #FB7185 ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
        }} />
      {hint && (
        <div style={{ fontSize: 10, color: "rgba(245,247,250,0.38)", marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}

// ─── What-If card — a mini cashflow brick that responds to hypothetical wins ─
// Pills apply a hypothetical improvement to the model. Framed as "what a better
// deal would do" — never a promise that an agent/broker delivers a set figure.
function WhatIfCard({ baseConfig, pills, accent, title, cell = 11 }) {
  // first pill active by default — the value shows immediately, no tap needed
  const [active, setActive] = useState(pills[0]?.id ?? null);

  const baseCf = useMemo(() => generateCashflow(baseConfig), [baseConfig]);
  const whatIfCf = useMemo(() => {
    if (!active) return baseCf;
    const p = pills.find(x => x.id === active);
    if (!p) return baseCf;
    return generateCashflow(p.apply(baseConfig));
  }, [active, baseCf, baseConfig, pills]);

  const baseBE = useMemo(() => yearTurnsPositive(baseCf), [baseCf]);
  const newBE = useMemo(() => yearTurnsPositive(whatIfCf), [whatIfCf]);
  const baseLife = useMemo(() => baseCf.reduce((s, x) => s + x, 0), [baseCf]);
  const newLife = useMemo(() => whatIfCf.reduce((s, x) => s + x, 0), [whatIfCf]);
  const lifeGain = Math.round(newLife - baseLife);
  const yearsOff = (baseBE && newBE) ? baseBE - newBE : 0;
  const whatIfMilestones = useMemo(() => calcDollarMilestones(whatIfCf), [whatIfCf]);

  return (
    <div>
      {/* title — names the property the projection is for */}
      {title && (
        <div style={{
          fontSize: 12.5, color: "rgba(245,247,250,0.6)", fontWeight: 600,
          marginBottom: 14, letterSpacing: "-0.01em",
        }}>{title}</div>
      )}

      {/* the cashflow brick — full size, with the "pays you from" line + tags.
          Block layout (not flex) so ScaleToFit's min-width:0 actually shrinks
          the brick to fit narrow mobile panels rather than overflowing. */}
      <div style={{
        width: "100%", overflowX: "clip", overflowY: "visible",
        paddingTop: 8, marginBottom: 18,
      }}>
        <CashflowGrid cashflow={whatIfCf} cell={cell} gap={2} animate={false}
          milestones={whatIfMilestones} showLabels />
      </div>

      {/* outcome — time + money, the two that land */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.035)",
          borderRadius: 12, padding: "13px 15px",
        }}>
          <div style={{ fontSize: 10, color: "rgba(245,247,250,0.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Time saved
          </div>
          <motion.div key={yearsOff}
            initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 22, fontWeight: 600, marginTop: 4, color: yearsOff > 0 ? accent : "#F5F7FA" }}>
            {yearsOff > 0 ? `${yearsOff} yr${yearsOff > 1 ? "s" : ""} sooner` : "—"}
          </motion.div>
        </div>
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.035)",
          borderRadius: 12, padding: "13px 15px",
        }}>
          <div style={{ fontSize: 10, color: "rgba(245,247,250,0.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Money over 30 yrs
          </div>
          <motion.div key={lifeGain}
            initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontFamily: 'ui-serif, Georgia, serif', fontSize: 22, fontWeight: 600, marginTop: 4, color: lifeGain > 0 ? "#4ADE80" : "#F5F7FA" }}>
            {lifeGain !== 0 ? `${lifeGain >= 0 ? "+" : "−"}$${Math.abs(lifeGain).toLocaleString()}` : "—"}
          </motion.div>
        </div>
      </div>

      {/* what-if pills — refined: a quiet outlined set, the active one filled subtly */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {pills.map(p => {
          const on = active === p.id;
          return (
            <button key={p.id}
              onClick={() => setActive(p.id)}
              style={{
                cursor: "pointer", borderRadius: 999,
                padding: "8px 14px", fontSize: 11.5, fontWeight: 600,
                background: on ? "rgba(255,255,255,0.07)" : "transparent",
                color: on ? "#F5F7FA" : "rgba(245,247,250,0.5)",
                border: `1px solid ${on ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)"}`,
                transition: "all 0.18s",
              }}>{p.label}</button>
          );
        })}
      </div>
      <div style={{
        fontSize: 10.5, color: "rgba(245,247,250,0.34)", marginTop: 11, lineHeight: 1.4,
      }}>
        Hypothetical — what a better deal would do. Not a promise of a specific result.
      </div>
    </div>
  );
}

function ConsideringDetail({ property: propIn, goals, onBack, onOpen, onOpenBudget, wishlisted, onToggleWishlist }) {
  const { days: daysUntilCliff } = useCountdown();
  const { openReferral } = useReferral();
  const [shareOpen, setShareOpen] = useState(false);

  const isAgentPreview = propIn?.agentPreview === true || propIn?.source === "agent-preview";
  const agent = propIn?.agent || DEMO_AGENT;
  const listingAgent = useMemo(() => {
    if (propIn?.agent?.name) return propIn.agent;
    const a = getListingAgent(propIn);
    return {
      name: a.name,
      agency: a.agency,
      photo: a.photo,
      phone: DEMO_AGENT.phone,
      email: DEMO_AGENT.email,
    };
  }, [propIn]);

  const detailInsights = useMemo(
    () => getPropertyInsights(propIn, ALL_PROPS, SCORING_ENGINE),
    [propIn],
  );

  // Where would this property rank vs live stock on the market? (Agent previews only.)
  const marketInsights = useMemo(() => {
    if (!isAgentPreview) return null;
    const publicPool = ALL_PROPS.filter(
      p => !(p.agentPreview || p.source === "agent-preview") && p.status !== "owned",
    );
    const pool = publicPool.some(p => p.id === propIn.id) ? publicPool : [...publicPool, propIn];
    return getPropertyInsights(propIn, pool, SCORING_ENGINE);
  }, [propIn, isAgentPreview]);

  // ── Editable assumptions — pre-filled with our best estimates ──────────────
  const [vars, setVars] = useState({
    price: propIn.price,
    deposit: 20,
    rate: 6.39,
    loanType: "io",
    rentPerWeek: Math.round((propIn.price * (propIn.yieldPct / 100)) / 52),
    rentGrowth: 3.0,
    growthPct: propIn.growthPct || 5,
    marginalRate: 39,
    build: propIn.build,
    state: propIn.state || "NSW",
    pporYears: 0,
  });
  const set = (k) => (v) => setVars(s => ({ ...s, [k]: v }));

  // base assumptions — for the Reset button
  const baseVars = useMemo(() => ({
    price: propIn.price,
    deposit: 20,
    rate: 6.39,
    loanType: "io",
    rentPerWeek: Math.round((propIn.price * (propIn.yieldPct / 100)) / 52),
    rentGrowth: 3.0,
    growthPct: propIn.growthPct || 5,
    marginalRate: 39,
    build: propIn.build,
    state: propIn.state || "NSW",
    pporYears: 0,
  }), [propIn]);
  const scenarioDirty = useMemo(
    () => JSON.stringify(vars) !== JSON.stringify(baseVars), [vars, baseVars]);

  // ── This property, on the user's (slider-driven) assumptions ───────────────
  const cfConfig = useMemo(() => ({
    price: vars.price,
    yieldPct: (vars.rentPerWeek * 52) / vars.price * 100,
    growthPct: vars.growthPct,
    rate: vars.rate / 100,
    deposit: vars.deposit / 100,
    marginalRate: vars.marginalRate / 100,
    build: vars.build,
    state: vars.state,
    loanType: vars.loanType,
    type: propIn.type,
    pporYears: vars.pporYears || 0,
  }), [vars, propIn.type]);
  const cashflow = useMemo(() => generateCashflow(cfConfig), [cfConfig]);

  // ── The comparison: same money, the other side of the budget line ──────────
  const cashflowAlt = useMemo(() => generateCashflow({
    price: vars.price,
    yieldPct: (vars.rentPerWeek * 52) / vars.price * 100,
    growthPct: vars.growthPct,
    rate: vars.rate / 100,
    deposit: vars.deposit / 100,
    marginalRate: vars.marginalRate / 100,
    build: vars.build === "new" ? "existing" : "new",
    state: vars.state,
    loanType: vars.loanType,
    type: propIn.type,
    pporYears: vars.pporYears || 0,
  }), [vars, propIn.type]);

  // ── Verdict figures ────────────────────────────────────────────────────────
  const breakEven = useMemo(() => yearTurnsPositive(cashflow), [cashflow]);
  const totalBleed = useMemo(
    () => cashflow.reduce((s, x) => s + (x < 0 ? -x : 0), 0), [cashflow]);
  const lifetimeNet = useMemo(() => cashflow.reduce((s, x) => s + x, 0), [cashflow]);
  const lifetimeNetAlt = useMemo(() => cashflowAlt.reduce((s, x) => s + x, 0), [cashflowAlt]);
  const y1Monthly = useMemo(
    () => cashflow.slice(0, 12).reduce((s, x) => s + x, 0) / 12, [cashflow]);
  const y1Weekly = y1Monthly * 12 / 52;
  const gap = Math.round(lifetimeNet - lifetimeNetAlt);

  const sliderBounds = useMemo(
    () => studioSliderBounds(propIn.price, vars.price, vars.rentPerWeek),
    [propIn.price, vars.price, vars.rentPerWeek],
  );

  const { monthlyEquity, loanBalance, equitySeries, depositEquity } = useMemo(
    () => computeWealthProjection(vars, cashflow),
    [vars, cashflow],
  );
  const wealth10 = equitySeries[9] ?? 0;
  const wealth30 = equitySeries[29] ?? 0;

  const isNew = vars.build === "new";
  const fmt0 = (n) => `$${Math.round(Math.abs(n)).toLocaleString()}`;

  // ── Milestones for the cashflow Map's break-even line ──────────────────────
  const cashflowMilestones = useMemo(() => calcDollarMilestones(cashflow), [cashflow]);

  // ── Dollar callouts UNDER the brick — 5 fixed, evenly-spread years ─────────
  const brickCallouts = useMemo(() => {
    const yearOf = (y) => cashflow.slice((y - 1) * 12, y * 12).reduce((s, x) => s + x, 0);
    const pts = [1, 8, 15, 22, 30];   // fixed & distinct — no duplicates
    const iconFor = (amt) => {
      if (amt < -8000) return "bleed";
      if (amt < 0)     return "cost";
      if (amt < 8000)  return "even";
      if (amt < 25000) return "pays";
      return "strong";
    };
    const noteFor = (amt) => {
      if (amt < 0)      return "costs you";
      if (amt < 8000)   return "near even";
      return "pays you";
    };
    return pts.map(y => {
      const amt = yearOf(y);
      return {
        year: y, amount: amt,
        value: `${amt < 0 ? "−" : "+"}$${Math.round(Math.abs(amt)).toLocaleString()}`,
        icon: iconFor(amt),
        note: noteFor(amt),
      };
    });
  }, [cashflow]);

  // ── Excel export — the lead magnet (free) ──────────────────────────────────
  const downloadExcel = () => {
    // Build a simple CSV (opens cleanly in Excel) of the 30-year model.
    const rows = [["The Bricks — 30-Year Model", propIn.name]];
    rows.push([propIn.suburb, propIn.type, scenarioDirty ? "Custom scenario" : "Base case"]);
    rows.push([`Price $${vars.price}`, `Deposit ${vars.deposit}%`, `Rate ${vars.rate}%`, `Growth ${vars.growthPct}%`, `${vars.loanType.toUpperCase()}`, `${vars.build}`]);
    rows.push([]);
    rows.push(["Year", "Annual cashflow ($)", "Projected equity ($)"]);
    for (let y = 0; y < 30; y++) {
      const annual = cashflow.slice(y * 12, y * 12 + 12).reduce((s, x) => s + x, 0);
      rows.push([y + 1, Math.round(annual), equitySeries[y] ?? 0]);
    }
    rows.push([]);
    rows.push(["Break-even year", breakEven || "Never"]);
    rows.push(["Year-1 weekly cost", Math.round(y1Weekly)]);
    rows.push(["Wealth by year 10", wealth10]);
    rows.push(["Figures are estimates / projections. Not financial advice."]);
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TheBricks-${propIn.name.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── 4 other real properties for the comparison ─────────────────────────────
  const comparisonProps = useMemo(() => {
    const pool = ALL_PROPS.filter(p => p.id !== propIn.id && p.status !== "owned");
    // spread of choices: cheaper, pricier, a new build, an established
    const picks = [];
    const cheaper = pool.filter(p => p.price < propIn.price).sort((a, b) => b.price - a.price)[0];
    const pricier = pool.filter(p => p.price > propIn.price).sort((a, b) => a.price - b.price)[0];
    const newB = pool.find(p => p.build === "new" && ![cheaper, pricier].includes(p));
    const estB = pool.find(p => p.build === "existing" && ![cheaper, pricier, newB].includes(p));
    [cheaper, pricier, newB, estB].forEach(p => { if (p && !picks.includes(p)) picks.push(p); });
    for (const p of pool) {
      if (picks.length >= 4) break;
      if (!picks.includes(p)) picks.push(p);
    }
    return picks.slice(0, 4);
  }, [propIn.id, propIn.price]);

  return (
    <motion.div key={`detail-${propIn.id}`}
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.26 }}
      style={{ position: "relative", paddingBottom: isAgentPreview ? 96 : 96 }}>

      {!isAgentPreview && <ScreenHeroBg height={420} />}
      {isAgentPreview && (
        <AgentShareHeader
          agent={agent}
          onBack={onBack}
          backLabel="Back to preview list"
        />
      )}

      <div className="screen-content" style={{ position: "relative", zIndex: 1, padding: "0 24px" }}>

        {/* ═══ AGENT SHARE VIEW — buyer/seller facing preview ═══ */}
        {isAgentPreview && (
          <>
            <div style={{ paddingTop: 24, marginBottom: 28, maxWidth: 920, margin: "0 auto" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
                padding: "7px 14px", borderRadius: 999,
                background: "rgba(96,165,250,0.1)",
                border: "1px solid rgba(96,165,250,0.28)",
                fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "#BFDBFE",
              }}>
                <Lock size={12} strokeWidth={2.4} color="#93C5FD" />
                Thinking of selling? · modelled preview
              </div>

              <div style={{
                fontFamily: 'ui-serif, Georgia, serif', fontSize: 32, fontWeight: 500,
                color: "#F5F7FA", letterSpacing: "-0.03em", lineHeight: 1.12, marginBottom: 8,
              }}>
                Where would your home rank if you listed today?
              </div>
              <div style={{ fontSize: 15, color: "rgba(245,247,250,0.55)", marginBottom: 6 }}>
                {propIn.name} · {propIn.suburb}
              </div>
              <div style={{ fontSize: 13.5, color: "rgba(245,247,250,0.45)", marginBottom: 16, lineHeight: 1.5 }}>
                Prepared by {agent.name} — show owners how compelling their listing would look to investors,
                and why listing with you puts their property in the best light.
              </div>

              {marketInsights?.suburbRank != null && marketInsights.suburbTotal > 0 && (
                <div style={{
                  padding: "16px 18px", borderRadius: 16, marginBottom: 18,
                  background: "linear-gradient(135deg, rgba(251,113,133,0.14) 0%, rgba(251,113,133,0.04) 100%)",
                  border: "1px solid rgba(251,113,133,0.28)",
                }}>
                  <div style={{
                    fontFamily: 'ui-serif, Georgia, serif', fontSize: 28, fontWeight: 500,
                    color: "#FB7185", letterSpacing: "-0.03em", lineHeight: 1.1,
                  }}>
                    Would rank #{marketInsights.suburbRank} of {marketInsights.suburbTotal} in {propIn.suburb.split(",")[0]}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13.5, color: "rgba(245,247,250,0.65)", lineHeight: 1.5 }}>
                    Modelled against properties currently on the market for investment — before this home goes live.
                    {breakEven ? ` Breaks even year ${breakEven} on ${agent.name?.split(" ")[0] || "the agent"}'s assumptions.` : ""}
                  </div>
                </div>
              )}

              <div style={{
                padding: "14px 16px", borderRadius: 12, marginBottom: 28,
                background: "rgba(96,165,250,0.08)",
                border: "1px solid rgba(96,165,250,0.22)",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                <Info size={16} color="#93C5FD" strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#BFDBFE", lineHeight: 1.35 }}>
                    These numbers are modelled — put in your own assumptions below
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12.5, color: "rgba(245,247,250,0.6)", lineHeight: 1.5 }}>
                    Built from {agent.name}&apos;s listing brief plus suburb stats and market data. Drag the levers to match your deposit, rate and tax bracket — then talk to {agent.name?.split(" ")[0]} about the real floorplan and rent appraisal.
                  </div>
                </div>
              </div>

              {/* Hero stats — the four numbers that matter */}
              <div className="studio-strip" style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16, overflow: "hidden", marginBottom: 24,
              }}>
                {[
                  { label: "Costs you now", value: `$${Math.round(Math.abs(y1Weekly))}`, unit: "per week", c: "#F87171" },
                  { label: "Turns positive", value: breakEven ? `Yr ${breakEven}` : "Never", unit: breakEven ? "pays you from here" : "in 30 years", c: breakEven ? "#4ADE80" : "#F87171" },
                  { label: "Wealth by yr 10", value: `$${Math.round(wealth10 / 1000)}k`, unit: "equity + cashflow", c: wealth10 >= 0 ? "#4ADE80" : "#F87171" },
                  { label: "Owned by yr 30", value: `$${Math.round(wealth30 / 1000)}k`, unit: "projected equity", c: "#93C5FD" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#0B0D12", padding: "16px 10px", textAlign: "center" }}>
                    <div style={{
                      fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase",
                      color: "rgba(245,247,250,0.42)", fontWeight: 600, marginBottom: 7,
                    }}>{s.label}</div>
                    <div style={{
                      fontFamily: 'ui-serif, Georgia, serif', fontSize: 24, fontWeight: 600,
                      color: s.c, lineHeight: 1, letterSpacing: "-0.02em",
                    }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "rgba(245,247,250,0.45)", marginTop: 5 }}>{s.unit}</div>
                  </div>
                ))}
              </div>

              {/* THE 30-YEAR CASHFLOW BRICK — hero, full width */}
              <div style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20, padding: "24px 20px", marginBottom: 24,
              }}>
                <div style={{
                  fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "#FB7185", fontWeight: 700, marginBottom: 6,
                }}>
                  30-year cashflow
                </div>
                <div style={{
                  fontFamily: 'ui-serif, Georgia, serif', fontSize: 22, fontWeight: 500,
                  color: "#F5F7FA", marginBottom: 16, letterSpacing: "-0.02em",
                }}>
                  {breakEven
                    ? <>Pays you from <span style={{ color: "#4ADE80" }}>year {breakEven}</span></>
                    : <>Costs you every year — <span style={{ color: "#F87171" }}>never breaks even</span></>}
                </div>
                <div style={{ display: "flex", justifyContent: "center", overflowX: "auto" }}>
                  <CashflowGrid cashflow={cashflow} cell={10} gap={2.5}
                    milestones={cashflowMilestones} showLabels={true} />
                </div>
                <div className="brick-callouts" style={{
                  display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6,
                  marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
                }}>
                  {brickCallouts.map(c => (
                    <div key={c.year} style={{ textAlign: "center" }}>
                      <div style={{ marginBottom: 4, display: "flex", justifyContent: "center" }}>
                        <CalloutIcon kind={c.icon} size={15} />
                      </div>
                      <div style={{
                        fontFamily: 'ui-serif, Georgia, serif', fontSize: 13, fontWeight: 600,
                        color: c.amount >= 0 ? "#4ADE80" : "#F87171",
                      }}>{c.value}</div>
                      <div style={{ fontSize: 9, color: "rgba(245,247,250,0.45)", marginTop: 3 }}>Yr {c.year}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* THE 30-YEAR WEALTH BRICK — hero, full width */}
              <div style={{
                background: "linear-gradient(180deg, rgba(74,222,128,0.06), rgba(255,255,255,0.015))",
                border: "1px solid rgba(74,222,128,0.18)",
                borderRadius: 20, padding: "24px 20px", marginBottom: 24,
              }}>
                <div style={{
                  fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "#4ADE80", fontWeight: 700, marginBottom: 6,
                }}>
                  30-year wealth
                </div>
                <div style={{
                  fontFamily: 'ui-serif, Georgia, serif', fontSize: 22, fontWeight: 500,
                  color: "#F5F7FA", marginBottom: 16, letterSpacing: "-0.02em", lineHeight: 1.25,
                }}>
                  Builds{" "}
                  <span style={{ color: "#4ADE80" }}>{fmtMoneyShort(wealth30)}</span>
                  {" "}by year 30 — the story buyers want to hear
                </div>
                <div style={{ display: "flex", justifyContent: "center", overflowX: "auto" }}>
                  <WealthGrid
                    monthlyEquity={monthlyEquity}
                    depositEquity={depositEquity}
                    cell={10} gap={2.5}
                  />
                </div>
              </div>
            </div>
            <AgentContactDock agent={agent} propertyName={propIn.name} />
          </>
        )}

        {/* ═══ STANDARD DETAIL — public listings ═══ */}
        {!isAgentPreview && (
        <>
        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <div className="detail-header-pad" style={{ paddingTop: 96, marginBottom: 30 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, marginBottom: 24,
          }}>
            <button onClick={onBack}
              style={{
                cursor: "pointer", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999,
                padding: "8px 14px", color: "rgba(245,247,250,0.7)",
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 13, fontWeight: 500,
              }}>
              <ArrowLeft size={14} strokeWidth={2} /> All properties
            </button>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {detailInsights.badges.length > 0 && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setShareOpen(true)}
                  aria-label="Share on social"
                  title="Share on social"
                  style={{
                    cursor: "pointer", borderRadius: 999,
                    width: 40, height: 40,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(245,247,250,0.7)",
                  }}>
                  <Share2 size={16} strokeWidth={2.2} />
                </motion.button>
              )}
              <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onToggleWishlist && onToggleWishlist(propIn.id)}
              style={{
                cursor: "pointer", borderRadius: 999,
                padding: "9px 16px",
                display: "inline-flex", alignItems: "center", gap: 7,
                fontSize: 13, fontWeight: 600,
                background: wishlisted
                  ? "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)"
                  : "rgba(255,255,255,0.05)",
                color: wishlisted ? "#FFFFFF" : "rgba(245,247,250,0.85)",
                border: wishlisted ? "none" : "1px solid rgba(255,255,255,0.12)",
                boxShadow: wishlisted
                  ? "0 1px 0 rgba(255,255,255,0.22) inset, 0 10px 26px -12px rgba(244,63,94,0.8)"
                  : "none",
              }}>
              <Bookmark size={14} strokeWidth={2.4}
                fill={wishlisted ? "#FFFFFF" : "none"} color={wishlisted ? "#FFFFFF" : "currentColor"} />
              {wishlisted ? "On your shortlist" : "Add to shortlist"}
            </motion.button>
            </div>
          </div>

          {/* property name + location */}
          <div className="detail-h1" style={{
            fontFamily: 'ui-serif, Georgia, serif', fontSize: 32, fontWeight: 500,
            color: "#F5F7FA", letterSpacing: "-0.02em", lineHeight: 1.12, marginBottom: 4,
          }}>{propIn.name}</div>
          <div style={{ fontSize: 14.5, color: "rgba(245,247,250,0.6)", marginBottom: 18 }}>
            {propIn.suburb} · {propIn.type}
          </div>

          {/* photo gallery — hero left, gallery grid right */}
          {(() => {
            const meta = propertyMeta(propIn);
            const gallery = getPropertyGallery(propIn);
            return (
              <>
                <div className="detail-gallery" style={{
                  display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 10,
                  marginBottom: 18,
                }}>
                  {/* hero — tightened height so cashflow + verdict stay above the fold */}
                  <div style={{
                    borderRadius: 18, overflow: "hidden",
                    position: "relative", background: "#15171F",
                    aspectRatio: "16 / 11",
                  }}>
                    <img src={gallery[0]} alt={propIn.name}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    <div style={{
                      position: "absolute", left: 16, bottom: 16,
                      background: "rgba(5,7,10,0.82)", backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12, padding: "9px 16px",
                    }}>
                      <div style={{
                        fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
                        color: "rgba(245,247,250,0.5)", fontWeight: 600,
                      }}>{propIn.listing?.priceLabel || (propIn.build === "new" ? "From" : "Guide")}</div>
                      <div style={{
                        fontFamily: 'ui-serif, Georgia, serif', fontSize: 26, fontWeight: 600,
                        color: "#F5F7FA",
                      }}>{fmt0(vars.price)}</div>
                    </div>
                    <div style={{
                      position: "absolute", right: 16, top: 16,
                      background: isNew ? "rgba(34,197,94,0.9)" : "rgba(244,63,94,0.9)",
                      borderRadius: 999, padding: "6px 13px",
                      fontSize: 11.5, fontWeight: 700, color: "#FFFFFF",
                      letterSpacing: -0.02,
                    }}>{isNew ? "New build" : "Established"}</div>
                  </div>
                  {/* gallery 2×2 */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr",
                    gridTemplateRows: "1fr 1fr", gap: 10,
                  }}>
                    {[1, 2, 3].map((n, i) => (
                      <div key={n} style={{
                        borderRadius: 14, overflow: "hidden",
                        background: "#15171F", position: "relative",
                      }}>
                        <img src={gallery[n] || gallery[0]} alt={`${propIn.name} photo ${n + 1}`}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                        {i === 2 && (
                          <div style={{
                            position: "absolute", inset: 0,
                            background: "rgba(5,7,10,0.72)",
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center", gap: 3,
                            cursor: "pointer",
                          }}>
                            <Maximize2 size={16} color="#F5F7FA" strokeWidth={2} />
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#F5F7FA" }}>
                              View gallery
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <BadgeShelf
                  badges={detailInsights.badges}
                  score={detailInsights.score}
                  suburbRank={detailInsights.suburbRank}
                  suburbTotal={detailInsights.suburbTotal}
                />
                <ShareStoryModal
                  open={shareOpen}
                  onClose={() => setShareOpen(false)}
                  property={propIn}
                  insights={detailInsights}
                  breakEven={breakEven}
                  cashflow={cashflow}
                />

                {/* key facts strip */}
                <div className="detail-facts" style={{
                  display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap",
                }}>
                  {[
                    { icon: Bed, label: `${meta.beds} bed` },
                    { icon: Bath, label: `${meta.baths} bath` },
                    { icon: Car, label: `${meta.parking} car` },
                    { icon: Maximize2, label: `${meta.area}m²` },
                    { icon: Hammer, label: meta.status },
                  ].map(f => (
                    <div key={f.label} style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10, padding: "10px 14px",
                      fontSize: 13.5, color: "rgba(245,247,250,0.8)", fontWeight: 500,
                    }}>
                      <f.icon size={14} strokeWidth={2} color="rgba(245,247,250,0.5)" />
                      {f.label}
                    </div>
                  ))}
                </div>

                {/* listing agent — compact row removed; see ListingAgentPromo below */}

                {/* MODELED BANNER — only on agent-fed previews */}
                {isAgentPreview && (
                  <div style={{
                    marginTop: 14,
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "rgba(96,165,250,0.08)",
                    border: "1px solid rgba(96,165,250,0.22)",
                    display: "flex", alignItems: "flex-start", gap: 12,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: "rgba(96,165,250,0.18)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Info size={15} color="#93C5FD" strokeWidth={2.4} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#BFDBFE", lineHeight: 1.35 }}>
                        These numbers are modelled — put in your own assumptions below
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12.5, color: "rgba(245,247,250,0.6)", lineHeight: 1.5 }}>
                        Use the Scenario Studio to set your deposit, rate, rent and tax bracket. Talk to {agent.name?.split(" ")[0] || "the agent"} about the specifics before you decide.
                      </div>
                    </div>
                  </div>
                )}

                {/* ── About this property — the listing detail ── */}
                {(() => {
                  const L = propertyListing(propIn);
                  return (
                    <div style={{ marginTop: 22 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 700, color: "#F5F7FA", marginBottom: 10,
                      }}>About this property</div>
                      {L.desc.map((para, i) => (
                        <p key={i} style={{
                          margin: "0 0 9px", fontSize: 13.5, lineHeight: 1.6,
                          color: "rgba(245,247,250,0.62)",
                        }}>{para}</p>
                      ))}
                      {/* feature chips */}
                      <div style={{
                        display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14,
                      }}>
                        {L.features.map(f => (
                          <span key={f} style={{
                            fontSize: 11.5, color: "rgba(245,247,250,0.7)", fontWeight: 500,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 8, padding: "6px 10px",
                          }}>{f}</span>
                        ))}
                        {L.heritage && (
                          <span style={{
                            fontSize: 11.5, color: "#FDE68A", fontWeight: 600,
                            background: "rgba(251,191,36,0.1)",
                            border: "1px solid rgba(251,191,36,0.28)",
                            borderRadius: 8, padding: "6px 10px",
                          }}>{L.heritage}</span>
                        )}
                      </div>
                      {L.tenancyNote && (
                        <div style={{
                          marginTop: 12, padding: "12px 14px", borderRadius: 10,
                          background: "rgba(96,165,250,0.08)",
                          border: "1px solid rgba(96,165,250,0.22)",
                          fontSize: 12.5, color: "rgba(245,247,250,0.65)", lineHeight: 1.5,
                        }}>
                          <span style={{ fontWeight: 700, color: "#BFDBFE" }}>Tenancy: </span>
                          {L.tenancyNote}
                        </div>
                      )}
                      {/* floorplan + inspections row */}
                      <div className="detail-listing-row" style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16,
                      }}>
                        <div style={{
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 12, padding: L.floorplanUrl ? "10px" : "14px 15px",
                          overflow: "hidden",
                        }}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 7, marginBottom: L.floorplanUrl ? 8 : 8,
                            padding: L.floorplanUrl ? "4px 5px 0" : 0,
                          }}>
                            <Maximize2 size={14} color="rgba(245,247,250,0.5)" strokeWidth={2} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#F5F7FA" }}>Floorplan</span>
                          </div>
                          {L.floorplanUrl ? (
                            <img
                              src={L.floorplanUrl}
                              alt={`${propIn.name} floorplan`}
                              style={{
                                width: "100%", display: "block", borderRadius: 8,
                                background: "#fff",
                              }}
                            />
                          ) : (
                            <div style={{ fontSize: 12, color: "rgba(245,247,250,0.5)", lineHeight: 1.5 }}>
                              {L.area ? `${L.area}m² internal · ` : ""}{L.landSize ? `${L.landSize}m² land · ` : ""}floorplan available on request
                            </div>
                          )}
                          {(L.councilRates || L.waterRates) && (
                            <div style={{
                              marginTop: 10, fontSize: 11.5, color: "rgba(245,247,250,0.45)", lineHeight: 1.55,
                              padding: L.floorplanUrl ? "0 5px 5px" : 0,
                            }}>
                              {L.councilRates ? `Council $${L.councilRates.toLocaleString()}/yr` : ""}
                              {L.councilRates && L.waterRates ? " · " : ""}
                              {L.waterRates ? `Water $${L.waterRates.toLocaleString()}/yr` : ""}
                            </div>
                          )}
                        </div>
                        <div style={{
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 12, padding: "14px 15px",
                        }}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 7, marginBottom: 8,
                          }}>
                            <Search size={14} color="rgba(245,247,250,0.5)" strokeWidth={2} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#F5F7FA" }}>
                              {L.auction ? "Auction & inspections" : "Inspections"}
                            </span>
                          </div>
                          {L.auction && (
                            <div style={{
                              fontSize: 12.5, fontWeight: 600, color: "#FECDD3",
                              marginBottom: 8, lineHeight: 1.5,
                            }}>
                              {L.auction}
                            </div>
                          )}
                          {L.inspections.map(ins => (
                            <div key={ins} style={{ fontSize: 12, color: "rgba(245,247,250,0.5)", lineHeight: 1.6 }}>
                              {ins}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </div>
        </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            THE SCENARIO STUDIO — sliders, big cashflow brick, equity curve
        ════════════════════════════════════════════════════════════════ */}
        <div style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.012))",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 24, padding: "36px 30px",
          marginTop: isAgentPreview ? 0 : 56,
          marginBottom: isAgentPreview ? 32 : 56,
        }}>
          <div style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between",
            flexWrap: "wrap", gap: 10, marginBottom: 20,
          }}>
            <div>
              <div style={{
                fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
                color: "#FB7185", fontWeight: 600, marginBottom: 5,
              }}>{isAgentPreview ? "Your assumptions" : "Scenario Studio"}</div>
              <div style={{
                fontFamily: 'ui-serif, Georgia, serif', fontSize: 26, fontWeight: 500,
                color: "#F5F7FA", letterSpacing: "-0.02em", lineHeight: 1.1,
              }}>{isAgentPreview ? "Adjust the model to your situation" : "Play out the next 30 years"}</div>
            </div>
            {scenarioDirty && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setVars(baseVars)}
                style={{
                  cursor: "pointer", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999,
                  padding: "7px 14px", color: "rgba(245,247,250,0.7)",
                  fontSize: 12, fontWeight: 600,
                }}>Reset</motion.button>
            )}
          </div>

          {/* hero stat strip + bricks — public listings only (agent share shows these above) */}
          {!isAgentPreview && (
          <>
          <div className="studio-strip" style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, overflow: "hidden", marginBottom: 22,
          }}>
            {[
              { label: "Costs you now", value: `$${Math.round(Math.abs(y1Weekly))}`, unit: "per week", c: "#F87171" },
              { label: "Turns positive", value: breakEven ? `Yr ${breakEven}` : "Never", unit: breakEven ? "pays you from here" : "in 30 years", c: breakEven ? "#4ADE80" : "#F87171" },
              { label: "Wealth by yr 10", value: `$${Math.round(wealth10 / 1000)}k`, unit: "equity + cashflow", c: wealth10 >= 0 ? "#4ADE80" : "#F87171" },
              { label: "Owned by yr 30", value: `$${Math.round(wealth30 / 1000)}k`, unit: "projected equity", c: "#93C5FD" },
            ].map(s => (
              <div key={s.label} style={{
                background: "#0B0D12", padding: "16px 12px", textAlign: "center",
              }}>
                <div style={{
                  fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase",
                  color: "rgba(245,247,250,0.42)", fontWeight: 600, marginBottom: 7,
                }}>{s.label}</div>
                <motion.div key={s.value}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    fontFamily: 'ui-serif, Georgia, serif', fontSize: 26, fontWeight: 600,
                    color: s.c, lineHeight: 1, letterSpacing: "-0.02em",
                  }}>{s.value}</motion.div>
                <div style={{ fontSize: 10, color: "rgba(245,247,250,0.45)", marginTop: 5 }}>{s.unit}</div>
              </div>
            ))}
          </div>

          {/* THE TWO BRICKS — cashflow + equity, side by side */}
          <div className="studio-bricks" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14,
          }}>
            {/* cashflow brick */}
            <div style={{
              background: "rgba(255,255,255,0.018)", borderRadius: 16,
              border: "none", padding: "20px 18px",
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F7FA", marginBottom: 3 }}>
                Cashflow — what it costs you
              </div>
              <div style={{ fontSize: 11, color: "rgba(245,247,250,0.42)", marginBottom: 18 }}>
                360 squares · one per month · red costs you, green pays you
              </div>
              <div style={{ display: "flex", justifyContent: "center", overflowX: "auto" }}>
                <CashflowGrid cashflow={cashflow} cell={9} gap={2}
                  milestones={cashflowMilestones} showLabels={true} />
              </div>
              <div className="brick-callouts" style={{
                display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6,
                marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
              }}>
                {brickCallouts.map(c => (
                  <div key={c.year} style={{ textAlign: "center" }}>
                    <div style={{ marginBottom: 4, display: "flex", justifyContent: "center", lineHeight: 1 }}>
                      <CalloutIcon kind={c.icon} size={15} />
                    </div>
                    <motion.div key={c.value}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
                      style={{
                        fontFamily: 'ui-serif, Georgia, serif', fontSize: 13, fontWeight: 600,
                        color: c.amount >= 0 ? "#4ADE80" : "#F87171", lineHeight: 1,
                      }}>{c.value}</motion.div>
                    <div style={{ fontSize: 9, color: "rgba(245,247,250,0.45)", marginTop: 3 }}>
                      Yr {c.year}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* equity brick */}
            <div style={{
              background: "rgba(255,255,255,0.018)", borderRadius: 16,
              border: "none", padding: "20px 18px",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F7FA", marginBottom: 3 }}>
                Wealth — what you build
              </div>
              <div style={{ fontSize: 11, color: "rgba(245,247,250,0.42)", marginBottom: 18 }}>
                360 squares · one per month · cool early, hot as equity grows
              </div>
              <div style={{ display: "flex", justifyContent: "center", overflowX: "auto", flex: 1, alignItems: "center" }}>
                <WealthGrid
                  monthlyEquity={monthlyEquity}
                  depositEquity={depositEquity}
                  cell={9} gap={2}
                />
              </div>
              <div style={{
                marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "baseline", justifyContent: "space-between",
              }}>
                <div style={{ fontSize: 11.5, color: "rgba(245,247,250,0.5)" }}>
                  On {vars.growthPct.toFixed(1)}% growth · year 30
                </div>
                <motion.div key={wealth30}
                  initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    fontFamily: 'ui-serif, Georgia, serif', fontSize: 22, fontWeight: 600,
                    color: "#4ADE80",
                  }}>
                  ≈ {fmtMoneyShort(wealth30)}
                </motion.div>
              </div>
            </div>
          </div>
          </>
          )}

          {/* SLIDERS — directly under the bricks so the link is obvious */}
          <div style={{
            background: "rgba(255,255,255,0.018)", borderRadius: 16,
            border: "none", padding: "20px 18px",
            marginBottom: 14,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 3,
            }}>
              <SlidersHorizontal size={15} color="#FB7185" strokeWidth={2.2} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F7FA" }}>
                {isAgentPreview ? "Drag a lever — watch the 30-year picture change" : "Drag a lever — watch the brick above move"}
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(245,247,250,0.45)", marginBottom: 18 }}>
              Every square, callout and number recalculates live.
            </div>

            <div className="studio-sliders" style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 26px",
            }}>
              <StudioSlider label="Purchase price" icon={Tag} value={vars.price}
                min={sliderBounds.priceMin} max={sliderBounds.priceMax} step={10000}
                fmt={v => `$${(v / 1000).toFixed(0)}k`} onChange={set("price")} />
              <StudioSlider label="Deposit" icon={Wallet} value={vars.deposit}
                min={5} max={50} step={1}
                fmt={v => `${v}%`} onChange={set("deposit")} />
              <StudioSlider label="Interest rate" icon={Percent} value={vars.rate}
                min={4} max={10} step={0.1}
                fmt={v => `${v.toFixed(1)}%`} onChange={set("rate")}
                hint="RBA cash rate 4.35% — variable, for modelling" />
              <StudioSlider label="Rent" icon={Banknote} value={vars.rentPerWeek}
                min={sliderBounds.rentMin} max={sliderBounds.rentMax} step={25}
                fmt={v => `$${v}/wk`} onChange={set("rentPerWeek")} />
              <StudioSlider label="Capital growth" icon={LineChart} value={vars.growthPct}
                min={0} max={9} step={0.5}
                fmt={v => `${v.toFixed(1)}%`} onChange={set("growthPct")}
                hint="Your assumption — drives the equity projection" />
              <StudioSlider label="Your tax bracket" icon={Receipt} value={vars.marginalRate}
                min={0} max={47} step={1}
                fmt={v => `${v}%`} onChange={set("marginalRate")} />
            </div>

            {/* loan + property type toggles */}
            <div style={{
              display: "flex", gap: 22, flexWrap: "wrap", marginTop: 8,
              paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 12, color: "rgba(245,247,250,0.55)", marginBottom: 7, fontWeight: 500 }}>
                  Loan type
                </div>
                <div style={{
                  display: "flex", gap: 4, padding: 4,
                  background: "rgba(255,255,255,0.04)", borderRadius: 9,
                  border: "1px solid rgba(255,255,255,0.09)",
                }}>
                  {[
                    { id: "io", l: "Interest only" },
                    { id: "pi", l: "Principal + interest" },
                  ].map(o => {
                    const on = vars.loanType === o.id;
                    return (
                      <button key={o.id} onClick={() => set("loanType")(o.id)}
                        style={{
                          cursor: "pointer", border: "none", borderRadius: 6, flex: 1,
                          padding: "8px 10px", fontSize: 11.5, fontWeight: 600,
                          background: on ? "rgba(255,255,255,0.1)" : "transparent",
                          color: on ? "#F5F7FA" : "rgba(245,247,250,0.5)",
                        }}>{o.l}</button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: "rgba(245,247,250,0.38)", marginTop: 5, lineHeight: 1.4 }}>
                  {vars.loanType === "io"
                    ? "Interest only — lower monthly cost, but the loan never shrinks."
                    : "Principal + interest — costs more monthly, but you pay the loan down and build equity."}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 12, color: "rgba(245,247,250,0.55)", marginBottom: 7, fontWeight: 500 }}>
                  Property type
                </div>
                <div style={{
                  display: "flex", gap: 4, padding: 4,
                  background: "rgba(255,255,255,0.04)", borderRadius: 9,
                  border: "1px solid rgba(255,255,255,0.09)",
                }}>
                  {[{ id: "new", l: "New build" }, { id: "existing", l: "Established" }].map(o => {
                    const on = vars.build === o.id;
                    return (
                      <button key={o.id} onClick={() => set("build")(o.id)}
                        style={{
                          cursor: "pointer", border: "none", borderRadius: 6, flex: 1,
                          padding: "8px 10px", fontSize: 11.5, fontWeight: 600,
                          background: on ? "rgba(255,255,255,0.12)" : "transparent",
                          color: on ? "#F5F7FA" : "rgba(245,247,250,0.5)",
                          boxShadow: on ? "0 1px 0 rgba(255,255,255,0.08) inset" : "none",
                        }}>{o.l}</button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: "rgba(245,247,250,0.38)", marginTop: 5, lineHeight: 1.4 }}>
                  {vars.build === "new"
                    ? "New build — keeps negative gearing after the 2027 budget changes."
                    : "Established — loses negative gearing from 1 July 2027."}
                </div>
              </div>
            </div>

            {/* ─── Your plan: pure investment vs PPOR-then-rent ────────────────── */}
            <div style={{
              marginTop: 18, paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                marginBottom: 8, flexWrap: "wrap", gap: 6,
              }}>
                <div style={{ fontSize: 12, color: "rgba(245,247,250,0.55)", fontWeight: 500 }}>
                  Your plan
                </div>
                {vars.pporYears > 0 && (
                  <div style={{
                    fontSize: 10.5, color: "#FECDD3", fontWeight: 600,
                    letterSpacing: "-0.005em",
                  }}>
                    Living in it for {vars.pporYears} year{vars.pporYears === 1 ? "" : "s"}, then renting
                  </div>
                )}
              </div>
              <div style={{
                display: "flex", gap: 4, padding: 4,
                background: "rgba(255,255,255,0.04)", borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.09)",
                marginBottom: 10,
              }}>
                {[
                  { id: 0, l: "Pure investment" },
                  { id: 1, l: "Live in 1yr → rent" },
                  { id: 3, l: "Live in 3yr → rent" },
                  { id: 6, l: "Live in 6yr → rent" },
                ].map(o => {
                  const on = (vars.pporYears || 0) === o.id;
                  return (
                    <button key={o.id} onClick={() => set("pporYears")(o.id)}
                      style={{
                        cursor: "pointer", border: "none", borderRadius: 6, flex: 1,
                        padding: "8px 10px", fontSize: 11, fontWeight: 600,
                        background: on ? "rgba(255,255,255,0.12)" : "transparent",
                        color: on ? "#F5F7FA" : "rgba(245,247,250,0.5)",
                        boxShadow: on ? "0 1px 0 rgba(255,255,255,0.08) inset" : "none",
                        letterSpacing: "-0.01em",
                      }}>{o.l}</button>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: "rgba(245,247,250,0.45)", lineHeight: 1.5 }}>
                {vars.pporYears === 0
                  ? "Pure investment — rented from day one to a tenant."
                  : vars.pporYears <= 6
                    ? `Live in it as your home for ${vars.pporYears} year${vars.pporYears === 1 ? "" : "s"}, then convert to a rental. Under the 6-year absence rule you may still qualify for the main residence CGT exemption — confirm with your accountant.`
                    : `Live in it as your home for ${vars.pporYears} years, then convert to a rental.`}
              </div>
            </div>
          </div>

          {/* Agent share — live brick under sliders so changes are visible without scrolling up */}
          {isAgentPreview && (
            <div style={{
              marginTop: 18, marginBottom: 14, padding: "18px 16px", borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#F5F7FA", marginBottom: 12 }}>
                Updated 30-year view
                {breakEven
                  ? <span style={{ color: "#4ADE80", fontWeight: 500 }}> · pays you from year {breakEven}</span>
                  : <span style={{ color: "#F87171", fontWeight: 500 }}> · never breaks even</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "center", overflowX: "auto" }}>
                <CashflowGrid cashflow={cashflow} cell={9} gap={2}
                  milestones={cashflowMilestones} showLabels={true} />
              </div>
            </div>
          )}

          {/* Excel export — calm spreadsheet treatment, subtle grid texture */}
          <div className="studio-export" style={{
            marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 14, flexWrap: "wrap",
            backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}>
            <div style={{ minWidth: 200, flex: 1 }}>
              <div style={{ fontSize: 14, color: "#F5F7FA", fontWeight: 600 }}>
                Download this scenario — it's yours to play with
              </div>
              <div style={{ fontSize: 12, color: "rgba(245,247,250,0.55)", marginTop: 2, lineHeight: 1.45 }}>
                Not a locked PDF — a live spreadsheet. Every year, every figure,
                every assumption you set, ready to pull apart in Excel. Free.
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => downloadExcel()}
              style={{
                cursor: "pointer", flexShrink: 0,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#F5F7FA", borderRadius: 12, padding: "12px 18px",
                fontSize: 13.5, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 9,
                boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset",
              }}>
              {/* spreadsheet logo mark */}
              <span style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                background: "#1D6F42",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#FFFFFF",
                fontFamily: "system-ui, sans-serif",
              }}>X</span>
              Download my spreadsheet
            </motion.button>
          </div>
        </div>

        {isAgentPreview && (
          <div style={{ maxWidth: 920, margin: "0 auto 32px" }}>
            <PhotoGallery property={propIn} />
          </div>
        )}

        {!isAgentPreview && (
        <>
        {/* ════════════════════════════════════════════════════════════════
            ACT 2.5 — HOW IT COMPARES: 3 other real properties
        ════════════════════════════════════════════════════════════════ */}
        <div style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 24, padding: "34px 30px", marginTop: 56, marginBottom: 56,
        }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(245,247,250,0.5)", fontWeight: 600, marginBottom: 6,
          }}>How it compares</div>
          <div style={{
            fontFamily: 'ui-serif, Georgia, serif', fontSize: 24, fontWeight: 500,
            color: "#F5F7FA", letterSpacing: "-0.02em", marginBottom: 6, lineHeight: 1.2,
          }}>
            Three other properties, same money in play
          </div>
          <p style={{
            fontSize: 13.5, color: "rgba(245,247,250,0.55)", margin: "0 0 22px", lineHeight: 1.5,
          }}>
            Each has its own 30-Year Map. Greener and sooner is better — tap any to dig in.
          </p>

          <div className="detail-compare-grid" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14,
          }}>
            {comparisonProps.slice(0, 3).map(cp => (
              <PropertyCard key={cp.id} property={cp} goals={goals}
                onOpen={() => onOpen && onOpen(cp.id)}
                daysUntilCliff={daysUntilCliff} />
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            BUDGET CTA — looping Sydney video, half-width, links to budget
        ════════════════════════════════════════════════════════════════ */}
        <BudgetCTABand onOpenBudget={onOpenBudget} marginTop={56} marginBottom={56} />

        {/* ════════════════════════════════════════════════════════════════
            ACT 4 — LISTING AGENT
        ════════════════════════════════════════════════════════════════ */}
        <ListingAgentPromo
          agent={listingAgent}
          propertyName={propIn.name}
          suburb={propIn.suburb}
        />
        <AgentContactDock agent={listingAgent} propertyName={propIn.name} />
        </>
        )}

      </div>
    </motion.div>
  );
}


function OwnedDetail({ property, goals, onBack }) {
  const cashflow = useMemo(() => generateCashflow(property), [property]);
  const color = COLORS[property.color];
  const Icon = ICON_LOOKUP[property.icon] ?? HomeIcon;
  const owned = property.purchased;
  const equityPct = (owned.currentValue - owned.price) / owned.price;
  const equityNow = useAnimNum(owned.equity);
  const valueNow = useAnimNum(owned.currentValue);
  const annualNow = cashflow.slice(12, 24).reduce((s, x) => s + x, 0);

  return (
    <motion.div key={`owned-${property.id}`}
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.26 }}
      style={{ position: "relative", paddingBottom: 110 }}>

      <ScreenHeroBg height={480} />

      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 920, margin: "0 auto",
        padding: "100px 24px 0",
      }}>

        {/* Top bar */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onBack}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 999, padding: "8px 14px 8px 10px",
              color: "#F5F7FA", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 500, letterSpacing: -0.05,
            }}>
            <ChevronLeft size={15} strokeWidth={1.8} /> Back
          </motion.button>
          <motion.button whileTap={{ scale: 0.92 }}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 999, padding: 9,
              color: "#F5F7FA", cursor: "pointer",
              display: "inline-flex", alignItems: "center",
            }}>
            <Share2 size={14} strokeWidth={1.8} />
          </motion.button>
        </div>

        {/* Owned hero */}
        <div style={{ marginBottom: 24 }}>
          <Eyebrow style={{ marginBottom: 20 }}>
            <CheckCircle2 size={11} strokeWidth={2.5} /> Owned · since {owned.date}
          </Eyebrow>
          <h1 className="detail-h1" style={{
            margin: 0,
            fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
            fontSize: 48, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1.05,
            color: "#F5F7FA",
          }}>
            {property.name}
          </h1>
          <div style={{
            color: "rgba(245,247,250,0.55)", fontSize: 16, marginTop: 10,
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <MapPin size={13} strokeWidth={1.8} /> {property.suburb}
          </div>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.025)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.06) inset, 0 30px 70px -38px rgba(0,0,0,0.88)",
          borderRadius: 18, padding: 24,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ color: "#8B92A5", fontSize: 10.5, fontWeight: 600, letterSpacing: 0.7, textTransform: "uppercase" }}>Equity today</div>
              <div style={{ color: color.hex, fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 2, lineHeight: 1 }}>
                {fmtFull(equityNow)}
              </div>
              <div style={{ color: "#8B92A5", fontSize: 11.5, marginTop: 4 }}>
                Up <span style={{ color: "#34D399", fontWeight: 600 }}>+{(equityPct * 100).toFixed(1)}%</span> since {owned.date}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#8B92A5", fontSize: 10.5, fontWeight: 600, letterSpacing: 0.7, textTransform: "uppercase" }}>Current value</div>
              <div style={{ color: "#F5F7FA", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 2 }}>{fmt(valueNow)}</div>
              <div style={{ color: "#5C6477", fontSize: 10.5, marginTop: 4 }}>Paid {fmt(owned.price)}</div>
            </div>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", position: "relative", marginTop: 6 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${(owned.price / owned.currentValue) * 100}%` }} transition={{ delay: 0.4, duration: 0.8 }}
              style={{ height: "100%", background: "rgba(255,255,255,0.18)" }} />
            <motion.div initial={{ width: 0 }} animate={{ width: `${(1 - owned.price / owned.currentValue) * 100}%` }} transition={{ delay: 0.6, duration: 0.8 }}
              style={{ position: "absolute", left: `${(owned.price / owned.currentValue) * 100}%`, top: 0, bottom: 0, background: color.hex, opacity: 0.9 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: "#5C6477", fontSize: 10 }}>Purchase price</span>
            <span style={{ color: color.hex, fontSize: 10, fontWeight: 600 }}>+ {fmt(owned.currentValue - owned.price)} growth</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <SectionHeading>This week</SectionHeading>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{
            background: `linear-gradient(135deg, rgba(${color.rgb}, 0.10) 0%, #15171F 70%)`,
            border: `1px solid rgba(${color.rgb}, 0.18)`,
            borderRadius: 18, padding: 16, marginBottom: 14,
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: color.hex, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>
            <Sparkles size={11} /> AI Digest · Sun 13 May
          </div>
          <div style={{ color: "#F5F7FA", fontSize: 13.5, lineHeight: 1.6 }}>{property.digest}</div>
          <button style={{
            background: "transparent", color: color.hex, border: "none", padding: "8px 0 0", marginTop: 8,
            fontSize: 11.5, fontWeight: 600, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>Read full digest <ChevronRight size={12} /></button>
        </motion.div>

        <SectionHeading>Action items</SectionHeading>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ marginBottom: 14 }}>
          {property.actions.map((a) => (
            <div key={a.id} style={{
              background: "#15171F",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14, padding: 12, marginBottom: 6,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: `${a.color}1F`, color: a.color,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}><a.icon size={15} strokeWidth={2.2} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#F5F7FA", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>{a.title}</div>
                <div style={{ color: "#8B92A5", fontSize: 11.5, marginTop: 2, lineHeight: 1.4 }}>{a.detail}</div>
              </div>
              <ChevronRight size={15} color="#5C6477" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </motion.div>

        <SectionHeading>Recent activity</SectionHeading>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: "#15171F", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, padding: 4, marginBottom: 14 }}>
          {property.activity.map((a, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
              borderBottom: i < property.activity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#F5F7FA", fontSize: 13, fontWeight: 500 }}>{a.title}</div>
                <div style={{ color: "#8B92A5", fontSize: 11, marginTop: 1 }}>{a.detail}</div>
              </div>
              <div style={{ color: "#5C6477", fontSize: 10.5, flexShrink: 0 }}>{a.when}</div>
            </div>
          ))}
        </motion.div>

        <SectionHeading>Goal progress · current run-rate</SectionHeading>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ background: "#15171F", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, padding: 14, marginBottom: 14 }}>
          {goals.map((g, i) => {
            const coverage = Math.min(1.5, annualNow / g.amount);
            const pct = Math.min(1, coverage);
            const fullyCovered = coverage >= 1;
            return (
              <div key={g.id} style={{
                padding: "10px 0",
                borderBottom: i < goals.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 16 }}>{g.emoji}</span>
                    <span style={{ color: "#F5F7FA", fontSize: 12.5, fontWeight: 500 }}>{g.name}</span>
                  </div>
                  <span style={{ color: fullyCovered ? color.hex : "#8B92A5", fontSize: 12, fontWeight: 700 }}>
                    {Math.round(coverage * 100)}%
                  </span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.06, duration: 0.7 }}
                    style={{ height: "100%", background: fullyCovered ? color.hex : "rgba(245,247,250,0.4)" }} />
                </div>
              </div>
            );
          })}
        </motion.div>

        <SectionHeading>Documents · powered by Workiro</SectionHeading>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: "#15171F", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, padding: 4, marginBottom: 14 }}>
          {property.docs.map((d, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
              borderBottom: i < property.docs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,0.05)", color: "#8B92A5",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={13} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#F5F7FA", fontSize: 12.5, fontWeight: 500 }}>{d.name}</div>
                <div style={{ color: "#5C6477", fontSize: 10.5, marginTop: 1 }}>{d.kind} · {d.date}</div>
              </div>
              <ChevronRight size={14} color="#5C6477" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </motion.div>

        <SectionHeading>Your team</SectionHeading>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          style={{ background: "#15171F", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, padding: 4, marginBottom: 18 }}>
          {property.professionals.map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
              borderBottom: i < property.professionals.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: `rgba(${color.rgb}, 0.16)`, color: color.hex,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                fontSize: 10, fontWeight: 700,
              }}>{p.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#F5F7FA", fontSize: 12.5, fontWeight: 500 }}>{p.name}</div>
                <div style={{ color: "#8B92A5", fontSize: 10.5, marginTop: 1 }}>{p.role}</div>
              </div>
              {p.status === "Workiro" && (
                <div style={{
                  background: "rgba(59,130,246,0.16)", color: "#60A5FA",
                  fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                  padding: "3px 6px", borderRadius: 999, textTransform: "uppercase", flexShrink: 0,
                }}>Workiro</div>
              )}
            </div>
          ))}
        </motion.div>

        <div style={{ color: "#5C6477", fontSize: 10, lineHeight: 1.5, fontStyle: "italic", textAlign: "center" }}>
          Bricks Watch · keeping {property.name} on track since {owned.date}
        </div>
      </div>
    </motion.div>
  );
}

function Mini({ label, value, accent }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 8 }}>
      <div style={{ color: "#5C6477", fontSize: 9, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: accent, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function CompareScreen({ properties, goals }) {
  const considering = properties.filter(p => p.status === "considering");
  return (
    <motion.div key="compare" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.22 }}
      style={{ padding: "60px 16px 110px", height: "100%", overflowY: "auto" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ color: "#5C6477", fontSize: 10, fontWeight: 600, letterSpacing: 2.5, textTransform: "uppercase" }}>H E A D   T O   H E A D</div>
        <div style={{ color: "#F5F7FA", fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 3 }}>Compare</div>
      </div>
      {considering.map((p) => {
        const cf = generateCashflow(p);
        const ach = calcAchievements(cf, goals);
        const color = COLORS[p.color];
        const yr1 = cf.slice(0, 12).reduce((s, x) => s + x, 0);
        const hit = ach.filter(a => a.yearHit !== null).length;
        return (
          <div key={p.id} style={{ background: "#15171F", border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 16, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ color: "#F5F7FA", fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: "#8B92A5", fontSize: 11, marginTop: 1 }}>{p.suburb} · {fmt(p.price)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: color.hex, fontSize: 16, fontWeight: 700 }}>{fmt(yr1)}/yr</div>
                <div style={{ color: "#5C6477", fontSize: 10 }}>{hit}/{goals.length} goals</div>
              </div>
            </div>
            {p.confidence && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                <Mini label="Growth" value={p.confidence.growth.score} accent="#34D399" />
                <Mini label="Risk" value={p.confidence.risk.score} accent="#FACC15" />
                <Mini label="Liquid" value={p.confidence.liquid.score} accent="#60A5FA" />
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", overflow: "hidden" }}>
              <CashflowGrid cashflow={cf} cols={30} rows={12} cell={8} gap={2} milestones={calcDollarMilestones(cf)} showLabels={true} animate={false} />
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

function Label({ children }) {
  return <div style={{ color: "#8B92A5", fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 7 }}>{children}</div>;
}
function Input({ value, onChange, placeholder }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", background: "#15171F", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 11, padding: "11px 13px", color: "#F5F7FA", fontSize: 13.5, outline: "none",
        marginBottom: 16, boxSizing: "border-box" }} />
  );
}
function Slider({ value, onChange, min, max, step }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <input type="range" value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min} max={max} step={step}
        style={{ width: "100%", accentColor: "#2DD4BF" }} />
    </div>
  );
}

function AddScreen({ onClose, onSave }) {
  // Multi-step flow: search → confirm → track
  // This is the Bricks Watch onboarding — for users who ALREADY OWN a property.
  // Step 1: search by address. Step 2: confirm match + add purchase details.
  // Step 3: configured — the property goes into the watchlist with mortgage/news/alerts.

  const [step, setStep] = useState("search");        // "search" | "matches" | "details" | "done"
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);

  // Mock address database (in production: Domain/REA API)
  const ADDRESS_DB = [
    { id: "a1", line: "42 Bardon Heights, Bardon",       state: "QLD", postcode: "4065", priceEst: 850000, type: "House",     beds: 4, baths: 2, parking: 2, yieldPct: 4.7, suburb: "Bardon, QLD",        build: "new",      growthPct: 5.8 },
    { id: "a2", line: "12/88 Beach Road, Bondi",         state: "NSW", postcode: "2026", priceEst: 1450000, type: "Apartment", beds: 2, baths: 2, parking: 1, yieldPct: 3.4, suburb: "Bondi, NSW",         build: "existing", growthPct: 6.1 },
    { id: "a3", line: "7 Carlton Terrace, Carlton",      state: "VIC", postcode: "3053", priceEst: 1180000, type: "Terrace",   beds: 3, baths: 2, parking: 1, yieldPct: 3.8, suburb: "Carlton, VIC",       build: "existing", growthPct: 5.2 },
    { id: "a4", line: "204/15 Mascot Drive, Mascot",     state: "NSW", postcode: "2020", priceEst: 685000,  type: "Apartment", beds: 1, baths: 1, parking: 1, yieldPct: 4.6, suburb: "Mascot, NSW",        build: "new",      growthPct: 5.5 },
    { id: "a5", line: "33 Brunswick Heights, Brunswick", state: "VIC", postcode: "3056", priceEst: 920000,  type: "Townhouse", beds: 3, baths: 2, parking: 1, yieldPct: 4.3, suburb: "Brunswick East, VIC", build: "new",      growthPct: 5.9 },
    { id: "a6", line: "8 Subiaco Lane, Subiaco",          state: "WA",  postcode: "6008", priceEst: 780000,  type: "Apartment", beds: 2, baths: 2, parking: 1, yieldPct: 4.8, suburb: "Subiaco, WA",        build: "new",      growthPct: 5.0 },
  ];

  const runSearch = (q) => {
    if (!q || q.length < 2) { setMatches([]); return; }
    const ql = q.toLowerCase();
    const hits = ADDRESS_DB.filter(a =>
      a.line.toLowerCase().includes(ql) ||
      a.suburb.toLowerCase().includes(ql) ||
      a.postcode.includes(q)
    ).slice(0, 5);
    setMatches(hits);
  };

  // Step 2 state — purchase details
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [purchaseYear, setPurchaseYear] = useState(2024);
  const [loanBalance, setLoanBalance] = useState(0);
  const [loanRate, setLoanRate] = useState(6.6);

  const pickAddress = (a) => {
    setSelected(a);
    setPurchasePrice(a.priceEst);
    setLoanBalance(Math.round(a.priceEst * 0.78));
    setStep("details");
  };

  // Mock "currentValue" (typical 6-9% above purchase price after a few years)
  const yearsHeld = 2026 - purchaseYear;
  const currentValueEst = selected ? Math.round(purchasePrice * Math.pow(1.052, yearsHeld)) : 0;
  const equity = currentValueEst - loanBalance;

  return (
    <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      style={{ position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(5,7,10,0.85)", backdropFilter: "blur(20px)",
        overflowY: "auto" }}>

      <ScreenHeroBg height={480} />

      <motion.div
        className="add-modal"
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        style={{
          position: "relative", zIndex: 1,
          maxWidth: 720, margin: "0 auto",
          padding: "32px 32px 80px",
        }}>

        {/* Modal top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <motion.button whileTap={{ scale: 0.92 }}
            onClick={step === "details" ? () => setStep("search") : onClose}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              width: 38, height: 38,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#F5F7FA",
            }}>
            {step === "details" ? <ArrowLeft size={16} strokeWidth={1.8} /> : <X size={16} strokeWidth={1.8} />}
          </motion.button>
          <Eyebrow>
            {step === "search"  && "Track your property"}
            {step === "details" && "Confirm details"}
          </Eyebrow>
          <div style={{ width: 38 }} />
        </div>

        {/* HERO for step 1 */}
        {step === "search" && (
          <div style={{
            marginBottom: 32,
            textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <ScreenH1 accent="own one?" fontSize={48}>
              Already
            </ScreenH1>
            <p style={{
              margin: "20px 0 0",
              fontSize: 16, lineHeight: 1.55, letterSpacing: -0.01,
              color: "rgba(245,247,250,0.65)",
              maxWidth: 520,
            }}>
              Add it to your watchlist for live mortgage tracking, suburb alerts, rate movements, and 30-year cashflow against your actual loan.
            </p>
          </div>
        )}

      {step === "search" && (
        <>

          {/* Pillar features promised */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 18 }}>
            {[
              { icon: TrendingUp,  label: "Equity tracker",  sub: "Live value & LVR" },
              { icon: Bell,        label: "Suburb alerts",   sub: "News & sales" },
              { icon: Zap,         label: "Rate watch",      sub: "Refinance signals" },
              { icon: BarChart3,   label: "Cashflow grid",   sub: "Your real numbers" },
            ].map(({ icon: Icon, label, sub }, i) => (
              <div key={i} style={{
                background: "#15171F",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 11, padding: "10px 12px",
                display: "flex", alignItems: "flex-start", gap: 9,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: "rgba(59,130,246,0.14)", color: "#60A5FA",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon size={14} strokeWidth={2.4} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#F5F7FA", fontSize: 11.5, fontWeight: 700, lineHeight: 1.15 }}>{label}</div>
                  <div style={{ color: "#8B92A5", fontSize: 10, marginTop: 2, lineHeight: 1.25 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Search field */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ color: "#8B92A5", fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6 }}>
              Find your property
            </div>
            <div style={{ position: "relative" }}>
              <Search size={15} color="#5C6477" strokeWidth={2.4} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); runSearch(e.target.value); }}
                placeholder="Address, suburb, or postcode"
                style={{
                  width: "100%", padding: "13px 14px 13px 38px",
                  background: "#15171F", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 11, color: "#F5F7FA", fontSize: 13.5,
                  outline: "none", fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {/* Search results */}
          {matches.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {matches.map(a => (
                <motion.button key={a.id} whileTap={{ scale: 0.99 }}
                  onClick={() => pickAddress(a)}
                  style={{
                    width: "100%",
                    background: "#15171F",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 11, padding: "11px 12px", marginBottom: 8,
                    cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 11,
                  }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: "rgba(59,130,246,0.10)", color: "#60A5FA",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <HomeIcon size={15} strokeWidth={2.3} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#F5F7FA", fontSize: 12.5, fontWeight: 700, letterSpacing: -0.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.line}
                    </div>
                    <div style={{ color: "#8B92A5", fontSize: 10.5, marginTop: 2 }}>
                      {a.beds} bd · {a.baths} ba · {a.type} · est. {fmt(a.priceEst)}
                    </div>
                  </div>
                  <ChevronRight size={14} color="#5C6477" />
                </motion.button>
              ))}
              <div style={{ color: "#5C6477", fontSize: 9.5, marginTop: 4, textAlign: "center" }}>
                Don't see yours? <span style={{ color: "#60A5FA", fontWeight: 600 }}>Add it manually</span>
              </div>
            </div>
          )}

          {query.length >= 2 && matches.length === 0 && (
            <div style={{
              marginTop: 12,
              background: "#15171F",
              border: "1px dashed rgba(255,255,255,0.08)",
              borderRadius: 11, padding: "16px 14px",
              textAlign: "center",
            }}>
              <div style={{ color: "#8B92A5", fontSize: 12, marginBottom: 4 }}>No matches.</div>
              <div style={{ color: "#5C6477", fontSize: 10.5 }}>Try: "Bardon", "Bondi", "Mascot", "Carlton", "Brunswick"</div>
            </div>
          )}
        </>
      )}

      {step === "details" && selected && (
        <>
          {/* Confirmed property card */}
          <div style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.10) 0%, #15171F 80%)",
            border: "1px solid rgba(59,130,246,0.22)",
            borderRadius: 13, padding: "13px 14px", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 11,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 9,
              background: "rgba(59,130,246,0.20)", color: "#60A5FA",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Check size={17} strokeWidth={2.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#F5F7FA", fontSize: 13.5, fontWeight: 800, letterSpacing: -0.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selected.line}
              </div>
              <div style={{ color: "#8B92A5", fontSize: 11, marginTop: 2 }}>
                {selected.beds} bd · {selected.baths} ba · {selected.type}
              </div>
            </div>
          </div>

          {/* Live value + equity preview */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16,
          }}>
            <div style={{ background: "#15171F", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 11, padding: "10px 12px" }}>
              <div style={{ color: "#8B92A5", fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>Est. value today</div>
              <div style={{ color: "#F5F7FA", fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>{fmt(currentValueEst)}</div>
              <div style={{ color: "#22C55E", fontSize: 10, fontWeight: 700, marginTop: 1 }}>
                +{fmt(currentValueEst - purchasePrice)} since {purchaseYear}
              </div>
            </div>
            <div style={{ background: "#15171F", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 11, padding: "10px 12px" }}>
              <div style={{ color: "#8B92A5", fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>Your equity</div>
              <div style={{ color: "#F5F7FA", fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>{fmt(equity)}</div>
              <div style={{ color: "#8B92A5", fontSize: 10, fontWeight: 600, marginTop: 1 }}>
                LVR {Math.round(loanBalance / currentValueEst * 100)}%
              </div>
            </div>
          </div>

          <Label>Purchase price · {fmtFull(purchasePrice)}</Label>
          <Slider value={purchasePrice} onChange={setPurchasePrice} min={200000} max={3500000} step={10000} />

          <Label>Year purchased · {purchaseYear}</Label>
          <Slider value={purchaseYear} onChange={setPurchaseYear} min={1990} max={2026} step={1} />

          <Label>Current loan balance · {fmtFull(loanBalance)}</Label>
          <Slider value={loanBalance} onChange={setLoanBalance} min={0} max={purchasePrice} step={5000} />

          <Label>Loan interest rate · {loanRate.toFixed(2)}%</Label>
          <Slider value={loanRate} onChange={setLoanRate} min={2.5} max={9.5} step={0.05} />

          <div style={{
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.20)",
            borderRadius: 10, padding: "10px 12px", marginTop: 8, marginBottom: 14,
          }}>
            <div style={{ color: "#60A5FA", fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 }}>
              What you get
            </div>
            <div style={{ color: "#C5CAD6", fontSize: 11.5, lineHeight: 1.55 }}>
              • Monthly mortgage tracker against current rates<br />
              • Suburb sales + median value updates<br />
              • Rate-change alerts (refinance triggers)<br />
              • 30-yr cashflow grid against your actual loan
            </div>
          </div>

          <motion.button whileTap={{ scale: 0.98 }}
            onClick={() => onSave({
              name: selected.line.split(",")[0],
              suburb: selected.suburb,
              price: purchasePrice,
              currentValue: currentValueEst,
              loanBalance,
              loanRate,
              yieldPct: selected.yieldPct,
              growthPct: selected.growthPct,
              state: selected.state,
              type: selected.type,
              build: selected.build,
              status: "owned",
              color: 4, icon: "home",
            })}
            style={{
              width: "100%", padding: "15px 20px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)",
              color: "#FFFFFF",
              fontSize: 14, fontWeight: 600, cursor: "pointer", letterSpacing: -0.05,
              boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 28px -12px rgba(244,63,94,0.85)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}>
            <Check size={15} strokeWidth={2.4} /> Add to watchlist
          </motion.button>
        </>
      )}
      </motion.div>
    </motion.div>
  );
}

// ─── Legal screen — Terms, Privacy, Financial Disclaimer ────────────────────
// Plain-text legal content. Section is selectable so footer links deep-link in.
function LegalScreen({ section = "terms" }) {
  const [active, setActive] = useState(section);
  useEffect(() => { setActive(section); }, [section]);

  const TABS = [
    { id: "terms",   label: "Terms & Disclaimer" },
    { id: "privacy", label: "Privacy Policy" },
    { id: "finance", label: "Financial Disclaimer" },
  ];

  const updated = "Last updated: 18 May 2026";

  // Each doc is an array of { h, body[] } blocks.
  const DOCS = {
    terms: {
      title: "Terms of Use & Disclaimer",
      blocks: [
        { h: "1. About this website", body: [
          "This website and the \u201cBricks\u201d / \u201cThe Bricks\u201d application (the Service) are operated by Eyes Here Pty Limited (ABN 48 656 142 997) (we, us, our). By accessing or using the Service, you (you, the user) agree to these Terms of Use and this Disclaimer in full. If you do not agree, you must not use the Service.",
        ]},
        { h: "2. General information only \u2014 not advice", body: [
          "The Service provides general information and general factual material about Australian residential property, taxation settings, and related matters. It is provided for informational and educational purposes only.",
          "The Service does not provide, and is not intended to provide: financial product advice or any recommendation in relation to a financial product within the meaning of the Corporations Act 2001 (Cth); personal financial advice that takes into account your objectives, financial situation or needs; taxation advice within the meaning of the Tax Agent Services Act 2009 (Cth); credit assistance or credit advice within the meaning of the National Consumer Credit Protection Act 2009 (Cth); legal advice; or any investment, accounting, valuation or professional advice of any kind.",
          "Nothing on the Service constitutes a recommendation, endorsement, or solicitation to buy, sell, hold, or finance any property, security, financial product, or investment, or to adopt any particular strategy or structure. We are not your financial adviser, tax agent, mortgage broker, accountant, lawyer, or buyer\u2019s agent, and no such relationship is created by your use of the Service.",
          "Any information has been prepared without taking into account your objectives, financial situation, or needs. Before acting on any information, you should consider its appropriateness having regard to your own circumstances and obtain independent professional advice from an appropriately licensed or registered adviser.",
        ]},
        { h: "3. Projections, modelling and estimates", body: [
          "The Service includes calculators, models, projections, scenarios, and illustrative figures \u2014 including cashflow projections, \u201cbreak-even\u201d estimates, 30-year forecasts, capital growth assumptions, tax outcomes, and \u201cwhat-if\u201d scenarios.",
          "You acknowledge and agree that: all such outputs are estimates and illustrations only, generated from assumptions and simplified models; they are not forecasts, guarantees, or assurances of any actual or future outcome; past performance is not indicative of future performance; actual outcomes will depend on many variables outside our control, including interest rates, inflation, government policy, market conditions, your personal tax position, and the specific property; and you must not rely on any output as a basis for any financial, investment, tax, or borrowing decision.",
        ]},
        { h: "4. Taxation, the 2026 Federal Budget, and changing law", body: [
          "The Service contains commentary on Australian taxation settings, including measures announced in the 2026\u201327 Federal Budget (such as changes to negative gearing and capital gains tax).",
          "You acknowledge that: announced budget measures are policy proposals that may not become law, and may be amended, delayed, or abandoned during the legislative process; legislation had not been enacted at the time this material was prepared; taxation law is complex, depends on individual circumstances, and changes frequently; our description of these measures is a general summary and may not be complete or current; and you must obtain advice from a registered tax agent before acting on anything tax-related.",
        ]},
        { h: "5. Third parties and referrals", body: [
          "The Service may refer you to, or display information about, third parties including buyer\u2019s agents, mortgage brokers, and other professionals. We do not provide the services those third parties provide. Any engagement you enter into with a third party is solely between you and that third party. We do not endorse, guarantee, or accept responsibility for the conduct, advice, services, or outputs of any third party, and we are not liable for any loss arising from your dealings with them.",
          "We may receive a referral fee or commission in connection with such referrals. This does not constitute advice that any referral is suitable for you.",
        ]},
        { h: "6. Accuracy and availability", body: [
          "While we take reasonable care, we do not warrant that information on the Service is accurate, complete, current, or free from error, or that the Service will be available, uninterrupted, or secure. Property data, market figures, and third-party information may be sourced from external parties and may be out of date or incorrect.",
        ]},
        { h: "7. Limitation of liability", body: [
          "To the maximum extent permitted by law, and subject to clause 8: we exclude all liability for any loss or damage (including direct, indirect, special, or consequential loss, loss of profit, loss of opportunity, or financial loss) arising out of or in connection with your use of, or reliance on, the Service, however caused, including by our negligence; you use the Service entirely at your own risk; and where our liability cannot be excluded but can be limited, our total aggregate liability is limited, at our option, to re-supplying the Service or paying the cost of having it re-supplied, or, if you paid a fee, to a refund of fees paid in the 12 months before the claim.",
        ]},
        { h: "8. Australian Consumer Law", body: [
          "Nothing in this Disclaimer excludes, restricts, or modifies any consumer guarantee, right, or remedy conferred on you by the Competition and Consumer Act 2010 (Cth) (including the Australian Consumer Law) or any other law, where to do so would be unlawful. To the extent any consumer guarantee applies and cannot lawfully be excluded, clause 7 applies only to the extent permitted by that law.",
        ]},
        { h: "9. Indemnity", body: [
          "To the maximum extent permitted by law, you indemnify us against any claim, loss, liability, cost, or expense arising from your breach of these Terms or your misuse of the Service.",
        ]},
        { h: "10. Intellectual property", body: [
          "All content, design, models, and software on the Service are owned by or licensed to Eyes Here Pty Limited and are protected by law. You may not copy, reproduce, scrape, or commercially exploit any part of the Service without our written permission.",
        ]},
        { h: "11. Governing law", body: [
          "These Terms are governed by the laws of New South Wales, Australia, and you submit to the non-exclusive jurisdiction of the courts of that State.",
        ]},
        { h: "12. Changes", body: [
          "We may amend these Terms at any time by posting an updated version. Continued use of the Service constitutes acceptance of the amended Terms.",
        ]},
        { h: "13. Contact", body: [
          "Eyes Here Pty Limited (ABN 48 656 142 997). Contact: [contact email].",
        ]},
      ],
    },
    privacy: {
      title: "Privacy Policy",
      blocks: [
        { h: "1. Who we are", body: [
          "This Privacy Policy explains how Eyes Here Pty Limited (ABN 48 656 142 997) handles personal information in connection with the Bricks Service. We handle personal information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles.",
        ]},
        { h: "2. Information we collect", body: [
          "We may collect: information you provide directly, such as your name, email address, and any property preferences, shortlists, or assumptions you enter; technical information, such as device, browser, and usage data collected automatically when you use the Service; and information you provide when you request to be matched with a third-party professional.",
        ]},
        { h: "3. How we use information", body: [
          "We use personal information to provide and improve the Service, to respond to your requests, to facilitate referrals you ask for, to communicate with you, and to comply with our legal obligations. We do not sell your personal information.",
        ]},
        { h: "4. Disclosure", body: [
          "We may disclose personal information to: service providers who help us operate the Service (such as hosting and analytics providers); third-party professionals (such as buyer\u2019s agents or mortgage brokers) where you request to be matched with them; and others where required or permitted by law. Some service providers may be located, or store data, outside Australia.",
        ]},
        { h: "5. Security and retention", body: [
          "We take reasonable steps to protect personal information from misuse, loss, and unauthorised access. No method of transmission or storage is completely secure. We retain personal information for as long as necessary to provide the Service and meet our legal obligations.",
        ]},
        { h: "6. Cookies and analytics", body: [
          "The Service may use cookies and similar technologies to operate the site, remember your preferences, and understand usage. You can control cookies through your browser settings; disabling them may affect how the Service works.",
        ]},
        { h: "7. Access, correction and complaints", body: [
          "You may request access to, or correction of, the personal information we hold about you, or make a privacy complaint, by contacting us. If you are not satisfied with our response, you may contact the Office of the Australian Information Commissioner (OAIC).",
        ]},
        { h: "8. Changes", body: [
          "We may update this Privacy Policy from time to time by posting an updated version on the Service.",
        ]},
        { h: "9. Contact", body: [
          "Eyes Here Pty Limited (ABN 48 656 142 997). Contact: [contact email].",
        ]},
      ],
    },
    finance: {
      title: "Financial & Tax Disclaimer",
      blocks: [
        { h: "Not financial product advice", body: [
          "The Bricks Service provides general, factual information only. It does not take into account your personal objectives, financial situation, or needs. It is not, and must not be relied on as, financial product advice, personal financial advice, investment advice, or a recommendation to buy, sell, hold, or finance any property or financial product.",
          "Eyes Here Pty Limited does not hold an Australian Financial Services Licence and does not provide services that require one. If you need personal financial advice, consult an appropriately licensed financial adviser.",
        ]},
        { h: "Not tax or credit advice", body: [
          "Information on the Service about taxation \u2014 including negative gearing, capital gains tax, indexation, and 2026\u201327 Federal Budget measures \u2014 is a general summary only and is not tax advice. Tax law is complex, depends on your circumstances, and may change. For tax advice, consult a registered tax agent. For advice about loans or credit, consult a licensed credit assistance provider.",
        ]},
        { h: "Projections are estimates, not guarantees", body: [
          "All calculators, models, projections, and scenarios on the Service produce illustrative estimates generated from assumptions and simplified models. They are not forecasts or guarantees of any future result. Actual outcomes depend on interest rates, inflation, government policy, market conditions, and your individual circumstances. Past performance does not indicate future performance. You should not make any financial decision based solely on Service outputs.",
        ]},
        { h: "The 2026 Federal Budget measures are not yet law", body: [
          "Commentary on the 2026\u201327 Federal Budget describes announced policy proposals. At the time of preparation, these measures had not been enacted as legislation and may be amended, delayed, or not proceed. Do not treat any description of these measures as a statement of current law.",
        ]},
        { h: "Referrals", body: [
          "Where the Service offers to match you with a buyer\u2019s agent, mortgage broker, or other professional, that is an introduction only. We may receive a referral fee. We do not provide those professionals\u2019 services and are not responsible for their advice or conduct. Always satisfy yourself, independently, that any professional and any product is appropriate for you.",
        ]},
        { h: "Your responsibility", body: [
          "You use the Service at your own risk and are solely responsible for your own financial, investment, tax, and borrowing decisions. Before acting, obtain independent advice from appropriately licensed or registered professionals. See our full Terms of Use & Disclaimer for the complete terms that govern your use of the Service.",
        ]},
      ],
    },
  };

  const doc = DOCS[active] || DOCS.terms;

  return (
    <motion.div key="legal" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.22 }}
      style={{ position: "relative" }}>

      <ScreenHeroBg height={420} />

      <div className="screen-content" style={{ position: "relative", zIndex: 1, padding: "0 32px 110px", maxWidth: 820, margin: "0 auto" }}>

        <div style={{ marginTop: 104, marginBottom: 26, textAlign: "center" }}>
          <Eyebrow style={{ marginBottom: 22 }}>Legal</Eyebrow>
          <ScreenH1 accent="the fine print." fontSize={52}>The important</ScreenH1>
          <p style={{
            margin: "20px auto 0", maxWidth: 540,
            fontSize: 16, lineHeight: 1.5, color: "rgba(245,247,250,0.6)",
          }}>
            Bricks is a research tool. It gives you factual information and
            estimates — not advice. Please read these before you act on anything.
          </p>
        </div>

        {/* tabs */}
        <div style={{
          display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
          marginBottom: 30,
        }}>
          {TABS.map(t => {
            const on = active === t.id;
            return (
              <button key={t.id} onClick={() => setActive(t.id)}
                style={{
                  cursor: "pointer", border: "none", borderRadius: 999,
                  padding: "10px 18px", fontSize: 13, fontWeight: 600,
                  background: on ? "linear-gradient(135deg,#FB7185,#C9374F)" : "rgba(255,255,255,0.05)",
                  color: on ? "#FFFFFF" : "rgba(245,247,250,0.7)",
                  boxShadow: on ? "none" : "0 0 0 1px rgba(255,255,255,0.09) inset",
                  transition: "all 0.18s",
                }}>{t.label}</button>
            );
          })}
        </div>

        {/* document */}
        <div style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 18, padding: "34px 32px",
        }}>
          <div style={{
            fontFamily: 'ui-serif, Georgia, serif', fontSize: 26, fontWeight: 500,
            color: "#F5F7FA", letterSpacing: "-0.02em", marginBottom: 4,
          }}>{doc.title}</div>
          <div style={{ fontSize: 12, color: "rgba(245,247,250,0.4)", marginBottom: 26 }}>
            {updated} · Eyes Here Pty Limited · ABN 48 656 142 997
          </div>
          {doc.blocks.map((b, i) => (
            <div key={i} style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: 14.5, fontWeight: 700, color: "#F5F7FA", marginBottom: 8,
              }}>{b.h}</div>
              {b.body.map((para, j) => (
                <p key={j} style={{
                  margin: "0 0 9px", fontSize: 13.5, lineHeight: 1.6,
                  color: "rgba(245,247,250,0.62)",
                }}>{para}</p>
              ))}
            </div>
          ))}
          <div style={{
            marginTop: 8, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: 12, color: "rgba(245,247,250,0.4)", lineHeight: 1.55,
          }}>
            This page is provided as general information about how the Service
            operates. It is not legal advice. The operator should have these
            documents reviewed by a qualified Australian legal practitioner
            before relying on them.
          </div>

          {/* Map credits — required attribution for the OSM/Carto basemap and
              the Leaflet renderer. We strip these from the map UI itself for a
              cleaner explorer view; the credit lives here instead. */}
          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.04)",
            fontSize: 11.5, color: "rgba(245,247,250,0.36)", lineHeight: 1.55,
          }}>
            <strong style={{ color: "rgba(245,247,250,0.55)", fontWeight: 600 }}>Map data &amp; attributions.</strong>{" "}
            The property map is rendered with{" "}
            <a href="https://leafletjs.com/" target="_blank" rel="noreferrer noopener"
               style={{ color: "rgba(245,247,250,0.55)" }}>Leaflet</a>.
            Basemap tiles &copy;{" "}
            <a href="https://carto.com/attributions" target="_blank" rel="noreferrer noopener"
               style={{ color: "rgba(245,247,250,0.55)" }}>CARTO</a>{" "}
            using data from{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener"
               style={{ color: "rgba(245,247,250,0.55)" }}>OpenStreetMap</a>{" "}
            contributors, available under the Open Database License.
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsScreen({ onTab }) {
  return (
    <motion.div key="settings" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.22 }}
      style={{ position: "relative" }}>

      <ScreenHeroBg height={480} />

      <div className="screen-content" style={{ position: "relative", zIndex: 1, padding: "0 32px 110px", maxWidth: 880, margin: "0 auto" }}>

        {/* HERO */}
        <div style={{
          marginTop: 110, marginBottom: 48,
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <button onClick={() => onTab?.("browse")}
            style={{
              marginBottom: 20, cursor: "pointer",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 999, padding: "8px 14px", color: "rgba(245,247,250,0.7)",
              display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500,
            }}>
            <ArrowLeft size={14} strokeWidth={2} /> Back
          </button>

          <Eyebrow style={{ marginBottom: 28 }}>
            Your preferences · Bricks v0.3
          </Eyebrow>

          <ScreenH1 accent="numbers." fontSize={56}>
            Tune the
          </ScreenH1>

          <p style={{
            margin: "26px 0 0",
            fontSize: 17, fontWeight: 400, lineHeight: 1.55, letterSpacing: -0.01,
            color: "rgba(245,247,250,0.65)",
            maxWidth: 540,
          }}>
            Your bracket, your loan rate, your assumptions. Every projection on Bricks rebuilds itself from these.
          </p>
        </div>

        {/* Pro upsell card — glass with rose accent */}
        <div style={{
          background: "linear-gradient(135deg, rgba(244,63,94,0.10) 0%, rgba(244,63,94,0.025) 100%)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(244,63,94,0.22) inset, 0 30px 70px -38px rgba(0,0,0,0.88)",
          borderRadius: 20, padding: 28, marginBottom: 32,
          display: "flex", alignItems: "center", gap: 24,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 999,
            background: "linear-gradient(135deg, rgba(244,63,94,0.20) 0%, rgba(244,63,94,0.08) 100%)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.10) inset, 0 0 0 1px rgba(244,63,94,0.30) inset",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Sparkles size={22} color="#FB7185" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              color: "#FECDD3", fontSize: 10.5, fontWeight: 700,
              letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4,
            }}>
              Bricks Pro
            </div>
            <div style={{
              color: "#F5F7FA",
              fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
              fontSize: 22, fontWeight: 500, letterSpacing: -0.02, lineHeight: 1.25,
            }}>
              $14.99/mo · 7-day trial
            </div>
            <div style={{ color: "rgba(245,247,250,0.6)", fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>
              Weekly AI digests, drift alerts, tax pack export, unlimited properties.
            </div>
          </div>
          <button style={{
            background: "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)",
            color: "#FFFFFF", border: "none",
            borderRadius: 12, padding: "11px 18px",
            fontSize: 13, fontWeight: 600, letterSpacing: -0.05,
            cursor: "pointer", flexShrink: 0,
            boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 28px -12px rgba(244,63,94,0.85)",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            Start trial <ArrowRight size={13} strokeWidth={2.2} />
          </button>
        </div>

        {/* Settings list — glass card */}
        <div style={{
          background: "rgba(255,255,255,0.025)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.06) inset, 0 30px 70px -38px rgba(0,0,0,0.88)",
          borderRadius: 20, padding: 4, marginBottom: 32,
        }}>
          {[
            { l: "Your marginal tax rate", v: "39%" },
            { l: "Region", v: "Australia" },
            { l: "Loan rate assumption", v: "6.39%" },
            { l: "Default deposit", v: "20%" },
            { l: "Currency", v: "AUD" },
          ].map((r, i, arr) => (
            <div key={i} style={{
              padding: "16px 24px",
              borderBottom: i === arr.length - 1 ? "none" : "1px solid rgba(255,255,255,0.04)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ color: "#F5F7FA", fontSize: 14, fontWeight: 500, letterSpacing: -0.05 }}>{r.l}</span>
              <span style={{ color: "rgba(245,247,250,0.55)", fontSize: 13.5, letterSpacing: -0.05 }}>{r.v}</span>
            </div>
          ))}
        </div>

        <div style={{
          textAlign: "center",
          color: "rgba(245,247,250,0.4)",
          fontSize: 12, marginTop: 24, lineHeight: 1.7, letterSpacing: -0.05,
        }}>
          Bricks · v0.3<br />Built in Australia for the post-2026 budget reality.
        </div>
      </div>
    </motion.div>
  );
}

function SavedScreen({ properties, wishlist, onToggleWishlist, onOpen, onFindMore }) {
  const savedBase = properties.filter(p => wishlist.has(p.id));
  const { days: daysUntilCliff } = useCountdown();

  // ── Compare lens — sort the shortlist through one investor question ───────
  const COMPARE_SORTS = [
    { id: "positive",   label: "Fastest to break-even" },
    { id: "holdingCost",label: "Costs you least" },
    { id: "price-low",  label: "Lowest price" },
  ];
  const [sortBy, setSortBy] = useState("positive");

  // ── Global assumptions — re-run every shortlisted property together ───────
  const [gRate, setGRate] = useState(6.6);
  const [gDeposit, setGDeposit] = useState(20);
  const [gGrowth, setGGrowth] = useState(5);
  const globalDirty = gRate !== 6.6 || gDeposit !== 20 || gGrowth !== 5;

  // apply the global assumptions onto each property so cards re-run together
  const saved = useMemo(() => {
    const adjusted = savedBase.map(p => ({
      ...p,
      rate: gRate / 100,
      deposit: gDeposit / 100,
      growthPct: gGrowth,
    }));
    const withCf = adjusted.map(p => {
      const cf = generateCashflow(p);
      return {
        prop: p,
        breakEven: yearTurnsPositive(cf) || 99,
        holding: cf.slice(0, 12).reduce((s, x) => s + Math.min(0, x), 0),
      };
    });
    withCf.sort((a, b) => {
      if (sortBy === "positive")    return a.breakEven - b.breakEven;
      if (sortBy === "holdingCost") return b.holding - a.holding;  // least negative first
      if (sortBy === "price-low")   return a.prop.price - b.prop.price;
      return 0;
    });
    return withCf.map(x => x.prop);
  }, [savedBase, gRate, gDeposit, gGrowth, sortBy]);

  return (
    <motion.div key="saved"
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.22 }}
      style={{ position: "relative" }}>

      <ScreenHeroBg height={520} />

      <div className="screen-content" style={{ position: "relative", zIndex: 1, padding: "0 32px 110px" }}>

        {/* HERO */}
        <div style={{
          marginTop: 110, marginBottom: 40,
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <Eyebrow style={{ marginBottom: 28 }}>
            Your shortlist · {saved.length} on the table
          </Eyebrow>

          <ScreenH1
            accent={saved.length === 0 ? "shortlist yet." : "head to head."}
            fontSize={64}>
            {saved.length === 0
              ? "You haven't built a"
              : "Your shortlist,"}
          </ScreenH1>

          <p style={{
            margin: "26px 0 0",
            fontSize: 18, fontWeight: 400, lineHeight: 1.5, letterSpacing: -0.01,
            color: "rgba(245,247,250,0.65)",
            maxWidth: 580,
          }}>
            {saved.length === 0
              ? "Tap the heart on any property to build your shortlist — then compare the 30-year cashflow on all of them, side by side, through one lens."
              : <>Sort them by what matters to you, then move the assumptions below to stress-test <span style={{ color: "#FECDD3", fontWeight: 600 }}>every property at once</span>.</>
            }
          </p>
        </div>

        {/* Empty state — premium card */}
        {saved.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              background: "rgba(255,255,255,0.025)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.06) inset, 0 30px 70px -38px rgba(0,0,0,0.88)",
              borderRadius: 20, padding: "56px 40px", textAlign: "center",
              maxWidth: 520, margin: "0 auto",
            }}>
            <div style={{
              width: 64, height: 64, borderRadius: 999,
              background: "linear-gradient(135deg, rgba(244,63,94,0.18) 0%, rgba(244,63,94,0.06) 100%)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset, 0 0 0 1px rgba(244,63,94,0.25) inset, 0 12px 40px -8px rgba(244,63,94,0.40)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}>
              <BarChart3 size={28} color="#FB7185" strokeWidth={2} />
            </div>
            <div style={{
              color: "#F5F7FA",
              fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
              fontSize: 22, fontWeight: 500, letterSpacing: -0.02, marginBottom: 8, lineHeight: 1.25,
            }}>
              Build a shortlist worth comparing.
            </div>
            <div style={{
              color: "rgba(245,247,250,0.55)", fontSize: 13.5, lineHeight: 1.55,
              marginBottom: 24, maxWidth: 360, marginLeft: "auto", marginRight: "auto",
            }}>
              Add the properties you're weighing up — then put them head to head and stress-test them all against the same rate, deposit and growth.
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onFindMore}
              style={{
                background: "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)",
                color: "#FFFFFF", border: "none",
                borderRadius: 12, padding: "12px 20px",
                fontSize: 13.5, fontWeight: 600, cursor: "pointer", letterSpacing: -0.05,
                boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 28px -12px rgba(244,63,94,0.85)",
                display: "inline-flex", alignItems: "center", gap: 7,
              }}>
              <Sparkles size={14} strokeWidth={2} /> Start hunting properties
              <ArrowRight size={13} strokeWidth={2.2} />
            </motion.button>
          </motion.div>
        )}

        {/* COMPARE CONTROLS — sort lens + global assumption sliders */}
        {saved.length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20, padding: "22px 22px", marginBottom: 30,
          }}>
            {/* sort lens */}
            <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,247,250,0.5)", fontWeight: 600, marginBottom: 10 }}>
              See them through one lens
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
              {COMPARE_SORTS.map(s => {
                const on = sortBy === s.id;
                return (
                  <button key={s.id} onClick={() => setSortBy(s.id)}
                    style={{
                      cursor: "pointer", border: "none", borderRadius: 999,
                      padding: "9px 15px", fontSize: 12.5, fontWeight: 600,
                      background: on ? "linear-gradient(135deg,#FB7185,#C9374F)" : "rgba(255,255,255,0.05)",
                      color: on ? "#FFFFFF" : "rgba(245,247,250,0.7)",
                      boxShadow: on ? "none" : "0 0 0 1px rgba(255,255,255,0.09) inset",
                      transition: "all 0.18s",
                    }}>{s.label}</button>
                );
              })}
            </div>

            {/* global assumptions */}
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,247,250,0.5)", fontWeight: 600 }}>
                Stress-test all of them at once
              </div>
              {globalDirty && (
                <button onClick={() => { setGRate(6.6); setGDeposit(20); setGGrowth(5); }}
                  style={{
                    cursor: "pointer", background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999,
                    padding: "5px 12px", color: "rgba(245,247,250,0.7)",
                    fontSize: 11, fontWeight: 600,
                  }}>Reset</button>
              )}
            </div>
            <div className="compare-sliders" style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px",
            }}>
              <StudioSlider label="Interest rate" icon={Percent} value={gRate}
                min={4} max={10} step={0.1}
                fmt={v => `${v.toFixed(1)}%`} onChange={setGRate} />
              <StudioSlider label="Deposit" icon={Wallet} value={gDeposit}
                min={5} max={50} step={1}
                fmt={v => `${v}%`} onChange={setGDeposit} />
              <StudioSlider label="Capital growth" icon={LineChart} value={gGrowth}
                min={0} max={9} step={0.5}
                fmt={v => `${v.toFixed(1)}%`} onChange={setGGrowth} />
            </div>
          </div>
        )}

        {/* Compare property grid — ranked by the chosen lens */}
        {saved.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
            gap: 32,
            marginTop: 4,
          }}>
            {saved.map((p, i) => (
              <PropertyCard
                key={p.id}
                property={p}
                onOpen={() => onOpen(p.id)}
                daysUntilCliff={daysUntilCliff}
                wishlisted={true}
                onToggleWishlist={onToggleWishlist}
                rank={i + 1}
              />
            ))}
          </div>
        )}

        {/* Footer benefit strip */}
        {saved.length > 0 && (
          <div className="benefit-strip" style={{
            marginTop: 32,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 18,
            boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -36px rgba(0,0,0,0.8)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
            alignItems: "center",
            padding: "18px 8px",
          }}>
            <BenefitItem icon={Shield} title="Built for investors" sub="No fluff. Just cashflow." first />
            <BenefitItem icon={FileText} title="2026 budget modelled" sub="Negative gearing & tax cuts." />
            <BenefitItem icon={BarChart3} title="30-year projections" sub="Real dollars. After tax." />
            <BenefitItem icon={Lock} title="Your data stays private" sub="Bank-grade encryption." />
            <motion.button whileTap={{ scale: 0.96 }} onClick={onFindMore}
              style={{
                margin: "0 14px 0 24px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#F5F7FA",
                borderRadius: 999, padding: "11px 18px",
                fontSize: 13, fontWeight: 600, letterSpacing: -0.05,
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 7,
              }}>
              <Sparkles size={14} strokeWidth={1.8} />
              Find more
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}


// VideoBackdrop now lives inside src/screens/BudgetScreen.jsx — the only
// page that uses it. The clip is in /public/budget-bg.mp4.

function AppInner() {
  const { openReferral } = useReferral();
  const [route, setRoute] = useState(() => parseRoute());
  const [screen, setScreen] = useState("browse");
  const [legalSection, setLegalSection] = useState("terms");
  const [openId, setOpenId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [properties, setProperties] = useState(ALL_PROPS);
  // Goals start empty — only the user's own picks (saved via the Goals page)
  // populate this. We used to seed five demo goals, but that caused duplicate
  // markers on the cashflow brick whenever a user picked the same goal again
  // from the catalogue (different ID schema), and it surprised buyers who
  // hadn't set any goals yet.
  const [goals, setGoals] = useState(() => loadStoredGoals() || []);
  const [showMatchMe, setShowMatchMe] = useState(false);
  const [wishlist, setWishlist] = useState(new Set());
  const [bracket, setBracket] = useState("standard");
  const [detailReturn, setDetailReturn] = useState("browse");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const exitPublicRoute = () => {
    navigateTo({ type: "app" });
    setRoute({ type: "app" });
  };

  const handleOpen = (id) => {
    exitPublicRoute();
    setDetailReturn(screen);
    setOpenId(id);
    setScreen("detail");
    trackPropertyOpen();
  };
  const handleTab = (tab) => {
    setMenuOpen(false);
    if (tab === "report" || tab === "agent-preview") {
      exitPublicRoute();
      setScreen("agent-preview");
      return;
    }
    if (tab === "methodology") {
      navigateTo({ type: "methodology" });
      setRoute(parseRoute());
      return;
    }
    if (tab === "leaderboard") {
      navigateTo({ type: "leaderboard", suburb: "overall" });
      setRoute(parseRoute());
      return;
    }
    exitPublicRoute();
    setScreen(tab);
  };
  const handleAdd = (np) => { setProperties(prev => [...prev, { ...np, id: Date.now() }]); setShowAdd(false); };
  const toggleWishlist = (id) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const openProperty = properties.find(p => p.id === openId);
  const isAgentShareView = openProperty?.agentPreview === true || openProperty?.source === "agent-preview";

  const handleDetailBack = () => {
    const dest = detailReturn && detailReturn !== "detail" ? detailReturn : "browse";
    setOpenId(null);
    setScreen(dest);
  };

  // Every navigation lands at the top of the new screen
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen, openId, route.type]);

  // ── Active nav key ──────────────────────────────────────────────────────
  // Centralised so every TopNav / MobileBottomNav placement stays in sync.
  // Detail pages and home count as "browse" (you got there via Research).
  // Settings, budget, legal etc. don't map to any visible tab — return null
  // so no tab pretends to be selected.
  const navKey = useMemo(() => {
    if (route.type === "leaderboard") return "leaderboard";
    if (route.type === "methodology") return null;
    if (route.type === "report-new") return null;
    if (screen === "browse" || screen === "detail" || screen === "home") return "browse";
    if (screen === "map") return "map";
    if (screen === "saved") return "saved";
    if (screen === "goals") return "goals";
    return null;
  }, [route.type, screen]);

  if (route.type === "methodology") {
    return (
      <div style={{ minHeight: "100vh", background: "#05070A", color: "#F5F7FA", paddingTop: 56 }}>
        <TopNav active={navKey} onTab={handleTab} onMenuToggle={() => setMenuOpen(true)} onMatchMe={() => setShowMatchMe(true)} wishlistCount={wishlist.size} />
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} onTab={handleTab} wishlistCount={wishlist.size} />
        <MethodologyScreen onBack={exitPublicRoute} />
        <MobileBottomNav active={navKey} onTab={handleTab} wishlistCount={wishlist.size} />
      </div>
    );
  }

  if (route.type === "leaderboard") {
    return (
      <div style={{ minHeight: "100vh", background: "#05070A", color: "#F5F7FA", paddingTop: 56 }}>
        <TopNav active={navKey} onTab={handleTab} onMenuToggle={() => setMenuOpen(true)} onMatchMe={() => setShowMatchMe(true)} wishlistCount={wishlist.size} />
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} onTab={handleTab} wishlistCount={wishlist.size} />
        <LeaderboardScreen
          properties={properties}
          initialSuburb={route.suburb || "overall"}
          onBack={exitPublicRoute}
          onOpenProperty={handleOpen}
        />
        <div className="bricks-web-content" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 28px" }}>
          <SiteFooter
            onTab={handleTab}
            onLegal={(sec) => { exitPublicRoute(); setLegalSection(sec); setScreen("legal"); }}
            onMethodology={() => { navigateTo({ type: "methodology" }); setRoute(parseRoute()); }}
          />
        </div>
        <MobileBottomNav active={navKey} onTab={handleTab} wishlistCount={wishlist.size} />
      </div>
    );
  }

  if (route.type === "report-new") {
    return (
      <div style={{ minHeight: "100vh", background: "#05070A", color: "#F5F7FA", paddingTop: 56 }}>
        <TopNav active={navKey} onTab={handleTab} onMenuToggle={() => setMenuOpen(true)} onMatchMe={() => setShowMatchMe(true)} wishlistCount={wishlist.size} />
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} onTab={handleTab} wishlistCount={wishlist.size} />
        <VendorReportForm
          onBack={() => { exitPublicRoute(); setScreen("agent-preview"); }}
          onSaved={(prop) => setProperties(prev => [...prev, prop])}
          engine={SCORING_ENGINE}
        />
        <MobileBottomNav active={navKey} onTab={handleTab} wishlistCount={wishlist.size} />
      </div>
    );
  }

  return (
    <div style={{
      width: "100%", minHeight: "100vh", background: "#05070A",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      WebkitFontSmoothing: "antialiased",
      color: "#F5F7FA",
    }}>
      {/* Video backdrop now lives inside BudgetScreen — was leaking onto every screen */}

      <div style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse at top, rgba(59,130,246,0.05), transparent 50%), radial-gradient(ellipse at bottom right, rgba(244,114,182,0.04), transparent 50%)",
        pointerEvents: "none",
      }} />

      {/* TOP NAV — hidden on buyer-facing agent share pages */}
      {!isAgentShareView && (
        <TopNav active={navKey} onTab={handleTab} onMenuToggle={() => setMenuOpen(true)} onMatchMe={() => setShowMatchMe(true)} wishlistCount={wishlist.size} />
      )}
      {!isAgentShareView && (
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} onTab={handleTab} wishlistCount={wishlist.size} />
      )}

      {/* MOBILE BOTTOM NAV */}
      {!isAgentShareView && (
        <MobileBottomNav active={navKey} onTab={handleTab} wishlistCount={wishlist.size} />
      )}

      {/* Page content — centered single-column matching the app width.
          Same components as the mobile app, same flow, just no phone frame and a top nav. */}
      <div className={`bricks-web${isAgentShareView ? " agent-share-mode" : ""}`} style={{
        position: "relative", zIndex: 1, width: "100%", minHeight: "100vh",
        paddingTop: isAgentShareView ? 0 : 56,
        paddingBottom: isAgentShareView ? 88 : 32,
      }}>
        <div style={{ position: "relative", minHeight: "calc(100vh - 56px)" }}>
          <AnimatePresence mode="wait">
            {screen === "browse"   && <BrowseScreen key="browse-list" initialViewMode="list" properties={properties} goals={goals}
                                         wishlist={wishlist} onToggleWishlist={toggleWishlist}
                                         bracket={bracket} onBracket={setBracket}
                                         onTab={handleTab}
                                         onOpen={handleOpen} onOpenBudget={() => handleTab("budget")} />}
            {screen === "map"      && <BrowseScreen key="browse-map" initialViewMode="map" properties={properties} goals={goals}
                                         wishlist={wishlist} onToggleWishlist={toggleWishlist}
                                         bracket={bracket} onBracket={setBracket}
                                         onTab={handleTab}
                                         onOpen={handleOpen} onOpenBudget={() => handleTab("budget")} />}
            {screen === "saved"    && <SavedScreen key="saved" properties={properties} wishlist={wishlist}
                                         onToggleWishlist={toggleWishlist}
                                         onOpen={handleOpen}
                                         onFindMore={() => handleTab("browse")} />}
            {screen === "home"     && <HomeScreen key="home" properties={properties} goals={goals} onOpen={handleOpen} />}
            {screen === "detail"   && openProperty && <DetailScreen key="detail" property={openProperty} goals={goals} onBack={handleDetailBack} onOpen={handleOpen} onOpenBudget={() => handleTab("budget")} wishlisted={wishlist.has(openProperty.id)} onToggleWishlist={toggleWishlist} />}
            {screen === "budget" && (
              <Suspense key="budget" fallback={<div style={{ minHeight: "60vh" }} />}>
                <BudgetScreen onBrowse={() => handleTab("browse")} />
              </Suspense>
            )}
            {screen === "goals" && (
              <GoalsScreen
                key="goals"
                properties={properties}
                goals={goals}
                onChangeGoals={setGoals}
                onOpen={handleOpen}
                onTab={handleTab}
              />
            )}
            {screen === "agent-preview" && (
              <AgentPreviewScreen
                key="agent-preview"
                properties={properties}
                engine={SCORING_ENGINE}
                onOpenProperty={handleOpen}
              />
            )}
            {screen === "settings" && <SettingsScreen key="settings" onTab={handleTab} />}
            {screen === "legal"    && <LegalScreen key="legal" section={legalSection} />}
          </AnimatePresence>
          <AnimatePresence>
            {showAdd && <AddScreen onClose={() => setShowAdd(false)} onSave={handleAdd} />}
          </AnimatePresence>
        </div>

        {/* Site footer — hidden on map and agent share pages */}
        {screen !== "map" && !isAgentShareView && (
          <div className="bricks-web-content" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 28px" }}>
            <SiteFooter
              onTab={handleTab}
              onLegal={(sec) => { setLegalSection(sec); setScreen("legal"); }}
              onMethodology={() => { navigateTo({ type: "methodology" }); setRoute(parseRoute()); }}
            />
          </div>
        )}
      </div>

      <style>{`
        html, body { margin: 0; background: #05070A; overflow-x: hidden; max-width: 100vw; }
        .bricks-web *::-webkit-scrollbar { display: none; }
        .bricks-web * { scrollbar-width: none; }
        /* visible so full-bleed hero backgrounds can extend past the content column */
        .bricks-web { overflow-x: visible; max-width: 100vw; }
        .hero-bg-bleed { max-width: 100vw; }
        .bricks-web .screen-content {
          max-width: 1400px;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        .bracket-actions {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        /* ─── Leaflet property map ─── */
        .property-map-shell .leaflet-container {
          font-family: inherit;
          z-index: 1;
        }
        .bricks-leaflet-marker {
          background: transparent !important;
          border: none !important;
        }
        /* Pin = a single dot. Heatmap colour set per-rank via the --pin-fill
           CSS var; white label with a soft shadow stays legible across the
           green→amber→red palette. */
        .bricks-map-pin {
          position: relative;
          width: var(--pin-size);
          height: var(--pin-size);
          border-radius: 999px;
          background: var(--pin-fill);
          box-shadow:
            0 0 0 1.5px var(--pin-ring) inset,
            0 0 0 2px rgba(5,7,10,0.85),
            0 4px 10px rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: var(--pin-label, #FFFFFF);
          letter-spacing: -0.02em;
          line-height: 1;
          transition: transform 0.18s ease;
          /* Allow the floating caption to overflow the pin's iconSize bounds */
          overflow: visible;
        }
        .bricks-map-pin > span {
          text-shadow: 0 1px 2px rgba(0,0,0,0.6);
          z-index: 2;
        }
        .bricks-map-pin--selected {
          transform: scale(1.12);
          box-shadow:
            0 0 0 2px #F5F7FA inset,
            0 0 0 3px rgba(5,7,10,0.9),
            0 0 18px color-mix(in srgb, var(--pin-fill) 70%, transparent);
        }
        /* Floating caption next to the top-3 pins — answers "what makes this
           rank #1?" before the user clicks. Sits to the right of the pin with
           a hairline ring matching the pin's fill so it visually belongs.
           High z-index ensures the expanding ::before/::after pulse rings
           cannot sweep on top of the caption mid-cycle. animation-fill-mode
           "both" pins the caption to its end-state after the reveal so it
           never re-disappears across pulse loops. */
        .bricks-map-pin-caption {
          position: absolute;
          left: calc(var(--pin-size) + 8px);
          top: 50%;
          transform: translateY(-50%);
          padding: 4px 9px;
          border-radius: 7px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #F5F7FA;
          background: rgba(11,14,20,0.92);
          backdrop-filter: blur(6px);
          box-shadow:
            0 0 0 1px var(--pin-fill) inset,
            0 0 0 1px rgba(5,7,10,0.9),
            0 6px 14px rgba(0,0,0,0.45);
          white-space: nowrap;
          pointer-events: none;
          z-index: 12;
          opacity: 1;
        }
        /* Gentle continuous pulse for top-3 — soft rings, slow cycle */
        .bricks-map-pin--top::before,
        .bricks-map-pin--top::after {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 999px;
          border: 2px solid var(--pin-fill);
          opacity: 0;
          pointer-events: none;
          z-index: 0;
          animation: bricks-pin-pulse 8s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }
        .bricks-map-pin--top::after {
          animation-delay: 4s;
        }
        @keyframes bricks-pin-pulse {
          0%   { transform: scale(0.85); opacity: 0;   }
          12%  { opacity: 0.48; }
          100% { transform: scale(2.15); opacity: 0;   }
        }
        /* One-shot soft glow on first map load only */
        .bricks-map-pin--top-burst {
          animation: bricks-pin-burst-glow 2.4s ease-out 1;
        }
        .bricks-map-pin--top-burst::before {
          animation: bricks-pin-burst 2.6s cubic-bezier(0.22, 0.61, 0.36, 1) 1,
                     bricks-pin-pulse 8s cubic-bezier(0.22, 0.61, 0.36, 1) infinite 2.6s;
        }
        @keyframes bricks-pin-burst {
          0%   { transform: scale(0.7); opacity: 0;    border-width: 2px; }
          18%  { opacity: 0.35;                         border-width: 2px; }
          100% { transform: scale(3.2); opacity: 0;    border-width: 1px; }
        }
        @keyframes bricks-pin-burst-glow {
          0%   { box-shadow:
                  0 0 0 1.5px var(--pin-ring) inset,
                  0 0 0 2px rgba(5,7,10,0.85),
                  0 0 0 0 var(--pin-fill); }
          45%  { box-shadow:
                  0 0 0 1.5px var(--pin-ring) inset,
                  0 0 0 2px rgba(5,7,10,0.85),
                  0 0 16px 4px color-mix(in srgb, var(--pin-fill) 45%, transparent); }
          100% { box-shadow:
                  0 0 0 1.5px var(--pin-ring) inset,
                  0 0 0 2px rgba(5,7,10,0.85),
                  0 4px 10px rgba(0,0,0,0.55); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bricks-map-pin--top::before,
          .bricks-map-pin--top::after,
          .bricks-map-pin--top-burst::before,
          .bricks-map-pin--top-burst { animation: none; }
          .bricks-map-pin--top::before,
          .bricks-map-pin--top::after { opacity: 0.35; transform: scale(1.45); }
          .bricks-map-pin-caption { animation: none; }
        }
        /* Hide the default Leaflet attribution control entirely — our credit
           lives in the legal/about screen. (Belt-and-braces alongside the
           attributionControl={false} prop on MapContainer.) */
        .property-map-shell .leaflet-control-attribution { display: none !important; }

        /* Map popup — fixed to viewport so it never clips below the fold.
           Position lives in CSS (not inline) so mobile overrides can apply. */
        .map-card-popup {
          position: fixed;
          left: 50%;
          bottom: max(80px, calc(72px + env(safe-area-inset-bottom, 0px)));
          transform: translateX(-50%);
          width: min(380px, calc(100vw - 28px));
          max-height: min(calc(100dvh - 168px), calc(100dvh - 88px - 80px));
        }

        /* ─── Studio range sliders ─── */
        .bricks-web input[type="range"] { -webkit-appearance: none; appearance: none; }
        .bricks-web input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 999px;
          background: #FFFFFF; cursor: pointer;
          border: 3px solid #E5485F;
          box-shadow: 0 2px 8px rgba(244,63,94,0.5);
          transition: transform 0.12s ease;
          margin-top: -6px;
        }
        .bricks-web input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.18); }
        .bricks-web input[type="range"]::-webkit-slider-thumb:active { transform: scale(1.3); }
        .bricks-web input[type="range"]::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 999px;
          background: #FFFFFF; cursor: pointer;
          border: 3px solid #E5485F;
          box-shadow: 0 2px 8px rgba(244,63,94,0.5);
        }
        .bricks-web input[type="range"]::-webkit-slider-runnable-track {
          height: 6px; border-radius: 999px;
        }
        .bricks-web input[type="range"]::-moz-range-track {
          height: 6px; border-radius: 999px; background: transparent;
        }

        /* Default visibility: desktop shows desktop-only items, mobile-only items hidden */
        .h1-break-mobile { display: none !important; }
        .h1-break-desktop { display: inline; }
        .eyebrow-text-mobile { display: none !important; }
        .eyebrow-text-desktop { display: inline; }
        .top-nav-mobile-match { display: none !important; }
        .top-nav-mobile-menu { display: none !important; }

        /* ─── TABLET — 720-980px ─── */
        @media (max-width: 980px) {
          .hero-h1 { font-size: 56px !important; }
          .screen-h1 { font-size: 44px !important; }
          .detail-h1 { font-size: 36px !important; }
          .top-nav-match span:not(.top-nav-mobile-match-label) { display: none !important; }
          .top-nav-match { padding: 11px 13px !important; }
          .bgt-h { font-size: 40px !important; }
        }

        /* ─── MOBILE — under 720px ─── */
        @media (max-width: 720px) {

          /* Show mobile bottom nav */
          .mobile-bottom-nav { display: flex !important; }

          /* ─── BUDGET STORY PAGE — mobile scaling ─── */
          .bgt-scene { padding: 64px 20px !important; }
          .bgt-h { font-size: 31px !important; }
          .bgt-sub { font-size: 16px !important; }
          .bgt-two-grid { grid-template-columns: 1fr !important; }

          /* ─── DETAIL PAGE — mobile ─── */
          .detail-stat-grid { grid-template-columns: 1fr !important; }
          .map-grid { gap: 4px !important; }
          /* Comparison cards full-width across the screen on mobile, not 2-up
             squashed sidebar style. Big PropertyCard reads better one at a time. */
          .detail-compare-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          /* Drill-down hero — .bricks-web already adds 56px for nav. Trim the
             extra 96px desktop pad to ~24px so the page doesn't open with a
             large empty space above the back button on mobile. */
          .detail-header-pad { padding-top: 24px !important; margin-bottom: 22px !important; }
          .studio-sliders { grid-template-columns: 1fr !important; }
          .compare-sliders { grid-template-columns: 1fr !important; }
          .studio-bricks { grid-template-columns: 1fr !important; }
          .cta-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
          .detail-gallery { grid-template-columns: 1fr !important; }
          .verdict-tiles { grid-template-columns: repeat(2, 1fr) !important; }
          .verdict-card { margin-left: -8px !important; margin-right: -8px !important; }
          .verdict-card > div { padding: 22px 20px 20px !important; }
          .sensitivity-grid { grid-template-columns: 1fr !important; }
          .returns-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .comparison-rail-grid { grid-template-columns: 1fr !important; }
          .home-cta-band { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
          .footer-bottom { flex-direction: column !important; align-items: flex-start !important; }
          .studio-strip { grid-template-columns: 1fr 1fr !important; }
          .brick-callouts { grid-template-columns: repeat(5, 1fr) !important; }
          .studio-buys { grid-template-columns: 1fr !important; }

          /* Hide floating map button — its function is in the footer strip on mobile */
          .floating-map { display: none !important; }

          /* ─── TOP NAV — full-width bar on mobile ─── */
          .top-nav-shell {
            top: 0 !important;
            padding: 0 !important;
          }
          .top-nav {
            height: 56px !important;
            max-width: 100% !important;
            width: 100% !important;
            border-radius: 0 !important;
            padding: 0 10px 0 12px !important;
            gap: 8px !important;
            background: rgba(10,12,16,0.94) !important;
            box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset !important;
            border: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.08) !important;
          }
          .top-nav-tabs,
          .top-nav-spacer {
            display: none !important;
          }
          .top-nav-mobile-match,
          .top-nav-mobile-menu {
            display: inline-flex !important;
          }
          .top-nav-brand {
            flex: 1 !important;
            min-width: 0 !important;
            justify-content: flex-start !important;
            margin-right: 6px !important;
          }
          .top-nav-logo {
            height: 22px !important;
            max-width: 108px !important;
            object-fit: contain !important;
          }
          .top-nav-mobile-match {
            margin-left: auto !important;
          }
          .mobile-menu-panel {
            top: 60px !important;
          }

          /* ─── PAGE CONTAINER ─── */
          .bricks-web {
            padding-top: 56px !important;
            padding-bottom: 0 !important;
            overflow-x: visible !important;
            max-width: 100vw !important;
          }
          .browse-map-screen {
            margin-top: 0 !important;
            height: calc(100dvh - 56px - 58px) !important;
            min-height: 360px !important;
          }
          .agent-share-mode {
            padding-bottom: max(88px, calc(72px + env(safe-area-inset-bottom))) !important;
          }
          .agent-contact-dock {
            padding-bottom: max(12px, env(safe-area-inset-bottom)) !important;
          }
          .map-card-popup {
            bottom: max(68px, calc(58px + env(safe-area-inset-bottom))) !important;
            max-height: min(calc(100dvh - 148px), calc(100dvh - 56px - 58px - 72px)) !important;
          }
          .floating-map-list {
            bottom: max(72px, calc(62px + env(safe-area-inset-bottom))) !important;
          }
          /* Mobile: tighten the floating overlay (drop the sort-segment chrome
             so it doesn't double up with the glass card it now sits inside) */
          .map-controls-overlay .sort-segment {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 2px 0 !important;
          }

          /* ─── SCREEN CONTENT — 16px gutter, room for bottom nav ─── */
          .screen-content {
            padding-left: 16px !important;
            padding-right: 16px !important;
            padding-bottom: 130px !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          /* ─── HERO — CENTERED, spacious, cinematic ─── */
          .hero-header {
            margin-top: 92px !important;
            margin-bottom: 36px !important;
            text-align: center !important;
            align-items: center !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
          }

          /* ─── EYEBROW — framed text, rules shrink, text wraps on mobile ─── */
          .hero-eyebrow {
            margin-bottom: 24px !important;
            gap: 12px !important;
            max-width: 100% !important;
          }
          .hero-eyebrow > span:first-child,
          .hero-eyebrow > span:last-child {
            width: 22px !important;
            flex-shrink: 0 !important;
          }
          .hero-eyebrow-text {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            font-size: 10.5px !important;
            letter-spacing: 0.14em !important;
            line-height: 1.45 !important;
          }
          .hero-eyebrow .eyebrow-line {
            display: block !important;
          }

          /* ─── H1 — bold serif, centered, breathing room ─── */
          .hero-h1,
          .screen-h1 {
            font-size: clamp(30px, 7.6vw, 40px) !important;
            line-height: 1.12 !important;
            font-weight: 600 !important;
            letter-spacing: -0.035em !important;
            text-align: center !important;
            max-width: 92vw !important;
            word-wrap: break-word !important;
            margin-bottom: 0 !important;
          }
          /* Show mobile br, hide desktop space */
          .h1-break-desktop { display: none !important; }
          .h1-break-mobile { display: inline !important; }
          /* Italic accent — keep elegant weight on mobile */
          .hero-h1 .h1-accent,
          .screen-h1 .h1-accent,
          .hero-h1 span[style*="italic"],
          .screen-h1 span[style*="italic"] {
            font-weight: 500 !important;
          }

          /* ─── HERO BACKGROUND — zoom in so dunes read behind headline ─── */
          .browse-hero-bg {
            height: 500px !important;
          }
          .browse-hero-bg .hero-bg-image {
            background-size: 145% auto !important;
            background-position: center 58% !important;
            opacity: 1 !important;
          }
          .browse-hero-bg .hero-bg-fade-top {
            height: 56px !important;
            background: linear-gradient(to bottom, rgba(5,7,10,0.28), transparent) !important;
          }
          .browse-hero-bg .hero-bg-vignette {
            background: radial-gradient(ellipse 100% 55% at 50% 48%, rgba(244,63,94,0.10), transparent 68%), radial-gradient(ellipse 140% 80% at 50% 62%, transparent 62%, rgba(5,7,10,0.22) 100%) !important;
          }
          .detail-h1 {
            font-size: 30px !important;
            line-height: 1.15 !important;
            font-weight: 700 !important;
            letter-spacing: -0.03em !important;
            max-width: 100% !important;
          }

          /* ─── SUB LINE — centered, generous spacing ─── */
          .hero-header p {
            font-size: 16.5px !important;
            line-height: 1.5 !important;
            text-align: center !important;
            margin-top: 22px !important;
            margin-bottom: 0 !important;
            color: rgba(245,247,250,0.78) !important;
            max-width: 94% !important;
          }

          /* ─── BRACKET ROW — label wraps, search + filters on one line ─── */
          .bracket-row {
            margin-bottom: 18px !important;
            margin-top: 8px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .bracket-panel {
            width: 100% !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            padding: 6px 10px !important;
            margin: 0 !important;
            border-radius: 999px !important;
            background: rgba(255,255,255,0.04) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset !important;
            overflow: visible !important;
            max-width: 100% !important;
          }
          .bracket-label {
            width: 100% !important;
            padding: 2px 0 4px !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            letter-spacing: 0.12em !important;
            text-align: center !important;
            display: block !important;
            color: rgba(245,247,250,0.5) !important;
            white-space: normal !important;
          }
          .bracket-btn {
            flex-shrink: 0 !important;
            padding: 8px 14px !important;
            font-size: 12.5px !important;
            font-weight: 600 !important;
            text-align: center !important;
            border-radius: 999px !important;
          }
          .bracket-btn:not(.bracket-btn-active) {
            background: transparent !important;
            box-shadow: none !important;
          }
          .bracket-btn-active {
            font-weight: 700 !important;
          }
          .bracket-actions {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 10px !important;
            width: 100% !important;
          }
          .bracket-search-btn {
            flex-shrink: 0 !important;
          }
          .bracket-filter-btn {
            flex: 1 !important;
            width: auto !important;
            justify-content: center !important;
            padding: 12px 16px !important;
            border-radius: 999px !important;
          }

          /* ─── URGENCY STRIP — full-width, two-line content with chevron ─── */
          .urgency-row {
            margin-bottom: 36px !important;
            justify-content: stretch !important;
            max-width: 100% !important;
          }
          .urgency-row > div {
            padding: 16px 18px !important;
            gap: 14px !important;
            width: 100% !important;
            max-width: 100% !important;
            display: grid !important;
            grid-template-columns: auto 1fr auto !important;
            align-items: center !important;
            border-radius: 14px !important;
          }
          /* Show clock circle on mobile */
          .urgency-clock {
            display: inline-flex !important;
            grid-column: 1 !important;
            grid-row: 1 / 3 !important;
            align-self: center !important;
          }
          /* Hide the small rose dot on mobile (clock replaces it) */
          .urgency-row > div > span:nth-of-type(2) {
            display: none !important;
          }
          /* Countdown text — column 2, row 1 */
          .urgency-row > div > span:nth-of-type(3) {
            grid-column: 2 !important;
            grid-row: 1 !important;
            font-size: 14.5px !important;
            text-align: left !important;
            font-weight: 600 !important;
            color: #FB7185 !important;
          }
          /* Hide middle dot separator */
          .urgency-row > div > span:nth-of-type(4) {
            display: none !important;
          }
          /* Secondary text — column 2, row 2 */
          .urgency-row > div > span:nth-of-type(5) {
            grid-column: 2 !important;
            grid-row: 2 !important;
            font-size: 12.5px !important;
            text-align: left !important;
            color: rgba(245,247,250,0.6) !important;
            line-height: 1.4 !important;
            margin-top: 3px !important;
          }
          /* Chevron — column 3, spans rows */
          .urgency-row > div > svg {
            grid-column: 3 !important;
            grid-row: 1 / 3 !important;
            align-self: center !important;
            width: 18px !important;
            height: 18px !important;
            color: rgba(245,247,250,0.5) !important;
          }

          /* ─── SORT ROW — loose pills, no track/rail ─── */
          .sort-row {
            flex-wrap: nowrap !important;
            justify-content: flex-start !important;
            margin-bottom: 12px !important;
            margin-left: -4px !important;
            margin-right: -4px !important;
          }
          .sort-segment {
            display: flex !important;
            flex-wrap: nowrap !important;
            gap: 8px !important;
            overflow-x: auto !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 2px 4px 6px !important;
            border-radius: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            scrollbar-width: none !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .sort-segment > button {
            flex-shrink: 0 !important;
            font-size: 12.5px !important;
            padding: 9px 14px !important;
          }
          .sort-segment .sort-btn:not(.sort-btn-active) {
            background: rgba(255,255,255,0.05) !important;
            box-shadow: none !important;
          }

          /* ─── PROPERTY GRID — single column, edge-to-edge ─── */
          .property-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          /* ─── ADD MODAL — mobile padding ─── */
          .add-modal {
            padding: 20px 16px 100px !important;
          }

          /* ─── BUDGET 2-COL — stack with proper spacing ─── */
          .budget-2col,
          .budget-visual {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            padding: 24px 20px !important;
          }
          .budget-visual { gap: 28px !important; }

          /* ─── TIMELINE — compact rows ─── */
          .timeline-row {
            grid-template-columns: 84px 18px 1fr !important;
            gap: 10px !important;
          }
          .timeline-row > div:first-child > div:first-child { font-size: 11.5px !important; }
          .timeline-row > div:nth-child(3) { padding: 12px 14px !important; }
          .timeline-row > div:nth-child(3) > div:first-child { font-size: 14px !important; }
          .timeline-row > div:nth-child(3) > div:last-child { font-size: 12.5px !important; }

          /* ─── BENEFIT STRIP — clean 2x2 grid ─── */
          .benefit-strip {
            grid-template-columns: 1fr 1fr !important;
            gap: 4px !important;
            padding: 12px !important;
            margin-top: 24px !important;
          }
          .benefit-strip > div {
            padding: 12px !important;
            border-left: none !important;
            border-radius: 12px !important;
          }
          .benefit-strip > div > div > div:first-child { font-size: 12px !important; }
          .benefit-strip > div > div > div:last-child { font-size: 10.5px !important; }
          .benefit-strip > button {
            grid-column: 1 / -1 !important;
            margin: 4px 0 0 !important;
            width: 100% !important;
            justify-content: center !important;
            padding: 12px !important;
          }

          /* ──────────────────────────────────────────────────────────────
             COMPREHENSIVE MOBILE POLISH — final pass before VS Code handover
             ────────────────────────────────────────────────────────────── */

          /* Budget scene headlines — disable hard <br/> on mobile so text wraps naturally.
             Marketing copy was line-broken for desktop poetry; mobile needs reflow. */
          .bgt-h br { display: none !important; }
          /* Mobile bgt-h: more breathing room than the existing 31px rule, with sane line height */
          .bgt-h {
            font-size: clamp(26px, 7vw, 32px) !important;
            line-height: 1.18 !important;
            letter-spacing: -0.025em !important;
            padding: 0 4px !important;
          }
          .bgt-sub {
            font-size: 15.5px !important;
            line-height: 1.55 !important;
            padding: 0 6px !important;
          }

          /* First budget scene clears the floating nav. Nav is fixed top:18 height:64
             on mobile → bottom edge at ~82px. Add 110px so headline doesn't sit under it. */
          #bgt-hero { padding-top: 110px !important; }

          /* Home page hero headline — make the <br/> wrappers actually do their job */
          .hero-h1 br,
          .screen-h1 br {
            /* hidden via the h1-break-desktop wrapper; leave default for safety */
          }
          /* Home page hero image — shorter on mobile so the headline isn't dwarfed */
          .hero-header { margin-top: 100px !important; }

          /* Drill-down video CTA — countdown clamp so the big 64px serif fits */
          .cta-countdown {
            font-size: clamp(40px, 12vw, 56px) !important;
          }

          /* Drill-down video CTA — minimum height on mobile (otherwise the
             stacked layout collapses too tight) */
          .cta-grid > div:first-child {
            min-height: 220px !important;
          }

          /* Footer — proper spacing for mobile, readable bottom row.
             Left+right gutters match .screen-content; bottom pad clears the
             fixed mobile-bottom-nav (~58px tall) plus iOS safe-area inset so
             the legal disclaimer is never covered. */
          footer {
            margin-top: 56px !important;
            padding-top: 32px !important;
            padding-left: 18px !important;
            padding-right: 18px !important;
            padding-bottom: max(96px, calc(64px + env(safe-area-inset-bottom))) !important;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 28px !important;
            margin-bottom: 32px !important;
            padding: 0 !important;
          }
          .footer-grid > div:first-child {
            grid-column: 1 / -1 !important;
            margin-bottom: 8px !important;
          }
          .footer-grid h4,
          .footer-grid > div > div:first-of-type {
            font-size: 12.5px !important;
            margin-bottom: 12px !important;
          }
          .footer-bottom {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 14px !important;
            padding: 22px 0 0 !important;
            border-top: 1px solid rgba(255,255,255,0.06) !important;
          }
          .footer-bottom > div {
            font-size: 11.5px !important;
            line-height: 1.5 !important;
            max-width: 100% !important;
          }

          .listing-agent-promo {
            grid-template-columns: 1fr !important;
          }
          .listing-agent-promo > div:first-child {
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.06) !important;
            flex-direction: row !important;
            gap: 16px !important;
            padding: 20px !important;
            min-width: 0 !important;
          }

          /* Drill-down HomeCTABand panels — they use cta-grid which already stacks,
             but tighten the panel padding for mobile breathing room */
          .home-cta-band-panel {
            padding: 22px 18px !important;
          }
        }

        /* ─── EXTRA SMALL MOBILE — under 380px ─── */
        @media (max-width: 380px) {
          .bgt-h { font-size: clamp(22px, 6.8vw, 28px) !important; }
          .cta-countdown { font-size: 38px !important; }
          #bgt-hero { padding-top: 100px !important; }
        }

        /* ─── SMALL MOBILE — under 380px ─── */
        @media (max-width: 380px) {
          .hero-h1, .screen-h1 { font-size: clamp(26px, 7.4vw, 32px) !important; }
          .detail-h1 { font-size: 24px !important; }
          .hero-header { margin-top: 76px !important; }
          .hero-header p { font-size: 15.5px !important; }
        }
      `}</style>

      {/* Top-down "match me" — 60-second questionnaire → ranked properties */}
      <MatchMe
        open={showMatchMe}
        onClose={() => setShowMatchMe(false)}
        properties={properties}
        onOpenProperty={(id) => { setShowMatchMe(false); handleOpen(id); }}
      />

      {/* Concierge nudge — appears after 3 property opens */}
      <ConciergeNudge
        onRequest={() => openReferral({ kind: "agent" })}
      />
    </div>
  );
}

// ─── TOP NAV (WEB) — same items as the mobile BottomNav, just up top ─────
function BenefitItem({ icon: Icon, title, sub, first }) {
  return (
    <div style={{
      padding: "0 24px",
      borderLeft: first ? "none" : "1px solid rgba(255,255,255,0.055)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <Icon size={20} strokeWidth={1.6} color="rgba(245,247,250,0.75)" />
      <div>
        <div style={{ color: "#F5F7FA", fontSize: 13, fontWeight: 600, letterSpacing: -0.05, lineHeight: 1.25 }}>
          {title}
        </div>
        <div style={{ color: "rgba(245,247,250,0.45)", fontSize: 11.5, marginTop: 2, letterSpacing: -0.05 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

// Full-width hero background — spans the page, not just the centered content column
const heroBgBleed = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  width: "100%",
  pointerEvents: "none",
  zIndex: 0,
  overflow: "hidden",
};

// Shared hero background — same topographic atmosphere on every screen
function ScreenHeroBg({ height = 580 }) {
  return (
    <div className="hero-bg-bleed" style={{ ...heroBgBleed, height }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: 'url("/the_bricks.png")',
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        opacity: 0.68,
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 120,
        background: "linear-gradient(to bottom, rgba(5,7,10,0.55), transparent)",
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

// Shared rose-glass eyebrow — used on every screen
function Eyebrow({ children, style }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      padding: "7px 16px", borderRadius: 999,
      background: "linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(244,63,94,0.04) 100%)",
      boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(244,63,94,0.22) inset, 0 8px 32px -8px rgba(244,63,94,0.30)",
      fontSize: 11, fontWeight: 600, letterSpacing: 0.20, textTransform: "uppercase",
      color: "#FECDD3",
      ...style,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: "#F43F5E",
        boxShadow: "0 0 10px rgba(244,63,94,0.8), 0 0 18px rgba(244,63,94,0.4)",
      }} />
      {children}
    </div>
  );
}

// Shared serif H1 with italic gradient accent on the highlighted word/phrase
function ScreenH1({ children, accent, fontSize = 64 }) {
  return (
    <h1 className="screen-h1" style={{
      margin: 0,
      fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
      fontSize, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1.04,
      color: "#F5F7FA",
      maxWidth: 1100,
    }}>
      {children}
      {accent && (
        <>
          {" "}
          <span style={{
            fontStyle: "italic",
            fontWeight: 500,
            background: "linear-gradient(90deg, #FDE2E8 0%, #FB7185 48%, #FB923C 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            display: "inline-block",
            lineHeight: 1.16,
            paddingBottom: "0.12em",
          }}>{accent}</span>
        </>
      )}
    </h1>
  );
}

function MobileBottomNav({ active, onTab, wishlistCount = 0 }) {
  return (
    <>
    {/* Self-contained — same reasoning as TopNav: AppInner's global <style>
        block isn't mounted on early-return routes (methodology/leaderboard). */}
    <style>{`
      @media (max-width: 720px) {
        .mobile-bottom-nav { display: flex !important; }
      }
    `}</style>
    <div className="mobile-bottom-nav" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      display: "none",
      padding: "0 10px max(4px, env(safe-area-inset-bottom))",
      pointerEvents: "none",
      justifyContent: "stretch",
    }}>
      <div className="mobile-bottom-nav-inner" style={{
        pointerEvents: "auto",
        width: "100%",
        background: "rgba(10,12,16,0.92)",
        backdropFilter: "blur(20px) saturate(180%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 -12px 40px -12px rgba(0,0,0,0.65)",
        display: "flex", alignItems: "stretch", justifyContent: "space-around",
        padding: "6px 4px 8px",
      }}>
        <MobileNavTab active={active === "browse"} onClick={() => onTab("browse")} Icon={Search} label="Research" />
        <MobileNavTab active={active === "saved"} onClick={() => onTab("saved")} Icon={Bookmark} label="Shortlist" badge={wishlistCount} />
        <MobileNavTab active={active === "map"} onClick={() => onTab("map")} Icon={MapIcon} label="Map" />
      </div>
    </div>
    </>
  );
}

function MobileNavTab({ active, onClick, Icon, label, badge }) {
  return (
    <button onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "6px 10px",
        borderRadius: 12,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        color: active ? "#FECDD3" : "rgba(245,247,250,0.5)",
        position: "relative",
        whiteSpace: "nowrap",
        flex: 1,
        minWidth: 0,
      }}>
      <Icon size={18} strokeWidth={active ? 2.2 : 1.9}
        fill={active && label === "Shortlist" ? "#FB7185" : "none"}
        color={active ? "#FB7185" : "currentColor"} />
      <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, letterSpacing: -0.01 }}>{label}</span>
      {active && (
        <span style={{
          position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)",
          width: 20, height: 2, borderRadius: 99, background: "#FB7185",
        }} />
      )}
      {badge > 0 && (
        <span style={{
          background: "#FB7185", color: "#0B0D12",
          fontSize: 9, fontWeight: 800,
          padding: "1px 5px", borderRadius: 999,
          minWidth: 14, textAlign: "center",
        }}>{badge}</span>
      )}
    </button>
  );
}

function MobileMenu({ open, onClose, onTab, wishlistCount = 0 }) {
  const items = [
    { id: "browse", label: "Research properties", sub: "Ranked listings with 30-year cashflow", Icon: Search },
    { id: "goals", label: "Your goals", sub: "Watch life milestones land on the 30-year map", Icon: Target },
    { id: "leaderboard", label: "Agency leaderboard", sub: "Suburb rankings · screenshot & share", Icon: Trophy },
    { id: "map", label: "Property map", sub: "Suburb scores · tap markers to compare", Icon: MapIcon },
    { id: "saved", label: "Your shortlist", sub: wishlistCount > 0 ? `${wishlistCount} saved for later` : "Bookmark properties to compare", Icon: Bookmark, badge: wishlistCount },
    { id: "budget", label: "2026 tax & property rules", sub: "Negative gearing changes explained", Icon: FileText },
    { id: "settings", label: "Settings", sub: "Tax bracket, loan rate & assumptions", Icon: Settings },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="menu-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 80,
              background: "rgba(3,5,8,0.72)", backdropFilter: "blur(8px)",
            }}
          />
          <motion.div
            key="menu-panel"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mobile-menu-panel"
            style={{
              position: "fixed", top: 12, left: 12, right: 12, zIndex: 90,
              background: "linear-gradient(180deg, #12151C 0%, #0A0D12 100%)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 20,
              boxShadow: "0 24px 80px -20px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.06) inset",
              padding: "16px 14px 14px",
              maxHeight: "min(78vh, 520px)",
              overflowY: "auto",
            }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 14, padding: "0 4px",
            }}>
              <div style={{ color: "#F5F7FA", fontSize: 15, fontWeight: 700, letterSpacing: -0.03 }}>
                Menu
              </div>
              <button onClick={onClose} aria-label="Close menu"
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#F5F7FA", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map(({ id, label, sub, Icon, badge }) => (
                <button key={id}
                  onClick={() => { onTab(id); onClose(); }}
                  style={{
                    cursor: "pointer", border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 14, padding: "12px 14px",
                    display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                  }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: "rgba(244,63,94,0.10)",
                    border: "1px solid rgba(244,63,94,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={18} strokeWidth={2} color="#FB7185" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#F5F7FA", fontSize: 14, fontWeight: 600, letterSpacing: -0.02 }}>
                      {label}
                      {badge > 0 && (
                        <span style={{
                          marginLeft: 8, background: "#FB7185", color: "#0B0D12",
                          fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
                        }}>{badge}</span>
                      )}
                    </div>
                    <div style={{ color: "rgba(245,247,250,0.45)", fontSize: 11.5, marginTop: 2, lineHeight: 1.35 }}>
                      {sub}
                    </div>
                  </div>
                  <ChevronRight size={16} color="rgba(245,247,250,0.35)" strokeWidth={2} />
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TopNav({ active, onTab, onMenuToggle, onMatchMe, wishlistCount = 0 }) {
  return (
    <>
    {/* Self-contained responsive rules. We can't rely on the global <style>
        block in AppInner because TopNav also renders on early-return routes
        (methodology, leaderboard, report-new) where that block isn't mounted. */}
    <style>{`
      .top-nav-mobile-match,
      .top-nav-mobile-menu { display: none !important; }
      @media (max-width: 980px) {
        .top-nav-match span:not(.top-nav-mobile-match-label) { display: none !important; }
        .top-nav-match { padding: 11px 13px !important; }
      }
      @media (max-width: 720px) {
        .top-nav-shell { top: 0 !important; padding: 0 !important; }
        .top-nav {
          height: 56px !important; max-width: 100% !important; width: 100% !important;
          border-radius: 0 !important; padding: 0 10px 0 12px !important; gap: 8px !important;
          background: rgba(10,12,16,0.94) !important;
          border: none !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }
        .top-nav-tabs, .top-nav-spacer { display: none !important; }
        .top-nav-mobile-match,
        .top-nav-mobile-menu { display: inline-flex !important; }
        .top-nav-match { display: none !important; }
        .top-nav-brand { flex: 1 !important; min-width: 0 !important;
          justify-content: flex-start !important; margin-right: 6px !important; }
        .top-nav-logo { height: 22px !important; max-width: 108px !important;
          object-fit: contain !important; }
        .top-nav-mobile-match { margin-left: auto !important; }
      }
    `}</style>
    <div className="top-nav-shell" style={{
      position: "fixed", top: 18, left: 0, right: 0, zIndex: 50,
      display: "flex", justifyContent: "center",
      pointerEvents: "none",
      padding: "0 24px",
    }}>
      <div className="top-nav" style={{
        pointerEvents: "auto",
        width: "100%", maxWidth: 1240,
        background: "rgba(10,12,16,0.72)",
        backdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 80px -38px rgba(0,0,0,0.85)",
        height: 68, borderRadius: 20,
        display: "flex", alignItems: "center",
        padding: "0 14px 0 26px",
      }}>
        <button
          onClick={() => onTab("browse")}
          className="top-nav-brand"
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            display: "inline-flex", alignItems: "center",
            flex: 1,
          }}>
          <img src="/logo.png" alt="The Bricks" className="top-nav-logo"
            style={{ height: 30, width: "auto", display: "block" }} />
        </button>

        {/* DESKTOP: centered tab cluster */}
        <div className="top-nav-tabs" style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <TopTab active={active === "browse"} onClick={() => onTab("browse")} Icon={Search} label="Research" />
          <TopTab active={active === "map"} onClick={() => onTab("map")} Icon={MapIcon} label="Map" />
          <TopTab active={active === "leaderboard"} onClick={() => onTab("leaderboard")} Icon={Trophy} label="Leaderboard" />
          <TopTab active={active === "goals"} onClick={() => onTab("goals")} Icon={Target} label="Goals" />
          <TopTab active={active === "saved"} onClick={() => onTab("saved")} Icon={Bookmark} label="Shortlist" badge={wishlistCount} />
        </div>

        {/* DESKTOP: right side — Match Me primary CTA */}
        <div className="top-nav-spacer" style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => onMatchMe?.()}
            className="top-nav-match"
            style={{
              cursor: "pointer",
              background: "linear-gradient(135deg, rgba(244,63,94,0.14) 0%, rgba(244,63,94,0.05) 100%)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(244,63,94,0.24) inset, 0 8px 28px -10px rgba(244,63,94,0.30)",
              color: "#FECDD3",
              border: "none",
              borderRadius: 12,
              padding: "11px 16px",
              fontSize: 13, fontWeight: 600, letterSpacing: -0.05,
              display: "inline-flex", alignItems: "center", gap: 8,
              whiteSpace: "nowrap",
            }}>
            <Sparkles size={14} strokeWidth={2} color="#FB7185" fill="#FB7185" />
            <span>Match me to a property</span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 6px",
              borderRadius: 999, background: "rgba(244,63,94,0.18)",
              color: "rgba(254,205,211,0.8)",
              letterSpacing: 0.04,
            }}>60s</span>
          </button>
        </div>

        {/* MOBILE-ONLY: Match Me mini pill — same subtle treatment */}
        <button
          onClick={() => onMatchMe?.()}
          className="top-nav-mobile-match"
          style={{
            cursor: "pointer",
            background: "linear-gradient(135deg, rgba(244,63,94,0.14) 0%, rgba(244,63,94,0.05) 100%)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(244,63,94,0.24) inset",
            color: "#FECDD3",
            border: "none",
            borderRadius: 10,
            padding: "8px 10px",
            fontSize: 11, fontWeight: 600, letterSpacing: -0.03,
            alignItems: "center", gap: 5,
            whiteSpace: "nowrap",
            flexShrink: 1, minWidth: 0,
            maxWidth: "44vw",
          }}>
          <Sparkles size={12} strokeWidth={2} color="#FB7185" fill="#FB7185" style={{ flexShrink: 0 }} />
          <span className="top-nav-mobile-match-label">Match me</span>
        </button>

        {/* MOBILE-ONLY: Menu icon — larger */}
        <button
          onClick={onMenuToggle}
          className="top-nav-mobile-menu"
          style={{
            cursor: "pointer",
            background: "rgba(255,255,255,0.04)",
            color: "#F5F7FA",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            width: 40, height: 40,
            alignItems: "center", justifyContent: "center",
            marginLeft: 6,
            flexShrink: 0,
          }}>
          <MenuIcon size={21} strokeWidth={1.9} />
        </button>
      </div>
    </div>
    </>
  );
}

function TopTab({ active, onClick, Icon, label, badge }) {
  // when this tab carries items (a non-zero badge) and isn't the current screen,
  // give it a soft rose emphasis so it reads as a live "you have N to compare" prompt
  const emphasised = badge > 0 && !active;
  return (
    <button onClick={onClick}
      style={{
        background: active
          ? "rgba(255,255,255,0.065)"
          : emphasised ? "rgba(244,63,94,0.10)" : "transparent",
        border: active
          ? "1px solid rgba(255,255,255,0.06)"
          : emphasised ? "1px solid rgba(244,63,94,0.28)" : "1px solid transparent",
        borderRadius: 12, padding: "11px 18px",
        color: active ? "#F5F7FA" : emphasised ? "#FECDD3" : "rgba(245,247,250,0.55)",
        cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 8,
        fontSize: 14, fontWeight: emphasised ? 600 : 500, letterSpacing: -0.05,
        position: "relative",
        transition: "all 0.2s",
        boxShadow: active
          ? "0 1px 0 rgba(255,255,255,0.06) inset"
          : emphasised ? "0 8px 22px -12px rgba(244,63,94,0.6)" : "none",
      }}>
      <Icon size={15} strokeWidth={emphasised ? 2.4 : 1.8}
        fill={emphasised ? "#FB7185" : "none"}
        color={emphasised ? "#FB7185" : "currentColor"} />
      <span>{label}</span>
      {badge > 0 && (
        <span style={{
          background: active ? "#F43F5E" : "#FB7185", color: "#0B0D12",
          fontSize: 9.5, fontWeight: 800,
          padding: "1px 6px", borderRadius: 999,
          minWidth: 16, textAlign: "center",
          marginLeft: 2,
        }}>{badge}</span>
      )}
    </button>
  );
}

// ─── EXTRA SEED PROPERTIES for the Browse tab ────────────────────────────────
const MORE_PROPS = [
  {
    id: 11, name: "Mascot Quarter", suburb: "Mascot, NSW", state: "NSW",
    price: 920000, yieldPct: 4.1, growthPct: 5.2, color: 4, icon: "bldg",
    type: "Apartment", build: "new", status: "considering",
    confidence: {
      growth: { score: 72, reasons: ["Sydney airport corridor jobs +4.8%", "Metro link confirmed 2029", "Tight rental market 1.4%"] },
      risk:   { score: 33, reasons: ["Strata complex 80 units", "Flight path noise overlay", "Builder iCIRT 3-star"] },
      liquid: { score: 78, reasons: ["21-day median DOM", "Sydney clearance 70%", "First-home buyer eligible"] },
    },
    comps: [{ addr: "Apt 612/15 Coward St", price: 905000, dom: 18, days: 23 }],
  },
  {
    id: 12, name: "Brunswick East Walk-up", suburb: "Brunswick East, VIC", state: "VIC",
    price: 720000, yieldPct: 4.6, growthPct: 5.9, color: 5, icon: "bldg",
    type: "Townhouse", build: "new", status: "considering",
    confidence: {
      growth: { score: 81, reasons: ["Inner Melb median +6.1% YoY", "Sydney Rd corridor", "Strong rental demand"] },
      risk:   { score: 24, reasons: ["Small strata 6 units", "Established suburb", "Heritage overlay protects supply"] },
      liquid: { score: 80, reasons: ["19-day median DOM", "Melbourne clearance 72%", "Wide buyer base"] },
    },
    comps: [{ addr: "2/89 Lygon St", price: 712000, dom: 16, days: 11 }],
  },
  {
    id: 13, name: "Mooloolaba Beach", suburb: "Mooloolaba, QLD", state: "QLD",
    price: 1120000, yieldPct: 4.4, growthPct: 7.8, color: 7, icon: "wave",
    type: "Apartment", build: "new", status: "considering",
    confidence: {
      growth: { score: 86, reasons: ["Sunshine Coast median +9.4% YoY", "Migration +18% YoY", "Coastal premium widening"] },
      risk:   { score: 31, reasons: ["Holiday rental volatility", "Cyclone insurance premium", "Cladding compliant 2024"] },
      liquid: { score: 76, reasons: ["26-day median DOM", "QLD clearance 67%", "Lifestyle buyer demand"] },
    },
    comps: [{ addr: "12/45 Mooloolaba Esp", price: 1085000, dom: 22, days: 38 }],
  },
  {
    id: 14, name: "Adelaide CBD Tower", suburb: "Adelaide, SA", state: "SA",
    price: 595000, yieldPct: 5.3, growthPct: 6.0, color: 8, icon: "bldg",
    type: "Apartment", build: "new", status: "considering",
    confidence: {
      growth: { score: 74, reasons: ["Adelaide median +7.1% YoY", "AUKUS sub jobs pipeline", "Affordable entry point"] },
      risk:   { score: 36, reasons: ["Strata 140 units (large)", "CBD oversupply risk", "Student rental dependence"] },
      liquid: { score: 68, reasons: ["29-day median DOM", "Adelaide clearance 65%", "Investor-heavy market"] },
    },
    comps: [{ addr: "1208/108 Currie St", price: 582000, dom: 25, days: 44 }],
  },
  {
    id: 15, name: "Cottesloe Coast", suburb: "Cottesloe, WA", state: "WA",
    price: 1380000, yieldPct: 3.8, growthPct: 6.5, color: 9, icon: "wave",
    type: "Townhouse", build: "new", status: "considering",
    confidence: {
      growth: { score: 83, reasons: ["Perth premium beach corridor", "Migration to WA +14%", "Limited new supply"] },
      risk:   { score: 27, reasons: ["Small strata 4 units", "Strict heritage zoning", "Higher purchase price tier"] },
      liquid: { score: 71, reasons: ["27-day median DOM", "Perth clearance 68%", "Lifestyle buyer demand"] },
    },
    comps: [{ addr: "3/12 Marine Pde", price: 1320000, dom: 24, days: 51 }],
  },
];

// ─── EXISTING properties — the budget-affected stock ────────────────────────
const EXISTING_PROPS = [
  {
    id: 21, name: "Carlton Terrace", suburb: "Carlton, VIC", state: "VIC",
    price: 845000, yieldPct: 3.9, growthPct: 4.8, color: 5, icon: "home",
    type: "Victorian terrace", build: "existing", status: "considering",
    confidence: {
      growth: { score: 73, reasons: ["Inner-Melb heritage suburb", "Median +5.2% YoY", "Strong owner-occupier demand"] },
      risk:   { score: 44, reasons: ["Pre-1987 build · no Div 40 depreciation", "Older plumbing/electrical may need work", "No NG from 1 Jul 2027"] },
      liquid: { score: 76, reasons: ["18-day median DOM", "Heritage premium", "Wide buyer pool"] },
    },
    comps: [
      { addr: "32 Drummond St", price: 832000, dom: 14, days: 22 },
      { addr: "8/14 Faraday St", price: 870000, dom: 19, days: 51 },
    ],
  },
  {
    id: 22, name: "Marrickville Cottage", suburb: "Marrickville, NSW", state: "NSW",
    price: 1180000, yieldPct: 3.4, growthPct: 5.8, color: 4, icon: "home",
    type: "Federation cottage", build: "existing", status: "considering",
    confidence: {
      growth: { score: 78, reasons: ["Inner-west gentrification", "Metro West (2032) corridor", "Median +6.1% YoY"] },
      risk:   { score: 47, reasons: ["Pre-1980 build · no depreciation benefit", "Yield very tight", "No NG post-2027"] },
      liquid: { score: 81, reasons: ["16-day median DOM", "Strong owner-occupier demand", "Premium location"] },
    },
    comps: [
      { addr: "42 Illawarra Rd", price: 1145000, dom: 18, days: 27 },
      { addr: "12 Garners Ave",  price: 1210000, dom: 22, days: 49 },
    ],
  },
  {
    id: 23, name: "Toowong Walk-up", suburb: "Toowong, QLD", state: "QLD",
    price: 525000, yieldPct: 4.8, growthPct: 6.2, color: 1, icon: "bldg",
    type: "1980s walk-up", build: "existing", status: "considering",
    confidence: {
      growth: { score: 72, reasons: ["Brisbane median +7.3% YoY", "Walking distance to UQ", "Strong rental demand"] },
      risk:   { score: 43, reasons: ["1980s build · minimal Div 43", "Older fixtures will need updating", "No NG from 2027"] },
      liquid: { score: 70, reasons: ["22-day median DOM", "Sub-$600k investor band", "Student + first-home overlap"] },
    },
    comps: [
      { addr: "8/45 Sherwood Rd", price: 512000, dom: 19, days: 28 },
    ],
  },
  {
    id: 24, name: "Glenelg Beachside", suburb: "Glenelg, SA", state: "SA",
    price: 685000, yieldPct: 4.2, growthPct: 5.4, color: 8, icon: "wave",
    type: "1990s apartment", build: "existing", status: "considering",
    confidence: {
      growth: { score: 70, reasons: ["Coastal corridor appeal", "Adelaide migration +9%", "Lifestyle premium"] },
      risk:   { score: 41, reasons: ["1990s build · limited Div 40 remaining", "Strata 24 units", "No NG post-2027"] },
      liquid: { score: 67, reasons: ["23-day median DOM", "Lifestyle demand pool", "Moderate investor competition"] },
    },
    comps: [
      { addr: "4/12 Moseley Sq", price: 678000, dom: 21, days: 34 },
    ],
  },
];

// ─── Eastern Sydney public listings — populates the map for the demo pitch ───
// These show on Research + Map (Belle Property / Ray White heartland).
const EASTERN_PROPS = [
  {
    id: 31, name: "Bondi Beach Penthouse", suburb: "Bondi Beach, NSW", state: "NSW",
    price: 2450000, yieldPct: 3.6, growthPct: 6.4, color: 5, icon: "wave",
    type: "Apartment", build: "new", status: "considering",
    agent: DEMO_AGENT, agentLive: true,
    confidence: {
      growth: { score: 84, reasons: ["Eastern Sydney median +7.8% YoY", "Beachfront premium widening", "Limited new supply"] },
      risk:   { score: 30, reasons: ["High-tier price exposure", "Salt-air maintenance", "Strata 12 units"] },
      liquid: { score: 82, reasons: ["14-day median DOM", "Sydney clearance 73%", "Lifestyle buyer demand"] },
    },
    comps: [{ addr: "Penthouse/1 Notts Ave", price: 2420000, dom: 16, days: 11 }],
  },
  {
    id: 32, name: "Bronte Garden Apartment", suburb: "Bronte, NSW", state: "NSW",
    price: 1680000, yieldPct: 3.4, growthPct: 5.8, color: 7, icon: "wave",
    type: "Apartment", build: "existing", status: "considering",
    agent: DEMO_AGENT, agentLive: true,
    confidence: {
      growth: { score: 76, reasons: ["Beachside owner-occupier suburb", "Median +6.4% YoY", "Coogee–Bronte coastal walk premium"] },
      risk:   { score: 42, reasons: ["1980s build · limited Div 40", "No NG post-2027", "Established stock"] },
      liquid: { score: 78, reasons: ["19-day median DOM", "Strong owner-occupier demand", "Compact strata"] },
    },
    comps: [{ addr: "5/118 Bronte Rd", price: 1640000, dom: 17, days: 33 }],
  },
  {
    id: 33, name: "Coogee Sea Terrace", suburb: "Coogee, NSW", state: "NSW",
    price: 1920000, yieldPct: 3.9, growthPct: 6.0, color: 4, icon: "wave",
    type: "Townhouse", build: "new", status: "considering",
    agent: DEMO_AGENT, agentLive: true,
    confidence: {
      growth: { score: 80, reasons: ["Coogee median +7.1% YoY", "Beachside lifestyle premium", "UNSW rental floor"] },
      risk:   { score: 31, reasons: ["Strata 4 units", "Coastal exposure", "Builder iCIRT 4-star"] },
      liquid: { score: 76, reasons: ["18-day median DOM", "Sydney clearance 73%", "Wide buyer pool"] },
    },
    comps: [{ addr: "2/14 Beach St", price: 1880000, dom: 19, days: 22 }],
  },
  {
    id: 34, name: "Paddington Terrace", suburb: "Paddington, NSW", state: "NSW",
    price: 2150000, yieldPct: 3.0, growthPct: 5.4, color: 9, icon: "home",
    type: "Victorian terrace", build: "existing", status: "considering",
    agent: DEMO_AGENT, agentLive: true,
    confidence: {
      growth: { score: 75, reasons: ["Heritage protected supply", "Median +5.8% YoY", "Walking-distance to CBD"] },
      risk:   { score: 48, reasons: ["Pre-1900 build · no depreciation", "Yield very tight", "No NG post-2027"] },
      liquid: { score: 80, reasons: ["16-day median DOM", "Owner-occupier dominant", "Premium heritage stock"] },
    },
    comps: [{ addr: "212 Oxford St", price: 2080000, dom: 21, days: 41 }],
  },
  {
    id: 35, name: "Maroubra Family New Build", suburb: "Maroubra, NSW", state: "NSW",
    price: 1490000, yieldPct: 4.2, growthPct: 6.2, color: 4, icon: "wave",
    type: "Townhouse", build: "new", status: "considering",
    confidence: {
      growth: { score: 78, reasons: ["Maroubra median +6.7% YoY", "Beachside lifestyle premium", "Light Rail extension corridor"] },
      risk:   { score: 30, reasons: ["Strata 6 units", "Builder iCIRT 4-star", "Coastal exposure"] },
      liquid: { score: 79, reasons: ["20-day median DOM", "Family + investor overlap", "Scarce new builds"] },
    },
    comps: [{ addr: "3/12 Marine Pde", price: 1465000, dom: 18, days: 24 }],
  },
  {
    id: 36, name: "Randwick Investor Apartment", suburb: "Randwick, NSW", state: "NSW",
    price: 1080000, yieldPct: 4.6, growthPct: 5.7, color: 7, icon: "bldg",
    type: "Apartment", build: "new", status: "considering",
    confidence: {
      growth: { score: 80, reasons: ["UNSW + hospital tenant pool", "Light rail terminus", "Strong rental yields"] },
      risk:   { score: 32, reasons: ["Strata 28 units", "Student rental cycles", "Builder iCIRT 4-star"] },
      liquid: { score: 82, reasons: ["15-day median DOM", "Yield buyer demand", "Sub-$1.1M entry"] },
    },
    comps: [{ addr: "12/45 Belmore Rd", price: 1055000, dom: 13, days: 18 }],
  },
  {
    id: 37, name: "Clovelly Beach Cottage", suburb: "Clovelly, NSW", state: "NSW",
    price: 2680000, yieldPct: 2.8, growthPct: 5.6, color: 5, icon: "wave",
    type: "Federation cottage", build: "existing", status: "considering",
    confidence: {
      growth: { score: 76, reasons: ["Coastal walk premium", "Median +6.0% YoY", "Tightly held suburb"] },
      risk:   { score: 49, reasons: ["1920s build · limited Div 40", "Yield very tight", "No NG post-2027"] },
      liquid: { score: 75, reasons: ["18-day median DOM", "Owner-occupier dominant", "Premium beachside"] },
    },
    comps: [{ addr: "8 Eastbourne Ave", price: 2620000, dom: 22, days: 38 }],
  },
  {
    id: 38, name: "Woollahra Garden Terrace", suburb: "Woollahra, NSW", state: "NSW",
    price: 3100000, yieldPct: 2.6, growthPct: 5.2, color: 9, icon: "home",
    type: "Victorian terrace", build: "existing", status: "considering",
    confidence: {
      growth: { score: 77, reasons: ["Boutique village strip", "Heritage protected supply", "Owner-occupier dominant"] },
      risk:   { score: 50, reasons: ["Pre-1900 build · no depreciation", "Top tier price band", "No NG post-2027"] },
      liquid: { score: 73, reasons: ["24-day median DOM", "Trophy heritage stock", "Wide price range comps"] },
    },
    comps: [{ addr: "62 Queen St", price: 2980000, dom: 26, days: 45 }],
  },
  {
    id: 39, name: "Bellevue Hill Harbour View", suburb: "Bellevue Hill, NSW", state: "NSW",
    price: 4100000, yieldPct: 2.4, growthPct: 5.4, color: 4, icon: "wave",
    type: "Apartment", build: "existing", status: "considering",
    confidence: {
      growth: { score: 74, reasons: ["Trophy harbourside corridor", "Median +5.4% YoY", "Owner-occupier dominant"] },
      risk:   { score: 52, reasons: ["1990s strata · limited Div 40", "Top tier price band", "No NG post-2027"] },
      liquid: { score: 70, reasons: ["28-day median DOM", "International buyer interest", "Niche price band"] },
    },
    comps: [{ addr: "5/22 Victoria Rd", price: 3960000, dom: 31, days: 52 }],
  },
  {
    id: 40, name: "Tamarama Glass House", suburb: "Tamarama, NSW", state: "NSW",
    price: 3450000, yieldPct: 3.2, growthPct: 6.8, color: 7, icon: "wave",
    type: "House", build: "new", status: "considering",
    confidence: {
      growth: { score: 86, reasons: ["Tightly held coastal pocket", "Median +8.2% YoY", "Near-zero new supply"] },
      risk:   { score: 34, reasons: ["Coastal exposure", "Builder iCIRT 5-star", "Architectural single dwelling"] },
      liquid: { score: 72, reasons: ["27-day median DOM", "Trophy buyer pool", "Limited comp set"] },
    },
    comps: [{ addr: "14 Kenneth St", price: 3300000, dom: 28, days: 14 }],
  },
  {
    id: 41, name: "Bondi Junction Tower", suburb: "Bondi Junction, NSW", state: "NSW",
    price: 1240000, yieldPct: 4.4, growthPct: 5.8, color: 5, icon: "bldg",
    type: "Apartment", build: "new", status: "considering",
    confidence: {
      growth: { score: 78, reasons: ["Westfield retail corridor", "Median +6.4% YoY", "Train + bus interchange"] },
      risk:   { score: 33, reasons: ["Strata 96 units", "CBD-style oversupply caps", "Builder iCIRT 4-star"] },
      liquid: { score: 80, reasons: ["17-day median DOM", "Yield + lifestyle overlap", "Investor + downsizer pool"] },
    },
    comps: [{ addr: "1408/2 Spring St", price: 1210000, dom: 16, days: 21 }],
  },
  {
    id: 42, name: "Kingsford Walk-up", suburb: "Kingsford, NSW", state: "NSW",
    price: 815000, yieldPct: 5.1, growthPct: 5.4, color: 8, icon: "bldg",
    type: "1980s walk-up", build: "existing", status: "considering",
    confidence: {
      growth: { score: 70, reasons: ["UNSW corridor demand", "Light rail terminus", "Median +5.0% YoY"] },
      risk:   { score: 47, reasons: ["1980s build · minimal Div 43", "Strata 32 units", "No NG post-2027"] },
      liquid: { score: 76, reasons: ["19-day median DOM", "Sub-$900k investor band", "Strong yield"] },
    },
    comps: [{ addr: "4/22 Strachan St", price: 798000, dom: 17, days: 31 }],
  },
  {
    id: 43, name: "Queens Park Family Home", suburb: "Queens Park, NSW", state: "NSW",
    price: 2890000, yieldPct: 2.9, growthPct: 6.0, color: 4, icon: "home",
    type: "Family house", build: "existing", status: "considering",
    confidence: {
      growth: { score: 80, reasons: ["Park-fronting blue-chip pocket", "Tightly held school catchment", "Median +6.4% YoY"] },
      risk:   { score: 46, reasons: ["1900s build · limited Div 40", "Yield very tight", "No NG post-2027"] },
      liquid: { score: 74, reasons: ["22-day median DOM", "Owner-occupier dominant", "Family buyer pool"] },
    },
    comps: [{ addr: "18 York Rd", price: 2780000, dom: 25, days: 27 }],
  },
];

// ─── Aisha's private preview — agent-fed stock, not on public Research ────────
// Only shown on the AgentPreviewScreen. Detail page picks up agentPreview === true
// to swap the listing agent block, modeled banner, and bottom CTA.
const AGENT_PREVIEW_PROPS = [
  {
    id: 51, name: "Vaucluse Family Home", suburb: "Vaucluse, NSW", state: "NSW",
    price: 6450000, yieldPct: 2.6, growthPct: 5.6, color: 4, icon: "home",
    type: "Family house", build: "existing", status: "considering",
    source: "agent-preview", agentPreview: true, agent: DEMO_AGENT,
    confidence: {
      growth: { score: 82, reasons: ["Trophy harbourside corridor", "Median +6.4% YoY", "Owner-occupier dominant"] },
      risk:   { score: 46, reasons: ["Top tier price band", "Established stock · no NG post-2027", "Long DOM at this price"] },
      liquid: { score: 64, reasons: ["38-day median DOM at $6M+", "Niche buyer pool", "International buyer interest"] },
    },
    comps: [{ addr: "21 Wentworth Rd", price: 6280000, dom: 41, days: 18 }],
  },
  {
    id: 52, name: "Double Bay Garden Apartment", suburb: "Double Bay, NSW", state: "NSW",
    price: 2280000, yieldPct: 3.1, growthPct: 5.4, color: 5, icon: "bldg",
    type: "Apartment", build: "existing", status: "considering",
    source: "agent-preview", agentPreview: true, agent: DEMO_AGENT,
    confidence: {
      growth: { score: 76, reasons: ["Boutique village strip", "Owner-occupier turnover low", "Median +5.6% YoY"] },
      risk:   { score: 44, reasons: ["1990s strata 18 units", "No NG post-2027", "Limited Div 40"] },
      liquid: { score: 74, reasons: ["22-day median DOM", "Strong downsizer demand", "Premium parking included"] },
    },
    comps: [{ addr: "5/24 William St", price: 2210000, dom: 24, days: 29 }],
  },
  {
    id: 53, name: "Rose Bay New Build", suburb: "Rose Bay, NSW", state: "NSW",
    price: 3120000, yieldPct: 3.2, growthPct: 5.9, color: 7, icon: "wave",
    type: "Apartment", build: "new", status: "considering",
    source: "agent-preview", agentPreview: true, agent: DEMO_AGENT,
    confidence: {
      growth: { score: 81, reasons: ["Harbour outlook premium", "Eastern Suburbs median +7.0% YoY", "Limited new supply"] },
      risk:   { score: 33, reasons: ["Top-tier price band", "Builder iCIRT 4-star", "Strata 14 units"] },
      liquid: { score: 73, reasons: ["26-day median DOM", "Downsizer + investor overlap", "Lift + parking"] },
    },
    comps: [{ addr: "3/61 New South Head Rd", price: 3080000, dom: 28, days: 14 }],
  },
];

export const ALL_PROPS = [...SEED_PROPS, ...MORE_PROPS, ...EXISTING_PROPS, ...EASTERN_PROPS, ...AGENT_PREVIEW_PROPS, ...CATHERINE_PROPS];

// ─── BROWSE SCREEN — the searchable database ─────────────────────────────────
function CountdownInline() {
  const { days, hours, mins } = useCountdown();
  return <><strong style={{ color: "#F87171", fontWeight: 600 }}>{days}d {String(hours).padStart(2,"0")}h {String(mins).padStart(2,"0")}m</strong> until 1 Jul 2027</>;
}

function CountdownCard({ onOpen }) {
  const { days, hours, mins, secs } = useCountdown();
  const pad = (n) => String(n).padStart(2, "0");
  // Days remaining as fraction (deadline is ~1 Jul 2027; start point ~12 May 2026 = 415 days)
  const totalDays = 415;
  const pct = Math.max(0, Math.min(1, days / totalDays));
  const dash = 2 * Math.PI * 46;
  const dashOffset = dash * (1 - pct);

  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onOpen}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{
        width: "100%",
        background: "linear-gradient(135deg, rgba(244,63,94,0.20) 0%, rgba(244,63,94,0.04) 100%)",
        border: "1px solid rgba(244,63,94,0.36)",
        borderRadius: 16, padding: "16px 14px", marginBottom: 4,
        cursor: "pointer", textAlign: "left",
        position: "relative", overflow: "hidden",
      }}>
      {/* Subtle background pulse */}
      <motion.div
        animate={{ opacity: [0.0, 0.08, 0.0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(circle at 30% 50%, rgba(244,63,94,0.45), transparent 60%)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
        {/* The ring + days graphic */}
        <div style={{ position: "relative", flexShrink: 0, width: 104, height: 104 }}>
          <svg width="104" height="104" viewBox="0 0 104 104" style={{ transform: "rotate(-90deg)" }}>
            {/* Track */}
            <circle cx="52" cy="52" r="46"
              fill="none" stroke="rgba(244,63,94,0.18)" strokeWidth="6"
            />
            {/* Progress */}
            <motion.circle cx="52" cy="52" r="46"
              fill="none" stroke="#F43F5E" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={dash}
              initial={{ strokeDashoffset: dash }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Subtle pulsing outer halo */}
            <motion.circle cx="52" cy="52" r="50" fill="none" stroke="#F43F5E"
              animate={{ opacity: [0.3, 0.0, 0.3], strokeWidth: [1.5, 0.6, 1.5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
          {/* Centred days number */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <motion.div
              key={days}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                color: "#F5F7FA", fontSize: 32, fontWeight: 900, lineHeight: 1,
                letterSpacing: "-0.05em",
                fontFamily: "-apple-system, ui-monospace, SF Mono, monospace",
              }}>{days}</motion.div>
            <div style={{ color: "#F87171", fontSize: 9, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 3 }}>
              days left
            </div>
          </div>
        </div>

        {/* Copy */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#F43F5E", fontSize: 9, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4 }}>
            ⚡ 2026 Budget
          </div>
          <div style={{ color: "#F5F7FA", fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 6 }}>
            Negative gearing dies for existing properties.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#C5CAD6", marginBottom: 6, fontFamily: "ui-monospace, SF Mono, monospace" }}>
            <span style={{ color: "#F87171", fontWeight: 700 }}>{pad(hours)}h</span>
            <span style={{ color: "#5C6477" }}>:</span>
            <span style={{ color: "#F87171", fontWeight: 700 }}>{pad(mins)}m</span>
            <span style={{ color: "#5C6477" }}>:</span>
            <motion.span
              key={secs}
              initial={{ opacity: 0.5, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              style={{ color: "#F87171", fontWeight: 700, minWidth: 22, display: "inline-block" }}
            >{pad(secs)}s</motion.span>
            <span style={{ color: "#5C6477", marginLeft: 4 }}>· 1 Jul 2027</span>
          </div>
          <div style={{ color: "#F43F5E", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
            See what this means for me <ArrowRight size={11} strokeWidth={2.8} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// What is negative gearing? — visceral plain-English explainer with visual diff
function NegativeGearingExplainer({ sampleProperty }) {
  const cfNew = useMemo(() => generateCashflow({ ...sampleProperty, build: "new" }), [sampleProperty]);
  const cfExisting = useMemo(() => generateCashflow({ ...sampleProperty, build: "existing" }), [sampleProperty]);
  const diff = cfNew.reduce((s,x)=>s+x,0) - cfExisting.reduce((s,x)=>s+x,0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
      style={{
        background: "#15171F",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 14, padding: 14, marginBottom: 12,
      }}>
      <div style={{ color: "#F5F7FA", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 4 }}>
        What is negative gearing?
      </div>
      <div style={{ color: "#C5CAD6", fontSize: 11.5, lineHeight: 1.55, marginBottom: 12 }}>
        It's the tax refund landlords get when a rental property costs more than it earns. The government gives back ~39% of the loss. <span style={{ color: "#F43F5E", fontWeight: 700 }}>From 1 Jul 2027 — only new builds keep this.</span>
      </div>

      {/* Mini side-by-side — same property, two outcomes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
            <CheckCircle2 size={11} color="#22C55E" strokeWidth={3} />
            <span style={{ color: "#22C55E", fontSize: 10, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase" }}>If new build</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <CashflowGrid cashflow={cfNew} cols={30} rows={6} cell={3.5} gap={1} animate={false} />
          </div>
          <div style={{ color: "#22C55E", fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 6, textAlign: "center" }}>
            Tax shelter for life
          </div>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
            <X size={11} color="#F43F5E" strokeWidth={3.5} />
            <span style={{ color: "#F43F5E", fontSize: 10, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase" }}>If existing</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <CashflowGrid cashflow={cfExisting} cols={30} rows={6} cell={3.5} gap={1} animate={false} />
          </div>
          <div style={{ color: "#F43F5E", fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 6, textAlign: "center" }}>
            –{fmt(diff)} lifetime
          </div>
        </div>
      </div>

      <div style={{ color: "#5C6477", fontSize: 10, textAlign: "center", marginTop: 4, fontStyle: "italic" }}>
        Same $750k property, 30-year interest-only loan — two budget outcomes.
      </div>
    </motion.div>
  );
}

// ─── Home-page referral band — full interactive what-if, like the drill-down ─
function HomeCTABand({ exampleProperty }) {
  const { openReferral } = useReferral();
  // Build the cashflow config the WhatIfCard model expects, from the example
  // property. Same shape generateCashflow takes on the drill-down.
  const baseConfig = useMemo(() => {
    if (!exampleProperty) return null;
    const p = exampleProperty;
    return {
      price: p.price,
      yieldPct: p.yieldPct ?? ((p.rentPerWeek ? p.rentPerWeek * 52 : p.price * 0.04) / p.price * 100),
      growthPct: p.growthPct ?? 5,
      rate: MODEL_DEFAULTS.rate,
      deposit: MODEL_DEFAULTS.deposit,
      marginalRate: p.marginalRate ?? 0.39,
      build: p.build ?? "new",
      state: p.state ?? "NSW",
      loanType: MODEL_DEFAULTS.loanType,
      type: p.type,
    };
  }, [exampleProperty]);

  if (!baseConfig) return null;

  return (
    <div style={{ marginTop: 40 }}>
      {/* — BUYER'S AGENT — */}
      <div className="home-cta-band-panel" style={{
        background: "linear-gradient(165deg, rgba(244,63,94,0.13), rgba(251,146,60,0.035))",
        border: "1px solid rgba(251,113,133,0.24)",
        borderRadius: 22, padding: "26px 24px",
      }}>
        <div className="cta-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, alignItems: "center",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: "rgba(244,63,94,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Users size={16} color="#FB7185" strokeWidth={2} />
              </div>
              <div style={{
                fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase",
                color: "#FB7185", fontWeight: 600,
              }}>Buyer's agent</div>
            </div>
            <div style={{
              fontFamily: 'ui-serif, Georgia, serif', fontSize: 25, fontWeight: 500,
              color: "#F5F7FA", letterSpacing: "-0.025em", lineHeight: 1.16, marginBottom: 9,
            }}>
              Even a small win pulls years off — and adds real money.
            </div>
            <p style={{
              fontSize: 13.5, lineHeight: 1.5, color: "rgba(245,247,250,0.65)", margin: "0 0 18px",
            }}>
              A buyer's agent negotiates price and reaches off-market stock.
              Try it on {exampleProperty.name} — tap a what-if.
            </p>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => openReferral({
                kind: "agent", property: exampleProperty,
                context: { source: "home-agent-cta" },
              })}
              style={{
                cursor: "pointer", border: "none",
                background: "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)",
                color: "#FFFFFF", borderRadius: 13, padding: "14px 24px",
                fontSize: 14.5, fontWeight: 600, letterSpacing: -0.02,
                display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset, 0 14px 34px -14px rgba(244,63,94,0.85)",
              }}>
              Match me with an agent — free
              <ArrowRight size={16} strokeWidth={2.4} />
            </motion.button>
          </div>
          <div style={{
            background: "rgba(0,0,0,0.32)", borderRadius: 15,
            border: "1px solid rgba(255,255,255,0.08)", padding: "16px 15px",
          }}>
            <div style={{ fontSize: 11.5, color: "#F5F7FA", fontWeight: 600, marginBottom: 11 }}>
              What a better buy would do →
            </div>
            <WhatIfCard
              baseConfig={baseConfig}
              accent="#FB7185"
              pills={[
                { id: "price5", label: "5% better price",
                  apply: c => ({ ...c, price: c.price * 0.95, yieldPct: c.yieldPct / 0.95 }) },
                { id: "price8", label: "8% better price",
                  apply: c => ({ ...c, price: c.price * 0.92, yieldPct: c.yieldPct / 0.92 }) },
                { id: "rent40", label: "$40/wk more rent",
                  apply: c => ({ ...c, yieldPct: c.yieldPct + (40 * 52) / c.price * 100 }) },
                { id: "both", label: "Both levers combined",
                  apply: c => ({ ...c, price: c.price * 0.92,
                    yieldPct: (c.yieldPct / 0.92) + (40 * 52) / (c.price * 0.92) * 100 }) },
              ]}
            />
          </div>
        </div>
      </div>

      {/* — MORTGAGE BROKER — */}
      <div className="home-cta-band-panel" style={{
        background: "linear-gradient(165deg, rgba(96,165,250,0.12), rgba(96,165,250,0.03))",
        border: "1px solid rgba(96,165,250,0.22)",
        borderRadius: 22, padding: "26px 24px", marginTop: 14,
      }}>
        <div className="cta-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, alignItems: "center",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: "rgba(96,165,250,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Briefcase size={16} color="#93C5FD" strokeWidth={2} />
              </div>
              <div style={{
                fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase",
                color: "#93C5FD", fontWeight: 600,
              }}>Mortgage broker</div>
            </div>
            <div style={{
              fontFamily: 'ui-serif, Georgia, serif', fontSize: 25, fontWeight: 500,
              color: "#F5F7FA", letterSpacing: "-0.025em", lineHeight: 1.16, marginBottom: 9,
            }}>
              Even a small rate win saves tens of thousands — and years.
            </div>
            <p style={{
              fontSize: 13.5, lineHeight: 1.5, color: "rgba(245,247,250,0.65)", margin: "0 0 18px",
            }}>
              A broker hunts the rate and structure across the whole market.
              See what it does to {exampleProperty.name} — tap a what-if.
            </p>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => openReferral({
                kind: "broker", property: exampleProperty,
                context: { source: "home-broker-cta" },
              })}
              style={{
                cursor: "pointer", border: "none",
                background: "linear-gradient(135deg, #93C5FD 0%, #60A5FA 55%, #3B82F6 100%)",
                color: "#0B1220", borderRadius: 13, padding: "14px 24px",
                fontSize: 14.5, fontWeight: 700, letterSpacing: -0.02,
                display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                boxShadow: "0 1px 0 rgba(255,255,255,0.3) inset, 0 14px 34px -14px rgba(96,165,250,0.85)",
              }}>
              Match me with a broker — free
              <ArrowRight size={16} strokeWidth={2.6} />
            </motion.button>
          </div>
          <div style={{
            background: "rgba(0,0,0,0.32)", borderRadius: 15,
            border: "1px solid rgba(255,255,255,0.08)", padding: "16px 15px",
          }}>
            <div style={{ fontSize: 11.5, color: "#F5F7FA", fontWeight: 600, marginBottom: 11 }}>
              What a sharper loan would do →
            </div>
            <WhatIfCard
              baseConfig={baseConfig}
              accent="#93C5FD"
              pills={[
                { id: "rate04", label: "0.4% lower rate",
                  apply: c => ({ ...c, rate: Math.max(0.02, c.rate - 0.004) }) },
                { id: "rate08", label: "0.8% lower rate",
                  apply: c => ({ ...c, rate: Math.max(0.02, c.rate - 0.008) }) },
                { id: "rate12", label: "1.2% lower rate",
                  apply: c => ({ ...c, rate: Math.max(0.02, c.rate - 0.012) }) },
                { id: "deposit", label: "10% bigger deposit",
                  apply: c => ({ ...c, deposit: Math.min(0.6, c.deposit + 0.10) }) },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Site footer — credibility, navigation, legal ───────────────────────────
function SiteFooter({ onTab, onLegal, onMethodology }) {
  const go = (screen) => () => onTab && onTab(screen);
  const legal = (section) => () => onLegal && onLegal(section);
  const columns = [
    {
      heading: "Explore",
      links: [
        { label: "Research properties", action: go("browse") },
        { label: "Your shortlist", action: go("saved") },
        { label: "Property map", action: go("map") },
        { label: "Agency leaderboard", action: go("leaderboard") },
        { label: "2026 budget explained", action: go("budget") },
      ],
    },
    {
      heading: "For agents",
      links: [
        { label: "Listing preview (private)", action: go("agent-preview") },
        { label: "How we rank properties", action: onMethodology || (() => navigateTo({ type: "methodology" })) },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Terms & disclaimer", action: legal("terms") },
        { label: "Privacy policy", action: legal("privacy") },
        { label: "Financial disclaimer", action: legal("finance") },
      ],
    },
  ];
  return (
    <footer style={{
      marginTop: 40, padding: "36px 28px 8px",
      borderTop: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div className="footer-grid" style={{
        display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 28,
        marginBottom: 36,
      }}>
        {/* brand block */}
        <div>
          <img src="/logo.png" alt="The Bricks"
            style={{ height: 28, width: "auto", display: "block" }} />
          <div style={{
            fontSize: 12.5, color: "rgba(245,247,250,0.5)", lineHeight: 1.55,
            marginTop: 14, maxWidth: 230,
          }}>
            Australian property investment, modelled honestly — 30 years of
            after-tax cashflow on every property, post-2026 budget.
          </div>
        </div>
        {/* link columns */}
        {columns.map(col => (
          <div key={col.heading}>
            <div style={{
              fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
              color: "rgba(245,247,250,0.4)", fontWeight: 600, marginBottom: 12,
            }}>{col.heading}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {col.links.map(l => (
                <button key={l.label} onClick={l.action}
                  style={{
                    background: "none", border: "none", padding: 0, textAlign: "left",
                    cursor: "pointer", fontSize: 12.5, color: "rgba(245,247,250,0.62)",
                    fontFamily: "inherit", transition: "color 0.15s",
                  }}>{l.label}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* bottom bar */}
      <div className="footer-bottom" style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        paddingTop: 20, paddingBottom: 8,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 11.5, color: "rgba(245,247,250,0.4)" }}>
          © {new Date().getFullYear()} Bricks. All rights reserved.
        </div>
        <div style={{ fontSize: 11, color: "rgba(245,247,250,0.34)", maxWidth: 560, lineHeight: 1.5 }}>
          Bricks provides general information only, not financial or tax advice.
          Projections are estimates, not guarantees. Consider your own circumstances
          and seek licensed advice before investing.
        </div>
      </div>
    </footer>
  );
}

function BrowseScreen({ properties, goals, onOpen, onOpenBudget, wishlist, onToggleWishlist, bracket, onBracket, onTab, initialViewMode = "list" }) {
  const [filterBuild, setFilterBuild] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [sortBy, setSortBy] = useState("positive");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState(initialViewMode); // list | map
  useEffect(() => { setViewMode(initialViewMode); }, [initialViewMode]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState(1);
  // Page size 24 — a multiple of 3 (clean rows on the 3-col desktop grid) and a
  // digestible chunk. Pager appears once there are 25+ results.
  const PAGE_SIZE = 24;

  const states = ["all", "NSW", "VIC", "QLD", "WA", "SA"];
  const sortDef = SORT_OPTIONS.find(s => s.id === sortBy) || SORT_OPTIONS[0];
  const { days: daysUntilCliff } = useCountdown();

  // Marginal rate (incl. medicare 2%) — full AU ladder
  const bracketRates  = { low: 0.18, standard: 0.32, high: 0.39, top: 0.47 };
  const bracketLabels = { low: "18%", standard: "32%", high: "39%", top: "47%" };
  const bracketSubs   = { low: "Entry", standard: "Standard", high: "Higher", top: "Top" };

  // Apply user's bracket to every property's marginal rate for personalised math
  const ratedProperties = useMemo(() =>
    properties.map(p => ({ ...p, marginalRate: bracketRates[bracket] || 0.32 })),
  [properties, bracket]);

  const topBadgeById = useMemo(() => {
    const m = new Map();
    ratedProperties.forEach(p => {
      const ins = getPropertyInsights(p, ratedProperties, SCORING_ENGINE);
      if (ins.badges[0]) m.set(p.id, ins.badges[0].label);
    });
    return m;
  }, [ratedProperties]);

  const filtered = useMemo(() => {
    let arr = ratedProperties.filter(p => p.status !== "owned");
    // Agent-fed previews stay private — they only appear on the Listing Preview screen.
    arr = arr.filter(p => !(p.source === "agent-preview" || p.agentPreview));
    if (showWishlistOnly) arr = arr.filter(p => wishlist.has(p.id));
    if (filterBuild !== "all") arr = arr.filter(p => p.build === filterBuild);
    if (filterTier !== "all")  arr = arr.filter(p => propertyTier(p).id === filterTier);
    if (filterType !== "all")  arr = arr.filter(p => propertyTypeKey(p) === filterType);
    if (filterState !== "all") arr = arr.filter(p => p.state === filterState);

    // Free-text search — matches what people have in mind: property name + suburb.
    // (Easy to extend with agent/listing fields once that data exists.)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      arr = arr.filter(p => {
        const haystack = `${p.name || ""} ${p.suburb || ""} ${p.type || ""}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    if (sortBy === "score")             arr.sort((a, b) => bricksScore(b) - bricksScore(a));
    if (sortBy === "positive")          arr.sort((a, b) => (yearTurnsPositive(generateCashflow(a)) ?? 99) - (yearTurnsPositive(generateCashflow(b)) ?? 99));
    if (sortBy === "taxbenefit")        arr.sort((a, b) => ngBenefitValue(b) - ngBenefitValue(a));
    if (sortBy === "holdingCost") {
      const totalBleed = (p) => generateCashflow(p).reduce((s, x) => s + (x < 0 ? -x : 0), 0);
      arr.sort((a, b) => totalBleed(a) - totalBleed(b));
    }
    if (sortBy === "price-low")         arr.sort((a, b) => a.price - b.price);
    return arr;
  }, [ratedProperties, filterBuild, filterTier, filterType, filterState, sortBy, showWishlistOnly, wishlist, searchQuery]);

  const activeFilterCount = [filterBuild, filterTier, filterType, filterState].filter(v => v !== "all").length + (showWishlistOnly ? 1 : 0);

  // ─── Pagination — reset to page 1 whenever the result set changes ───
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [filterBuild, filterTier, filterType, filterState, sortBy, showWishlistOnly, searchQuery]);
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  // ─── MAP VIEW: map is full-bleed; sort/filter UI floats on top of the map ──
  // Earlier iteration had a separate toolbar bar above the map which (a) felt
  // visually disconnected from the map and (b) ate vertical space, pushing
  // the popup off the fold on shorter viewports. Now: the map fills the
  // entire below-TopNav viewport, and the controls sit as a glass overlay.
  if (viewMode === "map") {
    return (
      <motion.div key="browse-map"
        className="browse-map-screen"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        style={{
          position: "relative",
          // The TopNav lives at top:18 with height:68 → its bottom edge sits
          // around y:88. Pulling the map up to start right under the nav
          // (rather than the previous 96px gap) gives the popup an extra row
          // of headroom and tightens the dead band the user flagged.
          marginTop: 88,
          height: "calc(100dvh - 88px)",
          minHeight: 480, overflow: "hidden",
        }}>

        {/* MAP — full bleed, fills the entire below-TopNav viewport */}
        <div style={{ position: "absolute", inset: 0 }}>
          <MapScreen
            properties={filtered}
            onSelectProperty={onOpen}
            daysUntilCliff={daysUntilCliff}
            wishlist={wishlist}
            onToggleWishlist={onToggleWishlist}
            sortBy={sortBy}
          />
        </div>

        {/* FLOATING SORT/FILTER OVERLAY — glass card, sits on top of the map.
            Anchored to the top so it can't overlap the popup at the bottom.
            One-line heading explains what the row of pills actually does so
            users know the pills re-rank the map. */}
        <div className="map-controls-overlay" style={{
          position: "absolute", top: 12, left: 12, right: 12,
          zIndex: 420,
          display: "flex", flexDirection: "column", gap: 8,
          alignItems: "center",
          pointerEvents: "none", // children opt in
        }}>
          <div style={{
            pointerEvents: "auto",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            background: "rgba(11,14,20,0.78)",
            backdropFilter: "blur(18px) saturate(140%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "10px 12px",
            boxShadow: "0 12px 32px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset",
            maxWidth: "min(960px, 100%)",
          }}>
            <div style={{
              fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase",
              color: "rgba(245,247,250,0.55)", fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <Zap size={10} strokeWidth={2.6} color="#FB7185" fill="#FB7185" />
              Rank the map by
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap",
              maxWidth: "100%", overflowX: "auto",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}>
              <SortToolbar sortBy={sortBy} onSortBy={setSortBy} />
              <motion.button whileTap={{ scale: 0.96 }}
                onClick={() => setFiltersOpen(o => !o)}
                style={{
                  flexShrink: 0, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: activeFilterCount > 0
                    ? "linear-gradient(135deg, rgba(244,63,94,0.22) 0%, rgba(244,63,94,0.06) 100%)"
                    : "rgba(255,255,255,0.06)",
                  border: activeFilterCount > 0
                    ? "1px solid rgba(244,63,94,0.4)"
                    : "1px solid rgba(255,255,255,0.12)",
                  color: activeFilterCount > 0 ? "#FECDD3" : "#F5F7FA",
                  borderRadius: 999, padding: "8px 13px",
                  fontSize: 12.5, fontWeight: 600, letterSpacing: -0.05,
                  whiteSpace: "nowrap",
                }}>
                <SlidersHorizontal size={13} strokeWidth={2.2}
                  color={activeFilterCount > 0 ? "#FB7185" : "rgba(245,247,250,0.7)"} />
                Filters
                {activeFilterCount > 0 && (
                  <span style={{
                    background: "rgba(244,63,94,0.32)", color: "#FECDD3",
                    fontSize: 10, fontWeight: 700,
                    padding: "1px 6px", borderRadius: 999,
                  }}>{activeFilterCount}</span>
                )}
              </motion.button>
            </div>
          </div>

          {/* Floating filter panel — appears beneath the controls when opened */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  pointerEvents: "auto",
                  background: "rgba(11,14,20,0.94)",
                  backdropFilter: "blur(18px) saturate(140%)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 18,
                  boxShadow: "0 24px 60px -16px rgba(0,0,0,0.7)",
                  width: "min(720px, 100%)",
                }}>
                <div style={{ padding: "16px 16px 12px" }}>
                  <FilterRow label="Property grade">
                    <Chip active={filterTier === "all"} onClick={() => setFilterTier("all")}>All grades</Chip>
                    <Chip active={filterTier === "bluechip"} onClick={() => setFilterTier("bluechip")}>★ Bluechip</Chip>
                    <Chip active={filterTier === "growth"} onClick={() => setFilterTier("growth")}>↑ Growth</Chip>
                    <Chip active={filterTier === "value"} onClick={() => setFilterTier("value")}>$ Value</Chip>
                    <Chip active={filterTier === "balanced"} onClick={() => setFilterTier("balanced")}>Balanced</Chip>
                  </FilterRow>
                  <FilterRow label="Build">
                    <Chip active={filterBuild === "all"} onClick={() => setFilterBuild("all")}>All</Chip>
                    <Chip active={filterBuild === "new"} onClick={() => setFilterBuild("new")}>New · keeps tax break</Chip>
                    <Chip active={filterBuild === "existing"} onClick={() => setFilterBuild("existing")}>Established</Chip>
                  </FilterRow>
                  <FilterRow label="State" last={true}>
                    {states.map(s => (
                      <Chip key={s} active={filterState === s} onClick={() => setFilterState(s)}>{s === "all" ? "All" : s}</Chip>
                    ))}
                  </FilterRow>
                  {activeFilterCount > 0 && (
                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      <motion.button whileTap={{ scale: 0.97 }}
                        onClick={() => { setFilterBuild("all"); setFilterTier("all"); setFilterType("all"); setFilterState("all"); setShowWishlistOnly(false); }}
                        style={{
                          background: "transparent", color: "#F87171",
                          border: "none", padding: "4px 12px",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}>
                        Clear all
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.button whileTap={{ scale: 0.94 }}
          className="floating-map-list"
          onClick={() => onTab("browse")}
          style={{
            position: "absolute", bottom: 16, right: 16,
            background: "#F5F7FA", color: "#0B0E14",
            border: "none", borderRadius: 999, padding: "11px 16px",
            fontSize: 12.5, fontWeight: 700, letterSpacing: -0.1,
            display: "inline-flex", alignItems: "center", gap: 6,
            boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
            cursor: "pointer", zIndex: 12,
          }}>
          <ListIcon size={14} strokeWidth={2.4} />
          List
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div key="browse"
      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.22 }}
      style={{ position: "relative" }}>
      {/* HERO BACKGROUND — full viewport width, outside padded content column */}
      <div className="hero-bg-bleed browse-hero-bg" style={{ ...heroBgBleed, height: 780 }}>
        <div className="hero-bg-image" style={{
          position: "absolute", inset: 0,
          backgroundImage: 'url("/the_bricks.png")',
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          opacity: 0.78,
        }} />
        {/* Top fade — keep nav clean */}
        <div className="hero-bg-fade-top" style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 120,
          background: "linear-gradient(to bottom, rgba(5,7,10,0.55), transparent)",
        }} />
        {/* Centre readability vignette + rose glow tucked in */}
        <div className="hero-bg-vignette" style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 55% 65% at 50% 30%, rgba(244,63,94,0.06), transparent 70%), radial-gradient(ellipse 120% 90% at 50% 38%, transparent 45%, rgba(5,7,10,0.5) 100%)",
        }} />
        {/* Bottom fade — smooth into canvas where cards live */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 280,
          background: "linear-gradient(to bottom, transparent, #05070A 96%)",
        }} />
      </div>

      <div className="screen-content" style={{ padding: "0 32px 110px" }}>
      {/* HERO — single cohesive statement, centered. The Raycast move. */}
      <div className="hero-header" style={{
        position: "relative", zIndex: 1,
        marginTop: 96, marginBottom: 36,
        textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
      }}>
        {/* Eyebrow — restrained category signal, framed by faded hairline rules */}
        <div className="hero-eyebrow" style={{
          marginBottom: 20,
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 16,
        }}>
          <span style={{
            width: 40, height: 1,
            background: "linear-gradient(to right, transparent, rgba(245,247,250,0.28))",
          }} />
          <span className="hero-eyebrow-text" style={{
            fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(245,247,250,0.5)",
            textAlign: "center", lineHeight: 1.45,
          }}>
            <span className="eyebrow-line">Free Aussie property</span>
            <span className="eyebrow-line"> investment research</span>
          </span>
          <span style={{
            width: 40, height: 1,
            background: "linear-gradient(to left, transparent, rgba(245,247,250,0.28))",
          }} />
        </div>

        {/* The headline — premium serif, italic gradient accent */}
        <h1 className="hero-h1" style={{
          margin: 0,
          fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
          fontSize: 60, fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1.07,
          color: "#F5F7FA",
          maxWidth: 1000,
        }}>
          <span className="h1-line1">Negative gearing just changed.</span>
          <span className="h1-break-desktop"><br/></span>
          <span className="h1-break-mobile"><br/></span>
          <span>See which beautiful Aussie listings</span>
          <span className="h1-break-desktop"><br/></span>
          <span className="h1-break-mobile"><br/></span>
          <span className="h1-accent" style={{
            fontStyle: "italic",
            fontWeight: 500,
            background: "linear-gradient(90deg, #FDE2E8 0%, #FB7185 48%, #FB923C 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            display: "inline-block",
            lineHeight: 1.16,
            paddingBottom: "0.1em",
          }}>now bleed cash for 30 years</span>
        </h1>

        {/* Sub line — names the budget, keeps the 30-year pain, two lines */}
        <p style={{
          margin: "22px 0 0",
          fontSize: 21, fontWeight: 400, lineHeight: 1.5, letterSpacing: -0.01,
          color: "rgba(245,247,250,0.78)",
          maxWidth: 660,
        }}>
          Australia's biggest property tax shake-up in a generation just landed. The Bricks shows you the 30-year truth before you commit.
        </p>

      </div>

      {/* Tax bracket row — bracket panel + Filters, centered together */}
      <div className="bracket-row" style={{
        position: "relative", zIndex: 1,
        marginBottom: 22,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
      }}>
        <div className="bracket-panel" style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 40px -16px rgba(0,0,0,0.6)",
          borderRadius: 999, padding: 4,
          display: "inline-flex", alignItems: "center", gap: 2,
        }}>
          <div className="bracket-label" style={{
            fontSize: 10.5, fontWeight: 600, letterSpacing: 0.15, textTransform: "uppercase",
            color: "rgba(245,247,250,0.7)",
            padding: "0 12px 0 14px",
          }}>
            Your tax bracket
          </div>
          {Object.keys(bracketLabels).map(id => {
            const active = bracket === id;
            return (
              <button key={id}
                onClick={() => onBracket(id)}
                className={active ? "bracket-btn bracket-btn-active" : "bracket-btn"}
                style={{
                  position: "relative",
                  background: active
                    ? "linear-gradient(135deg, rgba(244,63,94,0.22) 0%, rgba(244,63,94,0.10) 100%)"
                    : "transparent",
                  color: active ? "#FECDD3" : "rgba(245,247,250,0.55)",
                  border: "none",
                  padding: "9px 15px", borderRadius: 999,
                  fontSize: 13, fontWeight: active ? 700 : 600, letterSpacing: -0.05,
                  cursor: "pointer", transition: "all 0.25s",
                  boxShadow: active
                    ? "0 1px 0 rgba(255,255,255,0.08) inset, 0 0 0 1px rgba(244,63,94,0.28) inset"
                    : "none",
                }}>
                {(bracketRates[id] * 100).toFixed(0)}%
              </button>
            );
          })}
        </div>

        <div className="bracket-actions">
          {/* Search — icon toggle, expands a field below */}
          <motion.button whileTap={{ scale: 0.94 }}
            className="bracket-search-btn"
            onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearchQuery(""); }}
            style={{
              cursor: "pointer", flexShrink: 0,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44,
              background: (searchOpen || searchQuery)
                ? "linear-gradient(135deg, rgba(244,63,94,0.16) 0%, rgba(244,63,94,0.05) 100%)"
                : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset",
              color: (searchOpen || searchQuery) ? "#FB7185" : "rgba(245,247,250,0.6)",
              borderRadius: 999,
              transition: "all 0.2s",
            }}>
            <Search size={16} strokeWidth={2.2} />
          </motion.button>

          {/* Filters — pill, height-matched to the bracket panel */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setFiltersOpen(!filtersOpen)}
            className="bracket-filter-btn"
            style={{
              cursor: "pointer", flexShrink: 0,
              display: "inline-flex", alignItems: "center", gap: 7,
              background: activeFilterCount > 0
                ? "linear-gradient(135deg, rgba(244,63,94,0.16) 0%, rgba(244,63,94,0.05) 100%)"
                : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: activeFilterCount > 0
                ? "0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(244,63,94,0.28) inset"
                : "0 1px 0 rgba(255,255,255,0.06) inset",
              color: activeFilterCount > 0 ? "#FECDD3" : "rgba(245,247,250,0.72)",
              borderRadius: 999,
              padding: "12px 18px",
              fontSize: 13, fontWeight: 600, letterSpacing: -0.05,
              transition: "all 0.2s",
            }}>
            <SlidersHorizontal size={13} strokeWidth={2}
              color={activeFilterCount > 0 ? "#FB7185" : "rgba(245,247,250,0.55)"} />
            {filtersOpen ? "Hide filters" : "Filters"}
            {activeFilterCount > 0 && (
              <span style={{
                background: "rgba(244,63,94,0.25)", color: "#FECDD3",
                fontSize: 10, fontWeight: 700,
                padding: "1px 6px", borderRadius: 999,
                boxShadow: "0 0 0 1px rgba(244,63,94,0.35) inset",
                marginLeft: 1,
              }}>{activeFilterCount}</span>
            )}
          </motion.button>
        </div>
      </div>

      {/* ─── SEARCH — expands when the search icon is tapped ─── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            style={{
              position: "relative", zIndex: 1, overflow: "hidden",
              display: "flex", justifyContent: "center",
            }}>
            <div style={{
              position: "relative", width: "100%", maxWidth: 480, marginBottom: 16,
            }}>
              <Search size={16} strokeWidth={2.2}
                style={{
                  position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)",
                  color: "rgba(245,247,250,0.4)", pointerEvents: "none",
                }} />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Property name or suburb…"
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "12px 38px 12px 40px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 999,
                  color: "#F5F7FA", fontSize: 14, fontWeight: 500,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "rgba(255,255,255,0.07)", border: "none",
                    borderRadius: 999, width: 22, height: 22,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "rgba(245,247,250,0.6)",
                  }}>
                  <X size={13} strokeWidth={2.4} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sort-row" style={{ position: "relative", zIndex: 1, marginBottom: 28 }}>
        <SortToolbar sortBy={sortBy} onSortBy={setSortBy} />
      </div>


      {/* Filter drawer — opens directly below the controls */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden", marginTop: -8, marginBottom: 28 }}>
            <div style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset",
              borderRadius: 18, padding: "24px 22px",
              maxWidth: 680, margin: "0 auto",
            }}>
              <FilterRow label="Property grade">
                <Chip active={filterTier === "all"} onClick={() => setFilterTier("all")}>All grades</Chip>
                <Chip active={filterTier === "bluechip"} onClick={() => setFilterTier("bluechip")}>★ Bluechip</Chip>
                <Chip active={filterTier === "growth"} onClick={() => setFilterTier("growth")}>↑ Growth</Chip>
                <Chip active={filterTier === "value"} onClick={() => setFilterTier("value")}>$ Value</Chip>
                <Chip active={filterTier === "balanced"} onClick={() => setFilterTier("balanced")}>Balanced</Chip>
              </FilterRow>
              <FilterRow label="New build or established">
                <Chip active={filterBuild === "all"} onClick={() => setFilterBuild("all")}>All</Chip>
                <Chip active={filterBuild === "new"} onClick={() => setFilterBuild("new")}>New build · keeps tax break</Chip>
                <Chip active={filterBuild === "existing"} onClick={() => setFilterBuild("existing")}>Established · break ends 2027</Chip>
              </FilterRow>
              <FilterRow label="Property type">
                <Chip active={filterType === "all"} onClick={() => setFilterType("all")}>All types</Chip>
                <Chip active={filterType === "house"} onClick={() => setFilterType("house")}>House</Chip>
                <Chip active={filterType === "townhouse"} onClick={() => setFilterType("townhouse")}>Townhouse</Chip>
                <Chip active={filterType === "apartment"} onClick={() => setFilterType("apartment")}>Apartment</Chip>
              </FilterRow>
              <FilterRow label="State" last={true}>
                {states.map(s => (
                  <Chip key={s} active={filterState === s} onClick={() => setFilterState(s)}>{s === "all" ? "All states" : s}</Chip>
                ))}
              </FilterRow>
              {activeFilterCount > 0 && (
                <div style={{ textAlign: "center", marginTop: 18 }}>
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => { setFilterBuild("all"); setFilterTier("all"); setFilterType("all"); setFilterState("all"); setShowWishlistOnly(false); }}
                    style={{
                      background: "transparent", color: "#F87171",
                      border: "none", padding: "4px 12px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>
                    Clear all filters
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="property-grid" style={{
        position: "relative", zIndex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
        gap: 32,
        marginTop: 16,
      }}>
        {paged.map((p, i) => (
          <PropertyCard
            key={p.id}
            property={p}
            goals={goals}
            topBadgeLabel={topBadgeById.get(p.id)}
            onOpen={() => onOpen(p.id)}
            daysUntilCliff={daysUntilCliff}
            wishlisted={wishlist.has(p.id)}
            onToggleWishlist={onToggleWishlist}
            rank={{
              position: (safePage - 1) * PAGE_SIZE + i + 1,
              total: filtered.length,
              reason: sortDef.reason(p),
              sortLabel: sortDef.label,
              sortShort: sortDef.short || sortDef.label.toUpperCase(),
              sortId: sortBy,
              hero: heroFigure(p, sortBy),
            }}
          />
        ))}
      </div>

      {/* ─── PAGINATION ─── */}
      {pageCount > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, marginTop: 30, flexWrap: "wrap",
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            style={{
              cursor: safePage === 1 ? "default" : "pointer",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 10, padding: "9px 13px",
              color: safePage === 1 ? "rgba(245,247,250,0.25)" : "rgba(245,247,250,0.8)",
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 13, fontWeight: 600,
            }}>
            <ChevronLeft size={15} strokeWidth={2.2} /> Prev
          </button>
          {Array.from({ length: pageCount }).map((_, idx) => {
            const n = idx + 1;
            const on = n === safePage;
            return (
              <button key={n} onClick={() => setPage(n)}
                style={{
                  cursor: "pointer", minWidth: 38,
                  background: on ? "linear-gradient(135deg,#FB7185,#C9374F)" : "rgba(255,255,255,0.04)",
                  border: on ? "none" : "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 10, padding: "9px 0",
                  color: on ? "#FFFFFF" : "rgba(245,247,250,0.7)",
                  fontSize: 13, fontWeight: 700,
                }}>{n}</button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            disabled={safePage === pageCount}
            style={{
              cursor: safePage === pageCount ? "default" : "pointer",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 10, padding: "9px 13px",
              color: safePage === pageCount ? "rgba(245,247,250,0.25)" : "rgba(245,247,250,0.8)",
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 13, fontWeight: 600,
            }}>
            Next <ChevronRight size={15} strokeWidth={2.2} />
          </button>
        </div>
      )}
      {pageCount > 1 && (
        <div style={{
          textAlign: "center", marginTop: 12,
          color: "rgba(245,247,250,0.4)", fontSize: 12,
        }}>
          Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} properties
        </div>
      )}

      {/* Footer benefit strip — premium dark glass row with 4 info items + View on Map */}
      <div className="benefit-strip" style={{
        marginTop: 32,
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 18,
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -36px rgba(0,0,0,0.8)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
        alignItems: "center",
        padding: "18px 8px",
      }}>
        <BenefitItem icon={Shield} title="Built for investors" sub="No fluff. Just cashflow." first />
        <BenefitItem icon={FileText} title="2026 budget modelled" sub="Negative gearing & tax cuts." />
        <BenefitItem icon={BarChart3} title="30-year projections" sub="Real dollars. After tax." />
        <BenefitItem icon={Lock} title="Your data stays private" sub="Bank-grade encryption." />
        <motion.button whileTap={{ scale: 0.96 }}
          onClick={() => setViewMode("map")}
          style={{
            margin: "0 14px 0 24px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#F5F7FA",
            borderRadius: 999, padding: "11px 18px",
            fontSize: 13, fontWeight: 600, letterSpacing: -0.05,
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 7,
            transition: "all 0.2s",
          }}>
          <MapIcon size={14} strokeWidth={1.8} />
          View on map
        </motion.button>
      </div>

      {filtered.length === 0 && (
        <div style={{
          padding: "32px 16px", textAlign: "center",
          background: "#15171F",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 14, marginTop: 4,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 999,
            background: "rgba(96,165,250,0.10)",
            border: "1px solid rgba(96,165,250,0.20)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 12,
          }}>
            <Search size={20} color="#60A5FA" strokeWidth={2.3} />
          </div>
          <div style={{ color: "#F5F7FA", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            {showWishlistOnly && wishlist.size === 0
              ? "Nothing shortlisted yet."
              : searchQuery
                ? `No matches for "${searchQuery}".`
                : "No matches with these filters."}
          </div>
          <div style={{ color: "#8B92A5", fontSize: 11.5, lineHeight: 1.5, marginBottom: 14, maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
            {showWishlistOnly && wishlist.size === 0
              ? "Tap the heart on any property to build your shortlist."
              : searchQuery
                ? "Try a different name or suburb, or clear the search."
                : "Try removing a filter or two."}
          </div>
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => {
              setFilterBuild("all"); setFilterTier("all");
              setFilterType("all"); setFilterState("all");
              setShowWishlistOnly(false);
            }}
            style={{
              background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
              color: "#F5F7FA", border: "none",
              borderRadius: 10, padding: "9px 18px",
              fontSize: 12, fontWeight: 800, letterSpacing: -0.1, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
            <X size={12} strokeWidth={3} /> Clear all filters
          </motion.button>
        </div>
      )}

      {/* 2026 budget cliff — countdown band sits below the listings so the
          first thing buyers see is properties, but they can't miss the cliff. */}
      <BudgetCTABand onOpenBudget={onOpenBudget} marginTop={64} marginBottom={32} />

      </div>

      {/* Floating Map toggle — sticks to viewport bottom-right, hidden on mobile */}
      <motion.button whileTap={{ scale: 0.94 }}
        className="floating-map"
        onClick={() => onTab("map")}
        style={{
          position: "fixed", bottom: 24, right: 24,
          background: "rgba(10,12,16,0.78)",
          color: "#F5F7FA",
          backdropFilter: "blur(16px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 999, padding: "12px 18px",
          fontSize: 13, fontWeight: 600, letterSpacing: -0.05,
          display: "inline-flex", alignItems: "center", gap: 7,
          boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 40px -16px rgba(0,0,0,0.7)",
          cursor: "pointer", zIndex: 10,
        }}>
        <MapIcon size={14} strokeWidth={1.8} />
        Map
      </motion.button>
    </motion.div>
  );
}

function QuickFilter({ icon: Icon, label, active, onClick, badge }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick}
      style={{
        background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.025)",
        color: active ? "#F5F7FA" : "rgba(245,247,250,0.6)",
        border: active ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.05)",
        borderRadius: 999, padding: "8px 14px 8px 12px",
        fontSize: 12.5, fontWeight: 500, letterSpacing: -0.05,
        cursor: "pointer", whiteSpace: "nowrap",
        display: "inline-flex", alignItems: "center", gap: 6,
        flexShrink: 0,
        transition: "all 0.2s",
      }}>
      <Icon size={13} strokeWidth={1.8} />
      {label}
      {badge !== null && badge !== undefined && (
        <span style={{
          background: "rgba(255,255,255,0.12)",
          color: "#F5F7FA",
          fontSize: 10, fontWeight: 600,
          padding: "1px 6px", borderRadius: 999,
          marginLeft: 2, minWidth: 18, textAlign: "center",
        }}>{badge}</span>
      )}
    </motion.button>
  );
}

function FilterRow({ label, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 20 }}>
      <div style={{
        color: "rgba(245,247,250,0.4)", fontSize: 10.5, fontWeight: 600,
        letterSpacing: 0.18, textTransform: "uppercase", marginBottom: 11,
        textAlign: "center",
      }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick} style={{
      position: "relative",
      background: active ? "#F5F7FA" : "rgba(255,255,255,0.04)",
      color: active ? "#0B0D12" : "rgba(245,247,250,0.62)",
      border: "none",
      borderRadius: 999, padding: "8px 16px",
      fontSize: 12.5, fontWeight: active ? 700 : 500,
      cursor: "pointer", whiteSpace: "nowrap",
      letterSpacing: -0.05,
      transition: "background 0.2s, color 0.2s",
      boxShadow: active
        ? "0 2px 8px -2px rgba(0,0,0,0.5)"
        : "0 1px 0 rgba(255,255,255,0.05) inset, 0 0 0 1px rgba(255,255,255,0.08) inset",
    }}>{children}</motion.button>
  );
}

// App wrapped in the referral provider so any CTA can open the lead capture.
export default function App() {
  return (
    <ReferralProvider>
      <AppInner />
    </ReferralProvider>
  );
}
