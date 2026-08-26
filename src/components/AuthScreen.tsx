import { useId, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { PasswordField } from './PasswordField';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const titleId = useId();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: 'login' | 'signup') {
    setMode(next);
    setError(null);
    setConfirmPassword('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="atmosphere" aria-hidden="true" />
      <div className="auth-card" role="dialog" aria-labelledby={titleId}>
        <div className="auth-card__brand">
          <span className="brand__glyph" aria-hidden="true" />
          <h1 id={titleId} className="auth-card__title">
            BigVig&apos;s life board :D
          </h1>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`auth-tabs__btn${mode === 'login' ? ' is-active' : ''}`}
            aria-selected={mode === 'login'}
            onClick={() => switchMode('login')}
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            className={`auth-tabs__btn${mode === 'signup' ? ' is-active' : ''}`}
            aria-selected={mode === 'signup'}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="At least 6 characters"
          />

          {mode === 'signup' && (
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              placeholder="Re-enter password"
            />
          )}

          {error && <p className="auth-form__error">{error}</p>}

          <button type="submit" className="btn btn--primary auth-form__submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
