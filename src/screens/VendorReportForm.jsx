import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { listSuburbKeys, getSuburbStats } from "../suburbData.js";
import { computeBricksScore, historicalRankLine } from "../scoring.js";
import { earnBadges, buildBadgeContext } from "../badges.js";
import { DEMO_AGENT } from "../data/demo-agent.js";

const STEPS = [
  { key: "address", label: "Property address", placeholder: "14 Curlewis St, Bondi NSW" },
  { key: "price", label: "Expected asking price", placeholder: "2450000", type: "number" },
  { key: "rent", label: "Expected weekly rent", placeholder: "1350", type: "number" },
  { key: "build", label: "Building type", options: [{ v: "new", l: "New build" }, { v: "existing", l: "Established" }] },
  { key: "vendor", label: "Vendor first name", placeholder: "Rebecca" },
];

const SUBURB_OPTIONS = listSuburbKeys();

export default function VendorReportForm({ onBack, engine }) {
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState("");
  const [suburbPick, setSuburbPick] = useState("bondi");
  const [price, setPrice] = useState("");
  const [rent, setRent] = useState("");
  const [build, setBuild] = useState("new");
  const [vendorName, setVendorName] = useState("");

  const previewProperty = useMemo(() => {
    const st = getSuburbStats(suburbPick);
    const p = parseFloat(price) || 0;
    const weekly = parseFloat(rent) || 0;
    const yieldPct = p > 0 && weekly > 0 ? (weekly * 52 / p) * 100 : st?.medianYieldPct || 3.5;
    return {
      id: "draft",
      name: address.split(",")[0] || "Your property",
      suburb: `${st?.name || "Bondi"}, ${st?.state || "NSW"}`,
      state: st?.state || "NSW",
      price: p || st?.medianPrice || 1000000,
      yieldPct,
      growthPct: st?.medianGrowth10y || 5,
      build,
      type: "House",
      source: "demo",
      confidence: {
        growth: { score: 70 },
        risk: { score: 30 },
        liquid: { score: 72 },
      },
    };
  }, [address, suburbPick, price, rent, build]);

  const livePreview = useMemo(() => {
    const st = getSuburbStats(previewProperty);
    const scoreResult = computeBricksScore(previewProperty, st, engine);
    const badgeCtx = buildBadgeContext(previewProperty, scoreResult, { rank: 3, fastestInSuburb: false }, st, engine);
    const badges = earnBadges(badgeCtx);
    const hist = historicalRankLine(previewProperty, scoreResult.score, st);
    return { score: scoreResult.score, badges, hist };
  }, [previewProperty, engine]);

  function submit() {
    const st = getSuburbStats(suburbPick);
    const prop = {
      ...previewProperty,
      id: Date.now(),
      suburb: `${st?.name || "Bondi"}, ${st?.state || "NSW"}`,
      state: st?.state || "NSW",
      source: "agent-preview",
      agentPreview: true,
      status: "considering",
      color: 0,
      icon: "home",
      type: "House",
      growthPct: st?.medianGrowth10y || 5,
      confidence: {
        growth: { score: 70, reasons: [] },
        risk: { score: 30, reasons: [] },
        liquid: { score: 72, reasons: [] },
      },
      comps: [],
      vendorName: vendorName || "Vendor",
    };
    onSaved?.(prop);
    onBack?.();
  }

  const cur = STEPS[step];

  return (
    <div className="screen-content" style={{ maxWidth: 520, margin: "0 auto", padding: "28px 24px 80px", minHeight: "70vh" }}>
      <button type="button" onClick={onBack} style={{
        background: "none", border: "none", color: "#8B92A5", cursor: "pointer", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
      }}>
        <ChevronLeft size={16} /> Back
      </button>

      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 99,
            background: i <= step ? "linear-gradient(90deg,#FB7185,#C9374F)" : "rgba(255,255,255,0.08)",
          }} />
        ))}
      </div>

      <h1 style={{
        margin: "0 0 8px", fontFamily: 'ui-serif, Georgia, serif',
        fontSize: 32, fontWeight: 500, color: "#F5F7FA",
      }}>
        Add to preview
      </h1>
      <p style={{ color: "rgba(245,247,250,0.5)", fontSize: 14, marginBottom: 24 }}>
        Add a property to your private preview list · {DEMO_AGENT.agency}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
        >
          <label style={{ display: "block", color: "#8B92A5", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
            {cur.label}
          </label>

          {cur.key === "address" && (
            <>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={cur.placeholder}
                style={inputStyle}
              />
              <select value={suburbPick} onChange={e => setSuburbPick(e.target.value)} style={{ ...inputStyle, marginTop: 10 }}>
                {SUBURB_OPTIONS.map(k => (
                  <option key={k} value={k}>{getSuburbStats(k)?.name || k}</option>
                ))}
              </select>
            </>
          )}
          {(cur.key === "price" || cur.key === "rent" || cur.key === "vendor") && (
            <input
              type={cur.type || "text"}
              value={cur.key === "price" ? price : cur.key === "rent" ? rent : vendorName}
              onChange={e => {
                if (cur.key === "price") setPrice(e.target.value);
                else if (cur.key === "rent") setRent(e.target.value);
                else setVendorName(e.target.value);
              }}
              placeholder={cur.placeholder}
              style={inputStyle}
            />
          )}
          {cur.key === "build" && (
            <div style={{ display: "flex", gap: 10 }}>
              {cur.options.map(o => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setBuild(o.v)}
                  style={{
                    flex: 1, padding: "14px 12px", borderRadius: 12, cursor: "pointer",
                    background: build === o.v ? "rgba(251,113,133,0.2)" : "rgba(255,255,255,0.04)",
                    border: build === o.v ? "1px solid rgba(251,113,133,0.45)" : "1px solid rgba(255,255,255,0.08)",
                    color: build === o.v ? "#FECDD3" : "#8B92A5",
                    fontWeight: 700, fontSize: 14,
                  }}
                >
                  {o.l}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {livePreview.badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 24, padding: "14px 16px", borderRadius: 14,
            background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.22)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#FECDD3", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <Sparkles size={14} /> Live preview · score {livePreview.score}
          </div>
          {livePreview.badges.slice(0, 2).map(b => (
            <div key={b.id} style={{ color: "rgba(245,247,250,0.75)", fontSize: 13, marginTop: 4 }}>{b.label}</div>
          ))}
        </motion.div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)} style={btnSecondary}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} style={btnPrimary}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={submit} style={{ ...btnPrimary, flex: 1 }}>
            Save preview page
          </button>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  padding: "14px 16px", borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#F5F7FA", fontSize: 16, outline: "none",
  fontFamily: "inherit",
};

const btnPrimary = {
  flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "14px 20px", borderRadius: 12, border: "none", cursor: "pointer",
  background: "linear-gradient(135deg,#FB7185,#C9374F)",
  color: "#fff", fontWeight: 700, fontSize: 15,
};

const btnSecondary = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "14px 18px", borderRadius: 12,
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#F5F7FA", cursor: "pointer", fontWeight: 600,
};
