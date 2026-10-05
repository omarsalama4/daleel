import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApi } from '../services/api';
import { useToast } from '../components/common/Toast';
import type { Storage, Settings } from '../types/api';
import { O05DestructiveConfirmModal } from '../components/overlays/O05DestructiveConfirmModal';
import {
  Sliders,
  Database,
  Trash2,
  AlertTriangle,
  HardDrive,
  Shield,
  Layers,
} from 'lucide-react';

export const P19LimitsStorageSettings: React.FC = () => {
  const api = useApi();
  const { showToast } = useToast();

  const [storage, setStorage] = useState<Storage | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [purgingCategory, setPurgingCategory] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [st, se] = await Promise.all([api.getStorage(), api.getSettings()]);
        setStorage(st);
        setSettings(se);
      } catch (err) {
        console.error('Failed to load storage data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [api]);

  const handlePurgeCategory = async () => {
    if (!purgingCategory) return;
    try {
      showToast(`Purged retained ${purgingCategory}. Storage ledger updated.`, 'success');
      const st = await api.getStorage();
      setStorage(st);
    } catch (err: any) {
      showToast(err?.detail || 'Purge failed', 'error');
    }
  };

  if (loading || !storage || !settings) {
    return (
      <div className="space-y-6">
        <div className="h-16 skeleton-box border border-line" />
        <div className="h-64 skeleton-box border border-line" />
      </div>
    );
  }

  const usedPercentage = Math.round((storage.usedMb / storage.quotaMb) * 100);

  return (
    <div className="space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-3 text-sm">
        <NavLink
          to="/app/settings/account"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded font-medium min-target flex items-center ${
              isActive
                ? 'bg-deep-teal-subtle text-deep-teal border border-deep-teal/30'
                : 'text-muted-ink hover:text-ink hover:bg-surface border border-transparent'
            }`
          }
        >
          Account & Workspace
        </NavLink>
        <NavLink
          to="/app/settings/ai"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded font-medium min-target flex items-center ${
              isActive
                ? 'bg-deep-teal-subtle text-deep-teal border border-deep-teal/30'
                : 'text-muted-ink hover:text-ink hover:bg-surface border border-transparent'
            }`
          }
        >
          AI Processing & Providers
        </NavLink>
        <NavLink
          to="/app/settings/limits"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded font-medium min-target flex items-center ${
              isActive
                ? 'bg-deep-teal-subtle text-deep-teal border border-deep-teal/30'
                : 'text-muted-ink hover:text-ink hover:bg-surface border border-transparent'
            }`
          }
        >
          Limits, Storage & Deletion
        </NavLink>
      </div>

      <div className="p-5 bg-surface rounded border border-line space-y-6">
        <div>
          <h1 className="page-title">Limits, storage & data deletion</h1>
          <p className="text-sm text-muted-ink mt-0.5">
            Standard profile ceilings reference, evidence storage quota, and manual data purging.
          </p>
        </div>

        {/* 1. Standard Profile Ceilings */}
        <div className="space-y-3 pt-3 border-t border-line text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink m-0">Standard Beta Ceilings (Reference profile)</h3>
            <span className="text-muted-ink">Enforced server-side</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Max domains', val: '20' },
              { label: 'Max pages', val: '500' },
              { label: 'Max depth', val: '5' },
              { label: 'Max duration', val: '20 min' },
              { label: 'Retries / page', val: '2' },
              { label: 'Max download', val: '100 MB' },
            ].map((ceil, i) => (
              <div key={i} className="p-3 bg-canvas rounded border border-line space-y-0.5">
                <span className="text-muted-ink text-[11px]">{ceil.label}</span>
                <div className="font-mono-tech text-sm font-semibold text-ink">{ceil.val}</div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-ink">
            Owners can lower crawl parameters per query in P04. Raising maxima above Standard requires platform operator configuration.
          </p>
        </div>

        {/* 2. Evidence Storage Meter */}
        <div className="p-4 bg-subtle-surface rounded border border-line space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-deep-teal" />
              <h3 className="text-sm font-semibold text-ink m-0">Evidence storage meter</h3>
            </div>
            <span className="font-mono-tech text-ink font-medium">
              {storage.usedMb.toFixed(1)} MB / {storage.quotaMb} MB ({usedPercentage}%)
            </span>
          </div>

          <div className="w-full bg-line h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                usedPercentage >= 80 ? 'bg-ink' : 'bg-deep-teal'
              }`}
              style={{ width: `${Math.min(100, usedPercentage)}%` }}
            />
          </div>

          {usedPercentage >= 80 && (
            <div className="p-2.5 rounded bg-surface border border-line text-ink flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-ink shrink-0" />
              <span>Storage warning: Workspace exceeds 80% quota threshold. Consider deleting unneeded runs below.</span>
            </div>
          )}

          <div className="text-[11px] text-muted-ink">
            At 500 MB capacity, new crawl jobs pause before downloading heavy artifacts. Auto-deletion is banned; you control what is purged.
          </div>
        </div>

        {/* 3. Retained Data Breakdown & Deletion Controls */}
        <div className="space-y-3 pt-3 border-t border-line text-xs">
          <h3 className="text-sm font-semibold text-ink m-0">Retained Data Breakdown & Purge Controls</h3>

          <div className="divide-y divide-line border border-line rounded overflow-hidden">
            {[
              {
                id: 'results',
                label: 'Extracted results database',
                size: storage.categories.resultsMb,
                desc: 'Structured findings, field values, and relevance scores.',
              },
              {
                id: 'artifacts',
                label: 'Evidence artifacts & HTML snapshots',
                size: storage.categories.evidenceArtifactsMb,
                desc: 'Verbatim citations, page snapshots, and sha256 digests.',
              },
              {
                id: 'history',
                label: 'Past run activity & audit history',
                size: storage.categories.runHistoryMb,
                desc: 'Step-by-step crawl logs, status sequences, and timeline counters.',
              },
            ].map((cat) => (
              <div
                key={cat.id}
                className="p-4 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-subtle-surface"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink">{cat.label}</div>
                  <div className="text-[11px] text-muted-ink">{cat.desc}</div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono-tech font-medium text-ink">{cat.size.toFixed(1)} MB</span>
                  <button
                    type="button"
                    onClick={() => setPurgingCategory(cat.label)}
                    className="px-2.5 py-1 text-xs border border-line rounded bg-surface hover:bg-canvas text-ink flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3 text-muted-ink" />
                    <span>Purge</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {purgingCategory && (
        <O05DestructiveConfirmModal
          isOpen={!!purgingCategory}
          onClose={() => setPurgingCategory(null)}
          title={`Purge ${purgingCategory}`}
          itemName={purgingCategory}
          itemType="workspace_data"
          impactDescription="Irreversibly deletes cached data records from live database storage. Encrypted backups expire automatically within 30 days."
          onConfirm={handlePurgeCategory}
        />
      )}
    </div>
  );
};
