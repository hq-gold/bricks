/**
 * MapScreen — full-bleed Leaflet map view of the property catalogue.
 *
 * What it owns:
 *  - the `PropertyMap` (rank-graded dots, top-3 pulse animation)
 *  - the floating zoom controls
 *  - the per-property popup card that slides up on click
 *
 * Note: we used to render soft "suburb area" circles and a header legend over
 * the map; both were removed per design feedback — the map is now intentionally
 * just a sea of ranked dots so best-vs-worst reads at a glance.
 */
import React, { useMemo, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Bed, Bath, Car, Maximize2, Bookmark, ArrowRight } from "lucide-react";
import PropertyMap from "../PropertyMap.jsx";
import {
  fmt,
  generateCashflow,
  calcDollarMilestones,
  yearTurnsPositive,
  ngBenefitValue,
} from "../core/cashflow.js";
import { propertyMeta, historicalGrowth10y } from "../core/property.js";
import { getSuburbCoord } from "../core/coords.js";
import { getPropertyInsights } from "../propertyInsights.js";
import {
  CashflowGrid,
  PropertyHero,
  bricksScore,
  SCORING_ENGINE,
  ALL_PROPS,
} from "../bricks-premium.jsx";

// ─── Map popup card ─────────────────────────────────────────────────────────
// Mirrors the front-page PropertyCard look: same hero photo treatment, same
// price/name typography, same cashflow brick. Sized to feel like a sharp
// pop-out, not a stretched bottom sheet.
function MapPropertyPopup({ property, rank, daysUntilCliff, wishlisted, onToggleWishlist, onClose, onOpen, hideActions = false }) {
  const cashflow = useMemo(() => generateCashflow(property), [property]);
  const milestones = useMemo(() => calcDollarMilestones(cashflow), [cashflow]);
  const meta = useMemo(() => propertyMeta(property), [property]);
  const insights = useMemo(
    () => getPropertyInsights(property, ALL_PROPS, SCORING_ENGINE),
    [property],
  );
  const breakEven = useMemo(() => yearTurnsPositive(cashflow), [cashflow]);
  const past10y = useMemo(() => historicalGrowth10y(property), [property]);
  const isNew = property.build === "new";
  const topBadge = insights.badges[0];

  return (
    <div style={{ overflow: "hidden", borderRadius: 18 }}>
      {/* Hero photo — bleeds the popup's 14px padding to the edges */}
      <div style={{
        position: "relative",
        width: "calc(100% + 28px)", marginLeft: -14, marginRight: -14,
        marginTop: -14, marginBottom: 16, height: 150,
      }}>
        <PropertyHero property={property} height={150} grayscale={true} />
        {/* Rank pill — pink, prominent, matches the on-map dot semantics */}
        {rank != null && (
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
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4 }}>
              #{rank}{breakEven ? ` · breaks even Y${breakEven}` : ""}
            </span>
          </div>
        )}
        {topBadge && (
          <div style={{
            position: "absolute", bottom: 10, left: 12,
            maxWidth: "calc(100% - 68px)",
            fontSize: 10, fontWeight: 600, color: "rgba(245,247,250,0.78)",
            padding: "4px 8px", borderRadius: 6,
            background: "rgba(5,7,10,0.72)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.08)",
            lineHeight: 1.3, pointerEvents: "none",
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
          }}>
            {topBadge.label}
          </div>
        )}
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 10, right: 10,
            width: 30, height: 30, borderRadius: 999,
            background: "rgba(10,12,16,0.85)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#F5F7FA", cursor: "pointer", padding: 0,
          }}>
          <X size={15} strokeWidth={2.4} />
        </motion.button>
      </div>

      {/* Price / name / suburb */}
      <div style={{ padding: "0 4px", marginBottom: 10 }}>
        <div style={{ color: "#F5F7FA", fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {fmt(property.price)}
        </div>
        <div style={{ color: "rgba(245,247,250,0.85)", fontSize: 14, marginTop: 7, fontWeight: 500, letterSpacing: -0.05 }}>
          {property.name}
        </div>
        <div style={{ color: "rgba(245,247,250,0.45)", fontSize: 12, marginTop: 2, letterSpacing: -0.05 }}>
          {property.suburb}
        </div>
      </div>

      {/* Beds/baths/parking row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 4px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
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
        <span style={{
          marginLeft: "auto", fontSize: 9.5, fontWeight: 700,
          letterSpacing: 0.4, textTransform: "uppercase",
          color: isNew ? "#22C55E" : "#F87171",
        }}>
          {isNew ? "New build" : "Established"}
        </span>
      </div>

      {/* Cashflow brick — same component as the front-page card */}
      <div style={{ padding: "14px 4px 4px" }}>
        <div style={{
          color: "rgba(245,247,250,0.45)", fontSize: 11, marginBottom: 8,
          letterSpacing: -0.05, display: "inline-flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ color: "rgba(96,165,250,0.7)" }}>↗</span>
          {property.suburb.split(",")[0]} median +{Math.round(past10y)}% over the past 10 years
        </div>
        <div style={{ overflow: "hidden", display: "flex", justifyContent: "center" }}>
          <CashflowGrid
            cashflow={cashflow} cols={30} rows={12}
            cell={9} gap={2.5}
            milestones={milestones}
            animate={false}
          />
        </div>
      </div>

      {!hideActions && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {onToggleWishlist && (
            <motion.button whileTap={{ scale: 0.92 }}
              onClick={(e) => { e.stopPropagation(); onToggleWishlist(property.id); }}
              aria-label={wishlisted ? "Remove from shortlist" : "Add to shortlist"}
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: wishlisted ? "rgba(244,63,94,0.18)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${wishlisted ? "rgba(244,63,94,0.32)" : "rgba(255,255,255,0.08)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: wishlisted ? "#FB7185" : "#F5F7FA",
                cursor: "pointer", padding: 0, flexShrink: 0,
              }}>
              <Bookmark size={16} strokeWidth={2.4}
                fill={wishlisted ? "#FB7185" : "none"} color={wishlisted ? "#FB7185" : "currentColor"} />
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={onOpen}
            style={{
              flex: 1,
              background: "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)",
              color: "#FFFFFF",
              border: "none", borderRadius: 12,
              padding: "13px 18px",
              fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em",
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
              boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 28px -12px rgba(244,63,94,0.85)",
            }}>
            Open property
            <ArrowRight size={14} strokeWidth={2.5} />
          </motion.button>
        </div>
      )}
    </div>
  );
}

function MapPopupActions({ property, wishlisted, onToggleWishlist, onOpen }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {onToggleWishlist && (
        <motion.button whileTap={{ scale: 0.92 }}
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(property.id); }}
          aria-label={wishlisted ? "Remove from shortlist" : "Add to shortlist"}
          style={{
            width: 44, height: 44, borderRadius: 12,
            background: wishlisted ? "rgba(244,63,94,0.18)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${wishlisted ? "rgba(244,63,94,0.32)" : "rgba(255,255,255,0.08)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: wishlisted ? "#FB7185" : "#F5F7FA",
            cursor: "pointer", padding: 0, flexShrink: 0,
          }}>
          <Bookmark size={16} strokeWidth={2.4}
            fill={wishlisted ? "#FB7185" : "none"} color={wishlisted ? "#FB7185" : "currentColor"} />
        </motion.button>
      )}
      <motion.button whileTap={{ scale: 0.97 }}
        onClick={onOpen}
        style={{
          flex: 1,
          background: "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)",
          color: "#FFFFFF",
          border: "none", borderRadius: 12,
          padding: "13px 18px",
          fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em",
          cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
          boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 28px -12px rgba(244,63,94,0.85)",
        }}>
        Open property
        <ArrowRight size={14} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}

