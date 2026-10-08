import { describe, expect, it } from 'vitest';
import { Data } from '../src/data/compute';
import { earnedMilestones, upNext } from '../src/data/timeline';

type Lv = 'clear' | 'a-few' | 'moderate' | 'a-lot';
const plus = (iso: string, n: number) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);
const e = (iso: string, lv: Lv) =>
  ({ id: iso, entry_date: iso, status: lv === 'clear' ? 'clear' : 'drinking', amount: lv === 'clear' ? null : lv, created_at: '', updated_at: '' }) as never;
const days = (start: string, n: number, lv: Lv) => Array.from({ length: n }, (_, i) => e(plus(start, i), lv));
const target = (t: number, monday: string) =>
  ({ id: 'i1', weekly_target: t, effective_date: monday, created_at: `${monday}T00:00:00Z`, updated_at: '' }) as never;

describe('a tap steps from what is stored, not from what the screen shows', () => {
  it('another window logged the day Clear; this window still shows it unlogged', async () => {
    const P = await import('../src/data/database');
    await P.resetDatabase();
    await P.cycleDay('2026-10-01', null); // the other window: unlogged → Clear
    // This window still shows the day unlogged; its tap must step Clear → A few,
    // not try to add a second entry for the same date.
    expect(await P.cycleDay('2026-10-01', null)).toBe('a-few');
    expect(await P.getEntryCount()).toBe(1);
  });
  it('this window shows Moderate, but the stored level is A few', async () => {
    const P = await import('../src/data/database');
    await P.resetDatabase();
    await P.cycleDay('2026-10-02', null);
    await P.cycleDay('2026-10-02', 'clear'); // A few
    expect(await P.cycleDay('2026-10-02', 'moderate')).toBe('moderate'); // from A few, not from Moderate
  });
});

describe('milestones after the Trends overlap review', () => {
  // 4 weeks in a row with every day clear, intention 3.
  const d = new Data({ entries: days('2026-09-07', 28, 'clear'), intentions: [target(3, '2026-09-07')] });
  it('week streaks are earned for everyone, with no setting', () => {
    const titles = earnedMilestones(d, '2026-10-06').map((m) => m.title);
    expect(titles).toContain('2-week streak');
    expect(titles).toContain('4-week streak');
  });
  it('no "weeks met in 2026" or "$… kept" milestones any more', () => {
    const titles = earnedMilestones(d, '2026-10-06').map((m) => m.title);
    expect(titles.some((t) => /weeks met in|kept$/.test(t))).toBe(false);
  });
  it('Up next includes the next week streak', () => {
    expect(upNext(d, '2026-10-06', { limit: 10 }).map((n) => n.title)).toContain('8-week streak');
  });
});

describe('the new-milestone line on Check-in', () => {
  it('a first run counts everything already earned as seen; later milestones show newest first until seen', async () => {
    const P = await import('../src/data/database');
    await P.resetDatabase();
    await P.restoreFromBackup(days('2026-09-01', 7, 'clear') as never, []);
    expect(await P.getNewMilestones('2026-09-07')).toEqual([]); // 7 clear days etc.: history, not news
    await P.restoreFromBackup(days('2026-09-01', 14, 'clear') as never, []);
    const fresh = await P.getNewMilestones('2026-09-14');
    expect(fresh.map((m) => m.title)).toContain('14 clear days');
    expect(fresh[0].date >= fresh[fresh.length - 1].date).toBe(true); // newest first
    await P.markMilestonesSeen(fresh.map((m) => m.title));
    expect(await P.getNewMilestones('2026-09-14')).toEqual([]);
  });
});
