import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { nextDueDate, shouldEndOnComplete } from '../lib/recurrence';
import type { Recurrence, Task, TaskInput, TaskPriority, TaskStatus } from '../types';

const tasksCol = collection(db, 'tasks');

function mapTask(id: string, data: Record<string, unknown>): Task {
  const rawRecurrence = data.recurrence as Recurrence | null | undefined;
  const recurrence: Recurrence | null = rawRecurrence
    ? {
        frequency: rawRecurrence.frequency,
        interval: Number(rawRecurrence.interval ?? 1),
        endDate: rawRecurrence.endDate ?? null,
        maxOccurrences: rawRecurrence.maxOccurrences ?? null,
        completedCount: Number(rawRecurrence.completedCount ?? 0),
      }
    : null;

  return {
    id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    dueDate: (data.dueDate as string | null) ?? null,
    categoryId: (data.categoryId as string | null) ?? null,
    priority: (data.priority as TaskPriority | null) ?? null,
    status: (data.status as TaskStatus) ?? 'not_started',
    order: Number(data.order ?? 0),
    isRecurring: Boolean(data.isRecurring),
    recurrence,
    createdAt: String(data.createdAtIso ?? data.createdAt ?? ''),
    updatedAt: String(data.updatedAtIso ?? data.updatedAt ?? ''),
    completedAt: (data.completedAtIso as string | null) ?? null,
  };
}

export function subscribeTasks(onChange: (tasks: Task[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(tasksCol, orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => mapTask(d.id, d.data())));
    },
    (err) => onError?.(err),
  );
}

export async function createTask(input: TaskInput): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(tasksCol, {
    ...input,
    completedAtIso: null,
    createdAtIso: now,
    updatedAtIso: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(id: string, patch: Partial<TaskInput> & { completedAt?: string | null }): Promise<void> {
  const { completedAt, ...rest } = patch;
  const payload: Record<string, unknown> = {
    ...rest,
    updatedAtIso: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  };
  if (completedAt !== undefined) {
    payload.completedAtIso = completedAt;
  }
  await updateDoc(doc(db, 'tasks', id), payload);
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', id));
}

/**
 * Move a task between columns. Recurring tasks that land in Completed
 * stay completed, and a fresh Not started copy is created for the next due date.
 */
export async function moveTask(
  task: Task,
  newStatus: TaskStatus,
  orderForTarget: number,
  orderForNotStarted?: number,
): Promise<{ recurred: boolean; ended: boolean }> {
  if (newStatus === 'completed' && task.isRecurring && task.recurrence) {
    const recurrence = task.recurrence;
    const nextCount = (recurrence.completedCount ?? 0) + 1;
    const hitOccurrenceCap = shouldEndOnComplete(recurrence);
    const next = hitOccurrenceCap ? null : nextDueDate(task.dueDate, recurrence);

    await updateTask(task.id, {
      status: 'completed',
      order: orderForTarget,
      completedAt: new Date().toISOString(),
      isRecurring: true,
      recurrence: { ...recurrence, completedCount: nextCount },
    });

    if (next === null || hitOccurrenceCap) {
      return { recurred: false, ended: true };
    }

    await createTask({
      title: task.title,
      description: task.description,
      dueDate: next,
      categoryId: task.categoryId,
      priority: task.priority,
      status: 'not_started',
      order: orderForNotStarted ?? 0,
      isRecurring: true,
      recurrence: { ...recurrence, completedCount: nextCount },
    });
    return { recurred: true, ended: false };
  }

  await updateTask(task.id, {
    status: newStatus,
    order: orderForTarget,
    completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
  });
  return { recurred: false, ended: false };
}

export async function reorderTasks(
  updates: { id: string; order: number; status: TaskStatus }[],
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  for (const u of updates) {
    batch.update(doc(db, 'tasks', u.id), {
      order: u.order,
      status: u.status,
      updatedAtIso: now,
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export function nextOrder(tasks: Task[], status: TaskStatus): number {
  const inCol = tasks.filter((t) => t.status === status);
  if (inCol.length === 0) return 0;
  return Math.max(...inCol.map((t) => t.order)) + 1;
}
