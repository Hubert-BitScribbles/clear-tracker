import { useEffect, useState } from 'react';
import { DeviceFields, useDevice } from '../components/DeviceFields';
import { installKeepsOwnRecord, isAndroid, isIos, linksOpenApp } from '../lib/install';
import { Link, useLocation } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { baselineText, SavingsSetup } from '../components/SavingsCard';
import { getEntryCount, getSavingsSettings, getSetting, resetDatabase, setSetting, type SavingsSettings } from '../data/database';
import { BASELINE_KEY, PRICE_KEY, priceText } from '../lib/savings';
import { daysAgoText } from '../lib/backupNudge';
import { daysBetween, localDateOf, todayIso } from '../data/dates';
import { useAppearance } from '../theme/AppearanceContext';
import type { ThemePref } from '../theme/appearance';
import { SettingsNav } from './About';
import { deviceTimeZone, parseRegion, regionLabel, type Region } from '../lib/regions';
import { RegionFields } from '../components/RegionFields';
import './Settings.css';

// Port of the native app/(tabs)/settings.tsx, adapted for the web:
// - Reminders: instructions for a repeating reminder in the phone's own
//   Reminders app, with a link back (porting plan: no web notifications).
// - App lock: dropped (porting plan).
// - Savings estimate: the baseline and price live here.
// - Descriptions updated to match what high contrast and sounds now do.
// - Erase also resets settings (as native did); the message says so.

const THEMES: { key: ThemePref; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
];

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const id = label.replace(/\W+/g, '-').toLowerCase();
  return (
    <div className="st-row">
      <div className="st-row-text">
        <span id={id} className="st-label">{label}</span>
        {sub && <p className="st-sub">{sub}</p>}
      </div>
      <button type="button" role="switch" aria-checked={value} aria-labelledby={id} className="switch" onClick={() => onChange(!value)}>
        <span className="switch-thumb" />
      </button>
    </div>
  );
}

