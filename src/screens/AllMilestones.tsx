import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { TierBadges } from '../components/TierBadges';
import { monthStatusText, monthTitle } from '../lib/challengeText';
import {
  BACK_ON_TRACK_TIERS,
  BEYOND_TARGET_TIERS,
  CLEAR_DAY_TIERS,
  HONEST_LOGGING_TIERS,
  KEPT_TO_A_FEW_TIERS,
  tiersFrom,
  getMilestoneExtras,
  getChallengeStatus,
  WEEK_TIERS,
  WEEKEND_TIERS,
  computeMilestones,
  getClearDatesOrdered,
  getClearTierEarnings,
  getCurrentStreak,
  getLoggingTierEarnings,
  getLongestLoggingRun,
  getStreakTierFirsts,
  LOGGING_TIERS,
  STREAK_TIERS_WEEKS,
  type ClearTierEarn,
  type LoggingTierEarn,
  type MilestonesData,
  type StreakTierEarn,
} from '../data/database';
import './Milestones.css';
import { t } from '../i18n';
import { dayMonth, monthYear } from '../i18n/format';

// Port of the native app/all-milestones.tsx. Differences:
// - FIX: the week-streak tiers listed are the ones that can be earned
//   (native listed some, e.g. 104 weeks, that never could; see compute.ts).
// - FIX: the "Scaled to…" note under Consistency is hidden with its
//   section (native showed it on its own when the section was off).
// - CHANGE: clear-day and streak milestones are fixed numbers for everyone
//   (7, 14, 30, 50, 100… clear days; 2, 4, 8, 13, 26, 52 weeks), instead of
//   native's scaling by the intention. "Clear days this year" was dropped:
//   it duplicated the all-time count with different numbers.
// - "Showing up" progress counts the longest run ever, not the current run.
// - Earned badges and chips stay visible in dark mode (tokens.css).
// - New (web): Coming back, Kept it to a few, Honest logging, Personal
//   bests; Beyond target became tiers. ("This year" and "Money kept" were
//   dropped in 1.0.0-rc.5: they repeated Trends' weeks met and savings.)
// - Consistency (week streaks) shows for everyone; native tied it to the
//   clear-day-streak setting, but week streaks never punish a drinking day.

const formatShort = dayMonth;

interface Data {
  m: MilestonesData;
  clearDates: string[];
  clearEarned: ClearTierEarn[];
  streakEarned: StreakTierEarn[];
  loggingEarnings: LoggingTierEarn[];
  currentStreak: number;
  longestRun: number;
  extras: Awaited<ReturnType<typeof getMilestoneExtras>>;
  challenges: Awaited<ReturnType<typeof getChallengeStatus>>;
}

