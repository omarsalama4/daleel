import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApi } from '../services/api';
import { useAuth } from '../services/auth/AuthContext';
import type { InvitationPreview } from '../types/api';
import { Compass, Shield, AlertTriangle, ArrowRight } from 'lucide-react';

export const P01InvitationAcceptance: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const api = useApi();
  const { claimInvitation, registerInvited } = useAuth();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreview() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const p = await api.getInvitationPreview(token);
        setPreview(p);
      } catch (err: any) {
        setError(err?.detail || 'This invitation link is invalid or could not be verified.');
      } finally {
        setLoading(false);
      }
    }
    loadPreview();
  }, [token, api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      if (password) {
        await registerInvited(preview!.email, password);
        setError('Verify your email using the Neon message, then return to this invitation and accept while signed in.');
        setPassword('');
        return;
      }
      await claimInvitation(token);
      navigate('/app', { replace: true });
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to claim invitation. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded bg-deep-teal text-white flex items-center justify-center mx-auto animate-pulse">
            <Compass className="w-5 h-5" />
          </div>
          <div className="text-xs text-muted-ink">Validating invitation link...</div>
        </div>
      </div>
    );
  }

  const isInvalid = !preview || preview.status === 'invalid' || preview.status === 'expired' || preview.status === 'revoked';

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-surface border border-line rounded p-6 sm:p-8 shadow-xs">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded bg-deep-teal text-white flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-ink m-0 tracking-tight">Daleel</h1>
            <p className="text-[11px] text-muted-ink m-0">Private Hosted Research Beta</p>
          </div>
        </div>

        {isInvalid ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-subtle-surface border border-line rounded flex items-start gap-2.5 text-xs text-ink">
              <AlertTriangle className="w-4 h-4 text-ink shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-ink">Invitation unavailable</div>
                <div className="text-muted-ink mt-0.5 leading-relaxed">
                  {preview?.status === 'expired'
                    ? 'This invitation expired after 7 days. Single-use invitation tokens are time-bounded.'
                    : 'This invitation token is invalid or has already been claimed.'}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-ink leading-relaxed">
              Ask your platform operator or host for a replacement invitation link. Public self-service registration is disabled.
            </p>

            <Link
              to="/sign-in"
              className="inline-flex items-center justify-center w-full px-4 py-2 text-xs font-medium text-ink bg-surface border border-line rounded hover:bg-subtle-surface"
            >
              Go to sign-in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Identity Panel */}
            <div className="p-3 rounded bg-subtle-surface border border-line text-xs space-y-1">
              <div className="text-muted-ink">Invited Account:</div>
              <div className="font-semibold text-ink font-mono-tech">{preview?.email}</div>
              <div className="text-[11px] text-muted-ink pt-1 border-t border-line">
                Personal workspace will be provisioned in data region: <span className="text-ink">aws-us-east-1</span>.
              </div>
            </div>

            {/* 2. Authentication Control */}
            <div>
              <label className="block text-xs font-medium text-muted-ink mb-1">
                New account password (leave blank if already signed in)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set secure password for your personal workspace"
                className="w-full px-3 py-2 text-xs border border-line rounded bg-surface text-ink focus:border-deep-teal"
              />
            </div>

            {/* 3. Terms of Access Note */}
            <div className="p-3 bg-canvas border border-line rounded text-[11px] text-muted-ink leading-relaxed flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-deep-teal shrink-0 mt-0.5" />
              <span>
                By continuing, you establish an isolated personal workspace. Daleel performs read-only crawling within bounded ceilings. Never submit unauthorized scraping queries.
              </span>
            </div>

            {error && (
              <div className="p-2.5 rounded bg-subtle-surface border border-line text-xs text-ink flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 4. Continue Action */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 px-4 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover flex items-center justify-center gap-1.5 min-target"
            >
              <span>{submitting ? 'Setting up workspace...' : 'Accept invitation & open workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
