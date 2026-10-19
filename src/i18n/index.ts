// The words the app shows, by language.
//
// Every piece of text lives in a language file (en.json, later de.json …) in
// the i18next JSON v4 format, which translation tools such as Crowdin and
// Weblate read: flat keys, {{name}} placeholders, and plural forms as
// key_one / key_other. Screens ask for text by key — t('checkin.today') —
// rather than holding words themselves. A key missing from a language falls
// back to English, so a language can ship before every line is translated.
//
// Inline markup (a link or bold word inside a sentence) is written as named
// tags in the text — "See <link>Resources</link>" — and filled in by rich().
//
// Help and the privacy page are whole pages per language instead (they read
// better that way); they aren't in these files.

import { Fragment, createElement, type ReactNode } from 'react';
import en from './en.json';

type Raw = keyof typeof en;
type Base<K> = K extends `${infer B}_one` ? B : K extends `${infer B}_other` ? B : K;
/** Every text key in English; plural forms are asked for by their base key with a count. */
export type Key = Base<Raw>;
export type Vars = Record<string, string | number>;

export type Lang = 'en' | 'de' | 'fr';
/** The languages on offer, each named in itself. */
export const LANGUAGES: readonly { code: Lang; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
];
type Words = Record<string, string>;
type Load = () => Promise<{ default: Words }>;
// English is bundled; other languages load when chosen, so nobody downloads
// words they won't see.
const LOADERS: Record<Exclude<Lang, 'en'>, Load> = {
  de: () => import('./de.json'),
  fr: () => import('./fr.json'),
};
// A region's own words, over its language's: only the lines that differ
// (Quebec says « fin de semaine » and « courriel »). Chosen by the region's
// country, as dates and money are.
const REGIONAL: Partial<Record<Lang, Record<string, { locale: string; load?: Load }>>> = {
  de: { at: { locale: 'de-AT' } },
  fr: { ca: { locale: 'fr-CA', load: () => import('./fr-CA.json') } },
};
const DEFAULT_LOCALE: Record<Lang, string> = { en: 'en', de: 'de-DE', fr: 'fr-FR' };
const MESSAGES: Partial<Record<Lang, Words>> = { en };
const REGIONAL_WORDS: Record<string, Words> = {};
let lang: Lang = 'en';
let country = '';
let active: Words = en;

/** This language's words, with the region's own lines over them. */
function activate() {
  const r = REGIONAL[lang]?.[country];
  active = { ...(MESSAGES[lang] ?? en), ...(r ? REGIONAL_WORDS[r.locale] : undefined) };
  if (typeof document !== 'undefined') document.documentElement.lang = locale();
}

export const language = (): Lang => lang;
/** Switches language, loading its words (and its regional lines) first. Call before the first render, or reload after. */
export async function setLanguage(l: Lang): Promise<void> {
  if (!MESSAGES[l] && l !== 'en') MESSAGES[l] = (await LOADERS[l]()).default;
  for (const r of Object.values(REGIONAL[l] ?? {})) if (r.load && !REGIONAL_WORDS[r.locale]) REGIONAL_WORDS[r.locale] = (await r.load()).default;
  lang = l;
  activate();
}
/** The region's country, for regional words and formats: Austria's German says "Jänner", Quebec's French "fin de semaine". */
export function setFormatCountry(c: string): void {
  country = c;
  activate();
}
/** The locale for dates, numbers and money in the current language ('en' means English as written). */
export const locale = (): string => REGIONAL[lang]?.[country]?.locale ?? DEFAULT_LOCALE[lang];

/** The language to use: the one chosen in Settings, or the device's first one we have, or English. */
export function pickLanguage(chosen: string, preferred: readonly string[]): Lang {
  const known = (code: string) => LANGUAGES.find((x) => x.code === code.toLowerCase().split('-')[0])?.code;
  return known(chosen) ?? preferred.map(known).find((x) => x !== undefined) ?? 'en';
}

function lookup(key: string, vars?: Vars): string {
  const own: Words = active;
  if (typeof vars?.count === 'number') {
    const form = new Intl.PluralRules(lang).select(vars.count);
    const hit = own[`${key}_${form}`] ?? own[`${key}_other`] ?? en[`${key}_${new Intl.PluralRules('en').select(vars.count)}` as Raw] ?? en[`${key}_other` as Raw];
    if (hit !== undefined) return hit;
  }
  return own[key] ?? (en as Record<string, string>)[key] ?? key;
}

/** Whether there's any text for a key, for optional text such as a help line's hours. */
export const hasText = (key: string): boolean => key in active || key in en;

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{\{(\w+)\}\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;

/** The text for a key, in the current language (English if it has none yet). */
export function t(key: Key, vars?: Vars): string {
  return fill(lookup(key, vars), vars);
}

/**
 * Text with inline markup: "Change it in <link>Settings</link>" with
 * { link: (words) => <Link to="/settings">{words}</Link> }. Placeholders may
 * be elements too: { region: <strong>Canada</strong> }.
 */
export function rich(
  key: Key,
  parts: Record<string, ((children: ReactNode) => ReactNode) | ReactNode | string | number>,
): ReactNode {
  const vars: Vars = {};
  for (const [k, v] of Object.entries(parts)) if (typeof v === 'string' || typeof v === 'number') vars[k] = v;
  return markup(lookup(key, vars), parts);
}

let seq = 0;
function markup(text: string, parts: Record<string, unknown>): ReactNode {
  const out: ReactNode[] = [];
  const re = /<(\w+)>([\s\S]*?)<\/\1>|\{\{(\w+)\}\}/g;
  let last = 0;
  for (let m; (m = re.exec(text)); last = re.lastIndex) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const wrap = parts[m[1]];
      const inner = markup(m[2], parts);
      out.push(typeof wrap === 'function' ? createElement(Fragment, { key: `t${seq++}` }, (wrap as (c: ReactNode) => ReactNode)(inner)) : inner);
    } else {
      const v = parts[m[3]];
      out.push(v === undefined ? m[0] : typeof v === 'function' ? m[0] : createElement(Fragment, { key: `v${seq++}` }, v as ReactNode));
    }
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 ? out[0] : out;
}
