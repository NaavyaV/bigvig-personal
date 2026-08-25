import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import { moveTask } from '../services/tasks';
import type { Category, Task, TaskStatus } from '../types';
import { STATUSES } from '../types';
import { Column } from './Column';

interface BoardProps {
  tasks: Task[];
  categories: Category[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToast: (msg: string) => void;
}

export function Board({ tasks, categories, onEdit, onDelete, onToast }: BoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
  );

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      not_started: [],
      in_progress: [],
      completed: [],
    };
    for (const t of tasks) {
      map[t.status]?.push(t);
    }
    for (const s of STATUSES) {
      map[s].sort((a, b) => a.order - b.order);
    }
    return map;
  }, [tasks]);

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

    if (STATUSES.includes(overId as TaskStatus)) {
      newStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    if (!newStatus || newStatus === task.status) return;

    const peers = tasks.filter((t) => t.status === newStatus && t.id !== task.id);
    const newOrder = peers.length === 0 ? 0 : Math.max(...peers.map((t) => t.order)) + 1;
    const nsPeers = tasks.filter((t) => t.status === 'not_started' && t.id !== task.id);
    const nsOrder = nsPeers.length === 0 ? 0 : Math.max(...nsPeers.map((t) => t.order)) + 1;

    try {
      const result = await moveTask(task, newStatus, newOrder, nsOrder);
      if (result.recurred) {
        onToast('Completed — next occurrence added to Not started');
      } else if (result.ended) {
        onToast('Recurrence ended — task marked complete');
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Could not move task');
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={clearDrag}
    >
      <div className={`board${activeId ? ' board--dragging' : ''}`}>
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={byStatus[status]}
            categories={categories}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}
