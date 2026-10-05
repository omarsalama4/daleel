import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './index';
import type {
  CreateRun,
  RunAction,
  CreateShare,
  SettingsPatch,
  FeedbackRequest,
  RecipeAction,
  RunMode,
} from '../../types/api';

// Query Keys
export const queryKeys = {
  account: ['account'] as const,
  settings: ['settings'] as const,
  storage: ['storage'] as const,
  runs: (filters?: Record<string, unknown>) => ['runs', filters] as const,
  run: (runId: string) => ['run', runId] as const,
  runActivity: (runId: string) => ['runActivity', runId] as const,
  runFindings: (runId: string, filters?: Record<string, unknown>) => ['runFindings', runId, filters] as const,
  runCoverage: (runId: string) => ['runCoverage', runId] as const,
  finding: (runId: string, findingId: string) => ['finding', runId, findingId] as const,
  workflows: (filters?: Record<string, unknown>) => ['workflows', filters] as const,
  workflow: (workflowId: string) => ['workflow', workflowId] as const,
  recipes: (filters?: Record<string, unknown>) => ['recipes', filters] as const,
  recipe: (recipeId: string) => ['recipe', recipeId] as const,
  sharedItems: (type?: string) => ['sharedItems', type] as const,
  sessions: () => ['sessions'] as const,
  invitations: () => ['invitations'] as const,
  workspaces: () => ['workspaces'] as const,
  auditEvents: (filters?: Record<string, unknown>) => ['auditEvents', filters] as const,
};

// 1. Account & Settings Queries
export function useCurrentAccount() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.account,
    queryFn: () => api.getCurrentAccount(),
    staleTime: 60_000,
  });
}

export function useSettings() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api.getSettings(),
    staleTime: 30_000,
  });
}

export function useUpdateSettings() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => api.updateSettings(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
}

export function useStorage() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.storage,
    queryFn: () => api.getStorage(),
    staleTime: 30_000,
  });
}

// 2. Runs Queries
export function useRuns(status?: string, mode?: RunMode, search?: string) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.runs({ status, mode, search }),
    queryFn: () => api.listRuns({ status, q: search }),
    staleTime: 10_000,
  });
}

export function useRun(runId: string) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.run(runId),
    queryFn: () => api.getRun(runId),
    enabled: Boolean(runId),
    staleTime: 5_000,
  });
}

export function useRunActivity(runId: string, enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.runActivity(runId),
    queryFn: () => api.getRunActivity(runId),
    enabled: Boolean(runId) && enabled,
    refetchInterval: (query) => {
      const run = query.state.data?.run;
      if (!run) return 3000;
      const isTerminal = ['complete', 'partial', 'failed', 'cancelled'].includes(run.status);
      if (isTerminal) return false;
      // 3s in foreground, 15s in background
      return typeof document !== 'undefined' && document.hidden ? 15000 : 3000;
    },
  });
}

export function useRunAction() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, action }: { runId: string; action: RunAction }) =>
      api.performRunAction(runId, action),
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.run(runId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.runActivity(runId) });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
  });
}

export function useCreateRun() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRun) => api.createRun(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
  });
}

// 3. Findings Queries
export function useRunFindings(runId: string) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.runFindings(runId),
    queryFn: () => api.listFindings(runId),
    enabled: Boolean(runId),
    staleTime: 10_000,
  });
}

export function useFinding(runId: string, findingId: string) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.finding(runId, findingId),
    queryFn: () => api.getFinding(runId, findingId),
    enabled: Boolean(runId && findingId),
    staleTime: 30_000,
  });
}

export function useSubmitFeedback() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, findingId, feedback }: { runId: string; findingId: string; feedback: FeedbackRequest }) =>
      api.submitFindingFeedback(runId, findingId, feedback),
    onSuccess: (_, { runId, findingId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finding(runId, findingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.runFindings(runId) });
    },
  });
}

// 4. Coverage Query
export function useRunCoverage(runId: string) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.runCoverage(runId),
    queryFn: () => api.getRunCoverage(runId),
    enabled: Boolean(runId),
    staleTime: 15_000,
  });
}

// 5. Workflows Queries
export function useWorkflows() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.workflows(),
    queryFn: () => api.listWorkflows(),
    staleTime: 20_000,
  });
}

export function useWorkflow(workflowId: string) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.workflow(workflowId),
    queryFn: () => api.getWorkflow(workflowId),
    enabled: Boolean(workflowId),
    staleTime: 20_000,
  });
}

// 6. Recipes Queries
export function useRecipes() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.recipes(),
    queryFn: () => api.listRecipes(),
    staleTime: 20_000,
  });
}

export function useRecipe(recipeId: string) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => api.getRecipe(recipeId),
    enabled: Boolean(recipeId),
    staleTime: 20_000,
  });
}

export function useRecipeAction() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, action }: { recipeId: string; action: RecipeAction }) =>
      api.performRecipeAction(recipeId, action),
    onSuccess: (_, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipe(recipeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes() });
    },
  });
}

// 7. Sessions Queries
export function useSessions() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.sessions(),
    queryFn: () => api.listSessions(),
    staleTime: 15_000,
  });
}

// 8. Shared Items Query
export function useSharedItems(type?: string) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.sharedItems(type),
    queryFn: () => api.listSharedWithMe(),
    staleTime: 20_000,
  });
}

export function useCreateShare() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (share: CreateShare) => api.createShare(share),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedItems'] });
    },
  });
}

// 9. Operator Queries
export function useOperatorInvitations() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.invitations(),
    queryFn: () => api.listInvitations(),
    staleTime: 10_000,
  });
}

export function useOperatorWorkspaces() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.workspaces(),
    queryFn: () => api.listAdminWorkspaces(),
    staleTime: 15_000,
  });
}

export function useOperatorAuditEvents() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.auditEvents(),
    queryFn: () => api.listAccessAudit(),
    staleTime: 15_000,
  });
}
