import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth/AuthContext';
import { Shield, Mail, Users, FileText, ArrowLeft, LogOut } from 'lucide-react';

export const AdminShell: React.FC = () => {
  const { role, switchRole, signOut } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/admin/invitations', label: 'Invitations', icon: Mail },
    { to: '/admin/workspaces', label: 'Workspace Operations', icon: Users },
    { to: '/admin/access-audit', label: 'Access Audit Ledger', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-canvas flex flex-col md:flex-row">
      <aside className="w-full md:w-60 bg-surface border-r border-line flex flex-col justify-between shrink-0">
        <div>
          {/* Operator Header */}
          <div className="p-5 border-b border-line bg-canvas">
            <div className="flex items-center gap-2 text-ink">
              <Shield className="w-4 h-4 text-deep-teal" />
              <span className="font-semibold text-sm">Platform Admin</span>
            </div>
            <div className="text-[11px] text-muted-ink mt-0.5">Audited Operator Console</div>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors ${
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

        <div className="p-3 border-t border-line bg-canvas/40 space-y-2">
          <button
            onClick={() => {
              switchRole('owner');
              navigate('/app');
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-ink bg-surface border border-line rounded hover:bg-subtle-surface"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-muted-ink" />
            <span>Return to Workspace</span>
          </button>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-muted-ink hover:text-ink rounded"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 bg-canvas overflow-y-auto">
        <div className="p-5 sm:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
