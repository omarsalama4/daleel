/**
 * Daleel Frontend API Types
 * Derived strictly from api/openapi.yaml (OpenAPI 3.1.0) and Daleel UI/UX Specification v1.1
 */

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  traceId: string;
  retryable?: boolean;
  fieldErrors?: Record<string, string>;
}

export type RunMode = 'approval' | 'autonomous';

export interface Limits {
  domains: number; // 1-20
  pages: number; // 1-500
  depth: number; // 0-5
  minutes: number; // 1-20
  retriesPerPage: number; // 0-2
  downloadMb: number; // 1-100
}

export interface AiCaps {
  perRunUsd: number; // 0.00-0.25
  monthlyUsd: number; // 0.00-5.00
}

export interface Usage {
  period: string;
  aiReservedUsd: number;
  aiActualUsd: number;
  aiCapUsd: number;
  searchCredits: number | null;
  storageUsedMb: number;
  storageQuotaMb: number; // 500 MB
  nonAiCostNotice: string;
}

export interface Workspace {
  id: string;
  name: string;
  role: 'owner' | 'operator';
  dataRegion: string;
}

export interface CurrentAccount {
  account: {
    id: string;
    email: string;
    displayName?: string;
  };
  workspace: Workspace;
}

export interface Settings {
  workspace: Workspace;
  limits: Limits;
  ceilings: Limits;
  authenticatedContentAllowed: boolean;
  providers: {
    primary: 'groq';
    secondary: 'openrouter_free';
    paidRoutesEnabled: boolean;
    status?: 'available' | 'degraded' | 'unavailable' | 'unknown';
  };
  aiCaps: AiCaps;
}

export interface SettingsPatch {
  authenticatedContentAllowed?: boolean;
  monthlyAiUsd?: number;
}

export interface PlanField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  evidenceRule: string;
  enrichmentRule?: string;
}

export interface Plan {
  id: string;
  query: string;
  mode: RunMode;
  requestedCriteria?: string[];
  inferredCriteria?: string[];
  candidateDomains?: string[];
  fields: PlanField[];
  relevance: 'broad' | 'balanced' | 'strict';
  limits: Limits;
  aiEstimateUsd?: number;
  state: 'generating' | 'ready' | 'needs_clarification' | 'invalid' | 'discarded';
  createdAt: string;
}

export interface PlanPatch {
  requestedCriteria?: string[];
  inferredCriteria?: string[];
  candidateDomains?: string[];
  fields?: PlanField[];
  relevance?: 'broad' | 'balanced' | 'strict';
  limits?: Partial<Limits>;
}

export type RunStatus =
  | 'planning'
  | 'awaiting_approval'
  | 'queued'
  | 'running'
  | 'needs_attention'
  | 'pausing'
  | 'paused'
  | 'resuming'
  | 'complete'
  | 'partial'
  | 'failed'
  | 'cancelled';

export interface HumanGate {
  blocker: 'login_mfa' | 'captcha_bot_detector' | 'recipe_drift' | 'ai_cap_reached' | 'search_quota' | 'storage_quota';
  title: string;
  reason: string;
  targetSite?: string;
  safeActions: ('connect_site' | 'review_recipe' | 'skip_task' | 'stop')[];
}

export interface RunFindingCounts {
  total: number;
  relevant: number;
  incomplete: number;
  duplicate: number;
}

export interface RunUsageMetrics {
  domainsReached: number;
  pagesFetched: number;
  pagesDiscovered: number;
  pagesSkipped: number;
  pagesBlocked: number;
  pagesFailed: number;
  elapsedSeconds: number;
  downloadMb: number;
  aiSpendUsd: number;
  searchCreditsUsed?: number;
}

export interface Run {
  id: string;
  query: string;
  mode: RunMode;
  status: RunStatus;
  stopReason?: string | null;
  plan?: Plan;
  limits: Limits;
  usage?: RunUsageMetrics;
  findingCounts?: RunFindingCounts;
  sequence: number;
  activeGate?: HumanGate | null;
  workflowId?: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string | null;
}

export interface RunPage {
  items: Run[];
  nextCursor?: string | null;
}

