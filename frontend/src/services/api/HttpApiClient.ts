import type { ApiClient } from './ApiClient';
import type {
  ActivityPage,
  AdminWorkspace,
  AuditPage,
  CoveragePage,
  CreateRun,
  CreateShare,
  CurrentAccount,
  DeletionJob,
  ExportJob,
  ExportRequest,
  Feedback,
  FeedbackRequest,
  Finding,
  FindingPage,
  Invitation,
  InvitationPreview,
  Plan,
  PlanPatch,
  Problem,
  Recipe,
  RecipeAction,
  RecipePage,
  Run,
  RunAction,
  RunPage,
  RunWorkflow,
  SaveWorkflow,
  SessionConnection,
  Settings,
  SettingsPatch,
  ShareGrant,
  SharedItem,
  SharedPage,
  SiteSession,
  Storage,
  SupportGrant,
  Usage,
  Workflow,
  WorkflowPage,
  WorkflowPatch,
} from '../../types/api';

export class HttpApiClient implements ApiClient {
  private baseUrl: string = '/api/v1';
  private getAuthToken: () => Promise<string | null>;

  constructor(getAuthToken: () => Promise<string | null>, baseUrl: string = '/api/v1') {
    this.getAuthToken = getAuthToken;
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // W3C trace context
    const randomHex = (size: number) => Array.from(crypto.getRandomValues(new Uint8Array(size)), b => b.toString(16).padStart(2, '0')).join('');
    headers['traceparent'] = `00-${randomHex(16)}-${randomHex(8)}-01`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let problem: Problem;
      try {
        problem = await res.json();
      } catch {
        problem = {
          type: 'https://daleel.ai/problems/network-error',
          title: 'Request Failed',
          status: res.status,
          detail: res.statusText || 'Unexpected server error',
          code: 'HTTP_ERROR',
          traceId: headers['traceparent'],
        };
      }
      throw problem;
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  async getInvitationPreview(inviteToken: string): Promise<InvitationPreview> {
    return this.request<InvitationPreview>(`/invitations/${encodeURIComponent(inviteToken)}`);
  }

  async claimInvitation(inviteToken: string, idempotencyKey?: string): Promise<CurrentAccount> {
    return this.request<CurrentAccount>(`/invitations/${encodeURIComponent(inviteToken)}/claim`, {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    });
  }

  async getCurrentAccount(): Promise<CurrentAccount> {
    return this.request<CurrentAccount>('/me');
  }

  async getSettings(): Promise<Settings> {
    return this.request<Settings>('/settings');
  }

  async updateSettings(patch: SettingsPatch): Promise<Settings> {
    return this.request<Settings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async getUsage(): Promise<Usage> {
    return this.request<Usage>('/usage');
  }

  async listRuns(params?: { cursor?: string; pageSize?: number; status?: string; q?: string }): Promise<RunPage> {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.q) query.set('q', params.q);
    const qs = query.toString();
    return this.request<RunPage>(`/runs${qs ? `?${qs}` : ''}`);
  }

  async createRun(body: CreateRun, idempotencyKey?: string): Promise<Run> {
    return this.request<Run>('/runs', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify(body),
    });
  }

  async getRun(runId: string): Promise<Run> {
    return this.request<Run>(`/runs/${runId}`);
  }

  async getRunPlan(runId: string): Promise<Plan> {
    return this.request<Plan>(`/runs/${runId}/plan`);
  }

