import React from 'react';
import type { Evidence, EvidenceState } from '../../types/api';
import { ExternalLink, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface EvidenceViewerProps {
  evidenceList: Evidence[];
  fieldKey: string;
  fieldLabel: string;
  fieldValue: string;
  state: EvidenceState;
  className?: string;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  evidenceList,
  fieldKey,
  fieldLabel,
  fieldValue,
  state,
  className = '',
}) => {
  const relevantEvidence = evidenceList.filter((e) => e.fieldKey === fieldKey);

  return (
    <div className={`p-4 bg-surface rounded border border-line ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div>
          <span className="text-xs text-muted-ink">Field ground truth</span>
          <h4 className="text-sm font-semibold text-ink">{fieldLabel}</h4>
        </div>
        <div className="flex items-center gap-1.5">
          {state === 'verified' && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-line bg-subtle-surface text-ink font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-deep-teal" />
              Verified evidence
            </span>
          )}
          {state === 'unknown' && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-line bg-subtle-surface text-muted-ink font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              Unknown / Not found
            </span>
          )}
          {state === 'unverified' && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-line bg-subtle-surface text-muted-ink font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              Unverified citation
            </span>
          )}
          {state === 'conflict' && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-line bg-subtle-surface text-ink font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              Conflicting sources
            </span>
          )}
        </div>
      </div>

      <div className="my-3 p-3 rounded bg-canvas border border-line">
        <div className="text-xs text-muted-ink mb-1">Extracted value</div>
        <div className="text-sm font-medium text-ink break-words" dir="auto">
          {fieldValue || <span className="text-muted-ink italic">No value extracted</span>}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-muted-ink uppercase tracking-wider mb-2">
          Supporting source citations ({relevantEvidence.length})
        </div>

        {relevantEvidence.length === 0 ? (
          <div className="text-xs text-muted-ink p-3 rounded border border-dashed border-line bg-subtle-surface">
            No source excerpt was captured for this field. The field remains marked as {state}.
          </div>
        ) : (
          <div className="space-y-3">
            {relevantEvidence.map((ev) => (
              <div key={ev.id} className="p-3 rounded border border-line bg-subtle-surface text-xs space-y-2">
                <div className="flex items-center justify-between text-muted-ink">
                  <a
                    href={ev.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-deep-teal hover:underline flex items-center gap-1 font-mono-tech max-w-[280px] sm:max-w-md truncate"
                  >
                    <span>{ev.sourceUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <span className="font-mono-tech text-[11px]">
                    {new Date(ev.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Multilingual excerpt: retain language and apply dir="auto" for Arabic or RTL */}
                <div
                  className="p-3 bg-surface rounded border border-line text-ink text-sm leading-relaxed font-sans"
                  dir={ev.direction || 'auto'}
                  lang={ev.language || undefined}
                >
                  "{ev.excerpt}"
                </div>

                {/* Advanced details disclosure per UI/UX spec */}
                <details className="text-xs text-muted-ink pt-1 group">
                  <summary className="cursor-pointer font-medium hover:text-ink select-none flex items-center gap-1.5 py-1">
                    <span className="group-open:rotate-90 transition-transform">▸</span>
                    <span>Advanced details</span>
                  </summary>
                  <div className="mt-1.5 p-2.5 bg-surface rounded border border-line space-y-1.5 font-mono-tech text-[12px]">
                    {ev.digest && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-ink">Digest:</span>
                        <span className="text-ink select-all">{ev.digest}</span>
                      </div>
                    )}
                    {(ev as any).selector && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-ink">Selector:</span>
                        <span className="text-ink select-all">{(ev as any).selector}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-ink">Artifact:</span>
                      {ev.artifactAvailable ? (
                        <span className="flex items-center gap-1 text-ink">
                          <CheckCircle2 className="w-3 h-3 text-deep-teal" /> Retained in evidence storage
                        </span>
                      ) : (
                        <span className="text-muted-ink">Raw snapshot not retained</span>
                      )}
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
