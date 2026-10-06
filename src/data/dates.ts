// Calendar-date helpers. Every date in the app is a 'YYYY-MM-DD' string.
//
// All arithmetic goes through UTC midnight, where every day is exactly
// 24 hours. Local-time Date maths breaks on daylight-saving days (a 23- or
// 25-hour day), which is how the native app's longest clear-day streak
// came to split a run in two every March. Keeping one module for this means
// no function can quietly use the unsafe pattern again.
//
// The only place local time is consulted is todayIso(): "today" is the
// user's own calendar day.

export type Iso = string;

const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

function toUtc(iso: Iso): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): Iso {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** The user's current local calendar date. */
export function todayIso(now: Date = new Date()): Iso {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The local calendar date on which an instant (e.g. created_at) happened. */
export function localDateOf(instant: string | Date): Iso {
  return todayIso(typeof instant === 'string' ? new Date(instant) : instant);
}

export function isoOf(year: number, month: number, day: number): Iso {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function addDays(iso: Iso, n: number): Iso {
  return fromUtc(toUtc(iso) + n * DAY_MS);
}

/** Whole days from a to b (b later = positive). */
export function daysBetween(a: Iso, b: Iso): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday, matching JavaScript's getDay(). */
export function weekdayOf(iso: Iso): number {
  return new Date(toUtc(iso)).getUTCDay();
}

/** The Monday of the week containing iso. Weeks run Monday–Sunday. */
export function mondayOf(iso: Iso): Iso {
  const wd = weekdayOf(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}

export function sundayOf(iso: Iso): Iso {
  return addDays(mondayOf(iso), 6);
}

export function yearOf(iso: Iso): number {
  return Number(iso.slice(0, 4));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
