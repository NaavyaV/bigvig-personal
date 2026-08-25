import { useEffect, useId, useState, type FormEvent } from 'react';
import { dateFromOffset, daysUntilDue, todayISO } from '../lib/dates';
import type {
  Category,
  Recurrence,
  RecurrenceFrequency,
  Task,
  TaskInput,
  TaskPriority,
  TaskStatus,
} from '../types';
import { PRIORITY_LABELS, RECURRENCE_LABELS } from '../types';

interface TaskModalProps {
  open: boolean;
  task: Task | null;
  categories: Category[];
  defaultStatus?: TaskStatus;
  nextOrder: number;
  onClose: () => void;
  onSave: (input: TaskInput, id?: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

type EndMode = 'never' | 'date' | 'count';

const emptyForm = {
  title: '',
  description: '',
  dueDate: '',
  categoryId: '',
  priority: '' as '' | TaskPriority,
  status: 'not_started' as TaskStatus,
  isRecurring: false,
  frequency: 'weekly' as RecurrenceFrequency,
  interval: 1,
  endMode: 'never' as EndMode,
  endDate: '',
  maxOccurrences: 5,
};

function clampDue(iso: string): string {
  const min = todayISO();
  return iso < min ? min : iso;
}

export function TaskModal({
  open,
  task,
  categories,
  defaultStatus = 'not_started',
  nextOrder,
  onClose,
  onSave,
  onDelete,
}: TaskModalProps) {
  const titleId = useId();
  const recurId = useId();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEditing = Boolean(task);
  const minDate = todayISO();

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (task) {
      const r = task.recurrence;
      let endMode: EndMode = 'never';
      if (r?.maxOccurrences) endMode = 'count';
      else if (r?.endDate) endMode = 'date';

      setForm({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate ? clampDue(task.dueDate) : '',
        categoryId: task.categoryId ?? '',
        priority: task.priority ?? '',
        status: task.status,
        isRecurring: task.isRecurring,
        frequency: r?.frequency ?? 'weekly',
        interval: r?.interval ?? 1,
        endMode,
        endDate: r?.endDate ?? '',
        maxOccurrences: r?.maxOccurrences ?? 5,
      });
    } else {
      setForm({ ...emptyForm, status: defaultStatus, dueDate: todayISO() });
    }
  }, [open, task, defaultStatus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit =
    form.title.trim().length > 0 && Boolean(form.dueDate) && Boolean(form.categoryId);

  const offsetDays = form.dueDate ? Math.max(0, daysUntilDue(form.dueDate)) : 0;

  function setDue(iso: string) {
    setForm((f) => ({ ...f, dueDate: clampDue(iso) }));
  }

  function nudgeDue(delta: number) {
    const next = Math.max(0, offsetDays + delta);
    setDue(dateFromOffset(next));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const due = clampDue(form.dueDate);
    if (due < minDate) return;

    setSaving(true);
    try {
      const priorCount = task?.recurrence?.completedCount ?? 0;
      const recurrence: Recurrence | null = form.isRecurring
        ? {
            frequency: form.frequency,
            interval: Math.max(1, Number(form.interval) || 1),
            endDate: form.endMode === 'date' && form.endDate ? form.endDate : null,
            maxOccurrences:
              form.endMode === 'count' ? Math.max(1, Number(form.maxOccurrences) || 1) : null,
            completedCount: priorCount,
          }
        : null;

      const input: TaskInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: due,
        categoryId: form.categoryId,
        priority: form.priority || null,
        status: isEditing ? form.status : 'not_started',
        order: task?.order ?? nextOrder,
        isRecurring: form.isRecurring,
        recurrence,
      };

      await onSave(input, task?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      await onDelete(task.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2 id={titleId}>{isEditing ? 'Edit task' : 'New task'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form className="modal__form" onSubmit={handleSubmit}>
          <label className="field">
            <span>
              Name <em className="req">required</em>
            </span>
            <input
              autoFocus
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What needs doing?"
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Notes, context, links…"
            />
          </label>

          <div className="field">
            <span>
              Due date <em className="req">required</em>
            </span>
            <div className="due-presets" role="group" aria-label="Quick due dates">
              <button
                type="button"
                className={`chip${offsetDays === 0 && form.dueDate ? ' is-active' : ''}`}
                onClick={() => setDue(todayISO())}
              >
                Today
              </button>
              <button
                type="button"
                className={`chip${offsetDays === 7 ? ' is-active' : ''}`}
                onClick={() => setDue(dateFromOffset(7))}
              >
                In 1 week
              </button>
              <div className="due-stepper">
                <button
                  type="button"
                  className="due-stepper__btn"
                  aria-label="One day earlier"
                  disabled={offsetDays <= 0}
                  onClick={() => nudgeDue(-1)}
                >
                  −
                </button>
                <span className="due-stepper__label">
                  {offsetDays === 0
                    ? 'Today'
                    : offsetDays === 1
                      ? 'In 1 day'
                      : `In ${offsetDays} days`}
                </span>
                <button
                  type="button"
                  className="due-stepper__btn"
                  aria-label="One day later"
                  onClick={() => nudgeDue(1)}
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              min={minDate}
              value={form.dueDate}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>

          <div className="field-row">
            <label className="field">
              <span>
                Category <em className="req">required</em>
              </span>
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="" disabled>
                  {categories.length === 0 ? 'Create a category first' : 'Select category'}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Priority</span>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priority: e.target.value as '' | TaskPriority,
                  }))
                }
              >
                <option value="">None</option>
                {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {categories.length === 0 && (
            <p className="field-note">Add a category from the top bar before creating a task.</p>
          )}

          {isEditing && (
            <label className="field">
              <span>Column</span>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
              >
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          )}

          <div className={`recur-block${form.isRecurring ? ' is-on' : ''}`}>
            <button
              type="button"
              className="recur-toggle"
              id={recurId}
              role="switch"
              aria-checked={form.isRecurring}
              onClick={() => setForm((f) => ({ ...f, isRecurring: !f.isRecurring }))}
            >
              <span className="recur-toggle__copy">
                <span className="recur-toggle__label">Repeat this task</span>
                <span className="recur-toggle__hint">
                  Completing it keeps a done copy and adds the next one to Not started
                </span>
              </span>
              <span className="recur-toggle__track" aria-hidden="true">
                <span className="recur-toggle__thumb" />
              </span>
            </button>

            {form.isRecurring && (
              <div className="recur-fields">
                <div className="field-row">
                  <label className="field">
                    <span>Repeats</span>
                    <select
                      value={form.frequency}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          frequency: e.target.value as RecurrenceFrequency,
                        }))
                      }
                    >
                      {(Object.keys(RECURRENCE_LABELS) as RecurrenceFrequency[]).map((k) => (
                        <option key={k} value={k}>
                          {RECURRENCE_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Every (×)</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={form.interval}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, interval: Number(e.target.value) || 1 }))
                      }
                    />
                  </label>
                </div>

                <fieldset className="end-mode">
                  <legend>Ends</legend>
                  <label className="end-mode__option">
                    <input
                      type="radio"
                      name="endMode"
                      checked={form.endMode === 'never'}
                      onChange={() => setForm((f) => ({ ...f, endMode: 'never' }))}
                    />
                    <span>Never</span>
                  </label>
                  <label className="end-mode__option">
                    <input
                      type="radio"
                      name="endMode"
                      checked={form.endMode === 'date'}
                      onChange={() => setForm((f) => ({ ...f, endMode: 'date' }))}
                    />
                    <span>On date</span>
                  </label>
                  <label className="end-mode__option">
                    <input
                      type="radio"
                      name="endMode"
                      checked={form.endMode === 'count'}
                      onChange={() => setForm((f) => ({ ...f, endMode: 'count' }))}
                    />
                    <span>After occurrences</span>
                  </label>
                </fieldset>

                {form.endMode === 'date' && (
                  <label className="field">
                    <span>Ends on</span>
                    <input
                      type="date"
                      required
                      min={minDate}
                      value={form.endDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    />
                  </label>
                )}

                {form.endMode === 'count' && (
                  <label className="field">
                    <span>Number of occurrences</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      required
                      value={form.maxOccurrences}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          maxOccurrences: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          <footer className="modal__foot">
            {task && onDelete ? (
              <button
                type="button"
                className={`btn btn--danger${confirmDelete ? ' is-confirm' : ''}`}
                onClick={handleDelete}
                disabled={saving}
              >
                {confirmDelete ? 'Sure?' : 'Delete'}
              </button>
            ) : (
              <span />
            )}
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving || !canSubmit}>
                {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
