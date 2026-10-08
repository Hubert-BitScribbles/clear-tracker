// Differential test: the native database.ts (unmodified, on real SQLite)
// against the web port (Dexie on fake IndexedDB), fed identical data and
// asked every question on many different "today"s.
//
// Every function must agree, except the two deliberate bug fixes, which are
// checked against an independent brute-force answer instead.
//
// Run under several time zones: npm test (see package.json).

import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import * as P from '../src/data/database';
import { ask, FIXED, mondayUtc, pad, plusDays, scenario, type Api } from './helpers';

// ---- The deliberate change: no intention before the first one --------------
// Native measures weeks before the first intention against a default of 3;
// the port leaves them unmeasured (target null). Week lists may differ only
// there: each null must be a week before the first intention, and is then
// compared as native's 3. Anything else must match exactly.

const WEEK_LISTS = /^(getWeeksForYear|getWeeklySeries)/;
let nullsChecked = 0;
// getCurrentWeeklyTarget sizes tiers: before the first intention it gives the
// first intention's target rather than native's 3.
function asNative(key: string, value: unknown, firstIntention: string | null, firstTarget: number | null = null) {
  const m = /^getCurrentWeeklyTarget\((.+)\)$/.exec(key);
  if (m && firstIntention !== null && m[1] < firstIntention) {
    expect(value, key).toBe(firstTarget);
    nullsChecked++;
    return 3;
  }
  if (!WEEK_LISTS.test(key) || !Array.isArray(value)) return value;
  // rc.6 added `logged` (days logged in the week), which native doesn't have.
  return value.map(({ logged: _logged, ...w }: { weekStartIso: string; target: number | null; logged?: number }) => {
    if (w.target !== null) return w;
    expect(firstIntention === null || w.weekStartIso < firstIntention, `${key}: null target on ${w.weekStartIso}`).toBe(true);
    nullsChecked++;
    return { ...w, target: 3 };
  });
}

// ---- Streak milestones: fixed lengths now, so checked independently --------
// Native scaled streak tiers by the intention; the port uses 2, 4, 8, 13, 26
// and 52 weeks for everyone. Weeks are measured from the first intention.

const STREAK_TIERS = [2, 4, 8, 13, 26, 52];
function bruteStreakTiers(entries: Record<string, unknown>[], intentions: Record<string, unknown>[], today: string) {
  const ledger = [...intentions].sort((a, b) =>
    (b.effective_date as string).localeCompare(a.effective_date as string) || (b.created_at as string).localeCompare(a.created_at as string));
  if (!ledger.length || !entries.length) return [];
  const clear = new Set(entries.filter((e) => e.status === 'clear').map((e) => e.entry_date as string));
  const firstEntry = entries.map((e) => e.entry_date as string).sort()[0];
  const firstIntention = ledger[ledger.length - 1].effective_date as string;
  let w = mondayUtc(firstEntry) > firstIntention ? mondayUtc(firstEntry) : firstIntention;
  const weeks: { end: string; met: boolean }[] = [];
  for (; w < mondayUtc(today); w = plusDays(w, 7)) {
    const target = ledger.find((i) => (i.effective_date as string) <= w)!.weekly_target as number;
    let n = 0;
    for (let k = 0; k < 7; k++) if (clear.has(plusDays(w, k))) n++;
    weeks.push({ end: plusDays(w, 6), met: n >= target });
  }
  const out: { tierWeeks: number; reachedWeekEndIso: string }[] = [];
  for (let i = 0; i < weeks.length; i++) {
    if (!weeks[i].met || (i > 0 && weeks[i - 1].met)) continue; // start of a run
    let len = 0;
    while (i + len < weeks.length && weeks[i + len].met) len++;
    for (const t of STREAK_TIERS) if (len >= t) out.push({ tierWeeks: t, reachedWeekEndIso: weeks[i + t - 1].end });
  }
  return out;
}
const CHANGED = new Set(['getStreakTierEarnings']);

// ---- Independent answers for the two fixed functions ----------------------

function bruteLongestClear(entries: Record<string, unknown>[]) {
  const clear = new Set(entries.filter((e) => e.status === 'clear').map((e) => e.entry_date as string));
  let best = 0;
  for (const d of clear) {
    if (clear.has(plusDays(d, -1))) continue; // not the start of a run
    let len = 0;
    while (clear.has(plusDays(d, len))) len++;
    best = Math.max(best, len);
  }
  return best;
}

function bruteSameDay(entries: Record<string, unknown>[]) {
  const dates = entries
    .filter((e) => {
      const c = new Date(e.created_at as string);
      const local = `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}`;
      return e.status === 'drinking' && local === e.entry_date;
    })
    .map((e) => e.entry_date as string)
    .sort()
    .reverse();
  return { count: dates.length, mostRecent: dates[0] ?? null };
}

