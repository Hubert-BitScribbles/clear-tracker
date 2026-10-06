import { describe, expect, it } from 'vitest';
import { firstThreeMonths, momentumIncludes } from '../src/data/baseline';
import { chosenMonthRanges, clearWeekends, clearWeeks, currentSpan, monthChallenge, parseChallenges, toggleRun, weekendStart, weekStart } from '../src/data/challenges';
import { Data } from '../src/data/compute';

type Lv = 'clear' | 'a-few' | 'moderate' | 'a-lot';
const plus = (iso: string, n: number) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);
const e = (iso: string, lv: Lv) =>
  ({ id: iso, entry_date: iso, status: lv === 'clear' ? 'clear' : 'drinking', amount: lv === 'clear' ? null : lv, created_at: '', updated_at: '' }) as never;
const run = (start: string, n: number, lv: Lv = 'clear') => Array.from({ length: n }, (_, i) => e(plus(start, i), lv));

describe('clear weekends and weeks: runs from a start date', () => {
  // Mon Sep 7 – Sun Sep 13 all clear; Sep 14–17 a few, Fri–Sun Sep 18–20 clear; Sep 21–25 clear, Sat 26 moderate, Sun 27 clear.
  const entries = [
    ...run('2026-09-07', 7),
    ...run('2026-09-14', 4, 'a-few'), ...run('2026-09-18', 3),
    ...run('2026-09-21', 5), e('2026-09-26', 'moderate'), e('2026-09-27', 'clear'),
  ];
  const d = new Data({ entries, intentions: [] });
  it('only weekends and weeks inside a run count — nothing before it', () => {
    const fromSep11 = [{ from: '2026-09-11' }];
    expect(clearWeekends(d, '2026-09-30', fromSep11)).toEqual(['2026-09-13', '2026-09-20']);
    expect(clearWeekends(d, '2026-09-30', [{ from: '2026-09-18' }])).toEqual(['2026-09-20']);
    expect(clearWeeks(d, '2026-09-30', [{ from: '2026-09-07' }])).toEqual(['2026-09-13']);
    expect(clearWeeks(d, '2026-09-30', [{ from: '2026-09-14' }])).toEqual([]);
    expect(clearWeekends(d, '2026-09-30', [])).toEqual([]);
  });
  it('switching off keeps what was earned; a weekend after the run ended does not count', () => {
    expect(clearWeekends(d, '2026-09-30', [{ from: '2026-09-11', to: '2026-09-16' }])).toEqual(['2026-09-13']);
  });
  it('a weekend counts once its Sunday is logged, not before', () => {
    expect(clearWeekends(new Data({ entries: run('2026-09-11', 2), intentions: [] }), '2026-09-13', [{ from: '2026-09-11' }])).toEqual([]);
  });
});

describe('start dates, like an intention', () => {
  const empty = new Data({ entries: [], intentions: [] });
  it('weekend: this Friday if not logged yet, else next', () => {
    expect(weekendStart(empty, '2026-09-30')).toBe('2026-10-02');                                   // Wed → this Fri
    expect(weekendStart(empty, '2026-10-03')).toBe('2026-10-02');                                   // Sat, Fri unlogged → this weekend
    expect(weekendStart(new Data({ entries: [e('2026-10-02', 'clear')], intentions: [] }), '2026-10-03')).toBe('2026-10-09');
  });
  it('week: this Monday if nothing this week is logged yet, else next', () => {
    expect(weekStart(empty, '2026-09-30')).toBe('2026-09-28');
    expect(weekStart(new Data({ entries: [e('2026-09-29', 'a-few')], intentions: [] }), '2026-09-30')).toBe('2026-10-05');
  });
  it('switching on and off', () => {
    const on = toggleRun([], true, '2026-10-02', '2026-09-30');
    expect(on).toEqual([{ from: '2026-10-02' }]);
    expect(toggleRun(on, false, 'x', '2026-09-30')).toEqual([]); // off before it began: no empty run kept
    expect(toggleRun(on, false, 'x', '2026-10-20')).toEqual([{ from: '2026-10-02', to: '2026-10-20' }]);
  });
  it('the current weekend and where it stands', () => {
    const runs = [{ from: '2026-10-02' }];
    expect(currentSpan(empty, '2026-09-30', runs, 'weekend')).toEqual({ state: 'upcoming', first: '2026-10-02', last: '2026-10-04' });
    const d2 = new Data({ entries: [e('2026-10-02', 'clear')], intentions: [] });
    expect(currentSpan(d2, '2026-10-03', runs, 'weekend')).toEqual({ state: 'under-way', first: '2026-10-02', last: '2026-10-04', toLog: 0 });
    const d3 = new Data({ entries: [e('2026-10-02', 'clear'), e('2026-10-03', 'a-few')], intentions: [] });
    expect(currentSpan(d3, '2026-10-03', runs, 'weekend')).toMatchObject({ state: 'not-this-time' });
    const d4 = new Data({ entries: run('2026-10-02', 3), intentions: [] });
    expect(currentSpan(d4, '2026-10-04', runs, 'weekend')).toMatchObject({ state: 'earned' });
  });
});

