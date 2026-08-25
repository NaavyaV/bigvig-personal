import { useCallback, useEffect, useState } from 'react';
import { subscribeCategories } from '../services/categories';
import { subscribeTasks } from '../services/tasks';
import type { Category, Task } from '../types';

export function useBoardData() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let tasksReady = false;
    let catsReady = false;
    let cancelled = false;

    const maybeDone = () => {
      if (!cancelled && tasksReady && catsReady) {
        setLoading(false);
        setError(null);
      }
    };

    const unsubTasks = subscribeTasks(
      (t) => {
        if (cancelled) return;
        setTasks(t);
        tasksReady = true;
        maybeDone();
      },
      (e) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      },
    );

    const unsubCats = subscribeCategories(
      (c) => {
        if (cancelled) return;
        setCategories(c);
        catsReady = true;
        maybeDone();
      },
      (e) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubTasks();
      unsubCats();
    };
  }, [retryToken]);

  return { tasks, categories, loading, error, retry };
}
