// Canada: help lines and links, each with where and when it was checked.
// The words (names, hours, notes) are in the language files, under res.ca.<id>.
// Re-check anything older than six months: python3 checks/stale_resources.py.
// Provinces and territories each have their own addiction line (areas), from the
// Canadian Centre on Substance Use and Addiction's list, confirmed with the
// province where noted. Dates are when the numbers were checked; lines first
// checked 5 October 2026 and re-checked later keep the earlier date.
import type { Country } from './types';

const CCSA = 'ccsa.ca "Addictions Treatment Helplines in Canada"';

export const ca: Country = {
  emergency: { number: '911', source: 'canada.ca "Mental health support: get help" (modified 2026-01-14)', checked: '2026-10-05' },
  talk: [
    { id: '988', call: '9-8-8', text: { to: '988' }, source: '988.ca; canada.ca "Mental health support: get help" (modified 2026-01-14)', checked: '2026-10-05' },
  ],
  drinking: [],
  programmes: [
    { id: 'smart', url: 'https://smartrecovery-canada.ca', source: 'smartrecovery-canada.ca', checked: '2026-10-05' },
    { id: 'dllm', url: 'https://drinklesslivemore.ca/en', urls: { fr: 'https://drinklesslivemore.ca/fr' }, source: 'drinklesslivemore.ca (CCSA); French: « Boire moins, c’est mieux », checked 2026-10-17', checked: '2026-10-05' },
  ],
  drinkGuide: { id: 'drink', url: 'https://www.ccsa.ca/sites/default/files/2025-05/CGAH-Standard-Drinks-Poster-en.pdf', urls: { fr: 'https://www.ccsa.ca/sites/default/files/2025-05/CGAH-Standard-Drinks-Poster-fr.pdf' }, source: 'ccsa.ca "Know Your Standard Drink" (2025 poster, matches Canada’s Guidance on Alcohol and Health)', checked: '2026-10-14' },
  areas: {
    ca_ab: { drinking: [{ id: 'ab', call: '1-866-332-2322', source: CCSA + '; canada.ca', checked: '2026-10-05' }] },
    ca_bc: { drinking: [{ id: 'bc', call: '1-800-663-1441', source: CCSA + '; gov.bc.ca; helpstartshere.gov.bc.ca', checked: '2026-10-05' }] },
    ca_mb: { drinking: [{ id: 'mb', call: '1-855-662-6605', source: CCSA + '; sharedhealthmb.ca', checked: '2026-10-05' }] },
    ca_nb: { drinking: [{ id: 'nb', call: '1-866-355-5550', source: CCSA + '; canada.ca', checked: '2026-10-05' }] },
    ca_nl: { drinking: [{ id: 'nl', call: '1-877-999-7589', source: CCSA, checked: '2026-10-05' }] },
    ca_nt: { drinking: [{ id: 'nt', call: '1-844-259-1793', source: CCSA, checked: '2026-10-05' }] },
    ca_ns: { drinking: [{ id: 'ns', call: '1-888-429-8167', source: CCSA, checked: '2026-10-05' }] },
    ca_nu: { drinking: [{ id: 'nu', call: '1-800-265-3333', source: CCSA, checked: '2026-10-05' }] },
    ca_on: { drinking: [{ id: 'on', call: '1-866-531-2600', text: { to: '247247', word: 'CONNEX' }, source: CCSA + '; ontario.ca; connexontario.ca', checked: '2026-10-05' }] },
    ca_pe: { drinking: [{ id: 'pe', call: '1-833-553-6983', source: CCSA, checked: '2026-10-05' }] },
    ca_qc: { drinking: [{ id: 'qc', call: '1-800-265-2626', source: CCSA + '; aidedrogue.ca; quebec.ca', checked: '2026-10-05' }] },
    ca_sk: { drinking: [{ id: 'sk', call: '8-1-1', source: CCSA, checked: '2026-10-05' }] },
    ca_yt: { drinking: [{ id: 'yt', call: '1-866-456-3838', source: CCSA + '; canada.ca', checked: '2026-10-05' }] },
  },
};
