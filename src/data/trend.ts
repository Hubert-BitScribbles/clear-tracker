// How drinking (and so savings) is moving over time, for the Trends cards.
// Single figures per level, as for the momentum line: Clear 0, A few 1.5,
// Moderate 3.5, A lot 5 (its minimum). Every figure is a weekly rate over
// logged days, so periods with more or fewer logged days compare fairly.

import { MIDPOINT } from './baseline';
import { Data } from './compute';
import { addDays, daysInMonth, isoOf, type Iso } from './dates';

export const MIN_LOGGED_MONTH = 7;

/** Drinks a week over the logged days in [start, end], with how many were logged. */
export function rate(d: Data, start: Iso, end: Iso): { perWeek: number; logged: number } {
  let drinks = 0;
  let logged = 0;
  for (const iso of d.datesAsc) {
    if (iso < start || iso > end) continue;
    const e = d.byDate.get(iso)!;
    drinks += e.status === 'clear' ? 0 : MIDPOINT[e.amount ?? 'a-lot'];
    logged++;
  }
  return { perWeek: logged ? (drinks / logged) * 7 : 0, logged };
}

export interface MonthPoint {
  year: number;
  month: number;
  perWeek: number | null; // null with fewer than 7 logged days
  logged: number;
  soFar: boolean; // the current month, still running
  /** The month before, for "about 2 fewer drinks a week than August". perWeek null with fewer than 7 logged days. */
  prev: { year: number; month: number; perWeek: number | null };
}

/** Drinks a week for each month in a span (up to today). */
export function monthlyRates(d: Data, today: Iso, months: { year: number; month: number }[]): MonthPoint[] {
  return months
    .filter(({ year, month }) => isoOf(year, month, 1) <= today)
    .map(({ year, month }) => {
      const start = isoOf(year, month, 1);
      const endFull = isoOf(year, month, daysInMonth(year, month));
      const end = endFull < today ? endFull : today;
      const r = rate(d, start, end);
      const py = month === 1 ? year - 1 : year;
      const pm = month === 1 ? 12 : month - 1;
      const pr = rate(d, isoOf(py, pm, 1), isoOf(py, pm, daysInMonth(py, pm)));
      return {
        year, month, perWeek: r.logged >= MIN_LOGGED_MONTH ? r.perWeek : null, logged: r.logged, soFar: endFull >= today,
        prev: { year: py, month: pm, perWeek: pr.logged >= MIN_LOGGED_MONTH ? pr.perWeek : null },
      };
    });
}

/** The months to chart: a calendar year, or the last 12 months for All time. */
export function chartMonths(today: Iso, scope: number | 'all'): { year: number; month: number }[] {
  if (scope !== 'all') return Array.from({ length: 12 }, (_, i) => ({ year: scope, month: i + 1 }));
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  return Array.from({ length: 12 }, (_, i) => {
    const k = y * 12 + (m - 1) - (11 - i);
    return { year: Math.floor(k / 12), month: (k % 12) + 1 };
  });
}

export interface Change {
  recent: number; // drinks a week
  previous: number;
  diff: number; // recent − previous; negative = fewer drinks lately
}

/** The last `days` (ending today) against the `days` before. Null without enough logged days in each. */
export function windowChange(d: Data, today: Iso, days: number, minLogged: number): Change | null {
  const recentStart = addDays(today, -(days - 1));
  const prevEnd = addDays(recentStart, -1);
  const r = rate(d, recentStart, today);
  const p = rate(d, addDays(prevEnd, -(days - 1)), prevEnd);
  if (r.logged < minLogged || p.logged < minLogged) return null;
  return { recent: r.perWeek, previous: p.perWeek, diff: r.perWeek - p.perWeek };
}

export const THREE_MONTHS = 91; // 13 weeks
export const SIX_MONTHS = 182; // 26 weeks
