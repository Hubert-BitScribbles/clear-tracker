import { describe, expect, it } from 'vitest';
import { regionFromTimeZone } from '../src/lib/regions';
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
    ['Asia/Tokyo', 'us', undefined],
  ])('%s → %s', (tz, country, province) => {
    const r = regionFromTimeZone(tz);
    expect(r.country).toBe(country);
    if (province) expect(r.province).toBe(province);
  });
});
