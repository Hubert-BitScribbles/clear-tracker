// Challenges: opt-in, all-or-nothing goals the user chooses on the
// Challenges screen. Nothing here shows unless chosen.
//
// - Clear weekend: Friday, Saturday and Sunday all logged clear.
// - Clear week: Monday to Sunday all logged clear.
//   Both are taken on from a start date, like an intention: the current
//   weekend/week if nothing in it is logged yet, otherwise the next one.
//   Only weekends/weeks inside a "run" (from switching on to switching
//   off) count, so nothing is awarded retroactively; earned ones stay.
// - Clear month: a calendar month the user picks; earned only if every day
//   of it is logged clear. Days not yet logged don't end it — they can be
//   filled in — but a drinking day does.

import { Data } from './compute';
import { addDays, daysInMonth, isoOf, mondayOf, type Iso } from './dates';

export const WEEKEND_TIERS = [1, 5, 15, 40];
export const WEEK_TIERS = [1, 3, 10, 25];

/** A stretch of time a weekend/week challenge was taken on: from its first
 *  Friday (weekends) or Monday (weeks), until it was switched off (open = on). */
export interface Run {
  from: Iso;
  to?: Iso;
}
export interface ChallengeSettings {
  weekendRuns: Run[];
  weekRuns: Run[];
  months: string[]; // 'YYYY-MM', sorted
}
export const NO_CHALLENGES: ChallengeSettings = { weekendRuns: [], weekRuns: [], months: [] };
export const isOn = (runs: Run[]) => runs.length > 0 && !runs[runs.length - 1].to;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const parseRuns = (x: unknown): Run[] =>
  Array.isArray(x)
    ? x.filter((r) => r && ISO_RE.test(r.from) && (r.to === undefined || ISO_RE.test(r.to))).map((r) => ({ from: r.from, ...(r.to ? { to: r.to } : {}) }))
    : [];

export function parseChallenges(raw: string): ChallengeSettings {
  try {
    const c = JSON.parse(raw);
    const months = Array.isArray(c?.months) ? c.months.filter((m: unknown) => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m)) : [];
    return { weekendRuns: parseRuns(c?.weekendRuns), weekRuns: parseRuns(c?.weekRuns), months: [...new Set<string>(months)].sort() };
  } catch {
    return NO_CHALLENGES;
  }
}

/** The Friday of the weekend that's current (Fri–Sun) or coming up (Mon–Thu). */
export function currentWeekendFriday(today: Iso): Iso {
  const mon = mondayOf(today);
  return addDays(mon, 4);
}

/** Where a new weekend run starts: this weekend if its Friday isn't logged yet, else next. */
export function weekendStart(d: Data, today: Iso): Iso {
  const fri = currentWeekendFriday(today);
  return d.status(fri) === null ? fri : addDays(fri, 7);
}

/** Where a new week run starts: this week if nothing in it is logged yet, else next Monday. */
export function weekStart(d: Data, today: Iso): Iso {
  const mon = mondayOf(today);
  for (let i = 0; i < 7; i++) if (d.status(addDays(mon, i)) !== null) return addDays(mon, 7);
  return mon;
}

/** Switch a run on (from the right start date) or off (ending today). */
export function toggleRun(runs: Run[], on: boolean, start: Iso, today: Iso): Run[] {
  if (on === isOn(runs)) return runs;
  if (on) return [...runs, { from: start }];
  const last = runs[runs.length - 1];
  // Switched off before it even started: drop it rather than keep an empty run.
  if (last.from > today) return runs.slice(0, -1);
  return [...runs.slice(0, -1), { from: last.from, to: today }];
}

const inRuns = (runs: Run[], first: Iso, last: Iso) => runs.some((r) => first >= r.from && (!r.to || last <= r.to));

const clear = (d: Data, iso: Iso) => d.status(iso) === 'clear';

