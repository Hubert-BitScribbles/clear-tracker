# Changelog

The version shows in Settings → About and in "Report a problem", so a report
can be matched to what was live. The number lives in `package.json`; update it
on the branch, before merging.

## 1.3.0 — 17 October 2026 (in review)

- **French**, addressing people as « vous », including Help and the privacy
  statement. A device set to French gets it straight away; anyone can choose
  it in Settings → Language. With Canada as the region it uses Quebec's
  words where they differ (« fin de semaine », « courriel », « signets »)
  and Canadian formats (« 12 $ »); elsewhere, France's (« 12 € »).
- **France** as a country: 15 (SAMU), the 3114 national suicide prevention
  line, Alcool Info Service and Alcooliques anonymes, Alcool Info Service's
  site and local help finder, and its « repères de consommation » (10 g),
  checked 17 October 2026. A device on Paris time starts on France.
- Canadian links open their French versions for French readers (Boire moins,
  c'est mieux; the CCSA's standard-drink poster).
- `src/i18n/glossary-fr.md` records the key terms, for review.
- **Language and region on the welcome screen**, under the device line and
  in the same way: what the app guessed, with "Not right? Change" to pick
  another language, country and province. The separate "Where are you?"
  step is gone, so setup is one step shorter. A French-language phone on
  Toronto time now starts on Quebec (Quebec reports Toronto's time zone).

## 1.2.0 — 17 October 2026

- **German**, addressing people as „Sie“. A device set to German gets it
  straight away; anyone can choose in **Settings → Language** (Automatic,
  English, Deutsch). Dates, numbers and money follow German style, and in
  Austria the months too („Jänner“). Help lines keep their own names, with
  hours and notes in German. Help and the privacy statement are in German
  too (`src/help/de.tsx`, `public/privacy-de.html`), each linking to its
  English version.
- Reviewed by a German speaker in Austria: „Ihre Einträge“, „Wenig“ and
  „Vorhaben“ are her choices.
- `src/i18n/glossary-de.md` records the key terms. Fixed in both languages:
  "1 day logged" (was "1 days logged").

## 1.1.3 — 16 October 2026

- Milestones already shown on Check-in are remembered by a fixed id instead
  of their title, which will change with the language. Nothing looks
  different: on first open, everything already earned counts as shown, as it
  did when the new-milestone line arrived in rc.5.

## 1.1.2 — 16 October 2026

Groundwork for German. Nothing looks different (screenshots and the page
text of every screen were compared before and after), apart from this number.

- **All app wording in one file**, `src/i18n/en.json`, with dates, month and
  weekday names, and plurals from the browser's built-in formats. A second
  language becomes a second file. Help and the privacy page stay as pages;
  each language will get its own.
- **Help lines and links, one file per country** (`src/resources/`), each
  entry with where and when it was checked. `python3 checks/stale_resources.py`
  lists anything not checked for six months. "Numbers checked" on Resources
  now comes from the oldest entry shown.
- The Reports screen loads when it's opened rather than with the app, as the
  other secondary screens do.

## 1.1.1 — 16 October 2026

- Savings show the region's currency everywhere. In 1.1.0 the monthly savings
  chart, its month details and the "saving about … more a week" lines still
  showed $ in the UK, Ireland, Germany and Austria.

## 1.1.0 — 16 October 2026

More countries, tested on a preview by testers in Austria and the UK.

- **New countries**, in English: Germany, Austria, Ireland and New Zealand.
  Each has its emergency number, someone to talk to, help with drinking and
  programmes, checked against official sources on 14–15 October 2026. German
  and Austrian lines are in German and say so. Austria has no national alcohol
  helpline, so AA Austria and the 1450 health line stand in. A device on
  Berlin, Vienna, Dublin or Auckland time starts on that country.
- **UK nations:** choosing the United Kingdom now asks for the nation, as
  Canada asks for the province. England keeps Drinkline; Wales gets DAN 24/7;
  Scotland gets Drinkline Scotland and Breathing Space; Northern Ireland adds
  Lifeline. A UK region saved before this reads as England.
- **Caution about stopping suddenly**, in Resources, Help and Challenges:
  stopping suddenly after heavy daily drinking can be dangerous, so talk to a
  doctor or a help line first (NHS, HealthLink BC, NIAAA).
- **What counts as one drink:** Resources links to the country's official
  guide (none found for Austria yet). The app still doesn't count drink sizes;
  Help's logging topic says so and points there.
- **Savings in the region's currency:** € for Ireland, Germany and Austria,
  £ for the UK (which showed $ before), $ elsewhere. Nothing is converted.
  Prices and baselines accept a comma decimal ("4,50") and a typed symbol, and
  changing region in Settings updates the savings line straight away.

## 1.0.0 — 12 October 2026

The first release. Tested on iPhone, Mac and other platforms by several
testers through thirteen release candidates.

- Trends reads months, weeks, days: at a glance, then Month by month,
  Weeks by intention and By day of week, with Estimates last.
- Tap a month on either monthly chart (clear days, drinks a week) to see
  its details, as with weeks and days — a plain tap, which iPhone Safari
  handles reliably, with a "Tap a month for its details." hint. The arrows
  and the keyboard still work.

## 1.0.0-rc.13 — 12 October 2026

Clear days first, and each level its own look.

- Every check-in level has its own colour and mark: Clear teal with a round
  dot; A few sand, Moderate clay and A lot terracotta, with 1, 2 and 3 square
  ticks. A few was an outline, and Moderate and A lot shared a colour. The
  calendar legend, Trends and report bars (now four parts) and legends
  follow; high contrast and print have their own stronger versions.
- Trends leads with clear days and intentions: "2026 at a glance" shows
  clear days and weeks met large, days logged and each level's total
  below; then Weeks by intention; Month by month is clear days per month
  (each month's details add a quiet drinks estimate); By day of week. The
  drinks estimate, its chart and comparisons, and savings move to an
  "Estimates" section at the end — still all there, for context.
- Reports follow: the summary card has clear days, weeks met and level
  totals; Estimated drinks is its own section again, after By day of week.

## 1.0.0-rc.12 — 9 October 2026

Trends and reports, reorganised so each thing is said once.

- Trends opens with "2026 at a glance" (or "All time at a glance"): clear
  days, days logged, weeks met, each level's total and estimated drinks a
  week, with how it's counted. The level totals are no longer repeated
  above By day of week.
- Month by month is now the drinks chart, with each month's levels, days
  logged, the change from the month before, and links to its review and to
  Check-in. The separate month bars are gone (under All time: the last 12
  months).
- By day of week: a day's details are its counts and % clear; the "typical
  Friday" line is gone.
- Intention is now "Weeks by intention".
- Reports match: the summary card carries the level totals and, when
  Estimated drinks is included, the drinks figure and change; sections read
  The days, Weeks by intention, By day of week.

## 1.0.0-rc.11 — 9 October 2026

Estimates, said once and plainly.

- No repeated period names: under a heading that already says "October 2026
  (so far)" or "September 2026", the estimate reads "About 19 drinks a week"
  and the comparison "About 5 more drinks a week than September" — on the
  Estimated drinks chart, Month by month, Estimated savings and the reports.
  "Last 3 months" and "Last 6 months" keep their names, being periods of
  their own.
- No "or more" on the figure. A lot still counts as 5, its minimum; the
  footnote says a period with an A lot day could be higher.

## 1.0.0-rc.10 — 9 October 2026

One estimate of drinks a week, wherever it shows.

- The same month could read differently in different places: September at
  "about 14" on the Estimated drinks chart but "about 12 or more" in Month
  by month (low ends of each level's range). Now every estimate — the year
  or All time line, the chart and its month details, Month by month, and
  the reports — counts each logged day at its level's middle value (A few
  1.5, Moderate 3.5) and A lot at 5, its minimum, adding "or more" whenever
  the period has an A lot day.
- Each estimate names its period: "2026: about 19 or more drinks a week",
  "September: about 14 or more drinks a week", "October so far: …".
- The footnotes and Help → How the estimates work say how it's counted.
  Savings estimates are unchanged.

## 1.0.0-rc.9 — 9 October 2026

Getting ready for 1.0.

- A privacy statement, at `/privacy.html`: a plain page that works without
  the app (and offline), for linking from bitscribbles.com. About and Help →
  Privacy link to it.
- Security headers (`public/_headers`, applied by Cloudflare Pages): the app
  may load only its own files, can't be framed by another site, sends no
  referrer, and the service worker is never cached, so updates arrive.
  The pre-paint theme script moved from `index.html` to
  `public/theme-init.js` so no inline script is needed.
- About: "export a backup" now reads "back up".
- National help lines re-checked against official sources (988.ca,
  samhsa.gov, nhs.uk, health.gov.au, Lifeline).

## 1.0.0-rc.8 — 8 October 2026

- A new app icon: the clear-day mark — a light day cell with a teal dot — on
  the app's own teal, filling the tile. It replaces the small steel-blue cell
  with a "Clear" label too small to read. Home Screen, Dock, install,
  favicon, and the icon on the welcome screen, Check-in and About all use it.
  The source drawing and the script that makes every size are in `design/`.
- An iPhone or Mac Safari Home Screen/Dock app keeps the old icon until it's
  removed and added again; Chrome and Android pick it up on their own, in time.

## 1.0.0-rc.7 — 8 October 2026

The month/year report, reviewed for sharing with a counsellor or doctor.

- Estimated savings, Milestones and a new Challenges section are left out by
  default — tick them in under "Choose what's included". Challenges lists
  clear weekends and weeks earned in the period and any chosen clear month
  (earned, under way, days still to log, or "not this time"); they're no
  longer repeated under Milestones.
- The summary card follows your choices: "weeks met intention" only appears
  when the Intention section is included.
- The Intention section names weeks with too few days logged to say, instead
  of counting them as not met without comment.
- Estimated drinks adds the direction against the previous period ("August
  2026: about 1 more drink a week than July"), when both have 7+ logged days.
- The footer says the report is from days the person logged themselves
  (self-reported).
- About: an optional "buy me a coffee ☕" link to support bitScribbles — a
  plain link (no embedded script), and nowhere else in the app.

## 1.0.0-rc.6 — 8 October 2026

- Partly logged weeks are judged fairly. Unlogged days assume nothing, so a
  finished week is met (or beyond) with enough clear days logged, missed
  ("Partial") only if it couldn't have been met even with every unlogged day
  clear, and otherwise "Not enough logged" — a neutral, dashed tile. Logging
  the missing days settles it. A "Not enough logged" week ends a streak,
  isn't counted as met, and isn't a miss for "Back on track"; an unlogged
  week isn't a miss either.
- Trends → Intention shows weeks from the first logged week, including those
  before the first intention, as outlined tiles with their clear days —
  shown, not measured, and not counted in a month's tally. The week details
  say how many days were logged.
- Drinks are whole numbers everywhere (Trends, reports, baselines): .5 and
  under rounds down, over .5 rounds up. A typical day reads "About 1–2
  drinks", or "Up to 1 drink".

## 1.0.0-rc.5 — 7 October 2026

Fixes from testing on the Mac, and a tidier split between Trends and
Milestones.

- Windows that share a record (two tabs, or Chrome's tab and its installed
  app) now update each other straight away. And a tap always steps from the
  level that's stored, so an out-of-date window can no longer step a day
  from the wrong level. (Safari and its Dock app, or an iPhone browser and
  its Home Screen app, keep separate records and can't be linked.)
- Trends: the month you pick on the drinks or savings chart is compared with
  the month before it ("August: about 1 more drink a week than July"). It
  used to compare only the current month, whichever month was picked.
- Milestones and Trends no longer repeat each other. Trends holds the
  numbers; Milestones marks moments. "Money kept" (Trends shows estimated
  savings) and "This year" (Trends shows weeks met) are gone.
- Week streaks ("4-week streak") are milestones for everyone, and appear in
  Up next. They used to need the clear-day-streak setting, which now only
  affects clear-day streaks.
- A milestone just earned appears on Check-in, by its own name, with a link
  to Milestones and a ✕ to dismiss it. On first run, milestones already
  earned count as seen.
- Export and Import are now Back up and Restore (Settings, Help, onboarding
  and the backup reminder). "Export" is kept for a possible future research
  export. Old addresses still work.

## 1.0.0-rc.4 — 7 October 2026

Guidance that fits the device and browser in use.

- The app works out the device and browser (iPhone, iPad, Android, Mac,
  Windows, Linux; Safari, Chrome, Edge, Firefox, Samsung Internet) and says
  so on the welcome screen: "Looks like you're using an iPhone, in Chrome.
  Not right? Change". The choice is kept on this device (Settings → This
  device) and named in problem reports.
- The install step follows it: Share in Safari or Chrome on iPhone (with
  where the button is), File → Add to Dock in Safari on a Mac, the Install
  button or menu in Chrome and Edge, Samsung Internet's menu, and a bookmark
  in Firefox on a Mac. Each says whether the installed app shares the
  browser's record or keeps its own.
- Safari on a Mac: the app no longer says your days come with you when
  added to the Dock — a Dock app keeps its own record.
- Welcome: "Each phone or computer keeps its own record". The "Already
  added?" hint now covers the Mac Dock app too, with Spotlight.
- Reminders: no link on iPhone, iPad or Safari on a Mac, where a link opens
  the browser (a separate record) — the reminder is a nudge to open the app.
  The link stays where it opens the app: Android, and Chrome or Edge on a
  computer.
- The app's manifest lets Chrome and Edge (134+) open links to the app in
  the installed app.
- Help (installing, troubleshooting) and About (storage) follow the device.

## 1.0.0-rc.3 — 6 October 2026

- Money kept milestones now follow the savings estimate in Trends, at its
  low end: each logged day counts at the top of its range (A few as 2
  drinks, Moderate as 4, A lot as 6), so a milestone never claims more than
  Trends shows. Before, only clear days counted, so a tier could be awarded
  while Trends still showed less. Tiers recorded the old way are set aside
  once and re-earned the new way; from then on, earned tiers stay earned.
- iPhone: in a browser tab, the welcome screen says that a Home Screen copy
  keeps its own record, and how to find it (swipe down on the Home Screen
  and search). The tab can't tell that one exists. Help's install article
  says the same.

## 1.0.0-rc.2 — 6 October 2026

From the first tests on iPhone and Mac.

- Help → Contact: the "Send feedback" button's text was invisible (the
  same colour as the button). Contact now asks people not to include health
  or personal details beyond how to reach them, and says what a problem
  report includes.
- Onboarding no longer appears again once set up. The installed app could
  open on the onboarding address, and going through it again re-saved this
  week's intention, sounds and region.
- Onboarding's practice day shows its month and year, and says to tap it.
- Text fields and menus are 16px, so iPhone no longer zooms in on them (the
  Region menu in onboarding left the app zoomed).
- On a computer, Export saves the backup: Chrome and Edge ask where, other
  browsers put it in Downloads. It had opened the Mac share sheet, which
  can't save. Phones still use the share sheet.

## 0.1.0 — release candidate 1, 6 October 2026

First public build of the web app.
