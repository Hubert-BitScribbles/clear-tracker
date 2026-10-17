// Regions: which help lines and programmes Resources shows, and the currency
// savings are shown in (lib/savings.ts).
// Region is separate from language: a French speaker in Ontario needs
// Ontario's resources. Stored in settings as 'region'; until the user picks
// one, it's guessed from the device's time zone.

import { t, type Key } from '../i18n';

// Names come from the language files (country.us, province.ca_bc, nation.sct …).
const named = (prefix: string, keys: string[]) =>
  keys.map((key) => ({ key, get label() { return t(`${prefix}.${key}` as Key); } }));

export const COUNTRIES = named('country', ['us', 'uk', 'au', 'ca', 'de', 'at', 'fr', 'ie', 'nz']);
export const PROVINCES = named('province', [
  'ca_ab', 'ca_bc', 'ca_mb', 'ca_nb', 'ca_nl', 'ca_nt', 'ca_ns', 'ca_nu', 'ca_on', 'ca_pe', 'ca_qc', 'ca_sk', 'ca_yt',
]);
/** The UK's nations, for the lines that differ (Wales, Scotland, Northern Ireland). */
export const UK_NATIONS = named('nation', ['eng', 'sct', 'wls', 'nir']);

/** A starting region from the device's time zone; the user can change it. */
export function regionFromTimeZone(tz: string): Region {
  const ca: Record<string, string> = {
    'America/Vancouver': 'ca_bc', 'America/Edmonton': 'ca_ab', 'America/Regina': 'ca_sk', 'America/Swift_Current': 'ca_sk',
    'America/Winnipeg': 'ca_mb', 'America/Toronto': 'ca_on', 'America/Montreal': 'ca_qc', 'America/Halifax': 'ca_ns',
    'America/Glace_Bay': 'ca_ns', 'America/Moncton': 'ca_nb', 'America/St_Johns': 'ca_nl', 'America/Goose_Bay': 'ca_nl',
    'America/Whitehorse': 'ca_yt', 'America/Dawson': 'ca_yt', 'America/Yellowknife': 'ca_nt', 'America/Inuvik': 'ca_nt',
    'America/Iqaluit': 'ca_nu', 'America/Rankin_Inlet': 'ca_nu', 'America/Cambridge_Bay': 'ca_nu',
  };
  if (ca[tz]) return { country: 'ca', province: ca[tz] };
  if (tz === 'Europe/London') return { country: 'uk', province: 'ca_ab', nation: 'eng' }; // the nation can't be told from the time zone
  if (tz === 'Europe/Belfast') return { country: 'uk', province: 'ca_ab', nation: 'nir' };
  if (tz.startsWith('Australia/')) return { country: 'au', province: 'ca_ab' };
  if (tz === 'Europe/Berlin' || tz === 'Europe/Busingen') return { country: 'de', province: 'ca_ab' };
  if (tz === 'Europe/Vienna') return { country: 'at', province: 'ca_ab' };
  if (tz === 'Europe/Paris') return { country: 'fr', province: 'ca_ab' };
  if (tz === 'Europe/Dublin') return { country: 'ie', province: 'ca_ab' };
  if (tz === 'Pacific/Auckland' || tz === 'Pacific/Chatham') return { country: 'nz', province: 'ca_ab' };
  return { country: 'us', province: 'ca_ab' };
}


export interface Region {
  country: string; // 'us' | 'uk' | 'au' | 'ca' | 'de' | 'at' | 'fr' | 'ie' | 'nz'
  province: string; // used when country is 'ca'
  nation?: string; // used when country is 'uk'; missing (saved before 1.1) means England
}

export function parseRegion(raw: string, timeZone: string): Region {
  try {
    const r = JSON.parse(raw);
    if (COUNTRIES.some((c) => c.key === r?.country) && PROVINCES.some((p) => p.key === r?.province)) {
      return { ...r, nation: UK_NATIONS.some((n) => n.key === r.nation) ? r.nation : 'eng' };
    }
  } catch {
    // not set yet, or unreadable: fall back to the time zone
  }
  return regionFromTimeZone(timeZone);
}

/** "Canada · British Columbia", "United Kingdom · Wales", "Ireland" */
export function regionLabel(r: Region): string {
  const c = COUNTRIES.find((x) => x.key === r.country)?.label ?? '';
  if (r.country === 'ca') return t('region.label', { country: c, part: PROVINCES.find((p) => p.key === r.province)?.label ?? '' });
  if (r.country === 'uk') return t('region.label', { country: c, part: UK_NATIONS.find((n) => n.key === (r.nation ?? 'eng'))?.label ?? t('nation.eng') });
  return c;
}

export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
