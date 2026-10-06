# Clear Tracker — web

Plain React + TypeScript, built with Vite. See `clear-tracker-porting-plan.md`.

## Run it

    npm install
    npm run dev        # http://localhost:5173
    npm run build      # static site in dist/
    npm run preview    # serve the built site locally
    npm test           # data-layer tests, run in four time zones

To try it on your phone, on the same Wi-Fi:

    npm run phone      # builds, then serves the built app on your network

and open the "Network" address it prints (port 4173). That's the fast way:
the built app is about 260 KB in 8 files, against 6 MB in 60+ files from
the dev server (`npm run dev -- --host`, port 5173), which is slow over
Wi-Fi. `npm run phone` doesn't update as you edit; run it again after
changes.

## Layout

    index.html                 pre-paint script: applies theme before first paint
    src/
      main.tsx                 entry; brand fonts (Latin subsets, bundled for offline)
      App.tsx                  routes + tab bar (HashRouter: #/trends etc.)
      styles/tokens.css        colour tokens: theme.ts's 4 palettes, same names
      styles/base.css          reset, type, shared .card / .btn / .chip
      theme/appearance.ts      theme + high-contrast preference (localStorage)
      theme/AppearanceContext  useAppearance() hook
      components/              TabBar, Screen, Byline, DayCell, Badge, TierBadges, LevelLegend,
                               IntentionChart, SegmentNav,
                               SavingsCard
      lib/sounds.ts            one sound per logged level
      lib/install.ts           Home Screen install, persistent storage
      lib/regions.ts           regions (country, province)
      lib/resources.ts         help lines and programmes by region (with sources)
      lib/support.ts           feedback and problem reports by email
      assets/                  app icon, sounds
      data/dates.ts            all date maths (UTC-safe; the only place it lives)
      data/db.ts               Dexie schema + shared initialisation
      data/compute.ts          all computation, as pure functions
      data/database.ts         the API screens use — native function names
      data/milestones.ts       milestones added for the web version
      data/backup.ts           encrypted backup format (Web Crypto)
      data/report.ts           month / year in review
      data/baseline.ts         first-3-months baseline; momentum
      data/challenges.ts       opt-in challenges (weekend, week, a chosen month)
      data/timeline.ts         everything earned, dated; Up next
      data/trend.ts            monthly rates; month, 3- and 6-month changes
      screens/                 CheckIn, Trends, Milestones, AllMilestones, Settings, About,
                               Intention, Onboarding, Export, Import (ported);
                               Review (month/year in review);
                               ColourReference
                               (dev only, #/dev/colours)
    test/
      native/database.native.ts   the ORIGINAL native file, unmodified
      native/expo-sqlite-shim.ts  runs it on real SQLite in Node
      differential.test.ts        native vs port on identical data
      writes.test.ts              the tap cycle and storage
      upgrade.test.ts             database version 1 → 2
      trends.test.ts              days available; day-of-week and month counts
      screens.test.ts             intention date maths; About region from time zone
      backup.test.ts              encryption, round trip, wrong passphrase, tampering
      report.test.ts              month/year in review, against Trends
      nudge.test.ts               the 30-day backup reminder
      baseline.test.ts            measured baseline, momentum, Money kept kept
      challenges.test.ts          challenges, runs and start dates; the baseline skip
      timeline.test.ts            the earned list, Up next, agreement with the report
      trend.test.ts               trend rates, changes and their wording
      resources.test.ts           every region has its lines, programmes and links
      savings.test.ts             savings estimate and its wording
      streaks.test.ts             best streaks by year; earnable tier list
      milestones.test.ts          earned-for-good tiers; longest logging run
      new-milestones.test.ts      back on track, kept to a few, best month, money, this year

## Colour system rules in code

- Token names and values are theme.ts's, camelCase → kebab-case
  (`onCardMuted` → `--on-card-muted`). Components never use raw hex.
- Modes are attributes on `<html>`: `data-theme="light|dark"` and
  `data-contrast="normal|high"`. "System" is resolved in JavaScript, so
  there is a single dark block in tokens.css.
- Marks (dot, ticks, dash, ✓, ✦) are sized by tokens so high contrast can
  enlarge them in one place.

## Data layer

Screens import from `src/data/database.ts`, which keeps the native
function names and signatures. The differential test runs the original
native `database.ts` on real SQLite beside the port and requires identical
answers from every function, across many dates (clock changes, year ends,
week boundaries) and four time zones. Two functions intentionally differ,
because the native versions have time-zone bugs; see FIX in compute.ts.

## Logging sounds

`src/assets/sounds/`: `clear-chime.wav` (Clear), `a-few-tone.wav` (A few),
`moderate-tone.wav` (Moderate), `drinking-hum.wav` (A lot). The middle two
are the chime pitched down three semitones and the hum pitched up four, so
the four tones step from bright to low.

## Installable and offline

`vite-plugin-pwa` builds a web app manifest and a service worker
(`npm run build`; not active under `npm run dev`). The service worker
caches the whole app — code, fonts, icons, sounds — on first visit, so it
works offline, and updates itself in the background when a new version is
deployed. Installing to the Home Screen needs the app served over https
(any static host); a local network address can't do it.

## Deploying (Cloudflare Pages)

Served at **https://cleartracker.bitscribbles.com** (its own subdomain, so
its stored data never shares an address with the other bitScribbles apps;
bitscribbles.ca forwards to .com and never serves the app). Cloudflare Pages
builds from this repository on every push to `main`:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` (includes the type check) |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION` = `22` |

Routing uses `#/…` addresses, so no server rewrite rules are needed. Leave
Cloudflare's one-click Web Analytics **off** for this project: usage counts
are to be opt-in, loaded by the app itself only after a user agrees.

**Never change the address once people use it:** a browser keeps the app's
data by its exact address, so a new address starts every user from empty.

## Licence

The code is MIT-licensed — see [LICENSE](LICENSE). The names "Clear Tracker"
and "bitScribbles" and the logos aren't covered by it, and the bundled fonts
keep their SIL Open Font License.