export function Settings() {
  const { theme, highContrast, setAppearance } = useAppearance();
  const [audioCues, setAudioCues] = useState(true);
  const [dayStreak, setDayStreak] = useState(false);
  const [savings, setSavings] = useState<SavingsSettings | null>(null);
  const [editingSavings, setEditingSavings] = useState(false);
  const [ready, setReady] = useState(false);
  const [eraseCount, setEraseCount] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  // Bumped after erasing, so cards that load their own setting (Region) reload too.
  const [version, setVersion] = useState(0);
  const location = useLocation();

  async function load() {
    const [a, d, sv, lb] = await Promise.all([
      getSetting('audio_cues_enabled', 'true'),
      getSetting('day_streak_enabled', 'false'),
      getSavingsSettings(),
      getSetting('last_backup_at', ''),
    ]);
    setSavings(sv);
    setLastBackup(lb === '' ? null : lb);
    setAudioCues(a === 'true');
    setDayStreak(d === 'true');
    setReady(true);
  }
  useEffect(() => {
    load();
  }, []);

  // Arriving from Trends ("Set up in Settings"): scroll to the savings section.
  useEffect(() => {
    if (ready && (location.hash === '#savings' || location.hash === '#region')) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [ready, location.hash]);

  const toggle = (key: string, set: (v: boolean) => void) => async (v: boolean) => {
    set(v);
    await setSetting(key, v ? 'true' : 'false');
  };

  if (!ready || !savings) return <main className="settings" />;
  const savingsSet = savings.effective !== null || (savings.source === 'first3' && savings.price !== null);

  return (
    <main className="settings">
      <h1 className="st-title">Settings</h1>
      <SettingsNav active="settings" />

      <h2 className="st-sec">Appearance</h2>
      <section className="card st-card">
        <div className="st-block">
          <span id="theme-label" className="st-label">Theme</span>
          <div className="st-pills" role="radiogroup" aria-labelledby="theme-label">
            {THEMES.map((o) => (
              <button key={o.key} type="button" role="radio" aria-checked={theme === o.key} className="st-pill" onClick={() => setAppearance({ theme: o.key })}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="st-divider" />
        <Toggle
          label="High contrast mode"
          sub="Stronger text, borders and calendar fills"
          value={highContrast}
          onChange={(v) => setAppearance({ highContrast: v })}
        />
      </section>

      <h2 className="st-sec">Sound</h2>
      <section className="card st-card">
        <Toggle
          label="Audio cues"
          sub="A tone for each level when you log a day"
          value={audioCues}
          onChange={toggle('audio_cues_enabled', setAudioCues)}
        />
      </section>

      <h2 className="st-sec">Milestones</h2>
      <section className="card st-card">
        <Toggle
          label="Show clear day streak"
          sub="Counts consecutive clear days. A drinking day resets it to zero, which suits a full break better than moderation."
          value={dayStreak}
          onChange={toggle('day_streak_enabled', setDayStreak)}
        />
      </section>

      <h2 className="st-sec" id="savings">Savings estimate</h2>
      {savingsSet && !editingSavings ? (
        <section className="card st-card">
          <div className="st-row">
            <div className="st-row-text">
              <span className="st-label">
                {savings.effective
                  ? `About ${Math.round(savings.effective.baselinePerWeek * 10) / 10} drinks a week, at ${priceText(savings.effective.price)} a drink`
                  : `First 3 months, at ${priceText(savings.price!)} a drink`}
              </span>
              <p className="st-sub">
                {savings.effective ? `Baseline: ${baselineText(savings)}.` : 'Your first 3 months aren’t measured yet; savings will appear once they are.'}{' '}
                Used by the savings estimate in Trends.
              </p>
            </div>
          </div>
          <div className="st-divider" />
          <button type="button" className="st-link" onClick={() => setEditingSavings(true)}>
            <span className="st-label">Change</span>
            <span className="st-chevron" aria-hidden="true">›</span>
          </button>
        </section>
      ) : (
        <SavingsSetup
          initialSource={savings.source}
          initialBaseline={savings.entered}
          initialPrice={savings.price}
          first3={savings.first3}
          canCancel={savingsSet}
          onCancel={() => setEditingSavings(false)}
          onSave={async (src, b, p) => {
            await Promise.all([
              setSetting('savings_baseline_source', src),
              setSetting(PRICE_KEY, String(p)),
              ...(b !== null ? [setSetting(BASELINE_KEY, String(b))] : []),
            ]);
            setSavings(await getSavingsSettings());
            setEditingSavings(false);
          }}
        />
      )}

      <h2 className="st-sec" id="region">Region</h2>
      <RegionCard key={version} />

      <h2 className="st-sec" id="device">This device</h2>
      <section className="card st-card st-block">
        <DeviceFields intro="Clear Tracker's guidance here is for" />
        <p className="st-sub">Installing, reminders and backups work differently on each device and browser. Each device keeps its own record.</p>
      </section>

      <h2 className="st-sec">Reminder</h2>
      <ReminderCard />

      <h2 className="st-sec">Data</h2>
      <section className="card st-card">
        <div className="st-row">
          <div className="st-row-text">
            <span className="st-label">
              {lastBackup ? `Last backup: ${daysAgoText(daysBetween(localDateOf(lastBackup), todayIso()))}` : 'No backup yet'}
            </span>
            <p className="st-sub">A backup is the only copy of your record outside this browser.</p>
          </div>
        </div>
        <div className="st-divider" />
        <Link className="st-link" to="/settings/backup">
          <span className="st-label">Back up</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
        <div className="st-divider" />
        <Link className="st-link" to="/settings/restore">
          <span className="st-label">Restore from a backup</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
        <div className="st-divider" />
        <button type="button" className="st-link" onClick={async () => setEraseCount(await getEntryCount())}>
          <span className="st-label st-danger">Erase all data</span>
        </button>
      </section>
      {notice && (
        <p className="st-notice" role="status">
          {notice}
        </p>
      )}

      <h2 className="st-sec">Help and resources</h2>
      <section className="card st-card">
        <Link className="st-link" to="/settings/help">
          <span className="st-label">Help</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
        <div className="st-divider" />
        <Link className="st-link" to="/settings/resources">
          <span className="st-label">Resources</span>
          <span className="st-chevron" aria-hidden="true">›</span>
        </Link>
      </section>

      {import.meta.env.DEV && (
        <p className="st-dev">
          <Link to="/dev/colours">Colour reference</Link> <span className="text-muted">(development only)</span>
        </p>
      )}

      <ConfirmDialog
        open={eraseCount !== null}
        title="Erase all data"
        body={`This will permanently delete all ${eraseCount ?? 0} logged day${eraseCount === 1 ? '' : 's'}, your intention history, and your settings. This can't be undone.`}
        confirmLabel="Erase"
        danger
        onCancel={() => setEraseCount(null)}
        onConfirm={async () => {
          await resetDatabase();
          setEraseCount(null);
          setNotice('All data has been erased.');
          await load();
          setVersion((v) => v + 1);
        }}
      />
    </main>
  );
}

/**
 * Reminders, the web way: in the device's own Reminders or Calendar app.
 * A link back to the app only helps where links open the installed app
 * (Android, and Chrome/Edge on computers). On iPhone/iPad, and Safari on a
 * Mac, a link opens a browser tab with its own, separate record — so no link:
 * the reminder is a nudge to open the app from the Home Screen or Dock.
 */
function ReminderCard() {
  const dev = useDevice();
  const link = `${window.location.origin}${window.location.pathname}`;
  const [copied, setCopied] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied('Link copied.');
    } catch {
      // Clipboard needs a secure page; select the text for a manual copy instead.
      const el = document.getElementById('reminder-link');
      if (el) window.getSelection()?.selectAllChildren(el);
      setCopied('Selected — copy it from the menu.');
    }
  }
  const withLink = linksOpenApp(dev);
  return (
    <section className="card st-card st-block">
      <p className="st-sub st-sub-first">
        Clear Tracker doesn't send notifications. For a daily nudge, set a repeating reminder on your{' '}
        {isIos(dev) || isAndroid(dev) ? 'phone' : 'computer'} — it's more reliable, and it's yours:
      </p>
      {isAndroid(dev) ? (
        <ol className="st-steps">
          <li>In Google Calendar, add an event “Log today in Clear Tracker” at a time that suits you.</li>
          <li>Set it to repeat <em>Every day</em>, with a notification at the time of the event.</li>
          {withLink && <li>Paste this link in the <em>description</em>, so tapping it opens the app.</li>}
        </ol>
      ) : isIos(dev) ? (
        <ol className="st-steps">
          <li>In Reminders, add “Log today in Clear Tracker”.</li>
          <li>Open its details: turn on <em>Date</em> and <em>Time</em>, pick a time, and set <em>Repeat</em> to Daily.</li>
          <li>When it goes off, open Clear Tracker from your Home Screen.</li>
        </ol>
      ) : (
        <ol className="st-steps">
          <li>In your {dev.os === 'mac' ? 'Reminders or Calendar app' : 'calendar'}, add “Log today in Clear Tracker”, repeating every day at a time that suits you.</li>
          {withLink ? (
            <li>Paste this link in its <em>URL</em> or notes, so clicking it opens the app (when {dev.browser === 'edge' ? 'Edge' : 'Chrome'} is your default browser).</li>
          ) : (
            <li>When it goes off, open Clear Tracker from your {installKeepsOwnRecord(dev) ? 'Dock' : 'bookmarks or app list'}.</li>
          )}
        </ol>
      )}
      {withLink && (
        <>
          <div className="st-link-row">
            <code id="reminder-link" className="st-code">{link}</code>
            <button type="button" className="st-copy" onClick={copy}>Copy link</button>
          </div>
          {copied && <p className="st-sub" role="status">{copied}</p>}
        </>
      )}
      {!withLink && isIos(dev) && (
        <p className="st-sub">There's no link to add: on iPhone and iPad, links open the browser, which keeps a separate record from the Home Screen app.</p>
      )}
    </section>
  );
}

/** Region: where help lines (and later, currency and resources) come from. Guessed from the time zone until set. */
function RegionCard() {
  const [region, setRegion] = useState<Region | null>(null);
  const [isSet, setIsSet] = useState(false);
  useEffect(() => {
    getSetting('region', '').then((raw) => {
      setRegion(parseRegion(raw, deviceTimeZone()));
      setIsSet(raw !== '');
    });
  }, []);
  if (!region) return null;
  const save = async (r: Region) => {
    setRegion(r);
    setIsSet(true);
    await setSetting('region', JSON.stringify(r));
  };
  return (
    <section className="card st-card st-block">
      <p className="st-sub st-sub-first">
        Decides which help lines and programmes <Link to="/settings/resources">Resources</Link> shows.{' '}
        {isSet ? '' : `Guessed from this device's time zone: ${regionLabel(region)}.`}
      </p>
      <RegionFields region={region} onChange={save} />
    </section>
  );
}
