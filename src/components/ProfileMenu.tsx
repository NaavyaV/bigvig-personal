import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../auth/AuthProvider';
import { PasswordField } from './PasswordField';

export function ProfileMenu() {
  const { user, logOut, deleteAccount } = useAuth();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmSure, setConfirmSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      const rect = btnRef.current!.getBoundingClientRect();
      const menuWidth = 240;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8,
      );
      setMenuPos({ top: rect.bottom + 6, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, deleting]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (deleting) {
        setDeleting(false);
        setPassword('');
        setConfirmSure(false);
        setError(null);
      } else {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, deleting]);

  useEffect(() => {
    if (!open) {
      setDeleting(false);
      setPassword('');
      setConfirmSure(false);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  if (!user) return null;

  const email = user.email ?? 'Account';
  const initial = email.charAt(0).toUpperCase();

  async function handleDelete(e: FormEvent) {
    e.preventDefault();
    if (!confirmSure) {
      setConfirmSure(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account');
      setBusy(false);
      setConfirmSure(false);
    }
  }

  return (
    <div className="profile">
      <button
        ref={btnRef}
        type="button"
        className="profile__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account: ${email}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="profile__avatar" aria-hidden="true">
          {initial}
        </span>
      </button>

      {open &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="profile__menu profile__menu--portal"
            id={menuId}
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <div className="profile__meta">
              <p className="profile__meta-label">Signed in as</p>
              <p className="profile__meta-email">{email}</p>
            </div>

            {deleting ? (
              <form className="profile__delete" onSubmit={handleDelete}>
                <p className="profile__delete-title">Delete account</p>
                <PasswordField
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  placeholder="Confirm with password"
                />
                {error && <p className="auth-form__error">{error}</p>}
                <div className="profile__delete-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={busy}
                    onClick={() => {
                      setDeleting(false);
                      setPassword('');
                      setConfirmSure(false);
                      setError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn--danger btn--sm${confirmSure ? ' is-confirm' : ''}`}
                    disabled={busy || !password}
                  >
                    {busy ? 'Deleting…' : confirmSure ? 'Sure?' : 'Delete'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="profile__logout"
                  onClick={() => {
                    setOpen(false);
                    void logOut();
                  }}
                >
                  Log out
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="profile__delete-btn"
                  onClick={() => setDeleting(true)}
                >
                  Delete account
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
