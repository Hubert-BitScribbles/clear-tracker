import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { audioStatus, playLoggingSound, unlockAudio } from '../lib/sounds';
import { useDevice } from '../components/DeviceFields';
import { installGuide } from '../components/InstallSteps';
import { BROWSER_NAMES, canPromptInstall, installKeepsOwnRecord, isIos, OS_NAMES, platform, type Device } from '../lib/install';
import { diagnostics, mailto, SUPPORT_EMAIL } from '../lib/support';
import { HelpNav } from './Resources';
import './Support.css';

// Help: short articles, the first half of Help | Resources. Each has an id,
// so other screens can link straight to one (/settings/help?topic=estimates).
// Drafts, written against how the app behaves; to be edited.
// Where iPhone and Android differ (installing, storage, where backups go,
// sounds, PDFs), each reader sees their own device's wording.


interface Article {
  id: string;
  title: string;
  keywords: string; // extra words for the search box
  body: ReactNode;
}

function SoundTest() {
  const [status, setStatus] = useState(audioStatus());
  return (
    <div className="sp-buttons">
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          unlockAudio();
          playLoggingSound('clear');
          setStatus(audioStatus());
          setTimeout(() => setStatus(audioStatus()), 1500);
        }}
      >
        Play test tone
      </button>
      <p className="sp-details" role="status" style={{ fontFamily: 'var(--font-mono)' }}>{status}</p>
    </div>
  );
}

function Contact() {
  const [details, setDetails] = useState('');
  useEffect(() => {
    diagnostics().then(setDetails);
  }, []);
  const report = mailto(
    'Clear Tracker: a problem',
    `What happened, and what did you expect?\n(Please leave out health or personal details, beyond how to reach you.)\n\n\n\n---\nTechnical details (no personal or health data):\n${details}`,
  );
  return (
    <>
      <p>Clear Tracker has no app store page, so this is the way to reach bitScribbles. Both open your own email app, addressed to {SUPPORT_EMAIL}; nothing is sent until you press Send there.</p>
      <p><strong>Please don't include health details or anything personal</strong> beyond how to reach you. To help, bitScribbles only needs to know what you noticed — nothing about your days or your drinking.</p>
      <div className="sp-buttons">
        <a className="sp-action sp-action-strong" href={mailto('Clear Tracker: feedback', '')}>Send feedback</a>
        <a className="sp-action" href={report}>Report a problem</a>
      </div>
      <details className="sp-details">
        <summary>What "Report a problem" includes</summary>
        <pre>{details}</pre>
        <p>Only the app version and how your device and browser are set up — nothing from your record (days, intentions or settings) is ever added, and you can read or delete every line before sending.</p>
      </details>
      <p>An email is between you and bitScribbles, like any other, and goes from your own email address.</p>
    </>
  );
}

