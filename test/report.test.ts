import { describe, expect, it } from 'vitest';
import { Data, dayOfWeekLevels, totalClearDays, trackedDays, weeksMetInYear } from '../src/data/compute';
import { buildReport, defaultPeriod, previousPeriod } from '../src/data/report';
import { scenario } from './helpers';

type Lv = 'clear' | 'a-few' | 'moderate' | 'a-lot';
const e = (iso: string, lv: Lv) =>
  ({ id: iso, entry_date: iso, status: lv === 'clear' ? 'clear' : 'drinking', amount: lv === 'clear' ? null : lv, created_at: '', updated_at: '' }) as never;
const t3 = [{ id: 'i', weekly_target: 3, effective_date: '2026-01-05', created_at: '2026-01-01T00:00:00Z', updated_at: '' }] as never;

describe('month in review', () => {
  // August 2026: Aug 3–9 (Mon–Sun) c c c f m . . ; Aug 10–16 c f l . . . . ; July 31 clear (previous month)
  const entries = [
    e('2026-07-01', 'clear'), // tracking began at the start of July, so July is a fair comparison
    e('2026-07-31', 'clear'),
    e('2026-08-03', 'clear'), e('2026-08-04', 'clear'), e('2026-08-05', 'clear'), e('2026-08-06', 'a-few'), e('2026-08-07', 'moderate'),
    e('2026-08-10', 'clear'), e('2026-08-11', 'a-few'), e('2026-08-12', 'a-lot'),
  ];
  const d = new Data({ entries, intentions: t3 });
  const r = buildReport(d, { year: 2026, month: 8 }, '2026-09-30', { baselinePerWeek: 14, price: 10 });

  it('counts and completeness', () => {
    expect(r).toMatchObject({ start: '2026-08-01', end: '2026-08-31', complete: true, daysInPeriod: 31, logged: 8 });
    expect(r.levels).toEqual({ clear: 4, 'a-few': 2, moderate: 1, 'a-lot': 1 });
  });
  it('weeks by Thursday, met and targets', () => {
    // Weeks with Thursday in August: Jul 27 (Thu Jul 30 → July, no), Aug 3, 10, 17, 24, 31 (Thu Sep 3 → no) = 4
    expect(r.weeks).toEqual({ counted: 4, met: 1, exceeded: 0, before: 0 });
    expect(r.targets).toEqual([{ target: 3, from: '2026-08-03' }]);
    // Week of Jul 27 (first of the record) had 1 clear day: missed. Aug 3 met → back on track.
    expect(r.backOnTrack).toBe(1);
  });
  it('drinks per week: a range, open-ended with an "A lot" day', () => {
    // least = 1+3+1+5 = 10 drinks over 8 logged days → 10 × 7/8 = 8.75 a week; most open-ended
    expect(r.drinksPerWeek?.least).toBeCloseTo(8.75);
    expect(r.drinksPerWeek?.most).toBeNull();
  });
  it('savings against the baseline over logged days', () => {
    // baseline 2 a day × 8 days = 16; least drinks 10 → most saved 6 drinks × $10 = $60; least saved open-ended
    expect(r.savings?.most).toBeCloseTo(60);
    expect(r.savings?.least).toBeNull();
  });
  it('previous month for comparison, and the calendar', () => {
    expect(r.previous).toEqual({ clear: 2, logged: 2 });
    expect(r.calendar['2026-08-12']).toBe('a-lot');
    expect(Object.keys(r.calendar)).toHaveLength(8);
  });
  it('day of week, Monday first', () => {
    expect(r.dayOfWeek[0]).toEqual({ weekday: 1, clear: 2, aFew: 0, more: 0 }); // Mondays Aug 3, 10
    expect(r.dayOfWeek[2]).toEqual({ weekday: 3, clear: 1, aFew: 0, more: 1 }); // Wed Aug 5 clear, Aug 12 a lot
  });
});

describe('no comparison with a period tracked only partway', () => {
  it('first entry mid-July → August has nothing to compare with', () => {
    const entries = [e('2026-07-20', 'clear'), e('2026-08-03', 'clear')];
    const r = buildReport(new Data({ entries, intentions: t3 }), { year: 2026, month: 8 }, '2026-09-30', null);
    expect(r.previous).toBeNull();
  });
});

describe('back on track inside a report', () => {
  it('counts a met week after a missed one', () => {
    const entries = [e('2026-08-03', 'moderate'), ...['2026-08-10', '2026-08-11', '2026-08-12'].map((x) => e(x, 'clear'))];
    const r = buildReport(new Data({ entries, intentions: t3 }), { year: 2026, month: 8 }, '2026-09-30', null);
    expect(r.backOnTrack).toBe(1);
    expect(r.milestones.map((m) => m.title)).toContain('Back on track after a missed week');
  });
});

describe('a period still running', () => {
  it('ends today, is marked incomplete, and has no per-week figure under a week of data', () => {
    const r = buildReport(new Data({ entries: [e('2026-09-29', 'clear'), e('2026-09-30', 'a-few')], intentions: t3 }), { year: 2026, month: 9 }, '2026-09-30', null);
    expect(r).toMatchObject({ end: '2026-09-30', complete: false, daysInPeriod: 30, logged: 2, drinksPerWeek: null, savings: null });
  });
});

