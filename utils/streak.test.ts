import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { advanceStreak, effectiveStreak, toLocalDateKey } from './streak';

describe('streak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // A fixed local date, mid-day to stay clear of midnight edges.
    vi.setSystemTime(new Date(2026, 6, 13, 12, 0, 0)); // 2026-07-13 local
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats local date keys as YYYY-MM-DD', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  describe('advanceStreak', () => {
    it('starts a streak at 1 for a first-ever activity', () => {
      expect(advanceStreak({ streak: 0, lastActiveDate: '' }))
        .toEqual({ streak: 1, lastActiveDate: '2026-07-13' });
    });

    it('returns null when today was already counted', () => {
      expect(advanceStreak({ streak: 4, lastActiveDate: '2026-07-13' })).toBeNull();
    });

    it('increments when the last activity was yesterday', () => {
      expect(advanceStreak({ streak: 4, lastActiveDate: '2026-07-12' }))
        .toEqual({ streak: 5, lastActiveDate: '2026-07-13' });
    });

    it('resets to 1 after a missed day', () => {
      expect(advanceStreak({ streak: 9, lastActiveDate: '2026-07-11' }))
        .toEqual({ streak: 1, lastActiveDate: '2026-07-13' });
    });
  });

  describe('effectiveStreak', () => {
    it('shows the stored streak when last active today', () => {
      expect(effectiveStreak({ streak: 6, lastActiveDate: '2026-07-13' })).toBe(6);
    });

    it('keeps the streak alive through yesterday', () => {
      expect(effectiveStreak({ streak: 6, lastActiveDate: '2026-07-12' })).toBe(6);
    });

    it('shows 0 once a day has been missed', () => {
      expect(effectiveStreak({ streak: 6, lastActiveDate: '2026-07-11' })).toBe(0);
    });

    it('shows 0 when there is no activity at all', () => {
      expect(effectiveStreak({ streak: 0, lastActiveDate: '' })).toBe(0);
    });
  });
});
