import { describe, expect, it } from 'vitest';
import { Data, savingsEstimate } from '../src/data/compute';
import { describeSavings, priceText } from '../src/lib/savings';

const day = (d: string, level: 'clear' | 'a-few' | 'moderate' | 'a-lot') => ({
  id: d, entry_date: d, status: level === 'clear' ? 'clear' : 'drinking', amount: level === 'clear' ? null : level,
  created_at: '', updated_at: '',
}) as never;
const est = (days: [string, 'clear' | 'a-few' | 'moderate' | 'a-lot'][], baseline: number, year?: number) =>
  savingsEstimate(new Data({ entries: days.map(([d, l]) => day(d, l)), intentions: [] }), baseline, year);

describe('savings estimate (drinks)', () => {
  it('a clear day saves baseline ÷ 7', () => {
    expect(est([['2026-09-01', 'clear']], 14)).toEqual({ loggedDays: 1, mostDrinks: 2, leastDrinks: 2 });
  });
  it('a few saves 1 or 0 against 2 a day', () => {
    expect(est([['2026-09-01', 'a-few']], 14)).toEqual({ loggedDays: 1, mostDrinks: 1, leastDrinks: 0 });
  });
  it('moderate against 2 a day is 1–2 over', () => {
    expect(est([['2026-09-01', 'moderate']], 14)).toEqual({ loggedDays: 1, mostDrinks: -1, leastDrinks: -2 });
  });
  it('one "A lot" day makes the low end open-ended', () => {
    const e = est([['2026-09-01', 'clear'], ['2026-09-02', 'a-lot']], 14);
    expect(e).toEqual({ loggedDays: 2, mostDrinks: 2 - 3, leastDrinks: null });
  });
  it('unlogged days are not counted, and the year filter applies', () => {
    const e = est([['2025-12-31', 'clear'], ['2026-01-01', 'clear']], 7, 2026);
    expect(e).toEqual({ loggedDays: 1, mostDrinks: 1, leastDrinks: 1 });
  });
});

describe('savings wording', () => {
  it('a range when every amount is bounded', () => {
    expect(describeSavings(820, 640)).toBe('About $640–$820 saved');
    expect(describeSavings(100, 100)).toBe('About $100 saved');
  });
  it('"up to" with an A lot day, savings positive', () => {
    expect(describeSavings(820, null)).toBe('Up to $820 saved');
  });
  it('"at least … over baseline" with an A lot day, savings negative', () => {
    expect(describeSavings(-40, null)).toBe('At least $40 over baseline');
  });
  it('over baseline as a range when bounded', () => {
    expect(describeSavings(-20, -40)).toBe('About $20–$40 over baseline');
  });
  it('a range that straddles zero says both', () => {
    expect(describeSavings(30, -20)).toBe('Between $20 over baseline and $30 saved');
  });
  it('rounds to whole dollars, and collapses a range that rounds to one figure', () => {
    expect(describeSavings(12.6, 12.4)).toBe('About $12–$13 saved');
    expect(describeSavings(12.4, 12.2)).toBe('About $12 saved');
  });
  it('weekly phrasing', () => {
    expect(describeSavings(19, 15, true)).toBe('About $15–$19 saved a week');
    expect(describeSavings(19, null, true)).toBe('Up to $19 saved a week');
    expect(describeSavings(-6, null, true)).toBe('At least $6 a week over baseline');
    expect(describeSavings(-3, -6, true)).toBe('About $3–$6 a week over baseline');
    expect(describeSavings(5, -3, true)).toBe('Between $3 over baseline and $5 saved, a week');
  });
  it('prices keep their cents', () => {
    expect(priceText(9)).toBe('$9');
    expect(priceText(8.5)).toBe('$8.50');
    expect(priceText(12.25)).toBe('$12.25');
  });
});
