// The data API the screens use. Function names follow the native
// lib/database.ts, so ported screens keep their imports. The check-in
// answer functions are gone; cycleDay now steps through amounts.
//
// Reads load a snapshot and compute in memory (compute.ts). Writes go
// straight to Dexie. A few thousand entries load in milliseconds, so there
// is no caching; add it only if profiling ever says so.

import * as C from './compute';
import * as M from './milestones';
import { firstThreeMonths, type FirstThreeMonths } from './baseline';
import * as CH from './challenges';
import * as T from './timeline';
import { db, generateId, initDatabase, type DayEntryRow, type DayStatus, type DrinkAmount, type IntentionRow } from './db';
import { mondayOf, todayIso } from './dates';

export { initDatabase, generateId, todayIso };
export { CLEAR_DAY_TIERS, LOGGING_TIERS, STREAK_TIERS_WEEKS } from './compute';
export {
  BACK_ON_TRACK_TIERS, HONEST_LOGGING_TIERS, KEPT_TO_A_FEW_TIERS, MONEY_KEPT_TIERS, tiersFrom, YEAR_WEEKS_MET,
} from './milestones';
export type { BestMonth, TierEarn } from './milestones';
export type { FirstThreeMonths } from './baseline';
export const BEYOND_TARGET_TIERS = [1, 5, 15, 40, 100];
export type { DayStatus, DayEntryRow, DrinkAmount, IntentionRow } from './db';
export type {
  BeyondTargetInstance,
  DayCell,
  DayOfWeekLevels,
  DayOfWeekStats,
  ClearTierEarn,
  FullyLoggedMonth,
  LoggingTierEarn,
  MilestonesData,
  SameDayStat,
  SavingsEstimate,
  StreakTierEarn,
  TrackingAnniversary,
  WeekAlignment,
} from './compute';

async function data(): Promise<C.Data> {
  await initDatabase();
  const [entries, intentions] = await Promise.all([db.day_entries.toArray(), db.intentions.toArray()]);
  return new C.Data({ entries, intentions });
}

const now = () => new Date().toISOString();

// ---- Day entries ----------------------------------------------------------

/**
 * A logged day's level: clear, or drinking with an amount. This is what the
 * calendar shows and what a tap steps through.
 */
export type DayLevel = 'clear' | DrinkAmount;

/** Tap order: unlogged → clear → a few → moderate → a lot → unlogged. */
export const CYCLE: (DayLevel | null)[] = [null, 'clear', 'a-few', 'moderate', 'a-lot'];

export function levelOf(cell: { status: DayStatus; amount: DrinkAmount | null } | undefined): DayLevel | null {
  if (!cell) return null;
  return cell.status === 'clear' ? 'clear' : (cell.amount ?? 'a-lot');
}

export function nextLevel(current: DayLevel | null): DayLevel | null {
  return CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
}

/**
 * One tap on an already-selected day: steps it to the next level and
 * returns that level (null = unlogged again). The row keeps its created_at
 * while it stays logged, so "logged on the day" still means the first tap.
 */
export async function cycleDay(entryDateIso: string, current: DayLevel | null): Promise<DayLevel | null> {
  await initDatabase();
  const next = nextLevel(current);
  const t = now();
  if (next === null) {
    await db.day_entries.where('entry_date').equals(entryDateIso).delete();
  } else if (current === null) {
    await db.day_entries.add({
      id: generateId(),
      entry_date: entryDateIso,
      status: 'clear',
      amount: null,
      created_at: t,
      updated_at: t,
    });
  } else {
    await db.day_entries.where('entry_date').equals(entryDateIso).modify({
      status: next === 'clear' ? 'clear' : 'drinking',
      amount: next === 'clear' ? null : next,
      updated_at: t,
    });
  }
  return next;
}

