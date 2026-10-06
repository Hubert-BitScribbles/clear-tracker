import * as SQLite from 'expo-sqlite';

export type DayStatus = 'clear' | 'drinking';

export interface DayEntry {
  id: string;
  entry_date: string; // YYYY-MM-DD
  status: DayStatus;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('clear-tracker.db');
  }
  return dbPromise;
}

// Every query waits for initialisation. Several screens call initDatabase()
// at once on startup, so without this a query can reach the database before
// the schema exists.
async function getDb() {
  await initDatabase();
  return openDb();
}

export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let initPromise: Promise<void> | null = null;

// Shared across all callers, so initialisation runs exactly once.
export function initDatabase(): Promise<void> {
  if (!initPromise) initPromise = runMigrations();
  return initPromise;
}

async function runMigrations(): Promise<void> {
  const db = await openDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS intentions (
      id TEXT PRIMARY KEY,
      weekly_target INTEGER NOT NULL,
      effective_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS day_entries (
      id TEXT PRIMARY KEY,
      entry_date TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      severity TEXT,
      note TEXT,
      mood TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Must run AFTER the tables exist. When this ran first, a fresh install
  // failed the ALTER silently and then created day_entries without the
  // column, so every query naming evening_context failed until the next
  // launch.
  await db
    .execAsync('ALTER TABLE day_entries ADD COLUMN evening_context TEXT')
    .catch(() => {
      // Already present.
    });
}

  export interface DaySignals {
  energy: string | null;
  howMuch: string | null;
  evening: string | null;
}

export async function getDaySignals(entryDateIso: string): Promise<DaySignals> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ mood: string | null; severity: string | null; evening_context: string | null }>(
    'SELECT mood, severity, evening_context FROM day_entries WHERE entry_date = ?',
    [entryDateIso]
  );
  return {
    energy: row?.mood ?? null,
    howMuch: row?.severity ?? null,
    evening: row?.evening_context ?? null,
  };
}

export async function saveDaySignals(
  entryDateIso: string,
  signals: DaySignals
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE day_entries SET mood = ?, severity = ?, evening_context = ?, updated_at = ? WHERE entry_date = ?',
    [signals.energy, signals.howMuch, signals.evening, now, entryDateIso]
  );
}

export async function getEntriesForMonth(
  year: number,
  month: number // 1-indexed
): Promise<Record<string, DayStatus>> {
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const rows = await db.getAllAsync<DayEntry>(
    'SELECT id, entry_date, status FROM day_entries WHERE entry_date LIKE ?',
    [`${prefix}-%`]
  );
  const map: Record<string, DayStatus> = {};
  rows.forEach((r) => {
    map[r.entry_date] = r.status as DayStatus;
  });
  return map;
}

// Two-stage tap logging: pass the day's current status (or null if unlogged);
// returns the new status after cycling clear -> drinking -> unlogged.
export async function cycleDay(
  entryDateIso: string,
  current: DayStatus | null
): Promise<DayStatus | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  if (current === null) {
    await db.runAsync(
      `INSERT INTO day_entries (id, entry_date, status, created_at, updated_at)
       VALUES (?, ?, 'clear', ?, ?)`,
      [generateId(), entryDateIso, now, now]
    );
    return 'clear';
  }

  if (current === 'clear') {
    // Changing the status clears any check-in answers. Context that
    // explained a clear day rarely explains a drinking one, so carrying
    // answers across would leave the data quietly wrong.
    await db.runAsync(
      `UPDATE day_entries
          SET status = 'drinking', mood = NULL, severity = NULL,
              evening_context = NULL, note = NULL, updated_at = ?
        WHERE entry_date = ?`,
      [now, entryDateIso]
    );
    return 'drinking';
  }

  await db.runAsync('DELETE FROM day_entries WHERE entry_date = ?', [entryDateIso]);
  return null;
}

