import { useCallback, useEffect, useState } from 'react';
import { subscribeCategories } from '../services/categories';
import { subscribeColumns } from '../services/columns';
import { subscribeTasks } from '../services/tasks';
import type { BoardColumn, Category, Task } from '../types';

export function useBoardData(uid: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!uid) {
      setTasks([]);
      setCategories([]);
      setColumns([]);
      setLoading(false);
      setError(null);
      return;
    }

    let tasksReady = false;
    let catsReady = false;
    let colsReady = false;
    let cancelled = false;

    setLoading(true);
    setError(null);

    const maybeDone = () => {
      if (!cancelled && tasksReady && catsReady && colsReady) {
        setLoading(false);
        setError(null);
      }
    };

    const fail = (e: Error) => {
      if (cancelled) return;
      setError(e.message);
      setLoading(false);
    };

    const unsubTasks = subscribeTasks(
      uid,
      (t) => {
        if (cancelled) return;
        setTasks(t);
        tasksReady = true;
        maybeDone();
      },
      fail,
    );

    const unsubCats = subscribeCategories(
      uid,
      (c) => {
        if (cancelled) return;
        setCategories(c);
        catsReady = true;
        maybeDone();
      },
      fail,
    );

    const unsubCols = subscribeColumns(
      uid,
      (c) => {
        if (cancelled) return;
        setColumns(c);
        colsReady = true;
        maybeDone();
      },
      fail,
    );

    return () => {
      cancelled = true;
      unsubTasks();
      unsubCats();
      unsubCols();
    };
  }, [uid, retryToken]);

  return { tasks, categories, columns, loading, error, retry };
}
