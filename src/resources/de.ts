// Germany: help lines and links, each with where and when it was checked.
// The words (names, hours, notes) are in the language files, under res.de.<id>.
// Re-check anything older than six months: python3 checks/stale_resources.py.
// All of these are in German. 112 is the EU-wide emergency number.
import type { Country } from './types';

export const de: Country = {
  emergency: { number: '112', source: 'EU-wide emergency number', checked: '2026-10-14' },
  talk: [
    { id: 'telefonseelsorge', call: '0800 111 0 111', source: 'telefonseelsorge.de', checked: '2026-10-14' },
  ],
  drinking: [
    { id: 'sucht-drogen', call: '01806 313031', source: 'bioeg.de; bundesdrogenbeauftragter.de "Beratungsangebote"', checked: '2026-10-14' },
    { id: 'bioeg', call: '0221 892031', source: 'bioeg.de "Infotelefon zur Suchtvorbeugung"', checked: '2026-10-14' },
  ],
  programmes: [
    { id: 'kenn-dein-limit', url: 'https://www.kenn-dein-limit.de', source: 'kenn-dein-limit.de (BIÖG)', checked: '2026-10-14' },
    { id: 'digisucht', url: 'https://suchtberatung.digital', source: 'suchtberatung.digital', checked: '2026-10-14' },
    { id: 'dhs', url: 'https://www.dhs.de/service/suchthilfeverzeichnis/', source: 'dhs.de "Suchthilfeverzeichnis"', checked: '2026-10-14' },
  ],
  drinkGuide: { id: 'drink', url: 'https://www.kenn-dein-limit.de/haeufige-fragen-zum-thema-alkohol/#c2369', source: 'kenn-dein-limit.de FAQ "Was ist ein Standardglas?"', checked: '2026-10-14' },
};
