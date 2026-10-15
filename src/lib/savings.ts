export const BASELINE_KEY = 'savings_baseline_per_week';
export const PRICE_KEY = 'savings_price_per_drink';

// Wording for the savings estimate. Amounts are ranges because each level is
// a range of drinks; "A lot" has no upper limit, so a period containing one
// can only say "up to" (savings) or "at least" (over baseline).

// Currency follows the region (set in onboarding or Settings). The amounts
// themselves are whatever the user typed as a price; nothing is converted.
// English formatting throughout: €1,234 in Ireland, Germany and Austria (en-IE).
const CURRENCIES: Record<string, { locale: string; currency: string }> = {
  ca: { locale: 'en-CA', currency: 'CAD' },
  us: { locale: 'en-US', currency: 'USD' },
  uk: { locale: 'en-GB', currency: 'GBP' },
  au: { locale: 'en-AU', currency: 'AUD' },
  de: { locale: 'en-IE', currency: 'EUR' },
  at: { locale: 'en-IE', currency: 'EUR' },
  ie: { locale: 'en-IE', currency: 'EUR' },
};
let current = CURRENCIES.ca;

/** Set at start-up and whenever the region changes (see main.tsx, App.tsx). */
export function setMoneyCountry(country: string): void {
  current = CURRENCIES[country] ?? CURRENCIES.ca;
}

/** "$", "£", "€" — for labels such as "Price per drink (€)". */
export function currencySymbol(): string {
  const parts = new Intl.NumberFormat(current.locale, { style: 'currency', currency: current.currency }).formatToParts(0);
  return parts.find((x) => x.type === 'currency')?.value ?? current.currency;
}

export const money = (n: number) =>
  new Intl.NumberFormat(current.locale, { style: 'currency', currency: current.currency, maximumFractionDigits: 0 }).format(
    Math.round(Math.abs(n)),
  );

/** A price, with cents when it has them: $9, $8.50, €8.50. */
export const priceText = (n: number) =>
  new Intl.NumberFormat(current.locale, {
    style: 'currency',
    currency: current.currency,
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);

/**
 * most/least are in dollars (negative = over baseline); least is null when
 * open-ended. weekly = phrase it as a rate ("… saved a week").
 */
export function describeSavings(most: number, least: number | null, weekly = false): string {
  const saved = weekly ? 'saved a week' : 'saved';
  const over = weekly ? 'a week over baseline' : 'over baseline';
  if (least === null) {
    return most >= 0 ? `Up to ${money(most)} ${saved}` : `At least ${money(most)} ${over}`;
  }
  if (least >= 0) return range(least, most, saved);
  if (most <= 0) return range(-most, -least, over);
  return `Between ${money(least)} over baseline and ${money(most)} saved${weekly ? ', a week' : ''}`;
}

function range(low: number, high: number, what: string): string {
  const a = money(low);
  const b = money(high);
  return a === b ? `About ${a} ${what}` : `About ${a}–${b} ${what}`;
}
