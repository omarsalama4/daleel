import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './services/auth/AuthContext';
import { ApiProvider } from './services/api';
import { ToastProvider } from './components/common/Toast';

// Layout shells
import { WorkspaceShell } from './components/layout/WorkspaceShell';
import { AdminShell } from './components/layout/AdminShell';

// Code-split pages for optimized bundle loading
const P01InvitationAcceptance = lazy(() => import('./pages/P01InvitationAcceptance').then(m => ({ default: m.P01InvitationAcceptance })));
const P02SignInAccessProblem = lazy(() => import('./pages/P02SignInAccessProblem').then(m => ({ default: m.P02SignInAccessProblem })));
const P03Home = lazy(() => import('./pages/P03Home').then(m => ({ default: m.P03Home })));
const P04QueryComposer = lazy(() => import('./pages/P04QueryComposer').then(m => ({ default: m.P04QueryComposer })));
const P05PlanReview = lazy(() => import('./pages/P05PlanReview').then(m => ({ default: m.P05PlanReview })));
const P06RunsList = lazy(() => import('./pages/P06RunsList').then(m => ({ default: m.P06RunsList })));
const P07RunActivity = lazy(() => import('./pages/P07RunActivity').then(m => ({ default: m.P07RunActivity })));
const P08RunResults = lazy(() => import('./pages/P08RunResults').then(m => ({ default: m.P08RunResults })));
const P09FindingDetail = lazy(() => import('./pages/P09FindingDetail').then(m => ({ default: m.P09FindingDetail })));
const P10CoverageSiteGraph = lazy(() => import('./pages/P10CoverageSiteGraph').then(m => ({ default: m.P10CoverageSiteGraph })));
const P11WorkflowLibrary = lazy(() => import('./pages/P11WorkflowLibrary').then(m => ({ default: m.P11WorkflowLibrary })));
const P12SavedWorkflowDetail = lazy(() => import('./pages/P12SavedWorkflowDetail').then(m => ({ default: m.P12SavedWorkflowDetail })));
const P13RecipeLibrary = lazy(() => import('./pages/P13RecipeLibrary').then(m => ({ default: m.P13RecipeLibrary })));
const P14RecipeDetailApproval = lazy(() => import('./pages/P14RecipeDetailApproval').then(m => ({ default: m.P14RecipeDetailApproval })));
const P15SharedWithMe = lazy(() => import('./pages/P15SharedWithMe').then(m => ({ default: m.P15SharedWithMe })));
const P16Sessions = lazy(() => import('./pages/P16Sessions').then(m => ({ default: m.P16Sessions })));
const P17AccountSettings = lazy(() => import('./pages/P17AccountSettings').then(m => ({ default: m.P17AccountSettings })));
const P18AiSettings = lazy(() => import('./pages/P18AiSettings').then(m => ({ default: m.P18AiSettings })));
const P19LimitsStorageSettings = lazy(() => import('./pages/P19LimitsStorageSettings').then(m => ({ default: m.P19LimitsStorageSettings })));
const P20OperatorInvitations = lazy(() => import('./pages/P20OperatorInvitations').then(m => ({ default: m.P20OperatorInvitations })));
const P21OperatorWorkspaces = lazy(() => import('./pages/P21OperatorWorkspaces').then(m => ({ default: m.P21OperatorWorkspaces })));
const P22OperatorAccessAudit = lazy(() => import('./pages/P22OperatorAccessAudit').then(m => ({ default: m.P22OperatorAccessAudit })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteLoadingFallback = () => (
  <div className="space-y-4 p-6">
    <div className="skeleton-box h-10 w-48" />
    <div className="skeleton-box h-40 w-full" />
  </div>
);

// Route Guard for authenticated Workspace routes
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-xs text-muted-ink">
        Loading personal workspace...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Route Guard for Platform Operator Admin routes
const RequireOperator: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-xs text-muted-ink">
        Verifying operator credentials...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  if (role !== 'operator') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public / Invite Routes */}
        <Route path="/invite/:token" element={<P01InvitationAcceptance />} />
        <Route path="/sign-in" element={<P02SignInAccessProblem />} />

        {/* Workspace Owner Shell Routes (P03-P19) */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <WorkspaceShell />
            </RequireAuth>
          }
        >
          <Route index element={<P03Home />} />
          <Route path="new" element={<P04QueryComposer />} />
          <Route path="plans/:draftId" element={<P05PlanReview />} />
          <Route path="runs" element={<P06RunsList />} />
          <Route path="runs/:runId" element={<P07RunActivity />} />
          <Route path="runs/:runId/results" element={<P08RunResults />} />
          <Route path="runs/:runId/results/:findingId" element={<P09FindingDetail />} />
          <Route path="runs/:runId/coverage" element={<P10CoverageSiteGraph />} />
          <Route path="workflows" element={<P11WorkflowLibrary />} />
          <Route path="workflows/:workflowId" element={<P12SavedWorkflowDetail />} />
          <Route path="recipes" element={<P13RecipeLibrary />} />
          <Route path="recipes/:recipeId" element={<P14RecipeDetailApproval />} />
          <Route path="shared" element={<P15SharedWithMe />} />
          <Route path="sessions" element={<P16Sessions />} />
          <Route path="settings/account" element={<P17AccountSettings />} />
          <Route path="settings/ai" element={<P18AiSettings />} />
          <Route path="settings/limits" element={<P19LimitsStorageSettings />} />
        </Route>

        {/* Platform Operator Admin Shell Routes (P20-P22) */}
        <Route
          path="/admin"
          element={
            <RequireOperator>
              <AdminShell />
            </RequireOperator>
          }
        >
          <Route path="invitations" element={<P20OperatorInvitations />} />
          <Route path="workspaces" element={<P21OperatorWorkspaces />} />
          <Route path="workspaces/:id" element={<P21OperatorWorkspaces />} />
          <Route path="access-audit" element={<P22OperatorAccessAudit />} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </ApiProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
