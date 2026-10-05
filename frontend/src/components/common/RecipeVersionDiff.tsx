import React, { useState } from 'react';
import type { Recipe } from '../../types/api';

export const RecipeVersionDiff: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  const versions = [...(recipe.versions ?? []), {
    version: recipe.version, actions: recipe.actions, validation: recipe.validation,
    savedAt: recipe.validation.lastValidatedAt ?? '', changeSummary: 'Current version',
  }];
  const [base, setBase] = useState(versions[0].version);
  const [comparison, setComparison] = useState(recipe.version);
  const selected = [versions.find(v => v.version === base), versions.find(v => v.version === comparison)];
  return <section className="space-y-4 p-5 bg-surface rounded border border-line">
    <h3 className="section-title">Recorded recipe versions</h3>
    {versions.length === 1 && <p className="text-sm text-muted-ink">No previous version has been saved. Repairing this recipe will preserve its current steps for comparison.</p>}
    {recipe.validation.driftDetected && <p role="status" className="text-sm text-muted-ink">{recipe.validation.driftReason || 'Source validation failed; review this recipe.'}</p>}
    <div className="flex gap-4">
      {(['Base version', 'Compare version'] as const).map((label, index) => <label key={label} className="text-sm text-muted-ink">
        {label}
        <select aria-label={label} value={index === 0 ? base : comparison}
          onChange={e => (index === 0 ? setBase : setComparison)(Number(e.target.value))}
          className="ml-2 p-2 rounded bg-surface border border-line text-ink">
          {versions.map(v => <option key={v.version} value={v.version}>v{v.version}</option>)}
        </select>
      </label>)}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {selected.map((version, index) => version && <div key={index} className="p-3 rounded border border-line space-y-3">
        <h4 className="text-sm font-semibold text-ink">Version {version.version}</h4>
        <p className="text-xs text-muted-ink">{version.changeSummary}</p>
        {version.savedAt && <p className="text-xs text-muted-ink">Recorded: {new Date(version.savedAt).toLocaleString()}</p>}
        <p className="text-xs text-muted-ink">Validation: {version.validation.outcome}</p>
        <ol className="space-y-2 text-xs">
          {version.actions.map(step => <li key={step.order} className="p-2 bg-subtle-surface rounded">
            <p className="font-medium text-ink">{step.order}. {step.type}</p>
            <code className="block break-all text-muted-ink">{step.target}</code>
          </li>)}
        </ol>
      </div>)}
    </div>
  </section>;
};
