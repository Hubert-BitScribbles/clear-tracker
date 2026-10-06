// Shared by the differential, backup and real-backup tests.

import type * as P from '../src/data/database';

// ---- Seeded random data ---------------------------------------------------

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pad = (n: number) => String(n).padStart(2, '0');
const utc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const isoFromUtc = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
export const plusDays = (iso: string, n: number) => isoFromUtc(utc(iso) + n * 86400000);
export const mondayUtc = (iso: string) => {
  const wd = new Date(utc(iso)).getUTCDay();
  return plusDays(iso, wd === 0 ? -6 : 1 - wd);
};
/** A local-time instant on a calendar date, as an ISO timestamp. */
const localInstant = (iso: string, hour: number, min: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, hour, min).toISOString();
};

const HOW_MUCH = [null, 'Light', 'Moderate', 'Heavy', 'A lot'];
const AMOUNTS = ['a-few', 'moderate', 'a-lot'];
const ENERGY = [null, 'Low', 'Okay', 'Good'];
const EVENING = [null, 'At home', 'Social event', 'Work event'];

export function scenario(
  seed: number,
  today: string,
  opts: { longClearRuns?: boolean; capRun?: boolean } = {},
) {
  const r = rng(seed);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  // capRun: 2.5 unbroken years at a target of 1, long enough to reach the
  // longest (52-week) streak tier.
  const span = opts.capRun ? 920 : 150 + Math.floor(r() * 650);
  const start = plusDays(today, -span);
  const entries: Record<string, unknown>[] = [];
  let gap = 0;
  for (let d = start; d <= today; d = plusDays(d, 1)) {
    if (gap > 0) {
      gap--;
      continue;
    }
    if (!opts.capRun && r() < 0.03) gap = 3 + Math.floor(r() * 18);
    if (r() > 0.88) continue;
    const clear = opts.longClearRuns ? r() < 0.93 : r() < 0.55;
    // Most days logged the same evening; some backfilled up to 2 days later.
    const lag = r() < 0.3 ? 1 + Math.floor(r() * 2) : 0;
    const created = localInstant(plusDays(d, lag), 6 + Math.floor(r() * 18), Math.floor(r() * 60));
    entries.push({
      id: `e-${d}`,
      entry_date: d,
      status: clear ? 'clear' : 'drinking',
      severity: clear ? null : pick(HOW_MUCH), // read by the native code only
      amount: clear ? null : pick(AMOUNTS), // read by the port only
      note: null,
      mood: pick(ENERGY),
      evening_context: pick(EVENING),
      created_at: created,
      updated_at: created,
    });
  }
  // Intention ledger: first one at the start, then revisions — including
  // several on the same Monday, which is common (changes made mid-week all
  // take effect the following Monday).
  const intentions: Record<string, unknown>[] = [];
  let mon = mondayUtc(start);
  let n = 0;
  const add = (monday: string) => {
    const created = localInstant(plusDays(monday, -3), 9, n);
    intentions.push({
      id: `i-${n++}`,
      weekly_target: opts.capRun ? 1 : 1 + Math.floor(r() * 7),
      effective_date: monday,
      created_at: created,
      updated_at: created,
    });
  };
  add(mon);
  const changes = opts.capRun ? 0 : Math.floor(r() * 9);
  for (let i = 0; i < changes; i++) {
    mon = plusDays(mon, 7 * (1 + Math.floor(r() * 12)));
    if (mon > today) break;
    add(mon);
    if (r() < 0.3) add(mon);
  }
  return { entries, intentions };
}

// ---- The comparison ----------------------------------------------------------

export type Api = typeof P;
export const FIXED = new Set(['getLongestClearDayStreak', 'getSameDayDrinkingLogs']);

export async function ask(api: Api, years: number[], months: [number, number][], weeks: [string, string][]) {
  const out: Record<string, unknown> = {};
  const sortRows = (rows: unknown[]) => rows.map((x) => JSON.stringify(x)).sort();
  out.getCurrentStreak = await api.getCurrentStreak();
  out.getLongestWeekStreak = await api.getLongestWeekStreak();
  out.getWeeklySeries = await api.getWeeklySeries(12);
  out.getWeeksMetCount = await api.getWeeksMetCount();
  out.getLoggingStreak = await api.getLoggingStreak();
  out.getCurrentClearDayStreak = await api.getCurrentClearDayStreak();
  out.getLongestClearDayStreak = await api.getLongestClearDayStreak();
  out.getTotalClearDays = await api.getTotalClearDays();
  out.getTrackedDaysAllTime = await api.getTrackedDaysAllTime();
  out.getYearsWithEntries = await api.getYearsWithEntries();
  out.getFirstEntryDate = await api.getFirstEntryDate();
  out.getEntryCount = await api.getEntryCount();
  out.computeMilestones = await api.computeMilestones();
  out.getClearDatesOrdered = await api.getClearDatesOrdered();
  out.getLoggingTierEarnings = await api.getLoggingTierEarnings();
  out.getStreakTierEarnings = await api.getStreakTierEarnings();
  out.getSameDayDrinkingLogs = await api.getSameDayDrinkingLogs();
  out.getFullyLoggedMonths = await api.getFullyLoggedMonths();
  out.getTrackingAnniversaries = await api.getTrackingAnniversaries();
  out.getIntentionChangeCount = await api.getIntentionChangeCount();
  // Ties on effective_date have no defined order in the native SQL.
  out.getIntentionHistory = sortRows(await api.getIntentionHistory());
  out.getDayOfWeekBreakdown = await api.getDayOfWeekBreakdown();
  for (const y of years) {
    out[`getWeeksForYear(${y})`] = await api.getWeeksForYear(y);
    out[`getWeeksMetInYear(${y})`] = await api.getWeeksMetInYear(y);
    out[`getClearDaysInYear(${y})`] = await api.getClearDaysInYear(y);
    out[`getTotalClearDays(${y})`] = await api.getTotalClearDays(y);
    out[`getTrackedDaysInYear(${y})`] = await api.getTrackedDaysInYear(y);
    out[`getEntriesForYear(${y})`] = await api.getEntriesForYear(y);
    out[`getDayOfWeekBreakdown(${y})`] = await api.getDayOfWeekBreakdown(y);
  }
  for (const [y, m] of months) {
    // Native cells carry its old amount scale; compare which days are
    // clear or drinking, which is what every calculation depends on.
    out[`getMonthCells(${y},${m})`] = Object.fromEntries(
      Object.entries(await api.getMonthCells(y, m)).map(([d, c]) => [d, (c as { status: string }).status]),
    );
    out[`getEntriesForMonth(${y},${m})`] = await api.getEntriesForMonth(y, m);
    out[`getClearDaysInMonth(${y},${m})`] = await api.getClearDaysInMonth(y, m);
  }
  for (const [s, e] of weeks) {
    out[`getWeekSummary(${s})`] = await api.getWeekSummary(s, e);
    out[`weekHasEntries(${s})`] = await api.weekHasEntries(s, e);
    out[`getCurrentWeeklyTarget(${s})`] = await api.getCurrentWeeklyTarget(s);
  }
  return out;
}