// ─── Main map screen ────────────────────────────────────────────────────────
export default function MapScreen({
  properties, onSelectProperty, daysUntilCliff, wishlist, onToggleWishlist,
  sortBy = "positive",
}) {
  const [selectedId, setSelectedId] = useState(null);
  const zoomRef = useRef(null);

  const selected = useMemo(() => properties.find(p => p.id === selectedId), [properties, selectedId]);

  // Sort drives the rank that the markers and popup display. The list is the
  // same one the toolbar above the map controls.
  const ranked = useMemo(() => {
    const arr = [...properties];
    if (sortBy === "positive")          arr.sort((a, b) => (yearTurnsPositive(generateCashflow(a)) ?? 99) - (yearTurnsPositive(generateCashflow(b)) ?? 99));
    else if (sortBy === "taxbenefit")   arr.sort((a, b) => ngBenefitValue(b) - ngBenefitValue(a));
    else if (sortBy === "holdingCost") {
      const totalBleed = (p) => generateCashflow(p).reduce((s, x) => s + (x < 0 ? -x : 0), 0);
      arr.sort((a, b) => totalBleed(a) - totalBleed(b));
    }
    else if (sortBy === "price-low")    arr.sort((a, b) => a.price - b.price);
    else                                arr.sort((a, b) => bricksScore(b) - bricksScore(a));
    return arr.map((p, i) => ({ ...p, _rank: i + 1 }));
  }, [properties, sortBy]);

  const selectedRank = useMemo(() => {
    if (!selectedId) return null;
    const found = ranked.find(p => p.id === selectedId);
    return found?._rank ?? null;
  }, [ranked, selectedId]);

  // Render a short caption on the top-3 markers so the user can see WHY a
  // property ranks #1 before clicking — the metric that drove it under the
  // current sort.
  const subLabelFor = useCallback((p) => {
    if (sortBy === "positive") {
      const y = yearTurnsPositive(generateCashflow(p));
      return y ? `Y${y} break-even` : null;
    }
    if (sortBy === "taxbenefit") {
      const v = ngBenefitValue(p);
      if (!v) return null;
      const k = Math.round(v / 1000);
      return v >= 0 ? `+$${k}k tax` : `−$${Math.abs(k)}k tax`;
    }
    if (sortBy === "holdingCost") {
      const cf = generateCashflow(p);
      const bleed = Math.round(cf.reduce((s, x) => s + (x < 0 ? -x : 0), 0) / 1000);
      return `−$${bleed}k cost`;
    }
    if (sortBy === "price-low") {
      const k = Math.round(p.price / 1000);
      return k >= 1000 ? `$${(k / 1000).toFixed(2)}M` : `$${k}k`;
    }
    return `Score ${bricksScore(p)}`;
  }, [sortBy]);

  const getCoord = useCallback(
    (p) => getSuburbCoord(p.suburb, p.state, p.id),
    []
  );

  return (
    <div className="property-map-shell" style={{
      position: "relative", width: "100%", height: "100%",
      background: "#05070A",
    }}>
      <PropertyMap
        ranked={ranked}
        getCoord={getCoord}
        selectedId={selectedId}
        onSelectProperty={(id) => setSelectedId(id)}
        onClearSelection={() => setSelectedId(null)}
        zoomRef={zoomRef}
        // No initialBounds → PropertyMap centres on AU + zoom 4 so the user
        // sees the whole country on first load, then can zoom into a region.
        initialBounds={undefined}
        subLabelFor={subLabelFor}
      />

      {/* Zoom controls — top-right, sit above the map */}
      <div className="map-zoom-controls" style={{
        position: "absolute", right: 14, top: 14, zIndex: 400,
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => zoomRef.current?.zoomIn()}
          aria-label="Zoom in"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(11,14,20,0.86)", backdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#F5F7FA",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 18, fontWeight: 600, padding: 0,
          }}>+</motion.button>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => zoomRef.current?.zoomOut()}
          aria-label="Zoom out"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(11,14,20,0.86)", backdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#F5F7FA",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 18, fontWeight: 600, padding: 0,
          }}>−</motion.button>
      </div>

      {/* Selected property popup — viewport-fixed so it never clips below the
          fold. Scrollable body + sticky action footer keeps CTAs visible. */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="map-card-popup"
            style={{
              display: "flex", flexDirection: "column",
              background: "rgba(21,23,31,0.96)",
              backdropFilter: "blur(20px) saturate(140%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              zIndex: 500,
              boxShadow: "0 20px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
              overflow: "hidden",
            }}>
            <div style={{
              minHeight: 0, flex: 1,
              overflowY: "auto",
              padding: "14px 14px 0",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}>
              <MapPropertyPopup
                property={selected}
                rank={selectedRank}
                daysUntilCliff={daysUntilCliff}
                wishlisted={wishlist?.has(selected.id)}
                onToggleWishlist={onToggleWishlist}
                onClose={() => setSelectedId(null)}
                onOpen={() => onSelectProperty(selected.id)}
                hideActions
              />
            </div>
            <div style={{
              flexShrink: 0,
              padding: "12px 14px 14px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(11,13,18,0.92)",
            }}>
              <MapPopupActions
                property={selected}
                wishlisted={wishlist?.has(selected.id)}
                onToggleWishlist={onToggleWishlist}
                onOpen={() => onSelectProperty(selected.id)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