export async function getEntriesForMonth(year: number, month: number) {
  return C.entriesForMonth(await data(), year, month);
}
export async function getMonthCells(year: number, month: number) {
  return C.monthCells(await data(), year, month);
}
export async function getEntriesForYear(year: number) {
  return C.entriesForYear(await data(), year);
}
export async function getEntryCount(): Promise<number> {
  await initDatabase();
  return db.day_entries.count();
}

// ---- Intentions -----------------------------------------------------------

/** The intention for a week, or the first one for weeks before it (for sizing and setting). */
export async function getCurrentWeeklyTarget(weekStartIso: string): Promise<number> {
  return (await data()).scaleTarget(weekStartIso);
}
/** The intention a week is measured against; null before the first intention. */
export async function getWeekTarget(weekStartIso: string): Promise<number | null> {
  return (await data()).targetForWeek(weekStartIso);
}
/** Monday of the first week with an intention. */
export async function getIntentionStart(): Promise<string | null> {
  return (await data()).intentionStart;
}

export async function saveIntention(weeklyTarget: number, effectiveDateIso: string): Promise<void> {
  await initDatabase();
  const t = now();
  await db.intentions.add({
    id: generateId(),
    weekly_target: weeklyTarget,
    effective_date: effectiveDateIso,
    created_at: t,
    updated_at: t,
  });
}

export async function weekHasEntries(weekStartIso: string, weekEndIso: string): Promise<boolean> {
  return (await data()).anyEntryBetween(weekStartIso, weekEndIso);
}
export async function getIntentionHistory() {
  return C.intentionHistory(await data());
}
export async function getIntentionChangeCount() {
  return C.intentionChangeCount(await data());
}

// ---- Settings -------------------------------------------------------------

export async function getSetting(key: string, defaultValue: string): Promise<string> {
  await initDatabase();
  return (await db.settings.get(key))?.value ?? defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await initDatabase();
  await db.settings.put({ key, value, updated_at: now() });
}

/** Erase all data: entries, intentions and settings. */
export async function resetDatabase(): Promise<void> {
  await initDatabase();
  await db.transaction('rw', db.day_entries, db.intentions, db.settings, async () => {
    await Promise.all([db.day_entries.clear(), db.intentions.clear(), db.settings.clear()]);
  });
}

// ---- Weeks, streaks, stats ---------------------------------------------------

export async function getTotalClearDays(year?: number) {
  return C.totalClearDays(await data(), year);
}
export async function getClearDaysInMonth(year: number, month: number) {
  return C.clearDaysInMonth(await data(), year, month);
}
export async function getClearDaysInYear(year: number) {
  return C.totalClearDays(await data(), year);
}
export const getClearDaysInYearCount = getClearDaysInYear;

export async function getCurrentStreak() {
  return C.currentWeekStreak(await data(), todayIso());
}
export async function getLongestWeekStreak() {
  return C.longestWeekStreak(await data(), todayIso());
}
export async function getWeeklySeries(numWeeks: number) {
  return C.weeklySeries(await data(), todayIso(), numWeeks);
}
export async function getWeeksForYear(year: number) {
  return C.weeksForYear(await data(), year);
}
export async function getWeekSummary(weekStartIso: string, weekEndIso: string) {
  return C.weekSummary(await data(), weekStartIso, weekEndIso);
}
export async function getWeeksMetCount() {
  return C.weeksMetCount(await data(), todayIso());
}
export async function getWeeksMetInYear(year: number) {
  return C.weeksMetInYear(await data(), todayIso(), year);
}
export async function getLoggingStreak() {
  return C.loggingStreak(await data(), todayIso());
}
export async function getCurrentClearDayStreak() {
  return C.currentClearDayStreak(await data(), todayIso());
}
export async function getLongestClearDayStreak() {
  return C.longestClearDayStreak(await data());
}
export async function getTrackedDaysInYear(year: number) {
  return C.trackedDays(await data(), year);
}
export async function getTrackedDaysAllTime() {
  return C.trackedDays(await data());
}
export async function getYearsWithEntries() {
  return C.yearsWithEntries(await data(), todayIso());
}
export async function getDaysAvailable(scope: number | 'all') {
  const d = await data();
  return C.daysAvailable(todayIso(), scope, d.earliest);
}
export async function getSavingsEstimate(baselinePerWeek: number, scope: number | 'all') {
  return C.savingsEstimate(await data(), baselinePerWeek, scope === 'all' ? undefined : scope);
}
/** Best week and clear-day streaks for a year (ending in it), or all time. */
export async function getBestStreaks(scope: number | 'all') {
  const d = await data();
  const year = scope === 'all' ? undefined : scope;
  return { week: C.bestWeekStreak(d, todayIso(), year), day: C.bestClearDayStreak(d, year) };
}
export async function getClearTierEarnings() {
  return C.clearTierEarnings(await data());
}
/** Each streak tier, the first time it was reached. */
export async function getStreakTierFirsts() {
  return C.streakTierFirsts(await data(), todayIso());
}
export async function getLongestLoggingRun() {
  return C.longestLoggingRun(await data());
}
export type BaselineSource = 'entered' | 'first3';
export interface SavingsSettings {
  source: BaselineSource;
  entered: number | null; // drinks a week, as typed
  price: number | null;
  first3: FirstThreeMonths;
  /** What the estimates use, or null if savings isn't (yet) set up. */
  effective: { baselinePerWeek: number; price: number } | null;
}

