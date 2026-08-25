export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

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
  status: TaskStatus;
  order: number;
  isRecurring: boolean;
  recurrence: Recurrence | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

export const STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'completed'];

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
