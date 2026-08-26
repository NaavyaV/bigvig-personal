import {
  addDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Category } from '../types';
import { userCategoriesCol, userCategoryDoc } from './paths';

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
  uid: string,
  onChange: (categories: Category[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(userCategoriesCol(uid), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => mapCategory(d.id, d.data())));
    },
    (err) => onError?.(err),
  );
}

export async function createCategory(
  uid: string,
  name: string,
  color: string,
  order: number,
): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(userCategoriesCol(uid), {
    name: name.trim(),
    color,
    order,
    createdAtIso: now,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(
  uid: string,
  id: string,
  patch: Partial<Pick<Category, 'name' | 'color' | 'order'>>,
): Promise<void> {
  await updateDoc(userCategoryDoc(uid, id), patch);
}

export async function deleteCategory(uid: string, id: string): Promise<void> {
  await deleteDoc(userCategoryDoc(uid, id));
}
