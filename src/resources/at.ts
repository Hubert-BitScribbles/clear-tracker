// Austria: help lines and links, each with where and when it was checked.
// The words (names, hours, notes) are in the language files, under res.at.<id>.
// Re-check anything older than six months: python3 checks/stale_resources.py.
// All of these are in German. 112 is the EU-wide emergency number (Austria also
// has 144 for an ambulance). There's no national alcohol helpline: AA and 1450
// stand in. No official page on what counts as one drink was found (the 20 g
// "Standardglas" appears in ministry reports and an industry site), so none yet.
import type { Country } from './types';

export const at: Country = {
  emergency: { number: '112', source: 'EU-wide emergency number', checked: '2026-10-14' },
  talk: [
    { id: 'telefonseelsorge', call: '142', source: 'telefonseelsorge.at', checked: '2026-10-14' },
  ],
  drinking: [
    { id: 'aa', call: '01 799 55 99', source: 'anonyme-alkoholiker.at', checked: '2026-10-14' },
    { id: '1450', call: '1450', source: '1450.at', checked: '2026-10-14' },
  ],
  programmes: [
    { id: 'suchthilfekompass', url: 'https://suchthilfekompass.goeg.at', source: 'sozialministerium.gv.at "Alkohol"; suchthilfekompass.goeg.at', checked: '2026-10-14' },
    { id: 'gesundheitsportal', url: 'https://www.gesundheit.gv.at/krankheiten/sucht/alkoholismus.html', source: 'gesundheit.gv.at', checked: '2026-10-14' },
  ],
};
