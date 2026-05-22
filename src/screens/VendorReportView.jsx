import React from "react";
import { ChevronLeft } from "lucide-react";
import { BadgeShelf } from "../components/Badge.jsx";
import { getSuburbStats } from "../suburbData.js";
import { navigateTo } from "../routing.js";

/** Web-only conversation page — not a PDF export. */
export default function VendorReportView({ report, onBack, renderBrick }) {
  if (!report) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#8B92A5" }}>
        Preview not found.
        <button type="button" onClick={onBack} style={{ display: "block", margin: "16px auto", color: "#FB7185", background: "none", border: "none", cursor: "pointer" }}>
          Back
        </button>
      </div>
    );
  }

  const { agent, vendorName, property, score, badges, historical, liveRank } = report;
  const st = getSuburbStats(property);
  const suburbName = property.suburb?.split(",")[0] || st?.name;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 24px 80px" }}>
      <button type="button" onClick={onBack} style={{
        background: "none", border: "none", color: "#8B92A5", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 13, fontWeight: 600,
      }}>
        <ChevronLeft size={16} /> Agent preview
      </button>

      <div style={{
        padding: "14px 16px", borderRadius: 12, marginBottom: 24,
        background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.25)",
        fontSize: 13, color: "rgba(245,247,250,0.65)", lineHeight: 1.55,
      }}>
        <strong style={{ color: "#FECDD3" }}>Not live on Bricks.</strong> Sample ranking for a listing conversation — share this link on your phone or laptop, not as a PDF.
      </div>

      <header style={{
        padding: "28px 26px", borderRadius: 16,
        background: "linear-gradient(135deg, rgba(251,113,133,0.12) 0%, rgba(255,255,255,0.04) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        marginBottom: 28,
      }}>
        <div style={{ fontSize: 11, color: "#8B92A5", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Prepared for {vendorName}
        </div>
        <div style={{ fontSize: 14, color: "rgba(245,247,250,0.7)", marginTop: 6 }}>
          by {agent.name} · {agent.agency}
        </div>
        <div style={{ marginTop: 20, color: "#F5F7FA", fontSize: 22, fontWeight: 700 }}>{property.name}</div>
        <div style={{ color: "#8B92A5", fontSize: 14 }}>{property.suburb}</div>
      </header>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{
          margin: "0 0 12px", fontFamily: 'ui-serif, Georgia, serif',
          fontSize: 26, fontWeight: 500, lineHeight: 1.3, color: "#F5F7FA",
        }}>
          Ranks <span style={{ color: "#FB7185" }}>#{liveRank?.rank ?? "—"}</span> of {liveRank?.total ?? "—"} in your preview list
          {liveRank?.demo && (
            <span style={{ fontSize: 12, color: "#5C6477", fontWeight: 400, display: "block", marginTop: 8 }}>
              Demo stock — connect your feed to rank live listings.
            </span>
          )}
        </h2>
        {historical?.text && (
          <p style={{ color: "rgba(245,247,250,0.65)", fontSize: 15, lineHeight: 1.55, margin: 0 }}>
            {historical.text}
          </p>
        )}
      </section>

      <BadgeShelf badges={badges} score={score} />

      <section style={{
        padding: "20px 22px", borderRadius: 16,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 28,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8B92A5", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
          30-year cashflow
        </div>
        {renderBrick ? renderBrick(property) : null}
      </section>

      {st && (
        <section style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Suburb · {st.name}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {[
              ["Median price", `$${st.medianPrice?.toLocaleString()}`],
              ["Sales (12m)", st.salesLast12m],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 10, color: "#8B92A5", fontWeight: 700 }}>{k}</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer style={{ fontSize: 11, color: "#5C6477", lineHeight: 1.5 }}>
        Educational only — not financial advice.
        <button
          type="button"
          onClick={() => navigateTo({ type: "methodology" })}
          style={{ display: "block", marginTop: 8, background: "none", border: "none", color: "#FB7185", cursor: "pointer", padding: 0 }}
        >
          How we calculate ranks →
        </button>
      </footer>
    </div>
  );
}
