import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../services/api';
import { useToast } from '../components/common/Toast';
import type { SiteSession } from '../types/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { O01HostedSignInModal } from '../components/overlays/O01HostedSignInModal';
import { O05DestructiveConfirmModal } from '../components/overlays/O05DestructiveConfirmModal';
import {
  KeyRound,
  PlusCircle,
  Shield,
  AlertTriangle,
  Clock,
  Trash2,
  RefreshCw,
  Lock,
} from 'lucide-react';

export const P16Sessions: React.FC = () => {
  const api = useApi();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [sessions, setSessions] = useState<SiteSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectDomain, setConnectDomain] = useState(searchParams.get('connect') || '');
  const [domainInput, setDomainInput] = useState('');
  const [revokingSession, setRevokingSession] = useState<SiteSession | null>(null);

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      try {
        const s = await api.listSessions();
        setSessions(s);
      } catch (err) {
        console.error('Failed to load sessions', err);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, [api]);

  useEffect(() => {
    const autoConnect = searchParams.get('connect');
    if (autoConnect) {
      setConnectDomain(autoConnect);
      setShowConnectModal(true);
    }
  }, [searchParams]);

  const handleOpenConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;
    setConnectDomain(domainInput.trim().replace(/^https?:\/\//, ''));
    setShowConnectModal(true);
  };

  const handleRevoke = async () => {
    if (!revokingSession) return;
    try {
      await api.revokeSiteSession(revokingSession.id);
      showToast(`Session for ${revokingSession.domain} revoked.`, 'info');
      const s = await api.listSessions();
      setSessions(s);
    } catch (err: any) {
      showToast(err?.detail || 'Failed to revoke session', 'error');
    }
  };

  const handleExpiryChange = async (sessionId: string, mode: 'no_expiry' | 'date') => {
    try {
      await api.updateSiteSession(sessionId, mode, mode === 'date' ? new Date(Date.now() + 7 * 86400000).toISOString() : undefined);
      showToast('Session expiry preference updated.', 'success');
      const s = await api.listSessions();
      setSessions(s);
    } catch (err: any) {
      showToast(err?.detail || 'Failed to update expiry', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header and Warning */}
      <div className="p-5 bg-surface rounded border border-line space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-deep-teal" />
              <h1 className="text-xl font-bold text-ink m-0 tracking-tight">Authorized site sessions</h1>
            </div>
            <p className="text-xs text-muted-ink mt-1 max-w-xl leading-relaxed">
              Authenticate target research portals in a hosted remote browser. Daleel reuses session tokens solely for authorized read-only tasks.
            </p>
          </div>

          <form onSubmit={handleOpenConnect} className="flex gap-2 self-start sm:self-auto">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="e.g. wellfound.com"
              className="px-3 py-1.5 text-xs border border-line rounded bg-canvas text-ink focus:border-deep-teal font-mono-tech w-40 sm:w-48"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover flex items-center gap-1.5 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Connect site
            </button>
          </form>
        </div>

        {/* Security boundary warning from PRD §15 & Spec P16 */}
        <div className="p-3 bg-subtle-surface rounded border border-line text-xs text-muted-ink space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-ink">
            <Shield className="w-3.5 h-3.5 text-deep-teal" />
            Zero-Bypass Policy & Privacy Guarantee
          </div>
          <p className="leading-relaxed">
            Daleel never attempts to bypass MFA, CAPTCHAs, or site restrictions. You complete login personally. Raw passwords and cookies are never displayed in the application interface.
          </p>
        </div>
      </div>

      {/* 2. Session List */}
      <div className="bg-surface rounded border border-line overflow-hidden divide-y divide-line">
        <div className="p-4 border-b border-line bg-canvas/40 flex items-center justify-between text-xs font-semibold text-muted-ink uppercase tracking-wider">
          <span>Connected target domains ({sessions.length})</span>
          <span>Security & Expiry policy</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-ink">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-ink">
            No authorized site sessions stored. Most public research queries do not require sign-in.
          </div>
        ) : (
          sessions.map((sess) => (
            <div
              key={sess.id}
              className="p-5 hover:bg-subtle-surface transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink font-mono-tech">
                    {sess.domain}
                  </span>
                  <StatusBadge status={sess.status} size="sm" />
                </div>

                <div className="text-[11px] text-muted-ink flex items-center gap-3 flex-wrap">
                  <span>Connected {new Date(sess.connectedAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>
                    Last validated:{' '}
                    {new Date(sess.lastValidatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* 3. Session Settings */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-ink text-[11px]">Expiry:</span>
                  <select
                    value={sess.expiryMode}
                    onChange={(e) => handleExpiryChange(sess.id, e.target.value as any)}
                    className="px-2.5 py-1 text-xs border border-line rounded bg-surface text-ink focus:border-deep-teal font-mono-tech"
                  >
                    <option value="no_expiry">No expiry (Default)</option>
                    <option value="date">7-day session cap</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setConnectDomain(sess.domain);
                    setShowConnectModal(true);
                  }}
                  className="px-3 py-1 rounded border border-line bg-surface hover:bg-canvas text-ink text-xs font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 text-muted-ink" />
                  Reconnect
                </button>

                <button
                  type="button"
                  onClick={() => setRevokingSession(sess)}
                  className="p-1.5 rounded border border-line bg-surface hover:bg-canvas text-ink"
                  aria-label="Revoke session"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-ink" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Help and Failure State Explanations */}
      <div className="p-4 bg-canvas rounded border border-line text-xs text-muted-ink space-y-1.5">
        <div className="font-semibold text-ink">Understanding site sessions:</div>
        <ul className="space-y-1 list-disc pl-4 leading-relaxed">
          <li>"No expiry" means Daleel imposes no artificial software timeout; the target website's normal authentication expiry still applies.</li>
          <li>If a target site invalidates a session or demands re-authentication, runs encountering it pause at a human attention gate.</li>
          <li>Revoking a session immediately removes encrypted credentials from worker storage.</li>
        </ul>
      </div>

      <O01HostedSignInModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        domain={connectDomain}
        onFinishConnection={async () => {
          showToast(`Session established for ${connectDomain}.`, 'success');
          const s = await api.listSessions();
          setSessions(s);
        }}
      />

      {revokingSession && (
        <O05DestructiveConfirmModal
          isOpen={!!revokingSession}
          onClose={() => setRevokingSession(null)}
          title="Revoke authorized site session"
          itemName={revokingSession.domain}
          itemType="session"
          impactDescription="Deletes encrypted session tokens for this domain. Any active research run depending on this session will pause at a human attention gate."
          confirmButtonText="Revoke session"
          onConfirm={handleRevoke}
        />
      )}
    </div>
  );
};
