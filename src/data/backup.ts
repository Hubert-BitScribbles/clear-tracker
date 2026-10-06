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
  if (!backupsAvailable()) throw new BackupError('insecure-page', 'Backups need the app’s secure (https) address.');
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
  if (!backupsAvailable()) throw new BackupError('insecure-page', 'Backups need the app’s secure (https) address.');
  let env: Envelope;
  try {
    env = JSON.parse(fileText);
  } catch {
    throw new BackupError('not-a-backup', 'This file is not a Clear Tracker backup.');
  }
  if (env?.format !== FORMAT || typeof env.data !== 'string' || !env.kdf?.salt || !env.cipher?.iv) {
    throw new BackupError('not-a-backup', 'This file is not a Clear Tracker backup.');
  }
  if (env.version > VERSION) {
    throw new BackupError('not-a-backup', 'This backup was made by a newer version of Clear Tracker.');
  }
  let plain: string;
  try {
    const key = await deriveKey(passphrase, unb64(env.kdf.salt), env.kdf.iterations);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.cipher.iv) }, key, unb64(env.data));
    plain = new TextDecoder().decode(pt);
  } catch {
    throw new BackupError('wrong-passphrase', 'Incorrect passphrase, or the file is damaged.');
  }
  return validatePayload(JSON.parse(plain));
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNTS = new Set(['a-few', 'moderate', 'a-lot']);

/** Checks contents before anything is replaced; a bad file is rejected whole. */
export function validatePayload(data: unknown): BackupPayload {
  const d = data as Partial<BackupPayload> | null;
  if (!d || d.app !== 'clear-tracker' || !Array.isArray(d.dayEntries) || !Array.isArray(d.intentions)) {
    throw new BackupError('invalid-contents', 'This file is not a valid Clear Tracker backup.');
  }
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const e of d.dayEntries) {
    const date = e?.entry_date;
    if (typeof date !== 'string' || !ISO.test(date)) problems.push('a day with a malformed date');
    else if (seen.has(date)) problems.push(`${date} appears twice`);
    else seen.add(date);
    if (e?.status === 'clear' ? e.amount != null : !(e?.status === 'drinking' && AMOUNTS.has(e.amount as string))) {
      problems.push(`${typeof date === 'string' ? date : 'a day'}: unknown level`);
    }
  }
  for (const i of d.intentions) {
    if (!Number.isInteger(i?.weekly_target) || i.weekly_target < 1 || i.weekly_target > 7 || !ISO.test(i?.effective_date ?? '')) {
      problems.push('an intention that is out of range');
    }
  }
  if (problems.length) {
    const more = problems.length > 3 ? ` (and ${problems.length - 3} more)` : '';
    throw new BackupError('invalid-contents', `This backup can't be restored: ${problems.slice(0, 3).join('; ')}${more}.`);
  }
  return {
    app: 'clear-tracker',
    exportedAt: String(d.exportedAt ?? ''),
    dayEntries: d.dayEntries,
    intentions: d.intentions,
    settings: Array.isArray(d.settings) ? d.settings.filter((s) => typeof s?.key === 'string' && typeof s?.value === 'string') : [],
  };
}
