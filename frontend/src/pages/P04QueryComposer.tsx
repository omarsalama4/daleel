import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../services/api';
import type { RunMode, Limits, SiteSession } from '../types/api';
import {
  Compass,
  ChevronDown,
  ChevronUp,
  Sliders,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { UnsavedChangesModal } from '../components/common/UnsavedChangesModal';
import { ApiErrorBanner } from '../components/common/ApiErrorBanner';

const DEFAULT_LIMITS: Limits = {
  domains: 20,
  pages: 500,
  depth: 5,
  minutes: 20,
  retriesPerPage: 2,
  downloadMb: 100,
};

export const P04QueryComposer: React.FC = () => {
  const api = useApi();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<RunMode>('approval'); // Approval by default per confirmed PRD decision!
  const [relevance, setRelevance] = useState<'broad' | 'balanced' | 'strict'>('balanced');
  const [seedInput, setSeedInput] = useState('');
  const [seedUrls, setSeedUrls] = useState<string[]>([]);
  const [filterNotes, setFilterNotes] = useState('');
  const [showAdvancedLimits, setShowAdvancedLimits] = useState(false);
  const [limits, setLimits] = useState<Limits>({ ...DEFAULT_LIMITS });
  const [aiUsageCapUsd, setAiUsageCapUsd] = useState(0.25);
  const [sessions, setSessions] = useState<SiteSession[]>([]);
  const [selectedSessionDomain, setSelectedSessionDomain] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTraceId, setErrorTraceId] = useState<string | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Input refs for focus-first-invalid requirement
  const queryInputRef = useRef<HTMLTextAreaElement>(null);
  const domainsInputRef = useRef<HTMLInputElement>(null);
  const pagesInputRef = useRef<HTMLInputElement>(null);
  const depthInputRef = useRef<HTMLInputElement>(null);
  const minutesInputRef = useRef<HTMLInputElement>(null);
  const retriesInputRef = useRef<HTMLInputElement>(null);
  const downloadInputRef = useRef<HTMLInputElement>(null);
  const aiCapInputRef = useRef<HTMLInputElement>(null);

  // Unsaved changes guard
  const isDirty = query.trim().length > 0 || seedUrls.length > 0 || filterNotes.trim().length > 0;
  const { showPrompt, proceedWithNavigation, cancelNavigation } = useUnsavedChanges(isDirty);

  useEffect(() => {
    async function loadSessions() {
      try {
        const s = await api.listSessions();
        setSessions(s);
      } catch (err) {
        console.error('Failed to load sessions', err);
      }
    }
    loadSessions();
  }, [api]);

  const handleAddSeed = () => {
    const url = seedInput.trim();
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP/HTTPS URLs are allowed.');
      }
      if (!seedUrls.includes(url)) {
        setSeedUrls([...seedUrls, url]);
      }
      setSeedInput('');
      setError(null);
    } catch {
      setError('Please enter a valid web address (http:// or https://).');
    }
  };

  const handleRemoveSeed = (index: number) => {
    setSeedUrls(seedUrls.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!query.trim()) {
      errors.query = 'Enter a research question to generate a plan.';
    }

    if (limits.domains < 1 || limits.domains > 20 || !Number.isInteger(limits.domains)) {
      errors.domains = 'Domains must be an integer between 1 and 20.';
    }

    if (limits.pages < 1 || limits.pages > 500 || !Number.isInteger(limits.pages)) {
      errors.pages = 'Pages must be an integer between 1 and 500.';
    }

    if (limits.depth < 0 || limits.depth > 5 || !Number.isInteger(limits.depth)) {
      errors.depth = 'Depth must be an integer between 0 and 5.';
    }

    if (limits.minutes < 1 || limits.minutes > 20 || !Number.isInteger(limits.minutes)) {
      errors.minutes = 'Time limit must be an integer between 1 and 20 minutes.';
    }

    if (limits.retriesPerPage < 0 || limits.retriesPerPage > 2 || !Number.isInteger(limits.retriesPerPage)) {
      errors.retriesPerPage = 'Retries must be an integer between 0 and 2.';
    }

    if (limits.downloadMb < 1 || limits.downloadMb > 100 || !Number.isInteger(limits.downloadMb)) {
      errors.downloadMb = 'Download limit must be an integer between 1 and 100 MB.';
    }

    if (!Number.isFinite(aiUsageCapUsd) || aiUsageCapUsd < 0 || aiUsageCapUsd > 0.25 || !Number.isInteger(aiUsageCapUsd * 100)) {
      errors.aiCap = 'AI cap must be between $0.00 and $0.25 (e.g. $0.15).';
    }

    setFieldErrors(errors);

    // Focus first invalid input per UI spec §7
    if (errors.query) {
      queryInputRef.current?.focus();
    } else if (errors.domains) {
      setShowAdvancedLimits(true);
      setTimeout(() => domainsInputRef.current?.focus(), 50);
    } else if (errors.pages) {
      setShowAdvancedLimits(true);
      setTimeout(() => pagesInputRef.current?.focus(), 50);
    } else if (errors.depth) {
      setShowAdvancedLimits(true);
      setTimeout(() => depthInputRef.current?.focus(), 50);
    } else if (errors.minutes) {
      setShowAdvancedLimits(true);
      setTimeout(() => minutesInputRef.current?.focus(), 50);
    } else if (errors.retriesPerPage) {
      setShowAdvancedLimits(true);
      setTimeout(() => retriesInputRef.current?.focus(), 50);
    } else if (errors.downloadMb) {
      setShowAdvancedLimits(true);
      setTimeout(() => downloadInputRef.current?.focus(), 50);
    } else if (errors.aiCap) {
      setShowAdvancedLimits(true);
      setTimeout(() => aiCapInputRef.current?.focus(), 50);
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorTraceId(undefined);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const newRun = await api.createRun({
        query: query.trim(),
        mode,
        relevance,
        seedUrls,
        limits,
        aiUsageCapUsd,
        selectedSessionDomain: selectedSessionDomain || undefined,
      });

      if (mode === 'approval') {
        navigate(`/app/plans/${newRun.id}`);
      } else {
        navigate(`/app/runs/${newRun.id}`);
      }
    } catch (err: any) {
      setError(err?.detail || err?.message || 'Failed to submit query. Please check limits and try again.');
      setErrorTraceId(err?.traceId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-envelope mx-auto space-y-6">
      <UnsavedChangesModal
        isOpen={showPrompt}
        onStay={cancelNavigation}
        onLeave={proceedWithNavigation}
      />

      {/* Page Title & Intro */}
      <div>
        <h1 className="page-title">New research</h1>
        <p className="text-sm text-muted-ink mt-1">
          Turn an arbitrary research question into a bounded crawl and an evidence-backed result set.
        </p>
      </div>

      {/* Error Summary if form validation fails */}
      {Object.keys(fieldErrors).length > 0 && (
        <div className="p-4 bg-surface rounded border border-danger-line space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-ink font-semibold">
            <AlertCircle className="w-4 h-4 text-muted-ink" />
            <span>Please correct the following before continuing:</span>
          </div>
          <ul className="list-disc list-inside text-xs text-muted-ink space-y-0.5 pl-1">
            {Object.values(fieldErrors).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <ApiErrorBanner
          message={error}
          traceId={errorTraceId}
          onRetry={() => handleSubmit({ preventDefault: () => {} } as any)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Research Question */}
        <div className="p-5 bg-surface rounded border border-line space-y-3">
          <label htmlFor="research-query" className="block text-sm font-semibold text-ink">
            Research question or objective <span className="text-muted-ink font-normal">*</span>
          </label>
          <textarea
            id="research-query"
            ref={queryInputRef}
            rows={3}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (fieldErrors.query) {
                setFieldErrors((prev) => ({ ...prev, query: '' }));
              }
            }}
            placeholder="e.g., Find AI Engineer opportunities in London or remote EU with salaries and interview stages..."
            className="w-full p-3 text-sm border border-line rounded bg-surface text-ink placeholder:text-muted-ink/60 focus:border-deep-teal focus:ring-1 focus:ring-deep-teal leading-relaxed font-sans min-h-[90px]"
          />
          <div className="flex items-center justify-between text-xs text-muted-ink">
            <span>Any natural-language question. Multilingual sources (English, Arabic, etc.) supported.</span>
            <span>Required</span>
          </div>
        </div>

        {/* 2. Run Mode Selection */}
        <div className="p-5 bg-surface rounded border border-line space-y-3">
          <div>
            <label className="block text-sm font-semibold text-ink">Execution mode</label>
            <p className="text-xs text-muted-ink mt-0.5">
              Choose the level of human supervision before network discovery proceeds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Approval Mode (Confirmed Default!) */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded border cursor-pointer transition-colors ${
                mode === 'approval'
                  ? 'bg-deep-teal-subtle/50 border-deep-teal'
                  : 'bg-surface border-line hover:border-muted-ink/40'
              }`}
            >
              <input
                type="radio"
                name="run-mode"
                value="approval"
                checked={mode === 'approval'}
                onChange={() => setMode('approval')}
                className="mt-1 text-deep-teal focus:ring-deep-teal"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-ink">Approval mode</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-surface border border-line font-medium text-muted-ink">
                    Default
                  </span>
                </div>
                <p className="text-xs text-muted-ink leading-relaxed">
                  Generates an interpreted plan with candidate domains and output schema for your review before execution.
                </p>
              </div>
            </label>

            {/* Autonomous Mode */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded border cursor-pointer transition-colors ${
                mode === 'autonomous'
                  ? 'bg-deep-teal-subtle/50 border-deep-teal'
                  : 'bg-surface border-line hover:border-muted-ink/40'
              }`}
            >
              <input
                type="radio"
                name="run-mode"
                value="autonomous"
                checked={mode === 'autonomous'}
                onChange={() => setMode('autonomous')}
                className="mt-1 text-deep-teal focus:ring-deep-teal"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-ink">Autonomous mode</span>
                </div>
                <p className="text-xs text-muted-ink leading-relaxed">
                  Proceeds immediately through planning and discovery within your configured envelope and budget caps.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* 3. Relevance Criteria */}
        <div className="p-5 bg-surface rounded border border-line space-y-3">
          <label className="block text-sm font-semibold text-ink">Relevance filter sensitivity</label>
          <div className="grid grid-cols-3 gap-2">
            {(['broad', 'balanced', 'strict'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setRelevance(lvl)}
                className={`py-2 px-3 text-xs font-medium rounded capitalize border min-target transition-colors ${
                  relevance === lvl
                    ? 'bg-deep-teal-subtle text-deep-teal border-deep-teal font-semibold'
                    : 'bg-surface text-muted-ink border-line hover:text-ink'
                }`}
              >
                {lvl} {lvl === 'balanced' && '(Default)'}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-ink">
            Relevance is a ranking and filtering heuristic based on your query criteria, not a probability.
          </p>
        </div>

        {/* 4. Optional Seeds & Filter Notes */}
        <div className="p-5 bg-surface rounded border border-line space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ink">Initial seed URLs (Optional)</label>
            <p className="text-xs text-muted-ink mt-0.5">
              Specific pages or domain targets to initialize the frontier envelope.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="https://example.com/jobs"
              className="flex-1 p-2 text-sm border border-line rounded bg-surface text-ink font-mono-tech placeholder:font-sans placeholder:text-muted-ink/60"
            />
            <button
              type="button"
              onClick={handleAddSeed}
              className="px-4 py-2 text-sm font-medium rounded bg-surface hover:bg-canvas text-ink border border-line min-target shrink-0"
            >
              Add URL
            </button>
          </div>

          {seedUrls.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-xs font-medium text-muted-ink">Configured seeds ({seedUrls.length}):</div>
              <div className="flex flex-wrap gap-2">
                {seedUrls.map((url, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-subtle-surface border border-line text-xs font-mono-tech text-ink"
                  >
                    <span>{url}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSeed(i)}
                      className="text-muted-ink hover:text-ink font-bold ml-1"
                      aria-label={`Remove seed URL ${url}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-line">
            <label htmlFor="filter-notes" className="block text-xs font-medium text-ink mb-1">
              Preferred sites, language, or exclusion notes (Optional)
            </label>
            <input
              id="filter-notes"
              type="text"
              value={filterNotes}
              onChange={(e) => setFilterNotes(e.target.value)}
              placeholder="e.g., Exclude aggregator portals, prefer direct career pages"
              className="w-full p-2 text-xs border border-line rounded bg-surface text-ink"
            />
          </div>
        </div>

        {/* 5. Authorized Site Sessions */}
        {sessions.length > 0 && (
          <div className="p-5 bg-surface rounded border border-line space-y-3">
            <label htmlFor="session-domain-select" className="block text-sm font-semibold text-ink">
              Attach authenticated site session (Optional)
            </label>
            <p className="text-xs text-muted-ink">
              Choose an encrypted session established in your personal workspace if this query requires authenticated member access.
            </p>
            <select
              id="session-domain-select"
              value={selectedSessionDomain}
              onChange={(e) => setSelectedSessionDomain(e.target.value)}
              className="w-full p-2 text-sm border border-line rounded bg-surface text-ink font-mono-tech"
            >
              <option value="">No authenticated session (Public research only)</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.domain}>
                  {s.domain} — {s.status} (Connected {new Date(s.connectedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 6. Standard Limits & Ceilings */}
        <div className="p-5 bg-surface rounded border border-line">
          <button
            type="button"
            onClick={() => setShowAdvancedLimits(!showAdvancedLimits)}
            className="w-full flex items-center justify-between text-left text-sm font-semibold text-ink focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-deep-teal" />
              <span>Standard run limits & budget caps</span>
            </div>
            {showAdvancedLimits ? <ChevronUp className="w-4 h-4 text-muted-ink" /> : <ChevronDown className="w-4 h-4 text-muted-ink" />}
          </button>

          {showAdvancedLimits && (
            <div className="mt-3 p-4 rounded bg-subtle-surface border border-line space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="input-limit-domains" className="block text-xs text-muted-ink mb-1">
                    Max domains (1–20)
                  </label>
                  <input
                    id="input-limit-domains"
                    ref={domainsInputRef}
                    type="number"
                    min={1}
                    max={20}
                    value={limits.domains}
                    onChange={(e) => setLimits({ ...limits, domains: parseInt(e.target.value) || 20 })}
                    className="w-full p-1.5 text-xs border border-line rounded bg-surface text-ink font-mono-tech"
                  />
                </div>

                <div>
                  <label htmlFor="input-limit-pages" className="block text-xs text-muted-ink mb-1">
                    Max pages (1–500)
                  </label>
                  <input
                    id="input-limit-pages"
                    ref={pagesInputRef}
                    type="number"
                    min={1}
                    max={500}
                    value={limits.pages}
                    onChange={(e) => setLimits({ ...limits, pages: parseInt(e.target.value) || 500 })}
                    className="w-full p-1.5 text-xs border border-line rounded bg-surface text-ink font-mono-tech"
                  />
                </div>

                <div>
                  <label htmlFor="input-limit-depth" className="block text-xs text-muted-ink mb-1">
                    Max depth (0–5)
                  </label>
                  <input
                    id="input-limit-depth"
                    ref={depthInputRef}
                    type="number"
                    min={0}
                    max={5}
                    value={limits.depth}
                    onChange={(e) => setLimits({ ...limits, depth: parseInt(e.target.value) || 5 })}
                    className="w-full p-1.5 text-xs border border-line rounded bg-surface text-ink font-mono-tech"
                  />
                </div>

                <div>
                  <label htmlFor="input-limit-minutes" className="block text-xs text-muted-ink mb-1">
                    Max time (1–20 min)
                  </label>
                  <input
                    id="input-limit-minutes"
                    ref={minutesInputRef}
                    type="number"
                    min={1}
                    max={20}
                    value={limits.minutes}
                    onChange={(e) => setLimits({ ...limits, minutes: parseInt(e.target.value) || 20 })}
                    className="w-full p-1.5 text-xs border border-line rounded bg-surface text-ink font-mono-tech"
                  />
                </div>

                <div>
                  <label htmlFor="input-limit-retries" className="block text-xs text-muted-ink mb-1">
                    Retries per page (0–2)
                  </label>
                  <input
                    id="input-limit-retries"
                    ref={retriesInputRef}
                    type="number"
                    min={0}
                    max={2}
                    value={limits.retriesPerPage}
                    onChange={(e) => setLimits({ ...limits, retriesPerPage: Number(e.target.value) })}
                    className="w-full p-1.5 text-xs border border-line rounded bg-surface text-ink font-mono-tech"
                    aria-invalid={!!fieldErrors.retriesPerPage}
                  />
                </div>

                <div>
                  <label htmlFor="input-limit-download" className="block text-xs text-muted-ink mb-1">
                    Max download (1–100 MB)
                  </label>
                  <input
                    id="input-limit-download"
                    ref={downloadInputRef}
                    type="number"
                    min={1}
                    max={100}
                    value={limits.downloadMb}
                    onChange={(e) => setLimits({ ...limits, downloadMb: parseInt(e.target.value) || 100 })}
                    className="w-full p-1.5 text-xs border border-line rounded bg-surface text-ink font-mono-tech"
                  />
                </div>

                <div>
                  <label htmlFor="input-limit-ai-cap" className="block text-xs text-muted-ink mb-1">
                    AI cap ($0.00–$0.25)
                  </label>
                  <input
                    id="input-limit-ai-cap"
                    ref={aiCapInputRef}
                    type="number"
                    step="0.01"
                    min={0}
                    max={0.25}
                    value={aiUsageCapUsd}
                    onChange={(e) => setAiUsageCapUsd(parseFloat(e.target.value) || 0.25)}
                    className="w-full p-1.5 text-xs border border-line rounded bg-surface text-ink font-mono-tech"
                  />
                </div>
              </div>

              <div className="text-xs text-muted-ink leading-relaxed">
                Owner may lower per-query limits. Standard beta ceilings are enforced on server. Setting AI cap to $0.00 disables LLM calls for deterministic execution.
              </div>
            </div>
          )}
        </div>

        {/* 7. Action Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-ink">
            {mode === 'approval' ? (
              <span>Proceeds to plan review; no crawler network activity until approved.</span>
            ) : (
              <span>Bounded autonomous run will initialize discovery immediately.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded bg-deep-teal hover:bg-deep-teal-hover text-surface text-sm font-medium transition-colors disabled:opacity-60 min-target"
          >
            <Compass className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Preparing run...'
                : mode === 'approval'
                ? 'Review plan'
                : 'Start autonomous run'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
