import { daysBetween, localDateOf, type Iso } from '../data/dates';

export const NUDGE_AFTER_DAYS = 30;
export const SNOOZE_DAYS = 7;

/** "today", "yesterday", "23 days ago". */
export function daysAgoText(days: number): string {
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

/**
 * Whether Check-in should suggest a backup: 30 days after the last one, or,
 * if there's never been one, once there are 30 days of records to lose.
 * "Later" snoozes it for a week.
 */
export function backupNudge(
  today: Iso,
  lastBackupAt: string | null,
  firstEntry: Iso | null,
  snoozeUntil: Iso | null,
): { kind: 'since-backup' | 'never'; days: number } | null {
  if (!firstEntry) return null;
  if (snoozeUntil && today < snoozeUntil) return null;
  if (lastBackupAt) {
    const days = daysBetween(localDateOf(lastBackupAt), today);
    return days >= NUDGE_AFTER_DAYS ? { kind: 'since-backup', days } : null;
  }
  const days = daysBetween(firstEntry, today) + 1;
  return days >= NUDGE_AFTER_DAYS ? { kind: 'never', days } : null;
}
