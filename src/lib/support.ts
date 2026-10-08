// Feedback and problem reports, by email: no server, nothing leaves until
// the user presses Send in their own mail app, and they see every line first.

import { audioStatus } from './sounds';
import { detectedDevice, device, deviceLabel, isInstalled } from './install';

// CONFIRM BEFORE RELEASE: the address must exist (e.g. Cloudflare Email
// Routing forwarding support@ to an inbox).
export const SUPPORT_EMAIL = 'support@bitscribbles.com';

/** Technical details for a problem report. No health data, ever. */
export async function diagnostics(): Promise<string> {
  let persisted = 'unknown';
  try {
    const p = await navigator.storage?.persisted?.();
    if (p !== undefined) persisted = p ? 'granted' : 'not granted';
  } catch {
    // leave as unknown
  }
  return [
    `App: Clear Tracker ${__APP_VERSION__} (web)`,
    `Browser: ${navigator.userAgent}`,
    `Device: ${deviceLabel()}${JSON.stringify(device()) === JSON.stringify(detectedDevice()) ? ' (detected)' : ` (chosen; detected ${deviceLabel(detectedDevice())})`}`,
    `Installed as an app: ${isInstalled() ? 'yes' : 'no'}`,
    `Persistent storage: ${persisted}`,
    `Screen: ${window.screen.width}×${window.screen.height}, theme ${document.documentElement.dataset.theme ?? '?'}${document.documentElement.dataset.contrast === 'high' ? ', high contrast' : ''}`,
    `Sound: ${audioStatus()}`,
  ].join('\n');
}

export function mailto(subject: string, body: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
