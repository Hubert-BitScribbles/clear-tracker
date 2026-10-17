// United States: help lines and links, each with where and when it was checked.
// The words (names, hours, notes) are in the language files, under res.us.<id>.
// Re-check anything older than six months: python3 checks/stale_resources.py.

import type { Country } from './types';

export const us: Country = {
  emergency: { number: '911', source: 'national emergency number', checked: '2026-10-05' },
  talk: [
    { id: '988', call: '988', text: { to: '988' }, source: 'samhsa.gov (988)', checked: '2026-10-05' },
  ],
  drinking: [
    { id: 'samhsa', call: '1-800-662-4357', source: 'samhsa.gov "National Helpline"', checked: '2026-10-05' },
  ],
  programmes: [
    { id: 'smart', url: 'https://smartrecovery.org', source: 'smartrecovery.org', checked: '2026-10-05' },
    { id: 'rethinking', url: 'https://rethinkingdrinking.niaaa.nih.gov', source: 'rethinkingdrinking.niaaa.nih.gov', checked: '2026-10-05' },
  ],
  drinkGuide: { id: 'drink', url: 'https://rethinkingdrinking.niaaa.nih.gov/how-much-too-much/whats-standard-drink', source: 'rethinkingdrinking.niaaa.nih.gov "What’s a standard drink?"', checked: '2026-10-14' },
};
