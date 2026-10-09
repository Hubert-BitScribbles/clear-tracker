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
}

const CA_TALK: Line[] = [{ name: '9-8-8: Suicide Crisis Helpline', call: '9-8-8', text: { to: '988' }, hours: '24/7, in English and French' }];
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

export function resourcesFor(country: string, province: string): Resources {
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
      };
    case 'uk':
      return {
        emergency: '999',
        talk: [{ name: 'Samaritans', call: '116 123', hours: 'Free from any phone, 24 hours a day' }],
        drinking: [{ name: 'Drinkline', call: '0300 123 1110', hours: 'Weekdays 9am–8pm, weekends 11am–4pm' }],
        programmes: [
          { name: 'UK SMART Recovery', url: 'https://smartrecovery.org.uk', note: 'Free mutual-aid meetings, online and in person.' },
          { name: 'NHS: Alcohol support', url: 'https://www.nhs.uk/live-well/alcohol-advice/alcohol-support/', note: 'Where to get help, from the NHS.' },
        ],
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
      };
    default: // 'ca'
      return { emergency: '911', talk: CA_TALK, drinking: PROVINCIAL[province] ? [PROVINCIAL[province]] : [], programmes: CA_PROGRAMMES };
  }
}

/** "1-866-531-2600" → "18665312600", for tel: links. */
export const dialable = (n: string) => n.replace(/[^\d+]/g, '');
