import { useDroppable } from '@dnd-kit/core';
import type { Category, Task, TaskStatus } from '../types';
import { STATUS_LABELS } from '../types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  categories: Category[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const COLUMN_HINT: Record<TaskStatus, string> = {
  not_started: 'Ready to pick up',
  in_progress: 'Actively working',
  completed: 'Done — collapsed by default',
};

export function Column({ status, tasks, categories, onEdit, onDelete }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <section className={`column column--${status}${isOver ? ' is-over' : ''}`}>
      <header className="column__head">
        <div className="column__heading">
          <h2 className="column__title">{STATUS_LABELS[status]}</h2>
          <p className="column__hint">{COLUMN_HINT[status]}</p>
        </div>
        <span className="column__count" aria-label={`${tasks.length} tasks`}>
          {tasks.length}
        </span>
      </header>

      <div ref={setNodeRef} className="column__body">
        {tasks.length === 0 ? (
          <div className="column__empty">
            <span className="column__empty-mark" aria-hidden="true" />
            <p>Drop a task here</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              category={task.categoryId ? catMap.get(task.categoryId) : undefined}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}
