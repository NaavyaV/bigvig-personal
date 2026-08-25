import { useEffect, useId, useState, type FormEvent } from 'react';
import type { Category } from '../types';
import { CATEGORY_COLORS } from '../types';

interface CategoryManagerProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (id: string, patch: { name?: string; color?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

export function CategoryManager({
  open,
  categories,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: CategoryManagerProps) {
  const titleId = useId();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setEditingId(null);
      setError(null);
      setConfirmDeleteId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function isDuplicate(candidate: string, exceptId?: string) {
    const key = normalizeName(candidate);
    return categories.some((c) => c.id !== exceptId && normalizeName(c.name) === key);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isDuplicate(trimmed)) {
      setError('That category name already exists');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate(trimmed, color);
      setName('');
      setColor(CATEGORY_COLORS[(categories.length + 1) % CATEGORY_COLORS.length]);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (isDuplicate(trimmed, id)) {
      setError('That category name already exists');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUpdate(id, { name: trimmed });
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setBusy(true);
    try {
      await onDelete(id);
      setConfirmDeleteId(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal modal--sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2 id={titleId}>Categories</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <ul className={`cat-list${categories.length > 4 ? ' cat-list--scroll' : ''}`}>
          {categories.length === 0 && <li className="cat-list__empty">No categories yet</li>}
          {categories.map((c) => (
            <li key={c.id} className="cat-list__item">
              {editingId === c.id ? (
                <div className="cat-edit">
                  <input
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setError(null);
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveEdit(c.id);
                    }}
                  />
                  <div className="color-row">
                    {CATEGORY_COLORS.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        className={`swatch${c.color === swatch ? ' is-active' : ''}`}
                        style={{ background: swatch }}
                        aria-label={swatch}
                        onClick={() => void onUpdate(c.id, { color: swatch })}
                      />
                    ))}
                  </div>
                  <div className="cat-edit__actions">
                    <button type="button" className="btn btn--ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={busy}
                      onClick={() => void saveEdit(c.id)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="cat-dot" style={{ background: c.color }} />
                  <span className="cat-name">{c.name}</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                      setError(null);
                      setConfirmDeleteId(null);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`btn btn--ghost btn--sm${confirmDeleteId === c.id ? ' btn--sure' : ''}`}
                    disabled={busy}
                    onClick={() => void handleRemove(c.id)}
                  >
                    {confirmDeleteId === c.id ? 'Sure?' : 'Remove'}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <form className="cat-create" onSubmit={handleCreate}>
          <h3>Add category</h3>
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Work, Home, Health"
            />
          </label>
          {error && <p className="field-note field-note--error">{error}</p>}
          <div className="color-row" role="group" aria-label="Color">
            {CATEGORY_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`swatch${color === swatch ? ' is-active' : ''}`}
                style={{ background: swatch }}
                aria-label={swatch}
                onClick={() => setColor(swatch)}
              />
            ))}
          </div>
          <button type="submit" className="btn btn--primary" disabled={busy || !name.trim()}>
            Add category
          </button>
        </form>
      </div>
    </div>
  );
}
