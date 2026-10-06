import { Badge } from './Badge';

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
      {shown.map((t) => {
        const e = byTier.get(t);
        return e ? (
          <Badge key={t} size={size} glyph={glyph} title={title(t)} sub={`Reached ${formatDate(e.reachedIso)}`} earned />
        ) : (
          <Badge
            key={t}
            size={size}
            glyph={glyph}
            title={title(t)}
            sub={`${u(Math.floor(progress))} of ${u(t)}`}
            earned={false}
            progress={pct(t)}
          />
        );
      })}
    </>
  );
}
