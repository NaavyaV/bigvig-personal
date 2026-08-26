import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { auth } from '../firebase';
import { deleteUserBoardData } from '../services/account';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered';
    case 'auth/invalid-email':
      return 'Enter a valid email address';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/too-many-requests':
      return 'Too many attempts — try again later';
    case 'auth/requires-recent-login':
      return 'Enter your password again to delete your account';
    default:
      return 'Could not complete that request';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (e) {
          const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
          throw new Error(friendlyAuthError(code));
        }
      },
      async signUp(email, password) {
        try {
          await createUserWithEmailAndPassword(auth, email.trim(), password);
        } catch (e) {
          const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
          throw new Error(friendlyAuthError(code));
        }
      },
      async logOut() {
        await signOut(auth);
      },
      async deleteAccount(password) {
        const current = auth.currentUser;
        if (!current?.email) throw new Error('Not signed in');
        try {
          const credential = EmailAuthProvider.credential(current.email, password);
          await reauthenticateWithCredential(current, credential);
          await deleteUserBoardData(current.uid);
          await deleteUser(current);
        } catch (e) {
          const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
          throw new Error(friendlyAuthError(code));
        }
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
