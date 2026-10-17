import { getSetting } from '../data/database';
import { pickLanguage, setLanguage } from '../i18n';

/** The Language setting: 'auto' (the device's language, if we have it) or a language code. */
export const LANGUAGE_KEY = 'language';

/** Reads the Language setting and switches to it, loading its words. English if anything fails. */
export async function loadLanguage(): Promise<void> {
  let chosen = 'auto';
  try {
    chosen = await getSetting(LANGUAGE_KEY, 'auto');
  } catch {
    // storage unreadable: follow the device
  }
  const device = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  try {
    await setLanguage(pickLanguage(chosen, device));
  } catch {
    await setLanguage('en'); // the language file couldn't load (offline before it was cached)
  }
}