/** The savings baseline and price in force: typed, or measured from the first 3 months. */
export async function getSavingsSettings(today = todayIso()): Promise<SavingsSettings> {
  const d = await data();
  const [src, b, p] = await Promise.all([
    getSetting('savings_baseline_source', 'entered'),
    getSetting('savings_baseline_per_week', ''),
    getSetting('savings_price_per_drink', ''),
  ]);
  const source: BaselineSource = src === 'first3' ? 'first3' : 'entered';
  const entered = b === '' ? null : Number(b);
  const price = p === '' ? null : Number(p);
  const challenges = CH.parseChallenges(await getSetting('challenges', ''));
  const first3 = firstThreeMonths(d, today, CH.chosenMonthRanges(challenges));
  const baseline = source === 'first3' ? (first3.status === 'ready' ? first3.perWeek : null) : entered;
  return { source, entered, price, first3, effective: baseline !== null && price !== null ? { baselinePerWeek: baseline, price } : null };
}

/**
 * Money kept tiers, kept earned for good: tiers reached under any baseline
 * are recorded, so switching baselines (or lowering one) can't un-earn them.
 */
export async function getMoneyKept(effective: { baselinePerWeek: number; price: number } | null) {
  const d = await data();
  const stored: Record<string, string> = JSON.parse((await getSetting('money_kept_earned', '')) || '{}');
  const now = effective ? M.moneyKept(d, effective.baselinePerWeek, effective.price) : { total: 0, earned: [] };
  let changed = false;
  for (const e of now.earned) {
    if (!stored[e.tier]) {
      stored[e.tier] = e.reachedIso;
      changed = true;
    }
  }
  if (changed) await setSetting('money_kept_earned', JSON.stringify(stored));
  const earned = Object.entries(stored)
    .map(([tier, reachedIso]) => ({ tier: Number(tier), reachedIso }))
    .sort((a, b) => a.tier - b.tier);
  return effective || earned.length ? { total: now.total, earned } : null;
}

// ---- Challenges ---------------------------------------------------------------

export type { ChallengeSettings, MonthChallenge, SpanStatus } from './challenges';
export { GLYPH, type Earned, type NextUp } from './timeline';
export { WEEKEND_TIERS, WEEK_TIERS, chosenMonthRanges } from './challenges';

export async function getChallenges(): Promise<CH.ChallengeSettings> {
  return CH.parseChallenges(await getSetting('challenges', ''));
}
export async function setChallenges(c: CH.ChallengeSettings): Promise<void> {
  await setSetting('challenges', JSON.stringify({ ...c, months: [...new Set(c.months)].sort() }));
}

