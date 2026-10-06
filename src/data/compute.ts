// All of Clear Tracker's computation, ported from the native database.ts.
//
// Pure functions: each takes a snapshot of the data plus "today" and returns
// a result. No storage access, no clock reads. That keeps them testable and
// lets database.ts load the data once and compute in memory, as the porting
// plan recommends ("keep the aggregation in JavaScript").
//
// Behaviour matches the native code function for function, checked by
// differential tests against the original. Two deliberate differences, both
// bug fixes, are marked FIX below. (Native's check-in answers — energy,
// evening, notes — are gone; amounts are part of the day itself.)

import type { DayEntryRow, DayStatus, DrinkAmount, IntentionRow } from './db';
import {
  addDays,
  daysBetween,
  daysInMonth,
  isoOf,
  localDateOf,
  mondayOf,
  weekdayOf,
  yearOf,
  type Iso,
} from './dates';

export const DEFAULT_WEEKLY_TARGET = 3;

// Widening ladders so later tiers stay a real distance apart.
// CHANGE from native: milestone ladders are fixed round numbers, the same for
// everyone. Native scaled them by the weekly intention (42, 72, 210 … clear
// days at an intention of 3), which made them feel arbitrary and move when
// the intention changed. Week milestones (weeks met, streaks, beyond target)
// are already relative to the intention, so the counts don't need to be.
export const CLEAR_DAY_TIERS = [7, 14, 30, 50, 100, 150, 200, 365, 500, 750, 1000];
export const LOGGING_TIERS = [7, 14, 30, 60, 100, 180, 365, 500, 730, 1095];
/** Weeks in a row meeting the intention. */
export const STREAK_TIERS_WEEKS = [2, 4, 8, 13, 26, 52];

// ---- Snapshot ----------------------------------------------------------

export interface Snapshot {
  entries: DayEntryRow[];
  intentions: IntentionRow[];
}

/** Indexes built once per snapshot so repeated lookups are cheap. */
export class Data {
  readonly byDate = new Map<Iso, DayEntryRow>();
  readonly datesAsc: Iso[];
  private readonly ledger: IntentionRow[];

  constructor(readonly snap: Snapshot) {
    for (const e of snap.entries) this.byDate.set(e.entry_date, e);
    this.datesAsc = [...this.byDate.keys()].sort();
    // Newest effective date first; ties broken by the later-created row,
    // as in the native ORDER BY effective_date DESC, created_at DESC.
    this.ledger = [...snap.intentions].sort(
      (a, b) =>
        b.effective_date.localeCompare(a.effective_date) ||
        b.created_at.localeCompare(a.created_at),
    );
  }

  get earliest(): Iso | null {
    return this.datesAsc[0] ?? null;
  }

  status(iso: Iso): DayStatus | null {
    return this.byDate.get(iso)?.status ?? null;
  }

  /**
   * Temporal goal ledger: the target for a week is the intention with the
   * latest effective_date at or before that week's Monday.
   *
   * CHANGE from native: weeks before the first intention (days logged from
   * before the app was first used) have no intention — null — instead of a
   * default of 3 nobody chose. They aren't measured: not met, not missed.
   */
  targetForWeek(weekStart: Iso): number | null {
    for (const i of this.ledger) {
      if (i.effective_date <= weekStart) return i.weekly_target;
    }
    return null;
  }

  /**
   * The target used to size tiers (clear-day counts and the like): the week's
   * intention, or before the first one, the first one. Never null.
   */
  scaleTarget(weekStart: Iso): number {
    return this.targetForWeek(weekStart) ?? this.ledger[this.ledger.length - 1]?.weekly_target ?? DEFAULT_WEEKLY_TARGET;
  }

  /** Monday of the first week with an intention (the week the app was first used). */
  get intentionStart(): Iso | null {
    return this.ledger.length ? this.ledger[this.ledger.length - 1].effective_date : null;
  }

  clearCountBetween(start: Iso, end: Iso): number {
    let n = 0;
    for (let d = start; d <= end; d = addDays(d, 1)) if (this.status(d) === 'clear') n++;
    return n;
  }

  anyEntryBetween(start: Iso, end: Iso): boolean {
    for (let d = start; d <= end; d = addDays(d, 1)) if (this.byDate.has(d)) return true;
    return false;
  }

