import { useEffect, useState } from 'react';
import { useDevice } from '../components/DeviceFields';
import { installKeepsOwnRecord, isInstalled, isIos } from '../lib/install';
import { Link } from 'react-router-dom';
import iconUrl from '../assets/clear-icon-96.png';
import { SegmentNav } from '../components/SegmentNav';
import './About.css';

// About, the second half of Settings | About. Adapted from the native
// app/about.tsx, with:
// - bitScribbles and the design approach (drafts, to be edited);
// - storage: says plainly that browser storage isn't a backup, and shows
//   this device's real status (installed? persistent storage granted?);
// - support: help lines moved to the Resources page (Help | Resources);
// - credits (the fonts' licence).

export const SettingsNav = ({ active }: { active: 'settings' | 'about' }) => (
  <SegmentNav
    label="Settings and about"
    current={active === 'settings' ? 'Settings' : 'About'}
    items={[{ to: '/settings', text: 'Settings' }, { to: '/settings/about', text: 'About' }]}
  />
);

export function About() {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const installed = isInstalled();
  const dev = useDevice();

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  return (
    <main className="about">
      <h1 className="ab-page-title">About</h1>
      <SettingsNav active="about" />

      <div className="ab-app">
        <img src={iconUrl} alt="" width="48" height="48" className="ab-icon" />
        <p className="ab-name">Clear Tracker</p>
        <p className="ab-version">Version {__APP_VERSION__} · web</p>
      </div>

      {/* The brand keeps its casing inside the capitalised heading style. */}
      <h2 className="ab-sec">Made by <span className="ab-brand">bitScribbles</span></h2>
      <div className="card ab-card">
        <p className="ab-body">
          Clear Tracker is made by bitScribbles: small apps, carefully made. Every app starts as a scribble — an idea
          sketched for a real need — and is refined until it's simple, private and pleasant to use.
        </p>
      </div>

      <h2 className="ab-sec">How it's designed</h2>
      <div className="card ab-card">
        <ul className="ab-principles">
          <li><strong>A record, not a score.</strong> Nothing you log undoes anything. A drinking day counts as much as a clear one.</li>
          <li><strong>Your aim, your call.</strong> Cutting back and stepping away completely are both valid. You set the intention, and can change it any time.</li>
          <li><strong>Private by design.</strong> No account and no cloud: everything stays on this device unless you back it up.</li>
          <li><strong>Calm, not clinical.</strong> Plain words, no warnings or rebukes, and no streak that punishes a choice you made.</li>
          <li><strong>Made for everyone.</strong> Works with screen readers and keyboards, in light, dark and high contrast, and respects reduced motion.</li>
        </ul>
      </div>

      <h2 className="ab-sec">How your data is stored</h2>
      <div className="card ab-card">
        <p className="ab-body">
          Everything you log — clear days, drinking days, and your intention history — is stored only in this
          browser, on this device. There's no account, no cloud sync, and nothing is ever sent anywhere unless you
          export a backup yourself from Settings.
        </p>
        <p className="ab-body ab-gap">
          <strong>Browser storage isn't a backup.</strong> Clearing your browser's website data erases it
          {installKeepsOwnRecord(dev)
            ? `, and Safari can delete a site's data after seven days without a visit — unless the app is added to your ${isIos(dev) ? 'Home Screen' : 'Dock'}, which keeps its own record.`
            : ', and the browser may clear it if the device runs very low on space — less likely once installed.'}{' '}
          Back up from time to time.
        </p>
        <ul className="ab-status" aria-label="This device">
          <li>
            <span aria-hidden="true">{installed ? '✓' : '–'}</span> {installed ? 'Installed as an app' : 'Not installed — open in a browser tab'}
          </li>
          <li>
            <span aria-hidden="true">{persisted ? '✓' : '–'}</span>{' '}
            {persisted === null ? 'Persistent storage: unknown in this browser' : persisted ? 'Persistent storage granted' : 'Persistent storage not granted'}
          </li>
        </ul>
      </div>

      <h2 className="ab-sec">Disclaimer</h2>
      <div className="card ab-card">
        <p className="ab-body">
          Clear Tracker is a personal tracking tool, not a medical device or treatment program. It doesn't diagnose
          or treat alcohol use. If you're concerned about your drinking, please reach out to a healthcare
          professional, or see Resources for help lines in your region.
        </p>
      </div>

      <h2 className="ab-sec">Support</h2>
      <div className="card ab-card">
        <p className="ab-body">
          Help lines and programmes for your region are on <Link to="/settings/resources">Resources</Link>, and answers
          to common questions on <Link to="/settings/help">Help</Link>.
        </p>
      </div>

      <h2 className="ab-sec">Credits</h2>
      <div className="card ab-card">
        <p className="ab-body">
          Type: Space Grotesk, Inter, JetBrains Mono and Caveat, all under the SIL Open Font License 1.1. Sounds made
          for Clear Tracker.
        </p>
      </div>
    </main>
  );
}