export interface RunAction {
  action: 'pause' | 'resume' | 'cancel';
}

export interface CreateRun {
  query: string;
  mode: RunMode;
  relevance?: 'broad' | 'balanced' | 'strict';
  seedUrls?: string[];
  limits?: Partial<Limits>;
  aiUsageCapUsd?: number;
  workflowId?: string;
  selectedSessionDomain?: string;
}

export interface ActivityEvent {
  sequence: number;
  type: string;
  occurredAt: string;
  message: string;
  pageUrl?: string | null;
  safeAction?: string | null;
}

export interface ActivityPage {
  events: ActivityEvent[];
  latestSequence: number;
  run: Run;
}

export type EvidenceState = 'verified' | 'unknown' | 'unverified' | 'conflict';

export interface FieldValue {
  value: string;
  evidenceState: EvidenceState;
  evidenceIds: string[];
}

export interface Evidence {
  id: string;
  fieldKey: string;
  sourceUrl: string;
  fetchedAt: string;
  excerpt: string;
  language?: string | null;
  direction?: 'ltr' | 'rtl' | null;
  digest?: string;
  artifactAvailable?: boolean;
}

export interface FindingSummary {
  id: string;
  runId: string;
  values: Record<string, FieldValue>;
  relevance: {
    label: 'strong' | 'possible' | 'weak' | 'uncertain';
    reason: string;
  };
  status: 'relevant' | 'irrelevant' | 'incomplete' | 'unknown' | 'duplicate';
  sourceUrl: string;
  detailUrl?: string | null;
  evidenceCount: number;
  duplicateGroupId?: string | null;
}

export interface Finding extends FindingSummary {
  evidence: Evidence[];
  fetchedAt: string;
  language?: string | null;
  direction?: 'ltr' | 'rtl' | null;
}

export interface FindingPage {
  items: FindingSummary[];
  nextCursor?: string | null;
  fieldDefinitions: PlanField[];
  runStatus: RunStatus;
}

export interface FeedbackRequest {
  classification: 'relevant' | 'irrelevant' | 'incomplete' | 'incorrect';
  correction?: string | null;
  fieldKey?: string | null;
}

export interface Feedback extends FeedbackRequest {
  id: string;
  findingId: string;
  submittedAt: string;
}

export interface CoverageUrl {
  url: string;
  outcome: 'discovered' | 'fetched' | 'skipped' | 'failed' | 'blocked' | 'unprocessed';
  reason?: string | null;
  depth: number;
  attempts: number;
  httpStatus?: number | null;
}

export interface CoverageGraphNode {
  id: string;
  label: string;
  type: 'seed' | 'domain' | 'page';
  depth: number;
  status: string;
}

export interface CoverageGraphLink {
  source: string;
  target: string;
}

export interface CoveragePage {
  counts: Record<string, number>;
  urls: CoverageUrl[];
  nextCursor?: string | null;
  graph?: {
    nodes: CoverageGraphNode[];
    links: CoverageGraphLink[];
  };
}

export interface ExportRequest {
  format: 'csv' | 'json' | 'clean_text' | 'url_ledger';
  scope: 'filtered' | 'all' | 'selected';
  findingIds?: string[];
  includeEvidence?: boolean;
  includeRawArtifacts?: boolean;
}

export interface ExportJob {
  id: string;
  state: 'generating' | 'ready' | 'failed';
  downloadUrl?: string;
  contentSnippet?: string;
  expiresAt: string;
  createdAt: string;
}

export interface SaveWorkflow {
  runId: string;
  name: string;
}

export interface WorkflowVersion {
  version: number;
  savedAt: string;
  author: string;
  changeSummary: string;
  plan: Plan;
}

export interface Workflow {
  id: string;
  name: string;
  currentVersion: number;
  versions: WorkflowVersion[];
  sharedReadOnly?: boolean;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus?: RunStatus;
}

export interface WorkflowPatch {
  name?: string;
  changeSummary: string;
  plan: Plan;
}

export interface WorkflowPage {
  items: Workflow[];
  nextCursor?: string | null;
}

export interface RunWorkflow {
  mode: RunMode;
  limits?: Partial<Limits>;
  aiUsageCapUsd?: number;
}

