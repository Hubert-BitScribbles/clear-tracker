// Support resources by region, for the Resources page.
//
// CHECKED 5 October 2026 against official sources (national lines re-checked 9 October 2026) (re-check before each release):
// - Canada, crisis: 988.ca; canada.ca "Mental health support: get help" (modified 2026-01-14).
// - Canada, provincial/territorial addiction lines: Canadian Centre on Substance Use and
//   Addiction, "Addictions Treatment Helplines in Canada" (ccsa.ca); confirmed
//   individually for AB/NB/YT (canada.ca), BC (gov.bc.ca, helpstartshere.gov.bc.ca),
//   QC (aidedrogue.ca, quebec.ca), ON (ontario.ca, connexontario.ca), MB (sharedhealthmb.ca).
// - US: samhsa.gov (National Helpline; 988).
// - UK: nhs.uk "Alcohol support" (Drinkline and its hours); samaritans.org.
// - Australia: health.gov.au (National Alcohol and Other Drug Hotline); lifeline.org.au.
// - Programmes: smartrecovery-canada.ca, smartrecovery.org.uk, smartrecoveryaustralia.com.au,
//   smartrecovery.org (US); drinklesslivemore.ca (CCSA); rethinkingdrinking.niaaa.nih.gov;
//   nhs.uk; health.gov.au "Drug Help".
// - Germany (checked 14 October 2026): telefonseelsorge.de; bioeg.de (Sucht & Drogen
//   Hotline: daily 8am–midnight, €0.20 a call; Infotelefon zur Suchtvorbeugung and
//   its hours); bundesdrogenbeauftragter.de "Beratungsangebote"; kenn-dein-limit.de
//   (BIÖG); suchtberatung.digital (DigiSucht); dhs.de Suchthilfeverzeichnis.
// - Austria (checked 14 October 2026): telefonseelsorge.at (142); 1450.at;
//   anonyme-alkoholiker.at; sozialministerium.gv.at "Alkohol" (Suchthilfekompass,
//   gesundheit.gv.at). There's no national alcohol helpline: AA and 1450 stand in.
// - What counts as one drink (checked 14 October 2026): ccsa.ca "Know Your Standard
//   Drink" (2025 poster, matches Canada's Guidance on Alcohol and Health);
//   rethinkingdrinking.niaaa.nih.gov "What's a standard drink?"; nhs.uk "Alcohol
//   units"; health.gov.au "Standard drinks guide"; kenn-dein-limit.de FAQ "Was ist
//   ein Standardglas?". Austria: no official consumer page found (the 20 g
//   "Standardglas" appears in ministry reports and an industry site), so none yet.
//   Only a link: the app doesn't count drink sizes.
// - UK nations (checked 14 October 2026): Wales — dan247.org.uk (DAN 24/7, free,
//   bilingual, day and night). Scotland — breathingspace.scot and nhsinform.scot
//   (Breathing Space, free, Mon–Thu 6pm–2am, Fri 6pm–Mon 6am); NHS Grampian "Alcohol"
//   (Drinkline Scotland 0800 7 314 314, 8am–11pm daily). Northern Ireland —
//   nidirect.gov.uk (Lifeline, freephone, 24 hours); no NI-only alcohol line found, so
//   it keeps Drinkline (listed for NI by findahelpline.com). England: as the UK above.
// - Ireland (checked 14 October 2026): gov.ie "How to contact emergency services" (112 or
//   999, both free); samaritans.org (116 123, free, 24/7, UK and Ireland); hse.ie
//   "Alcohol supports and services" (HSE Drugs and Alcohol Helpline, freephone, weekdays
//   9:30am–5:30pm, helpline@hse.ie); smartrecovery.ie (SMART Recovery Ireland CLG);
//   hse.ie "Weekly low-risk alcohol guidelines" (standard drink: 10 g).
// - Germany and Austria: 112 is the EU-wide emergency number (Austria also has 144
//   for an ambulance). All of these are in German.

export const CHECKED = 'October 2026';

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

const CA_TALK: Line[] = [{ name: '9-8-8: Suicide Crisis Helpline', call: '9-8-8', text: { to: '988' }, hours: '24/7, in English and French' }];
const CA_DRINK: Link = { name: 'Know your standard drink', url: 'https://www.ccsa.ca/sites/default/files/2025-05/CGAH-Standard-Drinks-Poster-en.pdf', note: 'Canada’s standard drink, from the Canadian Centre on Substance Use and Addiction (a one-page PDF).' };
const CA_PROGRAMMES: Link[] = [
  { name: 'SMART Recovery Canada', url: 'https://smartrecovery-canada.ca', note: 'Free 4-Point Program meetings, online and in person. Doesn’t require abstinence; works alongside other supports.' },
  { name: 'Drink Less Live More', url: 'https://drinklesslivemore.ca/en', note: 'Canada’s guidance on alcohol and health, from the Canadian Centre on Substance Use and Addiction.' },
];

