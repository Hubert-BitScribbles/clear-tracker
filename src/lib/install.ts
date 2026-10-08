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

// ---- Which device and browser ------------------------------------------------
//
// Guidance differs by path (see web-app-platform-notes in the Project):
// - iPhone/iPad, any browser (all WebKit): a Home Screen copy keeps its own
//   record; links always open a browser tab.
// - Mac, Safari: a Dock app keeps its own record too.
// - Chrome, Edge (and other Chromium) on computers and Android: the installed
//   app and the browser share one record.
// Detected from the user agent; the user can correct it (saved on this device).

export type Os = 'iphone' | 'ipad' | 'android' | 'mac' | 'windows' | 'linux' | 'other';
export type Browser = 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other';
export interface Device { os: Os; browser: Browser }

export const OS_NAMES: Record<Os, string> = {
  iphone: 'iPhone', ipad: 'iPad', android: 'Android', mac: 'Mac', windows: 'Windows', linux: 'Linux', other: 'another device',
};
export const BROWSER_NAMES: Record<Browser, string> = {
  safari: 'Safari', chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox', samsung: 'Samsung Internet', other: 'another browser',
};

/** Reads the user agent. touchMac: a "Mac" with touch is an iPad (iPadOS asks for desktop sites). */
export function detectDevice(ua: string, touchMac = false): Device {
  let os: Os = 'other';
  if (/iPhone|iPod/.test(ua)) os = 'iphone';
  else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touchMac)) os = 'ipad';
  else if (/Android/i.test(ua)) os = 'android';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'mac';
  else if (/Windows/.test(ua)) os = 'windows';
  else if (/Linux|CrOS/.test(ua)) os = 'linux';

  let browser: Browser = 'other';
  if (/EdgiOS|EdgA|Edg\//.test(ua)) browser = 'edge';
  else if (/SamsungBrowser/.test(ua)) browser = 'samsung';
  else if (/FxiOS|Firefox\//.test(ua)) browser = 'firefox';
  else if (/CriOS|Chrome\/|Chromium\//.test(ua)) browser = 'chrome'; // Brave and Opera look (and act) like Chrome
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'safari';
  else if (os === 'iphone' || os === 'ipad') browser = 'safari'; // a Home Screen app's user agent drops "Safari/"
  return { os, browser };
}

const DEVICE_KEY = 'ct-device';
const OSES = Object.keys(OS_NAMES) as Os[];
const BROWSERS = Object.keys(BROWSER_NAMES) as Browser[];

export function detectedDevice(): Device {
  return detectDevice(navigator.userAgent, navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** The device in use: what the user chose, or what was detected. */
export function device(): Device {
  try {
    const saved = JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null');
    if (saved && OSES.includes(saved.os) && BROWSERS.includes(saved.browser)) return saved;
  } catch {
    // fall through to detection
  }
  return detectedDevice();
}

/** Corrects the detection on this device (null goes back to detecting). */
export function setDevice(d: Device | null): void {
  try {
    if (d) localStorage.setItem(DEVICE_KEY, JSON.stringify(d));
    else localStorage.removeItem(DEVICE_KEY);
  } catch {
    // storage unavailable: the choice lasts until the page closes
  }
  deviceListeners.forEach((l) => l());
}
const deviceListeners = new Set<() => void>();
export function onDeviceChange(cb: () => void): () => void {
  deviceListeners.add(cb);
  return () => deviceListeners.delete(cb);
}

export const deviceLabel = (d: Device = device()) => `${OS_NAMES[d.os]} · ${BROWSER_NAMES[d.browser]}`;

/** iPhone or iPad. */
export const isIos = (d: Device = device()) => d.os === 'iphone' || d.os === 'ipad';
/** Android (Chrome, or another browser on Android). */
export const isAndroid = (d: Device = device()) => d.os === 'android';
/** A computer: Mac, Windows, Linux or other. */
export const isComputer = (d: Device = device()) => !isIos(d) && !isAndroid(d);
/** Chrome, Edge or Samsung Internet: the installed app shares the browser's record. */
export const isChromium = (d: Device = device()) => d.browser === 'chrome' || d.browser === 'edge' || d.browser === 'samsung';
/**
 * Does an installed copy keep its own record, separate from the browser?
 * iPhone/iPad (any browser) and Safari on a Mac.
 */
export const installKeepsOwnRecord = (d: Device = device()) => isIos(d) || (d.os === 'mac' && d.browser === 'safari');
/**
 * Does a link to the app (in Reminders, Calendar…) open the installed app?
 * Android with Chrome, Edge or Samsung Internet; Chrome or Edge on a computer
 * (Chrome 134+, if it's the default browser). Never on iPhone/iPad.
 */
export const linksOpenApp = (d: Device = device()) => !installKeepsOwnRecord(d) && isChromium(d);

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

/**
 * Which device guidance to show. iPhone/iPad and Android differ in how to
 * install, where backups go, sounds and reminders; 'other' (a computer) gets
 * the general wording.
 */
export type Platform = 'ios' | 'android' | 'other';
export const platform = (d: Device = device()): Platform => (isIos(d) ? 'ios' : isAndroid(d) ? 'android' : 'other');
