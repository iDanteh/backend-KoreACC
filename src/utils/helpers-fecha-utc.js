// helpers-fecha-utc.js

function parseDateUTC(dateStr) {
  // "YYYY-MM-DD" -> Date en UTC exacto (00:00:00Z)
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmtUTC(d) {
  // Date -> "YYYY-MM-DD" sin desfases
  return d.toISOString().slice(0, 10);
}

export function addDaysUTC(dateStr, days) {
  const d = parseDateUTC(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return fmtUTC(d);
}

export function endOfMonthUTC(dateStr) {
  const d = parseDateUTC(dateStr);
  // Día 0 del mes siguiente = último día del mes actual (en UTC)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return fmtUTC(last);
}

export function startOfNextMonthUTC(dateStr) {
  const d = parseDateUTC(dateStr);
  const firstNext = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return fmtUTC(firstNext);
}
