# Wording and languages

Every word the app shows is in `en.json`, except Help and the privacy page,
which are whole pages (each language will get its own) and the problem
report's device details, which stay in English for us to read.

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
   falls back to English.
2. Add it to `Lang` and `MESSAGES` in `index.ts`.
3. Choose it with `setLanguage`, from a Language setting in Settings. That
   setting isn't built yet: with one language there's nothing to choose, so
   it comes with the second.