  /** A week with no intention is never met (nor missed: callers skip it). */
  weekMet(weekStart: Iso): boolean {
    const target = this.targetForWeek(weekStart);
    return target !== null && this.clearCountBetween(weekStart, addDays(weekStart, 6)) >= target;
  }

  /**
   * Weeks measured against an intention: from the first intention's week (or
   * the earliest entry's, if later) up to, not including, today's week.
   */
  intentionWeeks(today: Iso): Iso[] {
    const start = this.intentionStart;
    return start === null ? [] : this.completedWeeks(today).filter((w) => w >= start);
  }

  /** Mondays from the earliest entry's week up to, not including, today's week. */
  completedWeeks(today: Iso): Iso[] {
    if (!this.earliest) return [];
    const out: Iso[] = [];
    const current = mondayOf(today);
    for (let w = mondayOf(this.earliest); w < current; w = addDays(w, 7)) out.push(w);
    return out;
  }
}

// ---- Types kept from the native API --------------------------------------

export interface WeekAlignment {
  weekStartIso: Iso;
  count: number;
  target: number | null; // null: before the first intention
  hasEntries?: boolean;
}
export interface DayOfWeekStats {
  weekday: number; // 0 = Sunday … 6 = Saturday
  clear: number;
  drinking: number;
}
export interface BeyondTargetInstance {
  weekStartIso: Iso;
  weekEndIso: Iso;
  count: number;
  target: number;
}
export interface MilestonesData {
  totalClearDays: number;
  firstClearDate: Iso | null;
  firstClearWeekEndIso: Iso | null;
  beyondTargetInstances: BeyondTargetInstance[]; // newest first
}
export interface LoggingTierEarn {
  tierDays: number;
  reachedDateIso: Iso;
}
export interface StreakTierEarn {
  tierWeeks: number;
  reachedWeekEndIso: Iso;
}
export interface DayCell {
  status: DayStatus;
  amount: DrinkAmount | null;
}
export interface SameDayStat {
  count: number;
  mostRecent: Iso | null;
}
export interface FullyLoggedMonth {
  year: number;
  month: number;
}
export interface TrackingAnniversary {
  years: number;
  reachedIso: Iso;
  reached: boolean;
}

// ---- Helpers ------------------------------------------------------------

const inYear = (year?: number) => (e: DayEntryRow) =>
  year === undefined || yearOf(e.entry_date) === year;

