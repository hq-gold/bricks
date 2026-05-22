import React, { useEffect, useMemo, useRef, useCallback } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Australia centre — fallback when no `initialBounds` is supplied.
const AU_CENTER = [-25.5, 134.5];

// Carto dark tiles match the rest of the dark UI. Carto/OSM/Leaflet credits
// live in LegalScreen rather than as overlay clutter on the map.
const MAP_TILES = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};

// Scatter markers that share a suburb so they don't pile on top. Deterministic
// per-id so the same property always lands on the same dot.
function markerJitter(id) {
  const jLat = ((id * 31) % 11 - 5) * 0.0035;
  const jLon = ((id * 47) % 11 - 5) * 0.0035;
  return { jLat, jLon };
}

// ─── Brand-rose palette with rank-driven lightness fade ────────────────────
// Earlier iterations used a green→amber→red heatmap, which turned out to read
// as disconnected from the rest of the dark+rose UI (the 2026 rules CTA, the
// active sort pill, etc.). We now keep every pin in the rose family — the
// rank still drives a subtle fade from a vivid pink (top of the leaderboard)
// to a deeper, dimmer rose (bottom). The user's eye still flows to the top
// markers because they're brighter, but the whole map feels like it belongs
// to the same product.
const RANK_TOP    = [0xFB, 0x71, 0x85]; // rose-400 — brand pink (rank 1)
const RANK_BOTTOM = [0x6B, 0x29, 0x37]; // deep mauve-rose (rank N)

function rankFill(rank, total) {
  if (total <= 1) return `rgb(${RANK_TOP.join(",")})`;
  const raw = (rank - 1) / (total - 1);
  // Bias the curve so the leaders stay near the bright end for longer; the
  // dim end is reserved for the genuine tail of the leaderboard.
  const t = Math.pow(raw, 0.7);
  const ch = (i) => Math.round(RANK_TOP[i] + (RANK_BOTTOM[i] - RANK_TOP[i]) * t);
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

// Top-rank markers get the concentric pulse + a small floating caption that
// answers "what makes this #1?" before the user clicks.
const TOP_PULSE_THRESHOLD = 3;

function rankMarkerIcon(rank, total, subLabel) {
  const fill = rankFill(rank, total);
  const isTop = rank <= TOP_PULSE_THRESHOLD;
  const size = isTop ? 36 : 30;

  const labelColor = "#FFFFFF";
  const ring = "rgba(255,255,255,0.22)";

  const classes = [
    "bricks-map-pin",
    isTop ? "bricks-map-pin--top" : "",
  ].filter(Boolean).join(" ");

  const captionHtml = isTop && subLabel
    ? `<span class="bricks-map-pin-caption">${subLabel}</span>`
    : "";

  return L.divIcon({
    className: "bricks-leaflet-marker",
    html: `<div class="${classes}" style="--pin-fill:${fill};--pin-size:${size}px;--pin-ring:${ring};--pin-label:${labelColor}"><span>#${rank}</span>${captionHtml}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Mount-only fit. We don't refit when properties change so the map stays
// where the user panned/zoomed it.
function MapFitBounds({ positions, initialBounds }) {
  const map = useMap();
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (initialBounds) {
      const b = L.latLngBounds(
        [initialBounds.southwest.lat, initialBounds.southwest.lon],
        [initialBounds.northeast.lat, initialBounds.northeast.lon],
      );
      map.fitBounds(b, { animate: false });
      return;
    }
    if (!positions.length) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds.pad(0.12), { maxZoom: 12, animate: false });
  }, [map, positions, initialBounds]);
  return null;
}

function MapClearSelection({ onClear }) {
  useMapEvents({ click: onClear });
  return null;
}

function MapZoomBridge({ zoomRef }) {
  const map = useMap();
  useEffect(() => {
    if (!zoomRef) return;
    zoomRef.current = {
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
    };
  }, [map, zoomRef]);
  return null;
}

export default function PropertyMap({
  ranked,
  getCoord,
  selectedId,
  onSelectProperty,
  onClearSelection,
  zoomRef,
  initialBounds,
  // Optional: caller-provided per-property caption ("Y3 break-even", "+$48k")
  // shown next to the top-3 markers so the user knows why they're #1 before
  // clicking. The caller can adjust based on the current sort.
  subLabelFor,
}) {
  const total = ranked.length || 1;

  // Track first-mount once per map instance so the burst animation only
  // fires once. After mount the ref flips and re-renders skip the class.
  // Cache icons by rank + caption so selection changes don't recreate DOM.
  const iconCache = useRef(new Map());
  const getIcon = useCallback((p, totalCount, subLabel) => {
    const key = `${p.id}-${p._rank}-${subLabel || ""}-${totalCount}`;
    if (!iconCache.current.has(key)) {
      iconCache.current.set(key, rankMarkerIcon(p._rank, totalCount, subLabel));
    }
    return iconCache.current.get(key);
  }, []);

  // Toggle selected styling via DOM — keeps marker icons stable.
  const markerEls = useRef({});
  useEffect(() => {
    Object.entries(markerEls.current).forEach(([id, el]) => {
      const pin = el?.querySelector?.(".bricks-map-pin");
      if (pin) pin.classList.toggle("bricks-map-pin--selected", Number(id) === selectedId);
    });
  }, [selectedId]);

  const fitPositions = useMemo(
    () => ranked.map(p => {
      const c = getCoord(p);
      const { jLat, jLon } = markerJitter(p.id);
      return [c.lat + jLat, c.lon + jLon];
    }),
    [ranked, getCoord]
  );

  const center = initialBounds
    ? [
        (initialBounds.southwest.lat + initialBounds.northeast.lat) / 2,
        (initialBounds.southwest.lon + initialBounds.northeast.lon) / 2,
      ]
    : AU_CENTER;
  const initialZoom = initialBounds ? 12 : 4;

  return (
    <MapContainer
      center={center}
      zoom={initialZoom}
      minZoom={3}
      maxZoom={16}
      scrollWheelZoom
      attributionControl={false}
      style={{ width: "100%", height: "100%", background: "#0a0e14" }}
      zoomControl={false}
    >
      <TileLayer url={MAP_TILES.url} />
      <MapFitBounds positions={fitPositions} initialBounds={initialBounds} />
      <MapClearSelection onClear={onClearSelection} />
      <MapZoomBridge zoomRef={zoomRef} />

      {ranked.map(p => {
        const coord = getCoord(p);
        const { jLat, jLon } = markerJitter(p.id);
        const pos = [coord.lat + jLat, coord.lon + jLon];
        const selected = selectedId === p.id;
        const subLabel = subLabelFor ? subLabelFor(p) : null;
        return (
          <Marker
            key={p.id}
            position={pos}
            icon={getIcon(p, total, subLabel)}
            zIndexOffset={selected ? 1000 : 600 - p._rank}
            eventHandlers={{
              add: (e) => { markerEls.current[p.id] = e.target.getElement(); },
              remove: () => { delete markerEls.current[p.id]; },
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                onSelectProperty(p.id);
              },
            }}
          />
        );
      })}
    </MapContainer>
  );
}
