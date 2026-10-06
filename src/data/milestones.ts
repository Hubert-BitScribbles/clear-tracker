// Milestones added for the web version (October 2026). Each is a list of
// dated events, turned into tiers where it has them. Same principles as the
// rest: thresholds tied to the user's own target and history; once earned,
// always earned; drinking days never undo anything.

import { addDays, localDateOf, yearOf, type Iso } from './dates';
import { Data } from './compute';

export interface TierEarn {
  tier: number;
  reachedIso: Iso;
}

/** From dated events (ascending), the date each tier was reached. */
export function tiersFrom(eventsAsc: Iso[], tiers: number[]): TierEarn[] {
  return tiers.filter((t) => eventsAsc.length >= t).map((t) => ({ tier: t, reachedIso: eventsAsc[t - 1] }));
}

export const BACK_ON_TRACK_TIERS = [1, 3, 10, 25];
export const KEPT_TO_A_FEW_TIERS = [1, 3, 10, 25];
export const HONEST_LOGGING_TIERS = [1, 10, 25, 50, 100];
export const MONEY_KEPT_TIERS = [100, 250, 500, 1000, 2500, 5000, 10000];
export const YEAR_WEEKS_MET = [4, 13, 26, 39];

/**
 * Back on track: completed weeks that met their intention after a week that
 * didn't (an unlogged week counts as not met). The first week of tracking
 * can't qualify: there's nothing to come back from. Returns week-end dates.
 */
export function backOnTrackWeeks(d: Data, today: Iso): Iso[] {
  const weeks = d.intentionWeeks(today); // nothing to come back from before the first intention
  const out: Iso[] = [];
  for (let i = 1; i < weeks.length; i++) {
    if (d.weekMet(weeks[i]) && !d.weekMet(weeks[i - 1])) out.push(addDays(weeks[i], 6));
  }
  return out;
}

/** Kept it to a few: completed weeks with drinking days, all of them "A few". */
export function keptToAFewWeeks(d: Data, today: Iso): Iso[] {
  const out: Iso[] = [];
  for (const w of d.completedWeeks(today)) {
    let drinking = 0;
    let allFew = true;
    for (let i = 0; i < 7; i++) {
      const e = d.byDate.get(addDays(w, i));
      if (e?.status === 'drinking') {
        drinking++;
        if (e.amount !== 'a-few') allFew = false;
      }
    }
    if (drinking > 0 && allFew) out.push(addDays(w, 6));
  }
  return out;
}

export interface BestMonth {
  year: number;
  month: number;
  clearDays: number;
  reachedIso: Iso; // the clear day that made it the best so far
}

/**
 * Best month yet: each time a month's clear days pass every earlier month's.
 * The first month with clear days sets the bar and doesn't count itself.
 * The current month counts as soon as it passes (its count only grows).
 */
export function bestMonths(d: Data): BestMonth[] {
  const out: BestMonth[] = [];
  let best = 0;
  let seenAny = false;
  let curKey = '';
  let n = 0;
  let awarded = false;
  for (const iso of d.datesAsc) {
    if (d.status(iso) !== 'clear') continue;
    const key = iso.slice(0, 7);
    if (key !== curKey) {
      if (curKey) {
        best = Math.max(best, n);
        seenAny = true;
      }
      curKey = key;
      n = 0;
      awarded = false;
    }
    n++;
    if (seenAny && !awarded && n > best) {
      out.push({ year: yearOf(iso), month: Number(iso.slice(5, 7)), clearDays: 0, reachedIso: iso });
      awarded = true;
    }
  }
  // Fill in each awarded month's final (or current) count.
  for (const b of out) {
    const prefix = `${b.year}-${String(b.month).padStart(2, '0')}-`;
    b.clearDays = d.datesAsc.filter((x) => x.startsWith(prefix) && d.status(x) === 'clear').length;
  }
  return out;
}

/**
 * Honest logging: drinking days logged on the day itself (the local
 * calendar date of the first tap matches the day), oldest first.
 */
export function honestLoggingDates(d: Data): Iso[] {
  return d.snap.entries
    .filter((e) => e.status === 'drinking' && localDateOf(e.created_at) === e.entry_date)
    .map((e) => e.entry_date)
    .sort();
}

/**
 * Money kept on clear days: each clear day keeps baseline ÷ 7 drinks' worth.
 * Returns the date each money tier was reached, plus the running total.
 * Clear days only, so it never goes negative and needs no "up to".
 */
export function moneyKept(d: Data, baselinePerWeek: number, price: number): { total: number; earned: TierEarn[] } {
  const perDay = (baselinePerWeek / 7) * price;
  const earned: TierEarn[] = [];
  let total = 0;
  let next = 0;
  for (const iso of d.datesAsc) {
    if (d.status(iso) !== 'clear') continue;
    total += perDay;
    while (next < MONEY_KEPT_TIERS.length && total >= MONEY_KEPT_TIERS[next] - 1e-9) {
      earned.push({ tier: MONEY_KEPT_TIERS[next], reachedIso: iso });
      next++;
    }
  }
  return { total, earned };
}

/** This year, weeks met: tiers of 4, 13, 26, 39 weeks (Thursday rule). */
export function yearWeeksMetTiers(d: Data, today: Iso, year: number): { count: number; earned: TierEarn[] } {
  const events: Iso[] = [];
  for (const w of d.completedWeeks(today)) {
    if (yearOf(addDays(w, 3)) === year && d.weekMet(w)) events.push(addDays(w, 6));
  }
  return { count: events.length, earned: tiersFrom(events, YEAR_WEEKS_MET) };
}
