import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFinding } from '../services/api/queries';
import { useApiClient } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { EvidenceViewer } from '../components/common/EvidenceViewer';
import { O02ShareItemModal } from '../components/overlays/O02ShareItemModal';
import { O04FeedbackDrawer } from '../components/overlays/O04FeedbackDrawer';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Share2,
  MessageSquare,
  Clock,
  Layers,
} from 'lucide-react';

export const P09FindingDetail: React.FC = () => {
  const { runId, findingId } = useParams<{ runId: string; findingId: string }>();
  const api = useApiClient();

  const { data: finding, isLoading: loading, error, refetch } = useFinding(runId!, findingId!);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>('title');

  // Overlays
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFeedbackDrawer, setShowFeedbackDrawer] = useState(false);

  if (loading || !finding) {
    return (
      <div className="space-y-6">
        <div className="h-20 skeleton-box border border-line" />
        <div className="h-64 skeleton-box border border-line" />
      </div>
    );
  }

  const title = finding.values.title?.value || 'Untitled Finding';
  const selectedField = finding.values[selectedFieldKey] || Object.values(finding.values)[0];

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="p-5 bg-surface rounded border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line text-xs">
          <Link
            to={`/app/runs/${runId}/results`}
            className="flex items-center gap-1.5 text-muted-ink hover:text-ink font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to run results</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFeedbackDrawer(true)}
              className="px-3.5 py-2 rounded border border-line bg-surface hover:bg-subtle-surface text-ink flex items-center gap-1.5 text-xs font-medium min-target"
            >
              <MessageSquare className="w-3.5 h-3.5 text-muted-ink" />
              <span>Provide feedback</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-3.5 py-2 rounded bg-deep-teal hover:bg-deep-teal-hover text-surface flex items-center gap-1.5 text-xs font-medium min-target"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share finding</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={finding.status} size="sm" />
            <span className="text-xs px-2 py-0.5 rounded border border-line bg-subtle-surface text-ink font-mono-tech">
              Relevance: {finding.relevance.label}
            </span>
            <span className="text-muted-ink text-xs">•</span>
            <span className="text-xs text-muted-ink flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Fetched {new Date(finding.fetchedAt).toLocaleString()}
            </span>
          </div>

          <h1 className="page-title mt-1" dir="auto">
            {title}
          </h1>

          <div className="flex items-center gap-3 text-xs text-muted-ink flex-wrap">
            <a
              href={finding.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-deep-teal hover:underline flex items-center gap-1 font-mono-tech"
            >
              <span>Source: {finding.sourceUrl}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {finding.detailUrl && (
              <a
                href={finding.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-deep-teal hover:underline flex items-center gap-1 font-mono-tech"
              >
                <span>Detail URL</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {error && (
        <ApiErrorBanner
          message={(error as any)?.detail || 'Failed to load finding details.'}
          traceId={(error as any)?.traceId}
          onRetry={() => refetch()}
        />
      )}

      {/* 2. Side-by-Side: Fields Inspector & Evidence Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Structured Fields Table (14px text-sm) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 bg-surface rounded border border-line space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-deep-teal" />
                <h3 className="section-title">Structured Output Fields</h3>
              </div>
              <span className="text-xs text-muted-ink">
                Select a field to view grounding evidence
              </span>
            </div>

            <div className="divide-y divide-line text-sm">
              {Object.entries(finding.values).map(([key, val]) => {
                const isSelected = selectedFieldKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedFieldKey(key)}
                    className={`w-full text-left p-3 rounded transition-colors flex items-start justify-between gap-3 min-target ${
                      isSelected
                        ? 'bg-deep-teal-subtle/40 border border-deep-teal/30'
                        : 'hover:bg-subtle-surface/60 border border-transparent'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-xs uppercase tracking-wider text-muted-ink font-mono-tech">
                        {key}
                      </div>
                      <div className="text-sm font-medium text-ink leading-snug font-sans" dir="auto">
                        {val.value || <span className="italic text-muted-ink/60">Unknown</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <StatusBadge status={val.evidenceState as any} size="sm" />
                      <span className="text-xs font-mono-tech text-muted-ink">
                        ({val.evidenceIds?.length ?? 0})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Relevance Analysis Card */}
          <div className="p-5 bg-surface rounded border border-line space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-deep-teal" />
              <h3 className="section-title">Relevance & Match Assessment</h3>
            </div>
            <p className="text-sm text-ink leading-relaxed">
              {finding.relevance.reason}
            </p>
            <div className="text-xs text-muted-ink pt-1 border-t border-line">
              Relevance evaluation: <span className="font-semibold text-ink capitalize">{finding.relevance.label}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Evidence Viewer with Advanced details */}
        <div className="lg:col-span-6 space-y-4">
          <EvidenceViewer
            fieldKey={selectedFieldKey}
            fieldLabel={selectedFieldKey}
            fieldValue={selectedField?.value || ''}
            state={selectedField?.evidenceState || 'verified'}
            evidenceList={finding.evidence}
          />
        </div>
      </div>

      {/* Feedback Drawer (O04) */}
      {showFeedbackDrawer && (
        <O04FeedbackDrawer
          isOpen={showFeedbackDrawer}
          onClose={() => setShowFeedbackDrawer(false)}
          finding={finding}
          fieldKey={selectedFieldKey}
          onSubmitFeedback={async (feedback) => {
            await api.submitFindingFeedback(runId!, finding.id, feedback);
            refetch();
          }}
        />
      )}

      {/* Share Modal (O02) */}
      {showShareModal && (
        <O02ShareItemModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          resourceType="finding"
          resourceId={finding.id}
          resourceTitle={title}
          onShare={async (recipientEmail: string) => {
            await api.createShare({
              recipientUserId: recipientEmail,
              resourceType: 'finding',
              resourceId: finding.id,
            });
          }}
        />
      )}
    </div>
  );
};