const PROVINCIAL: Record<string, Line> = {
  ca_ab: { name: 'Alberta Addiction Helpline', call: '1-866-332-2322', hours: '24/7' },
  ca_bc: { name: 'Alcohol and Drug Information and Referral Service', call: '1-800-663-1441', note: 'Lower Mainland: 604-660-9382' },
  ca_mb: { name: 'Manitoba Addictions Helpline', call: '1-855-662-6605', hours: '24 hours', note: 'Adults; youth services: 1-877-710-3999' },
  ca_nb: { name: 'Addiction and Mental Health Helpline', call: '1-866-355-5550', hours: '24/7, in English and French' },
  ca_nl: { name: 'Addictions Services', call: '1-877-999-7589' },
  ca_nt: { name: 'NWT Health and Social Services', call: '1-844-259-1793' },
  ca_ns: { name: 'Mental Health and Addictions Services', call: '1-888-429-8167' },
  ca_nu: { name: 'Kamatsiaqtut Help Line', call: '1-800-265-3333', note: 'Also 867-979-3333' },
  ca_on: { name: 'ConnexOntario', call: '1-866-531-2600', text: { to: '247247', word: 'CONNEX' }, hours: '24/7' },
  ca_pe: { name: 'Addiction Services, Health PEI', call: '1-833-553-6983' },
  ca_qc: { name: 'Drugs: Help and Referral', call: '1-800-265-2626', hours: '24/7, in French and English', note: 'Montreal area: 514-527-2626' },
  ca_sk: { name: 'HealthLine', call: '8-1-1', note: 'Or 1-877-800-0002' },
  ca_yt: { name: 'Mental Wellness and Substance Use Services', call: '1-866-456-3838', hours: 'Weekdays 8:30am–4:30pm' },
};

const SAMARITANS: Line = { name: 'Samaritans', call: '116 123', hours: 'Free from any phone, 24 hours a day' };
const DRINKLINE: Line = { name: 'Drinkline', call: '0300 123 1110', hours: 'Weekdays 9am–8pm, weekends 11am–4pm' };
const UK_LINES: Record<string, { talk: Line[]; drinking: Line[] }> = {
  eng: { talk: [SAMARITANS], drinking: [DRINKLINE] },
  wls: { talk: [SAMARITANS], drinking: [{ name: 'DAN 24/7: Wales Drug and Alcohol Helpline', call: '0808 808 2234', hours: 'Free, day and night', note: 'In English, or in Welsh on request' }] },
  sct: {
    talk: [SAMARITANS, { name: 'Breathing Space', call: '0800 83 85 87', hours: 'Free; Mon–Thu 6pm–2am, and from 6pm Friday to 6am Monday', note: 'Also webchat, same hours' }],
    drinking: [{ name: 'Drinkline Scotland', call: '0800 7 314 314', hours: 'Free, 8am–11pm daily' }],
  },
  nir: { talk: [SAMARITANS, { name: 'Lifeline', call: '0808 808 8000', hours: 'Freephone, 24 hours a day', note: 'Northern Ireland’s crisis line' }], drinking: [DRINKLINE] },
};