describe('a chosen month (all or nothing)', () => {
  it('upcoming', () => expect(monthChallenge(new Data({ entries: [], intentions: [] }), '2026-12-15', '2027-01')).toEqual({ ym: '2027-01', state: 'upcoming', starts: '2027-01-01' }));
  it('under way: day of the month, and earlier days not yet logged', () => {
    const d = new Data({ entries: [...run('2027-01-01', 5), ...run('2027-01-08', 4)], intentions: [] }); // Jan 6–7 unlogged
    expect(monthChallenge(d, '2027-01-12', '2027-01')).toEqual({ ym: '2027-01', state: 'under-way', day: 12, days: 31, toLog: 2 }); // Jan 6 and 7
  });
  it('one drinking day ends it, even with clear days after', () => {
    const d = new Data({ entries: [...run('2027-01-01', 2), e('2027-01-03', 'a-few'), ...run('2027-01-04', 28)], intentions: [] });
    expect(monthChallenge(d, '2027-02-05', '2027-01')).toEqual({ ym: '2027-01', state: 'ended' });
  });
  it('over, but days still to log → not ended; logging them earns it', () => {
    const partial = new Data({ entries: run('2027-01-01', 30), intentions: [] }); // Jan 31 unlogged
    expect(monthChallenge(partial, '2027-02-02', '2027-01')).toEqual({ ym: '2027-01', state: 'to-log', toLog: 1 });
    const full = new Data({ entries: run('2027-01-01', 31), intentions: [] });
    expect(monthChallenge(full, '2027-02-02', '2027-01')).toEqual({ ym: '2027-01', state: 'earned', date: '2027-01-31' });
  });
  it('settings parse safely', () => {
    expect(parseChallenges('{"weekendRuns":[{"from":"2026-10-02"},{"from":"bad"}],"months":["2027-01","bad","2027-01"]}'))
      .toEqual({ weekendRuns: [{ from: '2026-10-02' }], weekRuns: [], months: ['2027-01'] });
    expect(parseChallenges('nonsense')).toEqual({ weekendRuns: [], weekRuns: [], months: [] });
  });
});

describe('challenge months and the baseline', () => {
  const jan = chosenMonthRanges({ weekendRuns: [], weekRuns: [], months: ['2026-01'] });
  it('a first-3-months window that would include the chosen month starts after it', () => {
    // Tracking began Jan 1 with a clear January, then mixed days.
    const entries = [...run('2026-01-01', 31), ...Array.from({ length: 120 }, (_, i) => e(plus('2026-02-01', i), i % 2 ? 'moderate' : 'clear'))];
    const d = new Data({ entries, intentions: [] });
    const plain = firstThreeMonths(d, '2026-09-30');
    const skipping = firstThreeMonths(d, '2026-09-30', jan);
    expect(plain).toMatchObject({ status: 'ready', start: '2026-01-01' });
    expect(skipping).toMatchObject({ status: 'ready', start: '2026-02-01', skipped: ['2026-01'] });
    if (plain.status === 'ready' && skipping.status === 'ready') expect(skipping.perWeek).toBeGreaterThan(plain.perWeek);
  });
  it('momentum reports a chosen month inside its 26 weeks', () => {
    expect(momentumIncludes('2026-04-15', jan)).toEqual(['2026-01']);
    expect(momentumIncludes('2026-09-30', jan)).toEqual([]);
  });
});
