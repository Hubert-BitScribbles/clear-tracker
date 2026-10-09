import { describe, expect, it } from 'vitest';
import { Data } from '../src/data/compute';
import { buildReport, summarizeRange } from '../src/data/report';
import { monthlyRates } from '../src/data/trend';
import { drinksText } from '../src/lib/reportText';

type Lv = 'clear' | 'a-few' | 'moderate' | 'a-lot';
const e = (iso: string, lv: Lv) =>
  ({ id: iso, entry_date: iso, status: lv === 'clear' ? 'clear' : 'drinking', amount: lv === 'clear' ? null : lv, created_at: '', updated_at: '' }) as never;

// Hugh's September 2026: 15 clear, 1 a few, 9 moderate, 5 a lot, every day logged.
const levels: Lv[] = [...Array(15).fill('clear'), 'a-few', ...Array(9).fill('moderate'), ...Array(5).fill('a-lot')];
const sept = levels.map((lv, i) => e(`2026-09-${String(i + 1).padStart(2, '0')}`, lv));
const today = '2026-10-09';

describe('one estimate of drinks a week, wherever it shows', () => {
  const d = new Data({ entries: sept, intentions: [] });
  const chart = monthlyRates(d, today, [{ year: 2026, month: 9 }])[0];
  const row = summarizeRange(d, '2026-09-01', '2026-09-30').drinksPerWeek!;
  const report = buildReport(d, { year: 2026, month: 9 }, today, null).drinksPerWeek!;

  it('the chart, Month by month and the report agree', () => {
    // 1.5 + 9 × 3.5 + 5 × 5 = 58 drinks over 30 days → 13.53 a week; A lot days → or more
    expect(chart.perWeek).toBeCloseTo(13.533, 2);
    expect(chart.orMore).toBe(true);
    expect(row).toEqual({ perWeek: chart.perWeek, orMore: true });
    expect(report).toEqual(row);
  });
  it('and read the same', () => {
    const t = drinksText(row, 'September');
    expect(t).toBe('September: about 14 or more drinks a week');
    expect(drinksText({ perWeek: chart.perWeek!, orMore: chart.orMore }, 'September')).toBe(t);
  });
  it('no A lot day: no "or more"', () => {
    // 1.5 + 9 × 3.5 = 33 drinks over 25 days → 9.24 a week
    const d2 = new Data({ entries: sept.slice(0, 25), intentions: [] });
    expect(drinksText(summarizeRange(d2, '2026-09-01', '2026-09-30').drinksPerWeek!, 'September')).toBe('September: about 9 drinks a week');
  });
});
