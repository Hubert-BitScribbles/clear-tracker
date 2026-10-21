// Clear Tracker backups (web).
//
// The file is JSON: an envelope saying how it was encrypted, plus the
// encrypted data. Encryption uses the browser's built-in Web Crypto:
//   key  = PBKDF2(passphrase, random 16-byte salt, SHA-256, 600,000 rounds)
//   data = AES-GCM(key, random 12-byte IV, JSON payload)
// AES-GCM also authenticates: a wrong passphrase or a damaged file fails
// outright instead of decrypting to garbage.
//
// Web Crypto only exists on secure pages (https, or localhost), so backups
// can't be made from a phone at http://192.168… during development.

import type { DayEntryRow, IntentionRow } from './db';
import { addDays, todayIso, weekdayOf } from './dates';
import { t } from '../i18n';

export const FORMAT = 'clear-tracker-backup';
export const VERSION = 1;
export const ITERATIONS = 600_000;
export const MIN_PASSPHRASE = 8;

/** Settings that describe this device rather than the record stay out. */
const NOT_BACKED_UP = new Set(['last_backup_at', 'onboarding_complete', 'backup_nudge_snooze_until']);

export interface BackupPayload {
  app: 'clear-tracker';
  exportedAt: string;
  dayEntries: DayEntryRow[];
  intentions: IntentionRow[];
  settings: { key: string; value: string }[];
}

interface Envelope {
  format: typeof FORMAT;
  version: number;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  data: string;
}

export class BackupError extends Error {
  constructor(
    readonly kind: 'insecure-page' | 'not-a-backup' | 'wrong-passphrase' | 'invalid-contents',
    message: string,
  ) {
    super(message);
  }
}

export const backupsAvailable = () => typeof crypto !== 'undefined' && !!crypto.subtle;

/** Base64 in chunks: spreading a large array into one call overflows the stack. */
function b64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const unb64 = (s: string): Bytes => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

type Bytes = Uint8Array<ArrayBuffer>;

async function deriveKey(passphrase: string, salt: Bytes, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function payloadFrom(data: {
  dayEntries: DayEntryRow[];
  intentions: IntentionRow[];
  settings: { key: string; value: string }[];
}): BackupPayload {
  return {
    app: 'clear-tracker',
    exportedAt: new Date().toISOString(),
    dayEntries: data.dayEntries,
    intentions: data.intentions,
    settings: data.settings.filter((s) => !NOT_BACKED_UP.has(s.key)),
  };
}

export async function encryptBackup(payload: BackupPayload, passphrase: string, iterations = ITERATIONS): Promise<string> {
  if (!backupsAvailable()) throw new BackupError('insecure-page', t('backup.err.insecure'));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload))));
  const env: Envelope = {
    format: FORMAT,
    version: VERSION,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: b64(salt) },
    cipher: { name: 'AES-GCM', iv: b64(iv) },
    data: b64(ct),
  };
  return JSON.stringify(env);
}

export async function decryptBackup(fileText: string, passphrase: string): Promise<BackupPayload> {
  if (!backupsAvailable()) throw new BackupError('insecure-page', t('backup.err.insecure'));
  let env: Envelope;
  try {
    env = JSON.parse(fileText);
  } catch {
    throw new BackupError('not-a-backup', t('backup.err.notBackup'));
  }
  if (env?.format !== FORMAT || typeof env.data !== 'string' || !env.kdf?.salt || !env.cipher?.iv) {
    throw new BackupError('not-a-backup', t('backup.err.notBackup'));
  }
  if (typeof env.version === 'number' && env.version > VERSION) {
    throw new BackupError('not-a-backup', t('backup.err.newer'));
  }
  const parts = envelopeParts(env);
  if (!parts) throw new BackupError('not-a-backup', t('backup.err.notBackup'));
  let plain: string;
  try {
    const key = await deriveKey(passphrase, parts.salt, parts.iterations);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: parts.iv }, key, parts.data);
    plain = new TextDecoder().decode(pt);
  } catch {
    throw new BackupError('wrong-passphrase', t('backup.err.passphrase'));
  }
  return validatePayload(JSON.parse(plain));
}

