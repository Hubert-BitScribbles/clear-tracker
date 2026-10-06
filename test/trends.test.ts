import { describe, expect, it } from 'vitest';
import { daysAvailable } from '../src/data/compute';

// Native: Math.floor((now - Jan 1 local midnight) / 86400000) + 1.
function nativeElapsed(year: number, now: Date) {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (year < now.getFullYear()) return isLeap ? 366 : 365;
  return Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1;
}

describe('days available (Trends "X of Y")', () => {
  it('past years are whole years, leap years included', () => {
    expect(daysAvailable('2026-09-30', 2025, '2024-05-01')).toBe(365);
    expect(daysAvailable('2026-09-30', 2024, '2024-05-01')).toBe(366);
  });
  it('current year runs from 1 January to today inclusive', () => {
    expect(daysAvailable('2026-01-01', 2026, null)).toBe(1);
    expect(daysAvailable('2026-03-09', 2026, null)).toBe(68);
    expect(daysAvailable('2026-12-31', 2026, null)).toBe(365);
  });
  it('all time runs from the first logged day', () => {
    expect(daysAvailable('2026-09-30', 'all', '2026-09-30')).toBe(1);
    expect(daysAvailable('2026-09-30', 'all', '2025-12-31')).toBe(274);
    expect(daysAvailable('2026-09-30', 'all', null)).toBe(0);
  });
  it('matches native at every hour of 2026, except native\'s clock-change slips', () => {
    let short = 0;
    let over = 0;
    for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const expected = Math.round((Date.UTC(2026, d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 86400000) + 1;
      expect(daysAvailable(iso, 2026, null)).toBe(expected);
      for (const h of [0, 1, 12, 23]) {
        const diff = expected - nativeElapsed(2026, new Date(2026, d.getMonth(), d.getDate(), h, 30));
        if (diff === 0) continue;
        // Native is only ever off by one day, and only in the hour either side of midnight.
        expect(Math.abs(diff)).toBe(1);
        expect([0, 23]).toContain(h);
        if (diff > 0) short++;
        else over++;
      }
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`[${tz}] native was one day short on ${short} nights and one too many on ${over}`);
  });
});

describe('day-of-week levels and monthly clear counts', () => {
  it('agree with the native-checked breakdown and month counts', async () => {
    const P = await import('../src/data/database');
    const { scenario } = await import('./helpers');
    const { entries, intentions } = scenario(11, '2026-09-30');
    await P.restoreFromBackup(entries, intentions);
    for (const y of [undefined, 2025, 2026]) {
      const two = await P.getDayOfWeekBreakdown(y);
      const three = await P.getDayOfWeekLevels(y);
      three.forEach((t, i) => {
        expect(t.clear).toBe(two[i].clear);
        expect(t.aFew + t.more).toBe(two[i].drinking);
      });
    }
    const byMonth = await P.getClearDaysByMonth(2026);
    for (let m = 1; m <= 12; m++) expect(byMonth[m - 1]).toBe(await P.getClearDaysInMonth(2026, m));
    // And "a few" is counted separately from the rest
    const aFew = entries.filter((e) => e.status === 'drinking' && e.amount === 'a-few').length;
    expect((await P.getDayOfWeekLevels()).reduce((n, s) => n + s.aFew, 0)).toBe(aFew);
  });
});

describe('intentions met in a month (Check-in card)', async () => {
  const { Data, intentionsMetInMonth } = await import('../src/data/compute');
  const e = (iso: string) => ({ id: iso, entry_date: iso, status: 'clear', amount: null, created_at: '', updated_at: '' }) as never;
  const t2 = [{ id: 'i', weekly_target: 2, effective_date: '2026-08-03', created_at: '', updated_at: '' }] as never;
  // September 2026 weeks (Thursday in Sep): Aug 31, Sep 7, 14, 21, 28 (Thu Oct 1 → October).
  const entries = ['2026-08-31', '2026-09-01', '2026-09-07', '2026-09-14', '2026-09-15', '2026-09-21', '2026-09-22'].map(e);
  const d = new Data({ entries, intentions: t2 });
  it('past weeks all count; met ones are counted', () => {
    // On Oct 10: Aug 31 met, Sep 7 not (1), Sep 14 met, Sep 21 met → 3 of 4
    expect(intentionsMetInMonth(d, '2026-10-10', 2026, 9)).toEqual({ met: 3, counted: 4 });
  });
  it('the week in progress counts only once met', () => {
    // On Sep 21 (Monday): weeks Aug 31, Sep 7, Sep 14 complete (2 met); Sep 21 in progress, 1 clear so far → not counted
    expect(intentionsMetInMonth(new Data({ entries: entries.slice(0, 6), intentions: t2 }), '2026-09-21', 2026, 9)).toEqual({ met: 2, counted: 3 });
    // Sep 22 (Tuesday): 2 clear this week → met → counted
    expect(intentionsMetInMonth(d, '2026-09-22', 2026, 9)).toEqual({ met: 3, counted: 4 });
  });
  it('a month with no weeks yet', () => {
    // Oct 1: the week of Sep 28 belongs to October but isn't complete or met
    expect(intentionsMetInMonth(d, '2026-10-01', 2026, 10)).toEqual({ met: 0, counted: 0 });
  });
});
