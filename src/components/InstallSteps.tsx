import type { ReactNode } from 'react';
import { BROWSER_NAMES, installKeepsOwnRecord, isAndroid, isIos, type Device } from '../lib/install';

const B = { b: (c: ReactNode) => <strong>{c}</strong>, icon: (c: ReactNode) => <span aria-hidden="true">{c}</span> };
const r = (key: Key, vars: Record<string, string> = {}) => <>{rich(key, { ...B, ...vars })}</>;
import { rich, t, type Key } from '../i18n';

// How to install Clear Tracker on each path, shared by onboarding and Help.
// See web-app-platform-notes in the Project for why the paths differ.

export interface InstallGuide {
  /** "Add it to your Home Screen", "Add it to your Dock", "Install it as an app"… */
  heading: string;
  /** Where it goes: "Home Screen", "Dock", "app list". */
  place: string;
  /** Why install, for this path. */
  why: string;
  /** Steps; empty when the browser's own Install button is offered instead. */
  steps: ReactNode[];
  /** After installing: is it the same record, and where to open it from. */
  note: string;
  /** Can this path install at all? (Firefox on a computer can't.) */
  canInstall: boolean;
}

const ios = (d: Device): ReactNode[] => {
  const share =
    d.browser === 'safari' ? (
      r('install.ios.shareSafari')
    ) : d.browser === 'chrome' ? (
      r('install.ios.shareChrome')
    ) : (
      r('install.ios.shareOther', { browser: d.browser === 'other' ? t('install.ios.theBrowser') : BROWSER_NAMES[d.browser] })
    );
  return [
    share,
    r('install.ios.add'),
    r('install.ios.open'),
  ];
};

export function installGuide(d: Device, browserOffersInstall: boolean): InstallGuide {
  const browser = d.browser === 'other' ? t('install.thisBrowser') : BROWSER_NAMES[d.browser];
  const clearer = d.browser === 'safari' ? t('install.clearerSafari') : d.os === 'ipad' ? t('install.clearerIpad') : t('install.clearerIphone');
  const ownRecordWhy = t('install.ownRecordWhy', { clearer });
  const sharedWhy = t('install.sharedWhy');

  if (isIos(d)) {
    return {
      heading: t('install.headingHomeScreen'),
      place: t('install.placeHomeScreen'),
      why: ownRecordWhy,
      steps: ios(d),
      note: t('install.iosNote', { browser }),
      canInstall: true,
    };
  }
  if (d.os === 'mac' && d.browser === 'safari') {
    return {
      heading: t('install.headingDock'),
      place: t('install.placeDock'),
      why: ownRecordWhy,
      steps: [r('install.mac.add'), r('install.mac.open')],
      note: t('install.macNote'),
      canInstall: true,
    };
  }
  if (d.browser === 'firefox' && !isAndroid(d)) {
    return {
      heading: t('install.headingHandy'),
      place: t('install.placeBookmarks'),
      why: t('install.firefoxWhy'),
      steps: [r('install.firefox.bookmark', { key: d.os === 'mac' ? '⌘' : 'Ctrl' }), r('install.firefox.other')],
      note: t('install.firefoxNote'),
      canInstall: false,
    };
  }
  const place = isAndroid(d) ? t('install.placeHomeScreen') : t('install.placeAppList');
  const steps: ReactNode[] = browserOffersInstall
    ? []
    : isAndroid(d)
      ? [
          d.browser === 'samsung'
            ? r('install.android.samsung')
            : d.browser === 'firefox'
              ? r('install.android.firefox')
              : r('install.android.chrome', { menu: d.browser === 'edge' ? '⋯' : '⋮' }),
          r('install.android.open'),
        ]
      : d.browser === 'edge'
        ? [r('install.edge')]
        : d.browser === 'chrome'
          ? [r('install.chrome')]
          : [r('install.other')];
  return {
    heading: isAndroid(d) ? t('install.headingHomeScreen') : t('install.headingApp'),
    place,
    why: sharedWhy,
    steps,
    note: d.browser === 'other' || installKeepsOwnRecord(d)
      ? ''
      : t('install.sharedNote', { browser }),
    canInstall: true,
  };
}