/** Take on (or stop) clear weekends or weeks; a new run starts on the right date. */
export async function setChallengeOn(kind: 'weekend' | 'week', on: boolean, today = todayIso()): Promise<void> {
  const [d, c] = await Promise.all([data(), getChallenges()]);
  if (kind === 'weekend') c.weekendRuns = CH.toggleRun(c.weekendRuns, on, CH.weekendStart(d, today), today);
  else c.weekRuns = CH.toggleRun(c.weekRuns, on, CH.weekStart(d, today), today);
  await setChallenges(c);
}

/** The chosen challenges and where each stands today. */
export async function getChallengeStatus(today = todayIso()) {
  const [d, settings] = await Promise.all([data(), getChallenges()]);
  return {
    settings,
    weekendOn: CH.isOn(settings.weekendRuns),
    weekOn: CH.isOn(settings.weekRuns),
    weekends: CH.clearWeekends(d, today, settings.weekendRuns),
    weeks: CH.clearWeeks(d, today, settings.weekRuns),
    weekendNow: CH.currentSpan(d, today, settings.weekendRuns, 'weekend'),
    weekNow: CH.currentSpan(d, today, settings.weekRuns, 'week'),
    months: settings.months.map((ym) => CH.monthChallenge(d, today, ym)),
    // Where a run would start if switched on now (shown before switching on).
    weekendStartsIfOn: CH.weekendStart(d, today),
    weekStartsIfOn: CH.weekStart(d, today),
    runStart: { weekend: settings.weekendRuns.at(-1)?.from ?? null, week: settings.weekRuns.at(-1)?.from ?? null },
  };
}

/** Everything earned (oldest first) and what's closest — for the Milestones screen. */
export async function getTimeline(today = todayIso()) {
  const d = await data();
  const [savings, challenges, ds] = await Promise.all([getSavingsSettings(today), getChallenges(), getSetting('day_streak_enabled', 'false')]);
  const money = await getMoneyKept(savings.effective);
  return {
    earned: T.earnedMilestones(d, today, { moneyEarned: money?.earned, challenges, showWeekStreaks: ds === 'true' }),
    next: T.upNext(d, today, { moneyTotal: savings.effective ? money?.total : undefined, moneyEarned: money?.earned }),
    years: [...new Set(d.datesAsc.map((x) => Number(x.slice(0, 4))))].sort((a, b) => b - a),
  };
}

/** Everything the newer milestones need, in one read. */
export async function getMilestoneExtras(today = todayIso()) {
  const d = await data();
  const year = Number(today.slice(0, 4));
  const target = d.scaleTarget(mondayOf(today));
  const savings = await getSavingsSettings(today);
  const beyond = C.milestones(d, today).beyondTargetInstances.map((x) => x.weekEndIso).reverse();
  return {
    target,
    backOnTrack: M.backOnTrackWeeks(d, today),
    keptToAFew: M.keptToAFewWeeks(d, today),
    bestMonths: M.bestMonths(d),
    honest: M.honestLoggingDates(d),
    beyondTarget: beyond, // oldest first
    money: await getMoneyKept(savings.effective),
    yearWeeks: M.yearWeeksMetTiers(d, today, year),
  };
}
export async function getIntentionsMetInMonth(year: number, month: number) {
  return C.intentionsMetInMonth(await data(), todayIso(), year, month);
}
export async function getFirstEntryDate() {
  return (await data()).earliest;
}
export async function getDayOfWeekLevels(year?: number) {
  return C.dayOfWeekLevels(await data(), year);
}
export async function getClearDaysByMonth(year: number) {
  return C.clearDaysByMonth(await data(), year);
}
export async function getDayOfWeekBreakdown(year?: number) {
  return C.dayOfWeekBreakdown(await data(), year);
}
// ---- Milestones ---------------------------------------------------------------

