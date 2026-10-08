# Changelog

The version shows in Settings → About and in "Report a problem", so a report
can be matched to what was live. The number lives in `package.json`; update it
on the branch, before merging.

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