// Temporal goal ledger lookup: the target active for a given week is whichever
// intention has the latest effective_date at or before that week's Monday.
export async function getCurrentWeeklyTarget(weekStartIso: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ weekly_target: number }>(
    'SELECT weekly_target FROM intentions WHERE effective_date <= ? ORDER BY effective_date DESC, created_at DESC LIMIT 1',
    [weekStartIso]
  );
  return row?.weekly_target ?? 3;
}
export async function saveIntention(weeklyTarget: number, effectiveDateIso: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO intentions (id, weekly_target, effective_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [generateId(), weeklyTarget, effectiveDateIso, now, now]
  );
}
export async function weekHasEntries(weekStartIso: string, weekEndIso: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM day_entries WHERE entry_date BETWEEN ? AND ?',
    [weekStartIso, weekEndIso]
  );
  return (row?.count ?? 0) > 0;
}
export async function getSetting(key: string, defaultValue: string): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    [key, value, now]
  );
}

export async function getEntryCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM day_entries');
  return row?.count ?? 0;
}

export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM day_entries');
  await db.runAsync('DELETE FROM intentions');
  await db.runAsync('DELETE FROM settings');
}
export interface WeekAlignment {
  weekStartIso: string;
  count: number;
  target: number;
  hasEntries?: boolean; // true if anything (clear or drinking) was logged that week
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getTotalClearDays(year?: number): Promise<number> {
  const db = await getDb();
  const row = year
    ? await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date LIKE ?",
        [`${year}-%`]
      )
    : await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear'"
      );
  return row?.count ?? 0;
}

// Walks backward through fully-completed past weeks (not the current,
// still-in-progress one) counting how many in a row met their target.
export async function getCurrentStreak(): Promise<number> {
  const db = await getDb();
  let streak = 0;
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  // Check the current, still-in-progress week first — if it's already met
  // or exceeded, it counts toward the streak even though the week isn't over.
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() + diffToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
  const currentStartIso = isoOf(currentWeekStart);
  const currentEndIso = isoOf(currentWeekEnd);
  const currentRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date BETWEEN ? AND ?",
    [currentStartIso, currentEndIso]
  );
  const currentTarget = await getCurrentWeeklyTarget(currentStartIso);
  if ((currentRow?.count ?? 0) >= currentTarget) {
    streak += 1;
  }

  // Then walk backward through fully-completed past weeks, same as before.
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diffToMonday - 7);
  weekStart.setHours(0, 0, 0, 0);

  for (let i = 0; i < 520; i++) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const startIso = isoOf(weekStart);
    const endIso = isoOf(weekEnd);
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date BETWEEN ? AND ?",
      [startIso, endIso]
    );
    const target = await getCurrentWeeklyTarget(startIso);
    const count = row?.count ?? 0;
    if (count >= target) {
      streak += 1;
      weekStart.setDate(weekStart.getDate() - 7);
    } else {
      break;
    }
  }
  return streak;
}

// Oldest-to-newest series of the last `numWeeks` weeks, current week last.
export async function getWeeklySeries(numWeeks: number): Promise<WeekAlignment[]> {
  const db = await getDb();
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + diffToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const results: WeekAlignment[] = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const startIso = isoOf(weekStart);
    const endIso = isoOf(weekEnd);
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date BETWEEN ? AND ?",
      [startIso, endIso]
    );
    const target = await getCurrentWeeklyTarget(startIso);
    results.push({ weekStartIso: startIso, count: row?.count ?? 0, target });
  }
  return results;
}
export interface DayOfWeekStats {
  weekday: number; // 0 = Sunday .. 6 = Saturday
  clear: number;
  drinking: number;
}

export async function getDayOfWeekBreakdown(year?: number): Promise<DayOfWeekStats[]> {
  const db = await getDb();
  const rows = year
    ? await db.getAllAsync<{ entry_date: string; status: string }>(
        'SELECT entry_date, status FROM day_entries WHERE entry_date LIKE ?',
        [`${year}-%`]
      )
    : await db.getAllAsync<{ entry_date: string; status: string }>(
        'SELECT entry_date, status FROM day_entries'
      );

  const stats: DayOfWeekStats[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    clear: 0,
    drinking: 0,
  }));
  rows.forEach((r) => {
    const [y, m, d] = r.entry_date.split('-').map(Number);
    const wd = new Date(y, m - 1, d).getDay();
    if (r.status === 'clear') stats[wd].clear++;
    else if (r.status === 'drinking') stats[wd].drinking++;
  });
  return stats;
}

