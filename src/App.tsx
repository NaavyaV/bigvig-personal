import { useCallback, useState } from 'react';
import { useAuth } from './auth/AuthProvider';
import { AuthScreen } from './components/AuthScreen';
import { Board } from './components/Board';
import { CategoryManager } from './components/CategoryManager';
import { ColumnManager } from './components/ColumnManager';
import { DueSchedule } from './components/DueSchedule';
import { ProfileMenu } from './components/ProfileMenu';
import { TaskModal } from './components/TaskModal';
import { CalendarDayProvider } from './hooks/CalendarDayContext';
import { useBoardData } from './hooks/useBoardData';
import { useToast } from './hooks/useToast';
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from './services/categories';
import {
  createColumn,
  deleteColumn,
  reorderColumns,
  updateColumn,
} from './services/columns';
import {
  createTask,
  deleteTask,
  moveTask,
  nextOrder,
  reassignTasksFromColumn,
  updateTask,
} from './services/tasks';
import type { Task, TaskInput } from './types';
import { getEndColumnId, getStartColumnId } from './types';

function BoardApp({ uid }: { uid: string }) {
  const { tasks, categories, columns, loading, error, retry } = useBoardData(uid);
  const { message, toast } = useToast();

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [colModalOpen, setColModalOpen] = useState(false);

  const startId = getStartColumnId(columns);
  const endId = getEndColumnId(columns);

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
          input.status === endId &&
          existing.status !== endId &&
          input.isRecurring &&
          input.recurrence
        ) {
          const result = await moveTask(
            uid,
            { ...existing, ...input, id: existing.id },
            endId,
            nextOrder(tasks, endId),
            {
              orderForNotStarted: nextOrder(tasks, startId),
              isCompletedColumn: true,
              startColumnId: startId,
            },
          );
          if (result.recurred) toast('Recurring task reset for the next occurrence');
          else if (result.ended) toast('Recurrence ended — task marked complete');
          else toast('Task updated');
        } else {
          await updateTask(uid, id, {
            ...input,
            completedAt: input.status === endId ? new Date().toISOString() : null,
          });
          toast('Task updated');
        }
      } else {
        await createTask(uid, input);
        toast('Task created');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save task');
      throw e;
    }
  }

  async function handleDeleteTask(id: string) {
    try {
      await deleteTask(uid, id);
      toast('Task deleted');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete task');
      throw e;
    }
  }

  return (
    <CalendarDayProvider>
    <div className="app">
      <div className="atmosphere" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <div className="brand__row">
            <span className="brand__glyph" aria-hidden="true" />
            <p className="brand__mark">BigVig&apos;s life board :D</p>
          </div>
        </div>

        {!loading && !error && (
          <div className="topbar__center">
            <DueSchedule tasks={tasks} categories={categories} columns={columns} />
          </div>
        )}

        <div className="topbar__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setColModalOpen(true)}>
            Columns
            {columns.length > 0 && <span className="btn__badge">{columns.length}</span>}
          </button>
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
          <ProfileMenu />
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
            uid={uid}
            tasks={tasks}
            categories={categories}
            columns={columns}
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
        columns={columns}
        nextOrder={nextOrder(tasks, editingTask?.status ?? startId)}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <CategoryManager
        open={catModalOpen}
        categories={categories}
        onClose={() => setCatModalOpen(false)}
        onCreate={async (name, color) => {
          await createCategory(uid, name, color, categories.length);
          toast('Category added');
        }}
        onUpdate={async (id, patch) => {
          await updateCategory(uid, id, patch);
          toast('Category updated');
        }}
        onDelete={async (id) => {
          await deleteCategory(uid, id);
          const affected = tasks.filter((t) => t.categoryId === id);
          await Promise.all(affected.map((t) => updateTask(uid, t.id, { categoryId: null })));
          toast('Category removed');
        }}
      />

      <ColumnManager
        open={colModalOpen}
        columns={columns}
        onClose={() => setColModalOpen(false)}
        onCreate={async (name) => {
          const insertOrder = columns.length;
          const id = await createColumn(uid, name, insertOrder);
          await reorderColumns(uid, [
            ...columns,
            { id, name, order: insertOrder, role: 'middle', createdAt: '' },
          ]);
          toast('Column added');
        }}
        onRename={async (id, name) => {
          await updateColumn(uid, id, { name });
          toast('Column renamed');
        }}
        onDelete={async (id) => {
          await reassignTasksFromColumn(uid, id, startId, tasks);
          await deleteColumn(uid, id);
          const remaining = columns.filter((c) => c.id !== id);
          await reorderColumns(
            uid,
            remaining.map((c, i) => ({ ...c, order: i })),
          );
          toast('Column removed');
        }}
        onReorder={async (ordered) => {
          await reorderColumns(uid, ordered);
        }}
      />

      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </div>
    </CalendarDayProvider>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="atmosphere" aria-hidden="true" />
        <div className="auth-loading" aria-busy="true">
          Loading…
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return <BoardApp uid={user.uid} />;
}
