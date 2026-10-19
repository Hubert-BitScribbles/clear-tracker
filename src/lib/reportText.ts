// Report wording. Kept plain and neutral: it may be read by a therapist.

import { t } from '../i18n';

/**
 * Drinks as a whole number — a fraction of a drink means little. Rounds .5
 * and under down, over .5 up (Hugh's rule, 8 October 2026): 8.5 → 8, 8.6 → 9.
 */
export function wholeDrinks(n: number): number {
  const f = Math.floor(n + 1e-9);
  return n - f > 0.5 + 1e-9 ? f + 1 : f;
}

/**
 * "About 14 drinks a week". A lot counts at 5, its minimum; the footnote under
 * each estimate says a period with an A lot day could be higher — the figure
 * itself stays plain (no judgement). The heading above names the period.
 */
export function drinksText(e: { perWeek: number }): string {
  return t('report.drinks', { count: wholeDrinks(e.perWeek) });
}

/** "4 more clear days than July", "2 fewer…", "The same number of…". No judgement either way. */
export function comparisonText(now: number, before: number, beforeLabel: string): string {
  const d = now - before;
  if (d === 0) return t('report.sameClear', { before: beforeLabel });
  return t(d > 0 ? 'report.moreClear' : 'report.fewerClear', { count: Math.abs(d), before: beforeLabel });
}

/** "About 1–2 drinks on a typical Friday" (open-ended: "1 or more"; from none: "Up to 1"). Whole drinks. */
export function typicalDayText(least: number, most: number | null, dayName: string): string {
  const a = wholeDrinks(least);
  if (most === null) return t('typical.orMore', { count: a, day: dayName });
  const b = wholeDrinks(most);
  if (a === b) return a === 0 ? t('typical.none', { day: dayName }) : t('typical.about', { count: a, day: dayName });
  if (a === 0) return t('typical.upTo', { count: b, day: dayName });
  return t('typical.range', { low: a, high: b, day: dayName });
}
