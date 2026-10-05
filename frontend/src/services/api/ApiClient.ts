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

export interface ApiClient {
  // Account & Invitations
  getInvitationPreview(inviteToken: string): Promise<InvitationPreview>;
  claimInvitation(inviteToken: string, idempotencyKey?: string): Promise<CurrentAccount>;
  getCurrentAccount(): Promise<CurrentAccount>;

  // Settings & Usage
  getSettings(): Promise<Settings>;
  updateSettings(patch: SettingsPatch): Promise<Settings>;
  getUsage(): Promise<Usage>;

  // Runs
  listRuns(params?: { cursor?: string; pageSize?: number; status?: string; q?: string }): Promise<RunPage>;
  createRun(body: CreateRun, idempotencyKey?: string): Promise<Run>;
  getRun(runId: string): Promise<Run>;
  getRunPlan(runId: string): Promise<Plan>;
  editRunPlan(runId: string, patch: PlanPatch): Promise<Plan>;
  approveRun(runId: string): Promise<Run>;
  performRunAction(runId: string, action: RunAction): Promise<Run>;
  getRunActivity(runId: string, cursor?: number): Promise<ActivityPage>;
  listFindings(runId: string, params?: { cursor?: string; pageSize?: number; status?: string; minRelevance?: string }): Promise<FindingPage>;
  getFinding(runId: string, findingId: string): Promise<Finding>;
  submitFindingFeedback(runId: string, findingId: string, feedback: FeedbackRequest): Promise<Feedback>;
  getRunCoverage(runId: string, cursor?: string): Promise<CoveragePage>;
  createRunExport(runId: string, request: ExportRequest): Promise<ExportJob>;
  deleteRun(runId: string): Promise<DeletionJob>;
  deleteFinding(runId: string, findingId: string): Promise<DeletionJob>;

  // Exports
  getExport(exportId: string): Promise<ExportJob>;

  // Workflows
  listWorkflows(params?: { cursor?: string; q?: string }): Promise<WorkflowPage>;
  saveWorkflow(body: SaveWorkflow): Promise<Workflow>;
  getWorkflow(workflowId: string): Promise<Workflow>;
  proposeWorkflowVersion(workflowId: string, patch: WorkflowPatch): Promise<Workflow>;
  deleteWorkflow(workflowId: string): Promise<DeletionJob>;
  duplicateWorkflow(workflowId: string): Promise<Workflow>;
  runWorkflow(workflowId: string, body: RunWorkflow): Promise<Run>;

  // Recipes
  listRecipes(params?: { cursor?: string; site?: string }): Promise<RecipePage>;
  getRecipe(recipeId: string): Promise<Recipe>;
  performRecipeAction(recipeId: string, action: RecipeAction): Promise<Recipe>;

  // Sessions
  listSessions(): Promise<SiteSession[]>;
  connectSite(domain: string): Promise<SessionConnection>;
  finishSiteSessionConnection(connectionId: string): Promise<SiteSession>;
  updateSiteSession(sessionId: string, expiryMode: 'no_expiry' | 'date', expiresAt?: string): Promise<SiteSession>;
  revokeSiteSession(sessionId: string): Promise<void>;

  // Sharing
  listSentShares(): Promise<ShareGrant[]>;
  createShare(body: CreateShare): Promise<ShareGrant>;
  revokeShare(shareId: string): Promise<void>;
  listSharedWithMe(): Promise<SharedPage>;
  getSharedItem(shareId: string): Promise<SharedItem>;

  // Storage & Deletion
  getStorage(): Promise<Storage>;
  getDeletion(deletionId: string): Promise<DeletionJob>;

  // Admin
  listInvitations(): Promise<Invitation[]>;
  inviteUser(email: string, note?: string): Promise<Invitation>;
  resendInvitation(invitationId: string): Promise<Invitation>;
  revokeInvitation(invitationId: string): Promise<void>;
  listAdminWorkspaces(): Promise<AdminWorkspace[]>;
  getAdminWorkspace(workspaceId: string): Promise<AdminWorkspace>;
  requestAuditedSupportAccess(body: { workspaceId: string; purpose: string; itemId?: string }): Promise<SupportGrant>;
  getAuditedSupportItem(grantId: string, itemId: string): Promise<any>;
  listAccessAudit(): Promise<AuditPage>;
}
