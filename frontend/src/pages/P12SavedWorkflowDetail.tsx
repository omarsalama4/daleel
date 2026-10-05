import React, { useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkflow, useRuns, useRecipes } from '../services/api/queries';
import type { PlanField } from '../types/api';
import { useApi } from '../services/api';
import { useToast } from '../components/common/Toast';
import { StatusBadge } from '../components/common/StatusBadge';
import { LimitMeter } from '../components/common/LimitMeter';
import { O02ShareItemModal } from '../components/overlays/O02ShareItemModal';
import { AccessibleTabs } from '../components/common/AccessibleTabs';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import {
  Play,
  Share2,
  Copy,
  Clock,
  Layers,
  ArrowLeft,
  Bookmark,
  ChevronRight,
  ExternalLink,
  Bot,
} from 'lucide-react';

export const P12SavedWorkflowDetail: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const api = useApi();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const { data: workflow, isLoading: loadingWf, error: wfError, refetch } = useWorkflow(workflowId!);
  const { data: allRunsPage, isLoading: loadingRuns } = useRuns();
  const { data: recipesPage } = useRecipes();
  const runs = (allRunsPage?.items || []).filter((r) => r.workflowId === workflowId);
  const linkedRecipe = (recipesPage?.items || []).find((r) => r.linkedWorkflowId === workflowId);

  const loading = loadingWf || loadingRuns;
  const [showShareModal, setShowShareModal] = useState(false);

  const updateTab = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const handleDuplicate = async () => {
    if (!workflow) return;
    try {
      const dup = await api.duplicateWorkflow(workflow.id);
      showToast(`Duplicated to your workspace as "${dup.name}".`, 'success');
      navigate(`/app/workflows/${dup.id}`);
    } catch (err: any) {
      showToast(err?.detail || 'Failed to duplicate workflow', 'error');
    }
  };

  if (loading || !workflow) {
    return (
      <div className="space-y-6">
        <div className="h-16 skeleton-box border border-line" />
        <div className="h-64 skeleton-box border border-line" />
      </div>
    );
  }

  const latestPlan = workflow.versions[workflow.versions.length - 1]?.plan || workflow.versions[0]?.plan;

  const workflowTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'versions', label: `Versions (${workflow.versions?.length ?? 1})` },
    { id: 'runs', label: `Linked runs (${runs.length})` },
    { id: 'recipes', label: 'Linked recipes' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="p-5 bg-surface rounded border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line text-xs">
          <Link
            to="/app/workflows"
            className="flex items-center gap-1.5 text-muted-ink hover:text-ink font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to workflow library</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDuplicate}
              className="px-3.5 py-2 rounded border border-line bg-surface hover:bg-subtle-surface text-ink flex items-center gap-1.5 text-xs font-medium min-target"
            >
              <Copy className="w-3.5 h-3.5 text-muted-ink" />
              <span>Duplicate</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-3.5 py-2 rounded border border-line bg-surface hover:bg-subtle-surface text-ink flex items-center gap-1.5 text-xs font-medium min-target"
            >
              <Share2 className="w-3.5 h-3.5 text-muted-ink" />
              <span>Share playbook</span>
            </button>

            <Link
              to={`/app/new?workflowId=${workflow.id}`}
              className="px-4 py-2 rounded bg-deep-teal hover:bg-deep-teal-hover text-surface flex items-center gap-1.5 text-xs font-medium min-target"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run as new version</span>
            </Link>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-deep-teal" />
            <span className="font-mono-tech text-xs text-muted-ink">v{workflow.currentVersion}</span>
            <span className="text-muted-ink text-xs">•</span>
            <span className="text-xs text-muted-ink flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Saved {new Date(workflow.updatedAt).toLocaleDateString()}
            </span>
          </div>

          <h1 className="page-title mt-1">
            {workflow.name}
          </h1>

          <p className="text-sm text-muted-ink leading-relaxed">
            {latestPlan?.query || 'Playbook query and structured field extractions'}
          </p>
        </div>
      </div>

      {wfError && (
        <ApiErrorBanner
          message={(wfError as any)?.detail || 'Failed to load workflow detail.'}
          traceId={(wfError as any)?.traceId}
          onRetry={() => refetch()}
        />
      )}

      {/* Tabs */}
      <AccessibleTabs
        tabs={workflowTabs}
        activeTab={activeTab}
        onChange={updateTab}
        ariaLabel="Workflow detail tabs"
      />

      {/* 2. Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-5 bg-surface rounded border border-line space-y-4">
            <h3 className="section-title">Query & Research Parameters</h3>
            <div className="p-3 bg-canvas rounded border border-line text-sm text-ink leading-relaxed font-sans">
              "{latestPlan?.query || 'No query specified'}"
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-ink">Relevance Policy:</span>
                <p className="text-muted-ink capitalize">{latestPlan?.relevance || 'balanced'} filtering heuristic against requested criteria.</p>
              </div>
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-ink">Source Strategy:</span>
                <p className="text-muted-ink">Public search discovery with domain-bounded crawls.</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-surface rounded border border-line space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-deep-teal" />
              <h3 className="section-title">Planned Output Schema ({latestPlan?.fields?.length ?? 0} fields)</h3>
            </div>

            <div className="divide-y divide-line rounded border border-line overflow-hidden">
              {(latestPlan?.fields || []).map((f: PlanField, i: number) => (
                <div key={i} className="p-3 bg-surface hover:bg-subtle-surface/60 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-ink">{f.label || f.key}</span>
                    <span className="ml-2 font-mono-tech text-xs text-muted-ink uppercase">({f.type})</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-ink">
                    <span>{f.required ? 'Required' : 'Optional'}</span>
                    <span>•</span>
                    <span>Evidence: {f.evidenceRule}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <LimitMeter limits={latestPlan?.limits || { domains: 5, pages: 100, depth: 2, minutes: 10, downloadMb: 25 }} />
        </div>
      )}

      {/* 3. Versions Tab */}
      {activeTab === 'versions' && (
        <div className="bg-surface rounded border border-line overflow-hidden divide-y divide-line text-sm">
          {(workflow.versions || []).map((v) => (
            <div key={v.version} className="p-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">Version {v.version}</span>
                  {v.version === workflow.currentVersion && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-deep-teal-subtle text-deep-teal font-medium">
                      Active
                    </span>
                  )}
                  <span className="text-xs text-muted-ink font-mono-tech">
                    {new Date(v.savedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-muted-ink">{v.changeSummary}</p>
              </div>
              <span className="text-xs text-muted-ink capitalize">{v.author}</span>
            </div>
          ))}
        </div>
      )}

      {/* 4. Linked Runs Tab */}
      {activeTab === 'runs' && (
        <div className="bg-surface rounded border border-line overflow-hidden divide-y divide-line text-sm">
          {runs.length === 0 ? (
            <div className="p-8 text-center text-muted-ink text-xs">
              No historical runs linked to this workflow version yet.
            </div>
          ) : (
            runs.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Link
                    to={`/app/runs/${r.id}`}
                    className="font-medium text-ink hover:text-deep-teal hover:underline flex items-center gap-2"
                  >
                    <span>Run {r.id}</span>
                    <StatusBadge status={r.status} size="sm" />
                  </Link>
                  <div className="text-xs text-muted-ink">
                    Executed {new Date(r.createdAt).toLocaleString()} • {r.findingCounts?.relevant ?? 0} findings
                  </div>
                </div>
                <Link
                  to={`/app/runs/${r.id}/results`}
                  className="px-3 py-1.5 rounded border border-line text-xs font-medium hover:bg-canvas text-ink flex items-center gap-1"
                >
                  Results <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. Linked Recipes Tab */}
      {activeTab === 'recipes' && (
        <div className="p-5 bg-surface rounded border border-line space-y-3">
          <h3 className="section-title">Linked Automation Recipe</h3>
          {linkedRecipe ? (
            <div className="p-4 bg-canvas rounded border border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-deep-teal" />
                <div>
                  <div className="font-semibold text-sm text-ink">{linkedRecipe.task}</div>
                  <div className="text-xs text-muted-ink font-mono-tech">ID: {linkedRecipe.id} ({linkedRecipe.site})</div>
                </div>
              </div>
              <Link
                to={`/app/recipes/${linkedRecipe.id}`}
                className="px-3 py-1.5 rounded bg-surface hover:bg-subtle-surface border border-line text-xs font-medium text-ink flex items-center gap-1"
              >
                <span>Inspect recipe</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-ink" />
              </Link>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-ink text-xs bg-canvas rounded border border-line">
              No deterministic Playwright automation recipe has been linked to this workflow.
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <O02ShareItemModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          resourceType="workflow"
          resourceId={workflow.id}
          resourceTitle={workflow.name}
          onShare={async (email) => {
            await api.createShare({
              recipientUserId: email,
              resourceType: 'workflow',
              resourceId: workflow.id,
            });
            showToast('Workflow shared.', 'success');
          }}
        />
      )}
    </div>
  );
};
