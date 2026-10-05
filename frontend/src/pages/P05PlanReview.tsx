import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApi } from '../services/api';
import { useToast } from '../components/common/Toast';
import type { Plan, PlanField, Limits } from '../types/api';
import { LimitMeter } from '../components/common/LimitMeter';
import { O01HostedSignInModal } from '../components/overlays/O01HostedSignInModal';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  Shield,
  Layers,
  Sparkles,
  KeyRound,
  ExternalLink,
  Sliders,
  Database,
  Trash2,
  Plus,
} from 'lucide-react';

export const P05PlanReview: React.FC = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const api = useApi();
  const { showToast } = useToast();

  // The URL carries the run ID so a refresh or shared link loads the same plan.
  const runId = draftId;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [targetDomain, setTargetDomain] = useState('boards.greenhouse.io');
  const [saveWorkflowName, setSaveWorkflowName] = useState('');
  const [showSaveWorkflow, setShowSaveWorkflow] = useState(false);

  useEffect(() => {
    async function loadPlan() {
      setLoading(true);
      setLoadError(null);
      try {
        if (!runId) throw new Error('Missing run ID');
        const p = await api.getRunPlan(runId);
        setPlan(p);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load plan.');
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, [runId, api]);

  const handleApproveAndRun = async () => {
    if (!plan) return;
    setIsApproving(true);
    try {
      if (!runId) throw new Error('Missing run ID');
      const run = await api.approveRun(runId);
      showToast('Plan approved. Execution started.', 'success');
      navigate(`/app/runs/${run.id}`);
    } catch (err: any) {
      showToast(err?.detail || 'Approval failed', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!runId || !saveWorkflowName.trim()) return;
    try {
      const wf = await api.saveWorkflow({
        runId,
        name: saveWorkflowName.trim(),
      });
      showToast(`Workflow "${wf.name}" saved successfully.`, 'success');
      setShowSaveWorkflow(false);
    } catch (err: any) {
      showToast(err?.detail || 'Failed to save workflow', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 skeleton-box border border-line" />
        <div className="h-64 skeleton-box border border-line" />
      </div>
    );
  }

  if (!plan) {
    return <ApiErrorBanner message={loadError || 'Plan unavailable.'} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Plan Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-surface rounded border border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded border border-line bg-subtle-surface text-ink font-mono-tech">
              Draft Plan
            </span>
            <span className="text-xs px-2 py-0.5 rounded border border-line bg-canvas text-muted-ink">
              Unsaved
            </span>
            <span className="text-xs text-muted-ink">
              Generated {new Date(plan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="page-title mt-1">
            Generated research plan
          </h1>
          <p className="text-sm text-muted-ink">
            Approval mode: execution begins only after you verify sources, criteria, and schema.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/app/new"
            className="px-3 py-1.5 rounded border border-line bg-surface text-xs font-medium text-ink hover:bg-subtle-surface flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Edit query</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowSaveWorkflow(!showSaveWorkflow)}
            className="px-3 py-1.5 rounded border border-line bg-surface text-xs font-medium text-ink hover:bg-subtle-surface flex items-center gap-1"
          >
            <Bookmark className="w-3.5 h-3.5 text-deep-teal" />
            <span>Save workflow</span>
          </button>
        </div>
      </div>

      {showSaveWorkflow && (
        <div className="p-4 bg-surface rounded border border-line flex items-center gap-3 animate-in fade-in">
          <div className="flex-1">
            <input
              type="text"
              value={saveWorkflowName}
              onChange={(e) => setSaveWorkflowName(e.target.value)}
              placeholder="Enter memorable workflow name (e.g. AI Opportunity Scanner)"
              className="w-full px-3 py-2 text-xs border border-line rounded bg-canvas text-ink focus:border-deep-teal"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveWorkflow}
            className="px-4 py-2 text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover rounded shrink-0"
          >
            Confirm save
          </button>
        </div>
      )}

      {/* Query Banner */}
      <div className="p-4 bg-surface rounded border border-line space-y-1">
        <span className="text-[11px] font-semibold text-muted-ink uppercase">Original research query</span>
        <div className="text-sm font-medium text-ink">{plan.query}</div>
      </div>

      {/* 2. Interpretation: Requested vs Inferred Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-surface rounded border border-line space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <FileText className="w-3.5 h-3.5 text-deep-teal" />
            <span>Requested criteria</span>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-ink">
            {plan.requestedCriteria?.map((req, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-deep-teal">•</span>
                <span className="text-ink">{req}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 bg-surface rounded border border-line space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <Sparkles className="w-3.5 h-3.5 text-deep-teal" />
            <span>Inferred strategy & ranking rules</span>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-ink">
            {plan.inferredCriteria?.map((inf, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-deep-teal">•</span>
                <span>{inf}</span>
              </li>
            ))}
            <li className="flex items-start gap-1.5 text-[11px] text-muted-ink italic pt-1">
              <span>* Relevance ranking uses Balanced sensitivity. Candidate listings will be enriched from individual detail pages.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 3. Source Strategy & Candidate Domains */}
      <div className="p-5 bg-surface rounded border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-deep-teal" />
            <h3 className="text-sm font-semibold text-ink m-0">Source strategy & candidate domains</h3>
          </div>
          <span className="text-xs text-muted-ink">Standard 20-domain ceiling enforced</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {plan.candidateDomains?.map((dom, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded bg-subtle-surface border border-line text-xs font-mono-tech text-ink flex items-center gap-1.5"
            >
              <span>{dom}</span>
              <span className="text-muted-ink text-[10px]">Candidate</span>
            </span>
          ))}
        </div>

        <p className="text-xs text-muted-ink leading-relaxed">
          The crawl crawler respects robots.txt and host rate limits. Candidate sites are starting boundaries; Autonomous link traversal stays within the domain limit.
        </p>
      </div>

      {/* 4. Output Schema Fields */}
      <div className="p-5 bg-surface rounded border border-line space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-deep-teal" />
            <h3 className="text-sm font-semibold text-ink m-0">Output schema & field evidence rules</h3>
          </div>
          <span className="text-xs text-muted-ink">{plan.fields.length} fields planned</span>
        </div>

        <div className="overflow-x-auto border border-line rounded">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas border-b border-line text-muted-ink uppercase text-xs">
              <tr>
                <th className="p-2.5">Field key</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Requirement</th>
                <th className="p-2.5">Evidence rule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {plan.fields.map((f) => (
                <tr key={f.key} className="hover:bg-subtle-surface">
                  <td className="p-2.5 font-medium text-ink font-mono-tech">{f.label} ({f.key})</td>
                  <td className="p-2.5 text-muted-ink font-mono-tech">{f.type}</td>
                  <td className="p-2.5">
                    {f.required ? (
                      <span className="text-ink font-medium">Required</span>
                    ) : (
                      <span className="text-muted-ink">Optional</span>
                    )}
                  </td>
                  <td className="p-2.5 text-muted-ink leading-snug">{f.evidenceRule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-subtle-surface rounded border border-line text-xs text-muted-ink leading-relaxed">
          Grounding rule: Every factual value surfaced in the results will cite a verbatim source URL and excerpt. Unsupported fields remain explicitly marked as Unknown.
        </div>
      </div>

      {/* 5. Limits & Cost Estimate */}
      <LimitMeter limits={plan.limits} aiCapUsd={plan.aiEstimateUsd || 0.25} />

      {/* 6. Session and Policy Check */}
      <div className="p-4 bg-surface rounded border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <KeyRound className="w-4 h-4 text-deep-teal shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-ink">Authorized browser session</div>
            <div className="text-muted-ink mt-0.5">
              Public crawl mode active. If target sites enforce login, attach an authorized session.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowConnectModal(true)}
          className="px-3 py-1.5 rounded border border-line bg-surface text-ink hover:bg-subtle-surface font-medium shrink-0"
        >
          Connect site
        </button>
      </div>

      {/* 7. Footer CTA Action */}
      <div className="flex items-center justify-between p-5 bg-surface rounded border border-line">
        <Link
          to="/app/new"
          className="px-4 py-2 text-xs font-medium text-muted-ink hover:text-ink"
        >
          Discard draft
        </Link>

        <button
          type="button"
          onClick={handleApproveAndRun}
          disabled={isApproving}
          className="px-6 py-2.5 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover flex items-center gap-2 min-target shadow-xs"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isApproving ? 'Authorizing run...' : 'Approve and run'}</span>
        </button>
      </div>

      {/* O01 Hosted Sign-In Modal */}
      <O01HostedSignInModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        domain={targetDomain}
        onFinishConnection={async () => {
          showToast(`Connected session for ${targetDomain}`, 'success');
        }}
      />
    </div>
  );
};
