import type { ReactNode } from 'react';
import { BROWSER_NAMES, installKeepsOwnRecord, isAndroid, isIos, type Device } from '../lib/install';

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
      <>Tap <strong>Share</strong> <span aria-hidden="true">(□↑)</span> — in the toolbar, or under <strong>⋯</strong>.</>
    ) : d.browser === 'chrome' ? (
      <>Tap <strong>Share</strong> <span aria-hidden="true">(□↑)</span> at the right of the address bar.</>
    ) : (
      <>Open {BROWSER_NAMES[d.browser] === 'another browser' ? 'the browser' : BROWSER_NAMES[d.browser]}'s menu and tap <strong>Share</strong>.</>
    );
  return [
    share,
    <>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</>,
    <>Open Clear Tracker from your Home Screen and set it up there.</>,
  ];
};

export function installGuide(d: Device, browserOffersInstall: boolean): InstallGuide {
  const browser = BROWSER_NAMES[d.browser] === 'another browser' ? 'this browser' : BROWSER_NAMES[d.browser];
  const clearer = d.browser === 'safari' ? 'Safari' : `${d.os === 'ipad' ? 'An iPad' : 'An iPhone'} browser`;
  const ownRecordWhy = `Clear Tracker keeps everything on this device. Installed, it opens like an app, works offline, and your record is much safer: ${clearer} can clear a website's data after seven days without a visit, but not an installed app's.`;
  const sharedWhy =
    'Installed, Clear Tracker opens like an app, works offline, and your record is less likely to be cleared if the device runs low on space.';

  if (isIos(d)) {
    return {
      heading: 'Add it to your Home Screen first',
      place: 'Home Screen',
      why: ownRecordWhy,
      steps: ios(d),
      note: `The Home Screen app keeps its own record, separate from ${browser}. Always open it from the Home Screen icon — this website, and links to it, open ${browser} instead.`,
      canInstall: true,
    };
  }
  if (d.os === 'mac' && d.browser === 'safari') {
    return {
      heading: 'Add it to your Dock first',
      place: 'Dock',
      why: ownRecordWhy,
      steps: [
        <>In the menu bar, choose <strong>File → Add to Dock</strong> (macOS Sonoma or later), then <strong>Add</strong>.</>,
        <>Open Clear Tracker from the Dock and set it up there.</>,
      ],
      note: 'The Dock app keeps its own record, separate from Safari. Always open it from the Dock — this website, and links to it, open Safari instead.',
      canInstall: true,
    };
  }
  if (d.browser === 'firefox' && !isAndroid(d)) {
    return {
      heading: 'Keep it handy',
      place: 'bookmarks',
      why: 'Firefox keeps your record on this computer. It can’t install Clear Tracker as an app on a Mac, but a bookmark gets you back to it.',
      steps: [
        <>Bookmark this page (<strong>{d.os === 'mac' ? '⌘' : 'Ctrl'}+D</strong>) and open Clear Tracker from there.</>,
        <>For an app window that works offline, open this page in Chrome or Edge instead — before you log anything, as each browser keeps its own record.</>,
      ],
      note: 'Your days stay in Firefox on this computer.',
      canInstall: false,
    };
  }
  const place = isAndroid(d) ? 'Home Screen' : 'app list';
  const steps: ReactNode[] = browserOffersInstall
    ? []
    : isAndroid(d)
      ? [
          d.browser === 'samsung' ? (
            <>Tap <strong>≡</strong>, then <strong>Add page to → Home screen</strong>.</>
          ) : d.browser === 'firefox' ? (
            <>Tap <strong>⋮</strong>, then <strong>Add to Home screen</strong>.</>
          ) : (
            <>Tap <strong>{d.browser === 'edge' ? '⋯' : '⋮'}</strong>, then <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>
          ),
          <>Open Clear Tracker from your Home Screen.</>,
        ]
      : d.browser === 'edge'
        ? [<>Open Edge's menu (<strong>⋯</strong>) and choose <strong>Apps → Install this site as an app</strong>.</>]
        : d.browser === 'chrome'
          ? [<>Click the install icon at the right of the address bar, or open <strong>⋮ → Cast, save and share → Install page as app</strong>.</>]
          : [<>Look in your browser's menu for <strong>Install</strong> or <strong>Add to Home Screen</strong>.</>];
  return {
    heading: isAndroid(d) ? 'Add it to your Home Screen first' : 'Install it as an app',
    place,
    why: sharedWhy,
    steps,
    note: d.browser === 'other' || installKeepsOwnRecord(d)
      ? ''
      : `The app and ${browser} share one record, so your days are there whichever you open.`,
    canInstall: true,
  };
}
