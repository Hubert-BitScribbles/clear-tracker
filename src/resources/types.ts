// The shape of a country's resources file. Every entry says where it was
// checked (source: a site and page, in a few words) and when (checked: an ISO
// date), so each can be re-checked on its own; checks/stale_resources.py lists
// the ones older than six months. The words people see — names, hours, notes —
// are in the language files, under res.<country>.<id>.

export interface Checked {
  source: string;
  checked: string; // 'YYYY-MM-DD'
}
export interface LineData extends Checked {
  id: string;
  call?: string; // shown as written; dialled digits only
  text?: { to: string; word?: string }; // "Text CONNEX to 247247"
}
export interface LinkData extends Checked {
  id: string;
  url: string;
}
export interface Country {
  emergency: Checked & { number: string };
  talk: LineData[]; // someone to talk to, any time
  drinking: LineData[]; // help with drinking
  programmes: LinkData[];
  drinkGuide?: LinkData; // what counts as one drink; none where there's no clear official page
  /** Lines for part of the country (a Canadian province, a UK nation), replacing talk or drinking there. */
  areas?: Record<string, { talk?: LineData[]; drinking?: LineData[] }>;
}
