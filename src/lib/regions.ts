// Regions: which help lines and programmes Resources shows, and the currency
// savings are shown in (lib/savings.ts).
// Region is separate from language: a French speaker in Ontario needs
// Ontario's resources. Stored in settings as 'region'; until the user picks
// one, it's guessed from the device's time zone.

export const COUNTRIES = [
  { key: 'us', label: 'United States' },
  { key: 'uk', label: 'United Kingdom' },
  { key: 'au', label: 'Australia' },
  { key: 'ca', label: 'Canada' },
  { key: 'de', label: 'Germany' },
  { key: 'at', label: 'Austria' },
  { key: 'ie', label: 'Ireland' },
];
export const PROVINCES = [
  { key: 'ca_ab', label: 'Alberta' }, { key: 'ca_bc', label: 'British Columbia' }, { key: 'ca_mb', label: 'Manitoba' },
  { key: 'ca_nb', label: 'New Brunswick' }, { key: 'ca_nl', label: 'Newfoundland and Labrador' },
  { key: 'ca_nt', label: 'Northwest Territories' }, { key: 'ca_ns', label: 'Nova Scotia' }, { key: 'ca_nu', label: 'Nunavut' },
  { key: 'ca_on', label: 'Ontario' }, { key: 'ca_pe', label: 'Prince Edward Island' }, { key: 'ca_qc', label: 'Quebec' },
  { key: 'ca_sk', label: 'Saskatchewan' }, { key: 'ca_yt', label: 'Yukon' },
];
/** The UK's nations, for the lines that differ (Wales, Scotland, Northern Ireland). */
export const UK_NATIONS = [
  { key: 'eng', label: 'England' }, { key: 'sct', label: 'Scotland' },
  { key: 'wls', label: 'Wales' }, { key: 'nir', label: 'Northern Ireland' },
];

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
  if (tz === 'Europe/Dublin') return { country: 'ie', province: 'ca_ab' };
  return { country: 'us', province: 'ca_ab' };
}


export interface Region {
  country: string; // 'us' | 'uk' | 'au' | 'ca' | 'de' | 'at' | 'ie'
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
  if (r.country === 'ca') return `${c} · ${PROVINCES.find((p) => p.key === r.province)?.label ?? ''}`;
  if (r.country === 'uk') return `${c} · ${UK_NATIONS.find((n) => n.key === (r.nation ?? 'eng'))?.label ?? 'England'}`;
  return c;
}

export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