const monthPrefix = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-`;

/** Lengths of runs of consecutive dates in an ascending, distinct list. */
function runs(datesAsc: Iso[]): { start: number; length: number }[] {
  const out: { start: number; length: number }[] = [];
  let start = 0;
  for (let i = 1; i <= datesAsc.length; i++) {
    const consecutive = i < datesAsc.length && daysBetween(datesAsc[i - 1], datesAsc[i]) === 1;
    if (!consecutive) {
      out.push({ start, length: i - start });
      start = i;
    }
  }
  return datesAsc.length ? out : [];
}


// ---- Month and year views ------------------------------------------------

export function entriesForMonth(d: Data, year: number, month: number): Record<Iso, DayStatus> {
  const p = monthPrefix(year, month);
  const map: Record<Iso, DayStatus> = {};
  for (const e of d.snap.entries) if (e.entry_date.startsWith(p)) map[e.entry_date] = e.status;
  return map;
}

export function monthCells(d: Data, year: number, month: number): Record<Iso, DayCell> {
  const p = monthPrefix(year, month);
  const map: Record<Iso, DayCell> = {};
  for (const e of d.snap.entries) {
    if (e.entry_date.startsWith(p)) map[e.entry_date] = { status: e.status, amount: e.amount ?? null };
  }
  return map;
}

export function entriesForYear(d: Data, year: number): Record<Iso, DayStatus> {
  const map: Record<Iso, DayStatus> = {};
  for (const e of d.snap.entries) if (yearOf(e.entry_date) === year) map[e.entry_date] = e.status;
  return map;
}

export function clearDaysInMonth(d: Data, year: number, month: number): number {
  const p = monthPrefix(year, month);
  return d.snap.entries.filter((e) => e.status === 'clear' && e.entry_date.startsWith(p)).length;
}

export function totalClearDays(d: Data, year?: number): number {
  return d.snap.entries.filter((e) => e.status === 'clear' && inYear(year)(e)).length;
}

export function trackedDays(d: Data, year?: number): number {
  return d.snap.entries.filter(inYear(year)).length;
}

export function yearsWithEntries(d: Data, today: Iso): number[] {
  const years = [...new Set(d.snap.entries.map((e) => yearOf(e.entry_date)))].sort((a, b) => b - a);
  const thisYear = yearOf(today);
  if (!years.includes(thisYear)) years.unshift(thisYear);
  return years;
}

// ---- Weeks and alignment ---------------------------------------------------

export function weekSummary(d: Data, start: Iso, end: Iso) {
  return { clearCount: d.clearCountBetween(start, end), hasEntries: d.anyEntryBetween(start, end) };
}

/** Oldest-to-newest series of the last n weeks, current week last. */
export function weeklySeries(d: Data, today: Iso, numWeeks: number): WeekAlignment[] {
  const current = mondayOf(today);
  const out: WeekAlignment[] = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const w = addDays(current, -7 * i);
    out.push({ weekStartIso: w, count: d.clearCountBetween(w, addDays(w, 6)), target: d.targetForWeek(w) });
  }
  return out;
}

/** A week belongs to the year containing its Thursday (as in ISO weeks). */
export function weeksForYear(d: Data, year: number): WeekAlignment[] {
  const out: WeekAlignment[] = [];
  for (let w = mondayOf(isoOf(year, 1, 1)); ; w = addDays(w, 7)) {
    const thursdayYear = yearOf(addDays(w, 3));
    if (thursdayYear > year) break;
    if (thursdayYear === year) {
      const end = addDays(w, 6);
      out.push({
        weekStartIso: w,
        count: d.clearCountBetween(w, end),
        target: d.targetForWeek(w),
        hasEntries: d.anyEntryBetween(w, end),
      });
    }
  }
  return out;
}

/**
 * Consecutive weeks meeting their target. The in-progress week counts if
 * already met, but doesn't break the streak if not yet met.
 */
export function currentWeekStreak(d: Data, today: Iso): number {
  const current = mondayOf(today);
  let streak = d.weekMet(current) ? 1 : 0;
  let w = addDays(current, -7);
  for (let i = 0; i < 520 && d.weekMet(w); i++) {
    streak++;
    w = addDays(w, -7);
  }
  return streak;
}

export function longestWeekStreak(d: Data, today: Iso): number {
  let longest = 0;
  let run = 0;
  for (const w of d.intentionWeeks(today)) {
    run = d.weekMet(w) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}

export function weeksMetCount(d: Data, today: Iso): number {
  return d.intentionWeeks(today).filter((w) => d.weekMet(w)).length;
}

export function weeksMetInYear(d: Data, today: Iso, year: number): number {
  const end = year < yearOf(today) ? isoOf(year + 1, 1, 1) : mondayOf(today);
  let met = 0;
  for (let w = mondayOf(isoOf(year, 1, 1)); w < end; w = addDays(w, 7)) {
    if (yearOf(addDays(w, 3)) === year && d.weekMet(w)) met++;
  }
  return met;
}

// ---- Day streaks -----------------------------------------------------------

function streakBackFrom(today: Iso, has: (iso: Iso) => boolean): number {
  let cursor = has(today) ? today : addDays(today, -1);
  let n = 0;
  while (has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/** Consecutive days logged at all (clear or drinking), ending today or yesterday. */
export function loggingStreak(d: Data, today: Iso): number {
  return streakBackFrom(today, (iso) => d.byDate.has(iso));
}

export function currentClearDayStreak(d: Data, today: Iso): number {
  return streakBackFrom(today, (iso) => d.status(iso) === 'clear');
}

/**
 * FIX: the native version compared local-time dates for an exact 24-hour
 * gap, so a run crossing a daylight-saving change (a 23-hour day) was
 * counted as two runs. Whole-day differences here are exact.
 */
export function longestClearDayStreak(d: Data): number {
  const clear = d.datesAsc.filter((iso) => d.status(iso) === 'clear');
  return runs(clear).reduce((max, r) => Math.max(max, r.length), 0);
}

// ---- Milestones -------------------------------------------------------------

export function clearDatesOrdered(d: Data): Iso[] {
  return d.datesAsc.filter((iso) => d.status(iso) === 'clear');
}

export function milestones(d: Data, today: Iso): MilestonesData {
  const clear = clearDatesOrdered(d);
  let firstClearWeekEndIso: Iso | null = null;
  const beyond: BeyondTargetInstance[] = [];
  for (const w of d.intentionWeeks(today)) {
    const end = addDays(w, 6);
    const count = d.clearCountBetween(w, end);
    const target = d.scaleTarget(w); // intention weeks always have one
    if (!firstClearWeekEndIso && count >= target) firstClearWeekEndIso = end;
    if (count > target) beyond.push({ weekStartIso: w, weekEndIso: end, count, target });
  }
  return {
    totalClearDays: clear.length,
    firstClearDate: clear[0] ?? null,
    firstClearWeekEndIso,
    beyondTargetInstances: beyond.reverse(),
  };
}

export function loggingTierEarnings(d: Data): LoggingTierEarn[] {
  const out: LoggingTierEarn[] = [];
  for (const r of runs(d.datesAsc)) {
    for (const tier of LOGGING_TIERS) {
      if (r.length >= tier) out.push({ tierDays: tier, reachedDateIso: d.datesAsc[r.start + tier - 1] });
    }
  }
  return out;
}

/** Every streak tier reached by each run of met weeks (fixed lengths, STREAK_TIERS_WEEKS). */
export function streakTierEarnings(d: Data, today: Iso): StreakTierEarn[] {
  const weeks = d.intentionWeeks(today).map((w) => ({ end: addDays(w, 6), met: d.weekMet(w) }));
  const out: StreakTierEarn[] = [];
  let runStart = -1;
  for (let i = 0; i <= weeks.length; i++) {
    const met = i < weeks.length && weeks[i].met;
    if (met && runStart === -1) runStart = i;
    else if (!met && runStart !== -1) {
      const length = i - runStart;
      for (const tierWeeks of STREAK_TIERS_WEEKS) {
        if (length >= tierWeeks) out.push({ tierWeeks, reachedWeekEndIso: weeks[runStart + tierWeeks - 1].end });
      }
      runStart = -1;
    }
  }
  return out;
}

export function intentionHistory(d: Data): { weekly_target: number; effective_date: Iso }[] {
  return [...d.snap.intentions]
    .sort(
      (a, b) =>
        b.effective_date.localeCompare(a.effective_date) ||
        b.created_at.localeCompare(a.created_at),
    )
    .map((i) => ({ weekly_target: i.weekly_target, effective_date: i.effective_date }));
}

/** The first intention isn't a revision; every one after it is. */
export function intentionChangeCount(d: Data): number {
  return Math.max(0, d.snap.intentions.length - 1);
}

/**
 * Drinking days logged on the day itself.
 * FIX: the native query compared entry_date with the UTC date of created_at,
 * so in North America anything logged in the evening appeared to be logged
 * the next day and didn't count. This compares local calendar dates.
 */
export function sameDayDrinkingLogs(d: Data): SameDayStat {
  const dates = d.snap.entries
    .filter((e) => e.status === 'drinking' && localDateOf(e.created_at) === e.entry_date)
    .map((e) => e.entry_date)
    .sort()
    .reverse();
  return { count: dates.length, mostRecent: dates[0] ?? null };
}

/** A month counts once every day has an entry; the current month, days so far. */
export function fullyLoggedMonths(d: Data, today: Iso): FullyLoggedMonth[] {
  const counts = new Map<string, number>();
  for (const iso of d.datesAsc) {
    const ym = iso.slice(0, 7);
    counts.set(ym, (counts.get(ym) ?? 0) + 1);
  }
  const out: FullyLoggedMonth[] = [];
  for (const [ym, n] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
    const [y, m] = ym.split('-').map(Number);
    const isCurrent = ym === today.slice(0, 7);
    const needed = isCurrent ? Number(today.slice(8, 10)) : daysInMonth(y, m);
    if (n >= needed) out.push({ year: y, month: m });
  }
  return out;
}

export function trackingAnniversaries(d: Data, today: Iso): TrackingAnniversary[] {
  const first = d.earliest;
  if (!first) return [];
  const [y, m, day] = first.split('-').map(Number);
  return [1, 2, 3, 5, 10].map((years) => {
    // A 29 February start rolls to 1 March in non-leap years, as in native.
    const at = new Date(Date.UTC(y + years, m - 1, day));
    const reachedIso = isoOf(at.getUTCFullYear(), at.getUTCMonth() + 1, at.getUTCDate());
    return { years, reachedIso, reached: reachedIso <= today };
  });
}

// ---- Trends ----------------------------------------------------------------

export function dayOfWeekBreakdown(d: Data, year?: number): DayOfWeekStats[] {
  const stats = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, clear: 0, drinking: 0 }));
  for (const e of d.snap.entries.filter(inYear(year))) {
    const s = stats[weekdayOf(e.entry_date)];
    if (e.status === 'clear') s.clear++;
    else if (e.status === 'drinking') s.drinking++;
  }
  return stats;
}

/**
 * The "of Y" in Trends' "Days tracked: X of Y": days that could have been
 * logged in the scope. A past year is all of it; the current year runs from
 * 1 January to today; "all time" runs from the first logged day to today.
 * FIX: native divided milliseconds by 24 hours, so from the March clock
 * change until November it read one day short between 00:00 and 01:00.
 */
export function daysAvailable(today: Iso, scope: number | 'all', firstEntry: Iso | null): number {
  if (scope === 'all') return firstEntry ? daysBetween(firstEntry, today) + 1 : 0;
  if (scope < yearOf(today)) return daysBetween(isoOf(scope, 1, 1), isoOf(scope + 1, 1, 1));
  return daysBetween(isoOf(scope, 1, 1), today) + 1;
}

export interface DayOfWeekLevels {
  weekday: number; // 0 = Sunday … 6 = Saturday
  clear: number;
  aFew: number;
  more: number; // moderate + a lot
}

/** Day-of-week counts split three ways, matching the calendar's look. */
export function dayOfWeekLevels(d: Data, year?: number): DayOfWeekLevels[] {
  const stats = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, clear: 0, aFew: 0, more: 0 }));
  for (const e of d.snap.entries.filter(inYear(year))) {
    const s = stats[weekdayOf(e.entry_date)];
    if (e.status === 'clear') s.clear++;
    else if (e.amount === 'a-few') s.aFew++;
    else s.more++;
  }
  return stats;
}

/** Clear days in each calendar month of a year: index 0 = January. */
export function clearDaysByMonth(d: Data, year: number): number[] {
  const counts = Array(12).fill(0);
  for (const e of d.snap.entries) {
    if (e.status === 'clear' && yearOf(e.entry_date) === year) counts[Number(e.entry_date.slice(5, 7)) - 1]++;
  }
  return counts;
}

// ---- Savings estimate --------------------------------------------------------

/** Drinks per level as [fewest, most]; null = no upper limit ("A lot" is 5+). */
const DRINKS: Record<'clear' | DrinkAmount, [number, number | null]> = {
  clear: [0, 0],
  'a-few': [1, 2],
  moderate: [3, 4],
  'a-lot': [5, null],
};

export interface SavingsEstimate {
  loggedDays: number;
  /** Drinks saved against the baseline, at most (A lot counted as 5). */
  mostDrinks: number;
  /** Drinks saved, at least; null when an "A lot" day makes it open-ended. */
  leastDrinks: number | null;
}

/**
 * Drinks saved against a baseline, over the logged days in a scope.
 * Each logged day "should" have had baseline ÷ 7 drinks. Unlogged days are
 * left out: counting them would assume they were clear. Negative = over.
 */
export function savingsEstimate(d: Data, baselinePerWeek: number, year?: number): SavingsEstimate {
  const perDay = baselinePerWeek / 7;
  let most = 0;
  let least: number | null = 0;
  let n = 0;
  for (const e of d.snap.entries.filter(inYear(year))) {
    const [fewest, maxDrinks] = DRINKS[e.status === 'clear' ? 'clear' : (e.amount ?? 'a-lot')];
    most += perDay - fewest;
    least = least === null || maxDrinks === null ? null : least + perDay - maxDrinks;
    n++;
  }
  return { loggedDays: n, mostDrinks: most, leastDrinks: least };
}

// ---- Streaks by year --------------------------------------------------------
// A streak counts toward the year it ends in (or is still running in), at
// its full length. So a streak running over New Year counts once, in the
// later year, and the current streak never exceeds its own year's best.

/** Runs of consecutive met weeks; the current week joins only if already met. */
function weekStreakRuns(d: Data, today: Iso): { length: number; lastWeek: Iso }[] {
  const weeks = d.completedWeeks(today);
  const current = mondayOf(today);
  if (d.earliest && d.weekMet(current)) weeks.push(current);
  const out: { length: number; lastWeek: Iso }[] = [];
  let len = 0;
  weeks.forEach((w, i) => {
    if (d.weekMet(w)) len++;
    else len = 0;
    const next = weeks[i + 1];
    if (len > 0 && (!next || !d.weekMet(next))) out.push({ length: len, lastWeek: w });
  });
  return out;
}

/** Best week streak ending in a year (by its last week's Thursday), or overall. */
export function bestWeekStreak(d: Data, today: Iso, year?: number): number {
  return weekStreakRuns(d, today)
    .filter((r) => year === undefined || yearOf(addDays(r.lastWeek, 3)) === year)
    .reduce((m, r) => Math.max(m, r.length), 0);
}

/** Best run of consecutive clear days ending in a year, or overall. */
export function bestClearDayStreak(d: Data, year?: number): number {
  const clear = d.datesAsc.filter((iso) => d.status(iso) === 'clear');
  return runs(clear)
    .filter((r) => year === undefined || yearOf(clear[r.start + r.length - 1]) === year)
    .reduce((m, r) => Math.max(m, r.length), 0);
}

// ---- Clear-day and streak milestones --------------------------------------
// Fixed numbers, so they never move: changing the intention can't change or
// un-earn them. (Native recalculated tiers from the current target, so
// raising it made earned badges disappear.)

export interface ClearTierEarn {
  threshold: number; // clear days, from CLEAR_DAY_TIERS
  reachedDateIso: Iso;
}

/** The clear day on which the running count reached each tier. */
export function clearTierEarnings(d: Data): ClearTierEarn[] {
  const clear = d.datesAsc.filter((iso) => d.status(iso) === 'clear');
  return CLEAR_DAY_TIERS.filter((t) => clear.length >= t).map((t) => ({ threshold: t, reachedDateIso: clear[t - 1] }));
}

/** Each streak tier, the first time it was reached (same runs as streakTierEarnings). */
export function streakTierFirsts(d: Data, today: Iso): StreakTierEarn[] {
  const first = new Map<number, Iso>();
  for (const e of streakTierEarnings(d, today)) {
    const had = first.get(e.tierWeeks);
    if (!had || e.reachedWeekEndIso < had) first.set(e.tierWeeks, e.reachedWeekEndIso);
  }
  return STREAK_TIERS_WEEKS.filter((t) => first.has(t)).map((t) => ({ tierWeeks: t, reachedWeekEndIso: first.get(t)! }));
}

/** The longest run of consecutive logged days (clear or drinking), ever. */
export function longestLoggingRun(d: Data): number {
  return runs(d.datesAsc).reduce((m, r) => Math.max(m, r.length), 0);
}

/**
 * Weeks that met their intention in a calendar month (a week belongs to the
 * month containing its Thursday). Completed weeks all count; the week in
 * progress counts only once it's met, as with streaks.
 */
export function intentionsMetInMonth(d: Data, today: Iso, year: number, month: number): { met: number; counted: number } {
  const current = mondayOf(today);
  let met = 0;
  let counted = 0;
  for (let w = mondayOf(isoOf(year, month, 1)); w <= current; w = addDays(w, 7)) {
    const th = addDays(w, 3);
    if (yearOf(th) !== year || Number(th.slice(5, 7)) !== month) {
      if (th > isoOf(year, month, daysInMonth(year, month))) break;
      continue;
    }
    if (d.targetForWeek(w) === null) continue; // before the first intention: not counted
    const ok = d.weekMet(w);
    if (w < current) {
      counted++;
      if (ok) met++;
    } else if (ok) {
      counted++;
      met++;
    }
  }
  return { met, counted };
}
