// Everything earned, as one dated list (for the Milestones timeline and the
// month/year in review), and the milestones closest to being earned ("Up
// next"). Titles match All milestones. Pure: takes the data and options.

import {
  clearTierEarnings, CLEAR_DAY_TIERS, currentWeekStreak, Data, fullyLoggedMonths, LOGGING_TIERS, loggingTierEarnings,
  longestLoggingRun, milestones as baseMilestones, STREAK_TIERS_WEEKS, streakTierFirsts, trackingAnniversaries,
} from './compute';
import { clearWeekends, clearWeeks, monthChallenge, WEEK_TIERS, WEEKEND_TIERS, type ChallengeSettings } from './challenges';
import { daysInMonth, isoOf, type Iso } from './dates';
import {
  BACK_ON_TRACK_TIERS, backOnTrackWeeks, bestMonths, HONEST_LOGGING_TIERS, honestLoggingDates, KEPT_TO_A_FEW_TIERS,
  keptToAFewWeeks, tiersFrom,
} from './milestones';

export const BEYOND_TARGET_TIERS = [1, 5, 15, 40, 100];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export type Kind =
  | 'first' | 'logging' | 'clear' | 'deciding' | 'back' | 'best' | 'months' | 'anniversary' | 'streak' | 'growth' | 'challenge';
/** The badge glyph for each kind, as on All milestones. */
export const GLYPH: Record<Kind, string> = {
  first: '✓', logging: '◆', clear: '★', deciding: '✎', back: '↺', best: '▲', months: '▦',
  anniversary: '◎', streak: '🔥', growth: '✦', challenge: '○',
};

export interface Earned {
  title: string;
  date: Iso;
  kind: Kind;
}

export interface TimelineOptions {
  challenges?: ChallengeSettings;
}

