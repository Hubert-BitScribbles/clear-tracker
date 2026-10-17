// France: help lines and links, each with where and when it was checked.
// The words (names, hours, notes) are in the language files, under res.fr.<id>.
// Re-check anything older than six months: python3 checks/stale_resources.py.
// All of these are in French. 15 is the medical emergency number (SAMU);
// 112 also works everywhere in the EU. The 3114 is answered by nurses and
// psychologists. No national SMART Recovery found; Alcooliques Anonymes'
// phone hours weren't on its site, so none are shown.
import type { Country } from './types';

export const fr: Country = {
  emergency: { number: '15', source: 'service-public.gouv.fr "Numéros d’urgence" (15 Samu; 112 Europe)', checked: '2026-10-17' },
  talk: [
    { id: '3114', call: '3114', source: 'sante.fr "Le numéro national de prévention du suicide"', checked: '2026-10-17' },
  ],
  drinking: [
    { id: 'ais', call: '0 980 980 930', source: 'alcool-info-service.fr "Nous appeler"', checked: '2026-10-17' },
    { id: 'aa', call: '09 69 39 40 20', source: 'alcooliques-anonymes.fr', checked: '2026-10-17' },
  ],
  programmes: [
    { id: 'ais-site', url: 'https://www.alcool-info-service.fr', source: 'alcool-info-service.fr; santepubliquefrance.fr', checked: '2026-10-17' },
    { id: 'near-you', url: 'https://www.alcool-info-service.fr/adresses-utiles', source: 'alcool-info-service.fr "Adresses utiles"', checked: '2026-10-17' },
  ],
  drinkGuide: { id: 'drink', url: 'https://www.alcool-info-service.fr/alcool/boissons-alcoolisees/verre-alcool', source: 'alcool-info-service.fr "Les repères de consommation" (10 g)', checked: '2026-10-17' },
};
