/** Hash-based public routes — no extra deps. #/leaderboard/bondi, #/report/new, #/methodology */

export function parseRoute() {
  const hash = (window.location.hash || "").replace(/^#\/?/, "");
  if (!hash) return { type: "app" };
  const parts = hash.split("/").filter(Boolean);
  const [head, ...rest] = parts;
  if (head === "leaderboard") {
    const suburb = rest[0] ? decodeURIComponent(rest[0]).toLowerCase() : "overall";
    return { type: "leaderboard", suburb };
  }
  if (head === "suburb" && rest[0]) {
    return { type: "suburb", suburb: decodeURIComponent(rest[0]).toLowerCase() };
  }
  if (head === "methodology") {
    return { type: "methodology" };
  }
  if (head === "report") {
    if (rest[0] === "new") return { type: "report-new" };
    if (rest[0]) return { type: "report", id: rest[0] };
  }
  if (head === "agent" && rest[0] === "new-report") {
    return { type: "report-new" };
  }
  return { type: "app" };
}

export function navigateTo(route) {
  let hash = "";
  switch (route.type) {
    case "leaderboard":
      hash = `/leaderboard/${encodeURIComponent(route.suburb)}`;
      break;
    case "suburb":
      hash = `/suburb/${encodeURIComponent(route.suburb)}`;
      break;
    case "methodology":
      hash = "/methodology";
      break;
    case "report-new":
      hash = "/agent/new-report";
      break;
    case "report":
      hash = `/report/${route.id}`;
      break;
    case "app":
      hash = "";
      break;
    default:
      break;
  }
  if (hash) window.location.hash = hash;
  else {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
