import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSavingsEstimate, getSavingsSettings, type FirstThreeMonths, type SavingsEstimate, type SavingsSettings } from '../data/database';
import { currencySymbol, describeSavings, money, parseAmount, priceText } from '../lib/savings';
import { monthPhrase } from '../lib/challengeText';
import { MonthlyChart } from './MonthlyChart';
import { wholeDrinks } from '../lib/reportText';
import { challengeNote, monthVsPrevious, savingsChangeText, type DrinksTrend } from '../lib/trendText';
import './SavingsCard.css';
import { t } from '../i18n';
import { andList, dayMonthYear, monthName, monthYear } from '../i18n/format';

// Estimated savings against a baseline: one the user types, or measured
// from their first 3 months of tracking. Set in Settings; SavingsSetup (the
// form) is used there.

const fmt = dayMonthYear;

/** "about 11 drinks a week, from your first 3 months (Apr 4, 2026 – Jul 3, 2026)" */
export function baselineText(s: SavingsSettings): string {
  if (!s.effective) return '';
  const n = wholeDrinks(s.effective.baselinePerWeek);
  const drinks = t('savings.drinksAWeek', { count: n });
  return s.source === 'first3' && s.first3.status === 'ready'
    ? t('savings.baselineFirst3', {
        drinks, start: fmt(s.first3.start), end: fmt(s.first3.end),
        skipped: s.first3.skipped.length ? t('savings.baselineFirst3After', { months: andList(s.first3.skipped.map(monthPhrase)) }) : '',
      })
    : t('savings.baselineEntered', { drinks });
}

/** Why "first 3 months" isn't available yet. */
export function first3WaitingText(f: FirstThreeMonths): string {
  if (f.status === 'none') return t('savings.first3None');
  if (f.status !== 'waiting') return '';
  return f.complete
    ? t('savings.first3Short', { logged: f.logged, needed: f.needed })
    : t('savings.first3Waiting', { date: fmt(f.end), needed: f.needed, logged: f.logged });
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
        <p className="sv-setup-title">{waiting ? t('savings.first3NotYet') : t('savings.title')}</p>
        <p className="sv-basis">
          {waiting
            ? first3WaitingText(settings.first3)
            : t('savings.intro')}
        </p>
        <Link className="sv-change" to="/settings#savings">{waiting ? t('savings.changeInSettings') : t('savings.setUpInSettings')}</Link>
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
        <p className="sv-value">{t('savings.noDays', { scope: scopeLabel })}</p>
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
            name={t('savings.chartName', { scope: scopeLabel })}
            format={(v) => `${v < 0 ? '−' : ''}${money(v)}`}
            points={trend.points.map((p) => ({
              label: monthName(p.month, 'short'),
              full: monthYear(p.month, p.year),
              soFar: p.soFar,
              // Saved that month: (baseline − drinks a week) × weeks logged × price. Below zero = over baseline.
              value: p.perWeek === null ? null : ((settings.effective!.baselinePerWeek - p.perWeek) / 7) * p.logged * price,
            }))}
            detail={(pt, i) => {
              const p = trend.points[i];
              if (pt.value === null) {
                return <p className="mc-detail-line">{t('savings.notEnough', { logged: p.logged })}</p>;
              }
              const weekly = pt.value / (p.logged / 7);
              return (
                <>
                  <p className="mc-detail-line">{pt.value >= 0 ? t('savings.monthSaved', { amount: money(pt.value) }) : t('savings.monthOver', { amount: money(pt.value) })}</p>
                  <p className="mc-detail-line">
                    {weekly >= 0 ? t('savings.weekSaved', { amount: money(weekly) }) : t('savings.weekOver', { amount: money(weekly) })} · {t('savings.daysLogged', { count: p.logged })}
                  </p>
                  {(() => {
                    const c = monthVsPrevious(p);
                    return c && <p className="mc-detail-line">{savingsChangeText(null, c.diff, price, c.vs)}</p>;
                  })()}
                </>
              );
            }}
          />
          {(trend.three || trend.six) && (
            <ul className="sv-trends">
              {trend.three && <li>{savingsChangeText(t('savings.last3'), trend.three.diff, price, t('savings.the3Before'))}{challengeNote(trend.notes.three)}</li>}
              {trend.six && <li>{savingsChangeText(t('savings.last6'), trend.six.diff, price, t('savings.the6Before'))}{challengeNote(trend.notes.six)}</li>}
            </ul>
          )}
        </>
      )}
      <p className="sv-basis">
        {t('savings.basis', { baseline: baselineText(settings), price: priceText(price), count: est.loggedDays })}
      </p>
      <div className="sv-links">
        <Link className="sv-change" to="/settings#savings">{t('savings.changeBaseline')}</Link>
        <Link className="sv-change" to="/settings/help?topic=estimates">{t('savings.howCalculated')}</Link>
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
    const pn = parseAmount(p);
    let bn: number | null = null;
    if (source === 'entered') {
      bn = parseAmount(b);
      if (b.trim() === '' || !Number.isFinite(bn) || bn < 0 || bn > 200) {
        setError(t('savings.errorBaseline'));
        return;
      }
    }
    if (p.trim() === '' || !Number.isFinite(pn) || pn <= 0 || pn > 1000) {
      setError(t('savings.errorPrice'));
      return;
    }
    setError('');
    onSave(source, bn, Math.round(pn * 100) / 100);
  }

  return (
    <div className="card sv-card">
      <p className="sv-setup-title">{t('savings.title')}</p>
      <fieldset className="sv-source">
        <legend className="sv-field-label">{t('savings.baselineLegend')}</legend>
        <label className="sv-radio">
          <input type="radio" name={`${id}-src`} checked={source === 'entered'} onChange={() => setSource('entered')} />
          <span>{t('savings.sourceEntered')}</span>
        </label>
        <label className="sv-radio" data-disabled={!first3Ready || undefined}>
          <input type="radio" name={`${id}-src`} checked={source === 'first3'} disabled={!first3Ready} onChange={() => setSource('first3')} />
          <span>
            {t('savings.sourceFirst3')}
            <span className="sv-radio-note">
              {first3Ready && first3.status === 'ready'
                ? t('savings.first3Ready', {
                    drinks: wholeDrinks(first3.perWeek), logged: first3.logged,
                    skipped: first3.skipped.length ? t('savings.first3StartsAfter', { months: andList(first3.skipped.map(monthPhrase)) }) : '',
                  })
                : first3WaitingText(first3)}
            </span>
          </span>
        </label>
      </fieldset>
      <div className="sv-fields">
        {source === 'entered' && (
          <label className="sv-field" htmlFor={`${id}-b`}>
            <span>{t('savings.drinksBefore')}</span>
            <input id={`${id}-b`} inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} placeholder={t('savings.drinksPlaceholder')} />
          </label>
        )}
        <label className="sv-field" htmlFor={`${id}-p`}>
          <span>{t('savings.pricePerDrink', { symbol: currencySymbol() })}</span>
          <input id={`${id}-p`} inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} placeholder={t('savings.pricePlaceholder')} />
        </label>
      </div>
      {error && <p className="sv-error" role="alert">{error}</p>}
      <div className="sv-actions">
        <button type="button" className="btn btn-primary" onClick={save}>{t('common.save')}</button>
        {canCancel && <button type="button" className="sv-change" onClick={onCancel}>{t('common.cancel')}</button>}
      </div>
    </div>
  );
}
