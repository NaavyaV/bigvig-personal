import { useEffect, useId, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useLiveCalendarDay } from '../hooks/CalendarDayContext';
import { formatRelativeDue } from '../lib/dates';
import { linkifyText } from '../lib/linkify';
import { formatRecurrence } from '../lib/recurrence';
import type { BoardColumn, Category, Task } from '../types';
import { formatExpectedMinutes, PRIORITY_LABELS } from '../types';

interface TaskPreviewModalProps {
  task: Task;
  category?: Category;
  column?: BoardColumn;
  isCompleted?: boolean;
  onClose: () => void;
}

export function TaskPreviewModal({
  task,
  category,
  column,
  isCompleted = false,
  onClose,
}: TaskPreviewModalProps) {
  const titleId = useId();
  useLiveCalendarDay();
  const completed = isCompleted || column?.role === 'end';
  const due = task.dueDate ? formatRelativeDue(task.dueDate, { completed }) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
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
            <p className="task-preview__desc">{linkifyText(task.description)}</p>
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
    </div>,
    document.body,
  );
}
