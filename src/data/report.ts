// "Month in review" / "Year in review": everything the report shows, for
// one period. Pure: takes the data, today and the savings settings.
//
// Written for the user first; sound enough to share with a therapist or
// health advisor: it says how complete the record is, gives amounts as the
// ranges they are, and never grades.

import { Data } from './compute';
import { addDays, daysInMonth, isoOf, yearOf, type Iso } from './dates';
import type { DrinkAmount } from './db';
import { monthChallenge, type ChallengeSettings } from './challenges';
import { MIN_LOGGED_MONTH, rate } from './trend';
import { earnedMilestones } from './timeline';
import { backOnTrackWeeks } from './milestones';

export interface Period {
  year: number;
  month: number | null; // null = the whole year
}

type Level = 'clear' | DrinkAmount;
const DRINKS: Record<Level, [number, number | null]> = { clear: [0, 0], 'a-few': [1, 2], moderate: [3, 4], 'a-lot': [5, null] };

export interface Report {
  period: Period;
  start: Iso;
  end: Iso; // the period's last day, or today if the period is still running
  complete: boolean;
  daysInPeriod: number;
  logged: number;
  levels: Record<Level, number>;
  // before: completed weeks in the period from before the first intention (not measured)
  /** unclear: neither met nor missed for certain (not enough logged to say). */
  weeks: { counted: number; met: number; exceeded: number; before: number; unclear: number };
  targets: { target: number; from: Iso }[];
  backOnTrack: number;
  dayOfWeek: { weekday: number; clear: number; aFew: number; more: number }[];
  /** Drinks per week as a range; most is null when an "A lot" day makes it open-ended. */
  drinksPerWeek: { least: number; most: number | null } | null;
  /** Savings in dollars against the baseline; least is null when open-ended. */
  savings: { most: number; least: number | null } | null;
  previous: { clear: number; logged: number } | null;
  /** Drinks a week against the previous period (one figure per level); null without 7+ logged days in each. */
  drinksChange: { diff: number } | null;
  /** Chosen challenges in the period: earned clear weekends/weeks, and chosen months with how they went. */
  challenges: { title: string; date: Iso | null; note: string }[];
  calendar: Record<Iso, Level>; // month reports
  // year reports; available = days that could have been logged (from the first
  // logged day, up to today), so future months and pre-tracking days aren't "missed"
  months: { month: number; clear: number; logged: number; aFew: number; more: number; available: number }[];
  milestones: { title: string; date: Iso }[];
}

const levelOf = (d: Data, iso: Iso): Level | null => {
  const e = d.byDate.get(iso);
  return !e ? null : e.status === 'clear' ? 'clear' : (e.amount ?? 'a-lot');
};

export function periodBounds(p: Period): { start: Iso; endFull: Iso } {
  return p.month
    ? { start: isoOf(p.year, p.month, 1), endFull: isoOf(p.year, p.month, daysInMonth(p.year, p.month)) }
    : { start: isoOf(p.year, 1, 1), endFull: isoOf(p.year, 12, 31) };
}

export function previousPeriod(p: Period): Period {
  if (!p.month) return { year: p.year - 1, month: null };
  return p.month === 1 ? { year: p.year - 1, month: 12 } : { year: p.year, month: p.month - 1 };
}

/** A week belongs to the period containing its Thursday, as everywhere else. */
const weekIn = (monday: Iso, p: Period) => {
  const th = addDays(monday, 3);
  return yearOf(th) === p.year && (!p.month || Number(th.slice(5, 7)) === p.month);
};

