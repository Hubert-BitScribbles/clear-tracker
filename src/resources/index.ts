import { at } from './at';
import { au } from './au';
import { ca } from './ca';
import { de } from './de';
import { ie } from './ie';
import { nz } from './nz';
import { uk } from './uk';
import { us } from './us';
import type { Country } from './types';

export type { Checked, Country, LineData, LinkData } from './types';
export const COUNTRY_RESOURCES: Record<string, Country> = { ca, us, uk, au, de, at, ie, nz };
