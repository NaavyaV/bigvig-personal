import {
  addDays,
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfDay,
} from 'date-fns';

export function todayISO(): string {
  return format(startOfDay(new Date()), 'yyyy-MM-dd');
}

export function dateFromOffset(days: number): string {
  return format(addDays(startOfDay(new Date()), days), 'yyyy-MM-dd');
}

/** Days from today to due (negative = overdue). */
export function daysUntilDue(dueDate: string, from: Date = new Date()): number {
  return differenceInCalendarDays(startOfDay(parseISO(dueDate)), startOfDay(from));
}

export function formatAbsoluteDue(dueDate: string): string {
  return format(parseISO(dueDate), 'MMM d');
}

/** Human relative + absolute due labels for cards. */
export function formatRelativeDue(
  dueDate: string,
  opts?: { completed?: boolean },
): {
  relative: string | null;
  absolute: string;
  /** Combined label for previews / lists */
  label: string;
  overdue: boolean;
  today: boolean;
} {
  const absolute = formatAbsoluteDue(dueDate);
  const days = daysUntilDue(dueDate);

  if (opts?.completed) {
    return {
      relative: null,
      absolute,
      label: absolute,
      overdue: false,
      today: false,
    };
  }

  let relative: string;
  let overdue = false;
  let today = false;

  if (isToday(parseISO(dueDate))) {
    relative = 'Due today';
    today = true;
  } else if (isTomorrow(parseISO(dueDate))) {
    relative = 'Due tomorrow';
  } else if (isYesterday(parseISO(dueDate))) {
    relative = 'Due yesterday';
    overdue = true;
  } else if (days > 1 && days < 7) {
    relative = `Due in ${days} days`;
  } else if (days === 7) {
    relative = 'Due in 1 week';
  } else if (days > 7 && days < 14) {
    relative = `Due in ${days} days`;
  } else if (days === 14) {
    relative = 'Due in 2 weeks';
  } else if (days > 14) {
    const weeks = Math.round(days / 7);
    relative =
      weeks >= 2 && days % 7 === 0 ? `Due in ${weeks} weeks` : `Due in ${days} days`;
  } else {
    const overdueBy = Math.abs(days);
    if (overdueBy === 7) relative = '1 week overdue';
    else if (overdueBy > 1) relative = `${overdueBy} days overdue`;
    else relative = '1 day overdue';
    overdue = true;
  }

  return {
    relative,
    absolute,
    label: relative,
    overdue,
    today,
  };
}
