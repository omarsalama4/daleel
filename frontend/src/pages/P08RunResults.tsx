import React, { useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRunFindings, useRun } from '../services/api/queries';
import { useApiClient } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { O03ExportResultsModal } from '../components/overlays/O03ExportResultsModal';
import { AccessibleTabs } from '../components/common/AccessibleTabs';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import {
  ArrowLeft,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const P08RunResults: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const api = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: findingsPage, isLoading: loadingFindings, error: findingsError } = useRunFindings(runId!);
  const { data: run, isLoading: loadingRun } = useRun(runId!);

  const findings = findingsPage?.items || [];
  const fields = findingsPage?.fieldDefinitions || [];
  const summaryFields = fields.filter(f => !['title', 'description'].includes(f.key)).slice(0, 2);
  const columnA = summaryFields[0] || fields.find(f => f.key === 'description');
  const columnB = summaryFields[1];
  const runStatus = run?.status || findingsPage?.runStatus || 'planning';
  const queryText = run?.query || '';
  const loading = loadingFindings || loadingRun;

  // URL-synchronized filters per UI spec
  const searchTerm = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';
  const relevanceFilter = searchParams.get('relevance') || '';
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFindings = findings.filter((f) => {
    if (statusFilter && f.status !== statusFilter) return false;
    if (relevanceFilter && f.relevance.label !== relevanceFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!Object.values(f.values).some(v => v.value.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const incompleteFindings = findings.filter((f) => f.status === 'incomplete');

  const runTabs = [
    { id: 'activity', label: 'Activity' },
    { id: 'results', label: 'Results', count: findings.length },
    { id: 'coverage', label: 'Coverage' },
  ];

  const handleTabChange = (tabId: string) => {
    if (tabId === 'activity') navigate(`/app/runs/${runId}`);
    else if (tabId === 'results') navigate(`/app/runs/${runId}/results`);
    else if (tabId === 'coverage') navigate(`/app/runs/${runId}/coverage`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Run Summary Banner */}
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
                <StatusBadge status={runStatus} size="sm" />
                <span className="font-mono-tech text-xs text-muted-ink">{runId}</span>
              </div>
            </div>
          </div>

          <AccessibleTabs
            tabs={runTabs}
            activeTab="results"
            onChange={handleTabChange}
            ariaLabel="Run navigation tabs"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink m-0 leading-tight">
              {queryText || 'Research Results'}
            </h1>
            <p className="text-sm text-muted-ink mt-0.5">
              Complete across discovered in-scope pages. Grounded in field-level source citations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="px-3.5 py-2 rounded text-sm font-medium border border-line bg-surface hover:bg-subtle-surface text-ink flex items-center gap-1.5 min-target"
            >
              <Download className="w-4 h-4 text-muted-ink" />
              <span>Export results</span>
            </button>
          </div>
        </div>

        {/* Counts Bar */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-ink border-t border-line">
          <div>Total findings: <strong className="text-ink">{findings.length}</strong></div>
          <div>Relevant: <strong className="text-ink">{findings.filter(f => f.relevance.label === 'strong' || f.relevance.label === 'possible').length}</strong></div>
          <div>Incomplete detail: <strong className="text-ink">{incompleteFindings.length}</strong></div>
          <div className="ml-auto font-mono-tech text-[11px]">
            Scope: Standard beta limits enforced
          </div>
        </div>
      </div>

      {findingsError && (
        <ApiErrorBanner
          message={(findingsError as any)?.detail || 'Failed to load research results.'}
          traceId={(findingsError as any)?.traceId}
        />
      )}

      {/* 2. Incomplete-Results Attention Panel if any */}
      {incompleteFindings.length > 0 && (
        <div className="p-4 bg-surface rounded border border-line space-y-2">
          <div className="flex items-center gap-2 text-ink text-sm font-semibold">
            <AlertCircle className="w-4 h-4 text-muted-ink" />
            <span>Incomplete detail extractions ({incompleteFindings.length})</span>
          </div>
          <p className="text-xs text-muted-ink">
            These candidates matched your criteria, but their detail pages could not be enriched (e.g. rate limit, access gate, or timeout).
          </p>
          <div className="divide-y divide-line rounded border border-line bg-canvas">
            {incompleteFindings.slice(0, 3).map((f) => (
              <div key={f.id} className="p-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-ink">{f.values.title?.value || 'Untitled Finding'}</span>
                  <span className="text-muted-ink ml-2">({f.values.employer?.value || 'Unknown source'})</span>
                </div>
                <Link
                  to={`/app/runs/${runId}/results/${f.id}`}
                  className="text-deep-teal hover:underline flex items-center gap-1 text-[11px]"
                >
                  Inspect finding <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Filter & Search Controls */}
      <div className="p-4 bg-surface rounded border border-line space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted-ink absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => updateParam('q', e.target.value)}
              placeholder="Search in all extracted fields..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-line rounded bg-surface text-ink placeholder:text-muted-ink/60"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 text-xs text-muted-ink shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => updateParam('status', e.target.value)}
              className="p-1.5 text-xs border border-line rounded bg-surface text-ink flex-1 sm:flex-initial"
            >
              <option value="">All statuses</option>
              <option value="complete">Complete</option>
              <option value="incomplete">Incomplete</option>
              <option value="duplicate">Duplicate</option>
            </select>

            <select
              value={relevanceFilter}
              onChange={(e) => updateParam('relevance', e.target.value)}
              className="p-1.5 text-xs border border-line rounded bg-surface text-ink flex-1 sm:flex-initial"
            >
              <option value="">All relevance</option>
              <option value="high">High fit</option>
              <option value="medium">Medium fit</option>
              <option value="low">Low fit</option>
            </select>
          </div>
        </div>

        {(searchTerm || statusFilter || relevanceFilter) && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-line text-muted-ink">
            <span>Filtering {filteredFindings.length} of {findings.length} findings</span>
            <button
              type="button"
              onClick={() => {
                setSearchParams(new URLSearchParams());
              }}
              className="text-deep-teal hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* 4. Results Table (Desktop: table text-sm >= 14px; Mobile: stacked cards) */}
      <div className="bg-surface rounded border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-ink space-y-2">
            <div className="skeleton-box h-4 w-48 mx-auto" />
            <div className="skeleton-box h-3 w-32 mx-auto" />
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-ink space-y-2">
            <p className="font-medium text-ink">No findings match current criteria.</p>
            <p className="text-xs">Adjust your search term or filter parameters above.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (14px minimum font size per DESIGN.md) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-subtle-surface text-muted-ink text-xs uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="py-2.5 px-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredFindings.length && filteredFindings.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(filteredFindings.map((f) => f.id));
                          else setSelectedIds([]);
                        }}
                        className="rounded text-deep-teal focus:ring-deep-teal"
                        aria-label="Select all findings"
                      />
                    </th>
                    <th className="py-2.5 px-3 font-medium">Finding / Title</th>
                    <th className="py-2.5 px-3 font-medium">{columnA?.label || 'Details'}</th>
                    <th className="py-2.5 px-3 font-medium">{columnB?.label || 'Additional field'}</th>
                    <th className="py-2.5 px-3 font-medium">Relevance</th>
                    <th className="py-2.5 px-3 font-medium">Evidence</th>
                    <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredFindings.map((f) => {
                    const isSelected = selectedIds.includes(f.id);
                    return (
                      <tr
                        key={f.id}
                        className={`hover:bg-subtle-surface/60 transition-colors ${
                          isSelected ? 'bg-deep-teal-subtle/30' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(f.id)}
                            className="rounded text-deep-teal focus:ring-deep-teal"
                            aria-label={`Select finding ${f.values.title?.value || f.id}`}
                          />
                        </td>
                        <td className="py-3 px-3 font-medium text-ink">
                          <Link
                            to={`/app/runs/${runId}/results/${f.id}`}
                            className="hover:text-deep-teal hover:underline flex items-center gap-1.5"
                          >
                            <span>{f.values.title?.value || 'Untitled Finding'}</span>
                            {f.status === 'incomplete' && (
                              <span className="text-[11px] font-normal px-1.5 py-0.5 rounded bg-subtle-surface border border-line text-muted-ink">
                                Incomplete
                              </span>
                            )}
                          </Link>
                          {f.duplicateGroupId && (
                            <div className="text-[11px] text-muted-ink mt-0.5 font-normal font-mono-tech">
                              Group: {f.duplicateGroupId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-muted-ink">
                          {(columnA ? f.values[columnA.key]?.value : '') || <span className="italic text-muted-ink/60">Unknown</span>}
                        </td>
                        <td className="py-3 px-3 text-muted-ink">
                          {(columnB ? f.values[columnB.key]?.value : '') || <span className="italic text-muted-ink/60">Unknown</span>}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="capitalize font-medium text-ink">{f.relevance.label}</span>
                          </div>
                          <div className="text-[11px] text-muted-ink truncate max-w-[160px]" title={f.relevance.reason}>
                            {f.relevance.reason}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-deep-teal shrink-0" />
                            <span className="text-ink font-mono-tech">{f.evidenceCount} citations</span>
                          </div>
                          <a
                            href={f.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono-tech text-muted-ink hover:text-deep-teal truncate block max-w-[140px]"
                            title={f.sourceUrl}
                          >
                            {f.sourceUrl.replace(/^https?:\/\//, '')}
                          </a>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to={`/app/runs/${runId}/results/${f.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-surface hover:bg-canvas text-ink border border-line"
                          >
                            Inspect <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View (< 768px per DESIGN.md §5) */}
            <div className="block sm:hidden divide-y divide-line">
              {filteredFindings.map((f) => (
                <div key={f.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/app/runs/${runId}/results/${f.id}`}
                      className="text-sm font-semibold text-ink hover:text-deep-teal hover:underline leading-snug"
                    >
                      {f.values.title?.value || 'Untitled Finding'}
                    </Link>
                    <StatusBadge status={f.status} size="sm" />
                  </div>

                  <div className="text-xs text-muted-ink space-y-1">
                    <div>{columnA?.label || 'Details'}: <span className="text-ink font-medium">{columnA ? f.values[columnA.key]?.value || 'Unknown' : 'Unknown'}</span></div>
                    {columnB && <div>{columnB.label}: <span className="text-ink font-medium">{f.values[columnB.key]?.value || 'Unknown'}</span></div>}
                    <div>Relevance: <span className="text-ink font-medium capitalize">{f.relevance.label}</span></div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
                    <span className="font-mono-tech text-muted-ink">{f.evidenceCount} citations</span>
                    <Link
                      to={`/app/runs/${runId}/results/${f.id}`}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-surface text-ink border border-line inline-flex items-center gap-1"
                    >
                      Inspect <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <O03ExportResultsModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          totalCount={findings.length}
          filteredCount={filteredFindings.length}
          selectedCount={selectedIds.length}
          onExport={async (req) => {
            const job = await api.createRunExport(runId!, {
              ...req,
              findingIds: req.scope === 'selected' ? selectedIds : req.scope === 'filtered' ? filteredFindings.map(f => f.id) : undefined,
            });
            if (!job.downloadUrl) throw new Error('Export download is not available yet');
            return import.meta.env.VITE_API_BASE_URL ? new URL(job.downloadUrl, new URL(import.meta.env.VITE_API_BASE_URL, window.location.origin)).toString() : job.downloadUrl;
          }}
        />
      )}
    </div>
  );
};
