// Support resources by region, for the Resources page. The numbers and links,
// each with where and when it was checked, are in src/resources/<country>.ts;
// the words are in the language files (res.*). Re-check before each release:
// python3 checks/stale_resources.py lists anything older than six months.

import { hasText, language, t, type Key } from '../i18n';
import { monthYear } from '../i18n/format';
import { COUNTRY_RESOURCES, type Checked, type LineData, type LinkData } from '../resources';

// Stopping suddenly after heavy daily drinking can bring dangerous withdrawal
// (seizures, delirium). Shown in Resources, Help (intention) and Challenges.
// Checked 16 October 2026: nhs.uk "Alcohol misuse: treatment" ("It can be very
// dangerous to stop drinking suddenly if you're dependent on alcohol");
// healthlinkbc.ca "Alcohol withdrawal" (talk to your doctor before you stop);
// rethinkingdrinking.niaaa.nih.gov "Cut down or quit" (withdrawal can be
// life-threatening; seek medical help); kenn-dein-limit.de FAQ (delirium tremens).
// Prompted by Alcohol Change UK's "Get help now" page, via a UK tester.
// The caution's wording is resources.caution in the language files.

export interface Line {
  name: string;
  call?: string; // shown as written; dialled digits only
  text?: { to: string; word?: string }; // "Text CONNEX to 247247"
  hours?: string;
  note?: string;
}
export interface Link {
  name: string;
  url: string;
  note: string;
}
export interface Resources {
  emergency: string; // "911"
  talk: Line[]; // someone to talk to, any time
  drinking: Line[]; // help with drinking, in this region
  programmes: Link[];
  drinkGuide?: Link; // what counts as one drink here; none where there's no clear official page
}

const text = (key: string) => (hasText(key) ? t(key as Key) : undefined);

function line(cc: string, l: LineData): Line {
  const k = `res.${cc}.${l.id}`;
  const out: Line = { name: t(`${k}.name` as Key) };
  if (l.call) out.call = l.call;
  if (l.text) out.text = l.text;
  const hours = text(`${k}.hours`);
  if (hours) out.hours = hours;
  const note = text(`${k}.note`);
  if (note) out.note = note;
  return out;
}
const link = (cc: string, l: LinkData): Link => ({ name: t(`res.${cc}.${l.id}.name` as Key), url: l.urls?.[language()] ?? l.url, note: t(`res.${cc}.${l.id}.note` as Key) });

/** The country's data and the part that applies: a Canadian province, a UK nation. Unknown countries get Canada's. */
function pick(country: string, province: string, nation: string) {
  const cc = COUNTRY_RESOURCES[country] ? country : 'ca';
  const c = COUNTRY_RESOURCES[cc];
  const area = c.areas?.[cc === 'ca' ? province : nation];
  return { cc, c, talk: area?.talk ?? c.talk, drinking: area?.drinking ?? c.drinking };
}

export function resourcesFor(country: string, province: string, nation = 'eng'): Resources {
  const { cc, c, talk, drinking } = pick(country, province, nation);
  const r: Resources = {
    emergency: c.emergency.number,
    talk: talk.map((l) => line(cc, l)),
    drinking: drinking.map((l) => line(cc, l)),
    programmes: c.programmes.map((l) => link(cc, l)),
  };
  if (c.drinkGuide) r.drinkGuide = link(cc, c.drinkGuide);
  return r;
}

/** "October 2026": when the oldest of the entries shown for this region was checked. */
export function checkedFor(country: string, province: string, nation = 'eng'): string {
  const { c, talk, drinking } = pick(country, province, nation);
  const all: Checked[] = [c.emergency, ...talk, ...drinking, ...c.programmes, ...(c.drinkGuide ? [c.drinkGuide] : [])];
  const oldest = all.map((x) => x.checked).sort()[0];
  return monthYear(Number(oldest.slice(5, 7)), Number(oldest.slice(0, 4)));
}

/** "1-866-531-2600" → "18665312600", for tel: links. */
export const dialable = (n: string) => n.replace(/[^\d+]/g, '');
