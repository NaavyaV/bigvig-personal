import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useId, useState, type CSSProperties, type FormEvent } from 'react';
import type { BoardColumn } from '../types';
import { MAX_BOARD_COLUMNS } from '../types';

interface ColumnManagerProps {
  open: boolean;
  columns: BoardColumn[];
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (ordered: BoardColumn[]) => Promise<void>;
}

function SortableColumnRow({
  column,
  busy,
  editingId,
  editName,
  confirmDeleteId,
  onStartEdit,
  onEditName,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}: {
  column: BoardColumn;
  busy: boolean;
  editingId: string | null;
  editName: string;
  confirmDeleteId: string | null;
  onStartEdit: () => void;
  onEditName: (v: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
}) {
  const locked = column.role === 'start' || column.role === 'end';
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 2 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`col-mgr__row${isDragging ? ' is-dragging' : ''}`}>
      <button
        type="button"
        className="col-mgr__handle"
        aria-label={`Reorder ${column.name}`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⋮⋮</span>
      </button>

      {editingId === column.id ? (
        <div className="col-mgr__edit">
          <input
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancelEdit}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={busy || !editName.trim()}
            onClick={onSaveEdit}
          >
            Save
          </button>
        </div>
      ) : (
        <>
          <span className="col-mgr__name">{column.name}</span>
          {locked && <span className="col-mgr__badge">Required</span>}
          <button type="button" className="btn btn--ghost btn--sm" onClick={onStartEdit}>
            Rename
          </button>
          {!locked && (
            <button
              type="button"
              className={`btn btn--ghost btn--sm${confirmDeleteId === column.id ? ' btn--sure' : ''}`}
              disabled={busy}
              onClick={onRemove}
            >
              {confirmDeleteId === column.id ? 'Sure?' : 'Remove'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function ColumnManager({
  open,
  columns,
  onClose,
  onCreate,
  onRename,
  onDelete,
  onReorder,
}: ColumnManagerProps) {
  const titleId = useId();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<BoardColumn[]>([]);

  const canAdd = columns.length < MAX_BOARD_COLUMNS;

  useEffect(() => {
    if (!open) {
      setName('');
      setEditingId(null);
      setError(null);
      setConfirmDeleteId(null);
      return;
    }
    setOrdered([...columns].sort((a, b) => a.order - b.order));
  }, [open, columns]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  if (!open) return null;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !canAdd) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(trimmed);
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add column');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await onRename(id, trimmed);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename');
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
    setError(null);
    try {
      await onDelete(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove column');
    } finally {
      setBusy(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordered.findIndex((c) => c.id === active.id);
    const newIndex = ordered.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);

    setBusy(true);
    try {
      await onReorder(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder');
      setOrdered([...columns].sort((a, b) => a.order - b.order));
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
          <h2 id={titleId}>Board columns</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="col-mgr__list">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ordered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {ordered.map((column) => (
                <SortableColumnRow
                  key={column.id}
                  column={column}
                  busy={busy}
                  editingId={editingId}
                  editName={editName}
                  confirmDeleteId={confirmDeleteId}
                  onStartEdit={() => {
                    setEditingId(column.id);
                    setEditName(column.name);
                    setConfirmDeleteId(null);
                    setError(null);
                  }}
                  onEditName={setEditName}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={() => void saveEdit(column.id)}
                  onRemove={() => void handleRemove(column.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {error && <p className="field-note field-note--error">{error}</p>}

        <form className="col-mgr__create" onSubmit={handleCreate}>
          <h3>Add column</h3>
          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Waiting, Review"
              disabled={!canAdd}
            />
          </label>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={busy || !name.trim() || !canAdd}
          >
            {canAdd ? 'Add column' : `Max ${MAX_BOARD_COLUMNS} columns`}
          </button>
        </form>
      </div>
    </div>
  );
}
