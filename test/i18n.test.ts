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
    expect(pickLanguage('auto', ['it-IT', 'de-DE'])).toBe('de');
    expect(pickLanguage('auto', ['it-IT'])).toBe('en');
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

describe('French text (fr.json, and Quebec’s lines in fr-CA.json)', async () => {
  const E = en as Record<string, string>;
  const F = (await import('../src/i18n/fr.json')).default as Record<string, string>;
  const Q = (await import('../src/i18n/fr-CA.json')).default as Record<string, string>;
  it('has every English key, and no others; Quebec only overrides French lines', () => {
    expect(Object.keys(F).sort()).toEqual(Object.keys(E).sort());
    for (const k of Object.keys(Q)) expect(k in F, k).toBe(true);
  });
  it('every line has the same blanks and markup as English', () => {
    const wrong: string[] = [];
    for (const [file, words] of [['fr', F], ['fr-CA', Q]] as const) {
      for (const k of Object.keys(words)) {
        const fr = placeholders(words[k]);
        const ok = EXTRA_VARS[k] ? fr.every((p) => [...placeholders(E[k]), ...EXTRA_VARS[k]].includes(p)) : fr.join() === placeholders(E[k]).join();
        if (!ok || tags(words[k]).join() !== tags(E[k]).join()) wrong.push(`${file} ${k}`);
      }
    }
    expect(wrong).toEqual([]);
  });
  it('says vous, not tu', () => {
    const tu = /(?<!\p{L})(tu|toi|ton|ta|tes|te|t’)(?!\p{L})/iu; // letters with accents count as letters
    const hits = Object.entries({ ...F, ...Q }).filter(([, v]) => tu.test(v));
    expect(hits).toEqual([]);
  });
});

describe('switching to French', () => {
  afterEach(async () => {
    await setLanguage('en');
    setMoneyCountry('ca');
  });
  it('France: French words, dates, numbers and euros', async () => {
    await setLanguage('fr');
    setMoneyCountry('fr');
    expect(pickLanguage('auto', ['fr-CA'])).toBe('fr');
    expect(t('checkin.clearDays', { count: 1 })).toBe('1 jour sans alcool');
    expect(t('checkin.clearDays', { count: 3 })).toBe('3 jours sans alcool');
    expect(monthName(8)).toBe('août');
    expect(num(1234).replace(/\s/g, ' ')).toBe('1 234');
    expect(money(12).replace(/\s/g, ' ')).toBe('12 €');
    expect(t('ms.clearWeekend1')).toBe('Un week-end sans alcool');
    expect(resourcesFor('fr', 'ca_ab')).toMatchObject({ emergency: '15', talk: [{ name: '3114 : numéro national de prévention du suicide'.replace(' :', ' :') }] });
  });
  it('Quebec: its own words over France’s, Canadian dollars, French links where Canada has them', async () => {
    await setLanguage('fr');
    setMoneyCountry('ca');
    expect(t('ms.clearWeekend1')).toBe('Une fin de semaine sans alcool');
    expect(t('checkin.clearDays', { count: 3 })).toBe('3 jours sans alcool'); // not in fr-CA: France’s line
    expect(money(12).replace(/\s/g, ' ')).toBe('12 $');
    const r = resourcesFor('ca', 'ca_qc');
    expect(r.drinking[0].name).toBe('Drogue : aide et référence');
    expect(r.programmes.find((p) => p.url.includes('drinklesslivemore'))?.url).toBe('https://drinklesslivemore.ca/fr');
    expect(r.drinkGuide?.url).toMatch(/Poster-fr\.pdf$/);
  });
  it('French Help has the same articles as English', async () => {
    const { articles: helpFr } = await import('../src/help/fr');
    const d = { os: 'android', browser: 'chrome' } as const;
    expect(helpFr({ d, P: 'android' }).map((a) => a.id)).toEqual(helpEn({ d, P: 'android' }).map((a) => a.id));
    const count = (f: string) => (readFileSync(`public/${f}`, 'utf8').match(/<section/g) ?? []).length;
    expect(count('privacy-fr.html')).toBe(count('privacy.html'));
  });
});
