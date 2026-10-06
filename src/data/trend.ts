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
      return { year, month, perWeek: r.logged >= MIN_LOGGED_MONTH ? r.perWeek : null, logged: r.logged, soFar: endFull >= today };
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

/**
 * This month so far against last month — or, if this month has fewer than
 * 7 logged days yet, last month against the one before.
 */
export function monthChange(d: Data, today: Iso): (Change & { month: number; vsMonth: number; soFar: boolean }) | null {
  const [cur, prev, prev2] = monthlyRates(d, today, chartMonths(today, 'all')).slice(-3).reverse();
  if (cur?.perWeek != null && prev?.perWeek != null) {
    return { recent: cur.perWeek, previous: prev.perWeek, diff: cur.perWeek - prev.perWeek, month: cur.month, vsMonth: prev.month, soFar: true };
  }
  if (prev?.perWeek != null && prev2?.perWeek != null) {
    return { recent: prev.perWeek, previous: prev2.perWeek, diff: prev.perWeek - prev2.perWeek, month: prev.month, vsMonth: prev2.month, soFar: false };
  }
  return null;
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
