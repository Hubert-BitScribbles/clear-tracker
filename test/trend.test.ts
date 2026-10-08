import { describe, expect, it } from 'vitest';
import { Data } from '../src/data/compute';
import { chartMonths, monthlyRates, rate, windowChange } from '../src/data/trend';
import { monthVsPrevious } from '../src/lib/trendText';
import { drinksChangeText, savingsChangeText } from '../src/lib/trendText';

type Lv = 'clear' | 'a-few' | 'moderate' | 'a-lot';
const plus = (iso: string, n: number) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);
const e = (iso: string, lv: Lv) =>
  ({ id: iso, entry_date: iso, status: lv === 'clear' ? 'clear' : 'drinking', amount: lv === 'clear' ? null : lv, created_at: '', updated_at: '' }) as never;
const run = (start: string, n: number, lv: Lv) => Array.from({ length: n }, (_, i) => e(plus(start, i), lv));

describe('rates', () => {
  it('drinks a week over logged days, at single figures per level', () => {
    // 2 days: moderate (3.5) + clear → 3.5 drinks over 2 logged days = 12.25 a week
    const d = new Data({ entries: [e('2026-09-01', 'moderate'), e('2026-09-02', 'clear')], intentions: [] });
    expect(rate(d, '2026-09-01', '2026-09-30')).toEqual({ perWeek: 12.25, logged: 2 });
  });
  it('monthly: a month with fewer than 7 logged days has no figure', () => {
    const d = new Data({ entries: [...run('2026-08-01', 10, 'a-few'), ...run('2026-09-01', 3, 'a-few')], intentions: [] });
    const m = monthlyRates(d, '2026-09-30', [{ year: 2026, month: 8 }, { year: 2026, month: 9 }, { year: 2026, month: 10 }]);
    expect(m.map((x) => [x.month, x.perWeek, x.soFar])).toEqual([[8, 10.5, false], [9, null, true]]); // October hasn't started
  });
  it('All time charts the last 12 months, across a year boundary', () => {
    const c = chartMonths('2026-02-10', 'all');
    expect(c[0]).toEqual({ year: 2025, month: 3 });
    expect(c[11]).toEqual({ year: 2026, month: 2 });
  });
});

describe('changes', () => {
  it('each month carries the month before it, so a selected month compares with its own previous month', () => {
    const d = new Data({ entries: [...run('2026-06-01', 30, 'a-lot'), ...run('2026-07-01', 31, 'moderate'), ...run('2026-08-01', 31, 'a-few'), ...run('2026-09-01', 3, 'clear')], intentions: [] });
    const pts = monthlyRates(d, '2026-09-03', chartMonths('2026-09-03', 2026));
    const at = (m: number) => pts.find((p) => p.month === m)!;
    expect(monthVsPrevious(at(8))).toEqual({ lead: 'August', diff: 10.5 - 24.5, vs: 'July' });
    expect(monthVsPrevious(at(7))).toEqual({ lead: 'July', diff: 24.5 - 35, vs: 'June' });
    expect(monthVsPrevious(at(9))).toBeNull(); // September has only 3 logged days
    expect(monthVsPrevious(at(6))).toBeNull(); // May wasn't logged
  });
  it('January compares with the December before, across the year boundary', () => {
    const d = new Data({ entries: [...run('2025-12-01', 31, 'moderate'), ...run('2026-01-01', 31, 'a-few')], intentions: [] });
    const jan = monthlyRates(d, '2026-02-10', [{ year: 2026, month: 1 }])[0];
    expect(monthVsPrevious(jan)).toEqual({ lead: 'January', diff: 10.5 - 24.5, vs: 'December' });
  });
  it('3 and 6 month windows need enough logged days', () => {
    const today = '2026-09-30';
    const d = new Data({ entries: [...run(plus(today, -181), 91, 'moderate'), ...run(plus(today, -90), 91, 'a-few')], intentions: [] });
    expect(windowChange(d, today, 91, 30)).toMatchObject({ recent: 10.5, previous: 24.5, diff: -14 });
    expect(windowChange(d, today, 182, 60)).toBeNull(); // nothing logged in the 6 months before
  });
});

describe('wording', () => {
  it('drinks', () => {
    expect(drinksChangeText('September so far', -0.6, 'August')).toBe('September so far: about 1 fewer drink a week than August');
    expect(drinksChangeText('Last 3 months', 2.4, 'the 3 before')).toBe('Last 3 months: about 2 more drinks a week than the 3 before');
    expect(drinksChangeText('Last 6 months', 0.3, 'the 6 before')).toBe('Last 6 months: about the same as the 6 before');
  });
  it('savings: fewer drinks means saving more', () => {
    expect(savingsChangeText('Last 3 months', -2, 9, 'the 3 before')).toBe('Last 3 months: saving about $18 more a week than the 3 before');
    expect(savingsChangeText('September so far', 1, 9, 'August')).toBe('September so far: saving about $9 less a week than August');
    expect(savingsChangeText('Last 6 months', 0.05, 9, 'the 6 before')).toBe('Last 6 months: about the same as the 6 before');
    // Under half a drink a week is "about the same" in both cards, even though it's $4 at $9 a drink.
    expect(savingsChangeText('Last 3 months', 0.45, 9, 'the 3 before')).toBe('Last 3 months: about the same as the 3 before');
    expect(drinksChangeText('Last 3 months', 0.45, 'the 3 before')).toBe('Last 3 months: about the same as the 3 before');
  });
});
