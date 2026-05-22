const KEY = "bricks-vendor-reports";

export function loadReports() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveReport(report) {
  const all = loadReports();
  all.push(report);
  localStorage.setItem(KEY, JSON.stringify(all));
  return report;
}

export function getReport(id) {
  return loadReports().find(r => r.id === id) || null;
}

export function newReportId() {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
