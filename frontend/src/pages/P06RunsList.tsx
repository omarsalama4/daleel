import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRuns, useRunAction } from '../services/api/queries';
import { useApi } from '../services/api';
import { useToast } from '../components/common/Toast';
import type { Run } from '../types/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { O05DestructiveConfirmModal } from '../components/overlays/O05DestructiveConfirmModal';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import {
  PlusCircle,
  Search,
  Filter,
  Trash2,
  Pause,
  Play,
  XCircle,
  ChevronRight,
  Bookmark,
} from 'lucide-react';

export const P06RunsList: React.FC = () => {
  const api = useApi();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';

  const { data: runsPage, isLoading: loading, error, refetch } = useRuns(
    statusFilter || undefined,
    undefined,
    searchQuery || undefined
  );
  const runs = runsPage?.items || [];
  const runActionMutation = useRunAction();

  const [deletingRun, setDeletingRun] = useState<Run | null>(null);

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const handleAction = async (runId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      await runActionMutation.mutateAsync({ runId, action: { action } });
      showToast(`Run ${action}d successfully.`, 'info');
      refetch();
    } catch (err: any) {
      showToast(err?.detail || `Failed to ${action} run`, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingRun) return;
    try {
      await api.deleteRun(deletingRun.id);
      showToast('Run hidden from the workspace. Artifact cleanup will retry automatically if needed.', 'success');
      setDeletingRun(null);
      refetch();
    } catch (err: any) {
      showToast(err?.detail || 'Failed to delete run', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="page-title">Research runs</h1>
          <p className="text-sm text-muted-ink mt-1">
            Historical and active crawling runs. Filter by execution status or search in research queries.
          </p>
        </div>

        <Link
          to="/app/new"
          className="flex items-center gap-2 px-4 py-2 rounded bg-deep-teal hover:bg-deep-teal-hover text-surface text-sm font-medium transition-colors min-target self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New research</span>
        </Link>
      </div>

      {error && (
        <ApiErrorBanner
          message={(error as any)?.detail || 'Failed to load research runs.'}
          traceId={(error as any)?.traceId}
          onRetry={() => refetch()}
        />
      )}

      {/* 2. Search & Filters */}
      <div className="p-4 bg-surface rounded border border-line flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-ink" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Search runs by query text..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-line rounded bg-surface text-ink placeholder:text-muted-ink/60"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-ink">
          <Filter className="w-3.5 h-3.5" />
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => updateParam('status', e.target.value)}
            className="p-1.5 text-xs border border-line rounded bg-surface text-ink"
          >
            <option value="">All statuses</option>
            <option value="running">Running</option>
            <option value="needs_attention">Needs attention</option>
            <option value="paused">Paused</option>
            <option value="complete">Complete</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* 3. Runs Table (Desktop 14px text-sm, Mobile stacked cards) */}
      <div className="bg-surface rounded border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-ink space-y-2">
            <div className="skeleton-box h-4 w-48 mx-auto" />
            <div className="skeleton-box h-3 w-32 mx-auto" />
          </div>
        ) : runs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-ink space-y-2">
            <p className="font-medium text-ink">No research runs found.</p>
            <p className="text-xs">
              {searchQuery || statusFilter
                ? 'Try adjusting or clearing your filters.'
                : 'Click "New research" above to start your first bounded crawl.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-subtle-surface text-muted-ink text-xs uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Query / Objective</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Mode</th>
                    <th className="py-2.5 px-3 font-medium">Findings</th>
                    <th className="py-2.5 px-3 font-medium">Frontier</th>
                    <th className="py-2.5 px-3 font-medium">Started</th>
                    <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-subtle-surface/60 transition-colors">
                      <td className="py-3 px-3 max-w-sm">
                        <Link
                          to={`/app/runs/${r.id}`}
                          className="font-medium text-ink hover:text-deep-teal hover:underline line-clamp-1"
                        >
                          {r.query}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-ink font-mono-tech mt-0.5">
                          <span>{r.id}</span>
                          {r.workflowId && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-deep-teal">
                              <Bookmark className="w-3 h-3" /> Saved playbook
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={r.status} size="sm" />
                        {r.stopReason && (
                          <div className="text-[11px] text-muted-ink truncate max-w-[150px] mt-0.5" title={r.stopReason}>
                            {r.stopReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs uppercase font-mono-tech text-muted-ink">
                        {r.mode}
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          to={`/app/runs/${r.id}/results`}
                          className="font-mono-tech text-xs text-deep-teal hover:underline font-medium"
                        >
                          {r.findingCounts?.relevant ?? 0} relevant
                        </Link>
                        <div className="text-[11px] text-muted-ink">
                          {r.findingCounts?.total ?? 0} total
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs font-mono-tech text-muted-ink">
                        <div>{r.usage?.pagesFetched ?? 0} fetched</div>
                        <div className="text-[11px]">{r.usage?.domainsReached ?? 0} domains</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-ink whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'running' && (
                            <button
                              type="button"
                              onClick={() => handleAction(r.id, 'pause')}
                              className="p-1 rounded text-muted-ink hover:text-ink hover:bg-canvas"
                              title="Pause run"
                              aria-label="Pause run"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(r.status === 'paused' || r.status === 'needs_attention') && (
                            <button
                              type="button"
                              onClick={() => handleAction(r.id, 'resume')}
                              className="p-1 rounded text-deep-teal hover:bg-deep-teal-subtle"
                              title="Resume run"
                              aria-label="Resume run"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {['running', 'paused', 'needs_attention'].includes(r.status) && (
                            <button
                              type="button"
                              onClick={() => handleAction(r.id, 'cancel')}
                              className="p-1 rounded text-muted-ink hover:text-ink hover:bg-canvas"
                              title="Cancel run"
                              aria-label="Cancel run"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {['complete', 'partial', 'failed', 'cancelled'].includes(r.status) && (
                            <button
                              type="button"
                              onClick={() => setDeletingRun(r)}
                              className="p-1 rounded text-muted-ink hover:text-ink hover:bg-canvas"
                              title="Delete run record"
                              aria-label="Delete run record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <Link
                            to={`/app/runs/${r.id}`}
                            className="p-1 rounded text-muted-ink hover:text-ink hover:bg-canvas ml-1"
                            title="Open activity"
                            aria-label="Open activity"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="block sm:hidden divide-y divide-line">
              {runs.map((r) => (
                <div key={r.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/app/runs/${r.id}`}
                      className="text-sm font-semibold text-ink hover:text-deep-teal hover:underline leading-snug"
                    >
                      {r.query}
                    </Link>
                    <StatusBadge status={r.status} size="sm" />
                  </div>

                  <div className="text-xs text-muted-ink space-y-1">
                    <div>ID: <span className="font-mono-tech text-ink">{r.id}</span></div>
                    <div>Findings: <span className="text-ink font-medium">{r.findingCounts?.relevant ?? 0} relevant ({r.findingCounts?.total ?? 0} total)</span></div>
                    <div>Started: <span className="text-ink">{new Date(r.createdAt).toLocaleDateString()}</span></div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
                    <Link
                      to={`/app/runs/${r.id}/results`}
                      className="text-deep-teal hover:underline font-medium"
                    >
                      View results
                    </Link>
                    <Link
                      to={`/app/runs/${r.id}`}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-surface text-ink border border-line inline-flex items-center gap-1"
                    >
                      Activity <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingRun && (
        <O05DestructiveConfirmModal
          isOpen={Boolean(deletingRun)}
          onClose={() => setDeletingRun(null)}
          onConfirm={handleDelete}
          title="Delete research run record"
          itemName={deletingRun.id}
          itemType="run"
          impactDescription="Deleting this run permanently removes its activity log, discovered URL ledger, and associated findings from your personal workspace. This action cannot be undone."
          confirmButtonText="Delete run"
        />
      )}
    </div>
  );
};
