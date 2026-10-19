import { describe, expect, it } from 'vitest';
import { parseRegion, regionFromTimeZone, regionLabel } from '../src/lib/regions';
import { daysLeftInMonth, daysLeftInYear } from '../src/screens/Intention';

describe('Intention: days left (inclusive)', () => {
  it('month', () => {
    expect(daysLeftInMonth('2026-10-05')).toBe(27);
    expect(daysLeftInMonth('2026-10-31')).toBe(1);
    expect(daysLeftInMonth('2028-02-01')).toBe(29); // leap year
    expect(daysLeftInMonth('2026-12-28')).toBe(4);
  });
  it('year', () => {
    expect(daysLeftInYear('2026-12-31')).toBe(1);
    expect(daysLeftInYear('2026-01-01')).toBe(365);
    expect(daysLeftInYear('2028-01-01')).toBe(366);
  });
  it('the same across a clock change (native slipped here)', () => {
    // Monday 9 March 2026 is the day after the spring change in North America.
    expect(daysLeftInMonth('2026-03-09')).toBe(23);
    expect(daysLeftInYear('2026-03-09')).toBe(298);
  });
});

describe('About: region from time zone', () => {
  it.each([
    ['America/Vancouver', 'ca', 'ca_bc'], ['America/Toronto', 'ca', 'ca_on'], ['America/St_Johns', 'ca', 'ca_nl'],
    ['Europe/London', 'uk', undefined], ['Australia/Sydney', 'au', undefined], ['America/New_York', 'us', undefined],
    ['Europe/Berlin', 'de', undefined], ['Europe/Vienna', 'at', undefined], ['Europe/Dublin', 'ie', undefined], ['Pacific/Auckland', 'nz', undefined], ['Asia/Tokyo', 'us', undefined],
  ])('%s → %s', (tz, country, province) => {
    const r = regionFromTimeZone(tz, ['en-CA']);
    expect(r.country).toBe(country);
    if (province) expect(r.province).toBe(province);
  });
  it('Paris → France', () => expect(regionFromTimeZone('Europe/Paris', ['fr-FR']).country).toBe('fr'));
  it('a French-language device on Toronto time starts on Quebec (Montreal reports as Toronto)', () => {
    expect(regionFromTimeZone('America/Toronto', ['fr-CA', 'en-CA']).province).toBe('ca_qc');
    expect(regionFromTimeZone('America/Toronto', ['en-CA', 'fr-CA']).province).toBe('ca_on');
  });
});

describe('UK nations', () => {
  it('a UK region saved before nations existed reads as England', () => {
    const r = parseRegion(JSON.stringify({ country: 'uk', province: 'ca_ab' }), 'Europe/London');
    expect(r.nation).toBe('eng');
    expect(regionLabel(r)).toBe('United Kingdom · England');
  });
  it('a chosen nation is kept, and an unknown one falls back to England', () => {
    expect(regionLabel(parseRegion(JSON.stringify({ country: 'uk', province: 'ca_ab', nation: 'wls' }), 'UTC'))).toBe('United Kingdom · Wales');
    expect(parseRegion(JSON.stringify({ country: 'uk', province: 'ca_ab', nation: 'zz' }), 'UTC').nation).toBe('eng');
  });
  it('other countries are labelled as before', () => {
    expect(regionLabel({ country: 'ca', province: 'ca_bc' })).toBe('Canada · British Columbia');
    expect(regionLabel({ country: 'ie', province: 'ca_ab', nation: 'eng' })).toBe('Ireland');
  });
});