export async function getSignalRowsForYear(year?: number): Promise<SignalRawRow[]> {
  const db = await getDb();
  return year
    ? db.getAllAsync<SignalRawRow>(
        'SELECT status, mood, evening_context, severity FROM day_entries WHERE entry_date LIKE ?',
        [`${year}-%`]
      )
    : db.getAllAsync<SignalRawRow>(
        'SELECT status, mood, evening_context, severity FROM day_entries'
      );
}
export interface BeyondTargetInstance {
  weekStartIso: string;
  weekEndIso: string;
  count: number;
  target: number;
}

export interface MilestonesData {
  totalClearDays: number;
  firstClearDate: string | null;
  firstClearWeekEndIso: string | null;
  beyondTargetInstances: BeyondTargetInstance[]; // newest first
}

export async function getClearDatesOrdered(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ entry_date: string }>(
    "SELECT entry_date FROM day_entries WHERE status = 'clear' ORDER BY entry_date ASC"
  );
  return rows.map((r) => r.entry_date);
}

export async function computeMilestones(): Promise<MilestonesData> {
  const db = await getDb();

  const totalRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear'"
  );
  const totalClearDays = totalRow?.count ?? 0;

  const firstRow = await db.getFirstAsync<{ d: string | null }>(
    "SELECT MIN(entry_date) as d FROM day_entries WHERE status = 'clear'"
  );
  const firstClearDate = firstRow?.d ?? null;

  const earliestAnyRow = await db.getFirstAsync<{ d: string | null }>(
    'SELECT MIN(entry_date) as d FROM day_entries'
  );

  let firstClearWeekEndIso: string | null = null;
  const beyondTargetInstances: BeyondTargetInstance[] = [];

  if (earliestAnyRow?.d) {
    const [ey, em, ed] = earliestAnyRow.d.split('-').map(Number);
    const earliestDate = new Date(ey, em - 1, ed);
    const day = earliestDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const cursor = new Date(earliestDate);
    cursor.setDate(earliestDate.getDate() + diffToMonday);
    cursor.setHours(0, 0, 0, 0);

    const today = new Date();
    const tDay = today.getDay();
    const tDiff = tDay === 0 ? -6 : 1 - tDay;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() + tDiff);
    currentMonday.setHours(0, 0, 0, 0);

    while (cursor < currentMonday) {
      const weekEnd = new Date(cursor);
      weekEnd.setDate(cursor.getDate() + 6);
      const startIso = isoOf(cursor);
      const endIso = isoOf(weekEnd);
      const row = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date BETWEEN ? AND ?",
        [startIso, endIso]
      );
      const target = await getCurrentWeeklyTarget(startIso);
      const count = row?.count ?? 0;

      if (!firstClearWeekEndIso && count >= target) {
        firstClearWeekEndIso = endIso;
      }
      if (count > target) {
        beyondTargetInstances.push({ weekStartIso: startIso, weekEndIso: endIso, count, target });
      }

      cursor.setDate(cursor.getDate() + 7);
    }
  }

  beyondTargetInstances.reverse();

  return { totalClearDays, firstClearDate, firstClearWeekEndIso, beyondTargetInstances };
}
export async function getIntentionHistory(): Promise<{ weekly_target: number; effective_date: string }[]> {
  const db = await getDb();
  return db.getAllAsync<{ weekly_target: number; effective_date: string }>(
    'SELECT weekly_target, effective_date FROM intentions ORDER BY effective_date DESC'
  );
}
export async function getEntriesForYear(year: number): Promise<Record<string, DayStatus>> {
  const db = await getDb();
  const rows = await db.getAllAsync<DayEntry>(
    'SELECT id, entry_date, status FROM day_entries WHERE entry_date LIKE ?',
    [`${year}-%`]
  );
  const map: Record<string, DayStatus> = {};
  rows.forEach((r) => {
    map[r.entry_date] = r.status as DayStatus;
  });
  return map;
}
// All weeks whose Thursday falls within the given year — Thursday is used
// as the tie-breaker for weeks that straddle a month/year boundary, same
// principle as ISO week numbering.
export async function getWeeksForYear(year: number): Promise<WeekAlignment[]> {
  const db = await getDb();
  const results: WeekAlignment[] = [];

  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay();
  const diffToMonday = jan1Day === 0 ? -6 : 1 - jan1Day;
  const cursor = new Date(jan1);
  cursor.setDate(jan1.getDate() + diffToMonday);
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 60; i++) {
    const thursday = new Date(cursor);
    thursday.setDate(cursor.getDate() + 3);
    if (thursday.getFullYear() > year) break;
    if (thursday.getFullYear() === year) {
      const weekEnd = new Date(cursor);
      weekEnd.setDate(cursor.getDate() + 6);
      const startIso = isoOf(cursor);
      const endIso = isoOf(weekEnd);
      const clearRow = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date BETWEEN ? AND ?",
        [startIso, endIso]
      );
      const totalRow = await db.getFirstAsync<{ total: number }>(
        'SELECT COUNT(*) as total FROM day_entries WHERE entry_date BETWEEN ? AND ?',
        [startIso, endIso]
      );
      const target = await getCurrentWeeklyTarget(startIso);
      results.push({
        weekStartIso: startIso,
        count: clearRow?.count ?? 0,
        target,
        hasEntries: (totalRow?.total ?? 0) > 0,
      });
    }
    cursor.setDate(cursor.getDate() + 7);
  }
  return results;
}
export async function getAllDataForExport(): Promise<{ dayEntries: any[]; intentions: any[] }> {
  const db = await getDb();
  const dayEntries = await db.getAllAsync(
    'SELECT id, entry_date, status, severity, note, mood, evening_context, created_at, updated_at FROM day_entries'
  );
  const intentions = await db.getAllAsync(
    'SELECT id, weekly_target, effective_date, created_at, updated_at FROM intentions'
  );
  return { dayEntries, intentions };
}

