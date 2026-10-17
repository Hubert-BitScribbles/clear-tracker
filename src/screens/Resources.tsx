import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SegmentNav } from '../components/SegmentNav';
import { getSetting } from '../data/database';
import { deviceTimeZone, parseRegion, regionLabel, type Region } from '../lib/regions';
import { checkedFor, dialable, resourcesFor, type Line } from '../lib/resources';
import './Support.css';
import { rich, t } from '../i18n';

// Resources: where to find help, for the region set in Settings. Checked
// against official sources (see src/resources). The second half of
// Help | Resources.

export const HelpNav = ({ active }: { active: 'help' | 'resources' }) => (
  <SegmentNav
    label={t('helpNav.label')}
    current={active === 'help' ? t('helpNav.help') : t('helpNav.resources')}
    items={[{ to: '/settings/help', text: t('helpNav.help') }, { to: '/settings/resources', text: t('helpNav.resources') }]}
  />
);

function LineCard({ line }: { line: Line }) {
  return (
    <div className="sp-line">
      <p className="sp-line-name">{line.name}</p>
      <div className="sp-actions">
        {line.call && (
          <a className="sp-action" href={`tel:${dialable(line.call)}`}>{t('resources.call', { number: line.call })}</a>
        )}
        {line.text && (
          <a className="sp-action" href={`sms:${line.text.to}${line.text.word ? `?&body=${encodeURIComponent(line.text.word)}` : ''}`}>
            {(() => {
              const number = line.text.to.length > 6 ? line.text.to.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4') : line.text.to;
              return line.text.word ? t('resources.textWord', { word: line.text.word, number }) : t('resources.text', { number });
            })()}
          </a>
        )}
      </div>
      {line.hours && <p className="sp-line-meta">{line.hours}</p>}
      {line.note && <p className="sp-line-meta">{line.note}</p>}
    </div>
  );
}

export function Resources() {
  const [region, setRegion] = useState<Region | null>(null);
  useEffect(() => {
    getSetting('region', '').then((raw) => setRegion(parseRegion(raw, deviceTimeZone())));
  }, []);
  const { hash } = useLocation();
  useEffect(() => {
    // From Help's "what counts as one drink" link.
    if (region && hash === '#drink') document.getElementById('drink')?.scrollIntoView({ block: 'start' });
  }, [region, hash]);
  if (!region) return <main className="support" />;
  const r = resourcesFor(region.country, region.province, region.nation);

  return (
    <main className="support">
      <h1 className="sp-title">{t('resources.title')}</h1>
      <HelpNav active="resources" />
      <p className="sp-lede">
        {rich('resources.for', { region: regionLabel(region), b: (c) => <strong>{c}</strong>, link: (c) => <Link to="/settings#region">{c}</Link> })}
      </p>

      <section className="card sp-urgent" aria-labelledby="sp-now">
        <h2 id="sp-now" className="sp-urgent-title">{t('resources.danger')}</h2>
        <a className="sp-action sp-action-strong" href={`tel:${r.emergency}`}>{t('resources.call', { number: r.emergency })}</a>
      </section>

      <h2 className="sp-sec">{t('resources.talk')}</h2>
      <div className="card sp-card">{r.talk.map((l) => <LineCard key={l.name} line={l} />)}</div>

      <h2 className="sp-sec">{t('resources.drinking')}</h2>
      <p className="sp-caution">{t('resources.caution')}</p>
      <div className="card sp-card">{r.drinking.map((l) => <LineCard key={l.name} line={l} />)}</div>

      <h2 className="sp-sec">{t('resources.programmes')}</h2>
      <div className="card sp-card">
        {r.programmes.map((p) => (
          <div key={p.name} className="sp-line">
            <a className="sp-prog" href={p.url} target="_blank" rel="noopener noreferrer">{p.name} ↗</a>
            <p className="sp-line-meta">{p.note}</p>
          </div>
        ))}
        <p className="sp-foot">{t('resources.optionsNote')}</p>
      </div>

      {r.drinkGuide && (
        <>
          <h2 id="drink" className="sp-sec">{t('resources.oneDrink')}</h2>
          <div className="card sp-card">
            <div className="sp-line">
              <a className="sp-prog" href={r.drinkGuide.url} target="_blank" rel="noopener noreferrer">{r.drinkGuide.name} ↗</a>
              <p className="sp-line-meta">{r.drinkGuide.note}</p>
            </div>
            <p className="sp-foot">{t('resources.oneDrinkNote')}</p>
          </div>
        </>
      )}

      <p className="sp-checked">
        {rich('resources.checked', { date: checkedFor(region.country, region.province, region.nation), link: (c) => <Link to="/settings/help?topic=contact">{c}</Link> })}
      </p>
    </main>
  );
}
