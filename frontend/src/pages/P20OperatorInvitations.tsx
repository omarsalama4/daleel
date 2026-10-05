import React, { useState } from 'react';
import { useOperatorInvitations } from '../services/api/queries';
import { useApi } from '../services/api';
import { useToast } from '../components/common/Toast';
import { StatusBadge } from '../components/common/StatusBadge';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import { Mail, RefreshCw, XCircle, Shield, Clock } from 'lucide-react';

export const P20OperatorInvitations: React.FC = () => {
  const api = useApi();
  const { showToast } = useToast();

  const { data: invitations = [], isLoading: loading, error, refetch } = useOperatorInvitations();
  const [invitationUrl, setInvitationUrl] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSending(true);
    try {
      const inv = await api.inviteUser(emailInput.trim(), noteInput.trim() || undefined);
      showToast(`Invitation issued to ${inv.email}. Valid for 7 days.`, 'success');
      setInvitationUrl(inv.invitationUrl || '');
      setEmailInput('');
      setNoteInput('');
      refetch();
    } catch (err: any) {
      showToast(err?.detail || 'Failed to dispatch invitation', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async (id: string) => {
    try {
      const inv = await api.resendInvitation(id);
      showToast(`Rotated invitation token and resent to ${inv.email}.`, 'success');
      refetch();
    } catch (err: any) {
      showToast(err?.detail || 'Failed to resend invitation', 'error');
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.revokeInvitation(id);
      showToast('Invitation revoked.', 'info');
      refetch();
    } catch (err: any) {
      showToast(err?.detail || 'Failed to revoke invitation', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {invitationUrl && <div className="p-3 border border-line rounded text-xs space-y-2"><p>Copy this private invitation link for the recipient:</p><input readOnly value={invitationUrl} className="w-full p-2 border border-line rounded" onFocus={e => e.target.select()} /></div>}
      {/* 1. Header */}
      <div className="p-5 bg-surface rounded border border-line space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-deep-teal" />
          <h1 className="page-title">Operator beta invitations</h1>
        </div>
        <p className="text-sm text-muted-ink leading-relaxed max-w-2xl">
          Manage access tokens for the private hosted beta cohort. Invitations are single-use, email-bound, and expire 7 days after issue. Resending automatically revokes the prior token.
        </p>
      </div>

      {error && (
        <ApiErrorBanner
          message={(error as any)?.detail || 'Failed to load invitations.'}
          traceId={(error as any)?.traceId}
          onRetry={() => refetch()}
        />
      )}

      {/* 2. Invite Form */}
      <div className="p-5 bg-surface rounded border border-line space-y-4">
        <h3 className="section-title">Issue single-use beta invitation</h3>
        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <label className="block text-xs font-medium text-ink mb-1">Invitee email *</label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. colleague@lab.org"
              className="w-full px-3 py-2 text-sm border border-line rounded bg-surface text-ink font-mono-tech placeholder:font-sans"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-medium text-ink mb-1">Optional internal note</label>
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="e.g. NLP evaluation partner"
              className="w-full px-3 py-2 text-sm border border-line rounded bg-surface text-ink"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isSending}
              className="w-full py-2 px-3 rounded text-sm font-medium text-surface bg-deep-teal hover:bg-deep-teal-hover flex items-center justify-center gap-1.5 min-target"
            >
              <Mail className="w-4 h-4" />
              <span>{isSending ? 'Sending...' : 'Send invite'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Invitation Ledger (14px text-sm table & mobile cards) */}
      <div className="bg-surface rounded border border-line overflow-hidden">
        <div className="p-4 border-b border-line bg-canvas/40 flex items-center justify-between text-xs font-semibold text-muted-ink uppercase tracking-wider">
          <span>Active & pending invitations ({invitations.length})</span>
          <span>Single-use 7-day tokens</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-ink space-y-2">
            <div className="skeleton-box h-4 w-48 mx-auto" />
            <div className="skeleton-box h-3 w-32 mx-auto" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-ink">
            No invitations have been issued yet.
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-subtle-surface border-b border-line text-muted-ink uppercase text-xs">
                  <tr>
                    <th className="p-3 font-medium">Invitee email</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Expires At</th>
                    <th className="p-3 font-medium">Note</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-subtle-surface/60 transition-colors">
                      <td className="p-3 font-mono-tech text-ink font-medium">{inv.email}</td>
                      <td className="p-3">
                        <StatusBadge status={inv.status} size="sm" />
                      </td>
                      <td className="p-3 text-xs text-muted-ink font-mono-tech">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted-ink" />
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-ink">{inv.note || '—'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleResend(inv.id)}
                                className="px-2.5 py-1 text-xs font-medium rounded border border-line bg-surface hover:bg-subtle-surface text-ink flex items-center gap-1"
                                title="Resend and rotate token"
                              >
                                <RefreshCw className="w-3 h-3 text-muted-ink" />
                                <span>Resend</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevoke(inv.id)}
                                className="px-2.5 py-1 text-xs font-medium rounded border border-line bg-surface hover:bg-subtle-surface text-muted-ink hover:text-ink flex items-center gap-1"
                                title="Revoke token"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Revoke</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="block sm:hidden divide-y divide-line">
              {invitations.map((inv) => (
                <div key={inv.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono-tech text-xs text-ink font-semibold">{inv.email}</span>
                    <StatusBadge status={inv.status} size="sm" />
                  </div>
                  <div className="text-xs text-muted-ink">
                    Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                  </div>
                  {inv.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-line">
                      <button
                        type="button"
                        onClick={() => handleResend(inv.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded border border-line text-ink"
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.id)}
                        className="px-2.5 py-1 text-xs font-medium rounded border border-line text-muted-ink"
                      >
                        Revoke
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
