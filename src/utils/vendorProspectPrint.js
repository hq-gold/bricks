/**
 * Opens a print-ready vendor prospect sheet — for meetings and letterbox drops.
 * Copy is addressed to the owner and compares against live listings on The Bricks.
 */
export function printVendorProspect({
  property,
  agent,
  marketRank,
  marketTotal,
  breakEven,
  wealth10,
  wealth30,
  previewUrl,
  suburb: suburbOverride,
}) {
  const suburb = suburbOverride || property?.suburb?.split(",")[0] || "your suburb";
  const price = property?.price
    ? `$${Math.round(property.price / 1000).toLocaleString()}k`
    : "—";
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(previewUrl || (typeof window !== "undefined" ? window.location.origin : "https://thebricks.app"))}`;
  const rankLine = marketRank && marketTotal
    ? `#${marketRank} of ${marketTotal} properties live on The Bricks in ${suburb} right now`
    : `a strong position among live listings in ${suburb}`;
  const agentFirst = agent?.name?.split(" ")[0] || "your agent";

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Thinking of selling? — ${property?.name || "Your property"}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #111; margin: 0; padding: 0; background: #fff;
  }
  .sheet { max-width: 720px; margin: 0 auto; }
  .eyebrow {
    font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
    color: #e5485f; font-weight: 700; margin-bottom: 10px;
  }
  h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 28px; font-weight: 500; letter-spacing: -0.03em;
    margin: 0 0 6px; line-height: 1.15;
  }
  .sub { font-size: 14px; color: #555; margin-bottom: 22px; line-height: 1.5; }
  .hero {
    background: linear-gradient(135deg, #fdf2f4, #fff);
    border: 1px solid #f9d0d8; border-radius: 14px;
    padding: 20px 22px; margin-bottom: 18px;
  }
  .hero-stat {
    font-family: Georgia, serif; font-size: 21px; font-weight: 600;
    color: #c9374f; margin: 0 0 10px; line-height: 1.25;
  }
  .hero-copy { font-size: 13px; line-height: 1.6; color: #444; margin: 0 0 10px; }
  .hero-note {
    font-size: 12px; line-height: 1.55; color: #666; margin: 0;
    padding-top: 10px; border-top: 1px solid #f0d0d8;
  }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 18px; }
  .stat {
    border: 1px solid #e8e8e8; border-radius: 10px; padding: 14px 12px; text-align: center;
  }
  .stat-label {
    font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;
    color: #888; font-weight: 700; margin-bottom: 6px;
  }
  .stat-val { font-family: Georgia, serif; font-size: 20px; font-weight: 600; color: #111; }
  .agent {
    display: flex; gap: 16px; align-items: center;
    border-top: 1px solid #eee; padding-top: 18px; margin-top: 8px;
  }
  .agent-photo {
    width: 72px; height: 72px; border-radius: 12px; object-fit: cover;
    border: 2px solid #f9d0d8;
  }
  .agent-name { font-size: 16px; font-weight: 700; margin: 0 0 2px; }
  .agent-agency { font-size: 12px; color: #666; margin: 0 0 6px; }
  .agent-contact { font-size: 13px; font-weight: 600; color: #c9374f; }
  .qr { text-align: center; margin-left: auto; }
  .qr img { width: 88px; height: 88px; }
  .qr-cap { font-size: 9px; color: #888; margin-top: 4px; max-width: 100px; line-height: 1.35; }
  .fine {
    margin-top: 16px; font-size: 9px; line-height: 1.5; color: #999;
    border-top: 1px solid #eee; padding-top: 12px;
  }
</style>
</head><body>
<div class="sheet">
  <div class="eyebrow">Private · for the owner · not a live listing</div>
  <h1>Thinking of selling in ${suburb}?</h1>
  <div class="sub">
    ${property?.name || "Your property"} · Guide ${price}<br/>
    Prepared by ${agent?.name || "your agent"}, ${agent?.agency || ""}
  </div>

  <div class="hero">
    <div class="hero-stat">If you listed today, your home would rank ${rankLine}</div>
    <p class="hero-copy">
      Dear homeowner — ${agentFirst} modelled your property against <strong>every property buyers
      can see live on The Bricks right now</strong>. This is how attractive your home would look
      to an investor buyer compared to what's on the market today — not a valuation, but a
      side-by-side ranking using the same 30-year model buyers use.
    </p>
    <p class="hero-copy">
      ${breakEven
    ? `The model shows an investor would break even in <strong>year ${breakEven}</strong> — a compelling story for the right buyer.`
    : `The model shows this is a premium hold — the story is capital growth and position, not short-term cashflow.`}
      Scan the QR code to explore the full interactive 30-year model.
    </p>
    <p class="hero-note">
      This sheet is for a private conversation — not for social media. Figures are modelled only.
    </p>
  </div>

  <div class="grid">
    <div class="stat">
      <div class="stat-label">Vs live listings</div>
      <div class="stat-val">${marketRank ? `#${marketRank}` : "—"}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Equity by year 10</div>
      <div class="stat-val">${wealth10 != null ? `$${Math.round(wealth10 / 1000)}k` : "—"}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Equity by year 30</div>
      <div class="stat-val">${wealth30 != null ? `$${Math.round(wealth30 / 1000)}k` : "—"}</div>
    </div>
  </div>

  <div class="agent">
    ${agent?.photo ? `<img class="agent-photo" src="${agent.photo}" alt="${agent.name}"/>` : ""}
    <div>
      <p class="agent-name">${agent?.name || "Your agent"}</p>
      <p class="agent-agency">${agent?.agency || ""}</p>
      <div class="agent-contact">${agent?.phone || ""} · ${agent?.email || ""}</div>
    </div>
    <div class="qr">
      <img src="${qrSrc}" alt="QR code"/>
      <div class="qr-cap">Scan for the full 30-year model on The Bricks</div>
    </div>
  </div>

  <div class="fine">
    Modelled figures only — not financial or valuation advice. Ranking compares against properties
    currently live on The Bricks in ${suburb}. Actual sale price and buyer demand may differ.
    Powered by The Bricks · Australia's only 30-year property modeller.
  </div>
</div>
<script>window.onload = () => { window.print(); };</script>
</body></html>`;

  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
