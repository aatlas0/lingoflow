import type { UserProfile } from '../types';

// All streak math uses LOCAL calendar days ('YYYY-MM-DD'), so a streak
// survives until the user's own midnight, not UTC's.

export const toLocalDateKey = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const yesterdayKey = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateKey(d);
};

export const STREAK_ACHIEVEMENTS: [string, number][] = [
  ['streak_3', 3],
  ['streak_7', 7],
  ['streak_30', 30],
];

/**
 * Given the profile's current streak state, returns the streak values after
 * registering activity "now". Returns null if today was already counted.
 */
export const advanceStreak = (
  profile: Pick<UserProfile, 'streak' | 'lastActiveDate'>
): { streak: number; lastActiveDate: string } | null => {
  const today = toLocalDateKey();
  if (profile.lastActiveDate === today) return null;

  const continued = profile.lastActiveDate === yesterdayKey();
  return {
    streak: continued ? profile.streak + 1 : 1,
    lastActiveDate: today,
  };
};

/**
 * What the user should SEE: the stored streak is only alive if the last
 * activity was today or yesterday; otherwise it's effectively broken.
 */
export const effectiveStreak = (
  profile: Pick<UserProfile, 'streak' | 'lastActiveDate'>
): number => {
  if (!profile.lastActiveDate) return 0;
  if (profile.lastActiveDate === toLocalDateKey() || profile.lastActiveDate === yesterdayKey()) {
    return profile.streak;
  }
  return 0;
};