export function buildReport(
  d: Data,
  p: Period,
  today: Iso,
  savings: { baselinePerWeek: number; price: number } | null,
  challenges?: ChallengeSettings,
): Report {
  const { start, endFull } = periodBounds(p);
  const end = endFull < today ? endFull : today;
  const days: Iso[] = [];
  for (let x = start; x <= end; x = addDays(x, 1)) days.push(x);

  const levels: Record<Level, number> = { clear: 0, 'a-few': 0, moderate: 0, 'a-lot': 0 };
  const calendar: Record<Iso, Level> = {};
  const dow = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, clear: 0, aFew: 0, more: 0 }));
  let least = 0;
  let most: number | null = 0;
  for (const iso of days) {
    const lv = levelOf(d, iso);
    if (!lv) continue;
    levels[lv]++;
    calendar[iso] = lv;
    const w = dow[new Date(`${iso}T00:00:00Z`).getUTCDay()];
    if (lv === 'clear') w.clear++;
    else if (lv === 'a-few') w.aFew++;
    else w.more++;
    least += DRINKS[lv][0];
    most = most === null || DRINKS[lv][1] === null ? null : most + (DRINKS[lv][1] as number);
  }
  const logged = levels.clear + levels['a-few'] + levels.moderate + levels['a-lot'];

  // Completed weeks belonging to the period.
  const weeks = d.intentionWeeks(today).filter((w) => weekIn(w, p)); // weeks with an intention
  const targets: { target: number; from: Iso }[] = [];
  let met = 0;
  let exceeded = 0;
  let unclear = 0;
  for (const w of weeks) {
    const t = d.scaleTarget(w);
    if (!targets.length || targets[targets.length - 1].target !== t) targets.push({ target: t, from: w });
    const c = d.clearCountBetween(w, addDays(w, 6));
    if (c >= t) met++;
    if (c > t) exceeded++;
    if (c < t && !d.weekMissed(w)) unclear++;
  }
  const backOnTrack = backOnTrackWeeks(d, today).filter((end6) => weekIn(addDays(end6, -6), p)).length;

  // Estimates need at least a week of logged days to say anything per week.
  const perWeek = logged >= 7 ? 7 / logged : null;
  const drinksPerWeek = perWeek ? { least: least * perWeek, most: most === null ? null : most * perWeek } : null;
  let savingsOut: Report['savings'] = null;
  if (savings && logged > 0) {
    const perDay = savings.baselinePerWeek / 7;
    savingsOut = {
      most: (perDay * logged - least) * savings.price,
      least: most === null ? null : (perDay * logged - most) * savings.price,
    };
  }

  // The previous period, for a gentle comparison.
  const pp = previousPeriod(p);
  const pb = periodBounds(pp);
  let pClear = 0;
  let pLogged = 0;
  for (let x = pb.start; x <= pb.endFull; x = addDays(x, 1)) {
    const lv = levelOf(d, x);
    if (!lv) continue;
    pLogged++;
    if (lv === 'clear') pClear++;
  }

  const months = p.month
    ? []
    : Array.from({ length: 12 }, (_, i) => {
        const ms = isoOf(p.year, i + 1, 1);
        const me = isoOf(p.year, i + 1, daysInMonth(p.year, i + 1));
        const from = d.earliest && d.earliest > ms ? d.earliest : ms;
        const to = me < today ? me : today;
        const available = from > to ? 0 : Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
        const m = { month: i + 1, clear: 0, logged: 0, aFew: 0, more: 0, available };
        const prefix = `${p.year}-${String(i + 1).padStart(2, '0')}-`;
        for (const [iso, lv] of Object.entries(calendar)) {
          if (!iso.startsWith(prefix)) continue;
          m.logged++;
          if (lv === 'clear') m.clear++;
          else if (lv === 'a-few') m.aFew++;
          else m.more++;
        }
        return m;
      });

  return {
    period: p,
    start,
    end,
    complete: endFull < today,
    daysInPeriod: days.length,
    logged,
    levels,
    weeks: { counted: weeks.length, met, exceeded, unclear, before: d.completedWeeks(today).filter((w) => weekIn(w, p)).length - weeks.length },
    targets,
    backOnTrack,
    dayOfWeek: [1, 2, 3, 4, 5, 6, 0].map((wd) => dow[wd]),
    drinksPerWeek,
    savings: savingsOut,
    // Only compare with a period that was tracked from its start: a year whose
    // tracking began in November isn't a fair comparison for a whole year.
    previous: pLogged > 0 && d.earliest !== null && d.earliest <= pb.start ? { clear: pClear, logged: pLogged } : null,
    calendar: p.month ? calendar : {},
    months,
    milestones: milestonesInPeriod(d, today, start, end, challenges).filter((m) => m.kind !== 'challenge').map(({ title, date }) => ({ title, date })),
    drinksChange: (() => {
      const now = rate(d, start, end);
      const before = rate(d, pb.start, pb.endFull);
      return now.logged >= MIN_LOGGED_MONTH && before.logged >= MIN_LOGGED_MONTH ? { diff: now.perWeek - before.perWeek } : null;
    })(),
    challenges: [
      ...milestonesInPeriod(d, today, start, end, challenges).filter((m) => m.kind === 'challenge').map((m) => ({ title: m.title, date: m.date as Iso | null, note: 'earned' })),
      ...(challenges?.months ?? [])
        .filter((ym) => ym.startsWith(String(p.year)) && (!p.month || Number(ym.slice(5, 7)) === p.month))
        .map((ym) => ({ ym, s: monthChallenge(d, today, ym) }))
        .filter(({ s }) => s.state === 'under-way' || s.state === 'to-log' || s.state === 'ended')
        .map(({ ym, s }) => ({
          title: `Clear ${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`,
          date: null,
          note: s.state === 'ended' ? 'chosen; not this time' : s.state === 'to-log' ? 'chosen; days still to log' : 'chosen; under way',
        })),
    ],
  };
}

