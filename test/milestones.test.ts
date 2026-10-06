// Clear-day and streak milestones are fixed numbers, the same for everyone,
// and never move when the intention changes.

import { describe, expect, it } from 'vitest';
import {
  CLEAR_DAY_TIERS, clearTierEarnings, Data, longestLoggingRun, loggingTierEarnings,
  STREAK_TIERS_WEEKS, streakTierEarnings, streakTierFirsts,
} from '../src/data/compute';
import { scenario } from './helpers';

const day = (iso: string, status: 'clear' | 'drinking') =>
  ({ id: iso, entry_date: iso, status, amount: status === 'clear' ? null : 'moderate', created_at: '', updated_at: '' }) as never;
const intention = (target: number, monday: string, n = 0) =>
  ({ id: `i${n}`, weekly_target: target, effective_date: monday, created_at: `2026-01-0${n + 1}T00:00:00Z`, updated_at: '' }) as never;
const isoPlus = (iso: string, n: number) =>
  new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);

describe('clear-day milestones', () => {
  it('are fixed: 7, 14, 30, 50, 100 … 1,000', () => {
    expect(CLEAR_DAY_TIERS).toEqual([7, 14, 30, 50, 100, 150, 200, 365, 500, 750, 1000]);
  });
  it('are reached on the Nth clear day, whatever the intention', () => {
    const entries = Array.from({ length: 16 }, (_, i) => day(isoPlus('2026-01-05', i), 'clear'));
    const low = new Data({ entries, intentions: [intention(1, '2026-01-05')] });
    const changing = new Data({ entries, intentions: [intention(5, '2026-01-05', 0), intention(2, '2026-01-12', 1)] });
    const expected = [{ threshold: 7, reachedDateIso: '2026-01-11' }, { threshold: 14, reachedDateIso: '2026-01-18' }];
    expect(clearTierEarnings(low)).toEqual(expected);
    expect(clearTierEarnings(changing)).toEqual(expected);
  });
  it('match a plain count across many histories', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = scenario(seed, '2026-09-30', { longClearRuns: seed % 2 === 0 });
      const d = new Data({ entries: s.entries as never, intentions: s.intentions as never });
      const clear = (s.entries as { entry_date: string; status: string }[])
        .filter((e) => e.status === 'clear').map((e) => e.entry_date).sort();
      const expected = CLEAR_DAY_TIERS.filter((t) => clear.length >= t).map((t) => ({ threshold: t, reachedDateIso: clear[t - 1] }));
      expect(clearTierEarnings(d)).toEqual(expected);
    }
  });
});

describe('streak milestones', () => {
  it('are fixed: 2, 4, 8, 13, 26, 52 weeks in a row', () => {
    expect(STREAK_TIERS_WEEKS).toEqual([2, 4, 8, 13, 26, 52]);
  });
  it('don\'t change size when the intention changes', () => {
    // Every day clear for 6 weeks from Mon 5 Jan at intention 5, then 1 from
    // 16 Feb, then nothing: one run of 6 met weeks → 2 and 4 weeks.
    const entries = Array.from({ length: 42 }, (_, i) => day(isoPlus('2026-01-05', i), 'clear'));
    const d = new Data({ entries, intentions: [intention(5, '2026-01-05', 0), intention(1, '2026-02-16', 1)] });
    expect(streakTierFirsts(d, '2026-03-30')).toEqual([
      { tierWeeks: 2, reachedWeekEndIso: '2026-01-18' },
      { tierWeeks: 4, reachedWeekEndIso: '2026-02-01' },
    ]);
  });
  it('firsts are each tier\'s earliest earning', () => {
    for (const seed of [1, 2, 3, 4]) {
      const s = scenario(seed * 13, '2026-09-30', { longClearRuns: true });
      const d = new Data({ entries: s.entries as never, intentions: s.intentions as never });
      const all = streakTierEarnings(d, '2026-09-30');
      const firsts = streakTierFirsts(d, '2026-09-30');
      expect(firsts.map((f) => f.tierWeeks)).toEqual(STREAK_TIERS_WEEKS.filter((t) => all.some((e) => e.tierWeeks === t)));
      for (const f of firsts) {
        const dates = all.filter((e) => e.tierWeeks === f.tierWeeks).map((e) => e.reachedWeekEndIso).sort();
        expect(f.reachedWeekEndIso).toBe(dates[0]);
      }
    }
  });
});

describe('longest logging run', () => {
  it('is the longest run of logged days, at least every earned logging tier', () => {
    for (const seed of [1, 2, 3]) {
      const s = scenario(seed, '2026-09-30');
      const d = new Data({ entries: s.entries as never, intentions: s.intentions as never });
      const longest = longestLoggingRun(d);
      for (const e of loggingTierEarnings(d)) expect(longest).toBeGreaterThanOrEqual(e.tierDays);
      // brute force
      const set = new Set(d.datesAsc);
      let best = 0;
      for (const x of d.datesAsc) {
        if (set.has(isoPlus(x, -1))) continue;
        let n = 0;
        while (set.has(isoPlus(x, n))) n++;
        best = Math.max(best, n);
      }
      expect(longest).toBe(best);
    }
  });
});
