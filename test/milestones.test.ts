// Clear-day and streak milestones are fixed numbers, the same for everyone,
// and never move when the intention changes.

import { describe, expect, it } from 'vitest';
import {
  CLEAR_DAY_TIERS, clearTierEarnings, Data, longestLoggingRun, loggingTierEarnings,
  milestones, STREAK_TIERS_WEEKS, streakTierEarnings, streakTierFirsts,
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
      { tierWeeks: 2, reachedIso: '2026-01-16' }, // the Friday week 2 met its intention of 5
      { tierWeeks: 4, reachedIso: '2026-01-30' },
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
        const dates = all.filter((e) => e.tierWeeks === f.tierWeeks).map((e) => e.reachedIso).sort();
        expect(f.reachedIso).toBe(dates[0]);
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

describe('a week counts for milestones as soon as it is met (1.3.5)', () => {
  // Intention 3 from Mon 5 Jan; weeks of Jan 5 and Jan 12 met; this week
  // (Jan 19) reaches 3 clear days on Wednesday the 21st.
  const base = [...['05', '06', '07', '12', '13', '14'].map((x) => day(`2026-01-${x}`, 'clear'))];
  const ints = [intention(3, '2026-01-05', 0)];
  it('the 2-week streak is reached the Wednesday the second week met; a third met week is a 3-week run', () => {
    const d = new Data({ entries: [...base, day('2026-01-19', 'clear'), day('2026-01-20', 'clear'), day('2026-01-21', 'clear')], intentions: ints });
    expect(streakTierFirsts(d, '2026-01-21')).toEqual([{ tierWeeks: 2, reachedIso: '2026-01-14' }]);
    expect(milestones(d, '2026-01-21').firstWeekMetIso).toBe('2026-01-07');
  });
  it('this week, once met, joins the run the same day', () => {
    const d = new Data({ entries: [day('2026-01-05', 'clear'), day('2026-01-06', 'clear'), day('2026-01-07', 'clear'),
      day('2026-01-12', 'clear'), day('2026-01-13', 'clear'), day('2026-01-14', 'clear')], intentions: ints });
    // Wednesday 14th: the second week (in progress) met today → 2-week streak today.
    expect(streakTierFirsts(d, '2026-01-14')).toEqual([{ tierWeeks: 2, reachedIso: '2026-01-14' }]);
    expect(milestones(d, '2026-01-07').firstWeekMetIso).toBe('2026-01-07');
  });
  it('changing that day back the same evening takes it back', () => {
    const d = new Data({ entries: [day('2026-01-05', 'clear'), day('2026-01-06', 'clear'), day('2026-01-07', 'clear'),
      day('2026-01-12', 'clear'), day('2026-01-13', 'clear'), day('2026-01-14', 'drinking')], intentions: ints });
    expect(streakTierFirsts(d, '2026-01-14')).toEqual([]);
  });
});
