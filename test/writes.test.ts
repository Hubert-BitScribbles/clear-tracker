// Logging behaviour: the tap cycle, what each step stores, and restore.

import { describe, expect, it } from 'vitest';
import * as P from '../src/data/database';
import { db, initDatabase } from '../src/data/db';

const row = (d: string) => db.day_entries.where('entry_date').equals(d).first();

describe('tap cycle', () => {
  it('steps unlogged → clear → a few → moderate → a lot → unlogged', async () => {
    await P.resetDatabase();
    const seen: (P.DayLevel | null)[] = [];
    let level: P.DayLevel | null = null;
    for (let i = 0; i < 5; i++) {
      level = await P.cycleDay('2026-09-01', level);
      seen.push(level);
    }
    expect(seen).toEqual(['clear', 'a-few', 'moderate', 'a-lot', null]);
    expect(await row('2026-09-01')).toBeUndefined();
  });

  it('stores a clear day with no amount and drinking days with one', async () => {
    await P.resetDatabase();
    await P.cycleDay('2026-09-02', null);
    expect(await row('2026-09-02')).toMatchObject({ status: 'clear', amount: null });
    await P.cycleDay('2026-09-02', 'clear');
    expect(await row('2026-09-02')).toMatchObject({ status: 'drinking', amount: 'a-few' });
    await P.cycleDay('2026-09-02', 'a-few');
    expect(await row('2026-09-02')).toMatchObject({ status: 'drinking', amount: 'moderate' });
    await P.cycleDay('2026-09-02', 'moderate');
    expect(await row('2026-09-02')).toMatchObject({ status: 'drinking', amount: 'a-lot' });
  });

  it('keeps created_at while the day stays logged ("logged on the day")', async () => {
    await P.resetDatabase();
    await P.cycleDay('2026-09-03', null);
    const first = (await row('2026-09-03'))!.created_at;
    await new Promise((r) => setTimeout(r, 5));
    await P.cycleDay('2026-09-03', 'clear');
    await P.cycleDay('2026-09-03', 'a-few');
    expect((await row('2026-09-03'))!.created_at).toBe(first);
  });

  it('counts "a few" as a drinking day, not a clear one', async () => {
    await P.resetDatabase();
    await P.cycleDay('2026-09-07', null); // Mon: clear
    await P.cycleDay('2026-09-08', null); // Tue: clear → a few
    await P.cycleDay('2026-09-08', 'clear');
    expect(await P.getClearDaysInMonth(2026, 9)).toBe(1);
    expect((await P.getWeekSummary('2026-09-07', '2026-09-13')).clearCount).toBe(1);
    expect(await P.getMonthCells(2026, 9)).toEqual({
      '2026-09-07': { status: 'clear', amount: null },
      '2026-09-08': { status: 'drinking', amount: 'a-few' },
    });
  });

  it('levelOf and nextLevel agree with the cycle', () => {
    expect(P.levelOf(undefined)).toBeNull();
    expect(P.levelOf({ status: 'clear', amount: null })).toBe('clear');
    expect(P.levelOf({ status: 'drinking', amount: 'moderate' })).toBe('moderate');
    expect(P.nextLevel('a-lot')).toBeNull();
    expect(P.nextLevel(null)).toBe('clear');
  });
});

describe('storage', () => {
  it('a failed restore leaves existing data untouched', async () => {
    await P.restoreFromBackup([{ entry_date: '2026-02-02', status: 'clear' }], []);
    await expect(
      P.restoreFromBackup(
        [{ entry_date: '2026-03-02', status: 'clear' }, { entry_date: '2026-03-02', status: 'drinking' }],
        [],
      ),
    ).rejects.toThrow();
    expect(Object.keys(await P.getEntriesForYear(2026))).toEqual(['2026-02-02']);
  });

  it('concurrent initialisation shares one open', async () => {
    await Promise.all([initDatabase(), initDatabase(), initDatabase()]);
    expect(db.isOpen()).toBe(true);
  });

  it('with no intention, the default target is 3', async () => {
    await P.resetDatabase();
    expect(await P.getCurrentWeeklyTarget('2026-09-28')).toBe(3);
  });
});