export function AllMilestones() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [m, dates, ce, se, logging, cs, lr, ex, ch] = await Promise.all([
        computeMilestones(),
        getClearDatesOrdered(),
        getClearTierEarnings(),
        getStreakTierFirsts(),
        getLoggingTierEarnings(),
        getCurrentStreak(),
        getLongestLoggingRun(),
        getMilestoneExtras(),
        getChallengeStatus(),
      ]);
      if (cancelled) return;
      setData({
        m, clearDates: dates, clearEarned: ce, streakEarned: se, loggingEarnings: logging,
        currentStreak: cs, longestRun: lr, extras: ex, challenges: ch,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const header = (
    <div className="ms-all-header">
      <Link to="/milestones" className="ms-back" aria-label={t('all.back')}>‹</Link>
      <h1 className="ms-all-title">{t('all.title')}</h1>
      <span style={{ width: 36 }} />
    </div>
  );
  if (!data) return <main className="milestones">{header}</main>;

  const { m, clearDates } = data;
  const ex = data.extras;
  const pct = (n: number, of: number) => Math.min(100, Math.round((n / of) * 100));

  const totalTiers = CLEAR_DAY_TIERS.map((threshold) => {
    const e = data.clearEarned.find((x) => x.threshold === threshold);
    return { threshold, reached: !!e, reachedDate: e?.reachedDateIso ?? null };
  });
  const streakTiers = STREAK_TIERS_WEEKS.map((weeks) => ({ weeks, reached: data.streakEarned.some((e) => e.tierWeeks === weeks) }));
  const earnedLogging = new Set(data.loggingEarnings.map((e) => e.tierDays));

  return (
    <main className="milestones">
      {header}

      <h2 className="ms-all-sec">{t('all.firsts')}</h2>
      <Badge
        size="all"
        glyph="✓"
        title={t('ms.firstClear')}
        sub={m.firstClearDate ? formatShort(m.firstClearDate) : t('all.notYet')}
        earned={!!m.firstClearDate}
      />
      <Badge
        size="all"
        glyph="✓"
        title={t('all.firstClearWeek')}
        sub={m.firstWeekMetIso ? t('all.firstWeekSub', { date: formatShort(m.firstWeekMetIso) }) : t('all.notYet')}
        earned={!!m.firstWeekMetIso}
      />

      <h2 className="ms-all-sec">{t('all.consistency')}</h2>
      <p className="ms-all-note">{t('all.consistencyNote')}</p>
      {streakTiers.map(({ weeks, reached }) => (
        <Badge
          key={weeks}
          size="all"
          glyph="🔥"
          title={t('ms.streak', { n: weeks })}
          sub={reached ? t('all.earned') : t('all.weeksProgress', { count: data.currentStreak, target: weeks })}
          earned={reached}
          progress={pct(data.currentStreak, weeks)}
        />
      ))}

      <h2 className="ms-all-sec">{t('all.showingUp')}</h2>
      <p className="ms-all-note">{t('all.showingUpNote')}</p>
      {LOGGING_TIERS.map((d) => {
        const reached = earnedLogging.has(d);
        return (
          <Badge
            key={d}
            size="all"
            glyph="◆"
            title={t('ms.loggedInARow', { n: d })}
            sub={reached ? t('all.earned') : t('all.longestRunDays', { count: data.longestRun, target: d })}
            earned={reached}
            progress={pct(data.longestRun, d)}
          />
        );
      })}

      <h2 className="ms-all-sec">{t('all.totalClear')}</h2>
      <p className="ms-all-note">{t('all.totalClearNote')}</p>
      {totalTiers.map((tier) => (
        <Badge
          key={tier.threshold}
          size="all"
          glyph="★"
          title={t('ms.clearDays', { n: tier.threshold })}
          sub={
            tier.reached
              ? t('tier.reached', { date: tier.reachedDate ? formatShort(tier.reachedDate) : '' })
              : t('all.daysProgress', { count: clearDates.length, target: tier.threshold })
          }
          earned={tier.reached}
          progress={pct(clearDates.length, tier.threshold)}
        />
      ))}

      <h2 className="ms-all-sec">{t('all.comingBack')}</h2>
      <p className="ms-all-note">{t('all.comingBackNote')}</p>
      <TierBadges size="all" mode="all" glyph="↺" tiers={BACK_ON_TRACK_TIERS}
        earned={tiersFrom(ex.backOnTrack, BACK_ON_TRACK_TIERS)} progress={ex.backOnTrack.length}
        title={(n) => (n === 1 ? t('ms.back1') : t('ms.backN', { n }))} formatDate={formatShort} />

      <h2 className="ms-all-sec">{t('all.keptFew')}</h2>
      <p className="ms-all-note">{t('all.keptFewNote')}</p>
      <TierBadges size="all" mode="all" glyph="✎" tiers={KEPT_TO_A_FEW_TIERS}
        earned={tiersFrom(ex.keptToAFew, KEPT_TO_A_FEW_TIERS)} progress={ex.keptToAFew.length}
        title={(n) => (n === 1 ? t('ms.fewWeek1') : t('ms.fewWeekN', { n }))} formatDate={formatShort} />

      <h2 className="ms-all-sec">{t('all.honest')}</h2>
      <p className="ms-all-note">{t('all.honestNote')}</p>
      <TierBadges size="all" mode="all" glyph="✎" tiers={HONEST_LOGGING_TIERS}
        earned={tiersFrom(ex.honest, HONEST_LOGGING_TIERS)} progress={ex.honest.length}
        title={(n) => (n === 1 ? t('ms.sameDay1') : t('ms.sameDayN', { n }))} formatDate={formatShort} />

      <h2 className="ms-all-sec">{t('all.bests')}</h2>
      <p className="ms-all-note">{t('all.bestsNote')}</p>
      {ex.bestMonths.length === 0 ? (
        <Badge size="all" glyph="▲" title={t('all.bestMonth')} sub={t('all.notYet')} earned={false} />
      ) : (
        [...ex.bestMonths].reverse().map((b) => (
          <Badge key={`${b.year}-${b.month}`} size="all" glyph="▲" title={t('ms.bestMonth', { month: monthYear(b.month, b.year, 'short') })}
            sub={t('all.bestSub', { count: b.clearDays, date: formatShort(b.reachedIso) })} earned />
        ))
      )}

      {(data.challenges.settings.weekendRuns.length > 0 || data.challenges.settings.weekRuns.length > 0 || data.challenges.months.some((x) => x.state !== 'ended')) && (
        <>
          <h2 className="ms-all-sec">{t('all.challenges')}</h2>
          <p className="ms-all-note">{t('all.challengesNote')}</p>
          {data.challenges.settings.weekendRuns.length > 0 && (
            <TierBadges size="all" mode="all" glyph="◐" tiers={WEEKEND_TIERS} earned={tiersFrom(data.challenges.weekends, WEEKEND_TIERS)}
              progress={data.challenges.weekends.length} title={(n) => (n === 1 ? t('ms.clearWeekend1') : t('ms.clearWeekendN', { n }))} formatDate={formatShort} />
          )}
          {data.challenges.settings.weekRuns.length > 0 && (
            <TierBadges size="all" mode="all" glyph="◑" tiers={WEEK_TIERS} earned={tiersFrom(data.challenges.weeks, WEEK_TIERS)}
              progress={data.challenges.weeks.length} title={(n) => (n === 1 ? t('ms.clearWeek1') : t('ms.clearWeekN', { n }))} formatDate={formatShort} />
          )}
          {data.challenges.months.filter((x) => x.state !== 'ended').map((x) => (
            <Badge key={x.ym} size="all" glyph="○" title={monthTitle(x.ym)} sub={monthStatusText(x)} earned={x.state === 'earned'} />
          ))}
        </>
      )}

      <h2 className="ms-all-sec">{t('all.growth')}</h2>
      <p className="ms-all-note">{t('all.growthNote')}</p>
      <TierBadges size="all" mode="all" glyph="✦" tiers={BEYOND_TARGET_TIERS}
        earned={tiersFrom(ex.beyondTarget, BEYOND_TARGET_TIERS)} progress={ex.beyondTarget.length}
        title={(n) => (n === 1 ? t('ms.beyond1') : t('ms.beyondN', { n }))} formatDate={formatShort} />
    </main>
  );
}

