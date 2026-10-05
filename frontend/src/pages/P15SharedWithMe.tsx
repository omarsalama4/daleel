import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSharedItems } from '../services/api/queries';
import { useApi } from '../services/api';
import { useToast } from '../components/common/Toast';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import {
  Share2,
  Bookmark,
  FileText,
  Copy,
  ExternalLink,
  Shield,
  Search,
} from 'lucide-react';

export const P15SharedWithMe: React.FC = () => {
  const api = useApi();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const filterType = (searchParams.get('type') as 'all' | 'workflow' | 'finding') || 'all';
  const searchQuery = searchParams.get('q') || '';

  const { data: sharedPage, isLoading: loading, error, refetch } = useSharedItems(filterType === 'all' ? undefined : filterType);
  const shares = sharedPage?.items || [];

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && value !== 'all') next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const handleDuplicate = async (wfId: string) => {
    try {
      const dup = await api.duplicateWorkflow(wfId);
      showToast(`Duplicated to your workspace as "${dup.name}".`, 'success');
      navigate(`/app/workflows/${dup.id}`);
    } catch (err: any) {
      showToast(err?.detail || 'Failed to duplicate workflow', 'error');
    }
  };

  const filteredShares = shares.filter((s) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const title = s.resourceTitle?.toLowerCase() || '';
      const email = s.recipientEmail?.toLowerCase() || '';
      if (!title.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Boundary Note */}
      <div className="p-5 bg-surface rounded border border-line space-y-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-deep-teal" />
          <h1 className="page-title">Shared with me</h1>
        </div>
        <p className="text-sm text-muted-ink max-w-2xl leading-relaxed">
          Research artifacts and playbooks explicitly shared with you by other Workspace Owners.
        </p>
        <div className="p-3 bg-subtle-surface rounded border border-line text-xs text-muted-ink flex items-start gap-2">
          <Shield className="w-4 h-4 text-deep-teal shrink-0 mt-0.5" />
          <span>
            Workspace privacy boundary: Shared items are strictly read-only. Senders' raw login sessions, private runs, and AI budgets are never exposed. To run a shared workflow, duplicate it into your own workspace first.
          </span>
        </div>
      </div>

      {error && (
        <ApiErrorBanner
          message={(error as any)?.detail || 'Failed to load shared items.'}
          traceId={(error as any)?.traceId}
          onRetry={() => refetch()}
        />
      )}

      {/* 2. Filter Bar */}
      <div className="p-4 bg-surface rounded border border-line flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-ink" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Search shared findings or workflows..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-line rounded bg-surface text-ink placeholder:text-muted-ink/60"
          />
        </div>

        <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => updateParam('type', 'all')}
            className={`px-3 py-1.5 rounded font-medium border min-target ${
              filterType === 'all'
                ? 'bg-deep-teal-subtle text-deep-teal border-deep-teal'
                : 'bg-surface text-muted-ink border-line hover:text-ink'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => updateParam('type', 'workflow')}
            className={`px-3 py-1.5 rounded font-medium border min-target ${
              filterType === 'workflow'
                ? 'bg-deep-teal-subtle text-deep-teal border-deep-teal'
                : 'bg-surface text-muted-ink border-line hover:text-ink'
            }`}
          >
            Workflows
          </button>
          <button
            type="button"
            onClick={() => updateParam('type', 'finding')}
            className={`px-3 py-1.5 rounded font-medium border min-target ${
              filterType === 'finding'
                ? 'bg-deep-teal-subtle text-deep-teal border-deep-teal'
                : 'bg-surface text-muted-ink border-line hover:text-ink'
            }`}
          >
            Findings
          </button>
        </div>
      </div>

      {/* 3. Shares List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-ink space-y-2">
            <div className="skeleton-box h-4 w-48 mx-auto" />
            <div className="skeleton-box h-3 w-32 mx-auto" />
          </div>
        ) : filteredShares.length === 0 ? (
          <div className="p-12 bg-surface rounded border border-line text-center space-y-2">
            <Share2 className="w-8 h-8 text-muted-ink mx-auto stroke-1" />
            <div className="text-sm font-semibold text-ink">No shared items</div>
            <p className="text-xs text-muted-ink max-w-sm mx-auto">
              When peers share research findings or workflow playbooks with your email address, they will appear here.
            </p>
          </div>
        ) : (
          filteredShares.map((s) => (
            <div
              key={s.id}
              className="p-5 bg-surface rounded border border-line hover:border-deep-teal/40 transition-colors space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {s.resourceType === 'workflow' ? (
                    <Bookmark className="w-4 h-4 text-deep-teal shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-deep-teal shrink-0" />
                  )}
                  <span className="text-base font-semibold text-ink">
                    {s.resourceTitle || `Shared ${s.resourceType}`}
                  </span>
                  <span className="text-xs font-mono-tech px-2 py-0.5 rounded bg-subtle-surface border border-line text-muted-ink uppercase">
                    {s.resourceType}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {s.resourceType === 'workflow' && (
                    <button
                      type="button"
                      onClick={() => handleDuplicate(s.resourceId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-deep-teal-subtle text-deep-teal border border-deep-teal/30 hover:bg-deep-teal hover:text-surface transition-colors min-target"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicate to my workspace</span>
                    </button>
                  )}

                  <Link
                    to={
                      s.resourceType === 'workflow'
                        ? `/app/workflows/${s.resourceId}`
                        : `/app/runs/shared/results/${s.resourceId}`
                    }
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border border-line bg-surface hover:bg-subtle-surface text-ink min-target"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-ink" />
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-ink pt-1 border-t border-line">
                <div>
                  Recipient: <span className="text-ink font-mono-tech">{s.recipientEmail}</span>
                </div>
                <div>
                  Access: <span className="text-ink capitalize">{s.access}</span>
                </div>
                <div className="ml-auto font-mono-tech">
                  Shared {new Date(s.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