export function resourcesFor(country: string, province: string, nation = 'eng'): Resources {
  switch (country) {
    case 'us':
      return {
        emergency: '911',
        talk: [{ name: '988 Suicide & Crisis Lifeline', call: '988', text: { to: '988' }, hours: '24/7' }],
        drinking: [{ name: 'SAMHSA National Helpline', call: '1-800-662-4357', hours: 'Free, confidential, 24/7, in English and Spanish' }],
        programmes: [
          { name: 'SMART Recovery', url: 'https://smartrecovery.org', note: 'Free 4-Point Program meetings, online and in person.' },
          { name: 'Rethinking Drinking', url: 'https://rethinkingdrinking.niaaa.nih.gov', note: 'Evidence-based information and tools for cutting down or quitting, from the U.S. National Institutes of Health.' },
        ],
        drinkGuide: { name: 'What’s a standard drink?', url: 'https://rethinkingdrinking.niaaa.nih.gov/how-much-too-much/whats-standard-drink', note: 'The U.S. standard drink, with examples, from the National Institutes of Health.' },
      };
    case 'uk':
      return {
        emergency: '999',
        ...(UK_LINES[nation] ?? UK_LINES.eng),
        programmes: [
          { name: 'UK SMART Recovery', url: 'https://smartrecovery.org.uk', note: 'Free mutual-aid meetings, online and in person.' },
          { name: 'NHS: Alcohol support', url: 'https://www.nhs.uk/live-well/alcohol-advice/alcohol-support/', note: 'Where to get help, from the NHS.' },
        ],
        drinkGuide: { name: 'Alcohol units', url: 'https://www.nhs.uk/live-well/alcohol-advice/calculating-alcohol-units/', note: 'What a unit is and how many are in common drinks, from the NHS.' },
      };
    case 'au':
      return {
        emergency: '000',
        talk: [{ name: 'Lifeline', call: '13 11 14', text: { to: '0477131114' }, hours: '24/7' }],
        drinking: [{ name: 'National Alcohol and Other Drug Hotline', call: '1800 250 015', hours: '24/7 (from South Australia: 8:30am–10pm)', note: 'Connects you to your state or territory’s service' }],
        programmes: [
          { name: 'SMART Recovery Australia', url: 'https://smartrecoveryaustralia.com.au', note: 'Free 4-Point Program meetings, online and in person.' },
          { name: 'Drug Help', url: 'https://www.health.gov.au/our-work/drug-help', note: 'Information and support options, from the Australian Government.' },
        ],
        drinkGuide: { name: 'Standard drinks guide', url: 'https://www.health.gov.au/topics/alcohol/about-alcohol/standard-drinks-guide', note: 'The Australian standard drink, with common serves, from the Australian Government.' },
      };
    case 'de':
      return {
        emergency: '112',
        talk: [{ name: 'TelefonSeelsorge', call: '0800 111 0 111', hours: 'Free, 24/7, in German', note: 'Also 0800 111 0 222 or 116 123; chat and email at telefonseelsorge.de' }],
        drinking: [
          { name: 'Sucht & Drogen Hotline', call: '01806 313031', hours: 'Daily 8am–midnight, in German', note: '€0.20 a call' },
          { name: 'BIÖG addiction prevention line', call: '0221 892031', hours: 'Mon–Thu 10am–10pm, Fri–Sun 10am–6pm, in German', note: 'Points you to counselling near you' },
        ],
        programmes: [
          { name: 'Kenn dein Limit', url: 'https://www.kenn-dein-limit.de', note: 'Alcohol and health, a self-test and free online counselling, from the Federal Institute for Public Health (BIÖG). In German.' },
          { name: 'DigiSucht', url: 'https://suchtberatung.digital', note: 'Free, anonymous online counselling with local addiction counsellors, for you or someone close to you. In German.' },
          { name: 'Find counselling near you', url: 'https://www.dhs.de/service/suchthilfeverzeichnis/', note: 'Free, confidential addiction counselling services across Germany, from the German Centre for Addiction Issues (DHS).' },
        ],
        drinkGuide: { name: 'Was ist ein Standardglas?', url: 'https://www.kenn-dein-limit.de/haeufige-fragen-zum-thema-alkohol/#c2369', note: 'The German “standard glass”, with examples, from Kenn dein Limit (BIÖG). In German.' },
      };
    case 'at':
      return {
        emergency: '112',
        talk: [{ name: 'TelefonSeelsorge', call: '142', hours: 'Free, 24/7, in German', note: 'Chat daily 4–11pm at telefonseelsorge.at' }],
        drinking: [
          { name: 'Alcoholics Anonymous Austria', call: '01 799 55 99', hours: 'Any time, in German', note: 'Also online meetings at anonyme-alkoholiker.at' },
          { name: 'Health advice line 1450', call: '1450', hours: '24/7, in German', note: 'Nurses advise where to get care' },
        ],
        programmes: [
          { name: 'Suchthilfekompass', url: 'https://suchthilfekompass.goeg.at', note: 'Find counselling and treatment near you, by region and type of help, from Gesundheit Österreich. In German.' },
          { name: 'Gesundheitsportal: Alcohol dependence', url: 'https://www.gesundheit.gv.at/krankheiten/sucht/alkoholismus.html', note: 'Signs, treatment and support for you and your family, from Austria’s public health portal. In German.' },
        ],
      };
    case 'ie':
      return {
        emergency: '112',
        talk: [{ name: 'Samaritans', call: '116 123', hours: 'Free, 24/7' }],
        drinking: [{ name: 'HSE Drugs and Alcohol Helpline', call: '1800 459 459', hours: 'Freephone, weekdays 9:30am–5:30pm', note: 'Or email helpline@hse.ie' }],
        programmes: [
          { name: 'SMART Recovery Ireland', url: 'https://smartrecovery.ie', note: 'Free mutual-aid meetings, online and in person.' },
          { name: 'HSE: Alcohol supports and services', url: 'https://www2.hse.ie/living-well/alcohol/alcohol-supports-and-services/', note: 'Where to get help, including services in your area, from the HSE.' },
        ],
        drinkGuide: { name: 'Standard drinks in Ireland', url: 'https://www2.hse.ie/living-well/alcohol/health/improve-your-health/weekly-low-risk-alcohol-guidelines/', note: 'What a standard drink is, with examples, on the HSE’s low-risk guidelines page.' },
      };
    default: // 'ca'
      return { emergency: '911', talk: CA_TALK, drinking: PROVINCIAL[province] ? [PROVINCIAL[province]] : [], programmes: CA_PROGRAMMES, drinkGuide: CA_DRINK };
  }
}

/** "1-866-531-2600" → "18665312600", for tel: links. */
export const dialable = (n: string) => n.replace(/[^\d+]/g, '');
