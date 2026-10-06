// Regions: which help lines and programmes Resources shows (and later, currency).
// Region is separate from language: a French speaker in Ontario needs
// Ontario's resources. Stored in settings as 'region'; until the user picks
// one, it's guessed from the device's time zone.

export const COUNTRIES = [
  { key: 'us', label: 'United States' },
  { key: 'uk', label: 'United Kingdom' },
  { key: 'au', label: 'Australia' },
  { key: 'ca', label: 'Canada' },
];
export const PROVINCES = [
  { key: 'ca_ab', label: 'Alberta' }, { key: 'ca_bc', label: 'British Columbia' }, { key: 'ca_mb', label: 'Manitoba' },
  { key: 'ca_nb', label: 'New Brunswick' }, { key: 'ca_nl', label: 'Newfoundland and Labrador' },
  { key: 'ca_nt', label: 'Northwest Territories' }, { key: 'ca_ns', label: 'Nova Scotia' }, { key: 'ca_nu', label: 'Nunavut' },
  { key: 'ca_on', label: 'Ontario' }, { key: 'ca_pe', label: 'Prince Edward Island' }, { key: 'ca_qc', label: 'Quebec' },
  { key: 'ca_sk', label: 'Saskatchewan' }, { key: 'ca_yt', label: 'Yukon' },
];

/** A starting region from the device's time zone; the user can change it. */
export function regionFromTimeZone(tz: string): { country: string; province: string } {
  const ca: Record<string, string> = {
    'America/Vancouver': 'ca_bc', 'America/Edmonton': 'ca_ab', 'America/Regina': 'ca_sk', 'America/Swift_Current': 'ca_sk',
    'America/Winnipeg': 'ca_mb', 'America/Toronto': 'ca_on', 'America/Montreal': 'ca_qc', 'America/Halifax': 'ca_ns',
    'America/Glace_Bay': 'ca_ns', 'America/Moncton': 'ca_nb', 'America/St_Johns': 'ca_nl', 'America/Goose_Bay': 'ca_nl',
    'America/Whitehorse': 'ca_yt', 'America/Dawson': 'ca_yt', 'America/Yellowknife': 'ca_nt', 'America/Inuvik': 'ca_nt',
    'America/Iqaluit': 'ca_nu', 'America/Rankin_Inlet': 'ca_nu', 'America/Cambridge_Bay': 'ca_nu',
  };
  if (ca[tz]) return { country: 'ca', province: ca[tz] };
  if (tz === 'Europe/London') return { country: 'uk', province: 'ca_ab' };
  if (tz.startsWith('Australia/')) return { country: 'au', province: 'ca_ab' };
  return { country: 'us', province: 'ca_ab' };
}


export interface Region {
  country: string; // 'us' | 'uk' | 'au' | 'ca'
  province: string; // used when country is 'ca'
}

export function parseRegion(raw: string, timeZone: string): Region {
  try {
    const r = JSON.parse(raw);
    if (COUNTRIES.some((c) => c.key === r?.country) && PROVINCES.some((p) => p.key === r?.province)) return r;
  } catch {
    // not set yet, or unreadable: fall back to the time zone
  }
  return regionFromTimeZone(timeZone);
}

/** "Canada · British Columbia", "United Kingdom" */
export function regionLabel(r: Region): string {
  const c = COUNTRIES.find((x) => x.key === r.country)?.label ?? '';
  return r.country === 'ca' ? `${c} · ${PROVINCES.find((p) => p.key === r.province)?.label ?? ''}` : c;
}

export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
