import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Category } from '../types';

const categoriesCol = collection(db, 'categories');

function mapCategory(id: string, data: Record<string, unknown>): Category {
  return {
    id,
    name: String(data.name ?? ''),
    color: String(data.color ?? '#0F766E'),
    order: Number(data.order ?? 0),
    createdAt: String(data.createdAtIso ?? ''),
  };
}

export function subscribeCategories(
  onChange: (categories: Category[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(categoriesCol, orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => mapCategory(d.id, d.data())));
    },
    (err) => onError?.(err),
  );
}

export async function createCategory(name: string, color: string, order: number): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(categoriesCol, {
    name: name.trim(),
    color,
    order,
    createdAtIso: now,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<Category, 'name' | 'color' | 'order'>>,
): Promise<void> {
  await updateDoc(doc(db, 'categories', id), patch);
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', id));
}
