import React from "react";
import { motion } from "framer-motion";

const CHANNELS = [
  { id: "facebook", label: "Facebook", color: "#1877F2", letter: "f" },
  { id: "instagram", label: "Instagram", color: "#E4405F", letter: "◎" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2", letter: "in" },
  { id: "twitter", label: "X", color: "#111111", letter: "𝕏" },
];

export default function SocialShareButtons({ onShare, layout = "grid", compact = false }) {
  // Compact / inline — icon-only square buttons for tight share strips
  if (layout === "inline" || compact) {
    return (
      <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
        {CHANNELS.map(ch => (
          <motion.button
            key={ch.id}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => onShare(ch.id)}
            title={`Share to ${ch.label}`}
            aria-label={`Share to ${ch.label}`}
            style={{
              cursor: "pointer", borderRadius: 10,
              width: 32, height: 32,
              background: ch.color,
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.10) inset, 0 6px 16px -8px rgba(0,0,0,0.5)",
              color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: ch.id === "linkedin" ? 10 : 13, fontWeight: 800,
              transition: "transform 0.15s",
            }}
          >
            {ch.letter}
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: layout === "grid" ? "grid" : "flex",
      gridTemplateColumns: layout === "grid" ? "1fr 1fr" : undefined,
      flexWrap: layout === "flex" ? "wrap" : undefined,
      gap: 8,
    }}>
      {CHANNELS.map(ch => (
        <motion.button
          key={ch.id}
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => onShare(ch.id)}
          style={{
            cursor: "pointer", borderRadius: 12,
            padding: "11px 14px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#F5F7FA",
            display: "inline-flex", alignItems: "center", gap: 10,
            fontWeight: 600, fontSize: 13,
          }}
        >
          <span style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: ch.color,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: ch.id === "linkedin" ? 10 : 14, fontWeight: 800, color: "#fff",
          }}>
            {ch.letter}
          </span>
          {ch.label}
        </motion.button>
      ))}
    </div>
  );
}

export function buildShareUrls(caption, shareUrl) {
  const text = encodeURIComponent(caption);
  const url = encodeURIComponent(shareUrl);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
  };
}
