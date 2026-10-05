import React, { useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRunCoverage, useRun } from '../services/api/queries';
import { useApiClient } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { LimitMeter } from '../components/common/LimitMeter';
import { O03ExportResultsModal } from '../components/overlays/O03ExportResultsModal';
import { AccessibleTabs } from '../components/common/AccessibleTabs';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import {
  ArrowLeft,
  Download,
  Globe,
  ExternalLink,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export const P10CoverageSiteGraph: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const api = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: coverage, isLoading: loadingCoverage, error: coverageError } = useRunCoverage(runId!);
  const { data: run, isLoading: loadingRun } = useRun(runId!);

  const loading = loadingCoverage || loadingRun;
  const outcomeFilter = searchParams.get('outcome') || 'all';
  const domainFilter = searchParams.get('domain') || '';
  const activeTab = (searchParams.get('tab') as 'ledger' | 'graph') || 'ledger';
  const [showExportModal, setShowExportModal] = useState(false);

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && value !== 'all') {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handleRunTabChange = (tabId: string) => {
    if (tabId === 'activity') navigate(`/app/runs/${runId}`);
    else if (tabId === 'results') navigate(`/app/runs/${runId}/results`);
    else if (tabId === 'coverage') navigate(`/app/runs/${runId}/coverage`);
  };

  if (loading || !coverage || !run) {
    return (
      <div className="space-y-6">
        <div className="h-16 skeleton-box border border-line" />
        <div className="h-40 skeleton-box border border-line" />
        <div className="h-64 skeleton-box border border-line" />
      </div>
    );
  }

  const counts = coverage.counts || {};
  const discoveredCount = counts.discovered ?? (coverage.urls?.length ?? 0);
  const fetchedCount = counts.fetched ?? 0;
  const skippedCount = counts.skipped ?? 0;
  const blockedCount = counts.blocked ?? 0;
  const failedCount = counts.failed ?? 0;

  const filteredUrls = coverage.urls.filter((u) => {
    if (outcomeFilter !== 'all' && u.outcome !== outcomeFilter) return false;
    if (domainFilter && !u.url.includes(domainFilter)) return false;
    return true;
  });

  const runTabs = [
    { id: 'activity', label: 'Activity' },
    { id: 'results', label: 'Results', count: run.findingCounts?.relevant ?? 0 },
    { id: 'coverage', label: 'Coverage' },
  ];

  const subTabs = [
    { id: 'ledger', label: 'URL ledger (Accessible table)' },
    { id: 'graph', label: 'Site graph topology' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Run Header & Tabs */}
      <div className="p-5 bg-surface rounded border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-3">
            <Link
              to={`/app/runs/${runId}`}
              className="p-1.5 rounded text-muted-ink hover:text-ink hover:bg-canvas border border-transparent hover:border-line min-target flex items-center justify-center"
              aria-label="Back to run activity"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status={run.status} size="sm" />
                <span className="font-mono-tech text-xs text-muted-ink">{run.id}</span>
              </div>
            </div>
          </div>

          <AccessibleTabs
            tabs={runTabs}
            activeTab="coverage"
            onChange={handleRunTabChange}
            ariaLabel="Run navigation tabs"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink m-0 leading-tight">
              Crawl Coverage & Site Topology
            </h1>
            <p className="text-sm text-muted-ink mt-0.5">
              Audited URL outcomes across the discovered frontier. Daleel guarantees accounting of discovered pages, never infinite web coverage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="px-3.5 py-2 rounded text-sm font-medium border border-line bg-surface hover:bg-subtle-surface text-ink flex items-center gap-1.5 min-target"
            >
              <Download className="w-4 h-4 text-muted-ink" />
              <span>Export coverage</span>
            </button>
          </div>
        </div>

        {/* 2. Coverage Statement Banner */}
        <div className="p-4 bg-canvas rounded border border-line space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CheckCircle2 className="w-4 h-4 text-deep-teal" />
            <span>Coverage Statement: {run.status === 'complete' ? 'Traversal finished within allocated limits' : 'Frontier and domain coverage traversal'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-ink">
            <div>Discovered frontier: <strong className="text-ink">{discoveredCount} URLs</strong></div>
            <div>Fetched: <strong className="text-ink">{fetchedCount}</strong></div>
            <div>Skipped: <strong className="text-ink">{skippedCount}</strong></div>
            <div>Blocked / Barriers: <strong className="text-ink">{blockedCount}</strong></div>
            <div>Failed: <strong className="text-ink">{failedCount}</strong></div>
          </div>
        </div>
      </div>

      {coverageError && (
        <ApiErrorBanner
          message={(coverageError as any)?.detail || 'Failed to load crawl coverage.'}
          traceId={(coverageError as any)?.traceId}
        />
      )}

      {/* 3. Resource Meter */}
      <LimitMeter usage={run.usage} limits={run.limits} />

      {/* 4. Sub-Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <AccessibleTabs
          tabs={subTabs}
          activeTab={activeTab}
          onChange={(tab) => updateParam('tab', tab)}
          ariaLabel="Coverage view tabs"
        />

        {domainFilter && (
          <div className="flex items-center gap-2 text-xs bg-subtle-surface px-3 py-1.5 rounded border border-line">
            <span className="text-muted-ink">Filtered by domain:</span>
            <span className="font-mono-tech font-semibold text-ink">{domainFilter}</span>
            <button
              type="button"
              onClick={() => updateParam('domain', '')}
              className="text-muted-ink hover:text-ink font-bold ml-1"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* 5. View Content */}
      {activeTab === 'ledger' ? (
        /* URL Ledger View */
        <div className="space-y-4">
          <div className="p-4 bg-surface rounded border border-line flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-ink">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter outcome:</span>
              <select
                value={outcomeFilter}
                onChange={(e) => updateParam('outcome', e.target.value)}
                className="p-1.5 text-xs border border-line rounded bg-surface text-ink"
              >
                <option value="all">All outcomes ({coverage.urls.length})</option>
                <option value="fetched">Fetched</option>
                <option value="skipped">Skipped</option>
                <option value="blocked">Blocked</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="text-xs text-muted-ink">
              Showing {filteredUrls.length} of {coverage.urls.length} tracked URLs
            </div>
          </div>

          <div className="bg-surface rounded border border-line overflow-hidden">
            {/* Desktop Table (14px text-sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-subtle-surface text-muted-ink text-xs uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Target URL</th>
                    <th className="py-2.5 px-3 font-medium">Outcome</th>
                    <th className="py-2.5 px-3 font-medium">Depth</th>
                    <th className="py-2.5 px-3 font-medium">Reason / Note</th>
                    <th className="py-2.5 px-3 font-medium text-right">Fetch Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredUrls.map((u, i) => (
                    <tr key={i} className="hover:bg-subtle-surface/60 transition-colors">
                      <td className="py-3 px-3">
                        <a
                          href={u.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono-tech text-xs text-deep-teal hover:underline flex items-center gap-1.5 truncate max-w-md"
                          title={u.url}
                        >
                          <span className="truncate">{u.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={u.outcome as any} size="sm" />
                      </td>
                      <td className="py-3 px-3 font-mono-tech text-xs text-muted-ink">
                        L{u.depth}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-ink max-w-xs">
                        {u.reason || 'Successfully processed with verified evidence.'}
                      </td>
                      <td className="py-3 px-3 font-mono-tech text-xs text-muted-ink text-right">
                        {u.httpStatus ? `HTTP ${u.httpStatus} (${u.attempts} att)` : `${u.attempts} attempts`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="block sm:hidden divide-y divide-line">
              {filteredUrls.map((u, i) => (
                <div key={i} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono-tech text-xs text-ink truncate max-w-[200px]">{u.url}</span>
                    <StatusBadge status={u.outcome as any} size="sm" />
                  </div>
                  <div className="text-xs text-muted-ink">
                    Reason: {u.reason || 'Processed'} (Depth L{u.depth})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Site Graph Visualization with Node Interaction */
        <div className="p-6 bg-surface rounded border border-line space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h3 className="text-sm font-semibold text-ink">Observed Crawl Frontier Topology</h3>
              <p className="text-xs text-muted-ink">
                Click any domain node to filter the URL ledger by that domain.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-ink">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-deep-teal" />
              <span>Target Domain</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-line ml-2" />
              <span>Observed Frontier</span>
            </div>
          </div>

          <div className="p-4 bg-canvas rounded border border-line flex flex-wrap gap-4 justify-center py-10">
            {((coverage.graph?.nodes || []).filter((n) => n.type === 'domain' || n.type === 'seed').length === 0) ? (
              <div className="text-xs text-muted-ink">No distinct domain topology nodes recorded.</div>
            ) : (
              (coverage.graph?.nodes || []).filter((n) => n.type === 'domain' || n.type === 'seed').map((d, i) => {
                const isSelected = domainFilter === d.label;
                return (
                  <button
                    key={d.id || i}
                    type="button"
                    onClick={() => {
                      updateParam('domain', isSelected ? '' : d.label);
                      updateParam('tab', 'ledger');
                    }}
                    className={`p-4 rounded border text-left transition-all min-w-[200px] cursor-pointer ${
                      isSelected
                        ? 'bg-deep-teal-subtle border-deep-teal shadow-xs'
                        : 'bg-surface border-line hover:border-deep-teal/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-deep-teal" />
                      <span className="font-semibold text-sm text-ink">{d.label}</span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-ink font-mono-tech">
                      <div>Type: <strong className="text-ink capitalize">{d.type}</strong></div>
                      <div>Depth: <strong className="text-ink">L{d.depth}</strong></div>
                      <div>Status: <strong className="text-ink capitalize">{d.status}</strong></div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-line text-[11px] text-deep-teal font-medium flex items-center gap-1">
                      <span>Inspect domain in ledger</span> →
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <O03ExportResultsModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          totalCount={coverage.urls.length}
          filteredCount={filteredUrls.length}
          onExport={async (req) => {
            await api.createRunExport(runId!, req);
          }}
        />
      )}
    </div>
  );
};
