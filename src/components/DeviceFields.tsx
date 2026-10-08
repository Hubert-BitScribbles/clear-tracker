import { useEffect, useState } from 'react';
import {
  BROWSER_NAMES, device, detectedDevice, onDeviceChange, OS_NAMES, setDevice, type Browser, type Device, type Os,
} from '../lib/install';

/** The device in use (detected, or as corrected), re-rendering when it changes. */
export function useDevice(): Device {
  const [d, setD] = useState(device);
  useEffect(() => onDeviceChange(() => setD(device())), []);
  return d;
}

// Browsers that exist on each kind of device. On iPhone and iPad every browser
// is Safari's engine inside, so only the names differ.
const BROWSERS_FOR: Record<Os, Browser[]> = {
  iphone: ['safari', 'chrome', 'edge', 'firefox', 'other'],
  ipad: ['safari', 'chrome', 'edge', 'firefox', 'other'],
  android: ['chrome', 'samsung', 'edge', 'firefox', 'other'],
  mac: ['safari', 'chrome', 'edge', 'firefox', 'other'],
  windows: ['edge', 'chrome', 'firefox', 'other'],
  linux: ['chrome', 'firefox', 'edge', 'other'],
  other: ['chrome', 'edge', 'firefox', 'safari', 'other'],
};
const OS_PHRASE: Record<Os, string> = {
  iphone: 'an iPhone', ipad: 'an iPad', android: 'an Android device', mac: 'a Mac', windows: 'a Windows PC',
  linux: 'a Linux computer', other: 'another device',
};
const OS_ORDER: Os[] = ['iphone', 'ipad', 'android', 'mac', 'windows', 'linux', 'other'];
// Capitalise "another …" for the menus; leave iPhone and iPad as they are.
const cap = (s: string) => (s.startsWith('another') ? 'A' + s.slice(1) : s);

/**
 * "iPhone · Chrome — Not right? Change": the detected device and browser, with
 * a way to correct them. Saved on this device only (not in backups).
 */
export function DeviceFields({ intro = 'Looks like you’re using' }: { intro?: string }) {
  const d = useDevice();
  const [open, setOpen] = useState(false);
  const corrected = JSON.stringify(d) !== JSON.stringify(detectedDevice());
  const choose = (next: Device) => setDevice(next);
  return (
    <div className="dv">
      <p className="dv-line" aria-live="polite">
        {intro} <strong>{OS_PHRASE[d.os]}</strong>,
        {' '}in <strong>{BROWSER_NAMES[d.browser]}</strong>.{' '}
        <button type="button" className="dv-change" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Done' : 'Not right? Change'}
        </button>
      </p>
      {open && (
        <div className="dv-fields">
          <label className="st-field">
            <span className="st-field-label">Device</span>
            <select
              className="st-select"
              value={d.os}
              onChange={(e) => {
                const os = e.target.value as Os;
                choose({ os, browser: BROWSERS_FOR[os].includes(d.browser) ? d.browser : BROWSERS_FOR[os][0] });
              }}
            >
              {OS_ORDER.map((o) => <option key={o} value={o}>{cap(OS_NAMES[o])}</option>)}
            </select>
          </label>
          <label className="st-field">
            <span className="st-field-label">Browser</span>
            <select className="st-select" value={d.browser} onChange={(e) => choose({ ...d, browser: e.target.value as Browser })}>
              {BROWSERS_FOR[d.os].map((b) => <option key={b} value={b}>{cap(BROWSER_NAMES[b])}</option>)}
            </select>
          </label>
          {corrected && (
            <button type="button" className="dv-change" onClick={() => setDevice(null)}>Go back to what was detected</button>
          )}
        </div>
      )}
    </div>
  );
}
