import React, { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../services/auth/AuthContext';
import { useApi } from '../services/api';
import { LogOut, MapPin } from 'lucide-react';

export const P17AccountSettings: React.FC = () => {
  const { account, signOut } = useAuth();
  const api = useApi();

  const [sentCount, setSentCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);

  useEffect(() => {
    async function loadShareCounts() {
      try {
        const [sent, rec] = await Promise.all([
          api.listSentShares(),
          api.listSharedWithMe(),
        ]);
        setSentCount(sent.length);
        setReceivedCount(rec.items.length);
      } catch (err) {
        console.error('Failed to load share counts', err);
      }
    }
    loadShareCounts();
  }, [api]);

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
          <h1 className="page-title">Account & workspace</h1>
          <p className="text-sm text-muted-ink mt-0.5">
            Your personal workspace boundary, identity, and regional storage configuration.
          </p>
        </div>

        {/* 1. Identity Panel */}
        <div className="space-y-3 pt-3 border-t border-line text-xs">
          <h2 className="text-sm font-semibold text-ink m-0">Personal Workspace Identity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-subtle-surface rounded border border-line space-y-1">
              <span className="text-muted-ink">Owner email</span>
              <div className="font-mono-tech text-ink font-medium">{account?.account.email}</div>
            </div>

            <div className="p-3 bg-subtle-surface rounded border border-line space-y-1">
              <span className="text-muted-ink">Workspace name & ID</span>
              <div className="font-mono-tech text-ink font-medium">
                {account?.workspace.name} ({account?.workspace.id})
              </div>
            </div>

            <div className="p-3 bg-subtle-surface rounded border border-line space-y-1">
              <span className="text-muted-ink">Assigned role</span>
              <div className="font-medium text-ink capitalize">
                Workspace Owner (Personal tenant)
              </div>
            </div>

            {/* 3. Data Location */}
            <div className="p-3 bg-subtle-surface rounded border border-line space-y-1">
              <span className="text-muted-ink">Data hosting region</span>
              <div className="font-mono-tech text-ink font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-deep-teal" />
                <span>{account?.workspace.dataRegion || 'aws-us-east-1'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Sharing Summary */}
        <div className="space-y-3 pt-4 border-t border-line text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink m-0">Collaboration & Share Grants</h2>
            <Link to="/app/shared" className="text-deep-teal hover:underline font-medium">
              View shared items
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-canvas rounded border border-line">
              <div className="text-muted-ink">Sent share grants</div>
              <div className="text-lg font-bold font-mono-tech text-ink mt-0.5">{sentCount}</div>
            </div>
            <div className="p-3 bg-canvas rounded border border-line">
              <div className="text-muted-ink">Received shares</div>
              <div className="text-lg font-bold font-mono-tech text-ink mt-0.5">{receivedCount}</div>
            </div>
          </div>
        </div>

        {/* 4. Sign-Out */}
        <div className="pt-4 border-t border-line flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-ink">Sign out of Daleel</div>
            <p className="text-muted-ink mt-0.5">
              Ends your product session. Does not invalidate connected target site sessions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="px-4 py-2 rounded border border-line bg-surface hover:bg-subtle-surface text-ink font-medium flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5 text-muted-ink" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
