import { endOfWeek, format, isToday, isTomorrow, isWithinInterval, parseISO, startOfDay, startOfWeek } from 'date-fns';
import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import { daysUntilDue, formatRelativeDue } from '../lib/dates';
import { formatRecurrence } from '../lib/recurrence';
import type { BoardColumn, Category, Task } from '../types';
import { formatExpectedMinutes, PRIORITY_LABELS } from '../types';

interface DueScheduleProps {
  tasks: Task[];
  categories: Category[];
  columns: BoardColumn[];
}

interface DayGroup {
  key: string;
  label: string;
  overdue: boolean;
  today: boolean;
  tasks: Task[];
}

function sectionLabel(iso: string): { label: string; overdue: boolean; today: boolean } {
  const d = parseISO(iso);
  const days = daysUntilDue(iso);
  if (isToday(d)) return { label: 'Today', overdue: false, today: true };
  if (isTomorrow(d)) return { label: 'Tomorrow', overdue: false, today: false };
  if (days < 0) {
    if (days === -1) return { label: 'Yesterday', overdue: true, today: false };
    return { label: format(d, 'EEE, MMM d'), overdue: true, today: false };
  }
  return { label: format(d, 'EEE, MMM d'), overdue: false, today: false };
}

function useSchedulePreview(tasks: Task[]) {
  return useMemo(() => {
    const dated = tasks.filter((t) => t.dueDate);
    const dueToday = dated.filter((t) => isToday(parseISO(t.dueDate!))).length;
    if (dueToday > 0) {
      return `${dueToday} task${dueToday === 1 ? '' : 's'} due today`;
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const dueThisWeek = dated.filter((t) => {
      const d = startOfDay(parseISO(t.dueDate!));
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    }).length;

    if (dueThisWeek > 0) {
      return `${dueThisWeek} task${dueThisWeek === 1 ? '' : 's'} due this week`;
    }
    return null;
  }, [tasks]);
}

function TaskPreview({
  task,
  category,
  column,
  onClose,
}: {
  task: Task;
  category?: Category;
  column?: BoardColumn;
  onClose: () => void;
}) {
  const titleId = useId();
  const due = task.dueDate
    ? formatRelativeDue(task.dueDate, { completed: column?.role === 'end' })
    : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop modal-backdrop--nested" onClick={onClose} role="presentation">
      <div
        className="modal modal--sm task-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2 id={titleId}>{task.title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="task-preview__body">
          {task.description ? (
            <p className="task-preview__desc">{task.description}</p>
          ) : (
            <p className="task-preview__empty">No description</p>
          )}

          <dl className="task-preview__facts">
            {due && (
              <div>
                <dt>Due</dt>
                <dd className={due.overdue ? 'is-overdue' : due.today ? 'is-today' : undefined}>
                  {due.label}
                </dd>
              </div>
            )}
            {category && (
              <div>
                <dt>Category</dt>
                <dd>
                  <span
                    className="task-preview__cat"
                    style={{ '--cat': category.color } as CSSProperties}
                  >
                    {category.name}
                  </span>
                </dd>
              </div>
            )}
            {column && (
              <div>
                <dt>Column</dt>
                <dd>{column.name}</dd>
              </div>
            )}
            {task.priority && (
              <div>
                <dt>Priority</dt>
                <dd>{PRIORITY_LABELS[task.priority]}</dd>
              </div>
            )}
            {task.expectedMinutes != null && (
              <div>
                <dt>Expected time</dt>
                <dd>{formatExpectedMinutes(task.expectedMinutes)}</dd>
              </div>
            )}
            {task.isRecurring && task.recurrence && (
              <div>
                <dt>Repeats</dt>
                <dd>{formatRecurrence(task.recurrence)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

export function DueSchedule({ tasks, categories, columns }: DueScheduleProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const preview = useSchedulePreview(tasks);
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const colMap = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);

  const groups = useMemo(() => {
    const withDue = tasks.filter((t) => Boolean(t.dueDate));
    const byDay = new Map<string, Task[]>();
    for (const t of withDue) {
      const key = t.dueDate!;
      const list = byDay.get(key) ?? [];
      list.push(t);
      byDay.set(key, list);
    }

    const sortedKeys = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
    return sortedKeys.map((key): DayGroup => {
      const meta = sectionLabel(key);
      const dayTasks = (byDay.get(key) ?? []).sort((a, b) => a.title.localeCompare(b.title));
      return { key, ...meta, tasks: dayTasks };
    });
  }, [tasks]);

  useEffect(() => {
    if (!open) {
      setPreviewTask(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !previewTask) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, previewTask]);

  return (
    <>
      <div className="schedule-launch">
        <button
          type="button"
          className="btn btn--ghost schedule-launch__btn"
          onClick={() => setOpen(true)}
        >
          Schedule
        </button>
        {preview && <span className="schedule-launch__hint">{preview}</span>}
      </div>

      {open && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!previewTask) setOpen(false);
          }}
          role="presentation"
        >
          <div
            className="modal modal--schedule"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal__head">
              <h2 id={titleId}>Schedule</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <div className="agenda__body agenda__body--modal">
              {groups.length === 0 ? (
                <p className="agenda__empty">No dated tasks yet</p>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.key}
                    className={`agenda__day${group.overdue ? ' is-overdue' : ''}${group.today ? ' is-today' : ''}`}
                  >
                    <header className="agenda__day-head">
                      <h3 className="agenda__day-title">{group.label}</h3>
                      <span className="agenda__day-count">{group.tasks.length}</span>
                    </header>
                    <ul className="agenda__list">
                      {group.tasks.map((task) => {
                        const cat = task.categoryId ? catMap.get(task.categoryId) : undefined;
                        const col = colMap.get(task.status);
                        const done = col?.role === 'end';
                        return (
                          <li key={task.id}>
                            <button
                              type="button"
                              className={`agenda__row${done ? ' is-done' : ''}`}
                              onClick={() => setPreviewTask(task)}
                            >
                              <span
                                className="agenda__dot"
                                style={{ background: cat?.color ?? 'var(--muted)' }}
                                aria-hidden="true"
                              />
                              <span className="agenda__row-main">
                                <span className="agenda__row-title">{task.title}</span>
                                <span className="agenda__row-meta">
                                  {cat && <span>{cat.name}</span>}
                                  {col && <span>{col.name}</span>}
                                  {task.expectedMinutes != null && (
                                    <span>{formatExpectedMinutes(task.expectedMinutes)}</span>
                                  )}
                                  {task.priority && <span>{PRIORITY_LABELS[task.priority]}</span>}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {previewTask && (
        <TaskPreview
          task={previewTask}
          category={previewTask.categoryId ? catMap.get(previewTask.categoryId) : undefined}
          column={colMap.get(previewTask.status)}
          onClose={() => setPreviewTask(null)}
        />
      )}
    </>
  );
}
