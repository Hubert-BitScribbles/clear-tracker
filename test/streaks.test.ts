// Best streaks by year. All-time figures must equal what native Trends
// shows (max of longest and current); per-year figures are checked on
// hand-built cases.

import { describe, expect, it, vi } from 'vitest';
import { bestClearDayStreak, bestWeekStreak, Data } from '../src/data/compute';
import * as P from '../src/data/database';
import { scenario, type Api } from './helpers';

const clearDays = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10) + i));
    const iso = d.toISOString().slice(0, 10);
    return { id: iso, entry_date: iso, status: 'clear', amount: null, created_at: '', updated_at: '' } as never;
  });
const target1 = [{ id: 'i', weekly_target: 1, effective_date: '2024-01-01', created_at: '', updated_at: '' }];

describe('best streaks by year', () => {
  it('a streak over New Year counts in full toward the later year', () => {
    // Every day clear from Mon 2 Dec 2024 to Sun 19 Jan 2025: 7 met weeks.
    const d = new Data({ entries: clearDays('2024-12-02', 49), intentions: target1 });
    expect(bestWeekStreak(d, '2025-06-01', 2025)).toBe(7);
    expect(bestWeekStreak(d, '2025-06-01', 2024)).toBe(0);
    expect(bestClearDayStreak(d, 2025)).toBe(49);
    expect(bestClearDayStreak(d, 2024)).toBe(0);
  });

  it('the current streak counts toward this year, and never exceeds this year\'s best', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 14, 12)); // Wed 14 Jan 2026
    await P.restoreFromBackup(clearDays('2025-12-01', 45), target1);
    const now = await P.getCurrentStreak();
    const best = await P.getBestStreaks(2026);
    expect(now).toBe(7); // Dec 1 → current week (Jan 12), all met
    expect(best.week).toBe(7);
    expect((await P.getBestStreaks(2025)).week).toBe(0);
    vi.useRealTimers();
  });

  it('all time equals native: max(longest, current), across many scenarios', async () => {
    for (const today of ['2026-09-30', '2026-01-04', '2025-12-31', '2026-03-09']) {
      for (const seed of [1, 2, 3, 4]) {
        const [y, m, dd] = today.split('-').map(Number);
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(y, m - 1, dd, 12));
        const s = scenario(seed * 97 + dd, today, { longClearRuns: seed > 2 });
        vi.resetModules();
        const N = (await import('./native/database.native')) as unknown as Api;
        await N.restoreFromBackup(s.entries, s.intentions);
        await P.restoreFromBackup(s.entries, s.intentions);
        const nativeWeek = Math.max(await N.getLongestWeekStreak(), await N.getCurrentStreak());
        const nativeDay = Math.max(await N.getLongestClearDayStreak(), await N.getCurrentClearDayStreak());
        const ours = await P.getBestStreaks('all');
        expect(ours.week, `${today} seed ${seed}`).toBe(nativeWeek);
        // Native's day figure carries its DST bug; compare with the fixed version.
        expect(ours.day).toBe(Math.max(await P.getLongestClearDayStreak(), await P.getCurrentClearDayStreak()));
        expect(nativeDay).toBeLessThanOrEqual(ours.day);
        // And per-year bests never exceed the overall best.
        for (const yr of [y - 1, y]) {
          const b = await P.getBestStreaks(yr);
          expect(b.week).toBeLessThanOrEqual(ours.week);
          expect(b.day).toBeLessThanOrEqual(ours.day);
        }
        vi.useRealTimers();
      }
    }
  });
});
