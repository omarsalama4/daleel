import React, { useState } from 'react';
import type { FeedbackRequest, Finding } from '../../types/api';
import { X, MessageSquare, AlertCircle } from 'lucide-react';

interface O04FeedbackDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  finding: Finding | null;
  fieldKey?: string;
  onSubmitFeedback: (feedback: FeedbackRequest) => Promise<void>;
}

export const O04FeedbackDrawer: React.FC<O04FeedbackDrawerProps> = ({
  isOpen,
  onClose,
  finding,
  fieldKey,
  onSubmitFeedback,
}) => {
  const [classification, setClassification] = useState<FeedbackRequest['classification']>('relevant');
  const [correction, setCorrection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !finding) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmitFeedback({
        classification,
        correction: correction.trim() ? correction.trim() : null,
        fieldKey: fieldKey || null,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Feedback and correction"
    >
      <div className="w-full max-w-md bg-surface h-full border-l border-line flex flex-col shadow-xl animate-in slide-in-from-right">
        <div className="p-4 border-b border-line flex items-center justify-between bg-canvas">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-deep-teal" />
            <h3 className="text-sm font-semibold text-ink">Grounding feedback & correction</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-ink hover:text-ink rounded border border-transparent hover:border-line"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto space-y-4">
          <div className="p-3 rounded bg-subtle-surface border border-line text-xs">
            <div className="text-muted-ink">Subject finding:</div>
            <div className="font-medium text-ink mt-0.5 truncate">
              {finding.values.title?.value || finding.id}
            </div>
            {fieldKey && (
              <div className="mt-1 text-muted-ink">
                Specific field: <span className="font-mono-tech text-ink">{fieldKey}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-ink mb-1.5">
              Relevance & quality classification
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'relevant', label: 'Relevant', desc: 'Valid fit for research criteria' },
                { id: 'irrelevant', label: 'Irrelevant', desc: 'Out of research scope' },
                { id: 'incomplete', label: 'Incomplete', desc: 'Missing required detail fields' },
                { id: 'incorrect', label: 'Incorrect', desc: 'Extraction or evidence error' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setClassification(opt.id as any)}
                  className={`p-2.5 rounded border text-left text-xs ${
                    classification === opt.id
                      ? 'border-deep-teal bg-deep-teal-subtle text-ink font-medium'
                      : 'border-line bg-surface text-muted-ink'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-[11px] text-muted-ink mt-0.5 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-ink mb-1.5">
              Proposed correction / reason (optional)
            </label>
            <textarea
              rows={4}
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              placeholder="Explain why this finding should be re-classified or specify the correct field value..."
              className="w-full p-2.5 text-xs border border-line rounded bg-surface text-ink focus:border-deep-teal"
            />
            <p className="text-[11px] text-muted-ink mt-1">
              Feedback attaches to this run as human calibration without rewriting past source snapshots.
            </p>
          </div>

          <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded text-xs font-medium text-ink bg-surface border border-line hover:bg-subtle-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover"
            >
              {isSubmitting ? 'Saving...' : 'Save feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
