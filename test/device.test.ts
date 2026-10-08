import { describe, expect, it } from 'vitest';
import { detectDevice, installKeepsOwnRecord, linksOpenApp, platform } from '../src/lib/install';

// Real user-agent strings (2025–2026 versions).
const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.122 Mobile/15E148 Safari/604.1',
  iphoneEdge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/140.3485.94 Mobile/15E148 Safari/605.1.15',
  iphoneFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/143.0 Mobile/15E148 Safari/605.1.15',
  iphoneHomeScreen: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  ipadAsMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  androidSamsung: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 15; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  macFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0',
  windowsEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
  linuxChrome: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};

describe('detectDevice', () => {
  it.each([
    ['iphoneSafari', 'iphone', 'safari'],
    ['iphoneChrome', 'iphone', 'chrome'],
    ['iphoneEdge', 'iphone', 'edge'],
    ['iphoneFirefox', 'iphone', 'firefox'],
    ['iphoneHomeScreen', 'iphone', 'safari'],
    ['androidChrome', 'android', 'chrome'],
    ['androidSamsung', 'android', 'samsung'],
    ['androidFirefox', 'android', 'firefox'],
    ['macSafari', 'mac', 'safari'],
    ['macChrome', 'mac', 'chrome'],
    ['macFirefox', 'mac', 'firefox'],
    ['windowsEdge', 'windows', 'edge'],
    ['linuxChrome', 'linux', 'chrome'],
  ] as const)('%s → %s · %s', (k, os, browser) => {
    expect(detectDevice(UA[k])).toEqual({ os, browser });
  });

  it('an iPad asking for the desktop site (a "Mac" with touch) is an iPad', () => {
    expect(detectDevice(UA.ipadAsMac, true)).toEqual({ os: 'ipad', browser: 'safari' });
    expect(detectDevice(UA.ipadAsMac, false)).toEqual({ os: 'mac', browser: 'safari' });
  });
});

describe('what each path means', () => {
  const d = (k: keyof typeof UA) => detectDevice(UA[k]);
  it('a separate installed record: every iPhone browser, and Safari on a Mac', () => {
    expect(['iphoneSafari', 'iphoneChrome', 'iphoneEdge', 'iphoneFirefox', 'macSafari'].map((k) => installKeepsOwnRecord(d(k as never)))).toEqual([true, true, true, true, true]);
    expect(['androidChrome', 'macChrome', 'windowsEdge', 'macFirefox'].map((k) => installKeepsOwnRecord(d(k as never)))).toEqual([false, false, false, false]);
  });
  it('links open the app: Chromium on Android and computers; never iPhone or Safari', () => {
    expect(['androidChrome', 'androidSamsung', 'macChrome', 'windowsEdge'].map((k) => linksOpenApp(d(k as never)))).toEqual([true, true, true, true]);
    expect(['iphoneChrome', 'iphoneSafari', 'macSafari', 'macFirefox', 'androidFirefox'].map((k) => linksOpenApp(d(k as never)))).toEqual([false, false, false, false, false]);
  });
  it('platform keeps its three-way split', () => {
    expect([d('iphoneChrome'), d('androidSamsung'), d('macSafari')].map((x) => platform(x))).toEqual(['ios', 'android', 'other']);
  });
});
