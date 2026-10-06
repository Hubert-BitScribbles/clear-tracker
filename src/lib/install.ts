// Installing to the Home Screen.
//
// iPhone/iPad Safari has no install button for websites: the user taps
// Share → Add to Home Screen. Chrome, Edge and Android fire a
// "beforeinstallprompt" event that lets the page offer its own Install
// button. That event fires once, early, so it's captured at startup.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();

export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the browser's banner
    deferred = e as InstallEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export const canPromptInstall = () => deferred !== null;
export function onInstallAvailability(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  return outcome === 'accepted';
}

/** Running as an installed app (from the Home Screen), not in a browser tab. */
export function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone or iPad (iPadOS reports itself as a Mac, but with touch). */
export function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Ask the browser not to clear this site's storage. Must run during a tap.
 * WebKit decides by its own rules and hasn't said whether this lifts the
 * seven-day limit, so it's worth asking but not relying on.
 */
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    return (await navigator.storage?.persist?.()) ?? null;
  } catch {
    return null;
  }
}

/** Android (Chrome, or another browser on Android). */
export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Which device guidance to show. iPhone/iPad and Android differ in how to
 * install, where backups go, sounds and reminders; 'other' (a computer) gets
 * the general wording.
 */
export type Platform = 'ios' | 'android' | 'other';
export const platform = (): Platform => (isIos() ? 'ios' : isAndroid() ? 'android' : 'other');
