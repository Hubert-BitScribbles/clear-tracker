import Dexie, { type Table } from 'dexie';

// Three stores: logged days, the intention ledger, settings.
// See clear-tracker-data-model.md.

export type DayStatus = 'clear' | 'drinking';
/** How much, on a drinking day: 1–2, 3–4, 5+ drinks. */
export type DrinkAmount = 'a-few' | 'moderate' | 'a-lot';

export interface DayEntryRow {
  id: string;
  entry_date: string; // YYYY-MM-DD, unique. No row = unlogged.
  status: DayStatus;
  amount: DrinkAmount | null; // always set on drinking days, null on clear
  created_at: string; // ISO timestamp (UTC)
  updated_at: string;
}

export interface IntentionRow {
  id: string;
  weekly_target: number; // 1–7
  effective_date: string; // always a Monday
  created_at: string;
  updated_at: string;
}

export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

class ClearTrackerDb extends Dexie {
  day_entries!: Table<DayEntryRow, string>;
  intentions!: Table<IntentionRow, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    super('clear-tracker');
    // Only indexed fields are listed; every other field is stored as-is.
    // To change the schema later, ADD db.version(2).stores(...).upgrade(...)
    // below this one; never edit version 1. Dexie creates the stores first
    // and then runs upgrades in order.
    this.version(1).stores({
      day_entries: 'id, &entry_date, status',
      intentions: 'id, effective_date',
      settings: 'key',
    });
    // Version 2: a day is now clear or drinking-with-an-amount, with no
    // check-in answers. Days logged while testing the earlier version are
    // cleared; intentions and settings are kept.
    this.version(2)
      .stores({})
      .upgrade((tx) => tx.table('day_entries').clear());
  }
}

export const db = new ClearTrackerDb();

let initPromise: Promise<void> | null = null;

/**
 * Opens the database once, shared by every caller. Several screens call this
 * at once on startup; they all wait on the same promise.
 */
export function initDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = db.open().then(
      () => undefined,
      (err) => {
        initPromise = null; // allow a retry after e.g. a blocked upgrade
        throw err;
      },
    );
  }
  return initPromise;
}

/**
 * A random UUID (version 4). crypto.randomUUID only exists on secure pages
 * (https, or localhost), so opening the dev server from a phone at
 * http://192.168… has none; crypto.getRandomValues works everywhere.
 */
export function generateId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
