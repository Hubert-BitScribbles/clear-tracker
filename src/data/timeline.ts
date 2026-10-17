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
import { t } from '../i18n';
import { monthYear } from '../i18n/format';
import { monthTitle } from '../lib/challengeText';

export const BEYOND_TARGET_TIERS = [1, 5, 15, 40, 100];

export type Kind =
  | 'first' | 'logging' | 'clear' | 'deciding' | 'back' | 'best' | 'months' | 'anniversary' | 'streak' | 'growth' | 'challenge';
/** The badge glyph for each kind, as on All milestones. */
export const GLYPH: Record<Kind, string> = {
  first: '✓', logging: '◆', clear: '★', deciding: '✎', back: '↺', best: '▲', months: '▦',
  anniversary: '◎', streak: '🔥', growth: '✦', challenge: '○',
};

export interface Earned {
  /** Stays the same in every language ("clear-days:30"), for remembering which have been shown. */
  id: string;
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
  const add = (id: string, title: string, date: Iso | null | undefined, kind: Kind) => {
    if (date && date <= today) out.push({ id, title, date, kind });
  };
  const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;
  const base = baseMilestones(d, today);

  add('first-clear', t('ms.firstClear'), base.firstClearDate, 'first');
  const firstIntention = [...d.snap.intentions].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  add('first-intention', t('ms.firstIntention'), firstIntention?.effective_date && firstIntention.effective_date <= today ? firstIntention.effective_date : null, 'deciding');
  add('first-week-met', t('ms.firstWeekMet'), base.firstClearWeekEndIso, 'first');

  const firstLogging = new Map<number, Iso>();
  for (const e of loggingTierEarnings(d)) if (!firstLogging.has(e.tierDays)) firstLogging.set(e.tierDays, e.reachedDateIso);
  for (const n of LOGGING_TIERS) add(`logged-in-a-row:${n}`, t('ms.loggedInARow', { n }), firstLogging.get(n), 'logging');
  for (const e of clearTierEarnings(d)) add(`clear-days:${e.threshold}`, t('ms.clearDays', { n: e.threshold }), e.reachedDateIso, 'clear');

  for (const e of tiersFrom(honestLoggingDates(d), HONEST_LOGGING_TIERS)) {
    add(`same-day:${e.tier}`, e.tier === 1 ? t('ms.sameDay1') : t('ms.sameDayN', { n: e.tier }), e.reachedIso, 'deciding');
  }
  for (const e of tiersFrom(keptToAFewWeeks(d, today), KEPT_TO_A_FEW_TIERS)) {
    add(`few-week:${e.tier}`, e.tier === 1 ? t('ms.fewWeek1') : t('ms.fewWeekN', { n: e.tier }), e.reachedIso, 'deciding');
  }
  for (const e of tiersFrom(backOnTrackWeeks(d, today), BACK_ON_TRACK_TIERS)) {
    add(`back-on-track:${e.tier}`, e.tier === 1 ? t('ms.back1') : t('ms.backN', { n: e.tier }), e.reachedIso, 'back');
  }
  const beyond = [...base.beyondTargetInstances].reverse().map((b) => b.weekEndIso);
  for (const e of tiersFrom(beyond, BEYOND_TARGET_TIERS)) add(`beyond:${e.tier}`, e.tier === 1 ? t('ms.beyond1') : t('ms.beyondN', { n: e.tier }), e.reachedIso, 'growth');

