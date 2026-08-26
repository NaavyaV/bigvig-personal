import {
  addDoc,
  deleteDoc,
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
import { DEFAULT_COLUMN_IDS } from '../types';
import { userTaskDoc, userTasksCol } from './paths';

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

  const rawExpected = data.expectedMinutes;
  const expectedMinutes =
    typeof rawExpected === 'number' && Number.isFinite(rawExpected) && rawExpected > 0
      ? Math.round(rawExpected / 15) * 15
      : null;

  return {
    id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    dueDate: (data.dueDate as string | null) ?? null,
    categoryId: (data.categoryId as string | null) ?? null,
    priority: (data.priority as TaskPriority | null) ?? null,
    expectedMinutes,
    status: (data.status as TaskStatus) ?? DEFAULT_COLUMN_IDS.start,
    order: Number(data.order ?? 0),
    isRecurring: Boolean(data.isRecurring),
    recurrence,
    createdAt: String(data.createdAtIso ?? data.createdAt ?? ''),
    updatedAt: String(data.updatedAtIso ?? data.updatedAt ?? ''),
    completedAt: (data.completedAtIso as string | null) ?? null,
  };
}

export function subscribeTasks(
  uid: string,
  onChange: (tasks: Task[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(userTasksCol(uid), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => mapTask(d.id, d.data())));
    },
    (err) => onError?.(err),
  );
}

export async function createTask(uid: string, input: TaskInput): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(userTasksCol(uid), {
    ...input,
    completedAtIso: null,
    createdAtIso: now,
    updatedAtIso: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(
  uid: string,
  id: string,
  patch: Partial<TaskInput> & { completedAt?: string | null },
): Promise<void> {
  const { completedAt, ...rest } = patch;
  const payload: Record<string, unknown> = {
    ...rest,
    updatedAtIso: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  };
  if (completedAt !== undefined) {
    payload.completedAtIso = completedAt;
  }
  await updateDoc(userTaskDoc(uid, id), payload);
}

export async function deleteTask(uid: string, id: string): Promise<void> {
  await deleteDoc(userTaskDoc(uid, id));
}

export async function moveTask(
  uid: string,
  task: Task,
  newStatus: TaskStatus,
  orderForTarget: number,
  options?: {
    orderForNotStarted?: number;
    isCompletedColumn?: boolean;
    startColumnId?: string;
  },
): Promise<{ recurred: boolean; ended: boolean }> {
  const isCompleted =
    options?.isCompletedColumn ??
    (newStatus === DEFAULT_COLUMN_IDS.end || newStatus === 'completed');
  const startId = options?.startColumnId ?? DEFAULT_COLUMN_IDS.start;

  if (isCompleted && task.isRecurring && task.recurrence) {
    const recurrence = task.recurrence;
    const nextCount = (recurrence.completedCount ?? 0) + 1;
    const hitOccurrenceCap = shouldEndOnComplete(recurrence);
    const next = hitOccurrenceCap ? null : nextDueDate(task.dueDate, recurrence);

    await updateTask(uid, task.id, {
      status: newStatus,
      order: orderForTarget,
      completedAt: new Date().toISOString(),
      isRecurring: true,
      recurrence: { ...recurrence, completedCount: nextCount },
    });

    if (next === null || hitOccurrenceCap) {
      return { recurred: false, ended: true };
    }

    await createTask(uid, {
      title: task.title,
      description: task.description,
      dueDate: next,
      categoryId: task.categoryId,
      priority: task.priority,
      expectedMinutes: task.expectedMinutes,
      status: startId,
      order: options?.orderForNotStarted ?? 0,
      isRecurring: true,
      recurrence: { ...recurrence, completedCount: nextCount },
    });
    return { recurred: true, ended: false };
  }

  await updateTask(uid, task.id, {
    status: newStatus,
    order: orderForTarget,
    completedAt: isCompleted ? new Date().toISOString() : null,
  });
  return { recurred: false, ended: false };
}

export async function reorderTasks(
  uid: string,
  updates: { id: string; order: number; status: TaskStatus }[],
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  for (const u of updates) {
    batch.update(userTaskDoc(uid, u.id), {
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

export async function reassignTasksFromColumn(
  uid: string,
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
  tasks: Task[],
): Promise<void> {
  const affected = tasks.filter((t) => t.status === fromStatus);
  if (affected.length === 0) return;
  const base = nextOrder(tasks, toStatus);
  await Promise.all(
    affected.map((t, i) =>
      updateTask(uid, t.id, {
        status: toStatus,
        order: base + i,
        completedAt: null,
      }),
    ),
  );
}