export type RecipeStatus = 'draft' | 'previewed' | 'approved' | 'active' | 'needs_review' | 'retired';

export interface RecipeStep {
  order: number;
  type: 'navigate' | 'wait_for' | 'expand' | 'paginate' | 'extract';
  target: string;
  description: string;
}

export interface RecipeValidation {
  samplePages: string[];
  lastValidatedAt?: string;
  outcome: 'passed' | 'failed' | 'pending';
  stepResults?: { stepOrder: number; success: boolean; message?: string }[];
  driftDetected?: boolean;
  driftReason?: string;
}

export interface Recipe {
  id: string;
  site: string;
  task: string;
  version: number;
  status: RecipeStatus;
  actions: RecipeStep[];
  validation: RecipeValidation;
  codeExportAvailable: boolean;
  codeSnippet?: string;
  linkedWorkflowId?: string;
}

export interface RecipePage {
  items: Recipe[];
  nextCursor?: string | null;
}

export interface RecipeAction {
  action: 'preview' | 'replay' | 'approve' | 'retire';
}

export type SessionStatus = 'connecting' | 'active' | 'expired' | 'needs_attention' | 'revoked' | 'unavailable';

export interface SiteSession {
  id: string;
  domain: string;
  status: SessionStatus;
  expiryMode: 'no_expiry' | 'date';
  expiresAt?: string | null;
  lastValidatedAt: string;
  connectedAt: string;
}

export interface SessionConnection {
  id: string;
  domain: string;
  browserUrl: string;
  state: 'awaiting_user_login' | 'connected' | 'failed';
  expiresAt: string;
}

export interface CreateShare {
  recipientUserId: string;
  resourceType: 'finding' | 'workflow';
  resourceId: string;
}

export interface ShareGrant {
  id: string;
  recipientUserId: string;
  recipientEmail?: string;
  resourceType: 'finding' | 'workflow';
  resourceId: string;
  resourceTitle?: string;
  state: 'active' | 'revoked';
  access: 'view_only';
  createdAt: string;
  revokedAt?: string | null;
}

export interface SharedItem {
  shareId: string;
  resourceType: 'finding' | 'workflow';
  resourceId: string;
  viewOnly: boolean;
  payload: any;
  sessionStateIncluded: false;
  privateRunHistoryIncluded: false;
}

export interface SharedPage {
  items: ShareGrant[];
  nextCursor?: string | null;
}

export interface Storage {
  usedMb: number;
  quotaMb: number; // 500 MB
  warningAtPercent: number; // 80 %
  categories: {
    resultsMb: number;
    evidenceArtifactsMb: number;
    workflowsMb: number;
    runHistoryMb: number;
    sessionsMb: number;
  };
}

export interface DeletionJob {
  id: string;
  state: 'queued' | 'in_progress' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string | null;
  scope: string;
  backupExpiryAt: string;
  tracePurgeState: string;
}

export interface Invitation {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  deliveryState: 'delivered' | 'queued' | 'failed';
  createdAt: string;
  note?: string;
}

export interface InvitationPreview {
  email: string;
  inviterDisplayName?: string;
  status: 'valid' | 'accepted' | 'expired' | 'revoked' | 'invalid';
  expiresAt: string;
}

export interface AdminWorkspace {
  id: string;
  ownerEmail: string;
  operationalState: 'healthy' | 'needs_attention' | 'quota_restricted';
  activeRuns: number;
  pausedRuns: number;
  lastRunAt?: string;
  storageUsedMb: number;
  privateContentReturned: boolean;
}

export interface SupportGrant {
  id: string;
  auditEventId: string;
  workspaceId: string;
  itemId?: string;
  purpose: string;
  operatorEmail: string;
  expiresAt: string;
  access: 'view_only';
  secretsAccessible: false;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actorEmail: string;
  workspaceId: string;
  itemId?: string;
  purpose: string;
  outcome: 'granted' | 'denied' | 'expired' | 'revoked';
  occurredAt: string;
}

export interface AuditPage {
  items: AuditEvent[];
  nextCursor?: string | null;
}
