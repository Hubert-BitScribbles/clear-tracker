import { afterEach, describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import de from '../src/i18n/de.json';
import { language, pickLanguage, setFormatCountry, setLanguage, t } from '../src/i18n';
import { dayMonth, monthName, num } from '../src/i18n/format';
import { spanText } from '../src/lib/challengeText';
import { money, setMoneyCountry } from '../src/lib/savings';
import { resourcesFor } from '../src/lib/resources';
import { articles as helpEn } from '../src/help/en';
import { articles as helpDe } from '../src/help/de';
import { readFileSync } from 'fs';

const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
const tags = (s: string) => [...s.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort();

// German that needs a value English doesn't (word order differs), and passes it in code.
const EXTRA_VARS: Record<string, string[]> = { 'challenge.spanSameMonth': ['startDay', 'end'] };

describe('German text (de.json)', () => {
  const E = en as Record<string, string>;
  const D = de as Record<string, string>;
  it('has every English key, and no others', () => {
    expect(Object.keys(D).sort()).toEqual(Object.keys(E).sort());
  });
  it('every line has the same blanks and markup as English', () => {
    const wrong: string[] = [];
    for (const k of Object.keys(E)) {
      const de = placeholders(D[k]);
      const ok = EXTRA_VARS[k]
        ? de.every((p) => [...placeholders(E[k]), ...EXTRA_VARS[k]].includes(p)) // its own word order
        : de.join() === placeholders(E[k]).join();
      if (!ok || tags(D[k]).join() !== tags(E[k]).join()) wrong.push(k);
    }
    expect(wrong).toEqual([]);
  });
  it('says Sie, not du', () => {
    const du = /\b(du|dich|dir|dein|deine|deinen|deinem|deiner)\b/i;
    // "Kenn dein Limit" is a campaign's name.
    const hits = Object.entries(D).filter(([, v]) => du.test(v.replace(/Kenn dein Limit/g, '')));
    expect(hits).toEqual([]);
  });
});

describe('switching to German', () => {
  afterEach(async () => {
    await setLanguage('en');
    setMoneyCountry('ca');
  });
  it('picks German from the setting or the device, else English', () => {
    expect(pickLanguage('de', ['en-CA'])).toBe('de');
    expect(pickLanguage('auto', ['de-AT', 'en'])).toBe('de');
    expect(pickLanguage('auto', ['fr-FR', 'de-DE'])).toBe('de');
    expect(pickLanguage('auto', ['fr-FR'])).toBe('en');
    expect(pickLanguage('en', ['de-DE'])).toBe('en');
  });
  it('words, plurals, dates, numbers and money follow the language', async () => {
    await setLanguage('de');
    expect(language()).toBe('de');
    expect(t('checkin.clearDays', { count: 1 })).toBe('1 alkoholfreier Tag');
    expect(t('checkin.clearDays', { count: 3 })).toBe('3 alkoholfreie Tage');
    setMoneyCountry('de');
    expect(monthName(1)).toBe('Januar');
    expect(num(1234)).toBe('1.234');
    expect(money(12).replace(/\s/g, ' ')).toBe('12 €');
    setMoneyCountry('at');
    expect(monthName(1)).toBe('Jänner');
  });
  it('a weekend in one month reads "2.–4. Okt." in German, "Oct 2–4" in English', async () => {
    expect(spanText('2026-10-02', '2026-10-04')).toBe('Oct 2–4');
    await setLanguage('de');
    setFormatCountry('de');
    expect(spanText('2026-10-02', '2026-10-04')).toBe(`2.–${dayMonth('2026-10-04')}`);
    expect(spanText('2026-10-02', '2026-10-04')).toMatch(/^2\.–4\. Okt/);
  });
  it('help lines get German hours, and keep their numbers', async () => {
    await setLanguage('de');
    const r = resourcesFor('de', 'ca_ab');
    expect(r.talk[0]).toMatchObject({ name: 'TelefonSeelsorge', call: '0800 111 0 111', hours: 'Kostenlos, rund um die Uhr' });
    expect(resourcesFor('ca', 'ca_on').drinking[0]).toMatchObject({ call: '1-866-531-2600', hours: 'Rund um die Uhr' });
  });
});

describe('German Help and privacy page', () => {
  const devices = [
    { os: 'iphone', browser: 'safari' }, { os: 'android', browser: 'chrome' }, { os: 'mac', browser: 'safari' },
    { os: 'windows', browser: 'edge' }, { os: 'linux', browser: 'firefox' },
  ] as const;
  it.each(devices)('the same articles, in the same order, on $os with $browser', (d) => {
    const P = d.os === 'iphone' ? 'ios' : d.os === 'android' ? 'android' : 'other';
    const ids = (a: { id: string }[]) => a.map((x) => x.id);
    expect(ids(helpDe({ d, P }))).toEqual(ids(helpEn({ d, P })));
  });
  it('the German privacy page has the same sections as the English one', () => {
    const count = (f: string) => (readFileSync(`public/${f}`, 'utf8').match(/<section/g) ?? []).length;
    expect(count('privacy-de.html')).toBe(count('privacy.html'));
  });
});
