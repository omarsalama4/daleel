import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/AuthContext';
import { useApiConfig } from '../../services/api';
import {
  Compass,
  PlusCircle,
  Home,
  PlaySquare,
  Workflow as WorkflowIcon,
  Bot,
  Share2,
  KeyRound,
  Settings,
  Shield,
  Menu,
  X,
  User,
  LogOut,
  Sliders,
  Server,
} from 'lucide-react';

export const WorkspaceShell: React.FC = () => {
  const { account, role, signOut, switchRole } = useAuth();
  const { mode: apiMode, setMode: setApiMode } = useApiConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: '/app', label: 'Home', icon: Home, end: true },
    { to: '/app/new', label: 'New research', icon: PlusCircle, isPrimaryCta: true },
    { to: '/app/runs', label: 'Runs', icon: PlaySquare },
    { to: '/app/workflows', label: 'Workflows', icon: WorkflowIcon },
    { to: '/app/recipes', label: 'Recipes', icon: Bot },
    { to: '/app/shared', label: 'Shared with me', icon: Share2 },
    { to: '/app/sessions', label: 'Sessions', icon: KeyRound },
    { to: '/app/settings/account', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-canvas flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-deep-teal flex items-center justify-center text-white">
            <Compass className="w-4 h-4" />
          </div>
          <span className="font-semibold text-ink text-base">Daleel</span>
          <span className="text-xs text-muted-ink">دليل</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-ink rounded border border-line"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar (Desktop 230px, Quiet Design) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-surface border-r border-line flex flex-col justify-between transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } md:static md:w-60 md:min-h-screen`}
      >
        <div>
          {/* Logo & Workspace Brand */}
          <div className="p-5 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-deep-teal flex items-center justify-center text-white shadow-xs">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink text-base tracking-tight">Daleel</span>
                  <span className="text-xs text-muted-ink font-normal font-sans">دليل</span>
                </div>
                <div className="text-[11px] text-muted-ink tracking-wide">Quiet Research</div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.isPrimaryCta) {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded text-sm font-medium my-2 transition-colors min-target ${
                        isActive
                          ? 'bg-deep-teal text-white shadow-xs'
                          : 'bg-deep-teal text-white hover:bg-deep-teal-hover'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors min-target ${
                      isActive
                        ? 'bg-subtle-surface text-ink border-l-2 border-deep-teal -ml-[2px] pl-[14px]'
                        : 'text-muted-ink hover:text-ink hover:bg-canvas'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Workspace Owner Footer & Admin Switcher */}
        <div className="p-3 border-t border-line bg-canvas/50 space-y-3">
          {/* Workspace Identity badge */}
          <div className="p-2.5 rounded bg-surface border border-line">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-subtle-surface border border-line flex items-center justify-center text-ink text-xs font-medium">
                {account?.account.email.charAt(0).toUpperCase() || 'O'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-ink truncate">
                  {account?.workspace.name || 'Personal Workspace'}
                </div>
                <div className="text-[11px] text-muted-ink truncate">{account?.account.email}</div>
              </div>
            </div>
          </div>

          {/* Explicit development demo controls */}
          {import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true' && <div className="p-2 rounded bg-subtle-surface border border-line space-y-1.5 text-[11px] text-muted-ink">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Server className="w-3 h-3" /> API backend
              </span>
              <button
                type="button"
                onClick={() => setApiMode(apiMode === 'mock' ? 'http' : 'mock')}
                className="px-1.5 py-0.5 rounded border border-line bg-surface text-ink font-mono-tech"
              >
                {apiMode === 'mock' ? 'Mock store' : 'Live /api/v1'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-line">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> Role view
              </span>
              <button
                type="button"
                onClick={() => {
                  switchRole(role === 'owner' ? 'operator' : 'owner');
                  if (role === 'owner') navigate('/admin/invitations');
                  else navigate('/app');
                }}
                className="px-1.5 py-0.5 rounded border border-line bg-surface text-ink font-mono-tech"
              >
                {role === 'owner' ? 'Owner' : 'Operator'}
              </button>
            </div>
          </div>}

          {role === 'operator' && (
            <NavLink
              to="/admin/invitations"
              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded text-xs border border-line bg-surface hover:bg-subtle-surface text-ink font-medium"
            >
              <Shield className="w-3.5 h-3.5 text-deep-teal" />
              Open Platform Admin
            </NavLink>
          )}

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-muted-ink hover:text-ink rounded hover:bg-canvas"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col bg-canvas overflow-y-auto">
        <div className="p-5 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
