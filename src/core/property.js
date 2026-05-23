/**
 * Property-shape helpers (beds/baths/parking inference, listing text, tier badges).
 * No React. Used by cards, detail pages, the report form, etc.
 */
import { generateCashflow } from "./cashflow.js";

export function propertyMeta(property) {
  const t = (property.type || "").toLowerCase();
  let beds = 2, baths = 1, parking = 1, area = 100;
  if (t.includes("apartment") || t.includes("walk-up") || t.includes("unit") || t.includes("tower")) {
    beds = property.price < 600000 ? 1 : property.price < 950000 ? 2 : 3;
    baths = beds === 1 ? 1 : 2;
    parking = beds === 1 ? 1 : 1;
    area = beds * 35 + 20;
  } else if (t.includes("townhouse") || t.includes("terrace")) {
    beds = property.price < 700000 ? 2 : 3;
    baths = beds === 2 ? 1.5 : 2;
    parking = 1;
    area = beds * 55 + 30;
  } else if (t.includes("house") || t.includes("cottage") || t.includes("land")) {
    beds = property.price < 700000 ? 3 : property.price < 1100000 ? 3 : 4;
    baths = beds === 3 ? 2 : 3;
    parking = 2;
    area = 500 + (property.price / 4000);
  }
  let status = "";
  if (property.build === "new") {
    status = property.price > 1000000 ? "Ready Mar 2027" : "Off-the-plan · 2027";
  } else {
    status = property.listing?.yearBuilt
      ? `Built ${property.listing.yearBuilt}`
      : t.includes("victorian") ? "c. 1890" :
            t.includes("federation") ? "c. 1910" :
            t.includes("1980") ? "Built 1985" :
            t.includes("1990") ? "Built 1995" : "Pre-2000";
  }
  if (property?.meta) {
    return {
      beds: property.meta.beds ?? beds,
      baths: property.meta.baths ?? baths,
      parking: property.meta.parking ?? parking,
      area: property.meta.area ?? Math.round(area),
      status: property.meta.status ?? status,
    };
  }
  return { beds, baths, parking, area: Math.round(area), status };
}

/**
 * Listing detail — the "what you'd expect on a listing site" layer.
 * In production these fields come from the scraped listing source.
 */
export function propertyListing(property) {
  const m = propertyMeta(property);
  const isNew = property.build === "new";
  const t = (property.type || "House").toLowerCase();
  const suburb = (property.suburb || "").split(",")[0].trim();
  const custom = property.listing || {};

  const landSize = custom.landSize ?? (
    t.includes("apartment") || t.includes("unit")
      ? null
      : Math.round(m.area * (t.includes("town") ? 1.6 : 4.2) / 10) * 10
  );
  const yearBuilt = custom.yearBuilt ?? (isNew ? 2026 : property.price > 1100000 ? 1995 : 2008);

  const desc = custom.desc ?? [
    `A ${m.beds}-bedroom ${t} in ${suburb}, with ${m.baths} bathroom${m.baths === 1 ? "" : "s"} and ${m.parking} car space${m.parking === 1 ? "" : "s"}.`,
    landSize
      ? `Set on approximately ${landSize}m² of land${m.area ? `, with ${m.area}m² of internal living area` : ""}.`
      : m.area
        ? `Approximately ${m.area}m² of internal living area.`
        : null,
    isNew
      ? `Newly built (${yearBuilt}) and covered by builder's warranty — eligible for the new-build tax treatment under the 2026 budget.`
      : `An established property (built ${yearBuilt}) — subject to the post-2027 negative gearing changes for established homes.`,
  ].filter(Boolean);

  const inspections = custom.inspections ?? (
    isNew
      ? ["Display home open daily · 10:00am–4:00pm"]
      : ["Saturday 11:00am–11:30am", "Wednesday 5:30pm–6:00pm"]
  );

  const features = custom.features ?? [
    `${m.beds} bedrooms`, `${m.baths} bathrooms`, `${m.parking} car spaces`,
    landSize ? `${landSize}m² land` : m.area ? `${m.area}m² internal` : null,
    isNew ? "Builder's warranty" : `Built ${yearBuilt}`,
    t.includes("apartment") ? "Strata title" : "Torrens title",
  ].filter(Boolean);

  return {
    landSize,
    yearBuilt,
    desc,
    inspections,
    features,
    area: m.area,
    floorplanUrl: custom.floorplanUrl ?? null,
    councilRates: custom.councilRates ?? null,
    waterRates: custom.waterRates ?? null,
    auction: custom.auction ?? null,
    priceLabel: custom.priceLabel ?? null,
    heritage: custom.heritage ?? null,
    tenancyNote: custom.tenancyNote ?? null,
  };
}

export function propertyTier(property) {
  const c = property.confidence;
  const liquid = c?.liquid?.score || 50;
  const growth = c?.growth?.score || 50;

  if (liquid >= 75 && growth >= 68 && property.price >= 700000) {
    return { id: "bluechip", label: "Bluechip", desc: "Premium established suburb" };
  }
  if (property.growthPct >= 6.0) {
    return { id: "growth", label: "Growth", desc: "High-momentum corridor" };
  }
  if (property.price < 700000 || property.yieldPct >= 4.8) {
    return { id: "value", label: "Value", desc: "Yield-focused entry" };
  }
  return { id: "balanced", label: "Balanced", desc: "Middle-of-road" };
}

export function propertyTypeKey(property) {
  const t = (property.type || "").toLowerCase();
  if (t.includes("apartment") || t.includes("walk-up") || t.includes("unit") || t.includes("tower")) return "apartment";
  if (t.includes("townhouse") || t.includes("terrace")) return "townhouse";
  return "house";
}

export function historicalGrowth10y(property) {
  const historicalAnnual = property.growthPct * 0.85;
  return (Math.pow(1 + historicalAnnual / 100, 10) - 1) * 100;
}

export function wealthCreated(property) {
  const cf = generateCashflow(property);
  const yr30Value = property.price * Math.pow(1 + property.growthPct / 100, 30);
  const totalCashflow = cf.reduce((s, x) => s + x, 0);
  return yr30Value + totalCashflow - property.price;
}
