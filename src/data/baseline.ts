// Measured baselines.
//
// Each level counts as one figure here (no ranges), so a baseline is a single
// number: Clear 0, A few 1.5, Moderate 3.5, A lot 5. "A lot" uses its minimum,
// which keeps baselines, and so savings, on the conservative side.
//
// 1. First 3 months: average drinks a week over the first 13 weeks of
//    tracking. Fixed once those weeks are over, so it never drifts. Used as
//    a savings baseline.
// 2. Momentum: the last 13 weeks against the 13 before. Moves with time, so
//    it's shown in drinks, as a direction — never as a baseline for money.

import { Data } from './compute';
import { addDays, type Iso } from './dates';

export const MIDPOINT = { clear: 0, 'a-few': 1.5, moderate: 3.5, 'a-lot': 5 } as const;
export const WINDOW_DAYS = 91; // 13 weeks
export const FIRST3_MIN_LOGGED = 60;
export const MOMENTUM_MIN_LOGGED = 30;

/** Average drinks a week over the logged days in [start, end], or null if none. */
export function drinksPerWeekMid(d: Data, start: Iso, end: Iso): { perWeek: number; logged: number } {
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

export type FirstThreeMonths =
  | { status: 'none' }
  | { status: 'waiting'; start: Iso; end: Iso; logged: number; needed: number; complete: boolean; skipped: string[] }
  | { status: 'ready'; start: Iso; end: Iso; logged: number; perWeek: number; skipped: string[] };

/**
 * The first 13 weeks from the first logged day. Ready once they're over and
 * at least 60 of their days are logged. A chosen challenge month (a clear
 * January, say) isn't typical drinking, so if one falls inside the window,
 * the window starts the day after it instead.
 */
export function firstThreeMonths(
  d: Data,
  today: Iso,
  skip: { start: Iso; end: Iso; ym: string }[] = [],
): FirstThreeMonths {
  const first = d.earliest;
  if (!first) return { status: 'none' };
  let start = first;
  const skipped: string[] = [];
  for (let moved = true; moved; ) {
    moved = false;
    for (const r of skip) {
      if (r.start <= addDays(start, WINDOW_DAYS - 1) && r.end >= start) {
        start = addDays(r.end, 1);
        skipped.push(r.ym);
        moved = true;
      }
    }
  }
  const end = addDays(start, WINDOW_DAYS - 1);
  const { perWeek, logged } = drinksPerWeekMid(d, start, end < today ? end : today);
  const complete = today > end;
  if (!complete || logged < FIRST3_MIN_LOGGED) {
    return { status: 'waiting', start, end, logged, needed: FIRST3_MIN_LOGGED, complete, skipped };
  }
  return { status: 'ready', start, end, logged, perWeek, skipped };
}

/**
 * Last 13 weeks (ending today) against the 13 before. Null unless both have
 * at least 30 logged days. diff < 0 means fewer drinks lately.
 */
export function momentum(d: Data, today: Iso): { recent: number; previous: number; diff: number } | null {
  const recentStart = addDays(today, -(WINDOW_DAYS - 1));
  const prevEnd = addDays(recentStart, -1);
  const prevStart = addDays(prevEnd, -(WINDOW_DAYS - 1));
  const r = drinksPerWeekMid(d, recentStart, today);
  const p = drinksPerWeekMid(d, prevStart, prevEnd);
  if (r.logged < MOMENTUM_MIN_LOGGED || p.logged < MOMENTUM_MIN_LOGGED) return null;
  return { recent: r.perWeek, previous: p.perWeek, diff: r.perWeek - p.perWeek };
}

/** "About 2 fewer drinks a week than the previous 3 months"; within ½ a drink: "About the same…". */
export function momentumText(diff: number): string {
  if (Math.abs(diff) < 0.5) return 'About the same as the previous 3 months';
  const n = Math.max(1, Math.round(Math.abs(diff)));
  return `About ${n} ${diff < 0 ? 'fewer' : 'more'} drink${n === 1 ? '' : 's'} a week than the previous 3 months`;
}


/** Chosen challenge months inside a comparison of the last `windowDays` with the `windowDays` before. */
export function momentumIncludes(today: Iso, ranges: { start: Iso; end: Iso; ym: string }[], windowDays = WINDOW_DAYS): string[] {
  const from = addDays(today, -(2 * windowDays - 1));
  return ranges.filter((r) => r.start <= today && r.end >= from).map((r) => r.ym);
}
