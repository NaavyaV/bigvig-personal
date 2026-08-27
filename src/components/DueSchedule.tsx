import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { daysUntilDue } from '../lib/dates';
import type { BoardColumn, Category, Task } from '../types';
import { formatExpectedMinutes, PRIORITY_LABELS } from '../types';
import { TaskPreviewModal } from './TaskPreviewModal';

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

export function DueSchedule({ tasks, categories, columns }: DueScheduleProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>
        Schedule
      </button>

      {open &&
        createPortal(
          <div
            className="modal-backdrop schedule-overlay"
            onClick={() => {
              if (!previewTask) setOpen(false);
            }}
            role="presentation"
          >
            <div
              className="schedule-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="schedule-sheet__head">
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

              <div className="schedule-sheet__body">
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
                                    {task.priority && (
                                      <span>{PRIORITY_LABELS[task.priority]}</span>
                                    )}
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
          </div>,
          document.body,
        )}

      {previewTask && (
        <TaskPreviewModal
          task={previewTask}
          category={previewTask.categoryId ? catMap.get(previewTask.categoryId) : undefined}
          column={colMap.get(previewTask.status)}
          onClose={() => setPreviewTask(null)}
        />
      )}
    </>
  );
}
