// Ireland: help lines and links, each with where and when it was checked.
// The words (names, hours, notes) are in the language files, under res.ie.<id>.
// Re-check anything older than six months: python3 checks/stale_resources.py.

import type { Country } from './types';

export const ie: Country = {
  emergency: { number: '112', source: 'gov.ie "How to contact emergency services" (112 or 999, both free)', checked: '2026-10-14' },
  talk: [
    { id: 'samaritans', call: '116 123', source: 'samaritans.org', checked: '2026-10-14' },
  ],
  drinking: [
    { id: 'hse', call: '1800 459 459', source: 'hse.ie "Alcohol supports and services"', checked: '2026-10-14' },
  ],
  programmes: [
    { id: 'smart', url: 'https://smartrecovery.ie', source: 'smartrecovery.ie', checked: '2026-10-14' },
    { id: 'hse-services', url: 'https://www2.hse.ie/living-well/alcohol/alcohol-supports-and-services/', source: 'hse.ie "Alcohol supports and services"', checked: '2026-10-14' },
  ],
  drinkGuide: { id: 'drink', url: 'https://www2.hse.ie/living-well/alcohol/health/improve-your-health/weekly-low-risk-alcohol-guidelines/', source: 'hse.ie "Weekly low-risk alcohol guidelines"', checked: '2026-10-14' },
};
