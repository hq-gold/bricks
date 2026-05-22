import React from "react";
import { motion } from "framer-motion";
import { Phone, Mail, ArrowLeft, Building2 } from "lucide-react";

/** Agent headshot — photo when set, initials fallback. */
export function AgentAvatar({ agent, size = 44, radius = 999 }) {
  const initials = (agent?.name || "A").split(" ").map(s => s[0]).join("").slice(0, 2);
  if (agent?.photo) {
    return (
      <img
        src={agent.photo}
        alt={agent.name || "Agent"}
        style={{
          width: size, height: size, borderRadius: radius,
          objectFit: "cover", display: "block", flexShrink: 0,
          boxShadow: "0 0 0 2px rgba(251,113,133,0.35)",
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: "linear-gradient(135deg, #FB7185 0%, #C9374F 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: 'ui-serif, Georgia, serif',
      fontSize: size * 0.38, fontWeight: 500, color: "#FFFFFF",
      letterSpacing: "-0.03em",
      boxShadow: "0 0 0 2px rgba(251,113,133,0.35)",
    }}>
      {initials}
    </div>
  );
}

/** Slim top bar for buyer-facing agent previews — no site nav, just the agent. */
export function AgentShareHeader({ agent, onBack, backLabel = "Back" }) {
  return (
    <div className="agent-share-header" style={{
      position: "sticky", top: 0, zIndex: 40,
      background: "rgba(5,7,10,0.88)",
      backdropFilter: "blur(16px) saturate(140%)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      padding: "12px 20px",
    }}>
      <div style={{
        maxWidth: 920, margin: "0 auto",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        {onBack && (
          <button type="button" onClick={onBack} style={{
            cursor: "pointer", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999,
            padding: "7px 12px", color: "rgba(245,247,250,0.75)",
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 12.5, fontWeight: 600, flexShrink: 0,
          }}>
            <ArrowLeft size={14} strokeWidth={2.2} />
            {backLabel}
          </button>
        )}
        <AgentAvatar agent={agent} size={40} radius={12} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: "#F5F7FA",
            letterSpacing: "-0.02em", lineHeight: 1.2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {agent.name}
          </div>
          <div style={{
            fontSize: 11.5, color: "rgba(245,247,250,0.5)", marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {agent.agency}
          </div>
        </div>
        <motion.a
          href={`tel:${(agent.phone || "").replace(/\s+/g, "")}`}
          whileTap={{ scale: 0.96 }}
          style={{
            flexShrink: 0, textDecoration: "none",
            background: "rgba(251,113,133,0.15)",
            border: "1px solid rgba(251,113,133,0.35)",
            borderRadius: 999, padding: "8px 14px",
            color: "#FECDD3", fontSize: 12, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
          <Phone size={13} strokeWidth={2.4} />
          Call
        </motion.a>
      </div>
    </div>
  );
}

/** Fixed bottom dock — always-visible agent contact on buyer share pages. */
export function AgentContactDock({ agent, propertyName }) {
  const first = agent?.name?.split(" ")[0] || "agent";
  return (
    <div className="agent-contact-dock" style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 45,
      background: "rgba(8,10,14,0.94)",
      backdropFilter: "blur(20px) saturate(140%)",
      borderTop: "1px solid rgba(255,255,255,0.1)",
      padding: "12px 16px max(12px, env(safe-area-inset-bottom))",
      boxShadow: "0 -12px 40px -8px rgba(0,0,0,0.6)",
    }}>
      <div style={{
        maxWidth: 920, margin: "0 auto",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <AgentAvatar agent={agent} size={48} radius={14} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F5F7FA" }}>
            Questions? Talk to {first}
          </div>
          <div style={{
            fontSize: 11, color: "rgba(245,247,250,0.45)", marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {propertyName ? `${propertyName} · ` : ""}{agent.agency}
          </div>
        </div>
        <motion.a
          href={`tel:${(agent.phone || "").replace(/\s+/g, "")}`}
          whileTap={{ scale: 0.96 }}
          style={{
            flexShrink: 0, textDecoration: "none",
            background: "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)",
            color: "#FFFFFF", borderRadius: 12,
            padding: "12px 16px", fontSize: 13, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 7,
            boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset, 0 10px 24px -10px rgba(244,63,94,0.7)",
          }}>
          <Phone size={15} strokeWidth={2.4} />
          {agent.phone}
        </motion.a>
        <motion.a
          href={`mailto:${agent.email}?subject=${encodeURIComponent(propertyName || "Property enquiry")}`}
          whileTap={{ scale: 0.96 }}
          aria-label="Email agent"
          style={{
            flexShrink: 0, textDecoration: "none",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12, width: 44, height: 44,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "#F5F7FA",
          }}>
          <Mail size={17} strokeWidth={2.2} />
        </motion.a>
      </div>
    </div>
  );
}

/** Prominent listing-agent card for property drill-down pages. */
export function ListingAgentPromo({ agent, propertyName, suburb }) {
  if (!agent?.name) return null;
  const agencyShort = (agent.agency || "").split("·")[0].trim();
  const first = agent.name.split(" ")[0];

  return (
    <div style={{
      marginTop: 40,
      borderRadius: 22, overflow: "hidden",
      background: "linear-gradient(135deg, rgba(251,113,133,0.12) 0%, rgba(251,113,133,0.03) 55%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(251,113,133,0.28)",
      boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset, 0 30px 70px -40px rgba(0,0,0,0.75)",
    }}>
      <div className="listing-agent-promo" style={{
        display: "grid", gridTemplateColumns: "auto 1fr", gap: 0, alignItems: "stretch",
      }}>
        <div style={{
          padding: "28px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.2)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          minWidth: 148,
        }}>
          <AgentAvatar agent={agent} size={96} radius={20} />
          <div style={{
            marginTop: 14, textAlign: "center",
            fontSize: 15, fontWeight: 700, color: "#F5F7FA", letterSpacing: "-0.02em",
          }}>
            {agent.name}
          </div>
        </div>

        <div style={{ padding: "26px 28px 26px 24px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "rgba(251,113,133,0.18)",
              border: "1px solid rgba(251,113,133,0.35)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <Building2 size={16} color="#FB7185" strokeWidth={2.2} />
            </div>
            <div style={{
              fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#FB7185", fontWeight: 700,
            }}>
              Listed by
            </div>
          </div>

          <div style={{
            fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
            fontSize: "clamp(22px, 3vw, 28px)",
            fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.12,
            color: "#F5F7FA", marginBottom: 8,
          }}>
            {agencyShort || agent.agency}
          </div>

          <p style={{
            margin: "0 0 20px", fontSize: 14, lineHeight: 1.55,
            color: "rgba(245,247,250,0.58)", maxWidth: 480,
          }}>
            {propertyName ? (
              <>Questions about <strong style={{ color: "rgba(245,247,250,0.85)", fontWeight: 600 }}>{propertyName}</strong>
              {suburb ? ` in ${suburb.split(",")[0]}` : ""}? {first} has the full 30-year model and can walk you through inspections.</>
            ) : (
              <>Talk to {first} about this listing — full 30-year investment model included.</>
            )}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {agent.phone && (
              <motion.a
                href={`tel:${agent.phone.replace(/\s+/g, "")}`}
                whileTap={{ scale: 0.97 }}
                style={{
                  textDecoration: "none",
                  background: "linear-gradient(135deg, #FB7185 0%, #E5485F 55%, #C9374F 100%)",
                  color: "#FFFFFF", borderRadius: 12,
                  padding: "13px 20px", fontSize: 14, fontWeight: 700,
                  display: "inline-flex", alignItems: "center", gap: 8,
                  boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset, 0 12px 28px -12px rgba(244,63,94,0.75)",
                }}>
                <Phone size={16} strokeWidth={2.4} />
                Call {agent.phone}
              </motion.a>
            )}
            {agent.email && (
              <motion.a
                href={`mailto:${agent.email}?subject=${encodeURIComponent(propertyName || "Property enquiry")}`}
                whileTap={{ scale: 0.97 }}
                style={{
                  textDecoration: "none",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#F5F7FA", borderRadius: 12,
                  padding: "13px 18px", fontSize: 14, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}>
                <Mail size={16} strokeWidth={2.2} />
                Email {first}
              </motion.a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
