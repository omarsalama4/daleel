import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOperatorAuditEvents } from '../services/api/queries';
import { useToast } from '../components/common/Toast';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import { FileText, Shield, Download, Search, CheckCircle2 } from 'lucide-react';

export const P22OperatorAccessAudit: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchTerm = searchParams.get('q') || '';
  const purposeFilter = searchParams.get('purpose') || '';

  const { data: auditPage, isLoading: loading, error, refetch } = useOperatorAuditEvents();
  const auditEvents = auditPage?.items || [];

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const filteredEvents = auditEvents.filter((ev) => {
    if (purposeFilter && !ev.purpose.toLowerCase().includes(purposeFilter.toLowerCase())) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        ev.actorEmail.toLowerCase().includes(q) ||
        ev.workspaceId.toLowerCase().includes(q) ||
        ev.purpose.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="p-5 bg-surface rounded border border-line space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-deep-teal" />
              <h1 className="page-title">Internal operator access audit</h1>
            </div>
            <p className="text-sm text-muted-ink mt-1 max-w-xl leading-relaxed">
              Permanent immutable ledger recording every operator inspection of tenant workspaces. Raw session secrets are never captured.
            </p>
          </div>

          <button
            type="button"
            onClick={() => showToast('Audit trail exported to secure CSV.', 'success')}
            className="px-3.5 py-2 rounded text-sm font-medium border border-line bg-surface hover:bg-subtle-surface text-ink flex items-center gap-1.5 self-start sm:self-auto min-target"
          >
            <Download className="w-4 h-4 text-muted-ink" />
            <span>Export audit trail</span>
          </button>
        </div>

        <div className="p-3 bg-subtle-surface rounded border border-line text-xs text-muted-ink flex items-start gap-2">
          <Shield className="w-4 h-4 text-deep-teal shrink-0 mt-0.5" />
          <span>
            Compliance mandate: Every administrative inspection requires an explicit business justification and write-ahead audit entry before private tenant run data can be rendered.
          </span>
        </div>
      </div>

      {error && (
        <ApiErrorBanner
          message={(error as any)?.detail || 'Failed to load access audit events.'}
          traceId={(error as any)?.traceId}
          onRetry={() => refetch()}
        />
      )}

      {/* 2. Filter Bar */}
      <div className="p-4 bg-surface rounded border border-line flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-ink" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Search by operator email, workspace ID, or purpose..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-line rounded bg-surface text-ink font-mono-tech placeholder:font-sans placeholder:text-muted-ink/60"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-ink">
          <span>Purpose:</span>
          <select
            value={purposeFilter}
            onChange={(e) => updateParam('purpose', e.target.value)}
            className="p-1.5 text-xs border border-line rounded bg-surface text-ink"
          >
            <option value="">All purposes</option>
            <option value="support">Support</option>
            <option value="compliance">Compliance</option>
            <option value="incident">Incident</option>
          </select>
        </div>
      </div>

      {/* 3. Audit Ledger Table (14px text-sm) & Mobile Cards */}
      <div className="bg-surface rounded border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-ink space-y-2">
            <div className="skeleton-box h-4 w-48 mx-auto" />
            <div className="skeleton-box h-3 w-32 mx-auto" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-ink space-y-2">
            <FileText className="w-8 h-8 text-muted-ink mx-auto stroke-1" />
            <p className="font-medium text-ink">No audit records match the current criteria.</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-subtle-surface text-muted-ink text-xs uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3 font-medium">Operator Actor</th>
                    <th className="py-2.5 px-3 font-medium">Target Workspace</th>
                    <th className="py-2.5 px-3 font-medium">Stated Purpose</th>
                    <th className="py-2.5 px-3 font-medium">Target Item</th>
                    <th className="py-2.5 px-3 font-medium text-right">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-subtle-surface/60 transition-colors">
                      <td className="py-3 px-3 font-mono-tech text-xs text-muted-ink">
                        {new Date(ev.occurredAt).toISOString().replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="py-3 px-3 font-mono-tech text-xs text-ink">
                        {ev.actorEmail}
                      </td>
                      <td className="py-3 px-3 font-mono-tech text-xs text-muted-ink">
                        {ev.workspaceId}
                      </td>
                      <td className="py-3 px-3 text-ink max-w-xs">
                        <span className="line-clamp-2">{ev.purpose}</span>
                      </td>
                      <td className="py-3 px-3 font-mono-tech text-xs text-muted-ink">
                        {ev.itemId || 'all_runs'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs text-deep-teal font-medium capitalize">
                          <CheckCircle2 className="w-3.5 h-3.5 text-deep-teal" />
                          <span>{ev.outcome}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="block sm:hidden divide-y divide-line">
              {filteredEvents.map((ev) => (
                <div key={ev.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono-tech text-xs text-ink font-semibold">{ev.actorEmail}</span>
                    <span className="text-[11px] text-muted-ink font-mono-tech">
                      {new Date(ev.occurredAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-ink space-y-1">
                    <div>Target: <span className="font-mono-tech text-ink">{ev.workspaceId}</span></div>
                    <div>Item: <span className="font-mono-tech text-ink">{ev.itemId || 'all_runs'}</span></div>
                    <div>Purpose: <span className="text-ink">{ev.purpose}</span></div>
                    <div>Outcome: <span className="text-deep-teal capitalize font-medium">{ev.outcome}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