export async function computeMilestones() {
  return C.milestones(await data(), todayIso());
}
export async function getClearDatesOrdered() {
  return C.clearDatesOrdered(await data());
}
export async function getLoggingTierEarnings() {
  return C.loggingTierEarnings(await data());
}
export async function getStreakTierEarnings() {
  return C.streakTierEarnings(await data(), todayIso());
}
export async function getSameDayDrinkingLogs() {
  return C.sameDayDrinkingLogs(await data());
}
export async function getFullyLoggedMonths() {
  return C.fullyLoggedMonths(await data(), todayIso());
}
export async function getTrackingAnniversaries() {
  return C.trackingAnniversaries(await data(), todayIso());
}

// ---- Backup -----------------------------------------------------------------

export async function getAllDataForExport(): Promise<{ dayEntries: DayEntryRow[]; intentions: IntentionRow[] }> {
  await initDatabase();
  const [dayEntries, intentions] = await Promise.all([db.day_entries.toArray(), db.intentions.toArray()]);
  return { dayEntries, intentions };
}

/** Everything a backup holds. */
export async function getBackupData() {
  await initDatabase();
  const [dayEntries, intentions, settings] = await Promise.all([
    db.day_entries.toArray(),
    db.intentions.toArray(),
    db.settings.toArray(),
  ]);
  return { dayEntries, intentions, settings: settings.map(({ key, value }) => ({ key, value })) };
}

/**
 * Restores a validated backup: replaces days, intentions and settings in one
 * transaction (a failure changes nothing). This device's own bookkeeping
 * (when it last backed up) is kept, and onboarding is marked done.
 */
export async function restoreBackup(payload: {
  dayEntries: DayEntryRow[];
  intentions: IntentionRow[];
  settings: { key: string; value: string }[];
}): Promise<void> {
  await initDatabase();
  const t = now();
  await db.transaction('rw', db.day_entries, db.intentions, db.settings, async () => {
    const keep = await db.settings.where('key').anyOf(['last_backup_at']).toArray();
    await Promise.all([db.day_entries.clear(), db.intentions.clear(), db.settings.clear()]);
    await db.day_entries.bulkAdd(payload.dayEntries.map((e) => ({
      id: e.id ?? generateId(), entry_date: e.entry_date, status: e.status,
      amount: e.status === 'clear' ? null : e.amount, created_at: e.created_at ?? t, updated_at: e.updated_at ?? t,
    })));
    await db.intentions.bulkAdd(payload.intentions.map((i) => ({
      id: i.id ?? generateId(), weekly_target: i.weekly_target, effective_date: i.effective_date,
      created_at: i.created_at ?? t, updated_at: i.updated_at ?? t,
    })));
    await db.settings.bulkPut([
      ...payload.settings.map((x) => ({ ...x, updated_at: t })),
      ...keep,
      { key: 'onboarding_complete', value: 'true', updated_at: t },
    ]);
  });
}

/**
 * Replaces all entries and intentions with a backup's contents, in one
 * transaction: a malformed backup leaves the existing data untouched.
 * (The web export/import format itself is designed in step 8.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function restoreFromBackup(dayEntries: any[], intentions: any[]): Promise<void> {
  await initDatabase();
  const t = now();
  const amounts = new Set(['a-few', 'moderate', 'a-lot']);
  const entries: DayEntryRow[] = dayEntries.map((e) => ({
    id: e.id ?? generateId(),
    entry_date: e.entry_date,
    status: e.status,
    amount: e.status === 'drinking' ? (amounts.has(e.amount) ? e.amount : 'a-lot') : null,
    created_at: e.created_at ?? t,
    updated_at: e.updated_at ?? t,
  }));
  const ints: IntentionRow[] = intentions.map((i) => ({
    id: i.id ?? generateId(),
    weekly_target: i.weekly_target,
    effective_date: i.effective_date,
    created_at: i.created_at ?? t,
    updated_at: i.updated_at ?? t,
  }));
  await db.transaction('rw', db.day_entries, db.intentions, async () => {
    await db.day_entries.clear();
    await db.intentions.clear();
    await db.day_entries.bulkAdd(entries);
    await db.intentions.bulkAdd(ints);
  });
}
