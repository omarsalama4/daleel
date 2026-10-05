import React, { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useRecipe, useRecipeAction } from '../services/api/queries';
import { useToast } from '../components/common/Toast';
import { StatusBadge } from '../components/common/StatusBadge';
import { AccessibleTabs } from '../components/common/AccessibleTabs';
import { RecipeVersionDiff } from '../components/common/RecipeVersionDiff';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import {
  ArrowLeft,
  Copy,
  Download,
  Shield,
  Check,
  RefreshCw,
  FileCode,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const P14RecipeDetailApproval: React.FC = () => {
  const { recipeId } = useParams<{ recipeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const { showToast } = useToast();

  const { data: recipe, isLoading: loading, error, refetch } = useRecipe(recipeId!);
  const recipeActionMutation = useRecipeAction();
  const [copiedCode, setCopiedCode] = useState(false);

  const updateTab = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const handleAction = async (action: 'preview' | 'approve' | 'replay' | 'retire') => {
    if (!recipeId) return;
    try {
      await recipeActionMutation.mutateAsync({ recipeId, action: { action } });
      showToast(
        action === 'replay'
          ? 'Replay validation passed against sample pages. Recipe Active.'
          : `Recipe ${action} completed successfully.`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.detail || `Failed to ${action} recipe`, 'error');
    }
  };

  const handleCopyCode = () => {
    if (!recipe?.codeSnippet) return;
    navigator.clipboard.writeText(recipe.codeSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    showToast('Playwright automation code copied to clipboard.', 'info');
  };

  if (loading || !recipe) {
    return (
      <div className="space-y-6">
        <div className="h-16 skeleton-box border border-line" />
        <div className="h-64 skeleton-box border border-line" />
      </div>
    );
  }

  const recipeTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'actions', label: `Actions (${recipe.actions.length})` },
    { id: 'validation', label: 'Validation & Replay' },
    { id: 'versions', label: 'Versions & Drift' },
    { id: 'code', label: 'Playwright Code' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="p-5 bg-surface rounded border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line text-xs">
          <Link
            to="/app/recipes"
            className="flex items-center gap-1.5 text-muted-ink hover:text-ink font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to recipe library</span>
          </Link>

          {/* Lifecycle actions */}
          <div className="flex items-center gap-2">
            {recipe.status === 'draft' && (
              <button
                type="button"
                onClick={() => handleAction('preview')}
                disabled={recipeActionMutation.isPending}
                className="px-3 py-1.5 rounded text-xs font-medium border border-line bg-surface hover:bg-subtle-surface text-ink min-target"
              >
                Mark Previewed
              </button>
            )}

            {(recipe.status === 'draft' || recipe.status === 'previewed') && (
              <button
                type="button"
                onClick={() => handleAction('approve')}
                disabled={recipeActionMutation.isPending}
                className="px-3 py-1.5 rounded text-xs font-medium bg-deep-teal hover:bg-deep-teal-hover text-surface min-target"
              >
                Approve Recipe
              </button>
            )}

            {(recipe.status === 'approved' || recipe.status === 'needs_review') && (
              <button
                type="button"
                onClick={() => handleAction('replay')}
                disabled={recipeActionMutation.isPending}
                className="px-3 py-1.5 rounded text-xs font-medium bg-deep-teal hover:bg-deep-teal-hover text-surface flex items-center gap-1.5 min-target"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recipeActionMutation.isPending ? 'animate-spin' : ''}`} />
                <span>{recipeActionMutation.isPending ? 'Validating replay...' : 'Validate Replay & Activate'}</span>
              </button>
            )}

            {recipe.status === 'active' && (
              <button
                type="button"
                onClick={() => handleAction('retire')}
                disabled={recipeActionMutation.isPending}
                className="px-3 py-1.5 rounded text-xs font-medium border border-line bg-surface hover:bg-subtle-surface text-muted-ink hover:text-ink min-target"
              >
                Retire Recipe
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono-tech text-xs font-semibold text-ink px-2 py-0.5 rounded border border-line bg-subtle-surface">
              {recipe.site}
            </span>
            <StatusBadge status={recipe.status} size="sm" />
            <span className="text-muted-ink font-mono-tech text-xs">v{recipe.version}</span>
          </div>

          <h1 className="page-title mt-1">
            {recipe.task}
          </h1>
        </div>

        {recipe.validation?.driftDetected && (
          <div className="p-3 rounded bg-subtle-surface border border-line text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-ink shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-ink">Selector drift detected</div>
              <p className="text-muted-ink mt-0.5 leading-relaxed">
                {recipe.validation.driftReason ||
                  'Target website modified its DOM structure. Replay validation must pass before reactivation.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <ApiErrorBanner
          message={(error as any)?.detail || 'Failed to load recipe detail.'}
          traceId={(error as any)?.traceId}
          onRetry={() => refetch()}
        />
      )}

      {/* Tabs */}
      <AccessibleTabs
        tabs={recipeTabs}
        activeTab={activeTab}
        onChange={updateTab}
        ariaLabel="Recipe detail tabs"
      />

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="p-5 bg-surface rounded border border-line space-y-4">
          <h3 className="section-title">Recipe Overview</h3>
          <p className="text-sm text-ink leading-relaxed">
            Deterministic browser automation procedure for <strong className="font-semibold">{recipe.site}</strong>. Created for query <span className="font-mono-tech text-xs">"{recipe.task}"</span>.
          </p>

          <div className="p-4 bg-canvas rounded border border-line space-y-2 text-xs">
            <div className="font-semibold text-ink">Execution & Safety Policy:</div>
            <ul className="list-disc list-inside text-muted-ink space-y-1 leading-relaxed">
              <li>Contains only read-only browser interactions (click, scroll, wait, extract).</li>
              <li>Arbitrary remote script execution or write-backs to target servers are strictly disallowed.</li>
              <li>Activates only after verified replay against sample pages.</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-line">
            <div className="text-xs font-semibold text-muted-ink uppercase tracking-wider">Representative Pages for Replay:</div>
            {recipe.validation.samplePages.map((url, i) => (
              <div key={i} className="p-2.5 bg-subtle-surface rounded border border-line text-xs font-mono-tech text-ink flex items-center justify-between">
                <span className="truncate max-w-xl">{url}</span>
                <span className="text-[11px] text-muted-ink">Sample page {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="bg-surface rounded border border-line overflow-hidden">
          <div className="p-4 border-b border-line bg-canvas/40 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-ink uppercase tracking-wider">
              Ordered browser automation steps ({recipe.actions.length})
            </h3>
            <span className="text-xs text-muted-ink">Read-only actions</span>
          </div>

          <div className="divide-y divide-line text-sm">
            {recipe.actions.map((act) => (
              <div key={act.order} className="p-4 hover:bg-subtle-surface/50 transition-colors flex items-start gap-3">
                <span className="font-mono-tech text-xs text-muted-ink w-6 shrink-0 pt-0.5">
                  {act.order}.
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded border border-line bg-subtle-surface font-mono-tech text-xs text-ink uppercase">
                      {act.type}
                    </span>
                    <span className="font-mono-tech text-xs text-ink">{act.target}</span>
                  </div>
                  <p className="text-muted-ink text-xs leading-relaxed">{act.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="p-5 bg-surface rounded border border-line space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Replay Validation Outcome</h3>
            <span className="text-xs text-muted-ink">
              Outcome: <span className="font-medium text-ink capitalize">{recipe.validation.outcome}</span>
            </span>
          </div>

          <p className="text-sm text-muted-ink leading-relaxed">
            Every step is executed in a headless browser container against verified sample pages to check selector stability and field extraction accuracy.
          </p>

          {recipe.validation.stepResults && (
            <div className="space-y-2 border border-line rounded p-4 bg-canvas divide-y divide-line">
              {recipe.validation.stepResults.map((res) => (
                <div key={res.stepOrder} className="py-2 flex items-center gap-3 text-sm">
                  {res.success ? (
                    <CheckCircle2 className="w-4 h-4 text-deep-teal shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-ink shrink-0" />
                  )}
                  <span className="font-mono-tech text-xs font-semibold">Step {res.stepOrder}:</span>
                  <span className="text-muted-ink text-xs">{res.message || (res.success ? 'Selector verified on sample DOM' : 'Failed to match DOM element')}</span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3">
            <button
              type="button"
              onClick={() => handleAction('replay')}
              disabled={recipeActionMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded bg-deep-teal hover:bg-deep-teal-hover text-surface text-sm font-medium transition-colors min-target"
            >
              <RefreshCw className={`w-4 h-4 ${recipeActionMutation.isPending ? 'animate-spin' : ''}`} />
              <span>{recipeActionMutation.isPending ? 'Executing replay...' : 'Run headless replay check'}</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <RecipeVersionDiff recipe={recipe} />
      )}

      {activeTab === 'code' && recipe.codeSnippet && (
        <div className="p-5 bg-surface rounded border border-line space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-deep-teal" />
              <h3 className="section-title">Playwright Code Export</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-line bg-surface hover:bg-subtle-surface text-ink min-target"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-deep-teal" /> : <Copy className="w-3.5 h-3.5 text-muted-ink" />}
                <span>{copiedCode ? 'Copied' : 'Copy Playwright script'}</span>
              </button>

              <a
                href={`data:text/javascript;charset=utf-8,${encodeURIComponent(recipe.codeSnippet)}`}
                download={`${recipe.site.replace(/[^a-z0-9]/gi, '_')}_recipe.js`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-line bg-surface hover:bg-subtle-surface text-ink min-target"
              >
                <Download className="w-3.5 h-3.5 text-muted-ink" />
                <span>Download .js</span>
              </a>
            </div>
          </div>

          <div className="p-3 bg-subtle-surface rounded border border-line text-xs text-muted-ink flex items-start gap-2">
            <Shield className="w-4 h-4 text-deep-teal shrink-0 mt-0.5" />
            <span>
              Inspected code contains clean DOM automation steps. Zero session credentials or private tokens are embedded.
            </span>
          </div>

          <pre className="p-4 rounded bg-surface border border-line font-mono-tech text-xs text-ink overflow-x-auto leading-relaxed">
            <code>{recipe.codeSnippet}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
