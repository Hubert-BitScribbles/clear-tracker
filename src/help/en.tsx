// Help in English. Each language has its own file of articles (de.tsx …),
// written to read naturally in that language rather than line by line; the
// ids, order and device-specific parts must match (test/i18n.test.ts).

import { Link } from 'react-router-dom';
import { installGuide } from '../components/InstallSteps';
import { BROWSER_NAMES, canPromptInstall, installKeepsOwnRecord, isIos, OS_NAMES } from '../lib/install';
import { privacyUrl } from '../lib/privacy';
import { Contact, SoundTest } from './parts';
import type { Article, HelpContext } from './types';

export function articles({ d, P }: HelpContext): Article[] {
  return [
  {
    id: 'start', title: 'Logging your days', keywords: 'tap calendar clear a few moderate a lot level unlogged past change edit standard drink unit size name why clear meaning',
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
        <p>What counts as one drink differs from country to country, and the app doesn't count sizes. If it helps you log the same way each time, <Link to="/settings/resources#drink">Resources</Link> links to your country's guide where there is one.</p>
        <p>You can log or change past days at any time; use the arrows to move between months. Future days can't be logged. A day you don't log is simply not logged: nothing assumes it was clear or not.</p>
        <p><strong>Why “Clear”?</strong> A clear day is a day without alcohol. The name means a little more: a clearer head, and a choice that’s yours. Clear Tracker doesn’t judge the other days — every logged day adds to the picture.</p>
      </>
    ),
  },
  {
    id: 'intention', title: 'Your intention', keywords: 'target goal aim week weekly met beyond change monday before started backfill past',
    body: (
      <>
        <p>Your intention is how many clear days a week you're aiming for, from 1 to 7. Cutting back and stepping away completely are both valid.</p>
        <p>If you drink heavily every day, stopping suddenly can be dangerous. Talk to a doctor first, or one of the lines in <Link to="/settings/resources">Resources</Link>.</p>
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
        <p><strong>Trends</strong> shows a year, or all time, clear days first: the year at a glance (clear days, weeks met, days logged and each level's total), clear days month by month, week by week against your intention (each week shows, say, 5/6: 5 clear days of 6), the day of the week — then estimates of drinks a week and savings, for context. Tap a month, a day or a week to see its details below.</p>
        <p><strong>Reports</strong> are a month or a year in review, to keep or to share — with a counsellor or doctor, if you like. Choose what's included — clear days and drinks month by month, over the past year, are there if you want the longer view — then "Share or save as PDF"{P === 'ios' ? ' and tap Share in the print preview' : P === 'android' ? ', and choose Save as PDF as the printer' : ''}.</p>
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
        <p>The same figure is used everywhere — at a glance, Month by month, comparisons and reports — so a month always reads the same. Only logged days count.</p>
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
        <p><strong>Other devices:</strong> iPhone and iPad — Share (in Safari, under ⋯ next to the address bar), then Add to Home Screen (in any browser; the Home Screen app keeps its own record). Android — Chrome's ⋮ menu, Install app. Mac with Safari — File → Add to Dock (its own record). Chrome or Edge on a computer — Install, from the address bar or menu (same record as the browser). Each device keeps its own record.</p>
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
        <p>The full <a href={privacyUrl()} target="_blank" rel="noopener">privacy statement</a> says the same, in a little more detail.</p>
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