/** Rounds a backup may ask for: fewer would be weak; many more would freeze the page while deriving the key. */
export const MIN_ITERATIONS = 100_000;
export const MAX_ITERATIONS = 10_000_000;

/**
 * The envelope's settings, checked before any work is done: a known version,
 * PBKDF2-SHA-256 with a sensible number of rounds, AES-GCM, a 16-byte salt and
 * a 12-byte IV, all valid base64. Null if anything is off (an odd or
 * hand-edited file), which reads as "not a Clear Tracker backup".
 */
export function envelopeParts(env: Envelope): { salt: Bytes; iv: Bytes; data: Bytes; iterations: number } | null {
  const n = env.kdf?.iterations;
  if (!Number.isInteger(env.version) || env.version < 1 || env.version > VERSION) return null;
  if (env.kdf?.name !== 'PBKDF2' || env.kdf?.hash !== 'SHA-256' || env.cipher?.name !== 'AES-GCM') return null;
  if (!Number.isInteger(n) || n < MIN_ITERATIONS || n > MAX_ITERATIONS) return null;
  try {
    const salt = unb64(env.kdf.salt);
    const iv = unb64(env.cipher.iv);
    const data = unb64(env.data);
    return salt.length === 16 && iv.length === 12 && data.length > 16 ? { salt, iv, data, iterations: n } : null;
  } catch {
    return null; // not base64
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** A real calendar date in YYYY-MM-DD (not 2026-02-30 or 2026-13-01). */
const realDate = (s: unknown): s is string => {
  if (typeof s !== 'string' || !ISO.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // month 13 is NaN; Feb 30 rolls over
};
const AMOUNTS = new Set(['a-few', 'moderate', 'a-lot']);

/** Checks contents before anything is replaced; a bad file is rejected whole. */
export function validatePayload(data: unknown): BackupPayload {
  const d = data as Partial<BackupPayload> | null;
  if (!d || d.app !== 'clear-tracker' || !Array.isArray(d.dayEntries) || !Array.isArray(d.intentions)) {
    throw new BackupError('invalid-contents', t('backup.err.invalid'));
  }
  const problems: string[] = [];
  const seen = new Set<string>();
  // A day can't be logged ahead; allow one day for a backup made in a time zone further east.
  const latest = addDays(todayIso(), 1);
  for (const e of d.dayEntries) {
    const date = e?.entry_date;
    if (!realDate(date) || date > latest) problems.push(t('backup.err.badDate'));
    else if (seen.has(date)) problems.push(t('backup.err.twice', { date }));
    else seen.add(date);
    if (e?.status === 'clear' ? e.amount != null : !(e?.status === 'drinking' && AMOUNTS.has(e.amount as string))) {
      problems.push(t('backup.err.unknownLevel', { day: typeof date === 'string' ? date : t('backup.err.aDay') }));
    }
  }
  for (const i of d.intentions) {
    // Intentions start on a Monday (weekdayOf: 1), at most a week ahead ("from next Monday").
    const from = i?.effective_date;
    if (!Number.isInteger(i?.weekly_target) || i.weekly_target < 1 || i.weekly_target > 7 || !realDate(from) || weekdayOf(from) !== 1 || from > addDays(latest, 7)) {
      problems.push(t('backup.err.badIntention'));
    }
  }
  if (problems.length) {
    const more = problems.length > 3 ? t('backup.err.andMore', { n: problems.length - 3 }) : '';
    throw new BackupError('invalid-contents', t('backup.err.cantRestore', { problems: problems.slice(0, 3).join('; '), more }));
  }
  return {
    app: 'clear-tracker',
    exportedAt: String(d.exportedAt ?? ''),
    dayEntries: d.dayEntries,
    intentions: d.intentions,
    settings: Array.isArray(d.settings) ? d.settings.filter((s) => typeof s?.key === 'string' && typeof s?.value === 'string') : [],
  };
}
