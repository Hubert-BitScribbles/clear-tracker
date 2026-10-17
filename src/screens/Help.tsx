import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDevice } from '../components/DeviceFields';
import { platform } from '../lib/install';
import { articles as en } from '../help/en';
import { articles as de } from '../help/de';
import { articles as fr } from '../help/fr';
import { HelpNav } from './Resources';
import './Support.css';
import { language, rich, t } from '../i18n';

// Help: short articles, the first half of Help | Resources. Each has an id,
// so other screens can link straight to one (/settings/help?topic=estimates).
// The articles are in src/help, one file per language. Where iPhone and
// Android differ (installing, storage, where backups go, sounds, PDFs), each
// reader sees their own device's wording.

const BY_LANGUAGE = { en, de, fr };

export function Help() {
  const dev = useDevice();
  const ARTICLES = BY_LANGUAGE[language()]({ d: dev, P: platform(dev) });
  const [params] = useSearchParams();
  const topic = params.get('topic');
  const [query, setQuery] = useState('');
  const opened = useRef(false);

  // A link to a topic opens that article and scrolls to it.
  useEffect(() => {
    if (!topic || opened.current) return;
    const el = document.getElementById(`help-${topic}`) as HTMLDetailsElement | null;
    if (el) {
      el.open = true;
      el.scrollIntoView({ block: 'start' });
      opened.current = true;
    }
  }, [topic]);

  const q = query.trim().toLowerCase();
  const shown = q ? ARTICLES.filter((a) => `${a.title} ${a.keywords}`.toLowerCase().includes(q)) : ARTICLES;

  return (
    <main className="support">
      <h1 className="sp-title">{t('helpNav.help')}</h1>
      <HelpNav active="help" />
      <label className="sr-only" htmlFor="help-search">{t('help.searchLabel')}</label>
      <input id="help-search" className="sp-search" type="search" placeholder={t('help.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
      {q && <p className="sp-lede" role="status">{shown.length ? t('help.results', { count: shown.length }) : t('help.noMatch')}</p>}
      <div className="card sp-articles">
        {(shown.length ? shown : ARTICLES.filter((a) => a.id === 'contact')).map((a) => (
          <details key={a.id} id={`help-${a.id}`} className="sp-article">
            <summary>{a.title}</summary>
            <div className="sp-body">{a.body}</div>
          </details>
        ))}
      </div>
      <p className="sp-checked">
        {rich('help.footer', { link: (c) => <Link to="/settings/resources">{c}</Link> })}
      </p>
    </main>
  );
}
