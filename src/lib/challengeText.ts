import type { MonthChallenge, SpanStatus } from '../data/challenges';

export const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = MONTH_LONG.map((m) => m.slice(0, 3));

/** "Clear January 2027" */
export const monthTitle = (ym: string) => `Clear ${MONTH_LONG[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
/** "your clear January", for the baseline and momentum notes */
export const monthPhrase = (ym: string) => `your clear ${MONTH_LONG[Number(ym.slice(5, 7)) - 1]}`;

/** Where a chosen month stands, in a few neutral words. */
export function monthStatusText(c: MonthChallenge): string {
  switch (c.state) {
    case 'upcoming': return `Starts ${SHORT[Number(c.starts.slice(5, 7)) - 1]} ${Number(c.starts.slice(8, 10))}`;
    case 'under-way': return `Under way · day ${c.day} of ${c.days}${c.toLog ? ` · ${c.toLog} day${c.toLog === 1 ? '' : 's'} to log` : ''}`;
    case 'to-log': return `Over · ${c.toLog} day${c.toLog === 1 ? '' : 's'} still to log`;
    case 'earned': return `Reached ${SHORT[Number(c.date.slice(5, 7)) - 1]} ${Number(c.date.slice(8, 10))}`;
    case 'ended': return 'Ended';
  }
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** "Fri, Oct 2" */
export const dayText = (iso: string) => `${WD[new Date(`${iso}T00:00:00Z`).getUTCDay()]}, ${SHORT[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
/** "Oct 2–4" or "Sep 28 – Oct 4" */
export function spanText(first: string, last: string): string {
  const a = `${SHORT[Number(first.slice(5, 7)) - 1]} ${Number(first.slice(8, 10))}`;
  return first.slice(5, 7) === last.slice(5, 7) ? `${a}–${Number(last.slice(8, 10))}` : `${a} – ${SHORT[Number(last.slice(5, 7)) - 1]} ${Number(last.slice(8, 10))}`;
}

/** "This weekend, Oct 2–4: under way · 1 day to log" — where the current weekend/week stands. */
export function spanStatusText(s: SpanStatus, kind: 'weekend' | 'week'): string {
  const span = spanText(s.first, s.last);
  switch (s.state) {
    case 'upcoming': return `Next: ${span}`;
    case 'under-way': return `This ${kind}, ${span}: under way${s.toLog ? ` · ${s.toLog} day${s.toLog === 1 ? '' : 's'} to log` : ''}`;
    case 'earned': return `This ${kind}, ${span}: earned`;
    case 'not-this-time': return `This ${kind}, ${span}: not this time — the next one counts`;
  }
}
