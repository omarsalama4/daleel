import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../services/api';
import { useAuth } from '../services/auth/AuthContext';
import type { Run, Workflow, Recipe, Usage, Storage } from '../types/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { HumanGateBanner } from '../components/common/HumanGateBanner';
import {
  PlusCircle,
  PlaySquare,
  Workflow as WorkflowIcon,
  Bot,
  AlertTriangle,
  ChevronRight,
  DollarSign,
} from 'lucide-react';

export const P03Home: React.FC = () => {
  const api = useApi();
  const { account } = useAuth();
  const navigate = useNavigate();

  const [runs, setRuns] = useState<Run[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [storage, setStorage] = useState<Storage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [runsRes, wfRes, rcpRes, usageRes, storageRes] = await Promise.all([
          api.listRuns({ pageSize: 5 }),
          api.listWorkflows(),
          api.listRecipes(),
          api.getUsage(),
          api.getStorage(),
        ]);
        setRuns(runsRes.items);
        setWorkflows(wfRes.items);
        setRecipes(rcpRes.items);
        setUsage(usageRes);
        setStorage(storageRes);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [api]);

  const attentionRuns = runs.filter((r) => r.status === 'needs_attention' || r.activeGate);
  const recentRuns = runs.slice(0, 4);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 skeleton-box border border-line" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-40 skeleton-box border border-line" />
          <div className="h-40 skeleton-box border border-line" />
          <div className="h-40 skeleton-box border border-line" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Welcome & Primary CTA Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-surface rounded border border-line">
        <div>
          <span className="text-xs font-semibold text-muted-ink uppercase tracking-wider">Personal workspace</span>
          <h1 className="page-title mt-0.5">
            {account?.workspace.name || 'Research Workspace'}
          </h1>
          <p className="text-sm text-muted-ink mt-1 max-w-xl leading-relaxed">
            Bounded natural-language research crawler with field-level evidence, verified site recipes, and human approval gates.
          </p>
        </div>

        <Link
          to="/app/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded text-sm font-medium text-white bg-deep-teal hover:bg-deep-teal-hover shadow-xs shrink-0 min-target"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New research</span>
        </Link>
      </div>

      {/* 2. Needs Attention Gate Panel (O06 / spec 3.3) */}
      {attentionRuns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-ink" />
            <h2 className="text-sm font-semibold text-ink m-0">Human attention required ({attentionRuns.length})</h2>
          </div>
          {attentionRuns.map((run) => (
            run.activeGate ? (
              <HumanGateBanner
                key={run.id}
                gate={run.activeGate}
                onConnectSite={(site) => navigate(`/app/sessions?connect=${encodeURIComponent(site || '')}`)}
                onReviewRecipe={() => navigate('/app/recipes')}
                onSkipTask={() => navigate(`/app/runs/${run.id}`)}
                onStop={() => navigate(`/app/runs/${run.id}`)}
              />
            ) : (
              <div key={run.id} className="p-4 bg-surface rounded border border-line flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-ink">{run.query}</div>
                  <div className="text-xs text-muted-ink mt-0.5">Run paused at human verification checkpoint</div>
                </div>
                <Link
                  to={`/app/runs/${run.id}`}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover rounded"
                >
                  Resolve gate
                </Link>
              </div>
            )
          ))}
        </div>
      )}

      {/* 3. Recent Runs Section */}
      <div className="bg-surface rounded border border-line overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between bg-canvas/40">
          <div className="flex items-center gap-2">
            <PlaySquare className="w-4 h-4 text-deep-teal" />
            <h2 className="text-sm font-semibold text-ink m-0">Recent research runs</h2>
          </div>
          <Link to="/app/runs" className="text-xs font-medium text-deep-teal hover:underline flex items-center gap-1">
            <span>View all runs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentRuns.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-ink">
            No research runs yet. Submit your first query with <Link to="/app/new" className="text-deep-teal underline">New research</Link>.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {recentRuns.map((run) => (
              <div
                key={run.id}
                className="p-4 hover:bg-subtle-surface transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={run.status} size="sm" />
                    <span className="font-mono-tech text-[11px] text-muted-ink uppercase">
                      {run.mode} mode
                    </span>
                    <span className="text-muted-ink">•</span>
                    <span className="text-[11px] text-muted-ink">
                      {new Date(run.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <Link
                    to={`/app/runs/${run.id}`}
                    className="font-medium text-ink text-sm hover:text-deep-teal block truncate"
                  >
                    {run.query}
                  </Link>
                  {run.stopReason && (
                    <div className="text-[11px] text-muted-ink line-clamp-1 italic">
                      Outcome caveat: {run.stopReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0 text-muted-ink">
                  <div className="text-right">
                    <div className="font-mono-tech text-ink font-medium">
                      {run.findingCounts?.relevant ?? 0} relevant
                    </div>
                    <div className="text-[11px] text-muted-ink">
                      {run.findingCounts?.total ?? 0} findings / {run.usage?.pagesFetched ?? 0} pages
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/app/runs/${run.id}/results`}
                      className="px-3 py-1.5 rounded border border-line bg-surface text-ink hover:bg-canvas font-medium"
                    >
                      Results
                    </Link>
                    <Link
                      to={`/app/runs/${run.id}`}
                      className="px-3 py-1.5 rounded bg-deep-teal text-white hover:bg-deep-teal-hover font-medium"
                    >
                      Activity
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Saved Work & Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Saved Workflows */}
        <div className="bg-surface rounded border border-line overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-line flex items-center justify-between bg-canvas/40">
              <div className="flex items-center gap-2">
                <WorkflowIcon className="w-4 h-4 text-deep-teal" />
                <h3 className="text-sm font-semibold text-ink m-0">Saved workflows</h3>
              </div>
              <Link to="/app/workflows" className="text-xs font-medium text-deep-teal hover:underline flex items-center gap-1">
                <span>All ({workflows.length})</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-line">
              {workflows.slice(0, 2).map((wf) => (
                <div key={wf.id} className="p-4 hover:bg-subtle-surface transition-colors space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <Link to={`/app/workflows/${wf.id}`} className="font-medium text-ink hover:underline">
                      {wf.name}
                    </Link>
                    <span className="font-mono-tech text-[11px] text-muted-ink">v{wf.currentVersion}</span>
                  </div>
                  <p className="text-xs text-muted-ink line-clamp-1">
                    {wf.versions[0]?.changeSummary || 'Custom saved query workflow'}
                  </p>
                </div>
              ))}
              {workflows.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-ink">
                  Workflows require explicit Save action after a successful query run.
                </div>
              )}
            </div>
          </div>

          <div className="p-3 border-t border-line bg-subtle-surface text-[11px] text-muted-ink">
            A generated workflow never saves automatically; saving preserves versioned schemas.
          </div>
        </div>

        {/* Reusable Recipes */}
        <div className="bg-surface rounded border border-line overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-line flex items-center justify-between bg-canvas/40">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-deep-teal" />
                <h3 className="text-sm font-semibold text-ink m-0">Automation recipes</h3>
              </div>
              <Link to="/app/recipes" className="text-xs font-medium text-deep-teal hover:underline flex items-center gap-1">
                <span>All ({recipes.length})</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-line">
              {recipes.slice(0, 2).map((rcp) => (
                <div key={rcp.id} className="p-4 hover:bg-subtle-surface transition-colors space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-tech text-ink font-medium">{rcp.site}</span>
                    <StatusBadge status={rcp.status} size="sm" />
                  </div>
                  <p className="text-xs text-muted-ink line-clamp-1">{rcp.task}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-line bg-subtle-surface text-[11px] text-muted-ink">
            Recipes require Owner preview, replay validation, and explicit approval before activation.
          </div>
        </div>
      </div>

      {/* 5. Capacity & Budget Summary (Spec 3.3 §5) */}
      <div className="p-5 bg-surface rounded border border-line space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-deep-teal" />
            <h3 className="text-sm font-semibold text-ink m-0">Monthly capacity & limits</h3>
          </div>
          <div className="flex gap-3 text-xs">
            <Link to="/app/settings/ai" className="text-deep-teal hover:underline">
              AI provider policy
            </Link>
            <span className="text-line">|</span>
            <Link to="/app/settings/limits" className="text-deep-teal hover:underline">
              Limits & storage
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 rounded bg-subtle-surface border border-line space-y-1 text-xs">
            <div className="text-muted-ink flex justify-between">
              <span>Monthly AI Spend</span>
              <span className="font-mono-tech text-ink">${usage?.aiActualUsd.toFixed(2)} / ${usage?.aiCapUsd.toFixed(2)}</span>
            </div>
            <div className="w-full bg-line h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-deep-teal h-full rounded-full"
                style={{ width: `${Math.min(100, ((usage?.aiActualUsd || 0) / (usage?.aiCapUsd || 5)) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-muted-ink pt-1">
              ${((usage?.aiCapUsd || 5) - (usage?.aiActualUsd || 0)).toFixed(2)} remaining this month
            </div>
          </div>

          <div className="p-3 rounded bg-subtle-surface border border-line space-y-1 text-xs">
            <div className="text-muted-ink flex justify-between">
              <span>Evidence storage</span>
              <span className="font-mono-tech text-ink">{storage?.usedMb.toFixed(1)} / {storage?.quotaMb} MB</span>
            </div>
            <div className="w-full bg-line h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-deep-teal h-full rounded-full"
                style={{ width: `${Math.min(100, ((storage?.usedMb || 0) / (storage?.quotaMb || 500)) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-muted-ink pt-1">
              {storage?.warningAtPercent}% warning threshold enforced
            </div>
          </div>

          <div className="p-3 rounded bg-subtle-surface border border-line space-y-1 text-xs">
            <div className="text-muted-ink flex justify-between">
              <span>Search quota</span>
              <span className="font-mono-tech text-ink">{usage?.searchCredits ?? 'Platform managed'}</span>
            </div>
            <div className="text-[11px] text-muted-ink pt-2 leading-relaxed">
              Search API credits and hosting operate under platform quotas; no automatic fallback to paid search.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
