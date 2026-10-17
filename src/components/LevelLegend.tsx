import './LevelLegend.css';
import { t } from '../i18n';

type Levels = { clear: number; 'a-few': number; moderate: number; 'a-lot': number };

/**
 * The four levels: with counts (the period's totals, shown once, in "at a
 * glance" on Trends and the report's summary), or as a plain key for the
 * stacked bars (By day of week, The days).
 * Moderate and A lot share the clay swatch, as they share a segment.
 */
export function LevelLegend({ levels }: { levels?: Levels }) {
  // Without counts it's a plain key for the bars (Trends shows the counts once, in "at a glance").
  const n = (k: keyof Levels) => (levels ? ` ${levels[k]}` : '');
  return (
    <p className="lvl-legend">
      <span><span className="lvl-sw lvl-clear" />{t('level.clear')}{n('clear')}</span>
      <span><span className="lvl-sw lvl-few" />{t('level.aFew')}{n('a-few')}</span>
      <span><span className="lvl-sw lvl-more" />{t('level.moderate')}{n('moderate')}</span>
      <span><span className="lvl-sw lvl-lot" />{t('level.aLot')}{n('a-lot')}</span>
    </p>
  );
}
