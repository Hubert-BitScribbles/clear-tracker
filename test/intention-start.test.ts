// Weeks before the first intention (days backfilled from before the app was
// first used) aren't measured: not met, not missed, not counted.
import { describe, expect, it } from 'vitest';
import {
  clearTierEarnings, Data, intentionsMetInMonth, longestWeekStreak, milestones, weeksForYear, weeksMetCount,
} from '../src/data/compute';
import { backOnTrackWeeks } from '../src/data/milestones';
import { buildReport } from '../src/data/report';

const clear = (iso: string) =>
  ({ id: iso, entry_date: iso, status: 'clear', amount: null, created_at: '', updated_at: '' }) as never;
const intention = (target: number, from: string) =>
  ({ id: from, weekly_target: target, effective_date: from, created_at: `${from}T00:00:00Z`, updated_at: '' }) as never;
const week = (monday: string) => Array.from({ length: 7 }, (_, i) => clear(addDays(monday, i)));
function addDays(iso: string, n: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

// First used the week of Mon 7 Sep 2026, intention 3. Backfilled: two fully
// clear weeks in August (Aug 24, Aug 31) and an empty week before them.
// From Sep 7: a missed week (1 clear), then a met week (4 clear).
const today = '2026-09-30';
const entries = [
  ...week('2026-08-24'), ...week('2026-08-31'),
  clear('2026-09-08'),
  clear('2026-09-14'), clear('2026-09-15'), clear('2026-09-16'), clear('2026-09-17'),
];
const d = new Data({ entries, intentions: [intention(3, '2026-09-07')] });

describe('weeks before the first intention', () => {
  it('have no intention, and are never met', () => {
    expect(d.intentionStart).toBe('2026-09-07');
    expect(d.targetForWeek('2026-08-31')).toBeNull();
    expect(d.weekMet('2026-08-31')).toBe(false); // 7 clear days, but nothing to meet
    expect(d.targetForWeek('2026-09-07')).toBe(3);
  });
  it('are left out of the weeks measured', () => {
    expect(d.completedWeeks(today)[0]).toBe('2026-08-24');
    expect(d.intentionWeeks(today)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21']);
    expect(weeksMetCount(d, today)).toBe(1);
    expect(longestWeekStreak(d, today)).toBe(1); // the clear August weeks don't make a streak
  });
  it('earn no week milestones', () => {
    const m = milestones(d, today);
    expect(m.firstClearWeekEndIso).toBe('2026-09-20'); // not Aug 30
    expect(m.beyondTargetInstances.map((b) => b.weekStartIso)).toEqual(['2026-09-14']);
    // Sep 7 (1 clear, 6 unlogged) isn't missed for certain — not enough logged
    // to say — so Sep 14 isn't "back on track" (rc.6). Sep 7 itself can't be
    // "back" from the unmeasured weeks before it.
    expect(backOnTrackWeeks(d, today)).toEqual([]);
  });
  it('still count as clear days', () => {
    // The 7th clear day is Aug 30, backfilled from before the first intention.
    expect(clearTierEarnings(d)[0]).toEqual({ threshold: 7, reachedDateIso: '2026-08-30' });
  });
  it('show no target in the week lists, and aren\'t counted in a month', () => {
    const aug = weeksForYear(d, 2026).filter((w) => w.weekStartIso.startsWith('2026-08'));
    expect(aug.every((w) => w.target === null)).toBe(true);
    expect(intentionsMetInMonth(d, today, 2026, 8)).toEqual({ met: 0, counted: 0 });
    expect(intentionsMetInMonth(d, today, 2026, 9)).toEqual({ met: 1, counted: 3 });
  });
  it('are reported as not measured', () => {
    const aug = buildReport(d, { year: 2026, month: 8 }, today, null);
    expect(aug.weeks).toEqual({ counted: 0, met: 0, exceeded: 0, before: 1 }); // weeks by Thursday: only Aug 24 is August's
    const sep = buildReport(d, { year: 2026, month: 9 }, today, null);
    expect(sep.weeks).toMatchObject({ counted: 3, met: 1, before: 1 }); // Aug 31 belongs to September
  });
});
