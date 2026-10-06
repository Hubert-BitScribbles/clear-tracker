import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSavingsEstimate, getSavingsSettings, type FirstThreeMonths, type SavingsEstimate, type SavingsSettings } from '../data/database';
import { describeSavings, priceText } from '../lib/savings';
import { monthPhrase } from '../lib/challengeText';
import { MonthlyChart } from './MonthlyChart';
import { challengeNote, ML, savingsChangeText, type DrinksTrend } from '../lib/trendText';
import './SavingsCard.css';

// Estimated savings against a baseline: one the user types, or measured
// from their first 3 months of tracking. Set in Settings; SavingsSetup (the
// form) is used there.

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (iso: string) => `${SHORT[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;

/** "about 11 drinks a week, from your first 3 months (Apr 4, 2026 – Jul 3, 2026)" */
export function baselineText(s: SavingsSettings): string {
  if (!s.effective) return '';
  const n = Math.round(s.effective.baselinePerWeek * 10) / 10;
  const drinks = `about ${n} drink${n === 1 ? '' : 's'} a week`;
  return s.source === 'first3' && s.first3.status === 'ready'
    ? `${drinks}, from your first 3 months (${fmt(s.first3.start)} – ${fmt(s.first3.end)}${s.first3.skipped.length ? `, after ${s.first3.skipped.map(monthPhrase).join(' and ')}` : ''})`
    : `${drinks} before tracking`;
}

/** Why "first 3 months" isn't available yet. */
export function first3WaitingText(f: FirstThreeMonths): string {
  if (f.status === 'none') return 'Available once you’ve logged your first 3 months.';
  if (f.status !== 'waiting') return '';
  return f.complete
    ? `Not enough of your first 3 months was logged (${f.logged} of ${f.needed} days needed).`
    : `Available after ${fmt(f.end)}, if at least ${f.needed} of those days are logged (${f.logged} so far).`;
}

type Props = { scope: number | 'all'; scopeLabel: string; trend?: DrinksTrend };

export function SavingsCard({ scope, scopeLabel, trend }: Props) {
  const [settings, setSettings] = useState<SavingsSettings | null>(null);
  const [est, setEst] = useState<SavingsEstimate | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSavingsSettings().then(async (s) => {
      if (cancelled) return;
      setSettings(s);
      if (s.effective) {
        const e = await getSavingsEstimate(s.effective.baselinePerWeek, scope);
        if (!cancelled) setEst(e);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  if (!settings) return null;
  if (!settings.effective) {
    const waiting = settings.source === 'first3' && settings.price !== null;
    return (
      <div className="card sv-card">
        <p className="sv-setup-title">{waiting ? 'Your first 3 months aren’t measured yet' : 'Estimate your savings'}</p>
        <p className="sv-basis">
          {waiting
            ? first3WaitingText(settings.first3)
            : 'Two rough numbers are enough: how many drinks you had in a typical week before tracking, and what a drink usually costs you. Or measure the first from your first 3 months.'}
        </p>
        <Link className="sv-change" to="/settings#savings">{waiting ? 'Change in Settings' : 'Set up in Settings'}</Link>
      </div>
    );
  }
  if (!est) return null;
  const { price } = settings.effective;
  const most = est.mostDrinks * price;
  const least = est.leastDrinks === null ? null : est.leastDrinks * price;
  const weeks = est.loggedDays / 7;
  const perWeek = est.loggedDays >= 7 ? describeSavings(most / weeks, least === null ? null : least / weeks, true) : null;

  return (
    <div className="card sv-card">
      {est.loggedDays === 0 ? (
        <p className="sv-value">No days logged · {scopeLabel}</p>
      ) : (
        <>
          <p className="sv-value">{describeSavings(most, least)}</p>
          {perWeek && <p className="sv-week">{perWeek}</p>}
        </>
      )}
      {trend && (
        <>
          <MonthlyChart
            kind="bars"
            name={`Months of ${scopeLabel}: estimated amount saved`}
            format={(v) => `${v < 0 ? '−' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-CA')}`}
            points={trend.points.map((p) => ({
              label: ML[p.month - 1].slice(0, 3),
              full: `${ML[p.month - 1]} ${p.year}`,
              soFar: p.soFar,
              // Saved that month: (baseline − drinks a week) × weeks logged × price. Below zero = over baseline.
              value: p.perWeek === null ? null : ((settings.effective!.baselinePerWeek - p.perWeek) / 7) * p.logged * price,
            }))}
            detail={(pt, i) => {
              const p = trend.points[i];
              if (pt.value === null) {
                return <p className="mc-detail-line">Not enough logged days for an estimate ({p.logged} logged; 7 needed).</p>;
              }
              const d = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString('en-CA')}`;
              const weekly = pt.value / (p.logged / 7);
              return (
                <>
                  <p className="mc-detail-line">{pt.value >= 0 ? `About ${d(pt.value)} saved` : `About ${d(pt.value)} over baseline`}</p>
                  <p className="mc-detail-line">
                    {weekly >= 0 ? `About ${d(weekly)} a week` : `About ${d(weekly)} a week over baseline`} · {p.logged} days logged
                  </p>
                </>
              );
            }}
          />
          {(trend.month || trend.three || trend.six) && (
            <ul className="sv-trends">
              {trend.month && (
                <li>{savingsChangeText(`${ML[trend.month.month - 1]}${trend.month.soFar ? ' so far' : ''}`, trend.month.diff, price, ML[trend.month.vsMonth - 1])}</li>
              )}
              {trend.three && <li>{savingsChangeText('Last 3 months', trend.three.diff, price, 'the 3 before')}{challengeNote(trend.notes.three)}</li>}
              {trend.six && <li>{savingsChangeText('Last 6 months', trend.six.diff, price, 'the 6 before')}{challengeNote(trend.notes.six)}</li>}
            </ul>
          )}
        </>
      )}
      <p className="sv-basis">
        Based on {baselineText(settings)}, at {priceText(price)} a drink. {est.loggedDays} logged day
        {est.loggedDays === 1 ? '' : 's'}; unlogged days aren't counted. "A lot" counts as 5 drinks, so any period with
        one shows "up to" or "at least".
      </p>
      <div className="sv-links">
        <Link className="sv-change" to="/settings#savings">Change baseline or price</Link>
        <Link className="sv-change" to="/settings/help?topic=estimates">How is this calculated?</Link>
      </div>
    </div>
  );
}

export function SavingsSetup({
  initialSource,
  initialBaseline,
  initialPrice,
  first3,
  canCancel,
  onCancel,
  onSave,
}: {
  initialSource: 'entered' | 'first3';
  initialBaseline: number | null;
  initialPrice: number | null;
  first3: FirstThreeMonths;
  canCancel: boolean;
  onCancel: () => void;
  onSave: (source: 'entered' | 'first3', baseline: number | null, price: number) => void;
}) {
  const id = useId();
  const [source, setSource] = useState(initialSource);
  const [b, setB] = useState(initialBaseline === null ? '' : String(initialBaseline));
  const [p, setP] = useState(initialPrice === null ? '' : String(initialPrice));
  const [error, setError] = useState('');
  const first3Ready = first3.status === 'ready';

  function save() {
    const pn = Number(p.replace(/^\$/, ''));
    let bn: number | null = null;
    if (source === 'entered') {
      bn = Number(b);
      if (b.trim() === '' || !Number.isFinite(bn) || bn < 0 || bn > 200) {
        setError('Enter drinks a week as a number from 0 to 200.');
        return;
      }
    }
    if (p.trim() === '' || !Number.isFinite(pn) || pn <= 0 || pn > 1000) {
      setError('Enter the price of a drink, e.g. 8 or 8.50.');
      return;
    }
    setError('');
    onSave(source, bn, Math.round(pn * 100) / 100);
  }

  return (
    <div className="card sv-card">
      <p className="sv-setup-title">Estimate your savings</p>
      <fieldset className="sv-source">
        <legend className="sv-field-label">Baseline: drinks in a typical week</legend>
        <label className="sv-radio">
          <input type="radio" name={`${id}-src`} checked={source === 'entered'} onChange={() => setSource('entered')} />
          <span>A number I enter (before tracking)</span>
        </label>
        <label className="sv-radio" data-disabled={!first3Ready || undefined}>
          <input type="radio" name={`${id}-src`} checked={source === 'first3'} disabled={!first3Ready} onChange={() => setSource('first3')} />
          <span>
            Measured from my first 3 months
            <span className="sv-radio-note">
              {first3Ready && first3.status === 'ready'
                ? `About ${Math.round(first3.perWeek * 10) / 10} drinks a week (${first3.logged} logged days${first3.skipped.length ? `; starts after ${first3.skipped.map(monthPhrase).join(' and ')}` : ''})`
                : first3WaitingText(first3)}
            </span>
          </span>
        </label>
      </fieldset>
      <div className="sv-fields">
        {source === 'entered' && (
          <label className="sv-field" htmlFor={`${id}-b`}>
            <span>Drinks a week, before</span>
            <input id={`${id}-b`} inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} placeholder="e.g. 14" />
          </label>
        )}
        <label className="sv-field" htmlFor={`${id}-p`}>
          <span>Price per drink ($)</span>
          <input id={`${id}-p`} inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} placeholder="e.g. 9" />
        </label>
      </div>
      {error && <p className="sv-error" role="alert">{error}</p>}
      <div className="sv-actions">
        <button type="button" className="btn btn-primary" onClick={save}>Save</button>
        {canCancel && <button type="button" className="sv-change" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}
