// Dates, month and weekday names, and plain numbers in the current language,
// from the browser's built-in formats (German gives "Januar", and Austria
// "Jänner", without translation). Money is in lib/savings.ts.

import { language, t } from './index';

/** The locale used for words such as month names. English uses US forms ("Sep", not "Sept"). */
const wordLocale = () => (language() === 'en' ? 'en-US' : language());
/** The locale used for plain numbers ("1,234"). */
const numberLocale = () => (language() === 'en' ? 'en-CA' : language());

const UTC = 'UTC';
/** "January" or "Jan" for month 1–12. */
export const monthName = (month: number, width: 'long' | 'short' = 'long') =>
  new Intl.DateTimeFormat(wordLocale(), { month: width, timeZone: UTC }).format(Date.UTC(2026, month - 1, 15));
/** "Monday" or "Mon" for 0 = Sunday … 6 = Saturday. */
export const weekdayName = (weekday: number, width: 'long' | 'short' = 'long') =>
  new Intl.DateTimeFormat(wordLocale(), { weekday: width, timeZone: UTC }).format(Date.UTC(2026, 1, 1 + weekday)); // 1 Feb 2026 is a Sunday
/** A whole number with grouping: "1,234". */
export const num = (n: number) => Math.round(n).toLocaleString(numberLocale());

const date = (iso: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(wordLocale(), { ...o, timeZone: UTC }).format(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))));
/** "Sep 3" */
export const dayMonth = (iso: string) => date(iso, { month: 'short', day: 'numeric' });
/** "Sep 3, 2026" */
export const dayMonthYear = (iso: string) => date(iso, { month: 'short', day: 'numeric', year: 'numeric' });
/** "Thu, Sep 3" */
export const weekdayDayMonth = (iso: string) => date(iso, { weekday: 'short', month: 'short', day: 'numeric' });
/** "Thursday, September 3" */
export const weekdayDayMonthLong = (iso: string) => date(iso, { weekday: 'long', month: 'long', day: 'numeric' });
/** "September 2026" (or "Sep 2026" when short) for month 1–12. */
export const monthYear = (month: number, year: number, width: 'long' | 'short' = 'long') =>
  date(`${year}-${String(month).padStart(2, '0')}-15`, { month: width, year: 'numeric' });

/** "your clear August and your clear December": items joined with "and". */
export const andList = (items: string[]) => items.join(t('list.and'));
/** "September 7" */
export const dayMonthLong = (iso: string) => date(iso, { month: 'long', day: 'numeric' });
/** "September 7, 2026" */
export const dayMonthYearLong = (iso: string) => date(iso, { month: 'long', day: 'numeric', year: 'numeric' });
/** A moment as a medium date in the reader's own style ("Sep 30, 2026"); English follows the browser's locale. */
export const mediumDate = (d: Date) => d.toLocaleDateString(language() === 'en' ? undefined : language(), { dateStyle: 'medium' });
/** "M" … the one-letter weekday for 0 = Sunday … 6 = Saturday, for calendar headings. */
export const weekdayLetter = (weekday: number) =>
  new Intl.DateTimeFormat(wordLocale(), { weekday: 'narrow', timeZone: UTC }).format(Date.UTC(2026, 1, 1 + weekday));
