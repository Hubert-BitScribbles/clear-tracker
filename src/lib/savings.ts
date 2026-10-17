import { language, locale, setFormatCountry, t } from '../i18n';

export const BASELINE_KEY = 'savings_baseline_per_week';
export const PRICE_KEY = 'savings_price_per_drink';

// Wording for the savings estimate. Amounts are ranges because each level is
// a range of drinks; "A lot" has no upper limit, so a period containing one
// can only say "up to" (savings) or "at least" (over baseline).

// Currency follows the region (set in onboarding or Settings). The amounts
// themselves are whatever the user typed as a price; nothing is converted.
// In English, €1,234 in Ireland, Germany and Austria (en-IE); in German, the
// language's own style (1.234 €) whatever the currency.
const CURRENCIES: Record<string, { locale: string; currency: string }> = {
  ca: { locale: 'en-CA', currency: 'CAD' },
  us: { locale: 'en-US', currency: 'USD' },
  uk: { locale: 'en-GB', currency: 'GBP' },
  au: { locale: 'en-AU', currency: 'AUD' },
  de: { locale: 'en-IE', currency: 'EUR' },
  at: { locale: 'en-IE', currency: 'EUR' },
  fr: { locale: 'en-IE', currency: 'EUR' },
  ie: { locale: 'en-IE', currency: 'EUR' },
  nz: { locale: 'en-NZ', currency: 'NZD' },
};
let current = CURRENCIES.ca;

/** Set at start-up and whenever the region changes (see main.tsx, App.tsx). */
export function setMoneyCountry(country: string): void {
  current = CURRENCIES[country] ?? CURRENCIES.ca;
  setFormatCountry(country); // dates follow the region too (de-AT: "Jänner")
}
const moneyLocale = () => (language() === 'en' ? current.locale : locale());

/**
 * A typed amount as a number: "8.50", "8,50" (a comma decimal, as German and
 * Austrian keypads give), "€4", "$ 9", "1.234,50" or "1,234.50". NaN if not a number.
 */
export function parseAmount(text: string): number {
  let s = text.trim().replace(/[^\d.,-]/g, '');
  if (s === '') return NaN;
  const comma = s.lastIndexOf(',');
  const dot = s.lastIndexOf('.');
  if (comma > dot) s = s.replace(/\./g, '').replace(',', '.'); // comma is the decimal mark
  else s = s.replace(/,/g, ''); // dot (or nothing) is the decimal mark
  return s.split('.').length > 2 ? NaN : Number(s);
}

/** "$", "£", "€" — for labels such as "Price per drink (€)". */
export function currencySymbol(): string {
  const parts = new Intl.NumberFormat(moneyLocale(), { style: 'currency', currency: current.currency }).formatToParts(0);
  return parts.find((x) => x.type === 'currency')?.value ?? current.currency;
}

export const money = (n: number) =>
  new Intl.NumberFormat(moneyLocale(), { style: 'currency', currency: current.currency, maximumFractionDigits: 0 }).format(
    Math.round(Math.abs(n)),
  );

/** A price, with cents when it has them: $9, $8.50, €8.50. */
export const priceText = (n: number) =>
  new Intl.NumberFormat(moneyLocale(), {
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
  const saved = weekly ? t('money.savedWeek') : t('money.saved');
  const over = weekly ? t('money.overWeek') : t('money.over');
  if (least === null) {
    return most >= 0 ? t('money.upTo', { amount: money(most), what: saved }) : t('money.atLeast', { amount: money(most), what: over });
  }
  if (least >= 0) return range(least, most, saved);
  if (most <= 0) return range(-most, -least, over);
  return t(weekly ? 'money.betweenWeek' : 'money.between', { low: money(least), high: money(most) });
}

function range(low: number, high: number, what: string): string {
  const a = money(low);
  const b = money(high);
  return a === b ? t('money.about', { amount: a, what }) : t('money.aboutRange', { low: a, high: b, what });
}