/** Milestones reached within the period, oldest first, titled as on Milestones. */
export function milestonesInPeriod(
  d: Data,
  today: Iso,
  start: Iso,
  end: Iso,
  challenges?: ChallengeSettings,
): { title: string; date: Iso; kind: string }[] {
  return earnedMilestones(d, today, { challenges })
    .filter((m) => m.date >= start && m.date <= end)
    .map(({ title, date, kind }) => ({ title, date, kind }));
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The default report: the last complete month (or this one, if there's no earlier data). */
export function defaultPeriod(today: Iso): Period {
  const y = yearOf(today);
  const m = Number(today.slice(5, 7));
  return m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 };
}


export interface RangeSummary {
  logged: number;
  levels: Record<'clear' | DrinkAmount, number>;
  drinksPerWeek: { least: number; most: number | null } | null;
}

/** Levels and the drinks-per-week range for any span of days (e.g. All time). */
export function summarizeRange(d: Data, start: Iso, end: Iso): RangeSummary {
  const levels: Record<Level, number> = { clear: 0, 'a-few': 0, moderate: 0, 'a-lot': 0 };
  let least = 0;
  let most: number | null = 0;
  for (const iso of d.datesAsc) {
    if (iso < start || iso > end) continue;
    const lv = levelOf(d, iso)!;
    levels[lv]++;
    least += DRINKS[lv][0];
    most = most === null || DRINKS[lv][1] === null ? null : most + (DRINKS[lv][1] as number);
  }
  const logged = levels.clear + levels['a-few'] + levels.moderate + levels['a-lot'];
  const k = logged >= 7 ? 7 / logged : null;
  return { logged, levels, drinksPerWeek: k ? { least: least * k, most: most === null ? null : most * k } : null };
}

/** The same calendar stretch a year earlier: 2026-01-01..2026-09-30 → 2025-01-01..2025-09-30. */
export function sameStretchLastYear(start: Iso, end: Iso): { start: Iso; end: Iso } {
  const back = (iso: Iso) => {
    const y = yearOf(iso) - 1;
    const m = Number(iso.slice(5, 7));
    return isoOf(y, m, Math.min(Number(iso.slice(8, 10)), daysInMonth(y, m))); // 29 Feb → 28 Feb
  };
  return { start: back(start), end: back(end) };
}

/** One weekday within a span: its level counts and drinks on a typical such day. */
export function weekdaySummary(
  d: Data,
  start: Iso,
  end: Iso,
  weekday: number, // 0 = Sunday
): { logged: number; levels: Record<Level, number>; perDay: { least: number; most: number | null } | null } {
  const levels: Record<Level, number> = { clear: 0, 'a-few': 0, moderate: 0, 'a-lot': 0 };
  let least = 0;
  let most: number | null = 0;
  for (const iso of d.datesAsc) {
    if (iso < start || iso > end || new Date(`${iso}T00:00:00Z`).getUTCDay() !== weekday) continue;
    const lv = levelOf(d, iso)!;
    levels[lv]++;
    least += DRINKS[lv][0];
    most = most === null || DRINKS[lv][1] === null ? null : most + (DRINKS[lv][1] as number);
  }
  const logged = levels.clear + levels['a-few'] + levels.moderate + levels['a-lot'];
  return { logged, levels, perDay: logged ? { least: least / logged, most: most === null ? null : most / logged } : null };
}
