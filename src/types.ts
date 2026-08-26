export type ColumnRole = 'start' | 'middle' | 'end';

/** Board column id — defaults match legacy statuses for existing data */
export type TaskStatus = string;

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  /** Extra interval multiplier; 1 = every period, 2 = every other, etc. */
  interval: number;
  /** Optional ISO date after which recurrence stops */
  endDate: string | null;
  /** Optional cap on how many times the task may be completed before it stays done */
  maxOccurrences: number | null;
  /** How many times this recurring task has been completed so far */
  completedCount: number;
}

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  role: ColumnRole;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  categoryId: string | null;
  priority: TaskPriority | null;
  /** Expected effort in minutes (multiples of 15), or null if unset */
  expectedMinutes: number | null;
  status: TaskStatus;
  order: number;
  isRecurring: boolean;
  recurrence: Recurrence | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;

export const DEFAULT_COLUMN_IDS = {
  start: 'not_started',
  middle: 'in_progress',
  end: 'completed',
} as const;

export const MAX_BOARD_COLUMNS = 5;

export const EXPECTED_TIME_STEP = 15;
export const EXPECTED_TIME_MAX = 480; // 8 hours

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

/** Soft tint backgrounds for priority levels */
export const PRIORITY_TINTS: Record<TaskPriority, string> = {
  low: 'rgba(14, 116, 144, 0.07)',
  medium: 'rgba(180, 140, 20, 0.09)',
  high: 'rgba(194, 65, 12, 0.1)',
  urgent: 'rgba(185, 28, 28, 0.11)',
};

export const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export const CATEGORY_COLORS = [
  '#0D7377', // teal
  '#1D4ED8', // strong blue
  '#CA8A04', // gold
  '#DC2626', // red
  '#7C3AED', // violet
  '#15803D', // green
  '#DB2777', // pink
  '#EA580C', // orange
] as const;

export function formatExpectedMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}hr`;
  return `${h}hr ${m} mins`;
}

export function isCompletedStatus(status: TaskStatus, columns: BoardColumn[]): boolean {
  const col = columns.find((c) => c.id === status);
  if (col) return col.role === 'end';
  return status === DEFAULT_COLUMN_IDS.end;
}

export function getStartColumnId(columns: BoardColumn[]): string {
  return columns.find((c) => c.role === 'start')?.id ?? DEFAULT_COLUMN_IDS.start;
}

export function getEndColumnId(columns: BoardColumn[]): string {
  return columns.find((c) => c.role === 'end')?.id ?? DEFAULT_COLUMN_IDS.end;
}
