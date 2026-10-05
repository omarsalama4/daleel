import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkflows } from '../services/api/queries';
import { useApi } from '../services/api';
import { useToast } from '../components/common/Toast';
import type { Workflow } from '../types/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { O02ShareItemModal } from '../components/overlays/O02ShareItemModal';
import { O05DestructiveConfirmModal } from '../components/overlays/O05DestructiveConfirmModal';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import {
  PlusCircle,
  Search,
  Play,
  Share2,
  Trash2,
  Bookmark,
  Layers,
  Clock,
} from 'lucide-react';

export const P11WorkflowLibrary: React.FC = () => {
  const api = useApi();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const sortOrder = searchParams.get('sort') || 'newest';

  const { data: workflowsPage, isLoading: loading, error, refetch } = useWorkflows();
  const workflows = workflowsPage?.items || [];

  const [sharingWf, setSharingWf] = useState<Workflow | null>(null);
  const [deletingWf, setDeletingWf] = useState<Workflow | null>(null);

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const filteredWorkflows = workflows
    .filter((w) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const plan = w.versions[w.versions.length - 1]?.plan || w.versions[0]?.plan;
        return (
          w.name.toLowerCase().includes(q) ||
          (plan?.query && plan.query.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleDelete = async () => {
    if (!deletingWf) return;
    try {
      await api.deleteWorkflow(deletingWf.id);
      showToast('Workflow removed.', 'success');
      setDeletingWf(null);
      refetch();
    } catch (err: any) {
      showToast(err?.detail || 'Failed to delete workflow', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="page-title">Saved Workflows</h1>
          <p className="text-sm text-muted-ink mt-1">
            Explicitly saved research playbooks. A generated plan only appears here after a deliberate save action.
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
          message={(error as any)?.detail || 'Failed to load saved workflows.'}
          traceId={(error as any)?.traceId}
          onRetry={() => refetch()}
        />
      )}

      {/* Search & Sort Controls */}
      <div className="p-4 bg-surface rounded border border-line flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-muted-ink absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Search saved workflows by name or query..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-line rounded bg-surface text-ink placeholder:text-muted-ink/60"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-ink">
          <span>Sort:</span>
          <select
            value={sortOrder}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="p-1.5 text-xs border border-line rounded bg-surface text-ink"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Workflows List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-ink space-y-2">
            <div className="skeleton-box h-4 w-48 mx-auto" />
            <div className="skeleton-box h-3 w-32 mx-auto" />
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="p-12 bg-surface rounded border border-line text-center space-y-3">
            <Bookmark className="w-8 h-8 text-muted-ink mx-auto stroke-1" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-ink">No saved workflows</h3>
              <p className="text-xs text-muted-ink max-w-sm mx-auto">
                {searchQuery
                  ? 'No workflows matched your search term.'
                  : 'Workflows are never saved automatically. After completing or reviewing a research run, click "Save workflow" to retain it here.'}
              </p>
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => updateParam('q', '')}
                className="text-xs text-deep-teal hover:underline font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredWorkflows.map((wf) => {
            const plan = wf.versions[wf.versions.length - 1]?.plan || wf.versions[0]?.plan;
            return (
              <div
                key={wf.id}
                className="p-5 bg-surface rounded border border-line hover:border-deep-teal/40 transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Bookmark className="w-4 h-4 text-deep-teal shrink-0" />
                    <Link
                      to={`/app/workflows/${wf.id}`}
                      className="text-base font-semibold text-ink hover:text-deep-teal hover:underline"
                    >
                      {wf.name}
                    </Link>
                    <span className="text-xs font-mono-tech px-2 py-0.5 rounded bg-subtle-surface border border-line text-muted-ink">
                      v{wf.currentVersion}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/app/new?workflowId=${wf.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-deep-teal-subtle text-deep-teal border border-deep-teal/30 hover:bg-deep-teal hover:text-surface transition-colors min-target"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Run workflow</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setSharingWf(wf)}
                      className="p-1.5 text-muted-ink hover:text-ink hover:bg-canvas rounded border border-line min-target flex items-center justify-center"
                      title="Share workflow"
                      aria-label="Share workflow"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingWf(wf)}
                      className="p-1.5 text-muted-ink hover:text-ink hover:bg-canvas rounded border border-line min-target flex items-center justify-center"
                      title="Delete workflow"
                      aria-label="Delete workflow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-muted-ink line-clamp-2 leading-relaxed">
                  {plan?.query || 'Playbook query and structured field extractions'}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-ink border-t border-line">
                  <div className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{plan?.fields?.length ?? 0} output fields</span>
                  </div>
                  {wf.lastRunStatus && (
                    <div className="flex items-center gap-1">
                      <StatusBadge status={wf.lastRunStatus} size="sm" />
                    </div>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Updated {new Date(wf.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Share Modal */}
      {sharingWf && (
        <O02ShareItemModal
          isOpen={Boolean(sharingWf)}
          onClose={() => setSharingWf(null)}
          resourceType="workflow"
          resourceId={sharingWf.id}
          resourceTitle={sharingWf.name}
          onShare={async (email) => {
            await api.createShare({
              recipientUserId: email,
              resourceType: 'workflow',
              resourceId: sharingWf.id,
            });
            showToast('Workflow shared.', 'success');
          }}
        />
      )}

      {/* Destructive Delete Modal */}
      {deletingWf && (
        <O05DestructiveConfirmModal
          isOpen={Boolean(deletingWf)}
          onClose={() => setDeletingWf(null)}
          onConfirm={handleDelete}
          title="Delete saved workflow"
          itemName={deletingWf.name}
          itemType="workflow"
          impactDescription="Deleting this workflow removes its saved version history and playbook parameters. Past completed runs that executed this workflow will retain their findings."
          confirmButtonText="Delete workflow"
        />
      )}
    </div>
  );
};
