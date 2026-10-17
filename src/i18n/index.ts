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

export type Lang = 'en';
const MESSAGES: Record<Lang, Record<string, string>> = { en };
let lang: Lang = 'en';

export const language = (): Lang => lang;
export function setLanguage(l: Lang): void {
  lang = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

function lookup(key: string, vars?: Vars): string {
  const own = MESSAGES[lang];
  if (typeof vars?.count === 'number') {
    const form = new Intl.PluralRules(lang).select(vars.count);
    const hit = own[`${key}_${form}`] ?? own[`${key}_other`] ?? en[`${key}_${new Intl.PluralRules('en').select(vars.count)}` as Raw] ?? en[`${key}_other` as Raw];
    if (hit !== undefined) return hit;
  }
  return own[key] ?? (en as Record<string, string>)[key] ?? key;
}

/** Whether there's any text for a key, for optional text such as a help line's hours. */
export const hasText = (key: string): boolean => key in MESSAGES[lang] || key in en;

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
