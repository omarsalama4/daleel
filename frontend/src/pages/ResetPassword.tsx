import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../services/auth/AuthContext';

export function ResetPassword() {
  const [params] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const { completePasswordReset } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { navigate('/reset-password', { replace: true }); }, [navigate]);

  return <main className="min-h-screen bg-canvas flex items-center justify-center p-6">
    <section className="w-full max-w-md bg-surface border border-line rounded p-6 space-y-4">
      <h1 className="text-lg font-semibold text-ink">Choose a new password</h1>
      {complete ? <><p className="text-sm text-muted-ink">Your password has been updated.</p>
        <Link to="/sign-in" className="text-deep-teal">Return to sign-in</Link></> : !token ?
        <><p className="text-sm text-muted-ink">This reset link is invalid. Request another from sign-in.</p>
          <Link to="/sign-in" className="text-deep-teal">Go to sign-in</Link></> :
        <form className="space-y-4" onSubmit={async e => {
          e.preventDefault(); setError('');
          if (password !== confirmation) { setError('Passwords must match.'); return; }
          setBusy(true);
          try { await completePasswordReset(token, password); setPassword(''); setConfirmation(''); setComplete(true); }
          catch (failure) { setError(failure instanceof Error ? failure.message : 'This reset link may have expired.'); }
          finally { setBusy(false); }
        }}>
          <label className="block text-sm text-ink">New password
            <input autoComplete="new-password" type="password" required minLength={8} value={password}
              onChange={e => setPassword(e.target.value)} className="block w-full p-2 mt-1 border border-line rounded" />
          </label>
          <label className="block text-sm text-ink">Confirm new password
            <input autoComplete="new-password" type="password" required minLength={8} value={confirmation}
              onChange={e => setConfirmation(e.target.value)} className="block w-full p-2 mt-1 border border-line rounded" />
          </label>
          {error && <p role="alert" className="text-sm text-ink">{error}</p>}
          <button disabled={busy} className="w-full p-2 bg-deep-teal text-white rounded">{busy ? 'Updating…' : 'Update password'}</button>
        </form>}
    </section>
  </main>;
}