/** Every milestone earned up to today, oldest first. */
export function earnedMilestones(d: Data, today: Iso, opts: TimelineOptions = {}): Earned[] {
  const out: Earned[] = [];
  const add = (title: string, date: Iso | null | undefined, kind: Kind) => {
    if (date && date <= today) out.push({ title, date, kind });
  };
  const base = baseMilestones(d, today);

  add('First clear day', base.firstClearDate, 'first');
  const firstIntention = [...d.snap.intentions].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  add('Set your first intention', firstIntention?.effective_date && firstIntention.effective_date <= today ? firstIntention.effective_date : null, 'deciding');
  add('First week you met your intention', base.firstClearWeekEndIso, 'first');

  const firstLogging = new Map<number, Iso>();
  for (const e of loggingTierEarnings(d)) if (!firstLogging.has(e.tierDays)) firstLogging.set(e.tierDays, e.reachedDateIso);
  for (const t of LOGGING_TIERS) add(`${t} days logged in a row`, firstLogging.get(t), 'logging');
  for (const e of clearTierEarnings(d)) add(`${e.threshold} clear days`, e.reachedDateIso, 'clear');

  for (const e of tiersFrom(honestLoggingDates(d), HONEST_LOGGING_TIERS)) {
    add(e.tier === 1 ? 'Logged a drinking day the same day' : `${e.tier} drinking days logged the same day`, e.reachedIso, 'deciding');
  }
  for (const e of tiersFrom(keptToAFewWeeks(d, today), KEPT_TO_A_FEW_TIERS)) {
    add(e.tier === 1 ? 'A week kept to a few' : `${e.tier} weeks kept to a few`, e.reachedIso, 'deciding');
  }
  for (const e of tiersFrom(backOnTrackWeeks(d, today), BACK_ON_TRACK_TIERS)) {
    add(e.tier === 1 ? 'Back on track after a missed week' : `Back on track ${e.tier} times`, e.reachedIso, 'back');
  }
  const beyond = [...base.beyondTargetInstances].reverse().map((b) => b.weekEndIso);
  for (const e of tiersFrom(beyond, BEYOND_TARGET_TIERS)) add(e.tier === 1 ? 'Beyond target' : `Beyond target ${e.tier} weeks`, e.reachedIso, 'growth');

  for (const b of bestMonths(d)) add(`Best month yet: ${MONTHS[b.month - 1].slice(0, 3)} ${b.year}`, b.reachedIso, 'best');
  // Fully logged months count once the month is over.
  for (const f of fullyLoggedMonths(d, today)) {
    const end = isoOf(f.year, f.month, daysInMonth(f.year, f.month));
    if (end < today) add(`${MONTHS[f.month - 1]} ${f.year} fully logged`, end, 'months');
  }
  for (const a of trackingAnniversaries(d, today)) if (a.reached) add(`${a.years} year${a.years === 1 ? '' : 's'} of tracking`, a.reachedIso, 'anniversary');
  // Weeks in a row meeting the intention: for everyone (unlike clear-day
  // streaks, they never punish a chosen drinking day).
  for (const e of streakTierFirsts(d, today)) add(`${e.tierWeeks}-week streak`, e.reachedWeekEndIso, 'streak');
  const c = opts.challenges;
  if (c) {
    for (const e of tiersFrom(clearWeekends(d, today, c.weekendRuns), WEEKEND_TIERS)) {
      add(e.tier === 1 ? 'A clear weekend' : `${e.tier} clear weekends`, e.reachedIso, 'challenge');
    }
    for (const e of tiersFrom(clearWeeks(d, today, c.weekRuns), WEEK_TIERS)) {
      add(e.tier === 1 ? 'A clear week' : `${e.tier} clear weeks`, e.reachedIso, 'challenge');
    }
    for (const ym of c.months) {
      const s = monthChallenge(d, today, ym);
      if (s.state === 'earned') add(`Clear ${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`, s.date, 'challenge');
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export interface NextUp {
  title: string;
  sub: string; // e.g. "11 of 15" or "Longest run: 27 of 30"
  progress: number; // 0–1
  kind: Kind;
}

/** The milestones closest to being earned, most nearly done first. Challenges live on their own page. */
export function upNext(
  d: Data,
  today: Iso,
  opts: { limit?: number } = {},
): NextUp[] {
  const out: NextUp[] = [];
  const push = (title: string, have: number, need: number, kind: Kind, sub?: string) => {
    if (need > 0 && have < need) out.push({ title, sub: sub ?? `${Math.floor(have)} of ${need}`, progress: have / need, kind });
  };
  const nextOf = (tiers: number[], have: number) => tiers.find((t) => have < t);
  if (!d.earliest) return out;

  const earnedLogging = new Set(loggingTierEarnings(d).map((e) => e.tierDays));
  const nl = LOGGING_TIERS.find((t) => !earnedLogging.has(t));
  const longest = longestLoggingRun(d);
  if (nl) push(`${nl} days logged in a row`, longest, nl, 'logging', `Longest run: ${longest} of ${nl}`);

  const clearCount = d.datesAsc.filter((x) => d.status(x) === 'clear').length;
  const nc = nextOf(CLEAR_DAY_TIERS, clearCount);
  if (nc) push(`${nc} clear days`, clearCount, nc, 'clear');

  const back = backOnTrackWeeks(d, today).length;
  const nb = nextOf(BACK_ON_TRACK_TIERS, back);
  if (nb) push(nb === 1 ? 'Back on track after a missed week' : `Back on track ${nb} times`, back, nb, 'back');
  const few = keptToAFewWeeks(d, today).length;
  const nf = nextOf(KEPT_TO_A_FEW_TIERS, few);
  if (nf) push(nf === 1 ? 'A week kept to a few' : `${nf} weeks kept to a few`, few, nf, 'deciding');
  const honest = honestLoggingDates(d).length;
  const nh = nextOf(HONEST_LOGGING_TIERS, honest);
  if (nh) push(nh === 1 ? 'Logged a drinking day the same day' : `${nh} drinking days logged the same day`, honest, nh, 'deciding');
  const beyond = baseMilestones(d, today).beyondTargetInstances.length;
  const nt = nextOf(BEYOND_TARGET_TIERS, beyond);
  if (nt) push(nt === 1 ? 'Beyond target' : `Beyond target ${nt} weeks`, beyond, nt, 'growth');

  const earnedStreaks = new Set(streakTierFirsts(d, today).map((e) => e.tierWeeks));
  const ns = STREAK_TIERS_WEEKS.find((t) => !earnedStreaks.has(t));
  if (ns) push(`${ns}-week streak`, currentWeekStreak(d, today), ns, 'streak');
  return out.sort((a, b) => b.progress - a.progress).slice(0, opts.limit ?? 3);
}
