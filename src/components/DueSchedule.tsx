import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { daysUntilDue } from '../lib/dates';
import type { BoardColumn, Category, Task } from '../types';
import { formatExpectedMinutes, PRIORITY_LABELS } from '../types';

interface DueScheduleProps {
  tasks: Task[];
  categories: Category[];
  columns: BoardColumn[];
  onOpenTask: (task: Task) => void;
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

export function DueSchedule({ tasks, categories, columns, onOpenTask }: DueScheduleProps) {
  const [open, setOpen] = useState(false);
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

  const total = groups.reduce((n, g) => n + g.tasks.length, 0);

  return (
    <section className={`agenda${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="agenda__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="agenda__toggle-copy">
          <span className="agenda__title">Schedule</span>
          <span className="agenda__count">{total} task{total === 1 ? '' : 's'}</span>
        </span>
        <svg className="agenda__chevron" width="14" height="14" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.5 4.5 L6 8 L9.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="agenda__body">
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
                          onClick={() => onOpenTask(task)}
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
      )}
    </section>
  );
}
