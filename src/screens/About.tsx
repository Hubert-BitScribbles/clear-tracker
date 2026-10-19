import { useEffect, useState } from 'react';
import { useDevice } from '../components/DeviceFields';
import { installKeepsOwnRecord, isInstalled, isIos } from '../lib/install';
import { Link } from 'react-router-dom';
import iconUrl from '../assets/clear-icon-96.png';
import { SegmentNav } from '../components/SegmentNav';
import './About.css';
import { rich, t, type Key } from '../i18n';
import { privacyUrl } from '../lib/privacy';

// About, the second half of Settings | About. Adapted from the native
// app/about.tsx, with:
// - bitScribbles and the design approach (drafts, to be edited);
// - storage: says plainly that browser storage isn't a backup, and shows
//   this device's real status (installed? persistent storage granted?);
// - support: help lines moved to the Resources page (Help | Resources);
// - credits (what it's built with, the fonts and sounds; all licences in licenses.txt).

export const SettingsNav = ({ active }: { active: 'settings' | 'about' }) => (
  <SegmentNav
    label={t('settingsNav.label')}
    current={active === 'settings' ? t('settingsNav.settings') : t('settingsNav.about')}
    items={[{ to: '/settings', text: t('settingsNav.settings') }, { to: '/settings/about', text: t('settingsNav.about') }]}
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
      <h1 className="ab-page-title">{t('about.title')}</h1>
      <SettingsNav active="about" />

      <div className="ab-app">
        <img src={iconUrl} alt="" width="48" height="48" className="ab-icon" />
        <p className="ab-name">Clear Tracker</p>
        <p className="ab-version">{t('about.version', { version: __APP_VERSION__ })}</p>
      </div>

      {/* The brand keeps its casing inside the capitalised heading style. */}
      <h2 className="ab-sec">{rich('about.madeBy', { brand: (c) => <span className="ab-brand">{c}</span> })}</h2>
      <div className="card ab-card">
        <p className="ab-body">{t('about.bitscribbles')}</p>
        {/* A plain link, no embedded button script: nothing loads from elsewhere unless it's tapped. */}
        <p className="ab-body ab-gap">
          {rich('about.free', {
            coffee: (c) => <a className="ab-coffee" href="https://buymeacoffee.com/bitscribbles" target="_blank" rel="noopener noreferrer">{c}</a>,
          })}
        </p>
      </div>

      <h2 className="ab-sec">{t('about.designed')}</h2>
      <div className="card ab-card">
        <ul className="ab-principles">
          {(['about.p1', 'about.p2', 'about.p3', 'about.p4', 'about.p5'] as Key[]).map((k) => (
            <li key={k}>{rich(k, { b: (c) => <strong>{c}</strong> })}</li>
          ))}
        </ul>
      </div>

      <h2 className="ab-sec">{t('about.stored')}</h2>
      <div className="card ab-card">
        <p className="ab-body">{t('about.storedBody')}</p>
        <p className="ab-body ab-gap">
          {installKeepsOwnRecord(dev)
            ? rich('about.notBackupOwn', { place: isIos(dev) ? t('about.placeHomeScreen') : t('about.placeDock'), b: (c) => <strong>{c}</strong> })
            : rich('about.notBackupShared', { b: (c) => <strong>{c}</strong> })}
        </p>
        <p className="ab-body ab-gap">
          <a href={privacyUrl()} target="_blank" rel="noopener">{t('about.privacy')}</a>
        </p>
        <ul className="ab-status" aria-label={t('about.thisDevice')}>
          <li>
            <span aria-hidden="true">{installed ? '✓' : '–'}</span> {installed ? t('about.installed') : t('about.notInstalled')}
          </li>
          <li>
            <span aria-hidden="true">{persisted ? '✓' : '–'}</span>{' '}
            {persisted === null ? t('about.persistUnknown') : persisted ? t('about.persistGranted') : t('about.persistNot')}
          </li>
        </ul>
      </div>

      <h2 className="ab-sec">{t('about.disclaimer')}</h2>
      <div className="card ab-card">
        <p className="ab-body">{t('about.disclaimerBody')}</p>
      </div>

      <h2 className="ab-sec">{t('about.support')}</h2>
      <div className="card ab-card">
        <p className="ab-body">
          {rich('about.supportBody', {
            resources: (c) => <Link to="/settings/resources">{c}</Link>,
            help: (c) => <Link to="/settings/help">{c}</Link>,
          })}
        </p>
      </div>

      <h2 className="ab-sec">{t('about.credits')}</h2>
      <div className="card ab-card">
        <p className="ab-body">
          {/* Every open-source part that ships, with its licence: built into licenses.txt (licences.ts). */}
          {rich('about.creditsBody', { link: (c) => <a href="./licenses.txt" target="_blank" rel="noopener">{c}</a> })}
        </p>
      </div>
    </main>
  );
}
