import { describe, expect, it } from 'vitest';
import { backupNudge, daysAgoText } from '../src/lib/backupNudge';

const noon = (iso: string) => new Date(`${iso}T12:00:00`).toISOString(); // local noon as stored

describe('backup nudge', () => {
  it('nothing logged → no nudge', () => expect(backupNudge('2026-09-30', null, null, null)).toBeNull());
  it('never backed up: from the 30th day of records', () => {
    expect(backupNudge('2026-09-28', null, '2026-08-31', null)).toBeNull(); // 29 days
    expect(backupNudge('2026-09-29', null, '2026-08-31', null)).toEqual({ kind: 'never', days: 30 });
  });
  it('30 days after the last backup', () => {
    expect(backupNudge('2026-09-30', noon('2026-09-01'), '2026-01-01', null)).toBeNull(); // 29
    expect(backupNudge('2026-10-01', noon('2026-09-01'), '2026-01-01', null)).toEqual({ kind: 'since-backup', days: 30 });
  });
  it('"Later" snoozes for the week, then it returns', () => {
    expect(backupNudge('2026-10-03', noon('2026-08-01'), '2026-01-01', '2026-10-08')).toBeNull();
    expect(backupNudge('2026-10-08', noon('2026-08-01'), '2026-01-01', '2026-10-08')).toMatchObject({ kind: 'since-backup' });
  });
  it('wording', () => {
    expect([0, 1, 23].map(daysAgoText)).toEqual(['today', 'yesterday', '23 days ago']);
  });
});
