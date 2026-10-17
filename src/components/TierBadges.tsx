import { Badge } from './Badge';
import { t } from '../i18n';

type Earn = { tier: number; reachedIso: string };

type Props = {
  glyph: string;
  tiers: number[];
  earned: Earn[];
  /** How far along you are toward the next tier, in the tiers' units. */
  progress: number;
  title: (tier: number) => string;
  formatDate: (iso: string) => string;
  /** On the main screen: the latest tier earned plus the next. On All: every tier. */
  mode?: 'latest' | 'all';
  size?: 'main' | 'all';
  /** e.g. "$" for money: shown as "$310 of $500". */
  unit?: (n: number) => string;
};

/** A ladder of tiers: what's earned (with dates) and the next one in progress. */
export function TierBadges({ glyph, tiers, earned, progress, title, formatDate, mode = 'latest', size = 'main', unit }: Props) {
  const u = unit ?? ((n: number) => String(n));
  const byTier = new Map(earned.map((e) => [e.tier, e]));
  const next = tiers.find((t) => !byTier.has(t));
  const pct = (t: number) => Math.min(100, Math.round((progress / t) * 100));
  const shown = mode === 'all' ? tiers : [...earned.slice(-1).map((e) => e.tier), ...(next !== undefined ? [next] : [])];
  return (
    <>
      {shown.map((tier) => {
        const e = byTier.get(tier);
        return e ? (
          <Badge key={tier} size={size} glyph={glyph} title={title(tier)} sub={t('tier.reached', { date: formatDate(e.reachedIso) })} earned />
        ) : (
          <Badge
            key={tier}
            size={size}
            glyph={glyph}
            title={title(tier)}
            sub={t('tier.progress', { done: u(Math.floor(progress)), target: u(tier) })}
            earned={false}
            progress={pct(tier)}
          />
        );
      })}
    </>
  );
}
