import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useRecipes } from '../services/api/queries';
import { StatusBadge } from '../components/common/StatusBadge';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import { Bot, Search, AlertTriangle, ChevronRight, FileCode, Shield } from 'lucide-react';

export const P13RecipeLibrary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchSite = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';

  const { data: recipesPage, isLoading: loading, error, refetch } = useRecipes();
  const recipes = recipesPage?.items || [];

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const filteredRecipes = recipes.filter((r) => {
    if (searchSite && !r.site.toLowerCase().includes(searchSite.toLowerCase()) && !r.task.toLowerCase().includes(searchSite.toLowerCase())) {
      return false;
    }
    if (statusFilter && r.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="p-5 bg-surface rounded border border-line space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-deep-teal" />
          <h1 className="page-title">Automation recipes</h1>
        </div>
        <p className="text-sm text-muted-ink max-w-2xl leading-relaxed">
          Reusable browser automation procedures generated from research crawls. A recipe becomes Active only after Owner preview, step verification, and successful replay against sample pages.
        </p>
        <div className="p-3 bg-subtle-surface rounded border border-line text-xs text-muted-ink flex items-start gap-2">
          <Shield className="w-4 h-4 text-deep-teal shrink-0 mt-0.5" />
          <span>
            Security guarantee: Recipes contain structured read-only instructions and exportable Playwright code. Arbitrary remote code upload is disabled.
          </span>
        </div>
      </div>

      {error && (
        <ApiErrorBanner
          message={(error as any)?.detail || 'Failed to load recipes.'}
          traceId={(error as any)?.traceId}
          onRetry={() => refetch()}
        />
      )}

      {/* Filter */}
      <div className="p-4 bg-surface rounded border border-line flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-ink" />
          <input
            type="text"
            value={searchSite}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Filter by target site domain (e.g. greenhouse.io, lever.co)..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-line rounded bg-surface text-ink font-mono-tech placeholder:font-sans placeholder:text-muted-ink/60"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-muted-ink">
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => updateParam('status', e.target.value)}
            className="p-1.5 text-xs border border-line rounded bg-surface text-ink"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="approved">Approved</option>
            <option value="previewed">Previewed</option>
            <option value="draft">Draft</option>
            <option value="needs_review">Needs Review (Drift)</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Recipes List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-ink space-y-2">
            <div className="skeleton-box h-4 w-48 mx-auto" />
            <div className="skeleton-box h-3 w-32 mx-auto" />
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="p-12 bg-surface rounded border border-line text-center space-y-2">
            <Bot className="w-8 h-8 text-muted-ink mx-auto stroke-1" />
            <div className="text-sm font-semibold text-ink">No automation recipes found</div>
            <p className="text-xs text-muted-ink max-w-sm mx-auto">
              Recipes are produced during research crawls when structured recurring page patterns are recognized.
            </p>
          </div>
        ) : (
          filteredRecipes.map((r) => (
            <Link
              key={r.id}
              to={`/app/recipes/${r.id}`}
              className="block p-5 bg-surface rounded border border-line hover:border-deep-teal/40 transition-colors space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-deep-teal" />
                  <span className="text-base font-semibold text-ink">{r.task}</span>
                  <span className="font-mono-tech text-xs text-muted-ink bg-subtle-surface px-2 py-0.5 rounded border border-line">
                    v{r.version}
                  </span>
                </div>
                <StatusBadge status={r.status} size="sm" />
              </div>

              <div className="flex items-center gap-2 font-mono-tech text-xs text-muted-ink">
                <span>Target:</span>
                <span className="text-ink">{r.site}</span>
              </div>

              {r.validation?.driftDetected && (
                <div className="p-2.5 bg-subtle-surface rounded border border-line text-xs text-ink flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-ink shrink-0" />
                  <span>Drift detected: {r.validation.driftReason || 'Page structure changed'}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-line text-xs text-muted-ink">
                <span>{r.actions.length} structured replay actions</span>
                <div className="flex items-center gap-1 text-deep-teal font-medium">
                  <span>Inspect recipe</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};
