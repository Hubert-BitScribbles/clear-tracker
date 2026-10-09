// Trend statements for the Trends cards. Neutral: "fewer" and "more" are
// facts, not verdicts.

import type { Change, MonthPoint } from '../data/trend';
import { monthPhrase } from './challengeText';

/** The drinks trend for the Trends screen, shared with the savings card. */
export interface DrinksTrend {
  points: MonthPoint[];
  three: Change | null;
  six: Change | null;
  notes: { three: string[]; six: string[] };
}

export const ML = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** " (the comparison includes your clear August)" when a chosen challenge month is inside the windows. */
export const challengeNote = (yms: string[]) => (yms.length ? ` (the comparison includes ${yms.map(monthPhrase).join(' and ')})` : '');

const n1 = (x: number) => Math.max(1, Math.round(Math.abs(x)));
const money = (x: number) => `$${Math.round(Math.abs(x)).toLocaleString('en-CA')}`;

/** "Last 3 months: …" — or, with no lead (under a heading that already names the period), "About …". */
const led = (lead: string | null, text: string) => (lead ? `${lead}: ${text}` : text.charAt(0).toUpperCase() + text.slice(1));

/** "Last 3 months: about 1 fewer drink a week than the 3 before" (within ½ a drink: "about the same as …"). */
export function drinksChangeText(lead: string | null, diff: number, vs: string): string {
  if (Math.abs(diff) < 0.5) return led(lead, `about the same as ${vs}`);
  const k = n1(diff);
  return led(lead, `about ${k} ${diff < 0 ? 'fewer' : 'more'} drink${k === 1 ? '' : 's'} a week than ${vs}`);
}

/**
 * The same change in money: fewer drinks a week means saving more.
 * "Last 3 months: saving about $12 more a week than the 3 before".
 * "About the same" uses the drinks rule (within ½ a drink a week), so the
 * drinks and savings cards never seem to disagree.
 */
export function savingsChangeText(lead: string | null, drinksDiff: number, price: number, vs: string): string {
  const dollars = -drinksDiff * price;
  if (Math.abs(drinksDiff) < 0.5) return led(lead, `about the same as ${vs}`);
  return led(lead, `saving about ${money(dollars)} ${dollars > 0 ? 'more' : 'less'} a week than ${vs}`);
}

/**
 * A month against the one before it, for the selected month on a chart:
 * "About 1 fewer drink a week than August" (under the month heading). Null when
 * either month has too few logged days.
 */
export function monthVsPrevious(p: MonthPoint): { lead: string; diff: number; vs: string } | null {
  if (p.perWeek === null || p.prev.perWeek === null) return null;
  return { lead: `${ML[p.month - 1]}${p.soFar ? ' so far' : ''}`, diff: p.perWeek - p.prev.perWeek, vs: ML[p.prev.month - 1] };
}