describe('year in review agrees with Trends', () => {
  it.each([1, 2, 3])('scenario %i', (seed) => {
    const s = scenario(seed, '2026-09-30');
    const d = new Data({ entries: s.entries as never, intentions: s.intentions as never });
    for (const y of [2025, 2026]) {
      const r = buildReport(d, { year: y, month: null }, '2026-09-30', null);
      expect(r.levels.clear).toBe(totalClearDays(d, y));
      expect(r.logged).toBe(trackedDays(d, y));
      expect(r.weeks.met).toBe(weeksMetInYear(d, '2026-09-30', y));
      const dow = dayOfWeekLevels(d, y);
      for (const row of r.dayOfWeek) expect(row).toEqual(dow[row.weekday]);
      expect(r.months.reduce((n, m) => n + m.clear, 0)).toBe(r.levels.clear);
    }
  });
});

describe('periods', () => {
  it('default is the last complete month; previous wraps the year', () => {
    expect(defaultPeriod('2026-09-30')).toEqual({ year: 2026, month: 8 });
    expect(defaultPeriod('2026-01-03')).toEqual({ year: 2025, month: 12 });
    expect(previousPeriod({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 });
    expect(previousPeriod({ year: 2026, month: null })).toEqual({ year: 2025, month: null });
  });
});

describe('report wording', async () => {
  const { comparisonText, drinksText } = await import('../src/lib/reportText');
  it('drinks', () => {
    expect(drinksText(8.75, 12.2)).toBe('About 9–12 drinks a week');
    expect(drinksText(8.75, null)).toBe('About 9 or more drinks a week');
    expect(drinksText(1.2, 1.4)).toBe('About 1 drink a week');
    expect(drinksText(0, 0)).toBe('About 0 drinks a week');
  });
  it('comparison', () => {
    expect(comparisonText(14, 10, 'July')).toBe('4 more clear days than July');
    expect(comparisonText(9, 10, 'July')).toBe('1 fewer clear day than July');
    expect(comparisonText(10, 10, '2025')).toBe('The same number of clear days as 2025');
  });
});

describe('ranges for Trends', async () => {
  const { summarizeRange, sameStretchLastYear, buildReport } = await import('../src/data/report');
  it('a whole year matches the year report', () => {
    const s = scenario(4, '2026-09-30');
    const d = new Data({ entries: s.entries as never, intentions: s.intentions as never });
    const r = buildReport(d, { year: 2025, month: null }, '2026-09-30', null);
    const x = summarizeRange(d, '2025-01-01', '2025-12-31');
    expect(x.levels).toEqual(r.levels);
    expect(x.logged).toBe(r.logged);
    expect(x.drinksPerWeek).toEqual(r.drinksPerWeek);
  });
  it('same stretch last year, leap day safe', () => {
    expect(sameStretchLastYear('2026-01-01', '2026-09-30')).toEqual({ start: '2025-01-01', end: '2025-09-30' });
    expect(sameStretchLastYear('2028-01-01', '2028-02-29')).toEqual({ start: '2027-01-01', end: '2027-02-28' });
  });
});

describe('weekday details', async () => {
  const { weekdaySummary } = await import('../src/data/report');
  const { typicalDayText } = await import('../src/lib/reportText');
  it('counts and drinks on a typical day of that weekday', () => {
    // Fridays: Aug 7 clear, Aug 14 a few (1–2), Aug 21 moderate (3–4); a Monday that mustn't count.
    const d = new Data({ entries: [e('2026-08-07', 'clear'), e('2026-08-14', 'a-few'), e('2026-08-21', 'moderate'), e('2026-08-10', 'a-lot')], intentions: t3 });
    const w = weekdaySummary(d, '2026-08-01', '2026-08-31', 5);
    expect(w.logged).toBe(3);
    expect(w.levels).toEqual({ clear: 1, 'a-few': 1, moderate: 1, 'a-lot': 0 });
    expect(w.perDay?.least).toBeCloseTo(4 / 3);
    expect(w.perDay?.most).toBeCloseTo(2);
    expect(typicalDayText(w.perDay!.least, w.perDay!.most, 'Friday')).toBe('About 1.3–2 drinks on a typical Friday');
  });
  it('wording edge cases', () => {
    expect(typicalDayText(0, 0, 'Monday')).toBe('No drinks on a typical Monday');
    expect(typicalDayText(5, null, 'Saturday')).toBe('About 5 or more drinks on a typical Saturday');
    expect(typicalDayText(1, 1, 'Tuesday')).toBe('About 1 drink on a typical Tuesday');
  });
});

describe('year report months: no "not logged" for the future or before tracking', () => {
  it('available days run from the first logged day to today', () => {
    const d = new Data({ entries: [e('2026-03-15', 'clear'), e('2026-03-16', 'clear')], intentions: t3 });
    const r = buildReport(d, { year: 2026, month: null }, '2026-09-30', null);
    expect(r.months[0].available).toBe(0);  // January: before tracking
    expect(r.months[2].available).toBe(17); // March 15–31
    expect(r.months[8].available).toBe(30); // September, to today
    expect(r.months[9].available).toBe(0);  // October: hasn't happened
  });
});
