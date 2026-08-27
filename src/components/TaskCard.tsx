import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { formatRelativeDue } from '../lib/dates';
import { formatRecurrence } from '../lib/recurrence';
import type { Category, Task } from '../types';
import { PRIORITY_LABELS, PRIORITY_TINTS, formatExpectedMinutes } from '../types';
import { TaskPreviewModal } from './TaskPreviewModal';

function cardSurfaceStyle(task: Task, category: Category | undefined, isDone: boolean): CSSProperties {
  if (isDone) return {};

  if (category?.color) {
    return {
      background: `color-mix(in srgb, ${category.color} 10%, #ffffff)`,
      borderColor: `color-mix(in srgb, ${category.color} 16%, rgba(18, 21, 28, 0.08))`,
    };
  }

  if (task.priority) {
    return {
      background: PRIORITY_TINTS[task.priority],
      borderColor: 'rgba(18, 21, 28, 0.08)',
    };
  }

  return {};
}

interface TaskCardPreviewProps {
  task: Task;
  category?: Category;
  condensed?: boolean;
  dragOverlay?: boolean;
  isCompletedColumn?: boolean;
}

export function TaskCardPreview({
  task,
  category,
  condensed = false,
  dragOverlay = false,
  isCompletedColumn = false,
}: TaskCardPreviewProps) {
  const isDone = isCompletedColumn;
  const due = task.dueDate
    ? formatRelativeDue(task.dueDate, { completed: isDone })
    : null;

  return (
    <article
      className={[
        'task-card',
        isDone ? 'task-card--done' : '',
        condensed ? 'task-card--condensed' : '',
        dragOverlay ? 'task-card--overlay' : '',
        task.priority ? `task-card--prio-${task.priority}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={cardSurfaceStyle(task, category, isDone)}
    >
      <div className="task-card__top">
        {category ? (
          <span className="task-card__cat" style={{ '--cat': category.color } as CSSProperties}>
            {category.name}
          </span>
        ) : (
          <span className="task-card__spacer" />
        )}
        {condensed && <h3 className="task-card__title">{task.title}</h3>}
        {due?.relative && !condensed && (
          <span
            className={`task-card__relative${due.overdue ? ' is-overdue' : ''}${due.today ? ' is-today' : ''}`}
          >
            {due.relative}
          </span>
        )}
      </div>
      {!condensed && <h3 className="task-card__title">{task.title}</h3>}
      {!condensed && task.description ? (
        <p className="task-card__desc">{task.description}</p>
      ) : null}
      {!condensed && (
        <div className="task-card__meta">
          {due && (
            <span
              className={`task-card__due${due.overdue ? ' is-overdue' : ''}${due.today ? ' is-today' : ''}`}
            >
              {due.absolute}
            </span>
          )}
          {task.expectedMinutes != null && (
            <span className="task-card__time">{formatExpectedMinutes(task.expectedMinutes)}</span>
          )}
          {task.priority && (
            <span className={`task-card__prio task-card__prio--${task.priority}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
          )}
          {task.isRecurring && task.recurrence && (
            <span className="task-card__recur">{formatRecurrence(task.recurrence)}</span>
          )}
        </div>
      )}
    </article>
  );
}

interface TaskCardProps {
  task: Task;
  category?: Category;
  isCompletedColumn?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskCard({
  task,
  category,
  isCompletedColumn = false,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const skipClickRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const isDone = isCompletedColumn;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  useEffect(() => {
    if (isDragging) skipClickRef.current = true;
  }, [isDragging]);

  useLayoutEffect(() => {
    if (!menuOpen || !moreBtnRef.current) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      const rect = moreBtnRef.current!.getBoundingClientRect();
      const menuWidth = 148;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8,
      );
      setMenuPos({ top: rect.bottom + 4, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      setConfirmDelete(false);
      return;
    }
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || moreBtnRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const due = task.dueDate
    ? formatRelativeDue(task.dueDate, { completed: isDone })
    : null;

  const condensed = isDone;

  const dragStyle: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : undefined,
    position: isDragging ? 'relative' : undefined,
  };

  const openDetail = () => {
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }
    setMenuOpen(false);
    setDetailOpen(true);
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`task-drag${isDragging ? ' is-dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      <article
        className={[
          'task-card',
          'task-card--interactive',
          isDone ? 'task-card--done' : '',
          condensed ? 'task-card--condensed' : '',
          task.priority ? `task-card--prio-${task.priority}` : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={cardSurfaceStyle(task, category, isDone)}
        onClick={openDetail}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetail();
          }
        }}
      >
        <div className="task-card__top">
          {isDone ? (
            <span className="task-card__spacer" aria-hidden="true" />
          ) : category ? (
            <span className="task-card__cat" style={{ '--cat': category.color } as CSSProperties}>
              {category.name}
            </span>
          ) : (
            <span className="task-card__spacer" />
          )}

          {condensed && <h3 className="task-card__title">{task.title}</h3>}

          <div className="task-card__trailing">
            {due?.relative && !condensed && (
              <span
                className={`task-card__relative${due.overdue ? ' is-overdue' : ''}${due.today ? ' is-today' : ''}`}
              >
                {due.relative}
              </span>
            )}
            <div className="task-card__menu">
              <button
                ref={moreBtnRef}
                type="button"
                className="task-card__more"
                aria-label="Task actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
              >
                <span aria-hidden="true">⋯</span>
              </button>

              {menuOpen &&
                menuPos &&
                createPortal(
                  <div
                    ref={menuRef}
                    className="task-menu task-menu--portal"
                    id={menuId}
                    role="menu"
                    style={{ top: menuPos.top, left: menuPos.left }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEdit(task);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={`task-menu__danger${confirmDelete ? ' is-confirm' : ''}`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirmDelete) {
                          setConfirmDelete(true);
                          return;
                        }
                        setMenuOpen(false);
                        onDelete(task);
                      }}
                    >
                      {confirmDelete ? 'Sure?' : 'Delete'}
                    </button>
                  </div>,
                  document.body,
                )}
            </div>
          </div>
        </div>

        {!condensed && <h3 className="task-card__title">{task.title}</h3>}

        {!condensed && (
          <>
            {task.description ? <p className="task-card__desc">{task.description}</p> : null}

            <div className="task-card__meta">
              {due && (
                <span
                  className={`task-card__due${due.overdue ? ' is-overdue' : ''}${due.today ? ' is-today' : ''}`}
                >
                  {due.absolute}
                </span>
              )}
              {task.expectedMinutes != null && (
                <span className="task-card__time">{formatExpectedMinutes(task.expectedMinutes)}</span>
              )}
              {task.priority && (
                <span className={`task-card__prio task-card__prio--${task.priority}`}>
                  {PRIORITY_LABELS[task.priority]}
                </span>
              )}
              {task.isRecurring && task.recurrence && (
                <span className="task-card__recur" title={formatRecurrence(task.recurrence)}>
                  Recurring
                </span>
              )}
            </div>
          </>
        )}
      </article>

      {detailOpen && (
        <TaskPreviewModal
          task={task}
          category={category}
          isCompleted={isDone}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  );
}