export async function restoreFromBackup(dayEntries: any[], intentions: any[]): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM day_entries');
  await db.runAsync('DELETE FROM intentions');

  for (const e of dayEntries) {
    await db.runAsync(
      `INSERT INTO day_entries
         (id, entry_date, status, severity, note, mood, evening_context, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id ?? generateId(),
        e.entry_date,
        e.status,
        e.severity ?? null,
        e.note ?? null,
        e.mood ?? null,
        // Older backups predate this column — fall back rather than fail.
        e.evening_context ?? null,
        e.created_at ?? new Date().toISOString(),
        e.updated_at ?? new Date().toISOString(),
      ]
    );
  }

  for (const i of intentions) {
    await db.runAsync(
      `INSERT INTO intentions (id, weekly_target, effective_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        i.id ?? generateId(),
        i.weekly_target,
        i.effective_date,
        i.created_at ?? new Date().toISOString(),
        i.updated_at ?? new Date().toISOString(),
      ]
    );
  }
}
export async function getClearDaysInMonth(year: number, month: number): Promise<number> {
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date LIKE ?",
    [`${prefix}-%`]
  );
  return row?.count ?? 0;
}

export async function getClearDaysInYear(year: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date LIKE ?",
    [`${year}-%`]
  );
  return row?.count ?? 0;
}
export interface LoggingTierEarn {
  tierDays: number;
  reachedDateIso: string;
}
export interface LoggingTierEarn {
  tierDays: number;
  reachedDateIso: string;
}

export async function getLoggingTierEarnings(): Promise<LoggingTierEarn[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ entry_date: string }>(
    'SELECT DISTINCT entry_date FROM day_entries ORDER BY entry_date ASC'
  );
  const dateStrs = rows.map((r) => r.entry_date);
  if (dateStrs.length === 0) return [];

  function dateFromIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

  const earnings: LoggingTierEarn[] = [];
  let runStartIdx = 0;
  for (let i = 1; i <= dateStrs.length; i++) {
    const prevDate = dateFromIso(dateStrs[i - 1]);
    const curDate = i < dateStrs.length ? dateFromIso(dateStrs[i]) : null;
    const isConsecutive = curDate && curDate.getTime() - prevDate.getTime() === 86400000;
    if (!isConsecutive) {
      const runLength = i - runStartIdx;
      for (const tier of LOGGING_TIERS) {
        if (runLength >= tier) {
          earnings.push({ tierDays: tier, reachedDateIso: dateStrs[runStartIdx + tier - 1] });
        }
      }
      runStartIdx = i;
    }
  }
  return earnings;
}
export interface StreakTierEarn {
  tierWeeks: number;
  reachedWeekEndIso: string;
}

