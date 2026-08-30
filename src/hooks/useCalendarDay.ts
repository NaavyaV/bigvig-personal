import { useEffect, useState } from 'react';
import { todayISO } from '../lib/dates';

/** Milliseconds until the next local midnight, plus a small buffer. */
function msUntilNextMidnight(from = new Date()): number {
  const next = new Date(from);
  next.setHours(24, 0, 0, 0);
  return Math.max(1000, next.getTime() - from.getTime() + 50);
}

/**
 * Current local calendar day as `yyyy-MM-dd`.
 * Updates at midnight and when the tab becomes visible again,
 * so relative due labels stay fresh without a full page reload.
 */
export function useCalendarDay(): string {
  const [day, setDay] = useState(todayISO);

  useEffect(() => {
    let timeoutId = 0;

    const sync = () => {
      setDay((prev) => {
        const next = todayISO();
        return prev === next ? prev : next;
      });
    };

    const schedule = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        sync();
        schedule();
      }, msUntilNextMidnight());
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        sync();
        schedule();
      }
    };

    schedule();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', sync);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return day;
}
