# Accessibility checks

Run against the dev server (`npm run dev`, port 5173). Needs Python with
Playwright (`pip install playwright && playwright install chromium`).

- `python3 checks/a11y_audit.py` — axe-core (WCAG 2.0–2.2 A/AA plus best
  practice) on 24 screens and states (every onboarding step included), in all four colour modes. Prints
  "NO VIOLATIONS" or each problem with where it occurs. Pass words to
  limit it, e.g. `python3 checks/a11y_audit.py trends`.
- `python3 checks/keyboard.py` — every screen: one h1, Tab reaches every
  control with a visible focus mark, no sideways scrolling at 320px; plus
  the erase dialog's focus handling, the report's section toggles, the
  savings radio group, the Intention chart from the keyboard, and the
  Check-in announcement region.

Both load test data from `test/helpers.ts`, so they never touch real data.
- `python3 checks/onboarding.py` — onboarding from a fresh start in a
  browser tab (every step, Back, the practice day and its tones, what's
  saved), the installed-app variant, and the Help and Resources links on
  each screen.
- `python3 checks/platforms.py` — the wording that differs by device
  (installing, storage, backups, sounds, reminders, PDFs) as an iPhone, an
  Android phone and a computer.
- `python3 checks/rc5.py` — two windows of one record staying in step
  (and a tap in an out-of-date window), the new-milestone line on Check-in,
  Trends comparing the selected month with the one before, and Backup /
  Restore (including the old addresses).
- `python3 checks/paths.py` — device and browser paths: what's detected
  (iPhone Safari and Chrome, Mac Safari, Chrome and Firefox, Samsung
  Internet), the "Not right? Change" override, and the install step,
  reminder link, Help and problem-report wording each path gets.
- `python3 checks/checkin.py` — the Intention card (wording, weeks before
  the first intention), month swipes, and Trends' Intention chart starting
  at the first intention.
- `python3 checks/snapshots.py <dir>` — a full-page screenshot of every
  screen and state (light and dark, plus the regions whose wording or
  currency differs). Take one set before a change and one after, then
  `python3 checks/snapshots.py --compare <before> <after>` lists any screen
  whose pixels differ. Set `SNAP_URL` to screenshot another server, e.g. an
  older copy on port 5174. Joining text that was split in the code can move
  a glyph by a fraction of a pixel; compare the page text before treating
  that as a change.
- `python3 checks/stale_resources.py` — help lines and links last checked
  more than six months ago (`--months 3` for sooner, `--all` for every
  entry, oldest first). Needs no server. Exits 1 when something is due, so
  run it before a release.
- `python3 checks/licences.py` — after `npm run build`: `licenses.txt`
  lists every open-source package in the built code, every font, and the
  parts of Workbox in the service worker, with Dexie's notice and the
  sounds' source. Needs no server; run it before a release.
- `python3 checks/report_trends.py` — reports: section order, and the
  month-by-month trends (off until ticked, both charts, a year report, 320 px,
  one month logged).
- `python3 checks/language.py` — the Language setting: an English device
  stays English until Deutsch is chosen, the switch and back, Help's
  English-only note, and a German device in Vienna getting German and
  „Jänner“ without choosing.
- In German: `SNAP_LANG=de` for `snapshots.py` (add `SNAP_WIDTH=320` for the
  narrowest phones; it lists any screen wider than the window) and
  `AUDIT_LANG=de` for `a11y_audit.py`.