export async function getStreakTierEarnings(): Promise<StreakTierEarn[]> {
  const db = await getDb();
  const earliestRow = await db.getFirstAsync<{ d: string | null }>('SELECT MIN(entry_date) as d FROM day_entries');
  if (!earliestRow?.d) return [];

  const [ey, em, ed] = earliestRow.d.split('-').map(Number);
  const earliestDate = new Date(ey, em - 1, ed);
  const day = earliestDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const cursor = new Date(earliestDate);
  cursor.setDate(earliestDate.getDate() + diffToMonday);
  cursor.setHours(0, 0, 0, 0);

  const today = new Date();
  const tDay = today.getDay();
  const tDiff = tDay === 0 ? -6 : 1 - tDay;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + tDiff);
  currentMonday.setHours(0, 0, 0, 0);

  const weeks: { startIso: string; endIso: string; met: boolean; target: number }[] = [];
  while (cursor < currentMonday) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(cursor.getDate() + 6);
    const startIso = isoOf(cursor);
    const endIso = isoOf(weekEnd);
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date BETWEEN ? AND ?",
      [startIso, endIso]
    );
    const target = await getCurrentWeeklyTarget(startIso);
    weeks.push({ startIso, endIso, met: (row?.count ?? 0) >= target, target });
    cursor.setDate(cursor.getDate() + 7);
  }

  const WEEKS_MULT = [2, 4, 8, 14, 24, 40, 70];
  const earnings: StreakTierEarn[] = [];
  let runStart = -1;
  for (let i = 0; i <= weeks.length; i++) {
    const isMet = i < weeks.length && weeks[i].met;
    if (isMet && runStart === -1) {
      runStart = i;
    } else if (!isMet && runStart !== -1) {
      const runLength = i - runStart;
      const targetAtRunEnd = weeks[i - 1].target;
      for (const mult of WEEKS_MULT) {
        const tierWeeks = Math.min(104, Math.max(1, Math.ceil(mult * Math.sqrt(5 / targetAtRunEnd))));
        if (runLength >= tierWeeks) {
          earnings.push({ tierWeeks, reachedWeekEndIso: weeks[runStart + tierWeeks - 1].endIso });
        }
      }
      runStart = -1;
    }
  }
  return earnings;
}