function articles(d: Device): Article[] {
  const P = platform(d);
  return [
  {
    id: 'start', title: 'Logging your days', keywords: 'tap calendar clear a few moderate a lot level unlogged past change edit',
    body: (
      <>
        <p>Tap a day to select it, then tap it again to log it. Each tap moves to the next level:</p>
        <ul>
          <li><strong>Clear</strong> — no drinks</li>
          <li><strong>A few</strong> — 1–2 drinks</li>
          <li><strong>Moderate</strong> — 3–4 drinks</li>
          <li><strong>A lot</strong> — 5 or more</li>
          <li>then back to <strong>not logged</strong>.</li>
        </ul>
        <p>You can log or change past days at any time; use the arrows to move between months. Future days can't be logged. A day you don't log is simply not logged: nothing assumes it was clear or not.</p>
      </>
    ),
  },
  {
    id: 'intention', title: 'Your intention', keywords: 'target goal aim week weekly met beyond change monday before started backfill past',
    body: (
      <>
        <p>Your intention is how many clear days a week you're aiming for, from 1 to 7. Cutting back and stepping away completely are both valid.</p>
        <p>Weeks run Monday to Sunday. A week is <strong>met</strong> when its clear days reach your intention, and <strong>beyond</strong> when they pass it.</p>
        <p>If you change your intention, it applies to this week if nothing is logged in it yet, otherwise from next Monday. Past weeks always keep the intention that was active at the time.</p>
        <p>Weeks before your first intention — days you've filled in from before you started — count as logged days, but aren't measured as met or missed.</p>
      </>
    ),
  },
  {
    id: 'trends', title: 'Trends and reports', keywords: 'chart month year review report pdf share print compare unlogged not logged first month missing days',
    body: (
      <>
        <p><strong>Trends</strong> shows how things change over a year, or all time: estimated drinks, the day of the week, month by month, your intention week by week, and savings. Tap a month, a day or a week to see its details below.</p>
        <p><strong>Reports</strong> are a month or a year in review, to keep or to share — with a counsellor or doctor, if you like. Choose what's included, then "Share or save as PDF"{P === 'ios' ? ' and tap Share in the print preview' : P === 'android' ? ', and choose Save as PDF as the printer' : ''}.</p>
        <p>Comparisons with an earlier period only appear when that period was tracked from its start, so a partly-tracked month never makes another look better or worse.</p>
        <p><strong>Why does my first month show no unlogged days?</strong> Tracking counts from the first day you've logged. Days before it are before you started, not days you missed, so they aren't shown as not logged. If you fill in earlier days later, the start moves back with them.</p>
      </>
    ),
  },
  {
    id: 'estimates', title: 'How the estimates work', keywords: 'drinks savings money baseline price range calculated estimate first 3 months',
    body: (
      <>
        <p>Each level is a range of drinks — A few is 1–2, Moderate 3–4, A lot 5 or more. To estimate drinks a week, each logged day counts at the middle of its range: A few as 1.5, Moderate as 3.5. A lot has no top, so it counts as 5, its minimum — a period with an A lot day could be higher than the estimate shows.</p>
        <p>The same figure is used everywhere — the chart, Month by month, comparisons and reports — so a month always reads the same. Only logged days count.</p>
        <p><strong>Savings</strong> compare your drinking with a baseline — drinks a week before tracking — at your price per drink. Type the baseline yourself, or measure it from your first 3 months of tracking (a chosen challenge month is left out). Periods over the baseline are shown honestly.</p>
      </>
    ),
  },
  {
    id: 'milestones', title: 'Milestones and challenges', keywords: 'badge earned up next challenge weekend week month all or nothing',
    body: (
      <>
        <p>Milestones are a record of what you've done, not a score. Once earned, a milestone stays earned, even if you change your intention. <strong>Up next</strong> shows the three you're closest to; <strong>Earned</strong> lists them by month.</p>
        <p><strong>Challenges</strong> are optional and all-or-nothing. A clear weekend or week starts like an intention: the current one if nothing in it is logged yet, otherwise the next, and only counts from then on. A clear month you choose needs every day logged clear; days you forget can be filled in afterwards, but a drinking day ends it — quietly, with no message.</p>
      </>
    ),
  },
  {
    id: 'backups', title: 'Backups', keywords: 'backup back up restore export import passphrase password file encrypted lost',
    body: (
      <>
        <p>Your record lives only in this browser, so a backup is the only copy anywhere else. <strong>Back up</strong> creates an encrypted file of your days, intentions and settings, and you choose where to keep it — {P === 'ios' ? 'Files, iCloud Drive, or another device' : P === 'android' ? 'Google Drive, Files, or email it to yourself' : 'your browser asks where to save it, or puts it in Downloads'}.</p>
        <p>Your passphrase needs at least 8 characters, and can't be recovered: without it, the backup can't be opened. Keep it somewhere safe.</p>
        <p><strong>Restore</strong> replaces everything on this device with the backup's contents, after showing you what's in it. Check-in reminds you to back up 30 days after your last backup.</p>
      </>
    ),
  },
  {
    id: 'install', title: 'Installing and working offline', keywords: 'home screen dock add install offline safari chrome edge firefox android iphone mac storage seven days update',
    body: (
      <>
        {(() => {
          const g = installGuide(d, canPromptInstall());
          return (
            <>
              <p><strong>On {OS_NAMES[d.os] === 'another device' ? 'this device' : `your ${OS_NAMES[d.os]}`}, in {BROWSER_NAMES[d.browser] === 'another browser' ? 'this browser' : BROWSER_NAMES[d.browser]}:</strong> {g.why}</p>
              {g.steps.length > 0 ? (
                <ul>{g.steps.map((st, k) => <li key={k}>{st}</li>)}</ul>
              ) : (
                <p>Use the <strong>Install</strong> button your browser offers (in onboarding, or the install icon in the address bar).</p>
              )}
              {g.note && <p>{g.note}</p>}
            </>
          );
        })()}
        {installKeepsOwnRecord(d) && (
          <p>Because the installed app has its own record, days logged in the browser don't move across by themselves: back up in one and restore in the other.{isIos(d) ? ' Can’t find the app? Swipe down from the middle of the Home Screen and search for “Clear Tracker”.' : ' Can’t find it? Search for “Clear Tracker” with Spotlight.'}</p>
        )}
        <p><strong>Other devices:</strong> iPhone and iPad — Share, then Add to Home Screen (in any browser; the Home Screen app keeps its own record). Android — Chrome's ⋮ menu, Install app. Mac with Safari — File → Add to Dock (its own record). Chrome or Edge on a computer — Install, from the address bar or menu (same record as the browser). Each device keeps its own record.</p>
        <p>Updates arrive automatically; you may see the new version the next time you open the app.</p>
      </>
    ),
  },
  {
    id: 'privacy', title: 'Privacy', keywords: 'data private account cloud tracking ads share',
    body: (
      <>
        <p>Everything you log stays on this device. There's no account and no cloud, and nothing is sent to bitScribbles or anyone else. There are no ads.</p>
        <p>Backups are encrypted, and you decide where they go. If you email feedback, bitScribbles receives only what you write — and, for a problem report, the technical details you can see before sending, which never include your record.</p>
        <p>The full <a href="./privacy.html" target="_blank" rel="noopener">privacy statement</a> says the same, in a little more detail.</p>
      </>
    ),
  },
  {
    id: 'sounds', title: 'Sounds', keywords: 'audio tone chime silent switch media volume music not working',
    body: (
      <>
        <p>Each level has its own tone when you log a day; turn them off in Settings.{P === 'ios' ? ' On iPhone they follow the silent switch, and play alongside music without pausing it.' : P === 'android' ? ' On Android they play at your media volume.' : ''}</p>
        <p>If the sounds stop, the next tap usually brings them back; if not, close and reopen the app. To check:</p>
        <SoundTest />
      </>
    ),
  },
  {
    id: 'accessibility', title: 'Accessibility', keywords: 'voiceover screen reader keyboard contrast motion zoom',
    body: (
      <>
        <ul>
          <li><strong>VoiceOver and keyboards:</strong> every control is labelled; each calendar day reads its date and level; the charts work like sliders (swipe up or down, or use the arrow keys), with details below.</li>
          <li><strong>High contrast</strong> (Settings): stronger text and borders, and larger calendar marks.</li>
          <li><strong>Light and dark</strong> follow your device, or choose one in Settings. Reduced motion is respected.</li>
          <li>To make text larger, use your browser's zoom.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'troubleshooting', title: 'Troubleshooting', keywords: 'problem missing gone lost data wrong date time zone bug',
    body: (
      <>
        <p><strong>My days are missing.</strong> {installKeepsOwnRecord(d) ? `${isIos(d) ? 'The Home Screen app' : 'The Dock app'} and the browser keep separate records — check you're in the same one as before. ` : 'Check you’re using the same browser, on the same device, as before. '}Clearing your browser's website data{P === 'android' ? ' (or Chrome’s storage in Android settings)' : ''} erases the record; restore it from a backup.</p>
        <p><strong>Dates look wrong.</strong> Clear Tracker uses your device's date and time zone.</p>
        <p><strong>Something else.</strong> Please report it below.</p>
      </>
    ),
  },
  { id: 'contact', title: 'Contact and feedback', keywords: 'email feedback report problem bug support suggestion', body: <Contact /> },
];
}

export function Help() {
  const dev = useDevice();
  const ARTICLES = articles(dev);
  const [params] = useSearchParams();
  const topic = params.get('topic');
  const [query, setQuery] = useState('');
  const opened = useRef(false);

  // A link to a topic opens that article and scrolls to it.
  useEffect(() => {
    if (!topic || opened.current) return;
    const el = document.getElementById(`help-${topic}`) as HTMLDetailsElement | null;
    if (el) {
      el.open = true;
      el.scrollIntoView({ block: 'start' });
      opened.current = true;
    }
  }, [topic]);

  const q = query.trim().toLowerCase();
  const shown = q ? ARTICLES.filter((a) => `${a.title} ${a.keywords}`.toLowerCase().includes(q)) : ARTICLES;

  return (
    <main className="support">
      <h1 className="sp-title">Help</h1>
      <HelpNav active="help" />
      <label className="sr-only" htmlFor="help-search">Search help</label>
      <input id="help-search" className="sp-search" type="search" placeholder="Search help" value={query} onChange={(e) => setQuery(e.target.value)} />
      {q && <p className="sp-lede" role="status">{shown.length ? `${shown.length} article${shown.length === 1 ? '' : 's'}` : 'No articles match. Try a different word, or contact us below.'}</p>}
      <div className="card sp-articles">
        {(shown.length ? shown : ARTICLES.filter((a) => a.id === 'contact')).map((a) => (
          <details key={a.id} id={`help-${a.id}`} className="sp-article">
            <summary>{a.title}</summary>
            <div className="sp-body">{a.body}</div>
          </details>
        ))}
      </div>
      <p className="sp-checked">
        Looking for support with drinking? <Link to="/settings/resources">Resources</Link> lists help lines and programmes for your region.
      </p>
    </main>
  );
}
