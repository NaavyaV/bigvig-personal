import {
  addDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  deleteDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { BoardColumn, ColumnRole } from '../types';
import { DEFAULT_COLUMN_IDS, MAX_BOARD_COLUMNS } from '../types';
import { userColumnDoc, userColumnsCol } from './paths';

const DEFAULTS: Array<{ id: string; name: string; order: number; role: ColumnRole }> = [
  { id: DEFAULT_COLUMN_IDS.start, name: 'Not started', order: 0, role: 'start' },
  { id: DEFAULT_COLUMN_IDS.middle, name: 'In progress', order: 1, role: 'middle' },
  { id: DEFAULT_COLUMN_IDS.end, name: 'Completed', order: 2, role: 'end' },
];

function mapColumn(id: string, data: Record<string, unknown>): BoardColumn {
  const role = (data.role as ColumnRole) ?? 'middle';
  return {
    id,
    name: String(data.name ?? 'Column'),
    order: Number(data.order ?? 0),
    role: role === 'start' || role === 'end' || role === 'middle' ? role : 'middle',
    createdAt: String(data.createdAtIso ?? ''),
  };
}

const seedingByUser = new Map<string, Promise<void>>();

/** Ensure the three default columns exist for this user. */
export async function ensureDefaultColumns(uid: string): Promise<void> {
  const existing = seedingByUser.get(uid);
  if (existing) return existing;

  const promise = (async () => {
    const snap = await getDocs(userColumnsCol(uid));
    if (!snap.empty) return;
    const now = new Date().toISOString();
    await Promise.all(
      DEFAULTS.map((col) =>
        setDoc(userColumnDoc(uid, col.id), {
          name: col.name,
          order: col.order,
          role: col.role,
          createdAtIso: now,
          createdAt: serverTimestamp(),
        }),
      ),
    );
  })().finally(() => {
    seedingByUser.delete(uid);
  });

  seedingByUser.set(uid, promise);
  return promise;
}

export function subscribeColumns(
  uid: string,
  onChange: (columns: BoardColumn[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  void ensureDefaultColumns(uid).catch((e) =>
    onError?.(e instanceof Error ? e : new Error(String(e))),
  );

  const q = query(userColumnsCol(uid), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        onChange(
          DEFAULTS.map((c) => ({
            id: c.id,
            name: c.name,
            order: c.order,
            role: c.role,
            createdAt: '',
          })),
        );
        return;
      }
      onChange(snap.docs.map((d) => mapColumn(d.id, d.data())));
    },
    (err) => onError?.(err),
  );
}

export async function createColumn(uid: string, name: string, order: number): Promise<string> {
  const snap = await getDocs(userColumnsCol(uid));
  if (snap.size >= MAX_BOARD_COLUMNS) {
    throw new Error(`You can have at most ${MAX_BOARD_COLUMNS} columns`);
  }
  const now = new Date().toISOString();
  const ref = await addDoc(userColumnsCol(uid), {
    name: name.trim(),
    order,
    role: 'middle' as ColumnRole,
    createdAtIso: now,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateColumn(
  uid: string,
  id: string,
  patch: Partial<Pick<BoardColumn, 'name' | 'order'>>,
): Promise<void> {
  if (patch.name !== undefined) {
    const snap = await getDocs(userColumnsCol(uid));
    const target = snap.docs.find((d) => d.id === id);
    const role = target?.data().role as ColumnRole | undefined;
    if (role === 'start' || role === 'end') {
      throw new Error('Not started and Completed columns cannot be renamed');
    }
  }
  await updateDoc(userColumnDoc(uid, id), patch);
}

export async function deleteColumn(uid: string, id: string): Promise<void> {
  const snap = await getDocs(userColumnsCol(uid));
  const target = snap.docs.find((d) => d.id === id);
  if (!target) return;
  const role = target.data().role as ColumnRole;
  if (role === 'start' || role === 'end') {
    throw new Error('Not started and Completed columns cannot be removed');
  }
  await deleteDoc(userColumnDoc(uid, id));
}

export async function reorderColumns(uid: string, ordered: BoardColumn[]): Promise<void> {
  const batch = writeBatch(db);
  ordered.forEach((col, index) => {
    batch.update(userColumnDoc(uid, col.id), { order: index });
  });
  await batch.commit();
}