  for (const b of bestMonths(d)) add(`best-month:${monthKey(b.year, b.month)}`, t('ms.bestMonth', { month: monthYear(b.month, b.year, 'short') }), b.reachedIso, 'best');
  // Fully logged months count once the month is over.
  for (const f of fullyLoggedMonths(d, today)) {
    const end = isoOf(f.year, f.month, daysInMonth(f.year, f.month));
    if (end < today) add(`fully-logged:${monthKey(f.year, f.month)}`, t('ms.fullyLogged', { month: monthYear(f.month, f.year) }), end, 'months');
  }
  for (const a of trackingAnniversaries(d, today)) if (a.reached) add(`years:${a.years}`, t('ms.years', { count: a.years }), a.reachedIso, 'anniversary');
  // Weeks in a row meeting the intention: for everyone (unlike clear-day
  // streaks, they never punish a chosen drinking day).
  for (const e of streakTierFirsts(d, today)) add(`week-streak:${e.tierWeeks}`, t('ms.streak', { n: e.tierWeeks }), e.reachedWeekEndIso, 'streak');
  const c = opts.challenges;
  if (c) {
    for (const e of tiersFrom(clearWeekends(d, today, c.weekendRuns), WEEKEND_TIERS)) {
      add(`clear-weekends:${e.tier}`, e.tier === 1 ? t('ms.clearWeekend1') : t('ms.clearWeekendN', { n: e.tier }), e.reachedIso, 'challenge');
    }
    for (const e of tiersFrom(clearWeeks(d, today, c.weekRuns), WEEK_TIERS)) {
      add(`clear-weeks:${e.tier}`, e.tier === 1 ? t('ms.clearWeek1') : t('ms.clearWeekN', { n: e.tier }), e.reachedIso, 'challenge');
    }
    for (const ym of c.months) {
      const s = monthChallenge(d, today, ym);
      if (s.state === 'earned') add(`clear-month:${ym}`, monthTitle(ym), s.date, 'challenge');
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
    if (need > 0 && have < need) out.push({ title, sub: sub ?? t('tier.progress', { done: Math.floor(have), target: need }), progress: have / need, kind });
  };
  const nextOf = (tiers: number[], have: number) => tiers.find((t) => have < t);
  if (!d.earliest) return out;

  const earnedLogging = new Set(loggingTierEarnings(d).map((e) => e.tierDays));
  const nl = LOGGING_TIERS.find((t) => !earnedLogging.has(t));
  const longest = longestLoggingRun(d);
  if (nl) push(t('ms.loggedInARow', { n: nl }), longest, nl, 'logging', t('ms.longestRun', { done: longest, target: nl }));

  const clearCount = d.datesAsc.filter((x) => d.status(x) === 'clear').length;
  const nc = nextOf(CLEAR_DAY_TIERS, clearCount);
  if (nc) push(t('ms.clearDays', { n: nc }), clearCount, nc, 'clear');

  const back = backOnTrackWeeks(d, today).length;
  const nb = nextOf(BACK_ON_TRACK_TIERS, back);
  if (nb) push(nb === 1 ? t('ms.back1') : t('ms.backN', { n: nb }), back, nb, 'back');
  const few = keptToAFewWeeks(d, today).length;
  const nf = nextOf(KEPT_TO_A_FEW_TIERS, few);
  if (nf) push(nf === 1 ? t('ms.fewWeek1') : t('ms.fewWeekN', { n: nf }), few, nf, 'deciding');
  const honest = honestLoggingDates(d).length;
  const nh = nextOf(HONEST_LOGGING_TIERS, honest);
  if (nh) push(nh === 1 ? t('ms.sameDay1') : t('ms.sameDayN', { n: nh }), honest, nh, 'deciding');
  const beyond = baseMilestones(d, today).beyondTargetInstances.length;
  const nt = nextOf(BEYOND_TARGET_TIERS, beyond);
  if (nt) push(nt === 1 ? t('ms.beyond1') : t('ms.beyondN', { n: nt }), beyond, nt, 'growth');

  const earnedStreaks = new Set(streakTierFirsts(d, today).map((e) => e.tierWeeks));
  const ns = STREAK_TIERS_WEEKS.find((t) => !earnedStreaks.has(t));
  if (ns) push(t('ms.streak', { n: ns }), currentWeekStreak(d, today), ns, 'streak');
  return out.sort((a, b) => b.progress - a.progress).slice(0, opts.limit ?? 3);
}
