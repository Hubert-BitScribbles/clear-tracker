import { getSetting } from '../data/database';
import { deviceTimeZone, parseRegion } from './regions';
import { setMoneyCountry } from './savings';

/** Reads the stored region (or the time-zone guess) and sets the currency savings are shown in. */
export async function loadMoneyCountry(): Promise<void> {
  try {
    setMoneyCountry(parseRegion(await getSetting('region', ''), deviceTimeZone()).country);
  } catch {
    // storage unreadable: keep the default; Resources and Settings show the same fallback
  }
}
