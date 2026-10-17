# Wording and languages

Every word the app shows is in `en.json` (and `de.json`, `fr.json` …), except:

- **Help**: one file of articles per language in `src/help/` (`en.tsx`,
  `de.tsx`), written to read naturally rather than line by line. Same
  articles, ids and order in each (tested).
- **The privacy statement**: `public/privacy.html`, and `privacy-<lang>.html`
  per language; `privacyUrl()` in `src/lib/privacy.ts` picks the reader's.
- **The problem report's device details**, which stay in English for us to read.

- `t('key', { name: value })` gives the text, filling `{{name}}`.
- Plurals: `key_one` and `key_other` in the file, asked for as
  `t('key', { count: n })`. Other languages add the forms they need
  (`_few`, `_many` …), chosen by the browser's plural rules.
- Inline markup: `rich('key', { b: (c) => <strong>{c}</strong> })` for text
  like `"<b>Only here.</b> Your days …"`.
- Dates, month and weekday names and numbers come from `format.ts`, which
  uses the browser's built-in formats, so they need no translation.
- Help lines and links: numbers and addresses are in `src/resources/`, their
  names, hours and notes here under `res.<country>.<id>`.

The format (flat keys, `{{name}}`, `_one`/`_other`) is i18next's JSON v4, which
translation tools such as Weblate and Crowdin read.

## Adding a language

1. Copy `en.json` to `<lang>.json` and translate the values. A key left out
   falls back to English. Add `src/help/<lang>.tsx` (and to `BY_LANGUAGE` in
   `Help.tsx`) and `public/privacy-<lang>.html`, linked both ways.
2. Add it to `Lang` in `index.ts`.
3. Add it to `LANGUAGES` and `LOADERS` in `index.ts`; the Language setting in
   Settings lists it, and a device in that language gets it automatically.
4. Check every line keeps its blanks and markup (`test/i18n.test.ts` does this
   for German), and look at every screen in it:
   `SNAP_LANG=<lang> SNAP_WIDTH=320 python3 checks/snapshots.py <dir>`.

German: `de.json`, key terms in `glossary-de.md`. French: `fr.json`, key terms
in `glossary-fr.md`.

**Regional words and formats** follow the region's country (`REGIONAL` in
`index.ts`): Austria gets `de-AT` dates and money („Jänner“); Canada gets
`fr-CA` formats and Quebec's own lines from `fr-CA.json`, which holds only
the lines that differ from France's („fin de semaine“, „courriel“). A help
link can name its page in another language (`urls: { fr: … }` in
`src/resources/<country>.ts`).
