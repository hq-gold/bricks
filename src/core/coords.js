/**
 * Suburb / state coordinates for the map view.
 * Add new public suburbs here as we onboard agents in new patches.
 */

export const SUBURB_COORDS = {
  "Sunbury, VIC":        { lat: -37.58, lon: 144.72 },
  "Surry Hills, NSW":    { lat: -33.88, lon: 151.21 },
  "Bardon, QLD":         { lat: -27.46, lon: 152.97 },
  "Subiaco, WA":         { lat: -31.95, lon: 115.83 },
  "Mascot, NSW":         { lat: -33.93, lon: 151.19 },
  "Brunswick East, VIC": { lat: -37.77, lon: 144.98 },
  "Mooloolaba, QLD":     { lat: -26.68, lon: 153.12 },
  "Adelaide, SA":        { lat: -34.93, lon: 138.60 },
  "Cottesloe, WA":       { lat: -31.99, lon: 115.76 },
  "Carlton, VIC":        { lat: -37.80, lon: 144.97 },
  "Marrickville, NSW":   { lat: -33.91, lon: 151.16 },
  "Toowong, QLD":        { lat: -27.48, lon: 152.99 },
  "Glenelg, SA":         { lat: -34.98, lon: 138.51 },
  // ─── Sydney Eastern Suburbs (Belle Property / Ray White patch) ─────────────
  "Bondi, NSW":          { lat: -33.891, lon: 151.265 },
  "Bondi Beach, NSW":    { lat: -33.891, lon: 151.275 },
  "Bondi Junction, NSW": { lat: -33.892, lon: 151.249 },
  "Bronte, NSW":         { lat: -33.905, lon: 151.265 },
  "Tamarama, NSW":       { lat: -33.901, lon: 151.270 },
  "Coogee, NSW":         { lat: -33.921, lon: 151.258 },
  "Randwick, NSW":       { lat: -33.916, lon: 151.244 },
  "Clovelly, NSW":       { lat: -33.913, lon: 151.262 },
  "Waverley, NSW":       { lat: -33.901, lon: 151.255 },
  "Double Bay, NSW":     { lat: -33.879, lon: 151.243 },
  "Rose Bay, NSW":       { lat: -33.873, lon: 151.270 },
  "Vaucluse, NSW":       { lat: -33.857, lon: 151.275 },
  "Bellevue Hill, NSW":  { lat: -33.881, lon: 151.255 },
  "Paddington, NSW":     { lat: -33.885, lon: 151.226 },
  "Woollahra, NSW":      { lat: -33.886, lon: 151.236 },
  // Round 2 — densify the Eastern patch + reach the inner CBD/harbour edge
  "Maroubra, NSW":       { lat: -33.949, lon: 151.243 },
  "Kingsford, NSW":      { lat: -33.924, lon: 151.227 },
  "Kensington, NSW":     { lat: -33.916, lon: 151.222 },
  "Queens Park, NSW":    { lat: -33.901, lon: 151.246 },
  "Centennial Park, NSW":{ lat: -33.897, lon: 151.232 },
  "Darling Point, NSW":  { lat: -33.872, lon: 151.235 },
  "Point Piper, NSW":    { lat: -33.866, lon: 151.249 },
  "Edgecliff, NSW":      { lat: -33.879, lon: 151.236 },
  "Watsons Bay, NSW":    { lat: -33.840, lon: 151.282 },
  "Dover Heights, NSW":  { lat: -33.870, lon: 151.281 },
  "North Bondi, NSW":    { lat: -33.886, lon: 151.275 },
  "South Coogee, NSW":   { lat: -33.928, lon: 151.255 },
};

/** Initial demo focus for the map — Belle Property Eastern Suburbs patch. */
export const EASTERN_SYDNEY_BOUNDS = {
  southwest: { lat: -33.945, lon: 151.215 },
  northeast: { lat: -33.840, lon: 151.295 },
};

export const STATE_CENTER = {
  NSW: { lat: -32.8, lon: 147.2 },
  VIC: { lat: -37.2, lon: 144.5 },
  QLD: { lat: -22.5, lon: 144.5 },
  WA:  { lat: -26.5, lon: 121.5 },
  SA:  { lat: -30.5, lon: 136.5 },
};

export function getSuburbCoord(suburb, state, id = 0) {
  if (SUBURB_COORDS[suburb]) return SUBURB_COORDS[suburb];
  const st = state || (suburb || "").split(",")[1]?.trim();
  const base = STATE_CENTER[st] || { lat: -28.0, lon: 134.0 };
  const jx = ((id * 17) % 21 - 10) * 0.12;
  const jy = ((id * 23) % 21 - 10) * 0.10;
  return { lat: base.lat + jy, lon: base.lon + jx };
}

/** Aggregate properties by suburb for the map's suburb-overlay rings. */
export function aggregateBySuburb(properties, scoreFn) {
  const groups = new Map();
  properties.forEach(p => {
    const key = p.suburb;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });
  return Array.from(groups.entries()).map(([suburb, props]) => {
    const avgScore = scoreFn
      ? props.reduce((s, p) => s + scoreFn(p), 0) / props.length
      : 50;
    const coord = getSuburbCoord(suburb, props[0].state, props[0].id);
    return { suburb, props, avgScore, coord };
  });
}
