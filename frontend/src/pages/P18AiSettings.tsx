import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApi } from '../services/api';
import { useToast } from '../components/common/Toast';
import type { Settings, Usage } from '../types/api';
import {
  Sparkles,
  Shield,
  AlertTriangle,
  Server,
  DollarSign,
  Lock,
  CheckCircle2,
} from 'lucide-react';

export const P18AiSettings: React.FC = () => {
  const api = useApi();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable settings
  const [authContentAllowed, setAuthContentAllowed] = useState(false);
  const [monthlyCap, setMonthlyCap] = useState(5.0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [s, u] = await Promise.all([api.getSettings(), api.getUsage()]);
        setSettings(s);
        setUsage(u);
        setAuthContentAllowed(s.authenticatedContentAllowed);
        setMonthlyCap(s.aiCaps.monthlyUsd);
      } catch (err) {
        console.error('Failed to load AI settings', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [api]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        authenticatedContentAllowed: authContentAllowed,
        monthlyAiUsd: monthlyCap,
      });
      setSettings(updated);
      showToast('AI governance settings updated.', 'success');
    } catch (err: any) {
      showToast(err?.detail || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <div className="h-16 skeleton-box border border-line" />
        <div className="h-64 skeleton-box border border-line" />
      </div>
    );
  }

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

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-5 bg-surface rounded border border-line space-y-6">
          <div>
            <h1 className="page-title">AI processing & provider policy</h1>
            <p className="text-sm text-muted-ink mt-0.5">
              Strict governance of language model calls, authenticated content exposure, and budget caps.
            </p>
          </div>

          {/* 1. Authenticated-Content AI Policy (OFF by default) */}
          <div className="p-4 rounded bg-subtle-surface border border-line space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-deep-teal" />
                  <h3 className="text-sm font-semibold text-ink m-0">
                    Process authenticated content with hosted AI models
                  </h3>
                </div>
                <p className="text-xs text-muted-ink leading-relaxed">
                  Off by default. When OFF, private page content captured using your authorized site sessions is never transmitted to external model providers (Groq, OpenRouter, etc.) for extraction, synthesis, or ranking.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={authContentAllowed}
                  onChange={(e) => setAuthContentAllowed(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-deep-teal"></div>
              </label>
            </div>

            <div className="text-[11px] text-muted-ink pt-2 border-t border-line">
              {authContentAllowed ? (
                <span className="text-ink font-medium">
                  ✓ Enabled: Authenticated page HTML may be processed by platform model routes within your budget cap.
                </span>
              ) : (
                <span>
                  Deterministic extraction only: Only validated DOM selector rules will extract fields; otherwise affected fields remain marked Unknown.
                </span>
              )}
            </div>
          </div>

          {/* 2. Model Route Summary */}
          <div className="space-y-3 pt-3 border-t border-line text-xs">
            <h3 className="text-sm font-semibold text-ink m-0">Platform Model Routing (Read-only)</h3>
            <p className="text-muted-ink">
              Provider endpoints, API keys, and health checks are managed by the platform infrastructure. Users are never asked to supply third-party API keys.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-canvas rounded border border-line space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-ink">Primary route</span>
                  <span className="font-mono-tech text-deep-teal font-medium">Active</span>
                </div>
                <div className="font-semibold text-ink capitalize font-mono-tech">
                  {settings.providers.primary} (Fast inference)
                </div>
              </div>

              <div className="p-3 bg-canvas rounded border border-line space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-ink">Secondary route</span>
                  <span className="font-mono-tech text-muted-ink">Standby</span>
                </div>
                <div className="font-semibold text-ink capitalize font-mono-tech">
                  {settings.providers.secondary.replace(/_/g, ' ')}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Paid Model Enablement */}
          <div className="p-3.5 bg-subtle-surface rounded border border-line text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">Paid commercial model routes</span>
              <span className="text-muted-ink font-mono-tech">Disabled</span>
            </div>
            <p className="text-muted-ink leading-relaxed">
              Paid model routes are disabled in the private beta. When free quota exhausts, runs report a quota stop without silently falling back to billed commercial APIs.
            </p>
          </div>

          {/* 4. Usage Caps */}
          <div className="space-y-3 pt-3 border-t border-line text-xs">
            <h3 className="text-sm font-semibold text-ink m-0">AI Spend Ceilings & Monthly Usage</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-canvas rounded border border-line space-y-1">
                <span className="text-muted-ink">Per-run default cap</span>
                <div className="font-mono-tech text-lg font-bold text-ink">
                  ${settings.aiCaps.perRunUsd.toFixed(2)}
                </div>
                <span className="text-[11px] text-muted-ink">Configurable per query in P04</span>
              </div>

              <div className="p-3 bg-canvas rounded border border-line space-y-1">
                <span className="text-muted-ink">Monthly workspace cap ($0.00–$5.00)</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={5.0}
                  value={monthlyCap}
                  onChange={(e) => setMonthlyCap(parseFloat(e.target.value) || 0)}
                  className="w-full p-1.5 text-xs border border-line rounded bg-surface text-ink font-mono-tech font-bold"
                />
                <span className="text-[11px] text-muted-ink">Enforced server-side in $0.01 increments</span>
              </div>

              <div className="p-3 bg-canvas rounded border border-line space-y-1">
                <span className="text-muted-ink">Actual spend this month</span>
                <div className="font-mono-tech text-lg font-bold text-ink">
                  ${usage?.aiActualUsd.toFixed(2)}
                </div>
                <span className="text-[11px] text-muted-ink">
                  ${((usage?.aiCapUsd || 5) - (usage?.aiActualUsd || 0)).toFixed(2)} remaining
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-line flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded text-xs font-medium text-white bg-deep-teal hover:bg-deep-teal-hover"
            >
              {saving ? 'Saving changes...' : 'Save AI settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
