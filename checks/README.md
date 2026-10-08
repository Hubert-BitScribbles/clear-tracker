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
- `python3 checks/paths.py` — device and browser paths: what's detected
  (iPhone Safari and Chrome, Mac Safari, Chrome and Firefox, Samsung
  Internet), the "Not right? Change" override, and the install step,
  reminder link, Help and problem-report wording each path gets.
- `python3 checks/checkin.py` — the Intention card (wording, weeks before
  the first intention), month swipes, and Trends' Intention chart starting
  at the first intention.
