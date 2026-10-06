// A device that ran the previous build has a version-1 database with
// test days in the old shape. Opening the current app must clear those
// days and keep intentions and settings.

import Dexie from 'dexie';
import { expect, it } from 'vitest';

it('version 2 clears old test days, keeps intentions and settings', async () => {
  const old = new Dexie('clear-tracker');
  old.version(1).stores({ day_entries: 'id, &entry_date, status', intentions: 'id, effective_date', settings: 'key' });
  await old.table('day_entries').add({ id: 'x', entry_date: '2026-09-01', status: 'drinking', severity: 'Light', mood: 'Low' });
  await old.table('intentions').add({ id: 'i', weekly_target: 5, effective_date: '2026-08-31', created_at: '', updated_at: '' });
  await old.table('settings').put({ key: 'audio_cues_enabled', value: 'false', updated_at: '' });
  old.close();

  const P = await import('../src/data/database');
  expect(await P.getEntryCount()).toBe(0);
  expect(await P.getCurrentWeeklyTarget('2026-09-28')).toBe(5);
  expect(await P.getSetting('audio_cues_enabled', 'true')).toBe('false');
});
