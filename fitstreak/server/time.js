// Central clock. Every "now" in the server goes through here so the dev
// time-travel offset (POST /api/dev/time-travel) affects all business rules.
//
// "Local date" for calendar/streak/cycle evaluation = the server process's
// local timezone (set TZ env, e.g. TZ=Asia/Jakarta, to change it).

const DAY_MS = 86_400_000;
let offsetMs = 0;

export function now() {
  return Date.now() + offsetMs;
}

export function nowIso() {
  return new Date(now()).toISOString();
}

export function travel(days) {
  offsetMs += days * DAY_MS;
  return offsetMs;
}

export function resetTravel() {
  offsetMs = 0;
}

export function offsetDays() {
  return offsetMs / DAY_MS;
}

/** YYYY-MM-DD of a timestamp (ms or ISO string) in the process local timezone. */
export function localDate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today() {
  return localDate(now());
}

export { DAY_MS };
