import { getDocs, writeBatch, type CollectionReference } from 'firebase/firestore';
import { db } from '../firebase';
import { userCategoriesCol, userColumnsCol, userTasksCol } from './paths';

async function deleteCollectionDocs(col: CollectionReference) {
  const snap = await getDocs(col);
  if (snap.empty) return;

  let batch = writeBatch(db);
  let count = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    count += 1;
    if (count >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
}

/** Wipe all board data for a user before deleting their auth account. */
export async function deleteUserBoardData(uid: string): Promise<void> {
  await Promise.all([
    deleteCollectionDocs(userTasksCol(uid)),
    deleteCollectionDocs(userCategoriesCol(uid)),
    deleteCollectionDocs(userColumnsCol(uid)),
  ]);
}
