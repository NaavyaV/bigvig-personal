import { collection, doc } from 'firebase/firestore';
import { db } from '../firebase';

export function userTasksCol(uid: string) {
  return collection(db, 'users', uid, 'tasks');
}

export function userTaskDoc(uid: string, taskId: string) {
  return doc(db, 'users', uid, 'tasks', taskId);
}

export function userCategoriesCol(uid: string) {
  return collection(db, 'users', uid, 'categories');
}

export function userCategoryDoc(uid: string, categoryId: string) {
  return doc(db, 'users', uid, 'categories', categoryId);
}

export function userColumnsCol(uid: string) {
  return collection(db, 'users', uid, 'columns');
}

export function userColumnDoc(uid: string, columnId: string) {
  return doc(db, 'users', uid, 'columns', columnId);
}