export async function getLoggingStreak(): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ entry_date: string }>(
    'SELECT DISTINCT entry_date FROM day_entries'
  );
  const dates = new Set(rows.map((r) => r.entry_date));

  function utcIso(d: Date) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
      d.getUTCDate()
    ).padStart(2, '0')}`;
  }

  // Walk back in UTC so a daylight-saving shift can't drop a day.
  const today = new Date();
  const cursor = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  if (!dates.has(utcIso(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (dates.has(utcIso(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
export async function getWeekSummary(
  weekStartIso: string,
  weekEndIso: string
): Promise<{ clearCount: number; hasEntries: boolean }> {
  const db = await getDb();
  const clearRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date BETWEEN ? AND ?",
    [weekStartIso, weekEndIso]
  );
  const totalRow = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) as total FROM day_entries WHERE entry_date BETWEEN ? AND ?',
    [weekStartIso, weekEndIso]
  );
  return { clearCount: clearRow?.count ?? 0, hasEntries: (totalRow?.total ?? 0) > 0 };
}
export async function getCurrentClearDayStreak(): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ entry_date: string }>(
    "SELECT entry_date FROM day_entries WHERE status = 'clear'"
  );
  const dates = new Set(rows.map((r) => r.entry_date));
  let streak = 0;
  const cursor = new Date();
  if (!dates.has(isoOf(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(isoOf(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getTrackedDaysInYear(year: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(DISTINCT entry_date) as count FROM day_entries WHERE entry_date LIKE ?',
    [`${year}-%`]
  );
  return row?.count ?? 0;
}
export async function getLongestClearDayStreak(): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ entry_date: string }>(
    "SELECT entry_date FROM day_entries WHERE status = 'clear' ORDER BY entry_date ASC"
  );
  const dateStrs = rows.map((r) => r.entry_date);
  if (dateStrs.length === 0) return 0;

  function dateFromIso(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  let longest = 0;
  let runLength = 1;
  for (let i = 1; i < dateStrs.length; i++) {
    const prev = dateFromIso(dateStrs[i - 1]);
    const cur = dateFromIso(dateStrs[i]);
    if (cur.getTime() - prev.getTime() === 86400000) {
      runLength++;
    } else {
      longest = Math.max(longest, runLength);
      runLength = 1;
    }
  }
  longest = Math.max(longest, runLength);
  return longest;
}

export async function getLongestWeekStreak(): Promise<number> {
  const db = await getDb();
  const earliestRow = await db.getFirstAsync<{ d: string | null }>('SELECT MIN(entry_date) as d FROM day_entries');
  if (!earliestRow?.d) return 0;

  const [ey, em, ed] = earliestRow.d.split('-').map(Number);
  const earliestDate = new Date(ey, em - 1, ed);
  const day = earliestDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const cursor = new Date(earliestDate);
  cursor.setDate(earliestDate.getDate() + diffToMonday);
  cursor.setHours(0, 0, 0, 0);

  const today = new Date();
  const tDay = today.getDay();
  const tDiff = tDay === 0 ? -6 : 1 - tDay;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + tDiff);
  currentMonday.setHours(0, 0, 0, 0);

  let longest = 0;
  let runLength = 0;
  while (cursor < currentMonday) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(cursor.getDate() + 6);
    const startIso = isoOf(cursor);
    const endIso = isoOf(weekEnd);
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date BETWEEN ? AND ?",
      [startIso, endIso]
    );
    const target = await getCurrentWeeklyTarget(startIso);
    const met = (row?.count ?? 0) >= target;
    if (met) {
      runLength++;
      longest = Math.max(longest, runLength);
    } else {
      runLength = 0;
    }
    cursor.setDate(cursor.getDate() + 7);
  }
  return longest;
}
export interface SignalRawRow {
  status: string;
  mood: string | null;
  evening_context: string | null;
  severity: string | null;
}

export async function getYearsWithEntries(): Promise<number[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ y: string }>(
    "SELECT DISTINCT substr(entry_date, 1, 4) as y FROM day_entries ORDER BY y DESC"
  );
  const years = rows.map((r) => Number(r.y));
  const thisYear = new Date().getFullYear();
  if (!years.includes(thisYear)) years.unshift(thisYear);
  return years;
}

export async function getFirstEntryDate(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ d: string | null }>(
    'SELECT MIN(entry_date) as d FROM day_entries'
  );
  return row?.d ?? null;
}

export async function getTrackedDaysAllTime(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(DISTINCT entry_date) as count FROM day_entries'
  );
  return row?.count ?? 0;
}
export interface DayCell {
  status: DayStatus;
  howMuch: string | null;
}

export async function getMonthCells(
  year: number,
  month: number
): Promise<Record<string, DayCell>> {
  const db = await getDb();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const rows = await db.getAllAsync<{ entry_date: string; status: DayStatus; severity: string | null }>(
    'SELECT entry_date, status, severity FROM day_entries WHERE entry_date LIKE ?',
    [`${prefix}-%`]
  );
  const map: Record<string, DayCell> = {};
  rows.forEach((r) => {
    map[r.entry_date] = { status: r.status, howMuch: r.severity };
  });
  return map;
}
export async function getIntentionChangeCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM intentions'
  );
  // The first intention isn't a revision — every one after it is.
  return Math.max(0, (row?.count ?? 0) - 1);
}

export interface SameDayStat { count: number; mostRecent: string | null }

export async function getSameDayDrinkingLogs(): Promise<SameDayStat> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ entry_date: string }>(
    "SELECT entry_date FROM day_entries WHERE status = 'drinking' AND date(created_at) = entry_date ORDER BY entry_date DESC"
  );
  return { count: rows.length, mostRecent: rows[0]?.entry_date ?? null };
}

export async function getWeeksMetCount(): Promise<number> {
  const db = await getDb();
  const earliest = await db.getFirstAsync<{ d: string | null }>(
    'SELECT MIN(entry_date) as d FROM day_entries'
  );
  if (!earliest?.d) return 0;
  const [y, m, d] = earliest.d.split('-').map(Number);
  const cursor = new Date(y, m - 1, d);
  const day = cursor.getDay();
  cursor.setDate(cursor.getDate() + (day === 0 ? -6 : 1 - day));
  cursor.setHours(0, 0, 0, 0);

  const today = new Date();
  const tDiff = today.getDay() === 0 ? -6 : 1 - today.getDay();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + tDiff);
  currentMonday.setHours(0, 0, 0, 0);

  let met = 0;
  while (cursor < currentMonday) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(cursor.getDate() + 6);
    const startIso = isoOf(cursor);
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date BETWEEN ? AND ?",
      [startIso, isoOf(weekEnd)]
    );
    const target = await getCurrentWeeklyTarget(startIso);
    if ((row?.count ?? 0) >= target) met++;
    cursor.setDate(cursor.getDate() + 7);
  }
  return met;
}
// Widening ladder so the gaps grow as the numbers do — later tiers stay a
// real distance apart instead of arriving in a clump.
export const CLEAR_DAY_MULTS = [2, 4, 8, 14, 24, 40, 70, 110, 170, 260, 400];
export const LOGGING_TIERS = [7, 14, 30, 60, 100, 180, 365, 500, 730, 1095];

export async function getClearDaysInYearCount(year: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date LIKE ?",
    [`${year}-%`]
  );
  return row?.count ?? 0;
}

export interface FullyLoggedMonth { year: number; month: number }

// A month counts only once every one of its days has an entry. The current
// month is judged against days elapsed so far, not its full length.
export async function getFullyLoggedMonths(): Promise<FullyLoggedMonth[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ ym: string; n: number }>(
    "SELECT substr(entry_date,1,7) as ym, COUNT(DISTINCT entry_date) as n FROM day_entries GROUP BY ym ORDER BY ym ASC"
  );
  const now = new Date();
  const out: FullyLoggedMonth[] = [];
  rows.forEach((r) => {
    const [y, m] = r.ym.split('-').map(Number);
    const isCurrent = y === now.getFullYear() && m === now.getMonth() + 1;
    const needed = isCurrent ? now.getDate() : new Date(y, m, 0).getDate();
    if (r.n >= needed) out.push({ year: y, month: m });
  });
  return out;
}

export async function getWeeksMetInYear(year: number): Promise<number> {
  const db = await getDb();
  const cursor = new Date(year, 0, 1);
  cursor.setDate(cursor.getDate() + (cursor.getDay() === 0 ? -6 : 1 - cursor.getDay()));
  cursor.setHours(0, 0, 0, 0);

  const today = new Date();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + (today.getDay() === 0 ? -6 : 1 - today.getDay()));
  currentMonday.setHours(0, 0, 0, 0);

  const end = year < today.getFullYear() ? new Date(year + 1, 0, 1) : currentMonday;

  let met = 0;
  while (cursor < end) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(cursor.getDate() + 6);
    // A week belongs to the year containing its Thursday.
    const thursday = new Date(cursor);
    thursday.setDate(cursor.getDate() + 3);
    if (thursday.getFullYear() === year) {
      const startIso = isoOf(cursor);
      const row = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM day_entries WHERE status = 'clear' AND entry_date BETWEEN ? AND ?",
        [startIso, isoOf(weekEnd)]
      );
      const target = await getCurrentWeeklyTarget(startIso);
      if ((row?.count ?? 0) >= target) met++;
    }
    cursor.setDate(cursor.getDate() + 7);
  }
  return met;
}

export interface TrackingAnniversary {
  years: number;
  reachedIso: string;
  reached: boolean;
}

export async function getTrackingAnniversaries(): Promise<TrackingAnniversary[]> {
  const first = await getFirstEntryDate();
  if (!first) return [];
  const [y, m, d] = first.split('-').map(Number);
  const now = new Date();
  return [1, 2, 3, 5, 10].map((years) => {
    const at = new Date(y + years, m - 1, d);
    return { years, reachedIso: isoOf(at), reached: at <= now };
  });
}
