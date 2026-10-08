import { describe, expect, it } from 'vitest';
import { firstThreeMonths, momentum, momentumText } from '../src/data/baseline';
import { Data } from '../src/data/compute';

type Lv = 'clear' | 'a-few' | 'moderate' | 'a-lot';
const plus = (iso: string, n: number) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);
const e = (iso: string, lv: Lv) =>
  ({ id: iso, entry_date: iso, status: lv === 'clear' ? 'clear' : 'drinking', amount: lv === 'clear' ? null : lv, created_at: '', updated_at: '' }) as never;
/** n consecutive days from start, cycling through a pattern of levels. */
const days = (start: string, n: number, pattern: Lv[]) => Array.from({ length: n }, (_, i) => e(plus(start, i), pattern[i % pattern.length]));

describe('first 3 months', () => {
  it('no data → none', () => expect(firstThreeMonths(new Data({ entries: [], intentions: [] }), '2026-09-30')).toEqual({ status: 'none' }));
  it('waits until the 13 weeks are over', () => {
    const d = new Data({ entries: days('2026-07-01', 80, ['clear']), intentions: [] });
    expect(firstThreeMonths(d, '2026-09-20')).toMatchObject({ status: 'waiting', complete: false, start: '2026-07-01', end: '2026-09-29' });
  });
  it('waits if fewer than 60 of those days were logged', () => {
    const d = new Data({ entries: days('2026-04-01', 50, ['clear']), intentions: [] });
    expect(firstThreeMonths(d, '2026-09-30')).toMatchObject({ status: 'waiting', complete: true, logged: 50, needed: 60 });
  });
  it('ready: average drinks a week at the midpoints, from the first 91 days only', () => {
    // Pattern clear, a few (1.5), moderate (3.5), a lot (5): 10 drinks per 4 days = 17.5 a week.
    const entries = [...days('2026-01-01', 91, ['clear', 'a-few', 'moderate', 'a-lot']), ...days('2026-04-02', 60, ['a-lot'])];
    const r = firstThreeMonths(new Data({ entries, intentions: [] }), '2026-09-30');
    expect(r).toMatchObject({ status: 'ready', start: '2026-01-01', end: '2026-04-01', logged: 91 });
    // 91 days = 22 full cycles (88 days, 220 drinks) + clear, a few, moderate (5 drinks) = 225 drinks / 91 days × 7
    if (r.status === 'ready') expect(r.perWeek).toBeCloseTo((225 / 91) * 7);
  });
});

describe('momentum', () => {
  it('compares the last 13 weeks with the 13 before', () => {
    // Previous 13 weeks: every day moderate (3.5) = 24.5 a week. Last 13 weeks: every day a few (1.5) = 10.5.
    const today = '2026-09-30';
    const recentStart = plus(today, -90), prevStart = plus(recentStart, -91);
    const d = new Data({ entries: [...days(prevStart, 91, ['moderate']), ...days(recentStart, 91, ['a-few'])], intentions: [] });
    const m = momentum(d, today)!;
    expect(m.previous).toBeCloseTo(24.5);
    expect(m.recent).toBeCloseTo(10.5);
    expect(momentumText(m.diff)).toBe('About 14 fewer drinks a week than the previous 3 months');
  });
  it('needs 30 logged days in each window', () => {
    const d = new Data({ entries: days('2026-08-01', 61, ['clear']), intentions: [] });
    expect(momentum(d, '2026-09-30')).toBeNull();
  });
  it('wording', () => {
    expect(momentumText(0.4)).toBe('About the same as the previous 3 months');
    expect(momentumText(-0.6)).toBe('About 1 fewer drink a week than the previous 3 months');
    expect(momentumText(2.4)).toBe('About 2 more drinks a week than the previous 3 months');
  });
});

