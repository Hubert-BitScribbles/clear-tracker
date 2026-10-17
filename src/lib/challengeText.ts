import type { MonthChallenge, SpanStatus } from '../data/challenges';
import { t, type Key } from '../i18n';
import { dayMonth, monthName, weekdayDayMonth } from '../i18n/format';

const monthOf = (ym: string) => monthName(Number(ym.slice(5, 7)));

/** "Clear January 2027" */
export const monthTitle = (ym: string) => t('challenge.monthTitle', { month: monthOf(ym), year: ym.slice(0, 4) });
/** "your clear January", for the baseline and momentum notes */
export const monthPhrase = (ym: string) => t('challenge.monthPhrase', { month: monthOf(ym) });

/** Where a chosen month stands, in a few neutral words. */
export function monthStatusText(c: MonthChallenge): string {
  switch (c.state) {
    case 'upcoming': return t('challenge.starts', { date: dayMonth(c.starts) });
    case 'under-way': return t('challenge.underWay', { day: c.day, days: c.days, toLog: c.toLog ? t('challenge.toLog', { count: c.toLog }) : '' });
    case 'to-log': return t('challenge.stillToLog', { count: c.toLog });
    case 'earned': return t('challenge.reached', { date: dayMonth(c.date) });
    case 'ended': return t('challenge.ended');
  }
}

/** "Fri, Oct 2" */
export const dayText = weekdayDayMonth;
/** "Oct 2–4" or "Sep 28 – Oct 4" */
export function spanText(first: string, last: string): string {
  const start = dayMonth(first);
  return first.slice(5, 7) === last.slice(5, 7)
    ? t('challenge.spanSameMonth', { start, endDay: Number(last.slice(8, 10)), startDay: Number(first.slice(8, 10)), end: dayMonth(last) })
    : t('challenge.spanTwoMonths', { start, end: dayMonth(last) });
}

/** "This weekend, Oct 2–4: under way · 1 day to log" — where the current weekend/week stands. */
export function spanStatusText(s: SpanStatus, kind: 'weekend' | 'week'): string {
  const span = spanText(s.first, s.last);
  switch (s.state) {
    case 'upcoming': return t('challenge.next', { span });
    case 'under-way': return t(`challenge.thisUnderWay.${kind}` as Key, { span, toLog: s.toLog ? t('challenge.toLog', { count: s.toLog }) : '' });
    case 'earned': return t(`challenge.thisEarned.${kind}` as Key, { span });
    case 'not-this-time': return t(`challenge.thisMissed.${kind}` as Key, { span });
  }
}
