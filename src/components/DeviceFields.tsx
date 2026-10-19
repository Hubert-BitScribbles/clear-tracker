import { useEffect, useState } from 'react';
import {
  BROWSER_NAMES, browserName, device, detectedDevice, onDeviceChange, OS_NAMES, setDevice, type Browser, type Device, type Os,
} from '../lib/install';
import { rich, t, type Key } from '../i18n';

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
const osPhrase = (os: Os) => t(`device.phrase.${os}` as Key);
const OS_ORDER: Os[] = ['iphone', 'ipad', 'android', 'mac', 'windows', 'linux', 'other'];
// Menu names: product names as they are; "Another device" / "Another browser" for the rest.
const osMenuName = (os: Os) => (os === 'other' ? t('device.menuOtherDevice') : OS_NAMES[os]);
const browserMenuName = (b: Browser) => (b === 'other' ? t('device.menuOtherBrowser') : BROWSER_NAMES[b]);

/**
 * "iPhone · Chrome — Not right? Change": the detected device and browser, with
 * a way to correct them. Saved on this device only (not in backups).
 */
export function DeviceFields({ intro = t('device.intro') }: { intro?: string }) {
  const d = useDevice();
  const [open, setOpen] = useState(false);
  const corrected = JSON.stringify(d) !== JSON.stringify(detectedDevice());
  const choose = (next: Device) => setDevice(next);
  return (
    <div className="dv">
      <p className="dv-line" aria-live="polite">
        {rich('device.line', {
          intro, os: osPhrase(d.os), browser: browserName(d.browser),
          b1: (c) => <strong>{c}</strong>, b2: (c) => <strong>{c}</strong>,
        })}{' '}
        <button type="button" className="dv-change" aria-expanded={open} aria-label={open ? undefined : t('device.changeLabel')} onClick={() => setOpen((v) => !v)}>
          {open ? t('device.done') : t('device.change')}
        </button>
      </p>
      {open && (
        <div className="dv-fields">
          <label className="st-field">
            <span className="st-field-label">{t('device.device')}</span>
            <select
              className="st-select"
              value={d.os}
              onChange={(e) => {
                const os = e.target.value as Os;
                choose({ os, browser: BROWSERS_FOR[os].includes(d.browser) ? d.browser : BROWSERS_FOR[os][0] });
              }}
            >
              {OS_ORDER.map((o) => <option key={o} value={o}>{osMenuName(o)}</option>)}
            </select>
          </label>
          <label className="st-field">
            <span className="st-field-label">{t('device.browser')}</span>
            <select className="st-select" value={d.browser} onChange={(e) => choose({ ...d, browser: e.target.value as Browser })}>
              {BROWSERS_FOR[d.os].map((b) => <option key={b} value={b}>{browserMenuName(b)}</option>)}
            </select>
          </label>
          {corrected && (
            <button type="button" className="dv-change" onClick={() => setDevice(null)}>{t('device.goBack')}</button>
          )}
        </div>
      )}
    </div>
  );
}
