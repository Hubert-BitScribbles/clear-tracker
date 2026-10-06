import { describe, expect, it } from 'vitest';
import { BackupError, decryptBackup, encryptBackup, payloadFrom, validatePayload } from '../src/data/backup';
import * as P from '../src/data/database';
import { scenario } from './helpers';

const FAST = 1000; // iterations: real exports use 600,000; tests use fewer for speed

async function seeded() {
  const s = scenario(9, '2026-09-30');
  await P.resetDatabase();
  await P.restoreFromBackup(s.entries, s.intentions);
  await P.setSetting('savings_baseline_per_week', '14');
  await P.setSetting('audio_cues_enabled', 'false');
  await P.setSetting('last_backup_at', '2026-09-01T00:00:00Z');
  await P.setSetting('onboarding_complete', 'true');
  return P.getBackupData();
}

describe('backups', () => {
  it('round trip: export → erase → import restores days, intentions and settings exactly', async () => {
    const before = await seeded();
    const file = await encryptBackup(payloadFrom(before), 'correct horse', FAST);
    await P.resetDatabase();
    await P.restoreBackup(await decryptBackup(file, 'correct horse'));
    const after = await P.getBackupData();
    const byDate = (a: { entry_date: string }, b: { entry_date: string }) => a.entry_date.localeCompare(b.entry_date);
    expect([...after.dayEntries].sort(byDate)).toEqual([...before.dayEntries].sort(byDate));
    expect([...after.intentions].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...before.intentions].sort((a, b) => a.id.localeCompare(b.id)));
    const set = Object.fromEntries(after.settings.map((s) => [s.key, s.value]));
    expect(set.savings_baseline_per_week).toBe('14');
    expect(set.audio_cues_enabled).toBe('false');
    expect(set.onboarding_complete).toBe('true');
  });

  it('device bookkeeping is not in the backup, and survives an import', async () => {
    const data = await seeded();
    const payload = payloadFrom(data);
    expect(payload.settings.map((s) => s.key)).not.toContain('last_backup_at');
    expect(payload.settings.map((s) => s.key)).not.toContain('onboarding_complete');
    await P.setSetting('last_backup_at', '2026-09-20T00:00:00Z');
    await P.restoreBackup(payload);
    expect(await P.getSetting('last_backup_at', '')).toBe('2026-09-20T00:00:00Z');
  });

  it('the file says how it was made, and keeps nothing readable', async () => {
    const file = await encryptBackup(payloadFrom(await seeded()), 'pass phrase', FAST);
    const env = JSON.parse(file);
    expect(env).toMatchObject({ format: 'clear-tracker-backup', version: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: FAST }, cipher: { name: 'AES-GCM' } });
    // Only the envelope is readable; the encrypted data holds no recognisable content.
    expect(Object.keys(env).sort()).toEqual(['cipher', 'data', 'format', 'kdf', 'version']);
    expect(atob(env.data)).not.toMatch(/entry_date|drinking|savings|weekly_target/);
  });

  it('real exports use 600,000 iterations', async () => {
    const file = await encryptBackup(payloadFrom({ dayEntries: [], intentions: [], settings: [] }), 'pass phrase');
    expect(JSON.parse(file).kdf.iterations).toBe(600_000);
  });

  it('each export uses a fresh salt and IV', async () => {
    const p = payloadFrom({ dayEntries: [], intentions: [], settings: [] });
    const [a, b] = [JSON.parse(await encryptBackup(p, 'same pass', FAST)), JSON.parse(await encryptBackup(p, 'same pass', FAST))];
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.cipher.iv).not.toBe(b.cipher.iv);
  });

  it('wrong passphrase, tampering, and non-backups are rejected', async () => {
    const file = await encryptBackup(payloadFrom(await seeded()), 'right passphrase', FAST);
    await expect(decryptBackup(file, 'wrong passphrase')).rejects.toMatchObject({ kind: 'wrong-passphrase' });
    const env = JSON.parse(file);
    const flipped = env.data.slice(0, 20) + (env.data[20] === 'A' ? 'B' : 'A') + env.data.slice(21);
    await expect(decryptBackup(JSON.stringify({ ...env, data: flipped }), 'right passphrase')).rejects.toMatchObject({ kind: 'wrong-passphrase' });
    for (const junk of ['', 'hello', '{"a":1}', JSON.stringify({ format: 'something-else', data: 'x' })]) {
      await expect(decryptBackup(junk, 'x')).rejects.toBeInstanceOf(BackupError);
    }
    await expect(decryptBackup(JSON.stringify({ ...env, version: 99 }), 'right passphrase')).rejects.toThrow(/newer version/);
  });

  it('a large record (10 years) round-trips', async () => {
    const days = Array.from({ length: 3650 }, (_, i) => {
      const d = new Date(Date.UTC(2016, 0, 1 + i)).toISOString().slice(0, 10);
      return { id: `e${i}`, entry_date: d, status: i % 3 ? 'clear' : 'drinking', amount: i % 3 ? null : 'a-few', created_at: '', updated_at: '' } as never;
    });
    const p = payloadFrom({ dayEntries: days, intentions: [], settings: [] });
    const out = await decryptBackup(await encryptBackup(p, 'long history', FAST), 'long history');
    expect(out.dayEntries).toHaveLength(3650);
  });

  it('contents are checked before anything is replaced', () => {
    expect(() => validatePayload({ app: 'clear-tracker', dayEntries: [
      { entry_date: '2026-01-01', status: 'drinking', amount: 'lots' },
      { entry_date: '2026-01-01', status: 'clear', amount: null },
    ], intentions: [{ weekly_target: 9, effective_date: '2026-01-05' }] })).toThrow(/unknown level; 2026-01-01 appears twice; an intention that is out of range/);
  });

  it('a failed restore leaves the existing data untouched', async () => {
    await seeded();
    const count = await P.getEntryCount();
    const bad = { dayEntries: [{ entry_date: '2026-03-02', status: 'clear', amount: null }, { entry_date: '2026-03-02', status: 'clear', amount: null }], intentions: [], settings: [] } as never;
    await expect(P.restoreBackup(bad)).rejects.toThrow();
    expect(await P.getEntryCount()).toBe(count);
    expect(await P.getSetting('savings_baseline_per_week', '')).toBe('14');
  });
});
