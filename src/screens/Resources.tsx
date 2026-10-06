import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SegmentNav } from '../components/SegmentNav';
import { getSetting } from '../data/database';
import { deviceTimeZone, parseRegion, regionLabel, type Region } from '../lib/regions';
import { CHECKED, dialable, resourcesFor, type Line } from '../lib/resources';
import './Support.css';

// Resources: where to find help, for the region set in Settings. Checked
// against official sources (see lib/resources.ts). The second half of
// Help | Resources.

export const HelpNav = ({ active }: { active: 'help' | 'resources' }) => (
  <SegmentNav
    label="Help and resources"
    current={active === 'help' ? 'Help' : 'Resources'}
    items={[{ to: '/settings/help', text: 'Help' }, { to: '/settings/resources', text: 'Resources' }]}
  />
);

function LineCard({ line }: { line: Line }) {
  return (
    <div className="sp-line">
      <p className="sp-line-name">{line.name}</p>
      <div className="sp-actions">
        {line.call && (
          <a className="sp-action" href={`tel:${dialable(line.call)}`}>Call {line.call}</a>
        )}
        {line.text && (
          <a className="sp-action" href={`sms:${line.text.to}${line.text.word ? `?&body=${encodeURIComponent(line.text.word)}` : ''}`}>
            Text {line.text.word ? `${line.text.word} to ` : ''}{line.text.to.length > 6 ? line.text.to.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4') : line.text.to}
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
  if (!region) return <main className="support" />;
  const r = resourcesFor(region.country, region.province);

  return (
    <main className="support">
      <h1 className="sp-title">Resources</h1>
      <HelpNav active="resources" />
      <p className="sp-lede">
        For <strong>{regionLabel(region)}</strong>. <Link to="/settings#region">Change region in Settings</Link>
      </p>

      <section className="card sp-urgent" aria-labelledby="sp-now">
        <h2 id="sp-now" className="sp-urgent-title">If you're in danger now</h2>
        <a className="sp-action sp-action-strong" href={`tel:${r.emergency}`}>Call {r.emergency}</a>
      </section>

      <h2 className="sp-sec">Someone to talk to, any time</h2>
      <div className="card sp-card">{r.talk.map((l) => <LineCard key={l.name} line={l} />)}</div>

      <h2 className="sp-sec">Help with drinking</h2>
      <div className="card sp-card">{r.drinking.map((l) => <LineCard key={l.name} line={l} />)}</div>

      <h2 className="sp-sec">Programmes and information</h2>
      <div className="card sp-card">
        {r.programmes.map((p) => (
          <div key={p.name} className="sp-line">
            <a className="sp-prog" href={p.url} target="_blank" rel="noopener noreferrer">{p.name} ↗</a>
            <p className="sp-line-meta">{p.note}</p>
          </div>
        ))}
        <p className="sp-foot">Listed as options, not recommendations: there's no one right path. Opens in your browser.</p>
      </div>

      <p className="sp-checked">
        Numbers checked {CHECKED} against official sources. If one doesn't work,{' '}
        <Link to="/settings/help?topic=contact">please let us know</Link>. Clear Tracker isn't a medical service.
      </p>
    </main>
  );
}
