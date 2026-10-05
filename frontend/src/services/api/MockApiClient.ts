import type { ApiClient } from './ApiClient';
import type {
  ActivityEvent,
  ActivityPage,
  AdminWorkspace,
  AuditEvent,
  AuditPage,
  CoveragePage,
  CoverageUrl,
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
  FindingSummary,
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

const STANDARD_LIMITS = {
  domains: 20,
  pages: 500,
  depth: 5,
  minutes: 20,
  retriesPerPage: 2,
  downloadMb: 100,
};

const JOB_FIELDS = [
  { key: 'title', label: 'Job title', type: 'string', required: true, evidenceRule: 'Exact title from posting header' },
  { key: 'employer', label: 'Employer', type: 'string', required: true, evidenceRule: 'Verified company or organization name' },
  { key: 'location', label: 'Location', type: 'string', required: true, evidenceRule: 'Location string from posting' },
  { key: 'arrangement', label: 'Work arrangement', type: 'string', required: true, evidenceRule: 'Remote, Hybrid, or On-site mention' },
  { key: 'salary', label: 'Compensation', type: 'string', required: false, evidenceRule: 'Explicit salary range or rate' },
  { key: 'postedDate', label: 'Posted date', type: 'string', required: false, evidenceRule: 'ISO or textual posting date' },
  { key: 'applicationUrl', label: 'Application link', type: 'string', required: false, evidenceRule: 'Direct apply URL or ATS destination' },
  { key: 'skills', label: 'Key skills', type: 'string', required: false, evidenceRule: 'Extracted modeling and systems criteria' },
];

export class MockApiClient implements ApiClient {
  private runs: Map<string, Run> = new Map();
  private findings: Map<string, Finding[]> = new Map();
  private plans: Map<string, Plan> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private recipes: Map<string, Recipe> = new Map();
  private sessions: Map<string, SiteSession> = new Map();
  private sentShares: Map<string, ShareGrant> = new Map();
  private invitations: Map<string, Invitation> = new Map();
  private auditEvents: AuditEvent[] = [];
  private settings: Settings;
  private usage: Usage;
  private storage: Storage;

  constructor() {
    this.settings = {
      workspace: {
        id: 'ws_personal_8820',
        name: 'Personal Workspace',
        role: 'owner',
        dataRegion: 'aws-us-east-1 (Cloud Run)',
      },
      limits: { ...STANDARD_LIMITS },
      ceilings: { ...STANDARD_LIMITS },
      authenticatedContentAllowed: false,
      providers: {
        primary: 'groq',
        secondary: 'openrouter_free',
        paidRoutesEnabled: false,
        status: 'available',
      },
      aiCaps: {
        perRunUsd: 0.25,
        monthlyUsd: 5.0,
      },
    };

    this.usage = {
      period: '2026-10 (Current Month)',
      aiReservedUsd: 0.12,
      aiActualUsd: 0.94,
      aiCapUsd: 5.0,
      searchCredits: 3850,
      storageUsedMb: 142.5,
      storageQuotaMb: 500,
      nonAiCostNotice: 'Search quota and hosting storage are distinct from AI model spend.',
    };

    this.storage = {
      usedMb: 142.5,
      quotaMb: 500,
      warningAtPercent: 80,
      categories: {
        resultsMb: 42.1,
        evidenceArtifactsMb: 76.4,
        workflowsMb: 2.8,
        runHistoryMb: 18.2,
        sessionsMb: 3.0,
      },
    };

    this.seedMockData();
  }

  private seedMockData() {
    // Seed Reference Plan
    const plan1: Plan = {
      id: 'plan_ai_engineer_ref',
      query: 'Find AI Engineer opportunities in London and Remote with focus on agentic LLM systems',
      mode: 'approval',
      requestedCriteria: ['Role: AI Engineer', 'Locations: London, Remote', 'Focus: Agentic LLM systems'],
      inferredCriteria: ['Filter out sales or recruiter postings', 'Enrich with detail-page compensation and requirements'],
      candidateDomains: ['boards.greenhouse.io', 'jobs.lever.co', 'workable.com', 'careers.google.com'],
      fields: [...JOB_FIELDS],
      relevance: 'balanced',
      limits: { ...STANDARD_LIMITS },
      aiEstimateUsd: 0.08,
      state: 'ready',
      createdAt: '2026-10-05T14:10:00Z',
    };
    this.plans.set(plan1.id, plan1);

    // Seed Run 1: Active Run with Human Gate (Needs Attention)
    const run1: Run = {
      id: 'run_active_gate_01',
      query: 'Find Senior AI Engineer roles in applied agentic workflows',
      mode: 'approval',
      status: 'needs_attention',
      stopReason: null,
      plan: plan1,
      limits: { ...STANDARD_LIMITS },
      usage: {
        domainsReached: 7,
        pagesFetched: 64,
        pagesDiscovered: 98,
        pagesSkipped: 16,
        pagesBlocked: 3,
        pagesFailed: 0,
        elapsedSeconds: 195,
        downloadMb: 28.4,
        aiSpendUsd: 0.09,
        searchCreditsUsed: 42,
      },
      findingCounts: {
        total: 12,
        relevant: 9,
        incomplete: 2,
        duplicate: 1,
      },
      sequence: 48,
      activeGate: {
        blocker: 'login_mfa',
        title: 'Target site requires Owner sign-in session',
        reason: 'Site https://wellfound.com/jobs requires an active user session to view full engineer compensation and direct application link.',
        targetSite: 'wellfound.com',
        safeActions: ['connect_site', 'skip_task', 'stop'],
      },
      workflowId: null,
      createdAt: '2026-10-05T15:30:00Z',
      updatedAt: '2026-10-05T15:34:20Z',
    };
    this.runs.set(run1.id, run1);

    // Seed Run 2: Completed Reference Run
    const run2: Run = {
      id: 'run_complete_ref_02',
      query: 'Find AI Engineer opportunities with LLM agents focus',
      mode: 'autonomous',
      status: 'complete',
      stopReason: 'Finished all discovered in-scope frontier within limits',
      plan: plan1,
      limits: { ...STANDARD_LIMITS, pages: 150 },
      usage: {
        domainsReached: 12,
        pagesFetched: 118,
        pagesDiscovered: 150,
        pagesSkipped: 26,
        pagesBlocked: 4,
        pagesFailed: 2,
        elapsedSeconds: 412,
        downloadMb: 52.8,
        aiSpendUsd: 0.14,
        searchCreditsUsed: 96,
      },
      findingCounts: {
        total: 16,
        relevant: 13,
        incomplete: 2,
        duplicate: 1,
      },
      sequence: 120,
      activeGate: null,
      workflowId: 'wf_ai_opps_scanner',
      createdAt: '2026-10-04T10:00:00Z',
      updatedAt: '2026-10-04T10:08:30Z',
      finishedAt: '2026-10-04T10:08:30Z',
    };
    this.runs.set(run2.id, run2);

    // Seed Run 3: Partial Run with Rate-limit stop
    const run3: Run = {
      id: 'run_partial_03',
      query: 'Scrape competitive benchmarks for multi-agent retrieval frameworks',
      mode: 'approval',
      status: 'partial',
      stopReason: 'Standard 20-minute run timeout elapsed; all 14 completed findings retained.',
      plan: plan1,
      limits: { ...STANDARD_LIMITS, minutes: 5 },
      usage: {
        domainsReached: 18,
        pagesFetched: 240,
        pagesDiscovered: 390,
        pagesSkipped: 110,
        pagesBlocked: 12,
        pagesFailed: 4,
        elapsedSeconds: 300,
        downloadMb: 78.1,
        aiSpendUsd: 0.22,
        searchCreditsUsed: 140,
      },
      findingCounts: {
        total: 14,
        relevant: 11,
        incomplete: 3,
        duplicate: 0,
      },
      sequence: 95,
      activeGate: null,
      createdAt: '2026-10-03T16:20:00Z',
      updatedAt: '2026-10-03T16:25:00Z',
      finishedAt: '2026-10-03T16:25:00Z',
    };
    this.runs.set(run3.id, run3);

    // Seed Findings for run2
    const findingsRun2: Finding[] = [
      {
        id: 'fnd_deepmind_01',
        runId: run2.id,
        values: {
          title: { value: 'Senior Applied AI Engineer (Agents & Tools)', evidenceState: 'verified', evidenceIds: ['ev_dm_1'] },
          employer: { value: 'Google DeepMind', evidenceState: 'verified', evidenceIds: ['ev_dm_2'] },
          location: { value: 'London, UK', evidenceState: 'verified', evidenceIds: ['ev_dm_3'] },
          arrangement: { value: 'Hybrid (3 days on-site)', evidenceState: 'verified', evidenceIds: ['ev_dm_4'] },
          salary: { value: '£140,000 - £175,000 + equity + bonus', evidenceState: 'verified', evidenceIds: ['ev_dm_5'] },
          postedDate: { value: '2026-10-01', evidenceState: 'verified', evidenceIds: ['ev_dm_6'] },
          applicationUrl: { value: 'https://deepmind.google/careers/senior-applied-ai-engineer-london', evidenceState: 'verified', evidenceIds: ['ev_dm_7'] },
          skills: { value: 'Agentic loops, tool use, eval harnesses, Python, Rust', evidenceState: 'verified', evidenceIds: ['ev_dm_8'] },
        },
        relevance: {
          label: 'strong',
          reason: 'Matches AI Engineer title, London location, and explicit agentic orchestration responsibilities.',
        },
        status: 'relevant',
        sourceUrl: 'https://deepmind.google/careers',
        detailUrl: 'https://deepmind.google/careers/senior-applied-ai-engineer-london',
        evidenceCount: 8,
        duplicateGroupId: null,
        evidence: [
          {
            id: 'ev_dm_1',
            fieldKey: 'title',
            sourceUrl: 'https://deepmind.google/careers/senior-applied-ai-engineer-london',
            fetchedAt: '2026-10-04T10:03:12Z',
            excerpt: 'Role: Senior Applied AI Engineer (Agents & Tools) — DeepMind Applied Science team.',
            language: 'en',
            direction: 'ltr',
            digest: 'sha256:7f83b1657ff1...',
          },
          {
            id: 'ev_dm_5',
            fieldKey: 'salary',
            sourceUrl: 'https://deepmind.google/careers/senior-applied-ai-engineer-london',
            fetchedAt: '2026-10-04T10:03:12Z',
            excerpt: 'Base salary compensation: £140,000 - £175,000 depending on seniority, plus equity award.',
            language: 'en',
            direction: 'ltr',
            digest: 'sha256:8b417c802aa9...',
          },
        ],
        fetchedAt: '2026-10-04T10:03:12Z',
        language: 'en',
        direction: 'ltr',
      },
      {
        id: 'fnd_anthropic_02',
        runId: run2.id,
        values: {
          title: { value: 'AI Workflow & Automation Engineer', evidenceState: 'verified', evidenceIds: ['ev_ant_1'] },
          employer: { value: 'Anthropic', evidenceState: 'verified', evidenceIds: ['ev_ant_2'] },
          location: { value: 'Remote (UK / US timezone)', evidenceState: 'verified', evidenceIds: ['ev_ant_3'] },
          arrangement: { value: 'Fully Remote', evidenceState: 'verified', evidenceIds: ['ev_ant_4'] },
          salary: { value: '$190,000 - $240,000', evidenceState: 'verified', evidenceIds: ['ev_ant_5'] },
          postedDate: { value: '2026-09-29', evidenceState: 'verified', evidenceIds: ['ev_ant_6'] },
          applicationUrl: { value: 'https://jobs.lever.co/anthropic/ai-workflow-engineer', evidenceState: 'verified', evidenceIds: ['ev_ant_7'] },
          skills: { value: 'Claude SDK, agent reliability, guardrails, TypeScript', evidenceState: 'verified', evidenceIds: ['ev_ant_8'] },
        },
        relevance: {
          label: 'strong',
          reason: 'Explicitly focuses on AI workflow automation and remote role criteria.',
        },
        status: 'relevant',
        sourceUrl: 'https://jobs.lever.co/anthropic',
        detailUrl: 'https://jobs.lever.co/anthropic/ai-workflow-engineer',
        evidenceCount: 8,
        duplicateGroupId: null,
        evidence: [
          {
            id: 'ev_ant_1',
            fieldKey: 'title',
            sourceUrl: 'https://jobs.lever.co/anthropic/ai-workflow-engineer',
            fetchedAt: '2026-10-04T10:04:15Z',
            excerpt: 'Position: AI Workflow & Automation Engineer at Anthropic. Remote eligible.',
            language: 'en',
            direction: 'ltr',
            digest: 'sha256:91cbf82a0194...',
          },
        ],
        fetchedAt: '2026-10-04T10:04:15Z',
        language: 'en',
        direction: 'ltr',
      },
      {
        id: 'fnd_arabic_mawdoo3_03',
        runId: run2.id,
        values: {
          title: { value: 'مهندس ذكاء اصطناعي وتطبيقات نماذج لغوية (Lead AI Engineer)', evidenceState: 'verified', evidenceIds: ['ev_maw_1'] },
          employer: { value: 'موضوع (Mawdoo3 AI Lab)', evidenceState: 'verified', evidenceIds: ['ev_maw_2'] },
          location: { value: 'عَمّان / عن بُعد (Amman & Remote)', evidenceState: 'verified', evidenceIds: ['ev_maw_3'] },
          arrangement: { value: 'عن بُعد (Remote)', evidenceState: 'verified', evidenceIds: ['ev_maw_4'] },
          salary: { value: 'غير محدد (Competitive / Dependent on experience)', evidenceState: 'unknown', evidenceIds: [] },
          postedDate: { value: '2026-10-02', evidenceState: 'verified', evidenceIds: ['ev_maw_5'] },
          applicationUrl: { value: 'https://mawdoo3.com/careers/lead-ai-engineer', evidenceState: 'verified', evidenceIds: ['ev_maw_6'] },
          skills: { value: 'معالجة اللغات الطبيعية العربية، أطر العمل الوكيلة، بناء نماذج RAG المتطورة', evidenceState: 'verified', evidenceIds: ['ev_maw_7'] },
        },
        relevance: {
          label: 'strong',
          reason: 'Matches AI Engineer focus on language models and autonomous agent workflows.',
        },
        status: 'relevant',
        sourceUrl: 'https://mawdoo3.com/careers',
        detailUrl: 'https://mawdoo3.com/careers/lead-ai-engineer',
        evidenceCount: 7,
        duplicateGroupId: null,
        evidence: [
          {
            id: 'ev_maw_1',
            fieldKey: 'title',
            sourceUrl: 'https://mawdoo3.com/careers/lead-ai-engineer',
            fetchedAt: '2026-10-04T10:05:44Z',
            excerpt: 'الوظيفة: مهندس ذكاء اصطناعي وتطبيقات نماذج لغوية كبيرة للعمل على تطوير خطوط الإنتاج الذكية والوكلاء الآليين.',
            language: 'ar',
            direction: 'rtl',
            digest: 'sha256:d82e18bc0491...',
          },
          {
            id: 'ev_maw_7',
            fieldKey: 'skills',
            sourceUrl: 'https://mawdoo3.com/careers/lead-ai-engineer',
            fetchedAt: '2026-10-04T10:05:44Z',
            excerpt: 'المتطلبات: خبرة عميقة في تقنيات الاسترجاع المعزز بالتوليد (RAG)، أطر عمل ReAct، ودمج أدوات التفتيش والبحث الدلالي.',
            language: 'ar',
            direction: 'rtl',
            digest: 'sha256:4a01c77bb219...',
          },
        ],
        fetchedAt: '2026-10-04T10:05:44Z',
        language: 'ar',
        direction: 'rtl',
      },
      {
        id: 'fnd_incomplete_stripe_04',
        runId: run2.id,
        values: {
          title: { value: 'Staff AI Systems Engineer', evidenceState: 'verified', evidenceIds: ['ev_str_1'] },
          employer: { value: 'Stripe', evidenceState: 'verified', evidenceIds: ['ev_str_2'] },
          location: { value: 'London, UK', evidenceState: 'verified', evidenceIds: ['ev_str_3'] },
          arrangement: { value: 'Unknown', evidenceState: 'unknown', evidenceIds: [] },
          salary: { value: 'Unknown', evidenceState: 'unknown', evidenceIds: [] },
          postedDate: { value: '2026-09-30', evidenceState: 'verified', evidenceIds: ['ev_str_4'] },
          applicationUrl: { value: 'https://stripe.com/jobs/listings/staff-ai-engineer', evidenceState: 'unverified', evidenceIds: [] },
          skills: { value: 'Unknown (Detail page blocked)', evidenceState: 'unknown', evidenceIds: [] },
        },
        relevance: {
          label: 'possible',
          reason: 'Title and location match, but detail enrichment page encountered rate barrier.',
        },
        status: 'incomplete',
        sourceUrl: 'https://stripe.com/jobs',
        detailUrl: 'https://stripe.com/jobs/listings/staff-ai-engineer',
        evidenceCount: 3,
        duplicateGroupId: null,
        evidence: [
          {
            id: 'ev_str_1',
            fieldKey: 'title',
            sourceUrl: 'https://stripe.com/jobs',
            fetchedAt: '2026-10-04T10:06:01Z',
            excerpt: 'Listing snippet: Staff AI Systems Engineer - London office.',
            language: 'en',
            direction: 'ltr',
            digest: 'sha256:33cf1028ba49...',
          },
        ],
        fetchedAt: '2026-10-04T10:06:01Z',
        language: 'en',
        direction: 'ltr',
      },
      {
        id: 'fnd_duplicate_synthesia_05',
        runId: run2.id,
        values: {
          title: { value: 'Senior AI Engineer - Video Generation & Agents', evidenceState: 'verified', evidenceIds: ['ev_syn_1'] },
          employer: { value: 'Synthesia', evidenceState: 'verified', evidenceIds: ['ev_syn_2'] },
          location: { value: 'London, UK', evidenceState: 'verified', evidenceIds: ['ev_syn_3'] },
          arrangement: { value: 'Hybrid', evidenceState: 'verified', evidenceIds: ['ev_syn_4'] },
          salary: { value: '£120,000 - £150,000', evidenceState: 'verified', evidenceIds: ['ev_syn_5'] },
          postedDate: { value: '2026-10-03', evidenceState: 'verified', evidenceIds: ['ev_syn_6'] },
          applicationUrl: { value: 'https://boards.greenhouse.io/synthesia/jobs/48201', evidenceState: 'verified', evidenceIds: ['ev_syn_7'] },
          skills: { value: 'PyTorch, generative models, inference pipelines', evidenceState: 'verified', evidenceIds: ['ev_syn_8'] },
        },
        relevance: {
          label: 'strong',
          reason: 'Matches AI Engineer criteria in London; cross-referenced and merged with identical posting on LinkedIn.',
        },
        status: 'duplicate',
        sourceUrl: 'https://boards.greenhouse.io/synthesia/jobs/48201',
        detailUrl: 'https://boards.greenhouse.io/synthesia/jobs/48201',
        evidenceCount: 6,
        duplicateGroupId: 'dup_grp_synthesia_01',
        evidence: [
          {
            id: 'ev_syn_1',
            fieldKey: 'title',
            sourceUrl: 'https://boards.greenhouse.io/synthesia/jobs/48201',
            fetchedAt: '2026-10-04T10:07:20Z',
            excerpt: 'Synthesia Careers: Senior AI Engineer - Video Generation & Agents (London HQ).',
            language: 'en',
            direction: 'ltr',
            digest: 'sha256:cc1048f0291a...',
          },
        ],
        fetchedAt: '2026-10-04T10:07:20Z',
        language: 'en',
        direction: 'ltr',
      },
    ];
    this.findings.set(run2.id, findingsRun2);
    this.findings.set(run1.id, findingsRun2.slice(0, 3));
    this.findings.set(run3.id, findingsRun2.slice(1, 4));

    // Seed Saved Workflows
    const wf1: Workflow = {
      id: 'wf_ai_opps_scanner',
      name: 'AI Engineer Opportunity Scanner',
      currentVersion: 2,
      versions: [
        {
          version: 1,
          savedAt: '2026-09-30T11:00:00Z',
          author: 'Omar Salama',
          changeSummary: 'Initial verified template for Greenhouse and Lever opportunity extraction.',
          plan: plan1,
        },
        {
          version: 2,
          savedAt: '2026-10-04T11:30:00Z',
          author: 'Omar Salama',
          changeSummary: 'Added Arabic job board search strategy and compensation field enrichment.',
          plan: {
            ...plan1,
            requestedCriteria: [...(plan1.requestedCriteria || []), 'Multilingual Arabic extraction allowed'],
          },
        },
      ],
      sharedReadOnly: false,
      updatedAt: '2026-10-04T11:30:00Z',
      lastRunAt: '2026-10-04T10:08:30Z',
      lastRunStatus: 'complete',
    };
    this.workflows.set(wf1.id, wf1);

    const wf2: Workflow = {
      id: 'wf_multilingual_digest',
      name: 'Bilingual Tech Intelligence Monitor',
      currentVersion: 1,
      versions: [
        {
          version: 1,
          savedAt: '2026-10-02T16:00:00Z',
          author: 'Omar Salama',
          changeSummary: 'Track Arabic and English AI startup releases across MENA.',
          plan: plan1,
        },
      ],
      sharedReadOnly: false,
      updatedAt: '2026-10-02T16:00:00Z',
      lastRunAt: '2026-10-03T16:25:00Z',
      lastRunStatus: 'partial',
    };
    this.workflows.set(wf2.id, wf2);

    // Seed Recipes
    const recipe1: Recipe = {
      id: 'rcp_greenhouse_01',
      site: 'boards.greenhouse.io',
      task: 'Extract structured role metadata and job requirements',
      version: 3,
      status: 'active',
      actions: [
        { order: 1, type: 'navigate', target: 'https://boards.greenhouse.io/{company}', description: 'Navigate to target organization greenhouse board' },
        { order: 2, type: 'wait_for', target: '#content .opening', description: 'Ensure job listing container is mounted in DOM' },
        { order: 3, type: 'expand', target: 'button[data-toggle="department"]', description: 'Expand collapsed department sections' },
        { order: 4, type: 'paginate', target: 'a.next-page', description: 'Traverse paginated listing links up to depth 3' },
        { order: 5, type: 'extract', target: '.job-post-content', description: 'Collect role title, location, compensation, and description' },
      ],
      validation: {
        samplePages: [
          'https://boards.greenhouse.io/synthesia/jobs/48201',
          'https://boards.greenhouse.io/elevenlabs/jobs/19402',
        ],
        lastValidatedAt: '2026-10-04T12:00:00Z',
        outcome: 'passed',
        stepResults: [
          { stepOrder: 1, success: true, message: 'Navigation completed in 340ms' },
          { stepOrder: 2, success: true, message: 'DOM node #content .opening verified' },
          { stepOrder: 3, success: true, message: 'Expanded 4 department groups' },
          { stepOrder: 4, success: true, message: 'Pagination boundary obeyed (3 pages)' },
          { stepOrder: 5, success: true, message: 'All 8 required fields mapped with evidence' },
        ],
        driftDetected: false,
      },
      codeExportAvailable: true,
      codeSnippet: `// Daleel Generated Playwright Recipe: boards.greenhouse.io
import { chromium } from 'playwright';

export async function extractGreenhouseOpportunities(boardUrl: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(boardUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.opening', { timeout: 10000 });
  const openings = await page.$$eval('.opening', (nodes) =>
    nodes.map((node) => ({
      title: node.querySelector('a')?.textContent?.trim(),
      location: node.querySelector('.location')?.textContent?.trim(),
      url: node.querySelector('a')?.href,
    }))
  );
  await browser.close();
  return openings;
}`,
      linkedWorkflowId: 'wf_ai_opps_scanner',
    };
    this.recipes.set(recipe1.id, recipe1);

    const recipe2: Recipe = {
      id: 'rcp_lever_02',
      site: 'jobs.lever.co',
      task: 'Extract remote engineering role requirements',
      version: 2,
      status: 'needs_review',
      actions: [
        { order: 1, type: 'navigate', target: 'https://jobs.lever.co/{company}', description: 'Open Lever company board' },
        { order: 2, type: 'wait_for', target: '.postings-group', description: 'Wait for postings group element' },
        { order: 3, type: 'extract', target: '.posting-apply', description: 'Extract application parameters' },
      ],
      validation: {
        samplePages: ['https://jobs.lever.co/anthropic/ai-workflow-engineer'],
        lastValidatedAt: '2026-10-05T08:15:00Z',
        outcome: 'failed',
        stepResults: [
          { stepOrder: 1, success: true },
          { stepOrder: 2, success: false, message: 'Selector .postings-group not found; site updated HTML layout.' },
          { stepOrder: 3, success: false, message: 'Extraction skipped due to step 2 failure.' },
        ],
        driftDetected: true,
        driftReason: 'Target site modified postings container class names from .postings-group to data-qa="posting-group". Review and re-approve required.',
      },
      codeExportAvailable: true,
      linkedWorkflowId: 'wf_ai_opps_scanner',
    };
    this.recipes.set(recipe2.id, recipe2);

    // Seed Site Sessions
    const session1: SiteSession = {
      id: 'sess_wellfound_01',
      domain: 'wellfound.com',
      status: 'active',
      expiryMode: 'no_expiry',
      expiresAt: null,
      lastValidatedAt: '2026-10-05T14:00:00Z',
      connectedAt: '2026-10-02T09:30:00Z',
    };
    this.sessions.set(session1.id, session1);

    const session2: SiteSession = {
      id: 'sess_linkedin_02',
      domain: 'linkedin.com',
      status: 'needs_attention',
      expiryMode: 'no_expiry',
      expiresAt: null,
      lastValidatedAt: '2026-10-05T15:30:00Z',
      connectedAt: '2026-09-28T12:00:00Z',
    };
    this.sessions.set(session2.id, session2);

    // Seed Sent Shares
    const share1: ShareGrant = {
      id: 'shr_finding_dm_01',
      recipientUserId: 'usr_friend_karim',
      recipientEmail: 'karim@daleel-beta.com',
      resourceType: 'finding',
      resourceId: 'fnd_deepmind_01',
      resourceTitle: 'Senior Applied AI Engineer (DeepMind)',
      state: 'active',
      access: 'view_only',
      createdAt: '2026-10-04T14:20:00Z',
      revokedAt: null,
    };
    this.sentShares.set(share1.id, share1);

    // Seed Operator Invitations
    const inv1: Invitation = {
      id: 'inv_beta_001',
      email: 'karim@daleel-beta.com',
      status: 'accepted',
      expiresAt: '2026-10-08T00:00:00Z',
      deliveryState: 'delivered',
      createdAt: '2026-10-01T10:00:00Z',
      note: 'Colleague on AI research collaboration',
    };
    const inv2: Invitation = {
      id: 'inv_beta_002',
      email: 'nour@research-lab.org',
      status: 'pending',
      expiresAt: '2026-10-12T16:00:00Z',
      deliveryState: 'delivered',
      createdAt: '2026-10-05T16:00:00Z',
      note: 'NLP researcher cohort',
    };
    this.invitations.set(inv1.id, inv1);
    this.invitations.set(inv2.id, inv2);

    // Seed Audit Events
    this.auditEvents.push({
      id: 'aud_op_001',
      actorId: 'usr_operator_daleel_2026',
      actorEmail: 'operator@daleel.ai',
      workspaceId: 'ws_personal_8820',
      itemId: 'run_active_gate_01',
      purpose: 'Investigate human attention gate stalled state reported by owner',
      outcome: 'granted',
      occurredAt: '2026-10-05T16:15:00Z',
    });
  }

  // Account & Invitations
  async getInvitationPreview(inviteToken: string): Promise<InvitationPreview> {
    if (inviteToken === 'expired-token') {
      return {
        email: 'invited-user@domain.com',
        status: 'expired',
        expiresAt: '2026-09-30T00:00:00Z',
      };
    }
    return {
      email: 'nour@research-lab.org',
      inviterDisplayName: 'Platform Operator',
      status: 'valid',
      expiresAt: '2026-10-12T16:00:00Z',
    };
  }

  async claimInvitation(_inviteToken: string): Promise<CurrentAccount> {
    return {
      account: {
        id: 'usr_owner_daleel_2026',
        email: 'nour@research-lab.org',
        displayName: 'Nour Researcher',
      },
      workspace: {
        id: 'ws_personal_nour_01',
        name: 'Personal Workspace',
        role: 'owner',
        dataRegion: 'aws-us-east-1 (Cloud Run)',
      },
    };
  }

  async getCurrentAccount(): Promise<CurrentAccount> {
    return {
      account: {
        id: 'usr_owner_daleel_2026',
        email: 'owner@daleel.ai',
        displayName: 'Omar Salama',
      },
      workspace: {
        id: 'ws_personal_8820',
        name: 'Personal Workspace',
        role: 'owner',
        dataRegion: 'aws-us-east-1 (Cloud Run)',
      },
    };
  }

  // Settings & Usage
  async getSettings(): Promise<Settings> {
    return { ...this.settings };
  }

  async updateSettings(patch: SettingsPatch): Promise<Settings> {
    if (patch.authenticatedContentAllowed !== undefined) {
      this.settings.authenticatedContentAllowed = patch.authenticatedContentAllowed;
    }
    if (patch.monthlyAiUsd !== undefined) {
      this.settings.aiCaps.monthlyUsd = patch.monthlyAiUsd;
    }
    return { ...this.settings };
  }

  async getUsage(): Promise<Usage> {
    return { ...this.usage };
  }

  // Runs
  async listRuns(params?: { cursor?: string; pageSize?: number; status?: string; q?: string }): Promise<RunPage> {
    let items = Array.from(this.runs.values());
    if (params?.status) {
      items = items.filter((r) => r.status === params.status);
    }
    if (params?.q) {
      const q = params.q.toLowerCase();
      items = items.filter((r) => r.query.toLowerCase().includes(q));
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { items, nextCursor: null };
  }

  async createRun(body: CreateRun): Promise<Run> {
    const runId = `run_${Date.now()}`;
    const planId = `plan_${Date.now()}`;

    const plan: Plan = {
      id: planId,
      query: body.query,
      mode: body.mode,
      requestedCriteria: [body.query],
      inferredCriteria: ['Filter out non-relevant content', 'Extract evidence citations'],
      candidateDomains: body.seedUrls && body.seedUrls.length > 0 ? body.seedUrls : ['boards.greenhouse.io', 'jobs.lever.co'],
      fields: [...JOB_FIELDS],
      relevance: body.relevance || 'balanced',
      limits: {
        ...STANDARD_LIMITS,
        ...(body.limits || {}),
      },
      aiEstimateUsd: body.aiUsageCapUsd || 0.15,
      state: body.mode === 'approval' ? 'ready' : 'ready',
      createdAt: new Date().toISOString(),
    };
    this.plans.set(planId, plan);

    const initialStatus = body.mode === 'approval' ? 'awaiting_approval' : 'running';

    const newRun: Run = {
      id: runId,
      query: body.query,
      mode: body.mode,
      status: initialStatus,
      stopReason: null,
      plan,
      limits: plan.limits,
      usage: {
        domainsReached: 1,
        pagesFetched: 0,
        pagesDiscovered: 4,
        pagesSkipped: 0,
        pagesBlocked: 0,
        pagesFailed: 0,
        elapsedSeconds: 1,
        downloadMb: 0.1,
        aiSpendUsd: 0.01,
        searchCreditsUsed: 2,
      },
      findingCounts: {
        total: 0,
        relevant: 0,
        incomplete: 0,
        duplicate: 0,
      },
      sequence: 1,
      activeGate: null,
      workflowId: body.workflowId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.runs.set(runId, newRun);

    // Seed dummy findings for the run if autonomous
    if (body.mode === 'autonomous') {
      const baseFindings = this.findings.get('run_complete_ref_02') || [];
      this.findings.set(runId, baseFindings.map((f) => ({ ...f, runId })));
      newRun.findingCounts = {
        total: 5,
        relevant: 4,
        incomplete: 1,
        duplicate: 0,
      };
    }

    return newRun;
  }

  async getRun(runId: string): Promise<Run> {
    const run = this.runs.get(runId);
    if (!run) {
      throw {
        status: 404,
        title: 'Run Not Found',
        detail: `Run with identifier ${runId} was not found in this personal workspace.`,
        code: 'RUN_NOT_FOUND',
        traceId: 'trace-404-run',
      };
    }
    return run;
  }

  async getRunPlan(runId: string): Promise<Plan> {
    const run = await this.getRun(runId);
    if (run.plan) return run.plan;
    return this.plans.get('plan_ai_engineer_ref')!;
  }

  async editRunPlan(runId: string, patch: PlanPatch): Promise<Plan> {
    const run = await this.getRun(runId);
    if (!run.plan) throw new Error('Plan not found');
    const updatedPlan: Plan = {
      ...run.plan,
      requestedCriteria: patch.requestedCriteria || run.plan.requestedCriteria,
      inferredCriteria: patch.inferredCriteria || run.plan.inferredCriteria,
      candidateDomains: patch.candidateDomains || run.plan.candidateDomains,
      fields: patch.fields || run.plan.fields,
      relevance: patch.relevance || run.plan.relevance,
      limits: {
        ...run.plan.limits,
        ...(patch.limits || {}),
      },
    };
    run.plan = updatedPlan;
    this.runs.set(runId, run);
    return updatedPlan;
  }

  async approveRun(runId: string): Promise<Run> {
    const run = await this.getRun(runId);
    run.status = 'running';
    run.updatedAt = new Date().toISOString();
    run.sequence += 1;
    // populate dummy findings
    const baseFindings = this.findings.get('run_complete_ref_02') || [];
    this.findings.set(runId, baseFindings.map((f) => ({ ...f, runId })));
    run.findingCounts = {
      total: 5,
      relevant: 4,
      incomplete: 1,
      duplicate: 0,
    };
    this.runs.set(runId, run);
    return run;
  }

  async performRunAction(runId: string, action: RunAction): Promise<Run> {
    const run = await this.getRun(runId);
    if (action.action === 'pause') {
      run.status = 'paused';
    } else if (action.action === 'resume') {
      run.status = 'running';
      run.activeGate = null;
    } else if (action.action === 'cancel') {
      run.status = 'cancelled';
      run.stopReason = 'Cancelled by Workspace Owner; retained existing completed findings.';
      run.finishedAt = new Date().toISOString();
    }
    run.updatedAt = new Date().toISOString();
    run.sequence += 1;
    this.runs.set(runId, run);
    return run;
  }

  async getRunActivity(runId: string, _cursor?: number): Promise<ActivityPage> {
    const run = await this.getRun(runId);
    const events: ActivityEvent[] = [
      { sequence: 1, type: 'stage_start', occurredAt: run.createdAt, message: 'Initiated query decomposition and planning.' },
      { sequence: 5, type: 'stage_start', occurredAt: new Date(Date.parse(run.createdAt) + 2000).toISOString(), message: 'Discovery stage started. Dispatched robots.txt and sitemap probes.' },
      { sequence: 12, type: 'domain_reached', occurredAt: new Date(Date.parse(run.createdAt) + 6000).toISOString(), message: 'Discovered frontier on boards.greenhouse.io (18 relevant links found).' },
      { sequence: 25, type: 'page_fetched', occurredAt: new Date(Date.parse(run.createdAt) + 18000).toISOString(), message: 'Extracted finding from boards.greenhouse.io/synthesia/jobs/48201 with verified evidence.' },
      { sequence: 38, type: 'rate_limit', occurredAt: new Date(Date.parse(run.createdAt) + 42000).toISOString(), message: 'Observed HTTP 429 rate limit backoff on stripe.com; queued safe retry in 20s.' },
    ];

    if (run.activeGate) {
      events.push({
        sequence: 48,
        type: 'human_gate',
        occurredAt: run.updatedAt,
        message: run.activeGate.title,
        pageUrl: run.activeGate.targetSite ? `https://${run.activeGate.targetSite}` : null,
        safeAction: 'User must sign in via hosted session or choose Skip task',
      });
    }

    if (run.status === 'complete') {
      events.push({
        sequence: 120,
        type: 'stage_complete',
        occurredAt: run.finishedAt || run.updatedAt,
        message: 'Completed across all discovered in-scope pages within ceilings.',
      });
    }

    return {
      events,
      latestSequence: events[events.length - 1].sequence,
      run,
    };
  }

  async listFindings(
    runId: string,
    params?: { cursor?: string; pageSize?: number; status?: string; minRelevance?: string }
  ): Promise<FindingPage> {
    const run = await this.getRun(runId);
    let items = this.findings.get(runId) || this.findings.get('run_complete_ref_02') || [];
    if (params?.status) {
      items = items.filter((f) => f.status === params.status);
    }
    const summaries: FindingSummary[] = items.map((f) => ({
      id: f.id,
      runId: f.runId,
      values: f.values,
      relevance: f.relevance,
      status: f.status,
      sourceUrl: f.sourceUrl,
      detailUrl: f.detailUrl,
      evidenceCount: f.evidenceCount,
      duplicateGroupId: f.duplicateGroupId,
    }));
    return {
      items: summaries,
      nextCursor: null,
      fieldDefinitions: [...JOB_FIELDS],
      runStatus: run.status,
    };
  }

  async getFinding(runId: string, findingId: string): Promise<Finding> {
    const list = this.findings.get(runId) || this.findings.get('run_complete_ref_02') || [];
    const item = list.find((f) => f.id === findingId);
    if (!item) {
      throw {
        status: 404,
        title: 'Finding Not Found',
        detail: `Finding with id ${findingId} was not found for run ${runId}.`,
        code: 'FINDING_NOT_FOUND',
        traceId: 'trace-404-finding',
      };
    }
    return item;
  }

  async submitFindingFeedback(_runId: string, findingId: string, feedback: FeedbackRequest): Promise<Feedback> {
    return {
      id: `fbk_${Date.now()}`,
      findingId,
      classification: feedback.classification,
      correction: feedback.correction || null,
      fieldKey: feedback.fieldKey || null,
      submittedAt: new Date().toISOString(),
    };
  }

  async getRunCoverage(runId: string, _cursor?: string): Promise<CoveragePage> {
    await this.getRun(runId);
    const urls: CoverageUrl[] = [
      { url: 'https://deepmind.google/careers', outcome: 'fetched', depth: 0, attempts: 1, httpStatus: 200 },
      { url: 'https://deepmind.google/careers/senior-applied-ai-engineer-london', outcome: 'fetched', depth: 1, attempts: 1, httpStatus: 200 },
      { url: 'https://jobs.lever.co/anthropic', outcome: 'fetched', depth: 0, attempts: 1, httpStatus: 200 },
      { url: 'https://jobs.lever.co/anthropic/ai-workflow-engineer', outcome: 'fetched', depth: 1, attempts: 1, httpStatus: 200 },
      { url: 'https://mawdoo3.com/careers', outcome: 'fetched', depth: 0, attempts: 1, httpStatus: 200 },
      { url: 'https://mawdoo3.com/careers/lead-ai-engineer', outcome: 'fetched', depth: 1, attempts: 1, httpStatus: 200 },
      { url: 'https://stripe.com/jobs/listings/staff-ai-engineer', outcome: 'blocked', reason: 'HTTP 429 rate limit ceiling encountered; paused further queries', depth: 2, attempts: 2, httpStatus: 429 },
      { url: 'https://wellfound.com/jobs/ai-engineer', outcome: 'blocked', reason: 'Sign-in gate required by target domain', depth: 1, attempts: 1, httpStatus: 403 },
      { url: 'https://careers.google.com/jobs/internal-only', outcome: 'skipped', reason: 'Robots.txt Disallow: /jobs/internal-only', depth: 1, attempts: 0 },
      { url: 'https://boards.greenhouse.io/out-of-scope-finance', outcome: 'skipped', reason: 'Relevance filter rejected: non-technical finance role', depth: 2, attempts: 0 },
    ];

    return {
      counts: {
        discovered: 142,
        fetched: 110,
        skipped: 28,
        blocked: 4,
        failed: 0,
      },
      urls,
      nextCursor: null,
      graph: {
        nodes: [
          { id: 'seed_greenhouse', label: 'boards.greenhouse.io', type: 'seed', depth: 0, status: 'complete' },
          { id: 'seed_lever', label: 'jobs.lever.co', type: 'seed', depth: 0, status: 'complete' },
          { id: 'page_deepmind', label: 'deepmind.google/careers', type: 'page', depth: 1, status: 'fetched' },
          { id: 'page_anthropic', label: 'anthropic/ai-workflow-engineer', type: 'page', depth: 1, status: 'fetched' },
          { id: 'page_mawdoo3', label: 'mawdoo3/lead-ai-engineer', type: 'page', depth: 1, status: 'fetched' },
          { id: 'page_stripe', label: 'stripe/staff-ai-engineer', type: 'page', depth: 2, status: 'blocked' },
        ],
        links: [
          { source: 'seed_greenhouse', target: 'page_deepmind' },
          { source: 'seed_lever', target: 'page_anthropic' },
          { source: 'seed_greenhouse', target: 'page_mawdoo3' },
          { source: 'seed_greenhouse', target: 'page_stripe' },
        ],
      },
    };
  }

  async createRunExport(runId: string, request: ExportRequest): Promise<ExportJob> {
    return {
      id: `exp_${Date.now()}`,
      state: 'ready',
      downloadUrl: `/api/v1/exports/download_${runId}.${request.format === 'csv' ? 'csv' : 'json'}`,
      contentSnippet: `Exported ${request.scope} findings from run ${runId} in ${request.format.toUpperCase()} format. Evidence included: ${request.includeEvidence ? 'Yes' : 'No'}.`,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  async deleteRun(runId: string): Promise<DeletionJob> {
    this.runs.delete(runId);
    return {
      id: `del_run_${Date.now()}`,
      state: 'completed',
      requestedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      scope: `Run ${runId} and dependent temporary crawl indices`,
      backupExpiryAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      tracePurgeState: 'Scheduled 30-day retention window purge',
    };
  }

  async deleteFinding(runId: string, findingId: string): Promise<DeletionJob> {
    const list = this.findings.get(runId);
    if (list) {
      this.findings.set(
        runId,
        list.filter((f) => f.id !== findingId)
      );
    }
    return {
      id: `del_fnd_${Date.now()}`,
      state: 'completed',
      requestedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      scope: `Finding ${findingId} and associated evidence artifacts`,
      backupExpiryAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      tracePurgeState: 'Purged',
    };
  }

  async getExport(exportId: string): Promise<ExportJob> {
    return {
      id: exportId,
      state: 'ready',
      downloadUrl: `/api/v1/exports/${exportId}/download`,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  // Workflows
  async listWorkflows(params?: { cursor?: string; q?: string }): Promise<WorkflowPage> {
    let items = Array.from(this.workflows.values());
    if (params?.q) {
      const q = params.q.toLowerCase();
      items = items.filter((w) => w.name.toLowerCase().includes(q));
    }
    return { items, nextCursor: null };
  }

  async saveWorkflow(body: SaveWorkflow): Promise<Workflow> {
    const run = await this.getRun(body.runId);
    const plan = run.plan || this.plans.get('plan_ai_engineer_ref')!;
    const wfId = `wf_${Date.now()}`;
    const newWorkflow: Workflow = {
      id: wfId,
      name: body.name,
      currentVersion: 1,
      versions: [
        {
          version: 1,
          savedAt: new Date().toISOString(),
          author: 'Omar Salama',
          changeSummary: `Created from run ${body.runId}: "${run.query}"`,
          plan,
        },
      ],
      sharedReadOnly: false,
      updatedAt: new Date().toISOString(),
      lastRunAt: run.finishedAt || run.createdAt,
      lastRunStatus: run.status,
    };
    this.workflows.set(wfId, newWorkflow);
    return newWorkflow;
  }

  async getWorkflow(workflowId: string): Promise<Workflow> {
    const wf = this.workflows.get(workflowId);
    if (!wf) {
      throw {
        status: 404,
        title: 'Workflow Not Found',
        detail: `Saved workflow with identifier ${workflowId} was not found.`,
        code: 'WORKFLOW_NOT_FOUND',
        traceId: 'trace-404-wf',
      };
    }
    return wf;
  }

  async proposeWorkflowVersion(workflowId: string, patch: WorkflowPatch): Promise<Workflow> {
    const wf = await this.getWorkflow(workflowId);
    const newVerNum = wf.currentVersion + 1;
    wf.versions.unshift({
      version: newVerNum,
      savedAt: new Date().toISOString(),
      author: 'Omar Salama',
      changeSummary: patch.changeSummary,
      plan: patch.plan,
    });
    wf.currentVersion = newVerNum;
    if (patch.name) wf.name = patch.name;
    wf.updatedAt = new Date().toISOString();
    this.workflows.set(workflowId, wf);
    return wf;
  }

  async deleteWorkflow(workflowId: string): Promise<DeletionJob> {
    this.workflows.delete(workflowId);
    return {
      id: `del_wf_${Date.now()}`,
      state: 'completed',
      requestedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      scope: `Saved workflow ${workflowId} and all recorded version schemas`,
      backupExpiryAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      tracePurgeState: 'Purged',
    };
  }

  async duplicateWorkflow(workflowId: string): Promise<Workflow> {
    const orig = await this.getWorkflow(workflowId);
    const dupId = `wf_dup_${Date.now()}`;
    const duplicated: Workflow = {
      ...orig,
      id: dupId,
      name: `${orig.name} (Copy)`,
      sharedReadOnly: false,
      updatedAt: new Date().toISOString(),
    };
    this.workflows.set(dupId, duplicated);
    return duplicated;
  }

  async runWorkflow(workflowId: string, body: RunWorkflow): Promise<Run> {
    const wf = await this.getWorkflow(workflowId);
    const latestVersion = wf.versions[0];
    return this.createRun({
      query: latestVersion.plan.query,
      mode: body.mode,
      relevance: latestVersion.plan.relevance,
      limits: body.limits,
      aiUsageCapUsd: body.aiUsageCapUsd,
      workflowId,
    });
  }

  // Recipes
  async listRecipes(params?: { cursor?: string; site?: string }): Promise<RecipePage> {
    let items = Array.from(this.recipes.values());
    if (params?.site) {
      items = items.filter((r) => r.site.includes(params.site!));
    }
    return { items, nextCursor: null };
  }

  async getRecipe(recipeId: string): Promise<Recipe> {
    const rcp = this.recipes.get(recipeId);
    if (!rcp) {
      throw {
        status: 404,
        title: 'Recipe Not Found',
        detail: `Recipe with identifier ${recipeId} was not found.`,
        code: 'RECIPE_NOT_FOUND',
        traceId: 'trace-404-rcp',
      };
    }
    return rcp;
  }

  async performRecipeAction(recipeId: string, action: RecipeAction): Promise<Recipe> {
    const rcp = await this.getRecipe(recipeId);
    if (action.action === 'preview') {
      rcp.status = 'previewed';
    } else if (action.action === 'approve') {
      rcp.status = 'approved';
    } else if (action.action === 'replay') {
      rcp.validation.outcome = 'passed';
      rcp.validation.lastValidatedAt = new Date().toISOString();
      rcp.validation.driftDetected = false;
      rcp.status = 'active';
    } else if (action.action === 'retire') {
      rcp.status = 'retired';
    }
    this.recipes.set(recipeId, rcp);
    return rcp;
  }

  // Sessions
  async listSessions(): Promise<SiteSession[]> {
    return Array.from(this.sessions.values());
  }

  async connectSite(domain: string): Promise<SessionConnection> {
    return {
      id: `conn_${Date.now()}`,
      domain,
      browserUrl: `https://${domain}/login`,
      state: 'awaiting_user_login',
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
    };
  }

  async finishSiteSessionConnection(connectionId: string): Promise<SiteSession> {
    const newSession: SiteSession = {
      id: `sess_${connectionId}`,
      domain: 'wellfound.com',
      status: 'active',
      expiryMode: 'no_expiry',
      expiresAt: null,
      lastValidatedAt: new Date().toISOString(),
      connectedAt: new Date().toISOString(),
    };
    this.sessions.set(newSession.id, newSession);
    return newSession;
  }

  async updateSiteSession(sessionId: string, expiryMode: 'no_expiry' | 'date', expiresAt?: string): Promise<SiteSession> {
    const sess = this.sessions.get(sessionId);
    if (!sess) throw new Error('Session not found');
    sess.expiryMode = expiryMode;
    sess.expiresAt = expiresAt || null;
    this.sessions.set(sessionId, sess);
    return sess;
  }

  async revokeSiteSession(sessionId: string): Promise<void> {
    const sess = this.sessions.get(sessionId);
    if (sess) {
      sess.status = 'revoked';
      this.sessions.set(sessionId, sess);
    }
  }

  // Sharing
  async listSentShares(): Promise<ShareGrant[]> {
    return Array.from(this.sentShares.values());
  }

  async createShare(body: CreateShare): Promise<ShareGrant> {
    const grant: ShareGrant = {
      id: `shr_${Date.now()}`,
      recipientUserId: body.recipientUserId,
      recipientEmail: body.recipientUserId.includes('@') ? body.recipientUserId : `${body.recipientUserId}@daleel-beta.com`,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      resourceTitle: body.resourceType === 'finding' ? 'Selected Finding' : 'Saved Research Workflow',
      state: 'active',
      access: 'view_only',
      createdAt: new Date().toISOString(),
      revokedAt: null,
    };
    this.sentShares.set(grant.id, grant);
    return grant;
  }

  async revokeShare(shareId: string): Promise<void> {
    const grant = this.sentShares.get(shareId);
    if (grant) {
      grant.state = 'revoked';
      grant.revokedAt = new Date().toISOString();
      this.sentShares.set(shareId, grant);
    }
  }

  async listSharedWithMe(): Promise<SharedPage> {
    return {
      items: [
        {
          id: 'shr_rec_01',
          recipientUserId: 'usr_owner_daleel_2026',
          recipientEmail: 'owner@daleel.ai',
          resourceType: 'workflow',
          resourceId: 'wf_shared_from_karim',
          resourceTitle: 'Arabic LLM Fine-Tuning Labs Explorer',
          state: 'active',
          access: 'view_only',
          createdAt: '2026-10-02T14:00:00Z',
          revokedAt: null,
        },
        {
          id: 'shr_rec_02',
          recipientUserId: 'usr_owner_daleel_2026',
          recipientEmail: 'owner@daleel.ai',
          resourceType: 'finding',
          resourceId: 'fnd_shared_02',
          resourceTitle: 'Lead AI Engineer at Technology Innovation Institute (TII Abu Dhabi)',
          state: 'active',
          access: 'view_only',
          createdAt: '2026-10-04T09:30:00Z',
          revokedAt: null,
        },
      ],
      nextCursor: null,
    };
  }

  async getSharedItem(shareId: string): Promise<SharedItem> {
    return {
      shareId,
      resourceType: 'workflow',
      resourceId: 'wf_shared_from_karim',
      viewOnly: true,
      payload: {
        id: 'wf_shared_from_karim',
        name: 'Arabic LLM Fine-Tuning Labs Explorer',
        sender: 'karim@daleel-beta.com',
        description: 'Read-only shared workflow. Duplicate to your workspace to edit limits, run, and connect your site sessions.',
        plan: this.plans.get('plan_ai_engineer_ref'),
      },
      sessionStateIncluded: false,
      privateRunHistoryIncluded: false,
    };
  }

  // Storage & Deletion
  async getStorage(): Promise<Storage> {
    return { ...this.storage };
  }

  async getDeletion(deletionId: string): Promise<DeletionJob> {
    return {
      id: deletionId,
      state: 'completed',
      requestedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date().toISOString(),
      scope: 'Workspace items and derived embeddings',
      backupExpiryAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      tracePurgeState: 'Purged',
    };
  }

  // Admin
  async listInvitations(): Promise<Invitation[]> {
    return Array.from(this.invitations.values());
  }

  async inviteUser(email: string, note?: string): Promise<Invitation> {
    const inv: Invitation = {
      id: `inv_${Date.now()}`,
      email,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days expiry baseline
      deliveryState: 'delivered',
      createdAt: new Date().toISOString(),
      note,
    };
    this.invitations.set(inv.id, inv);
    return inv;
  }

  async resendInvitation(invitationId: string): Promise<Invitation> {
    const inv = this.invitations.get(invitationId);
    if (!inv) throw new Error('Invitation not found');
    inv.expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    inv.deliveryState = 'delivered';
    this.invitations.set(invitationId, inv);
    return inv;
  }

  async revokeInvitation(invitationId: string): Promise<void> {
    const inv = this.invitations.get(invitationId);
    if (inv) {
      inv.status = 'revoked';
      this.invitations.set(invitationId, inv);
    }
  }

  async listAdminWorkspaces(): Promise<AdminWorkspace[]> {
    return [
      {
        id: 'ws_personal_8820',
        ownerEmail: 'owner@daleel.ai',
        operationalState: 'healthy',
        activeRuns: 1,
        pausedRuns: 1,
        lastRunAt: '2026-10-05T15:30:00Z',
        storageUsedMb: 142.5,
        privateContentReturned: false,
      },
      {
        id: 'ws_personal_karim',
        ownerEmail: 'karim@daleel-beta.com',
        operationalState: 'healthy',
        activeRuns: 0,
        pausedRuns: 0,
        lastRunAt: '2026-10-04T12:00:00Z',
        storageUsedMb: 85.0,
        privateContentReturned: false,
      },
      {
        id: 'ws_personal_nour_01',
        ownerEmail: 'nour@research-lab.org',
        operationalState: 'quota_restricted',
        activeRuns: 0,
        pausedRuns: 1,
        lastRunAt: '2026-10-03T18:00:00Z',
        storageUsedMb: 420.0,
        privateContentReturned: false,
      },
    ];
  }

  async getAdminWorkspace(workspaceId: string): Promise<AdminWorkspace> {
    const list = await this.listAdminWorkspaces();
    const ws = list.find((w) => w.id === workspaceId);
    if (!ws) throw new Error('Workspace not found');
    return ws;
  }

  async requestAuditedSupportAccess(body: { workspaceId: string; purpose: string; itemId?: string }): Promise<SupportGrant> {
    if (!body.purpose || body.purpose.trim().length === 0) {
      throw {
        status: 400,
        title: 'Support Purpose Required',
        detail: 'An explicit non-empty operational support reason must be recorded before inspecting user content.',
        code: 'PURPOSE_REQUIRED',
        traceId: 'trace-support-denied',
      };
    }

    const auditEventId = `aud_${Date.now()}`;
    const auditEvent: AuditEvent = {
      id: auditEventId,
      actorId: 'usr_operator_daleel_2026',
      actorEmail: 'operator@daleel.ai',
      workspaceId: body.workspaceId,
      itemId: body.itemId,
      purpose: body.purpose,
      outcome: 'granted',
      occurredAt: new Date().toISOString(),
    };
    this.auditEvents.unshift(auditEvent);

    return {
      id: `grant_${Date.now()}`,
      auditEventId,
      workspaceId: body.workspaceId,
      itemId: body.itemId,
      purpose: body.purpose,
      operatorEmail: 'operator@daleel.ai',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      access: 'view_only',
      secretsAccessible: false,
    };
  }

  async getAuditedSupportItem(_grantId: string, itemId: string): Promise<any> {
    const run = this.runs.get(itemId);
    if (run) return run;
    const wf = this.workflows.get(itemId);
    if (wf) return wf;
    return {
      id: itemId,
      type: 'operational_diagnostic',
      summary: 'Diagnostic report for item ' + itemId,
      rawSecretsRedacted: true,
      data: 'Sensitive tokens and cookies excluded per FR-ADM-004',
    };
  }

  async listAccessAudit(): Promise<AuditPage> {
    return {
      items: [...this.auditEvents],
      nextCursor: null,
    };
  }
}