// "Today"s chosen to hit the edges: clock changes, year ends, week ends,
// a leap day, and ordinary days. Each is tried at noon and at 11:30 pm.
const TODAYS = [
  '2026-03-08', '2026-03-09', '2026-11-01', '2026-11-02', '2025-03-10',
  '2026-01-01', '2025-12-31', '2026-01-04', '2025-12-29',
  '2026-09-27', '2026-09-28', '2026-09-30', '2024-02-29', '2025-07-15',
];

const nativeDiffs: Record<string, number> = {};
let comparisons = 0;

afterEach(() => vi.useRealTimers());
afterAll(() => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(`[${tz}] ${comparisons} scenario×today runs compared.`,
    'Native results that differed from the fixed versions:', nativeDiffs,
    `Weeks before the first intention (native: 3, port: none): ${nullsChecked}.`);
});

describe(`native vs port (${Intl.DateTimeFormat().resolvedOptions().timeZone})`, () => {
  for (const today of TODAYS) {
    for (const hour of [12, 23]) {
      for (const seed of [1, 2, 3, 4]) {
        const longRuns = seed === 3;
        const capRun = seed === 4;
        const label = longRuns ? ' (long clear runs)' : capRun ? ' (2-year streak)' : '';
        it(`${today} ${hour}:30, seed ${seed}${label}`, async () => {
          const [y, m, d] = today.split('-').map(Number);
          vi.useFakeTimers({ toFake: ['Date'] });
          vi.setSystemTime(new Date(y, m - 1, d, hour, 30));

          const { entries, intentions } = scenario(seed * 1000 + d * 31 + m, today, { longClearRuns: longRuns || capRun, capRun });
          if (capRun) {
            // Guard: this scenario must actually reach the longest (52-week) tier.
            const tiers = (await P.restoreFromBackup(entries, intentions), await P.getStreakTierEarnings());
            expect(tiers.some((t) => t.tierWeeks === 52)).toBe(true);
          }

          vi.resetModules();
          const N = (await import('./native/database.native')) as unknown as Api;
          await N.restoreFromBackup(entries, intentions);
          await P.restoreFromBackup(entries, intentions);

          const years = [...new Set(entries.map((e) => Number((e.entry_date as string).slice(0, 4))))];
          years.push(y + 1); // a year with no data
          const months: [number, number][] = [[y, m], [y, m === 1 ? 12 : m - 1], [y - 1, m]];
          const weeks: [string, string][] = [0, 1, 5, 30].map((k) => {
            const s = plusDays(mondayUtc(today), -7 * k);
            return [s, plusDays(s, 6)];
          });

          const [native, port] = [await ask(N, years, months, weeks), await ask(P, years, months, weeks)];
          const first = [...intentions].sort((a, b) =>
            (a.effective_date as string).localeCompare(b.effective_date as string) || (a.created_at as string).localeCompare(b.created_at as string))[0];
          const firstIntention = (first?.effective_date as string) ?? null;
          const firstTarget = (first?.weekly_target as number) ?? null;
          comparisons++;

          for (const key of Object.keys(native)) {
            if (CHANGED.has(key)) continue; // checked below, independently
            if (FIXED.has(key)) {
              if (JSON.stringify(native[key]) !== JSON.stringify(port[key])) {
                nativeDiffs[key] = (nativeDiffs[key] ?? 0) + 1;
              }
              continue;
            }
            expect(asNative(key, port[key], firstIntention, firstTarget), key).toEqual(native[key]);
          }
          expect(port.getLongestClearDayStreak).toBe(bruteLongestClear(entries));
          expect(port.getStreakTierEarnings).toEqual(bruteStreakTiers(entries, intentions, today));
          expect(port.getSameDayDrinkingLogs).toEqual(bruteSameDay(entries));
        });
      }
    }
  }

  it('empty database: every function agrees', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 30, 12));
    vi.resetModules();
    const N = (await import('./native/database.native')) as unknown as Api;
    await P.resetDatabase();
    const weeks: [string, string][] = [['2026-09-28', '2026-10-04']];
    const port = await ask(P, [2026], [[2026, 9]], weeks);
    for (const k of Object.keys(port)) port[k] = asNative(k, port[k], null);
    for (const k of CHANGED) expect(port[k]).toEqual([]);
    const native = await ask(N, [2026], [[2026, 9]], weeks);
    for (const k of CHANGED) delete port[k], delete native[k];
    expect(port).toEqual(native);
  });
});
