import { describe, expect, it } from 'vitest';
import { Data, weeksForYear } from '../src/data/compute';
import { backOnTrackWeeks } from '../src/data/milestones';
import { alignmentOf } from '../src/components/IntentionChart';
import { drinksText, typicalDayText, wholeDrinks } from '../src/lib/reportText';

type Lv = 'clear' | 'a-few' | 'moderate' | 'a-lot';
const plus = (iso: string, n: number) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);
const e = (iso: string, lv: Lv) =>
  ({ id: iso, entry_date: iso, status: lv === 'clear' ? 'clear' : 'drinking', amount: lv === 'clear' ? null : lv, created_at: '', updated_at: '' }) as never;
/** A week from a pattern like "cc.mm..": c clear, m moderate, . unlogged. */
const week = (monday: string, pattern: string) =>
  [...pattern].flatMap((ch, i) => (ch === '.' ? [] : [e(plus(monday, i), ch === 'c' ? 'clear' : 'moderate')]));
const target = (t: number, monday: string) =>
  ({ id: 'i1', weekly_target: t, effective_date: monday, created_at: `${monday}T00:00:00Z`, updated_at: '' }) as never;

describe('whole drinks', () => {
  it('.5 and under rounds down, over .5 rounds up', () => {
    expect([8.5, 8.4, 8.51, 8.6, 9, 0.5, 0.6].map(wholeDrinks)).toEqual([8, 8, 9, 9, 9, 0, 1]);
  });
  it('wording uses whole drinks', () => {
    expect(drinksText({ perWeek: 8.5, orMore: false })).toBe('About 8 drinks a week');
    expect(typicalDayText(1.2, 1.8, 'Friday')).toBe('About 1–2 drinks on a typical Friday');
    expect(typicalDayText(0.3, 0.9, 'Monday')).toBe('Up to 1 drink on a typical Monday');
    expect(typicalDayText(0.2, 0.4, 'Tuesday')).toBe('No drinks on a typical Tuesday');
  });
});

describe('partly logged weeks', () => {
  const at = (pattern: string, t = 3) => {
    const d = new Data({ entries: week('2026-09-07', pattern), intentions: [target(t, '2026-09-07')] });
    return alignmentOf(weeksForYear(d, 2026).find((w) => w.weekStartIso === '2026-09-07')!);
  };
  it('met with enough clear days, whatever the gaps', () => expect(at('ccc....')).toBe('met'));
  it('beyond', () => expect(at('cccc...')).toBe('exceeded'));
  it('two drinking days and five unlogged, intention 3: not enough logged to say', () => expect(at('mm.....')).toBe('unclear'));
  it('missed for certain: intention 5, three drinking days', () => expect(at('mmm....', 5)).toBe('partial'));
  it('fully logged and short: missed', () => expect(at('ccmmmmm')).toBe('partial'));
  it('nothing logged: unlogged', () => expect(at('.......')).toBe('unlogged'));
  it('before the first intention: shown, not measured', () => {
    const d = new Data({ entries: week('2026-08-31', 'cc.....'), intentions: [target(3, '2026-09-07')] });
    expect(alignmentOf(weeksForYear(d, 2026).find((w) => w.weekStartIso === '2026-08-31')!)).toBe('before');
  });
  it('filling in the gaps settles it', () => {
    expect(at('mm.....')).toBe('unclear');
    expect(at('mmccc..')).toBe('met');
    expect(at('mmmmm..')).toBe('partial');
  });
});

describe('back on track comes after a week missed for certain', () => {
  const run = (first: string) => {
    const d = new Data({ entries: [...week('2026-09-07', first), ...week('2026-09-14', 'ccc....')], intentions: [target(3, '2026-09-07')] });
    return backOnTrackWeeks(d, '2026-09-30');
  };
  it('after a missed week: yes', () => expect(run('ccmmmmm')).toEqual(['2026-09-20']));
  it('after a "not enough logged" week: no', () => expect(run('mm.....')).toEqual([]));
  it('after an unlogged week: no', () => expect(run('.......')).toEqual([]));
});

describe('report (rc.7)', () => {
  it('names weeks with too few days logged, gives the drinks direction, and keeps challenges apart from milestones', async () => {
    const { buildReport } = await import('../src/data/report');
    const days = (start: string, n: number, lv: Lv) => Array.from({ length: n }, (_, i) => e(plus(start, i), lv));
    // August: every day moderate; September: every day a few. A clear weekend challenge from Sep 4.
    const entries = [...days('2026-08-01', 31, 'moderate'), ...days('2026-09-01', 30, 'a-few').map((x: never, i: number) =>
      [3, 4, 5].includes(i) ? e(plus('2026-09-01', i), 'clear') : x)];
    const d = new Data({ entries, intentions: [target(3, '2026-08-03')] });
    const r = buildReport(d, { year: 2026, month: 9 }, '2026-10-08', null, { weekendRuns: [{ from: '2026-09-04' }], weekRuns: [], months: ['2026-09'] });
    expect(r.drinksChange?.diff).toBeLessThan(0); // fewer drinks than August
    expect(r.challenges.map((c) => c.title)).toEqual(['A clear weekend', 'Clear September 2026']);
    expect(r.challenges[1].note).toBe('chosen; not this time');
    expect(r.milestones.some((m) => m.title === 'A clear weekend')).toBe(false);
  });
});
