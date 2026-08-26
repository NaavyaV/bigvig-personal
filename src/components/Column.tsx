import { useDroppable } from '@dnd-kit/core';
import type { BoardColumn, Category, Task } from '../types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  column: BoardColumn;
  tasks: Task[];
  categories: Category[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function Column({ column, tasks, categories, onEdit, onDelete }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const isDone = column.role === 'end';

  return (
    <section
      className={`column column--${column.role}${isOver ? ' is-over' : ''}`}
      data-column={column.id}
    >
      <header className="column__head">
        <div className="column__heading">
          <h2 className="column__title">{column.name}</h2>
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
              isCompletedColumn={isDone}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}
