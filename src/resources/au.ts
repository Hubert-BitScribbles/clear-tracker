// Australia: help lines and links, each with where and when it was checked.
// The words (names, hours, notes) are in the language files, under res.au.<id>.
// Re-check anything older than six months: python3 checks/stale_resources.py.

import type { Country } from './types';

export const au: Country = {
  emergency: { number: '000', source: 'national emergency number', checked: '2026-10-05' },
  talk: [
    { id: 'lifeline', call: '13 11 14', text: { to: '0477131114' }, source: 'lifeline.org.au', checked: '2026-10-05' },
  ],
  drinking: [
    { id: 'hotline', call: '1800 250 015', source: 'health.gov.au "National Alcohol and Other Drug Hotline"', checked: '2026-10-05' },
  ],
  programmes: [
    { id: 'smart', url: 'https://smartrecoveryaustralia.com.au', source: 'smartrecoveryaustralia.com.au', checked: '2026-10-05' },
    { id: 'drug-help', url: 'https://www.health.gov.au/our-work/drug-help', source: 'health.gov.au "Drug Help"', checked: '2026-10-05' },
  ],
  drinkGuide: { id: 'drink', url: 'https://www.health.gov.au/topics/alcohol/about-alcohol/standard-drinks-guide', source: 'health.gov.au "Standard drinks guide"', checked: '2026-10-14' },
};
