import { addDays, addMonths, addWeeks, addYears, format, isAfter, parseISO, startOfDay } from 'date-fns';
import type { Recurrence, RecurrenceFrequency } from '../types';

function advanceOnce(date: Date, frequency: RecurrenceFrequency, interval: number): Date {
  const n = Math.max(1, interval);
  switch (frequency) {
    case 'daily':
      return addDays(date, n);
    case 'weekly':
      return addWeeks(date, n);
    case 'biweekly':
      return addWeeks(date, 2 * n);
    case 'monthly':
      return addMonths(date, n);
    case 'yearly':
      return addYears(date, n);
    default: {
      const _exhaustive: never = frequency;
      return _exhaustive;
    }
  }
}

/** Next due date after completing a recurring task. Uses today if no due date. */
export function nextDueDate(
  currentDue: string | null,
  recurrence: Recurrence,
  fromDate: Date = new Date(),
): string | null {
  const base = currentDue ? parseISO(currentDue) : startOfDay(fromDate);
  let next = advanceOnce(base, recurrence.frequency, recurrence.interval);

  const today = startOfDay(fromDate);
  let guard = 0;
  while (next < today && guard < 500) {
    next = advanceOnce(next, recurrence.frequency, recurrence.interval);
    guard += 1;
  }

  if (recurrence.endDate) {
    const end = startOfDay(parseISO(recurrence.endDate));
    if (isAfter(next, end)) return null;
  }

  return format(next, 'yyyy-MM-dd');
}

/** Whether completing now should end the series (stay in Completed). */
export function shouldEndOnComplete(recurrence: Recurrence): boolean {
  const count = recurrence.completedCount ?? 0;
  const max = recurrence.maxOccurrences;
  if (max != null && max > 0 && count + 1 >= max) return true;
  return false;
}

export function formatRecurrence(recurrence: Recurrence): string {
  const { frequency, interval } = recurrence;
  let base: string;
  if (frequency === 'biweekly') {
    base = interval > 1 ? `Every ${interval * 2} weeks` : 'Every 2 weeks';
  } else {
    const unit =
      frequency === 'daily'
        ? interval === 1
          ? 'day'
          : 'days'
        : frequency === 'weekly'
          ? interval === 1
            ? 'week'
            : 'weeks'
          : frequency === 'monthly'
            ? interval === 1
              ? 'month'
              : 'months'
            : interval === 1
              ? 'year'
              : 'years';
    base = interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}`;
  }

  const bits = [base];
  if (recurrence.maxOccurrences) {
    const done = recurrence.completedCount ?? 0;
    bits.push(`${done}/${recurrence.maxOccurrences} done`);
  }
  if (recurrence.endDate) {
    bits.push(`until ${recurrence.endDate}`);
  }
  return bits.join(' · ');
}
