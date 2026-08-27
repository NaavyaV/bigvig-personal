import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMemo, useState, type CSSProperties } from 'react';
import { moveTask } from '../services/tasks';
import type { BoardColumn, Category, Task, TaskStatus } from '../types';
import { getEndColumnId, getStartColumnId } from '../types';
import { Column } from './Column';

interface BoardProps {
  uid: string;
  tasks: Task[];
  categories: Category[];
  columns: BoardColumn[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToast: (msg: string) => void;
}

export function Board({ uid, tasks, categories, columns, onEdit, onDelete, onToast }: BoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const startId = getStartColumnId(columns);
  const endId = getEndColumnId(columns);
  const columnIds = useMemo(() => new Set(columns.map((c) => c.id)), [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
  );

  const byStatus = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const col of columns) map.set(col.id, []);
    for (const t of tasks) {
      const list = map.get(t.status);
      if (list) list.push(t);
      else {
        // Orphan status → start column bucket
        map.get(startId)?.push(t);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          const byDue = a.dueDate.localeCompare(b.dueDate);
          if (byDue !== 0) return byDue;
        } else if (a.dueDate) return -1;
        else if (b.dueDate) return 1;
        return a.order - b.order;
      });
    }
    return map;
  }, [tasks, columns, startId]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function clearDrag() {
    setActiveId(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    clearDrag();
    const { active, over } = event;
    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    const overId = String(over.id);
    let newStatus: TaskStatus | null = null;

    if (columnIds.has(overId)) {
      newStatus = overId;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    if (!newStatus || newStatus === task.status) return;

    const peers = tasks.filter((t) => t.status === newStatus && t.id !== task.id);
    const newOrder = peers.length === 0 ? 0 : Math.max(...peers.map((t) => t.order)) + 1;
    const nsPeers = tasks.filter((t) => t.status === startId && t.id !== task.id);
    const nsOrder = nsPeers.length === 0 ? 0 : Math.max(...nsPeers.map((t) => t.order)) + 1;

    try {
      const result = await moveTask(uid, task, newStatus, newOrder, {
        orderForNotStarted: nsOrder,
        isCompletedColumn: newStatus === endId,
        startColumnId: startId,
      });
      if (result.recurred) {
        onToast('Completed — next occurrence added to Not started');
      } else if (result.ended) {
        onToast('Recurrence ended — task marked complete');
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Could not move task');
    }
  }

  const count = columns.length;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={clearDrag}
    >
      <div
        className={`board${activeId ? ' board--dragging' : ''}`}
        style={{ '--col-count': String(count) } as CSSProperties}
      >
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={byStatus.get(column.id) ?? []}
            categories={categories}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}
