import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOperatorWorkspaces } from '../services/api/queries';
import { useApi } from '../services/api';
import { useToast } from '../components/common/Toast';
import type { SupportGrant } from '../types/api';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import {
  Users,
  Shield,
  Eye,
  CheckCircle2,
  FileText,
  Clock,
} from 'lucide-react';

export const P21OperatorWorkspaces: React.FC = () => {
  const { id: selectedWorkspaceId } = useParams<{ id: string }>();
  const api = useApi();
  const { showToast } = useToast();

  const { data: workspaces = [], isLoading: loading, error: wsError, refetch } = useOperatorWorkspaces();

  const [activeGrant, setActiveGrant] = useState<SupportGrant | null>(null);
  const [supportItemId, setSupportItemId] = useState('');
  const [supportPurpose, setSupportPurpose] = useState('');
  const [supportContent, setSupportContent] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestSupport = async (workspaceId: string) => {
    if (supportPurpose.trim().length < 10 || !supportItemId.trim()) {
      setError('A documented non-empty operational reason is required before inspecting user content.');
      return;
    }
    setError(null);
    setIsAuditing(true);
    try {
      const grant = await api.requestAuditedSupportAccess({
        workspaceId,
        purpose: supportPurpose.trim(),
        itemId: supportItemId.trim(),
      });
      setActiveGrant(grant);

      // Fetch scoped runs
      const data = await api.getAuditedSupportItem(grant.id, supportItemId.trim());
      setSupportContent(data);
      showToast('Support access granted. Immutable audit trail entry committed.', 'info');
    } catch (err: any) {
      setError(err?.detail || 'Audit write failed. Support view remains closed.');
      showToast('Compliance failure: Access denied without committed audit log.', 'error');
    } finally {
      setIsAuditing(false);
    }
  };

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId) || workspaces[0];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="p-5 bg-surface rounded border border-line space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-deep-teal" />
          <h1 className="page-title">Operator workspace operations</h1>
        </div>
        <p className="text-sm text-muted-ink leading-relaxed max-w-2xl">
          Monitor tenant operational health and provide audited support. Content inspection requires a written purpose and is logged to the immutable access audit ledger.
        </p>
      </div>

      {wsError && (
        <ApiErrorBanner
          message={(wsError as any)?.detail || 'Failed to load operator workspaces.'}
          traceId={(wsError as any)?.traceId}
          onRetry={() => refetch()}
        />
      )}

      {/* 2. Workspaces Table (14px text-sm & mobile cards) */}
      <div className="bg-surface rounded border border-line overflow-hidden">
        <div className="p-4 border-b border-line bg-canvas/40 flex items-center justify-between text-xs font-semibold text-muted-ink uppercase tracking-wider">
          <span>Active personal workspaces ({workspaces.length})</span>
          <span>Tenant health status</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-ink space-y-2">
            <div className="skeleton-box h-4 w-48 mx-auto" />
            <div className="skeleton-box h-3 w-32 mx-auto" />
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-subtle-surface border-b border-line text-muted-ink uppercase text-xs">
                  <tr>
                    <th className="p-3 font-medium">Workspace ID</th>
                    <th className="p-3 font-medium">Owner email</th>
                    <th className="p-3 font-medium">Operational state</th>
                    <th className="p-3 font-medium">Active / Paused</th>
                    <th className="p-3 font-medium">Storage used</th>
                    <th className="p-3 font-medium text-right">Support action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {workspaces.map((ws) => (
                    <tr key={ws.id} className="hover:bg-subtle-surface/60 transition-colors">
                      <td className="p-3 font-mono-tech text-ink font-medium">{ws.id}</td>
                      <td className="p-3 font-mono-tech text-muted-ink">{ws.ownerEmail}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded border border-line bg-subtle-surface text-ink capitalize text-xs">
                          {ws.operationalState.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-mono-tech text-ink text-xs">
                        {ws.activeRuns} active / {ws.pausedRuns} paused
                      </td>
                      <td className="p-3 font-mono-tech text-muted-ink text-xs">{ws.storageUsedMb.toFixed(1)} MB</td>
                      <td className="p-3 text-right">
                        <Link
                          to={`/admin/workspaces/${ws.id}`}
                          className="px-2.5 py-1 text-xs rounded bg-surface border border-line text-ink hover:bg-canvas font-medium"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="block sm:hidden divide-y divide-line">
              {workspaces.map((ws) => (
                <div key={ws.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono-tech text-xs text-ink font-semibold">{ws.id}</span>
                    <span className="px-1.5 py-0.5 rounded text-[11px] bg-subtle-surface border border-line text-ink capitalize">
                      {ws.operationalState.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-muted-ink space-y-1">
                    <div>Owner: <span className="font-mono-tech text-ink">{ws.ownerEmail}</span></div>
                    <div>Runs: <span className="font-mono-tech text-ink">{ws.activeRuns} active / {ws.pausedRuns} paused</span></div>
                  </div>
                  <div className="pt-2 border-t border-line text-right">
                    <Link
                      to={`/admin/workspaces/${ws.id}`}
                      className="px-2.5 py-1 text-xs rounded bg-surface border border-line text-ink font-medium"
                    >
                      Inspect
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 3. Support Access Gate for Selected Workspace */}
      {selectedWorkspace && (
        <div className="p-5 bg-surface rounded border border-line space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div>
              <h3 className="section-title">
                Audited Support Inspection — {selectedWorkspace.ownerEmail}
              </h3>
              <p className="text-xs text-muted-ink font-mono-tech mt-0.5">
                Target workspace: {selectedWorkspace.id}
              </p>
            </div>

            {activeGrant && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-deep-teal-subtle text-deep-teal border border-deep-teal/30 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Audited session active ({activeGrant.id})</span>
              </span>
            )}
          </div>

          {!activeGrant ? (
            <div className="space-y-4 max-w-xl">
              <div className="p-3 bg-subtle-surface rounded border border-line text-xs text-muted-ink space-y-1">
                <div className="flex items-center gap-1.5 text-ink font-semibold">
                  <Shield className="w-3.5 h-3.5 text-deep-teal" />
                  <span>Mandatory Compliance Gate</span>
                </div>
                <p>
                  You must state an operational ticket number or purpose. Your email, exact item and purpose will be written to the compliance log before any the selected item is displayed.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-danger-subtle border border-danger-line text-danger text-xs rounded">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">Exact item ID supplied by the workspace owner *</label>
                <input value={supportItemId} onChange={e => setSupportItemId(e.target.value)} placeholder="Run, finding, workflow or recipe UUID" className="w-full p-2 text-sm border border-line rounded bg-surface text-ink" />
                <label className="block text-xs font-semibold text-ink">
                  Support ticket ID & business purpose *
                </label>
                <input
                  type="text"
                  value={supportPurpose}
                  onChange={(e) => setSupportPurpose(e.target.value)}
                  placeholder="e.g. TICKET-4091: User reported rate-limit stall on boards.greenhouse.io"
                  className="w-full p-2 text-sm border border-line rounded bg-surface text-ink"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRequestSupport(selectedWorkspace.id)}
                disabled={isAuditing}
                className="px-4 py-2 bg-deep-teal hover:bg-deep-teal-hover text-surface text-sm font-medium rounded flex items-center gap-2 min-target disabled:opacity-60"
              >
                <Eye className="w-4 h-4" />
                <span>{isAuditing ? 'Committing audit record...' : 'Open support view'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-canvas rounded border border-line flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-deep-teal" />
                  <span>Inspecting one authorized item (Audited under purpose: "{activeGrant.purpose}")</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveGrant(null);
                    setSupportContent(null);
                    setSupportPurpose('');
                  }}
                  className="text-muted-ink hover:text-ink font-medium"
                >
                  Close support view
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-ink">Selected item: {activeGrant.itemId}</div>
                <pre className="p-3 border border-line rounded whitespace-pre-wrap break-words text-xs overflow-auto">{JSON.stringify(supportContent, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
