import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { TierBadges } from '../components/TierBadges';
import { money } from '../lib/savings';
import { monthStatusText, monthTitle } from '../lib/challengeText';
import {
  BACK_ON_TRACK_TIERS,
  BEYOND_TARGET_TIERS,
  CLEAR_DAY_TIERS,
  HONEST_LOGGING_TIERS,
  KEPT_TO_A_FEW_TIERS,
  MONEY_KEPT_TIERS,
  tiersFrom,
  YEAR_WEEKS_MET,
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
  getSetting,
  getStreakTierFirsts,
  LOGGING_TIERS,
  STREAK_TIERS_WEEKS,
  type ClearTierEarn,
  type LoggingTierEarn,
  type MilestonesData,
  type StreakTierEarn,
} from '../data/database';
import './Milestones.css';

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
// - New (web): Coming back, Kept it to a few, Honest logging, This year,
//   Personal bests, Money kept; Beyond target became tiers.

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatShort = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}`;
};

interface Data {
  m: MilestonesData;
  clearDates: string[];
  clearEarned: ClearTierEarn[];
  streakEarned: StreakTierEarn[];
  loggingEarnings: LoggingTierEarn[];
  currentStreak: number;
  longestRun: number;
  showDayStreak: boolean;
  extras: Awaited<ReturnType<typeof getMilestoneExtras>>;
  challenges: Awaited<ReturnType<typeof getChallengeStatus>>;
}

export function AllMilestones() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [m, dates, ce, se, logging, cs, lr, dsOn, ex, ch] = await Promise.all([
        computeMilestones(),
        getClearDatesOrdered(),
        getClearTierEarnings(),
        getStreakTierFirsts(),
        getLoggingTierEarnings(),
        getCurrentStreak(),
        getLongestLoggingRun(),
        getSetting('day_streak_enabled', 'false'),
        getMilestoneExtras(),
        getChallengeStatus(),
      ]);
      if (cancelled) return;
      setData({
        m, clearDates: dates, clearEarned: ce, streakEarned: se, loggingEarnings: logging,
        currentStreak: cs, longestRun: lr, showDayStreak: dsOn === 'true', extras: ex, challenges: ch,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const header = (
    <div className="ms-all-header">
      <Link to="/milestones" className="ms-back" aria-label="Back to Milestones">‹</Link>
      <h1 className="ms-all-title">All milestones</h1>
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

      <h2 className="ms-all-sec">Firsts</h2>
      <Badge
        size="all"
        glyph="✓"
        title="First clear day"
        sub={m.firstClearDate ? formatShort(m.firstClearDate) : 'Not yet earned'}
        earned={!!m.firstClearDate}
      />
      <Badge
        size="all"
        glyph="✓"
        title="First clear week"
        sub={m.firstClearWeekEndIso ? `Target met, week ending ${formatShort(m.firstClearWeekEndIso)}` : 'Not yet earned'}
        earned={!!m.firstClearWeekEndIso}
      />

      {data.showDayStreak && (
        <>
          <h2 className="ms-all-sec">Consistency</h2>
          <p className="ms-all-note">Weeks in a row meeting your intention</p>
          {streakTiers.map(({ weeks, reached }) => (
            <Badge
              key={weeks}
              size="all"
              glyph="🔥"
              title={`${weeks}-week streak`}
              sub={reached ? 'Earned' : `${data.currentStreak} of ${weeks} weeks`}
              earned={reached}
              progress={pct(data.currentStreak, weeks)}
            />
          ))}
        </>
      )}

      <h2 className="ms-all-sec">Showing up</h2>
      <p className="ms-all-note">Logging any day — clear or drinking — counts here</p>
      {LOGGING_TIERS.map((d) => {
        const reached = earnedLogging.has(d);
        return (
          <Badge
            key={d}
            size="all"
            glyph="◆"
            title={`${d} days logged in a row`}
            sub={reached ? 'Earned' : `Longest run: ${data.longestRun} of ${d} days`}
            earned={reached}
            progress={pct(data.longestRun, d)}
          />
        );
      })}

      <h2 className="ms-all-sec">Total clear days</h2>
      <p className="ms-all-note">Every clear day you've logged, all time</p>
      {totalTiers.map((t) => (
        <Badge
          key={t.threshold}
          size="all"
          glyph="★"
          title={`${t.threshold} clear days`}
          sub={
            t.reached
              ? `Reached ${t.reachedDate ? formatShort(t.reachedDate) : ''}`
              : `${clearDates.length} of ${t.threshold} days`
          }
          earned={t.reached}
          progress={pct(clearDates.length, t.threshold)}
        />
      ))}

      <h2 className="ms-all-sec">Coming back</h2>
      <p className="ms-all-note">Meeting your intention in a week right after one that missed it</p>
      <TierBadges size="all" mode="all" glyph="↺" tiers={BACK_ON_TRACK_TIERS}
        earned={tiersFrom(ex.backOnTrack, BACK_ON_TRACK_TIERS)} progress={ex.backOnTrack.length}
        title={(t) => (t === 1 ? 'Back on track after a missed week' : `Back on track ${t} times`)} formatDate={formatShort} />

      <h2 className="ms-all-sec">Kept it to a few</h2>
      <p className="ms-all-note">Weeks with drinking days, every one of them "A few"</p>
      <TierBadges size="all" mode="all" glyph="✎" tiers={KEPT_TO_A_FEW_TIERS}
        earned={tiersFrom(ex.keptToAFew, KEPT_TO_A_FEW_TIERS)} progress={ex.keptToAFew.length}
        title={(t) => (t === 1 ? 'A week kept to a few' : `${t} weeks kept to a few`)} formatDate={formatShort} />

      <h2 className="ms-all-sec">Honest logging</h2>
      <p className="ms-all-note">Drinking days logged on the day itself</p>
      <TierBadges size="all" mode="all" glyph="✎" tiers={HONEST_LOGGING_TIERS}
        earned={tiersFrom(ex.honest, HONEST_LOGGING_TIERS)} progress={ex.honest.length}
        title={(t) => (t === 1 ? 'Logged a drinking day the same day' : `${t} drinking days logged the same day`)} formatDate={formatShort} />

      <h2 className="ms-all-sec">This year</h2>
      <p className="ms-all-note">Weeks meeting your intention this year. Resets each January</p>
      <TierBadges size="all" mode="all" glyph="◷" tiers={YEAR_WEEKS_MET}
        earned={ex.yearWeeks.earned} progress={ex.yearWeeks.count}
        title={(t) => `${t} week${t === 1 ? '' : 's'} met this year`} formatDate={formatShort} />

      <h2 className="ms-all-sec">Personal bests</h2>
      <p className="ms-all-note">Each time a month beats every month before it</p>
      {ex.bestMonths.length === 0 ? (
        <Badge size="all" glyph="▲" title="Best month yet" sub="Not yet earned" earned={false} />
      ) : (
        [...ex.bestMonths].reverse().map((b) => (
          <Badge key={`${b.year}-${b.month}`} size="all" glyph="▲" title={`Best month yet: ${MONTH_SHORT[b.month - 1]} ${b.year}`}
            sub={`${b.clearDays} clear days · reached ${formatShort(b.reachedIso)}`} earned />
        ))
      )}

      {ex.money && (
        <>
          <h2 className="ms-all-sec">Money kept</h2>
          <p className="ms-all-note">Clear days at your savings baseline and price</p>
          <TierBadges size="all" mode="all" glyph="$" tiers={MONEY_KEPT_TIERS} earned={ex.money.earned}
            progress={ex.money.total} title={(t) => `${money(t)} kept`} formatDate={formatShort} unit={(n) => money(n)} />
        </>
      )}

      {(data.challenges.settings.weekendRuns.length > 0 || data.challenges.settings.weekRuns.length > 0 || data.challenges.months.some((x) => x.state !== 'ended')) && (
        <>
          <h2 className="ms-all-sec">Challenges</h2>
          <p className="ms-all-note">Goals you chose; all or nothing</p>
          {data.challenges.settings.weekendRuns.length > 0 && (
            <TierBadges size="all" mode="all" glyph="◐" tiers={WEEKEND_TIERS} earned={tiersFrom(data.challenges.weekends, WEEKEND_TIERS)}
              progress={data.challenges.weekends.length} title={(t) => (t === 1 ? 'A clear weekend' : `${t} clear weekends`)} formatDate={formatShort} />
          )}
          {data.challenges.settings.weekRuns.length > 0 && (
            <TierBadges size="all" mode="all" glyph="◑" tiers={WEEK_TIERS} earned={tiersFrom(data.challenges.weeks, WEEK_TIERS)}
              progress={data.challenges.weeks.length} title={(t) => (t === 1 ? 'A clear week' : `${t} clear weeks`)} formatDate={formatShort} />
          )}
          {data.challenges.months.filter((x) => x.state !== 'ended').map((x) => (
            <Badge key={x.ym} size="all" glyph="○" title={monthTitle(x.ym)} sub={monthStatusText(x)} earned={x.state === 'earned'} />
          ))}
        </>
      )}

      <h2 className="ms-all-sec">Growth</h2>
      <p className="ms-all-note">Weeks with more clear days than your intention</p>
      <TierBadges size="all" mode="all" glyph="✦" tiers={BEYOND_TARGET_TIERS}
        earned={tiersFrom(ex.beyondTarget, BEYOND_TARGET_TIERS)} progress={ex.beyondTarget.length}
        title={(t) => (t === 1 ? 'Beyond target' : `Beyond target ${t} weeks`)} formatDate={formatShort} />
    </main>
  );
}

