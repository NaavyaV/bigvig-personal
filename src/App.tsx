import { useCallback, useMemo, useState } from 'react';
import { Board } from './components/Board';
import { CategoryManager } from './components/CategoryManager';
import { TaskModal } from './components/TaskModal';
import { useBoardData } from './hooks/useBoardData';
import { useToast } from './hooks/useToast';
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from './services/categories';
import { createTask, deleteTask, moveTask, nextOrder, updateTask } from './services/tasks';
import type { Task, TaskInput } from './types';

export default function App() {
  const { tasks, categories, loading, error, retry } = useBoardData();
  const { message, toast } = useToast();

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'completed').length;
    const active = tasks.filter((t) => t.status === 'in_progress').length;
    const backlog = tasks.filter((t) => t.status === 'not_started').length;
    return { total, done, active, backlog };
  }, [tasks]);

  const openCreate = useCallback(() => {
    setEditingTask(null);
    setTaskModalOpen(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  }, []);

  async function handleSaveTask(input: TaskInput, id?: string) {
    try {
      if (id) {
        const existing = tasks.find((t) => t.id === id);
        if (
          existing &&
          input.status === 'completed' &&
          existing.status !== 'completed' &&
          input.isRecurring &&
          input.recurrence
        ) {
          const result = await moveTask(
            { ...existing, ...input, id: existing.id },
            'completed',
            nextOrder(tasks, 'completed'),
            nextOrder(tasks, 'not_started'),
          );
          if (result.recurred) toast('Recurring task reset for the next occurrence');
          else if (result.ended) toast('Recurrence ended — task marked complete');
          else toast('Task updated');
        } else {
          await updateTask(id, {
            ...input,
            completedAt: input.status === 'completed' ? new Date().toISOString() : null,
          });
          toast('Task updated');
        }
      } else {
        await createTask(input);
        toast('Task created');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save task');
      throw e;
    }
  }

  async function handleDeleteTask(id: string) {
    try {
      await deleteTask(id);
      toast('Task deleted');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete task');
      throw e;
    }
  }

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <div className="brand__row">
            <span className="brand__glyph" aria-hidden="true" />
            <p className="brand__mark">BigVig&apos;s life board :D</p>
          </div>
          <p className="brand__sub">Personal flow · keep moving</p>
        </div>

        {!loading && !error && (
          <div className="stat-strip" aria-label="Board summary">
            <div className="stat">
              <span className="stat__value">{stats.backlog}</span>
              <span className="stat__label">Backlog</span>
            </div>
            <div className="stat stat--accent">
              <span className="stat__value">{stats.active}</span>
              <span className="stat__label">Active</span>
            </div>
            <div className="stat">
              <span className="stat__value">{stats.done}</span>
              <span className="stat__label">Done</span>
            </div>
          </div>
        )}

        <div className="topbar__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setCatModalOpen(true)}>
            Categories
            {categories.length > 0 && <span className="btn__badge">{categories.length}</span>}
          </button>
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            <span className="btn__plus" aria-hidden="true">
              +
            </span>
            New task
          </button>
        </div>
      </header>

      <main className="main">
        {loading && (
          <div className="board board--skeleton" aria-busy="true" aria-label="Loading board">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skel-col">
                <div className="skel skel--head" />
                <div className="skel skel--card" />
                <div className="skel skel--card skel--short" />
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="state-msg state-msg--error">
            <p>Couldn’t connect to Firestore.</p>
            <p className="state-msg__detail">{error}</p>
            <button type="button" className="btn btn--primary" onClick={retry}>
              Retry connection
            </button>
          </div>
        )}
        {!loading && !error && (
          <Board
            tasks={tasks}
            categories={categories}
            onEdit={openEdit}
            onDelete={(task) => void handleDeleteTask(task.id)}
            onToast={toast}
          />
        )}
      </main>

      <TaskModal
        open={taskModalOpen}
        task={editingTask}
        categories={categories}
        nextOrder={nextOrder(tasks, editingTask?.status ?? 'not_started')}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <CategoryManager
        open={catModalOpen}
        categories={categories}
        onClose={() => setCatModalOpen(false)}
        onCreate={async (name, color) => {
          await createCategory(name, color, categories.length);
          toast('Category added');
        }}
        onUpdate={async (id, patch) => {
          await updateCategory(id, patch);
          toast('Category updated');
        }}
        onDelete={async (id) => {
          await deleteCategory(id);
          const affected = tasks.filter((t) => t.categoryId === id);
          await Promise.all(affected.map((t) => updateTask(t.id, { categoryId: null })));
          toast('Category removed');
        }}
      />

      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
