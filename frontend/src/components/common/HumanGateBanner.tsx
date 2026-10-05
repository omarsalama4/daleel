import React from 'react';
import type { HumanGate } from '../../types/api';
import { AlertTriangle, KeyRound, Play, SkipForward, Square } from 'lucide-react';

interface HumanGateBannerProps {
  gate: HumanGate;
  onConnectSite?: (site?: string) => void;
  onReviewRecipe?: () => void;
  onSkipTask?: () => void;
  onStop?: () => void;
  className?: string;
}

export const HumanGateBanner: React.FC<HumanGateBannerProps> = ({
  gate,
  onConnectSite,
  onReviewRecipe,
  onSkipTask,
  onStop,
  className = '',
}) => {
  return (
    <div
      className={`p-4 bg-surface rounded border border-line border-l-4 border-l-ink ${className}`}
      role="region"
      aria-label="Human attention required"
    >
      <div className="flex items-start gap-3">
        <div className="p-1 rounded bg-subtle-surface border border-line text-ink shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-ink">Action Required: {gate.title}</h4>
            <span className="text-xs px-2 py-0.5 rounded border border-line bg-subtle-surface text-ink font-mono-tech">
              {gate.blocker.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-muted-ink mt-1.5 leading-relaxed">{gate.reason}</p>

          {gate.targetSite && (
            <div className="mt-2 text-xs font-mono-tech text-ink bg-subtle-surface p-1.5 rounded inline-block border border-line">
              Target destination: {gate.targetSite}
            </div>
          )}

          <div className="mt-3.5 pt-3 border-t border-line flex flex-wrap items-center gap-2">
            {gate.safeActions.includes('connect_site') && onConnectSite && (
              <button
                onClick={() => onConnectSite(gate.targetSite)}
                className="px-3 py-1.5 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Connect authorized session
              </button>
            )}

            {gate.safeActions.includes('review_recipe') && onReviewRecipe && (
              <button
                onClick={onReviewRecipe}
                className="px-3 py-1.5 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Review recipe drift
              </button>
            )}

            {gate.safeActions.includes('skip_task') && onSkipTask && (
              <button
                onClick={onSkipTask}
                className="px-3 py-1.5 rounded text-xs font-medium text-ink bg-surface border border-line hover:bg-subtle-surface flex items-center gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5 text-muted-ink" />
                Skip this task
              </button>
            )}

            {gate.safeActions.includes('stop') && onStop && (
              <button
                onClick={onStop}
                className="px-3 py-1.5 rounded text-xs font-medium text-ink bg-surface border border-line hover:bg-subtle-surface flex items-center gap-1.5"
              >
                <Square className="w-3 h-3 text-muted-ink" />
                Stop run & keep results
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
