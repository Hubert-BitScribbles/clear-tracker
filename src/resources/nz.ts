// New Zealand: help lines and links, each with where and when it was checked.
// The words (names, hours, notes) are in the language files, under res.nz.<id>.
// Re-check anything older than six months: python3 checks/stale_resources.py.

import type { Country } from './types';

export const nz: Country = {
  emergency: { number: '111', source: 'govt.nz "111 emergency service"', checked: '2026-10-15' },
  talk: [
    { id: '1737', call: '1737', text: { to: '1737' }, source: '1737.org.nz (Whakarongorau Aotearoa)', checked: '2026-10-15' },
  ],
  drinking: [
    { id: 'adh', call: '0800 787 797', source: 'alcoholdrughelp.org.nz', checked: '2026-10-15' },
  ],
  programmes: [
    { id: 'smart', url: 'https://smartrecoveryaustralia.com.au/aotearoa-nz', source: 'smartrecoveryaustralia.com.au "Aotearoa NZ"', checked: '2026-10-15' },
    { id: 'adh-site', url: 'https://alcoholdrughelp.org.nz', source: 'alcoholdrughelp.org.nz', checked: '2026-10-15' },
  ],
  drinkGuide: { id: 'drink', url: 'https://alcohol.org.nz/help-advice/standard-drinks', source: 'alcohol.org.nz "Standard drinks"', checked: '2026-10-15' },
};
