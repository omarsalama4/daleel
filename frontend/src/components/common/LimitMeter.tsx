import React from 'react';
import type { Limits, RunUsageMetrics } from '../../types/api';

interface LimitMeterProps {
  limits: Limits;
  usage?: RunUsageMetrics;
  aiCapUsd?: number;
  className?: string;
  compact?: boolean;
}

export const LimitMeter: React.FC<LimitMeterProps> = ({
  limits,
  usage,
  aiCapUsd = 0.25,
  className = '',
  compact = false,
}) => {
  const domainsReached = usage?.domainsReached ?? 0;
  const pagesFetched = usage?.pagesFetched ?? 0;
  const downloadMb = usage?.downloadMb ?? 0;
  const elapsedSec = usage?.elapsedSeconds ?? 0;
  const elapsedMin = (elapsedSec / 60).toFixed(1);
  const aiSpend = usage?.aiSpendUsd ?? 0;

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-ink ${className}`}>
        <div>
          <span className="text-ink font-mono-tech">{domainsReached}</span>/{limits.domains} domains
        </div>
        <div>
          <span className="text-ink font-mono-tech">{pagesFetched}</span>/{limits.pages} pages
        </div>
        <div>
          <span className="text-ink font-mono-tech">{downloadMb.toFixed(1)}</span>/{limits.downloadMb} MB
        </div>
        <div>
          <span className="text-ink font-mono-tech">{elapsedMin}</span>/{limits.minutes} min
        </div>
        <div>
          <span className="text-ink font-mono-tech">${aiSpend.toFixed(2)}</span>/${aiCapUsd.toFixed(2)} AI cap
        </div>
      </div>
    );
  }

  const items = [
    { label: 'Domains', current: domainsReached, max: limits.domains, unit: '' },
    { label: 'Pages', current: pagesFetched, max: limits.pages, unit: '' },
    { label: 'Depth', current: limits.depth, max: 5, unit: 'max' },
    { label: 'Duration', current: elapsedMin, max: limits.minutes, unit: 'min' },
    { label: 'Downloaded', current: downloadMb.toFixed(1), max: limits.downloadMb, unit: 'MB' },
    { label: 'AI spend', current: `$${aiSpend.toFixed(2)}`, max: `$${aiCapUsd.toFixed(2)}`, unit: 'cap' },
  ];

  return (
    <div className={`p-4 rounded border border-line bg-surface ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-muted-ink uppercase tracking-wider">Run resource limits</h4>
        <span className="text-xs text-muted-ink">Standard beta ceilings enforced</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item, idx) => {
          const ratio = typeof item.current === 'number' ? Math.min(100, Math.round((item.current / Number(item.max)) * 100)) : 0;
          return (
            <div key={idx} className="p-2.5 rounded bg-subtle-surface border border-line">
              <div className="text-xs text-muted-ink mb-1">{item.label}</div>
              <div className="font-mono-tech text-sm font-medium text-ink">
                {item.current} <span className="text-muted-ink font-normal text-xs">/ {item.max} {item.unit}</span>
              </div>
              <div className="w-full bg-line h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-deep-teal h-full rounded-full transition-all duration-300"
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-2.5 border-t border-line text-xs text-muted-ink flex justify-between items-center">
        <span>AI spend is strictly capped per query. Deterministic extraction and search quota are accounted separately.</span>
      </div>
    </div>
  );
};
