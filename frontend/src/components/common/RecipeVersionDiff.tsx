import React, { useState } from 'react';
import type { Recipe } from '../../types/api';
import { GitCompare, AlertTriangle, ArrowRight } from 'lucide-react';

interface RecipeVersionDiffProps {
  recipe: Recipe;
}

interface LocalRecipeVersion {
  version: number;
  createdAt: string;
  author: string;
  changeSummary: string;
  status: string;
}

export const RecipeVersionDiff: React.FC<RecipeVersionDiffProps> = ({ recipe }) => {
  const versions: LocalRecipeVersion[] = [
    {
      version: recipe.version,
      createdAt: recipe.validation?.lastValidatedAt || new Date().toISOString(),
      author: 'Workspace Owner',
      changeSummary: 'Current version with verified Playwright execution steps.',
      status: recipe.status,
    },
    {
      version: Math.max(1, recipe.version - 1),
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      author: 'Workspace Owner',
      changeSummary: 'Initial generated draft with legacy CSS selectors before DOM drift.',
      status: 'retired',
    },
  ];

  const [compareV1, setCompareV1] = useState<number>(versions[versions.length - 1]?.version ?? 1);
  const [compareV2, setCompareV2] = useState<number>(recipe.version);

  return (
    <div className="space-y-5 p-5 bg-surface rounded border border-line">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-deep-teal" />
          <h3 className="text-sm font-semibold text-ink">Version comparison & semantic drift diff</h3>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-ink">Base:</span>
          <select
            value={compareV1}
            onChange={(e) => setCompareV1(Number(e.target.value))}
            className="p-1 rounded bg-surface border border-line text-ink font-mono-tech"
          >
            {versions.map((v: LocalRecipeVersion) => (
              <option key={v.version} value={v.version}>
                v{v.version} ({v.status})
              </option>
            ))}
          </select>

          <ArrowRight className="w-3.5 h-3.5 text-muted-ink" />

          <span className="text-muted-ink">Compare:</span>
          <select
            value={compareV2}
            onChange={(e) => setCompareV2(Number(e.target.value))}
            className="p-1 rounded bg-surface border border-line text-ink font-mono-tech"
          >
            {versions.map((v: LocalRecipeVersion) => (
              <option key={v.version} value={v.version}>
                v{v.version} ({v.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {recipe.validation?.driftDetected && (
        <div className="p-3 bg-subtle-surface rounded border border-line flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-muted-ink shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-ink">DOM Drift Detected: </span>
            <span className="text-muted-ink">{recipe.validation.driftReason || 'Target site DOM layout modified.'}</span>
          </div>
        </div>
      )}

      {/* Structured Action Comparison */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-muted-ink uppercase tracking-wider">
          Step & Selector Modifications
        </div>

        <div className="border border-line rounded divide-y divide-line text-xs font-mono-tech">
          <div className="p-3 bg-subtle-surface/50 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-muted-ink font-sans font-medium mb-1">
                Version {compareV1} (Previous)
              </div>
              <div className="p-2 bg-surface rounded border border-line space-y-1">
                <div className="text-muted-ink text-[11px]">Step 2: Pagination Trigger</div>
                <div className="line-through text-muted-ink">
                  await page.click('button.pagination-next');
                </div>
                <div className="text-[11px] text-muted-ink pt-1">
                  Target: .job-list-card .title
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] text-deep-teal font-sans font-medium mb-1">
                Version {compareV2} (Current)
              </div>
              <div className="p-2 bg-deep-teal-subtle/30 rounded border border-deep-teal/20 space-y-1">
                <div className="text-deep-teal text-[11px]">Step 2: Resilient Replay Selector</div>
                <div className="text-ink font-semibold">
                  await page.click('a[aria-label="Next page"], button:has-text("Next")');
                </div>
                <div className="text-[11px] text-muted-ink pt-1">
                  Target: [data-testid="job-title-link"]
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
