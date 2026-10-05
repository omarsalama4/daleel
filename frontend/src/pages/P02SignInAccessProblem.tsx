import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/auth/AuthContext';
import { Compass, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export const P02SignInAccessProblem: React.FC = () => {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetRequested, setResetRequested] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Return to previous route on successful sign-in
  const from = (location.state as any)?.from?.pathname || '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // PRD §12 & Spec P02: Responses do not reveal whether an arbitrary email has an account
    try { await resetPassword(email); setResetRequested(true); } catch (e: any) { setError(e?.message || 'Could not request password reset'); }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-surface border border-line rounded p-6 sm:p-8 shadow-xs">
        {/* Brand header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded bg-deep-teal text-white flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink m-0 tracking-tight">Daleel</h1>
            <p className="text-[11px] text-muted-ink m-0">Private Hosted Research Beta</p>
          </div>
        </div>

        {/* 2. Context Message */}
        <div className="p-3 bg-subtle-surface border border-line rounded text-xs text-muted-ink mb-4 leading-relaxed">
          Access is restricted to invited beta participants with isolated personal workspaces. Public registration is disabled.
        </div>

        {showForgot ? (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-ink m-0">Reset account password</h2>
            {resetRequested ? (
              <div className="p-3.5 bg-canvas border border-line rounded space-y-2 text-xs">
                <div className="flex items-center gap-2 text-ink font-medium">
                  <CheckCircle2 className="w-4 h-4 text-deep-teal" />
                  <span>Request received</span>
                </div>
                <p className="text-muted-ink leading-relaxed">
                  If an invited account exists for <span className="font-mono-tech text-ink">{email}</span>, password reset instructions have been dispatched via transactional email.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(false);
                    setResetRequested(false);
                  }}
                  className="text-deep-teal hover:underline text-xs font-medium pt-1 block"
                >
                  Return to sign-in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-ink mb-1">
                    Invited account email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-line rounded bg-surface text-ink focus:border-deep-teal"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="text-xs text-muted-ink hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover"
                  >
                    Send reset link
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-ink mb-1">
                Account email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-line rounded bg-surface text-ink focus:border-deep-teal"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-muted-ink">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-deep-teal hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-line rounded bg-surface text-ink focus:border-deep-teal"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded bg-subtle-surface border border-line text-xs text-ink flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-ink shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover flex items-center justify-center gap-1.5 min-target"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign in to personal workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick demo credentials toggle */}
            <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted-ink space-y-1.5">
              <div className="text-muted-ink font-medium">Testing quick-fill:</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('owner@daleel.ai');
                    setPassword('password123');
                  }}
                  className="px-2 py-1 rounded bg-subtle-surface border border-line text-ink hover:bg-canvas"
                >
                  Workspace Owner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('operator@daleel.ai');
                    setPassword('password123');
                  }}
                  className="px-2 py-1 rounded bg-subtle-surface border border-line text-ink hover:bg-canvas"
                >
                  Platform Operator
                </button>
              </div>
            </div>

            {/* 3. Help state */}
            <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted-ink text-center leading-relaxed">
              Ask your inviter or platform operator for an invitation or access help. Public self-service signup is unavailable.
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