/** Sundays ending a clear Friday–Sunday inside a run, oldest first. Counts once Sunday is logged. */
export function clearWeekends(d: Data, today: Iso, runs: Run[]): Iso[] {
  const out: Iso[] = [];
  if (!runs.length) return out;
  for (let fri = runs[0].from; addDays(fri, 2) <= today; fri = addDays(fri, 7)) {
    const sun = addDays(fri, 2);
    if (inRuns(runs, fri, sun) && clear(d, fri) && clear(d, addDays(fri, 1)) && clear(d, sun)) out.push(sun);
  }
  return out;
}

/** Sundays ending a fully clear Monday–Sunday week inside a run, oldest first. */
export function clearWeeks(d: Data, today: Iso, runs: Run[]): Iso[] {
  const out: Iso[] = [];
  if (!runs.length) return out;
  for (let mon = runs[0].from; addDays(mon, 6) <= today; mon = addDays(mon, 7)) {
    const sun = addDays(mon, 6);
    let all = inRuns(runs, mon, sun);
    for (let i = 0; i < 7 && all; i++) all = clear(d, addDays(mon, i));
    if (all) out.push(sun);
  }
  return out;
}

export type SpanStatus =
  | { state: 'upcoming'; first: Iso; last: Iso }
  | { state: 'under-way'; first: Iso; last: Iso; toLog: number }
  | { state: 'earned'; first: Iso; last: Iso }
  | { state: 'not-this-time'; first: Iso; last: Iso };

/** The current (or next) weekend/week of an active run, and where it stands. */
export function currentSpan(d: Data, today: Iso, runs: Run[], kind: 'weekend' | 'week'): SpanStatus | null {
  if (!isOn(runs)) return null;
  const from = runs[runs.length - 1].from;
  let first = kind === 'weekend' ? currentWeekendFriday(today) : mondayOf(today);
  if (first < from) first = from;
  const last = addDays(first, kind === 'weekend' ? 2 : 6);
  if (today < first) return { state: 'upcoming', first, last };
  let toLog = 0;
  let allClear = true;
  for (let x = first; x <= last && x <= today; x = addDays(x, 1)) {
    const s = d.status(x);
    if (s === 'drinking') return { state: 'not-this-time', first, last };
    if (s === null) {
      allClear = false;
      if (x < today) toLog++;
    }
  }
  if (today >= last && allClear) return { state: 'earned', first, last };
  return { state: 'under-way', first, last, toLog };
}

export type MonthChallenge =
  | { ym: string; state: 'upcoming'; starts: Iso }
  | { ym: string; state: 'under-way'; day: number; days: number; toLog: number }
  | { ym: string; state: 'to-log'; toLog: number } // month over, some days not logged yet
  | { ym: string; state: 'earned'; date: Iso }
  | { ym: string; state: 'ended' }; // a day in it wasn't clear

export function monthChallenge(d: Data, today: Iso, ym: string): MonthChallenge {
  const [y, m] = ym.split('-').map(Number);
  const start = isoOf(y, m, 1);
  const end = isoOf(y, m, daysInMonth(y, m));
  if (today < start) return { ym, state: 'upcoming', starts: start };
  const last = today < end ? today : end;
  let toLog = 0;
  for (let x = start; x <= last; x = addDays(x, 1)) {
    const s = d.status(x);
    if (s === 'drinking') return { ym, state: 'ended' };
    // Today not logged yet is normal, not "to log".
    if (s === null && x < today) toLog++;
  }
  if (today <= end) return { ym, state: 'under-way', day: Number(today.slice(8, 10)), days: daysInMonth(y, m), toLog };
  if (toLog > 0 || d.status(end) === null) return { ym, state: 'to-log', toLog: Math.max(toLog, 1) };
  return { ym, state: 'earned', date: end };
}

/** Chosen months as [start, end] date ranges (for the baseline and momentum). */
export function chosenMonthRanges(c: ChallengeSettings): { start: Iso; end: Iso; ym: string }[] {
  return c.months.map((ym) => {
    const [y, m] = ym.split('-').map(Number);
    return { ym, start: isoOf(y, m, 1), end: isoOf(y, m, daysInMonth(y, m)) };
  });
}
