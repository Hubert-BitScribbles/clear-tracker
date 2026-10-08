// Report wording. Kept plain and neutral: it may be read by a therapist.

/**
 * Drinks as a whole number — a fraction of a drink means little. Rounds .5
 * and under down, over .5 up (Hugh's rule, 8 October 2026): 8.5 → 8, 8.6 → 9.
 */
export function wholeDrinks(n: number): number {
  const f = Math.floor(n + 1e-9);
  return n - f > 0.5 + 1e-9 ? f + 1 : f;
}

/** "About 9–12 drinks a week", "About 9 or more…" when open-ended. */
export function drinksText(least: number, most: number | null): string {
  const a = wholeDrinks(least);
  if (most === null) return `About ${a} or more drinks a week`;
  const b = wholeDrinks(most);
  return a === b ? `About ${a} drink${a === 1 ? '' : 's'} a week` : `About ${a}–${b} drinks a week`;
}

/** "4 more clear days than July", "2 fewer…", "The same number of…". No judgement either way. */
export function comparisonText(now: number, before: number, beforeLabel: string): string {
  const d = now - before;
  if (d === 0) return `The same number of clear days as ${beforeLabel}`;
  const n = Math.abs(d);
  return `${n} ${d > 0 ? 'more' : 'fewer'} clear day${n === 1 ? '' : 's'} than ${beforeLabel}`;
}

/** "About 1–2 drinks on a typical Friday" (open-ended: "1 or more"; from none: "Up to 1"). Whole drinks. */
export function typicalDayText(least: number, most: number | null, dayName: string): string {
  const a = wholeDrinks(least);
  if (most === null) return `About ${a} or more drinks on a typical ${dayName}`;
  const b = wholeDrinks(most);
  if (a === b) return a === 0 ? `No drinks on a typical ${dayName}` : `About ${a} drink${a === 1 ? '' : 's'} on a typical ${dayName}`;
  if (a === 0) return `Up to ${b} drink${b === 1 ? '' : 's'} on a typical ${dayName}`;
  return `About ${a}–${b} drinks on a typical ${dayName}`;
}
