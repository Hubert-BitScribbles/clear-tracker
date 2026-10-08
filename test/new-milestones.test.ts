import { describe, expect, it } from 'vitest';
import { Data, sameDayDrinkingLogs } from '../src/data/compute';
import {
  backOnTrackWeeks, bestMonths, honestLoggingDates, keptToAFewWeeks, tiersFrom,
} from '../src/data/milestones';
import { scenario } from './helpers';

type Lv = 'clear' | 'a-few' | 'moderate' | 'a-lot';
const plus = (iso: string, n: number) =>
  new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);
const e = (iso: string, lv: Lv, created = '') =>
  ({ id: iso, entry_date: iso, status: lv === 'clear' ? 'clear' : 'drinking', amount: lv === 'clear' ? null : lv,
     created_at: created, updated_at: '' }) as never;
const target = (t: number, monday = '2026-01-05', n = 0) =>
  ({ id: `i${n}`, weekly_target: t, effective_date: monday, created_at: `2026-01-0${n + 1}T00:00:00Z`, updated_at: '' }) as never;
/** A week from a Monday: a string of levels, '.' = unlogged. */
const week = (monday: string, pattern: string) =>
  [...pattern].flatMap((c, i) =>
    c === '.' ? [] : [e(plus(monday, i), ({ c: 'clear', f: 'a-few', m: 'moderate', l: 'a-lot' } as Record<string, Lv>)[c])]);

describe('back on track', () => {
  it('a met week after an unmet one counts; the first week never does', () => {
    const entries = [
      ...week('2026-01-05', 'ccc....'), // met (target 3) — first week, can't count
      ...week('2026-01-12', 'cmm....'), // not met
      ...week('2026-01-19', 'cccm...'), // met after unmet → counts
      ...week('2026-01-26', 'ccc....'), // met after met → no
      // 2 Feb week unlogged → not met
      ...week('2026-02-09', 'ccc....'), // met after unlogged → counts
    ];
    const d = new Data({ entries, intentions: [target(3)] });
    expect(backOnTrackWeeks(d, '2026-03-01')).toEqual(['2026-01-25', '2026-02-15']);
  });
  it('the week in progress never counts', () => {
    const entries = [...week('2026-01-05', 'm......'), ...week('2026-01-12', 'ccc....')];
    const d = new Data({ entries, intentions: [target(3)] });
    expect(backOnTrackWeeks(d, '2026-01-15')).toEqual([]);
    expect(backOnTrackWeeks(d, '2026-01-19')).toEqual(['2026-01-18']);
  });
});

describe('kept it to a few', () => {
  it('needs drinking days, and all of them "A few"', () => {
    const entries = [
      ...week('2026-01-05', 'ccfcfcc'), // all drinking days a few → yes
      ...week('2026-01-12', 'cfmcccc'), // one moderate → no
      ...week('2026-01-19', 'ccccccc'), // no drinking → no
      ...week('2026-01-26', 'f......'), // a single a-few → yes
    ];
    const d = new Data({ entries, intentions: [target(3)] });
    expect(keptToAFewWeeks(d, '2026-03-01')).toEqual(['2026-01-11', '2026-02-01']);
  });
});

describe('best month yet', () => {
  it('awarded on the clear day a month passes every earlier month', () => {
    const days = (month: string, n: number) => Array.from({ length: n }, (_, i) => e(`2026-${month}-${String(i + 1).padStart(2, '0')}`, 'clear'));
    const d = new Data({ entries: [...days('01', 5), ...days('02', 7), ...days('03', 3), ...days('04', 8)], intentions: [] });
    expect(bestMonths(d)).toEqual([
      { year: 2026, month: 2, clearDays: 7, reachedIso: '2026-02-06' },
      { year: 2026, month: 4, clearDays: 8, reachedIso: '2026-04-08' },
    ]);
  });
  it('a tie is not a new best', () => {
    const d = new Data({ entries: [e('2026-01-01', 'clear'), e('2026-02-01', 'clear')], intentions: [] });
    expect(bestMonths(d)).toEqual([]);
  });
});

describe('honest logging', () => {
  it('matches the same-day drinking count, in date order', () => {
    for (const seed of [1, 2, 3]) {
      const s = scenario(seed, '2026-09-30');
      const d = new Data({ entries: s.entries as never, intentions: [] });
      const dates = honestLoggingDates(d);
      expect(dates.length).toBe(sameDayDrinkingLogs(d).count);
      expect([...dates].sort()).toEqual(dates);
      expect(tiersFrom(dates, [1, 10]).length).toBe(Math.min(2, [1, 10].filter((t) => dates.length >= t).length));
    }
  });
});

