export function formatDateRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  return `${s.toLocaleString(undefined, opts)} – ${e.toLocaleString(undefined, opts)}`;
}

export function isUpcoming(endDateTime) {
  return new Date(endDateTime) >= new Date();
}

/** User may cancel registration only before the event start time. */
export function eventNotStartedYet(startDateTime) {
  return new Date(startDateTime) > new Date();
}

/** Value for `<input type="datetime-local" max={...} />` in the user's local timezone. */
export function maxDatetimeLocalValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
