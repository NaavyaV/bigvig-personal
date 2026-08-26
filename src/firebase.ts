import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const env = import.meta.env;

function envOr(key: keyof ImportMetaEnv, fallback: string): string {
  const value = env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export const firebaseConfig = {
  apiKey: envOr('VITE_FIREBASE_API_KEY', 'AIzaSyBt3Pv9waKlnpcWDW91wGK88Td6TNVrEmI'),
  authDomain: envOr('VITE_FIREBASE_AUTH_DOMAIN', 'bigvig-kanban.firebaseapp.com'),
  projectId: envOr('VITE_FIREBASE_PROJECT_ID', 'bigvig-kanban'),
  storageBucket: envOr('VITE_FIREBASE_STORAGE_BUCKET', 'bigvig-kanban.firebasestorage.app'),
  messagingSenderId: envOr('VITE_FIREBASE_MESSAGING_SENDER_ID', '864211763866'),
  appId: envOr('VITE_FIREBASE_APP_ID', '1:864211763866:web:0fa162264d005252a11523'),
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/** Keep session across tab closes / browser restarts */
void setPersistence(auth, browserLocalPersistence);
