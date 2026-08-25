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

function withAbsolute(relative: string, dueDate: string): string {
  const abs = format(parseISO(dueDate), 'MMM d');
  return `${relative}, on ${abs}`;
}

/** Human relative due label for cards. */
export function formatRelativeDue(
  dueDate: string,
  opts?: { completed?: boolean },
): { label: string; overdue: boolean; today: boolean } {
  const d = parseISO(dueDate);
  const days = daysUntilDue(dueDate);

  if (opts?.completed) {
    return { label: `Was due on ${format(d, 'MMM d')}`, overdue: false, today: false };
  }

  if (isToday(d)) {
    return { label: withAbsolute('Due today', dueDate), overdue: false, today: true };
  }
  if (isTomorrow(d)) {
    return { label: withAbsolute('Due tomorrow', dueDate), overdue: false, today: false };
  }
  if (isYesterday(d)) {
    return { label: withAbsolute('Due yesterday', dueDate), overdue: true, today: false };
  }

  let relative: string;
  if (days > 1 && days < 7) {
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
    return { label: withAbsolute(relative, dueDate), overdue: true, today: false };
  }

  return { label: withAbsolute(relative, dueDate), overdue: false, today: false };
}
