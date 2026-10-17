// United Kingdom: help lines and links, each with where and when it was checked.
// The words (names, hours, notes) are in the language files, under res.uk.<id>.
// Re-check anything older than six months: python3 checks/stale_resources.py.
// England uses the UK-wide lines. Wales, Scotland and Northern Ireland have
// their own (areas). No Northern Ireland-only alcohol line was found, so it keeps
// Drinkline (listed for Northern Ireland by findahelpline.com).
import type { Country } from './types';

const SAMARITANS = { id: 'samaritans', call: '116 123', source: 'samaritans.org', checked: '2026-10-05' };

export const uk: Country = {
  emergency: { number: '999', source: 'national emergency number', checked: '2026-10-05' },
  talk: [
    SAMARITANS,
  ],
  drinking: [
    { id: 'drinkline', call: '0300 123 1110', source: 'nhs.uk "Alcohol support" (Drinkline and its hours)', checked: '2026-10-05' },
  ],
  programmes: [
    { id: 'smart', url: 'https://smartrecovery.org.uk', source: 'smartrecovery.org.uk', checked: '2026-10-05' },
    { id: 'nhs', url: 'https://www.nhs.uk/live-well/alcohol-advice/alcohol-support/', source: 'nhs.uk "Alcohol support"', checked: '2026-10-05' },
  ],
  drinkGuide: { id: 'drink', url: 'https://www.nhs.uk/live-well/alcohol-advice/calculating-alcohol-units/', source: 'nhs.uk "Alcohol units"', checked: '2026-10-14' },
  areas: {
    wls: {
      drinking: [
        { id: 'dan', call: '0808 808 2234', source: 'dan247.org.uk', checked: '2026-10-14' },
      ],
    },
    sct: {
      talk: [
        SAMARITANS,
        { id: 'breathing-space', call: '0800 83 85 87', source: 'breathingspace.scot; nhsinform.scot "Breathing Space helpline"', checked: '2026-10-14' },
      ],
      drinking: [
        { id: 'drinkline-scotland', call: '0800 7 314 314', source: 'NHS Grampian "Alcohol"', checked: '2026-10-14' },
      ],
    },
    nir: {
      talk: [
        SAMARITANS,
        { id: 'lifeline', call: '0808 808 8000', source: 'nidirect.gov.uk "Lifeline"', checked: '2026-10-14' },
      ],
    },
  },
};
