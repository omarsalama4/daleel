import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRunActivity, useRunAction } from '../services/api/queries';
import { useApi } from '../services/api';
import { HttpApiClient } from '../services/api/HttpApiClient';
import { useToast } from '../components/common/Toast';
import { StatusBadge } from '../components/common/StatusBadge';
import { HumanGateBanner } from '../components/common/HumanGateBanner';
import { LimitMeter } from '../components/common/LimitMeter';
import { O01HostedSignInModal } from '../components/overlays/O01HostedSignInModal';
import { AccessibleTabs } from '../components/common/AccessibleTabs';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import {
  Pause,
  Play,
  XCircle,
  Clock,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const P07RunActivity: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const api = useApi();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data: activity, isLoading: loading, error, refetch } = useRunActivity(runId!);
  const runActionMutation = useRunAction();

  const [filterType, setFilterType] = useState<string>('all');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSaveWorkflow, setShowSaveWorkflow] = useState(false);
  const [workflowName, setWorkflowName] = useState('');

  const run = activity?.run;

  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
    if (!runId) return;
    try {
      await runActionMutation.mutateAsync({ runId, action: { action } });
      showToast(`Run ${action === 'cancel' ? 'cancelled' : `${action}d`} successfully.`, 'info');
      refetch();
    } catch (err: any) {
      showToast(err?.detail || `Failed to ${action} run`, 'error');
    }
  };

  const resolveGate = async (action: 'connect_site' | 'skip_task' | 'review_recipe') => {
    if (!runId || !run?.activeGate?.id || !(api instanceof HttpApiClient)) return;
    try { await api.resolveGate(runId, run.activeGate.id, action); refetch(); }
    catch (e: any) { showToast(e?.detail || 'Could not resolve gate', 'error'); }
  };

  const handleSaveWorkflow = async () => {
    if (!runId || !workflowName.trim()) return;
    try {
      const wf = await api.saveWorkflow({ runId, name: workflowName.trim() });
      showToast(`Workflow "${wf.name}" explicitly saved.`, 'success');
      setShowSaveWorkflow(false);
    } catch (err: any) {
      showToast(err?.detail || 'Failed to save workflow', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 skeleton-box border border-line" />
        <div className="h-32 skeleton-box border border-line" />
        <div className="h-64 skeleton-box border border-line" />
      </div>
    );
  }

  if (!run) {
    return <ApiErrorBanner message={(error as any)?.detail || 'Run unavailable.'} traceId={(error as any)?.traceId} onRetry={() => refetch()} />;
  }

  const runTabs = [
    { id: 'activity', label: 'Activity' },
    { id: 'results', label: 'Results', count: run.findingCounts?.relevant ?? 0 },
    { id: 'coverage', label: 'Coverage' },
  ];

  const handleTabChange = (tabId: string) => {
    if (tabId === 'activity') navigate(`/app/runs/${run.id}`);
    else if (tabId === 'results') navigate(`/app/runs/${run.id}/results`);
    else if (tabId === 'coverage') navigate(`/app/runs/${run.id}/coverage`);
  };

  const events = activity?.events || [];
  const filteredEvents = events.filter((e) => {
    if (filterType === 'all') return true;
    if (filterType === 'gates') return e.type === 'human_gate' || e.type === 'rate_limit';
    if (filterType === 'stages') return e.type === 'stage_start';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Tabs */}
      <div className="p-5 bg-surface rounded border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-3">
            <Link
              to="/app/runs"
              className="p-1.5 rounded text-muted-ink hover:text-ink hover:bg-canvas border border-transparent hover:border-line min-target flex items-center justify-center"
              aria-label="Back to runs list"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status={run.status} size="sm" />
                <span className="font-mono-tech text-xs text-muted-ink">ID: {run.id}</span>
                <span className="text-muted-ink text-xs">•</span>
                <span className="font-mono-tech text-xs text-muted-ink uppercase">{run.mode} mode</span>
              </div>
            </div>
          </div>

          <AccessibleTabs
            tabs={runTabs}
            activeTab="activity"
            onChange={handleTabChange}
            ariaLabel="Run navigation tabs"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h1 className="text-xl font-semibold text-ink m-0 leading-tight">
              {run.query}
            </h1>
            {run.stopReason && (
              <p className="text-xs text-muted-ink italic">
                Outcome: {run.stopReason}
              </p>
            )}
          </div>

          {/* Run Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {run.status === 'running' && (
              <button
                type="button"
                onClick={() => handleAction('pause')}
                disabled={runActionMutation.isPending}
                className="px-3.5 py-2 text-xs font-medium rounded border border-line bg-surface hover:bg-subtle-surface text-ink flex items-center gap-1.5 min-target"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </button>
            )}

            {(run.status === 'paused') && (
              <button
                type="button"
                onClick={() => handleAction('resume')}
                disabled={runActionMutation.isPending}
                className="px-3.5 py-2 text-xs font-medium rounded bg-deep-teal hover:bg-deep-teal-hover text-surface flex items-center gap-1.5 min-target"
              >
                <Play className="w-3.5 h-3.5" />
                Resume
              </button>
            )}

            {['running', 'paused', 'needs_attention'].includes(run.status) && (
              <button
                type="button"
                onClick={() => handleAction('cancel')}
                disabled={runActionMutation.isPending}
                className="px-3.5 py-2 text-xs font-medium rounded border border-line bg-surface hover:bg-subtle-surface text-muted-ink hover:text-ink flex items-center gap-1.5 min-target"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setWorkflowName(run.query.slice(0, 40));
                setShowSaveWorkflow(true);
              }}
              className="px-3.5 py-2 text-xs font-medium rounded border border-line bg-surface hover:bg-subtle-surface text-ink flex items-center gap-1.5 min-target"
              title="Save as reusable workflow"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Save workflow
            </button>
          </div>
        </div>
      </div>

      {error && (
        <ApiErrorBanner
          message={(error as any)?.detail || 'Failed to load run activity.'}
          traceId={(error as any)?.traceId}
          onRetry={() => refetch()}
        />
      )}

      {/* Save Workflow Explicit Modal */}
      {showSaveWorkflow && (
        <div className="p-4 bg-surface rounded border border-deep-teal/40 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Bookmark className="w-4 h-4 text-deep-teal" />
            <span>Explicitly save workflow playbook</span>
          </div>
          <p className="text-xs text-muted-ink">
            A run never auto-saves. Assign a name to retain this query's extraction schema, seed sites, and criteria in your Saved Workflows library.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="e.g. AI Engineer Opportunity Monitor"
              className="flex-1 p-2 text-sm border border-line rounded bg-surface text-ink"
            />
            <button
              type="button"
              onClick={handleSaveWorkflow}
              className="px-4 py-2 bg-deep-teal hover:bg-deep-teal-hover text-surface text-xs font-medium rounded min-target"
            >
              Confirm save
            </button>
            <button
              type="button"
              onClick={() => setShowSaveWorkflow(false)}
              className="px-3 py-2 border border-line bg-surface hover:bg-canvas text-xs rounded min-target"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 2. Attention Gate Banner (O06) */}
      {run.activeGate && (
        <HumanGateBanner
          gate={run.activeGate}
          onConnectSite={() => setShowConnectModal(true)}
          onReviewRecipe={() => navigate(run.activeGate?.recipeId ? `/app/recipes/${run.activeGate.recipeId}` : '/app/recipes')}
          onSkipTask={() => resolveGate('skip_task')}
          onStop={() => handleAction('cancel')}
        />
      )}

      {/* 3. Stage Timeline */}
      <div className="p-5 bg-surface rounded border border-line space-y-3">
        <h3 className="section-title">Execution Stages</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {[
            { id: 'planning', label: 'Planning' },
            { id: 'discovery', label: 'Discovery' },
            { id: 'extraction', label: 'Extraction' },
            { id: 'validation', label: 'Verification' },
            { id: 'complete', label: 'Completion' },
          ].map((st, i) => {
            const currentIdx = run.status === 'complete' ? 4 : run.status === 'running' ? 2 : run.status === 'needs_attention' ? 3 : 1;
            const isDone = i < currentIdx || run.status === 'complete';
            const isActive = i === currentIdx && run.status !== 'complete';
            return (
              <div
                key={st.id}
                className={`p-3 rounded border text-xs space-y-1 ${
                  isActive
                    ? 'bg-deep-teal-subtle border-deep-teal'
                    : isDone
                    ? 'bg-canvas border-line text-muted-ink'
                    : 'bg-surface border-line text-muted-ink opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize text-ink">{st.label}</span>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-deep-teal" />}
                  {isActive && <Clock className="w-3.5 h-3.5 text-deep-teal animate-spin" />}
                </div>
                <div className="text-[11px] text-muted-ink">
                  {isDone ? 'Completed' : isActive ? 'Active' : 'Queued'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Live Limit Meter */}
      <LimitMeter usage={run.usage} limits={run.limits} />

      {/* 5. Live Event Stream */}
      <div className="bg-surface rounded border border-line overflow-hidden space-y-0">
        <div className="p-4 border-b border-line bg-canvas/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">Monotonic Activity Stream</h3>
            <span className="font-mono-tech text-xs text-muted-ink">({filteredEvents.length} events)</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-muted-ink" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="p-1 text-xs border border-line rounded bg-surface text-ink"
            >
              <option value="all">All events</option>
              <option value="gates">Gates & Rate limits</option>
              <option value="stages">Stage transitions</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-line text-xs font-mono-tech max-h-[380px] overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-muted-ink font-sans">
              No events recorded yet.
            </div>
          ) : (
            filteredEvents.map((ev, idx) => (
              <div
                key={idx}
                className={`p-3.5 hover:bg-subtle-surface/50 transition-colors flex items-start gap-3 ${
                  ev.type === 'human_gate'
                    ? 'bg-subtle-surface border-l-2 border-deep-teal'
                    : ev.type === 'rate_limit'
                    ? 'bg-subtle-surface/60'
                    : ''
                }`}
              >
                <span className="text-muted-ink text-[11px] w-8 shrink-0">#{ev.sequence}</span>
                <span className="text-muted-ink text-[11px] shrink-0">
                  {new Date(ev.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <div className="flex-1 space-y-0.5">
                  <div className="text-ink font-sans text-xs">{ev.message}</div>
                  {ev.pageUrl && (
                    <div className="text-muted-ink text-[11px] truncate max-w-lg">
                      URL: {ev.pageUrl}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* O01 Hosted Sign-In Modal */}
      {showConnectModal && (
        <O01HostedSignInModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          domain={run.activeGate?.targetSite || 'target-site.com'}
          onFinishConnection={async () => {
            setShowConnectModal(false);
            await resolveGate('connect_site');
          }}
        />
      )}
    </div>
  );
};
