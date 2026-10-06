// Report wording. Kept plain and neutral: it may be read by a therapist.

/** "About 9–12 drinks a week", "About 9 or more…" when open-ended. */
export function drinksText(least: number, most: number | null): string {
  const a = Math.round(least);
  if (most === null) return `About ${a} or more drinks a week`;
  const b = Math.round(most);
  return a === b ? `About ${a} drink${a === 1 ? '' : 's'} a week` : `About ${a}–${b} drinks a week`;
}

/** "4 more clear days than July", "2 fewer…", "The same number of…". No judgement either way. */
export function comparisonText(now: number, before: number, beforeLabel: string): string {
  const d = now - before;
  if (d === 0) return `The same number of clear days as ${beforeLabel}`;
  const n = Math.abs(d);
  return `${n} ${d > 0 ? 'more' : 'fewer'} clear day${n === 1 ? '' : 's'} than ${beforeLabel}`;
}

const oneDecimal = (n: number) => (Math.round(n * 10) / 10).toString();

/** "About 1.2–1.8 drinks on a typical Friday" (open-ended: "1.2 or more"). */
export function typicalDayText(least: number, most: number | null, dayName: string): string {
  const a = oneDecimal(least);
  if (most === null) return `About ${a} or more drinks on a typical ${dayName}`;
  const b = oneDecimal(most);
  if (a === b) return a === '0' ? `No drinks on a typical ${dayName}` : `About ${a} drink${a === '1' ? '' : 's'} on a typical ${dayName}`;
  return `About ${a}–${b} drinks on a typical ${dayName}`;
}