  async editRunPlan(runId: string, patch: PlanPatch): Promise<Plan> {
    return this.request<Plan>(`/runs/${runId}/plan`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async approveRun(runId: string): Promise<Run> {
    return this.request<Run>(`/runs/${runId}/approve`, {
      method: 'POST',
    });
  }

  async performRunAction(runId: string, action: RunAction): Promise<Run> {
    return this.request<Run>(`/runs/${runId}/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  async resolveGate(runId: string, gateId: string, action: 'connect_site' | 'skip_task' | 'review_recipe'): Promise<Run> {
    return this.request<Run>(`/runs/${runId}/gates/${gateId}/resolve`, { method: 'POST', body: JSON.stringify({ action }) });
  }

  async getRunActivity(runId: string, cursor?: number): Promise<ActivityPage> {
    const qs = cursor !== undefined ? `?afterSequence=${cursor}` : '';
    return this.request<ActivityPage>(`/runs/${runId}/activity${qs}`);
  }

  async listFindings(
    runId: string,
    params?: { cursor?: string; pageSize?: number; status?: string; minRelevance?: string }
  ): Promise<FindingPage> {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.minRelevance) query.set('minRelevance', params.minRelevance);
    const qs = query.toString();
    return this.request<FindingPage>(`/runs/${runId}/findings${qs ? `?${qs}` : ''}`);
  }

  async getFinding(runId: string, findingId: string): Promise<Finding> {
    return this.request<Finding>(`/runs/${runId}/findings/${findingId}`);
  }

  async submitFindingFeedback(runId: string, findingId: string, feedback: FeedbackRequest): Promise<Feedback> {
    return this.request<Feedback>(`/runs/${runId}/findings/${findingId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }

  async getRunCoverage(runId: string, cursor?: string): Promise<CoveragePage> {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request<CoveragePage>(`/runs/${runId}/coverage${qs}`);
  }

  async createRunExport(runId: string, request: ExportRequest): Promise<ExportJob> {
    return this.request<ExportJob>(`/runs/${runId}/exports`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async deleteRun(runId: string): Promise<DeletionJob> {
    return this.request<DeletionJob>(`/runs/${runId}/deletion`, {
      method: 'POST',
    });
  }

  async deleteFinding(runId: string, findingId: string): Promise<DeletionJob> {
    return this.request<DeletionJob>(`/runs/${runId}/findings/${findingId}/deletion`, {
      method: 'POST',
    });
  }

  async getExport(exportId: string): Promise<ExportJob> {
    return this.request<ExportJob>(`/exports/${exportId}`);
  }

  async listWorkflows(params?: { cursor?: string; q?: string }): Promise<WorkflowPage> {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.q) query.set('q', params.q);
    const qs = query.toString();
    return this.request<WorkflowPage>(`/workflows${qs ? `?${qs}` : ''}`);
  }

  async saveWorkflow(body: SaveWorkflow): Promise<Workflow> {
    return this.request<Workflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getWorkflow(workflowId: string): Promise<Workflow> {
    return this.request<Workflow>(`/workflows/${workflowId}`);
  }

  async proposeWorkflowVersion(workflowId: string, patch: WorkflowPatch): Promise<Workflow> {
    return this.request<Workflow>(`/workflows/${workflowId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async deleteWorkflow(workflowId: string): Promise<DeletionJob> {
    return this.request<DeletionJob>(`/workflows/${workflowId}`, {
      method: 'DELETE',
    });
  }

  async duplicateWorkflow(workflowId: string): Promise<Workflow> {
    return this.request<Workflow>(`/workflows/${workflowId}/duplicate`, {
      method: 'POST',
    });
  }

  async runWorkflow(workflowId: string, body: RunWorkflow): Promise<Run> {
    return this.request<Run>(`/workflows/${workflowId}/runs`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listRecipes(params?: { cursor?: string; site?: string }): Promise<RecipePage> {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.site) query.set('site', params.site);
    const qs = query.toString();
    return this.request<RecipePage>(`/recipes${qs ? `?${qs}` : ''}`);
  }

  async getRecipe(recipeId: string): Promise<Recipe> {
    return this.request<Recipe>(`/recipes/${recipeId}`);
  }

  async repairRecipe(recipeId: string, patch: { sampleUrl: string; selector: string; changeSummary: string }): Promise<Recipe> {
    return this.request<Recipe>(`/recipes/${recipeId}`, { method: 'PATCH', body: JSON.stringify(patch) });
  }

  async performRecipeAction(recipeId: string, action: RecipeAction): Promise<Recipe> {
    return this.request<Recipe>(`/recipes/${recipeId}/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  }

  async listSessions(): Promise<SiteSession[]> {
    return this.request<SiteSession[]>('/sessions');
  }

  async connectSite(domain: string): Promise<SessionConnection> {
    return this.request<SessionConnection>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
  }

  async finishSiteSessionConnection(connectionId: string): Promise<SiteSession> {
    return this.request<SiteSession>(`/sessions/connections/${connectionId}/finish`, {
      method: 'POST',
    });
  }

  async updateSiteSession(sessionId: string, expiryMode: 'no_expiry' | 'date', expiresAt?: string): Promise<SiteSession> {
    return this.request<SiteSession>(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ expiryMode, expiresAt }),
    });
  }

  async revokeSiteSession(sessionId: string): Promise<void> {
    await this.request<void>(`/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async listSentShares(): Promise<ShareGrant[]> {
    return this.request<ShareGrant[]>('/shares');
  }

  async createShare(body: CreateShare): Promise<ShareGrant> {
    return this.request<ShareGrant>('/shares', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async revokeShare(shareId: string): Promise<void> {
    await this.request<void>(`/shares/${shareId}`, {
      method: 'DELETE',
    });
  }

  async listSharedWithMe(): Promise<SharedPage> {
    return this.request<SharedPage>('/shared');
  }

  async getSharedItem(shareId: string): Promise<SharedItem> {
    return this.request<SharedItem>(`/shared/${shareId}`);
  }

  async getStorage(): Promise<Storage> {
    return this.request<Storage>('/storage');
  }

  async getDeletion(deletionId: string): Promise<DeletionJob> {
    return this.request<DeletionJob>(`/deletions/${deletionId}`);
  }

  async listInvitations(): Promise<Invitation[]> {
    return this.request<Invitation[]>('/admin/invitations');
  }

  async inviteUser(email: string, note?: string): Promise<Invitation> {
    return this.request<Invitation>('/admin/invitations', {
      method: 'POST',
      body: JSON.stringify({ email, note }),
    });
  }

  async resendInvitation(invitationId: string): Promise<Invitation> {
    return this.request<Invitation>(`/admin/invitations/${invitationId}/resend`, {
      method: 'POST',
    });
  }

  async revokeInvitation(invitationId: string): Promise<void> {
    await this.request<void>(`/admin/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  async listAdminWorkspaces(): Promise<AdminWorkspace[]> {
    return this.request<AdminWorkspace[]>('/admin/workspaces');
  }

  async getAdminWorkspace(workspaceId: string): Promise<AdminWorkspace> {
    return this.request<AdminWorkspace>(`/admin/workspaces/${workspaceId}`);
  }

  async requestAuditedSupportAccess(body: { workspaceId: string; purpose: string; itemId?: string }): Promise<SupportGrant> {
    return this.request<SupportGrant>('/admin/support-access', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getAuditedSupportItem(grantId: string, itemId: string): Promise<any> {
    return this.request<any>(`/admin/support-access/${grantId}/items/${itemId}`);
  }

  async listAccessAudit(): Promise<AuditPage> {
    return this.request<AuditPage>('/admin/access-audit');
  }
}
