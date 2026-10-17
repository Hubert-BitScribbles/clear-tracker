import { describe, expect, it } from 'vitest';
import { COUNTRIES, PROVINCES } from '../src/lib/regions';
import { checkedFor, dialable, resourcesFor } from '../src/lib/resources';
import { COUNTRY_RESOURCES, type Checked } from '../src/resources';
import { hasText, t } from '../src/i18n';

describe('resources', () => {
  const regions = [
    ...COUNTRIES.filter((c) => c.key !== 'ca').map((c) => [c.key, 'ca_ab']),
    ...PROVINCES.map((p) => ['ca', p.key]),
  ];
  it.each(regions)('%s %s: emergency, someone to talk to, help with drinking, programmes', (country, province) => {
    const r = resourcesFor(country, province);
    expect(r.emergency).toMatch(/^\d{2,3}$/); // France's medical emergency number is 15
    expect(r.talk.length).toBeGreaterThan(0);
    expect(r.drinking.length).toBeGreaterThanOrEqual(1);
    expect(r.programmes.length).toBeGreaterThan(0);
    for (const l of [...r.talk, ...r.drinking]) {
      expect(l.call && dialable(l.call).length).toBeGreaterThanOrEqual(3);
    }
    for (const p of r.programmes) expect(p.url).toMatch(/^https:\/\//);
  });
  it('every Canadian province and territory has its own line', () => {
    const names = PROVINCES.map((p) => resourcesFor('ca', p.key).drinking[0].name);
    expect(new Set(names).size).toBe(PROVINCES.length);
  });
  it('Canada includes 9-8-8, by call and text', () => {
    expect(resourcesFor('ca', 'ca_bc').talk[0]).toMatchObject({ call: '9-8-8', text: { to: '988' } });
  });
  it('Germany and Austria: 112, TelefonSeelsorge, and help with drinking', () => {
    expect(resourcesFor('de', 'ca_ab')).toMatchObject({ emergency: '112', talk: [{ call: '0800 111 0 111' }] });
    expect(resourcesFor('at', 'ca_ab')).toMatchObject({ emergency: '112', talk: [{ call: '142' }] });
    expect(dialable('01806 313031')).toBe('01806313031');
  });
  it('UK nations: Wales, Scotland and Northern Ireland get their own lines; England keeps Drinkline', () => {
    expect(resourcesFor('uk', 'ca_ab').drinking[0].name).toBe('Drinkline');
    expect(resourcesFor('uk', 'ca_ab', 'eng').drinking[0].name).toBe('Drinkline');
    expect(resourcesFor('uk', 'ca_ab', 'wls').drinking[0].call).toBe('0808 808 2234');
    expect(resourcesFor('uk', 'ca_ab', 'sct').talk.map((l) => l.name)).toEqual(['Samaritans', 'Breathing Space']);
    expect(resourcesFor('uk', 'ca_ab', 'sct').drinking[0].call).toBe('0800 7 314 314');
    expect(resourcesFor('uk', 'ca_ab', 'nir').talk.map((l) => l.name)).toEqual(['Samaritans', 'Lifeline']);
    for (const n of ['eng', 'sct', 'wls', 'nir']) expect(resourcesFor('uk', 'ca_ab', n).emergency).toBe('999');
  });
  it('New Zealand: 111, 1737 by call and text, the Alcohol Drug Helpline', () => {
    expect(resourcesFor('nz', 'ca_ab')).toMatchObject({ emergency: '111', talk: [{ call: '1737', text: { to: '1737' } }], drinking: [{ call: '0800 787 797' }] });
  });
  it('France: 15, the 3114, Alcool Info Service', () => {
    expect(resourcesFor('fr', 'ca_ab')).toMatchObject({ emergency: '15', talk: [{ call: '3114' }], drinking: [{ call: '0 980 980 930' }, { call: '09 69 39 40 20' }] });
    expect(resourcesFor('fr', 'ca_ab').drinkGuide?.url).toMatch(/alcool-info-service\.fr/);
  });
  it('Ireland: 112, Samaritans, the HSE helpline', () => {
    expect(resourcesFor('ie', 'ca_ab')).toMatchObject({ emergency: '112', talk: [{ call: '116 123' }], drinking: [{ call: '1800 459 459' }] });
  });
  it('what counts as one drink: an official guide for each country except Austria (none found)', () => {
    for (const [c, p] of [['ca', 'ca_on'], ['us', 'ca_ab'], ['uk', 'ca_ab'], ['au', 'ca_ab'], ['de', 'ca_ab'], ['ie', 'ca_ab'], ['nz', 'ca_ab']]) {
      expect(resourcesFor(c, p).drinkGuide?.url).toMatch(/^https:\/\//);
    }
    expect(resourcesFor('at', 'ca_ab').drinkGuide).toBeUndefined();
  });
  it('the stopping-suddenly caution is plain and points to help', () => {
    expect(t('resources.caution')).toMatch(/stopping suddenly can be dangerous/);
    expect(t('resources.caution')).toMatch(/doctor/);
  });
  it.each(Object.entries(COUNTRY_RESOURCES))('%s: every entry says where and when it was checked, and has its words', (cc, c) => {
    const lines = [...c.talk, ...c.drinking, ...Object.values(c.areas ?? {}).flatMap((a) => [...(a.talk ?? []), ...(a.drinking ?? [])])];
    const links = [...c.programmes, ...(c.drinkGuide ? [c.drinkGuide] : [])];
    const all: Checked[] = [c.emergency, ...lines, ...links];
    for (const e of all) {
      expect(e.source.length).toBeGreaterThan(3);
      expect(e.checked).toMatch(/^20\d\d-[01]\d-[0-3]\d$/);
      expect(Number.isNaN(Date.parse(e.checked))).toBe(false);
    }
    // A line and a link can't share an id: they'd share words.
    const ids = new Map<string, unknown>();
    for (const e of [...lines, ...links]) {
      expect(ids.get(e.id) ?? e, `${cc}: ${e.id} is used twice`).toBe(e);
      ids.set(e.id, e);
      expect(hasText(`res.${cc}.${e.id}.name`), `res.${cc}.${e.id}.name`).toBe(true);
    }
    for (const l of links) expect(hasText(`res.${cc}.${l.id}.note`)).toBe(true);
  });
  it('the "numbers checked" date is when the oldest entry shown was checked', () => {
    expect(checkedFor('ca', 'ca_bc')).toBe('October 2026');
    expect(checkedFor('xx', 'ca_bc')).toBe('October 2026');
  });
  it('dialable keeps digits only', () => {
    expect(dialable('1-866-531-2600')).toBe('18665312600');
    expect(dialable('13 11 14')).toBe('131114');
  });
});
