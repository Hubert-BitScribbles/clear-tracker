import { describe, expect, it } from 'vitest';
import { COUNTRIES, PROVINCES } from '../src/lib/regions';
import { dialable, resourcesFor } from '../src/lib/resources';

describe('resources', () => {
  const regions = [
    ...COUNTRIES.filter((c) => c.key !== 'ca').map((c) => [c.key, 'ca_ab']),
    ...PROVINCES.map((p) => ['ca', p.key]),
  ];
  it.each(regions)('%s %s: emergency, someone to talk to, help with drinking, programmes', (country, province) => {
    const r = resourcesFor(country, province);
    expect(r.emergency).toMatch(/^\d{3}$/);
    expect(r.talk.length).toBeGreaterThan(0);
    expect(r.drinking.length).toBe(1);
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
  it('dialable keeps digits only', () => {
    expect(dialable('1-866-531-2600')).toBe('18665312600');
    expect(dialable('13 11 14')).toBe('131114');
  });
});
