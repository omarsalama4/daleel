# Daleel UI and UX Specification

**Version:** 1.1 implementation baseline · **Date:** 5 October 2026  
**Audience:** Product, UI/UX design, frontend engineering, and QA  
**Source of product decisions:** *Daleel Product Requirements Document*, draft v1.4, 28 September 2026. Requirement IDs in brackets refer to that PRD.

## Document contract

This document specifies the private hosted beta. **Confirmed** means the behavior follows a PRD decision or acceptance criterion. **UX recommendation** means a proposed interface or route that makes a confirmed capability usable; it is not a new product commitment. **Open** means the PRD does not settle a decision that affects the interface. Route paths, visual layout, labels, and breakpoints are UX recommendations unless marked otherwise. The page and component IDs below are stable references for Figma frames, frontend tickets, and QA cases.

The beta has one personal workspace per invited user. The user is its **Workspace Owner**. The **Platform Operator** manages invitations and service operations through a separate admin surface. A **workflow** is a plan generated from a query; a **recipe** is reusable browser automation; a **run** is one execution; a **finding** is one result. A generated workflow can run without being saved. Saving it requires an explicit action. [FR-WKS-001, FR-BASE-003, FR-BASE-004]

---

## 1. Product overview

**Purpose.** Daleel turns a natural-language research query into a bounded crawl and an evidence-backed result set. It can discover public sources, follow relevant links, extract structured fields, use an Owner's authorized browser session when needed, and generate reusable automation recipes. Its first reference task is finding AI Engineer opportunities and enriching every relevant finding from its detail page. Any query may generate a workflow. [FR-BASE-001, FR-JOB-001–004]

**Users.** The product owner and invited friends run research in separate personal workspaces. A Workspace Owner configures runs, sessions, AI content policy, budgets, sharing, and deletion. The Platform Operator invites users and may inspect private run content for support through an internally audited admin path; this path never exposes raw session secrets and cannot override the Owner's authenticated-content AI policy. [FR-WKS-001–005, FR-ADM-001, FR-ADM-004]

**Problems addressed.** Manual research is repetitive; one-off scrapers break; opaque crawls hide missed pages; unsupported extracted claims are hard to verify. Daleel shows the plan, the discovered frontier, run limits, incomplete work, field-level evidence, recipe drift, and reasons for barriers or stops. [Sections 3, 5, 10; AC-004–005]

**Primary goals.** A user can (1) submit an arbitrary query, (2) inspect or approve its scope according to run mode, (3) follow a live run and intervene at human gates, (4) review evidence and detail-page enrichment, (5) correct, export, share, or explicitly save useful work, and (6) reuse an approved recipe. The beta UI is English; source text and results may be multilingual, including right-to-left content. [FR-AI-001–004, FR-EVD-004, FR-AUT-001–003]

**Hard boundaries.** Daleel does not bypass MFA, CAPTCHA, bot detection, or site restrictions. It does not submit target-site forms, apply for jobs, purchase, post, or change account data. It never promises discovery of every page. Public crawling honors robots.txt and rate limits. The user completes login and MFA in a hosted interactive browser. [Sections 7, 15; AC-007–009]

## 2. Information architecture

### 2.1 Application map

```text
Invitation / sign-in
├── Accept invitation and create/sign into account
└── Access problem

Personal workspace shell
├── Home
├── New research
│   ├── Query composer
│   └── Generated plan review (Approval mode)
├── Runs
│   ├── Run activity
│   ├── Results
│   │   └── Finding detail and field evidence
│   └── Coverage and site graph
├── Workflows
│   └── Saved workflow, versions, and linked runs/recipes
├── Recipes
│   └── Recipe detail, preview, replay validation, code export
├── Shared with me
├── Sessions
│   └── Hosted site sign-in
└── Settings
    ├── Account and workspace
    ├── AI processing and provider policy
    └── Limits, storage, and deletion

Platform Operator shell (separate permission boundary)
├── Invitations
├── Workspace operations
│   └── Audited support inspection
└── Internal access audit
```

**Primary navigation (UX recommendation):** Home, New research, Runs, Workflows, Recipes, Shared with me, Sessions, Settings. Keep New research visually prominent. Show the personal workspace name and account menu in the shell; there is no peer-workspace switcher in the beta. The admin shell appears only for an authorized Platform Operator and is never reached by a normal Owner navigation item. [FR-WKS-001, FR-ADM-001]

**Secondary navigation:** A run uses Activity, Results, and Coverage tabs. A saved workflow uses Overview, Versions, Runs, and Recipes. A recipe uses Overview, Actions, Validation, Versions, and Code. Settings uses Account, AI processing, and Limits & storage. On narrow screens, these become horizontally scrollable tabs with visible selected state; the primary navigation becomes a labelled menu. [UX recommendation]

### 2.2 Page inventory and routes

| ID | Page / overlay | Recommended route | Access and source |
|---|---|---|---|
| P01 | Invitation acceptance | `/invite/:token` | Invited person only; FR-PLT-002, FR-ADM-001 |
| P02 | Sign-in and access problem | `/sign-in` | Invited users; FR-PLT-005 |
| P03 | Home | `/app` | Workspace Owner; Section 10 |
| P04 | Query composer | `/app/new` | Workspace Owner; FR-BASE-001 |
| P05 | Plan review | `/app/plans/:draftId` | Workspace Owner; FR-PLN-001–004 |
| P06 | Runs list | `/app/runs` | Workspace Owner; FR-ADM-002 |
| P07 | Run activity | `/app/runs/:runId` | Workspace Owner; FR-ADM-002–003 |
| P08 | Run results | `/app/runs/:runId/results` | Workspace Owner; FR-EVD-001–005 |
| P09 | Finding detail | `/app/runs/:runId/results/:findingId` | Workspace Owner or explicit share recipient; FR-EVD-001–004 |
| P10 | Coverage and site graph | `/app/runs/:runId/coverage` | Workspace Owner; AC-005 |
| P11 | Workflow library | `/app/workflows` | Workspace Owner; FR-BASE-003–005 |
| P12 | Saved workflow detail | `/app/workflows/:workflowId` | Workspace Owner or explicit share recipient; FR-BASE-005 |
| P13 | Recipe library | `/app/recipes` | Workspace Owner; FR-AUT-001–006 |
| P14 | Recipe detail / approval | `/app/recipes/:recipeId` | Workspace Owner; FR-AUT-002–006 |
| P15 | Shared with me | `/app/shared` | Explicit recipients; FR-WKS-002–004 |
| P16 | Sessions | `/app/sessions` | Workspace Owner; FR-AUTH-001–006 |
| P17 | Account and workspace settings | `/app/settings/account` | Workspace Owner; FR-WKS-005 |
| P18 | AI processing settings | `/app/settings/ai` | Workspace Owner; FR-AI-007, BR-LIM-004 |
| P19 | Limits, storage, and deletion | `/app/settings/limits` | Workspace Owner; BR-LIM-004, Section 23.5 |
| P20 | Operator invitations | `/admin/invitations` | Platform Operator; FR-ADM-001 |
| P21 | Operator workspace operations | `/admin/workspaces` and `/admin/workspaces/:id` | Platform Operator; FR-WKS-005 |
| P22 | Internal operator access audit | `/admin/access-audit` | Platform admins only; FR-ADM-004 |
| O01 | Hosted site sign-in | Dedicated protected session route or overlay | Workspace Owner; FR-AUTH-001 |
| O02 | Share item | Dialog/drawer from a finding or saved workflow | Workspace Owner; FR-WKS-002–003 |
| O03 | Export results | Dialog/drawer from Results/Coverage | Workspace Owner; Section 18 |
| O04 | Feedback/correction | Drawer from a finding | Workspace Owner; FR-EVD-004–005 |
| O05 | Stop, delete, and revoke confirmation | Dialog from owning page | Workspace Owner; Sections 15, 23.5 |
| O06 | Human attention gate | Inline panel on Run activity plus persistent banner | Workspace Owner; Section 17.1 |

### 2.3 Shared interface elements

| Component | What the user sees and can do | Rule |
|---|---|---|
| Workspace shell | Logo, page title, navigation, Owner identity, active run count, account menu | Never show another user's private workspace in the Owner shell. |
| Run status badge | Planning, Running, Needs attention, Paused, Complete, Partial, Failed, Cancelled | Text and icon accompany color; completion is scoped to discovered in-scope work. |
| Limit meter | Current / configured domains, pages, depth, elapsed time, retries, downloaded MB, estimated AI spend | Show AI spend apart from search quota and hosting indicators. |
| Evidence link | Source URL, fetch time, excerpt/snapshot, digest in details | Every surfaced factual field has evidence or is visibly unknown/unverified. |
| Human-gate banner | Exact blocker, affected task/site, available actions, whether the run is paused or has skipped the task | Never offer bypass of access controls or target-site writes. |
| Save workflow action | Explicitly saves a workflow version after a query or run | A run never auto-saves its generated workflow. |
| Recipe status badge | Draft, Previewed, Approved, Active, Needs Review, Retired | Active requires Owner approval and successful replay/evidence validation. |
| Toast + activity log | Short action outcome; persistent run events remain on Run activity | Toasts are supplementary, never the only record of an error. |

## 3. Detailed page specifications

Each page lists components from top to bottom. A row's **action/result** includes primary and secondary interactions and navigation. Unless noted, list search/filter/sort is local to that page, updates the URL query string, and preserves the user's current selection on refresh. [UX recommendation]

### P01 Invitation acceptance

**Purpose / audience / goal:** Let an invited person establish access to their own personal workspace. **Entry:** invitation link. **Exit:** Home on success, Sign-in if an existing invited account must authenticate, or an access-problem state. [FR-PLT-002, FR-WKS-001, FR-ADM-001]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Identity panel | Daleel name, invitee email, invite status, brief personal-workspace explanation | No public Sign up CTA. |
| 2 | Authentication control | Invite-bound email and password; email must match the invitation | Establish identity through Neon Managed Better Auth; public sign-up is unavailable. |
| 3 | Terms of access note | Read-only crawling and personal-workspace boundary in plain language | Link to product policies if supplied; do not invent policy text. |
| 4 | Continue | Button enabled when invitation and identity validate | Create/open personal workspace, then `/app`; show one-time success message. |

**States:** validating link; valid invite; already accepted; expired/revoked/invalid invite with a request-new-invite instruction; auth failure; account creation in progress; success. An invalid invitation cannot create an account. The Platform Operator, not an Owner, issues replacement invitations. [Confirmed]

### P02 Sign-in and access problem

**Purpose / audience / goal:** Authenticate invited users and explain denied access. **Entry:** direct URL, expired application session, invitation flow. **Exit:** return to originally requested authorized page or Home. [FR-PLT-005]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Sign-in panel | Invited account email and password, with Forgot password | Authenticate through Neon Managed Better Auth; never offer public self-service signup. |
| 2 | Context message | Session expired, invitation required, or insufficient permission | On success, resume only the original authorized route. |
| 3 | Help state | “Ask your inviter or platform operator for an invitation or access help.” | Does not reveal whether an arbitrary email owns an account. |

**States:** idle, authenticating, email not verified, password reset requested, invalid/expired reset link, error, permission denied, success. Password reset and email verification use the configured transactional email provider; responses do not reveal whether an arbitrary address has an account.

### P03 Home

**Purpose / audience / goal:** Give the Workspace Owner a quick route to new research and unfinished work. **Entry:** post sign-in, primary nav. **Exit:** New research, a run, workflow, or session. [Section 10; UX recommendation]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Welcome / primary CTA | Workspace name and **New research** | Opens P04. |
| 2 | Needs attention | Paused runs with site, reason, time, and **Resolve** | Opens P07 at its gate; hidden when none. |
| 3 | Recent runs | Query, status, mode, started time, findings count, stop reason if partial | Opens P07 or P08; **View all** opens P06. |
| 4 | Saved work | Recent workflows and active/needs-review recipes | Opens P12/P14; explicit **Save workflow** appears only for unsaved eligible runs. |
| 5 | Capacity summary | Remaining monthly AI budget, storage used/limit, search quota status if known | Links to P18/P19; labels unavailable telemetry rather than showing zero. |

**States:** first-run empty state with New research and Connect site; loading skeleton; recoverable API error with Retry; populated; restricted capacity with reason. Avoid implying a Partial run failed completely.

### P04 Query composer

**Purpose / audience / goal:** Express any research task, optional scope hints, and a run mode. **Entry:** New research CTA, workflow Run as new version. **Exit:** P05 in Approval mode or P07 after Autonomous submission. [FR-BASE-001, FR-PLN-003, Section 17.1]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Query field | Multi-line natural-language request, example placeholder such as “Find AI Engineer opportunities…” | Required; examples are suggestions, not fixed workflow types. |
| 2 | Optional scope | Seed URLs/domains, preferred sites, language/filter notes, public discovery choice | Edits initial scope. Show that Autonomous may follow relevant public links within the domain limit. |
| 3 | Run mode | Approval / Autonomous radio cards with the different human gates; Approval selected by default | The user must explicitly select Autonomous for each query. Mode choice changes the next CTA and shows what approval is required. |
| 4 | Relevance | Broad / Balanced / Strict, Balanced default; explanation of ranking behavior | Applies to relevance filtering; score is a ranking signal, not a probability. |
| 5 | Advanced limits | Standard profile and beta ceilings: 20 domains, 500 pages including details, depth 5, 20 min, 2 retries/page, 100 MB download; per-run AI cap $0.25 and workspace monthly cap $5 | Owner may lower each run limit per query. The Owner may lower AI caps; raising beta ceilings requires a platform configuration change. Show monthly remaining budget separately. |
| 6 | Authorized access | Available Owner-owned site sessions, with domain and status only | Owner selects a session if needed; no session secret appears. |
| 7 | Footer action | **Review plan** (Approval) or **Start autonomous run** (Autonomous) | Validate, preserve form on error, create a draft plan or run. |

**States:** pristine; locally edited; generating plan; invalid input; ambiguity needing clarification; AI processing disabled for authenticated content; budget insufficient; submission error; success. On navigation with unsaved edits, show Stay / Leave. If a general query has no known fields yet, the planner proposes them; do not force the job template. [FR-PLN-001–004]

### P05 Generated plan review

**Purpose / audience / goal:** Make the interpreted plan and Approval-mode authorization concrete before execution. **Entry:** P04 Approval submission, proposed workflow revision. **Exit:** P07 on approval, P04 on substantial edit, or Home on discard. [FR-PLN-001–003, Section 17.1]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Plan header | Original query, draft timestamp, mode, unsaved badge, planning confidence/ambiguity | **Edit query** returns with values; **Discard** confirms if changed. |
| 2 | Interpretation | Requested criteria versus inferred criteria, selectable interpretations when material | Owner edits inferred filters and resolves ambiguity before approval. |
| 3 | Source strategy | Seed sites, candidate public domains if known, search/sitemap/link strategy, robots/rate-limit note | Edit allowed seeds/scope; candidate list is illustrative, not a guarantee. |
| 4 | Output schema | Proposed field names/types, required/optional, evidence rule, detail-enrichment rule, dedup strategy | Edit fields; show job details when query matches reference workflow. |
| 5 | Relevance and limits | Mode, Standard limits or overrides, estimated AI usage and monthly remaining | Edit; expose lower remaining cap and separate non-AI costs. |
| 6 | Session / policy | Selected site session, authenticated-content AI permission, recipe version/status if applicable | Connect site via O01; blocked if required policy disallows available extraction. |
| 7 | Approval action | **Approve and run** plus **Back**; **Save workflow** is separate, optional | Approval starts run; saving does not happen automatically. |

**States:** plan generating, ready, edited, validation error, policy block, approval processing, approval success, planner error with Retry. A proposed new/changed recipe cannot become Active through this generic plan approval alone; P14 runs its preview and replay gate. [FR-AUT-003]

### P06 Runs list

**Purpose / audience / goal:** Find past and active executions. **Entry:** primary nav, Home View all. **Exit:** P07/P08. [FR-ADM-002; UX recommendation]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Header | Runs count and New research CTA | Opens P04. |
| 2 | Search/filter/sort | Query text; status, mode, date filters; newest/oldest sort | Updates URL parameters and table; Clear filters resets. |
| 3 | Runs table/cards | Query, workflow version or Unsaved, start/end, status, finding count, discovered/fetched pages, stop reason | Row opens P07. **View results** opens P08. |
| 4 | Row actions | Resume if paused, Cancel if active, Delete if terminal | Require state-aware confirmation for Cancel/Delete. |

**States:** no runs; filters return no matches; loading; pagination/loading more; partial failure; populated. A run is visible only in its Owner workspace unless accessed through an explicit share or admin path.

### P07 Run activity

**Purpose / audience / goal:** Understand progress and safely intervene. **Entry:** after Start, Runs list, Home attention card. **Exit:** Results, Coverage, plan, Sessions. [FR-ADM-002–003, Section 23.4]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Sticky run header | Query, run ID, mode, start time, workflow/recipe version, status | Tabs to Results/Coverage; return to Runs. |
| 2 | Human-gate panel | Exact blocker: login/MFA, CAPTCHA/bot detector, ambiguous action, scope, recipe drift, AI cap, search quota, storage quota | **Connect/sign in** opens O01 when permitted; **Review recipe** opens P14; **Skip affected task** or **Stop** is offered only when valid. Never show “Solve CAPTCHA.” |
| 3 | Stage timeline | Planning, discovery, crawl, extraction, validation, report; current and completed stages | Expand stage for task outcomes, timestamps, and retry count. |
| 4 | Live counters | Discovered/fetched/skipped/blocked/failed pages; domains, download MB, elapsed time, AI estimate/actual, search quota | Counters update without moving focus or reordering content unexpectedly. |
| 5 | Event feed | Human-readable action and reason, affected URL/domain (redacted if sensitive), time | Filter by errors/gates; links to Coverage or finding. |
| 6 | Run controls | Pause, Resume, Cancel; View results; Save workflow when eligible | Disable impossible actions with explanation; cancellation retains completed findings. |

**States:** queued, running, pausing, paused by user, needs attention, resuming, Complete, Partial, Failed, Cancelled, disconnected UI/reconnecting. Refresh restores server state and never restarts a run. A run's Complete label means all **discovered in-scope** work is accounted for, not every page on the web. [AC-005]

### P08 Run results

**Purpose / audience / goal:** Evaluate, search, correct, export, and save findings. **Entry:** run tab, notification from completion. **Exit:** P09, P10, P12, share/export overlays. [FR-EVD-001–005, Section 18]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Run summary | Query, status, relevance mode, found/relevant/incomplete/duplicate counts, coverage caveat | **View coverage** opens P10. |
| 2 | Action bar | Search, relevance/status/source filters, sort; Export, Save workflow | Filters alter visible results only; Export offers selection/all with scope clearly stated. |
| 3 | Results schema header | Query-specific field columns; job template includes title, employer, location, arrangement, posted date, relevance, enrichment | Columns adapt to planned schema; missing fields say Unknown, never blank as if loaded. |
| 4 | Finding cards/table | Primary fields, relevance signal with reason, source URL, last fetch, evidence count, detail status, duplicate group | Open P09; expand duplicate group; send feedback; select for export/share. |
| 5 | Incomplete-results panel | Relevant findings whose detail attempt was blocked or stopped, with reason | Open finding or coverage; do not silently hide them. |
| 6 | Footer | Result count, pagination/loading more, last refresh | Retains filters and scroll position on return from detail. |

**States:** running with partial live findings, zero findings, no filter matches, loading, extraction partial, evidence unavailable/unverified, error with Retry, completed. Show a persistent caveat for Partial runs. A relevance signal is a ranking aid, never a calibrated likelihood. [BR-REL-002]

### P09 Finding detail and field evidence

**Purpose / audience / goal:** Inspect exactly what was found, why it is relevant, and what supports each field. **Entry:** result row or explicit shared item. **Exit:** back to Results/Shared, source URL, feedback/share. [FR-JOB-002–005, FR-EVD-001–004]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Header | Finding title or best available identifier, relevance label/reason, source/detail URL, fetch time, enrichment state | Open source in new browser tab; never cause a target-site write. |
| 2 | Structured fields | Planned field label and value, each with Verified / Unknown / Unverified / Conflict state | Select a value to reveal its own evidence. For jobs: title, employer, description, responsibilities, qualifications, skills, compensation, location, arrangement, dates, deadline, application URL when available. |
| 3 | Field evidence | Source URL, retrieval time, original-language excerpt or snapshot, content digest in Advanced details | Open evidence/source; show why an absent field is Unknown. |
| 4 | Relevance and duplicates | Criteria matched/missed, duplicate-group members, uncertain match label | Expand group, inspect each original; correction opens O04. |
| 5 | Actions | Mark relevant/irrelevant/incorrect/incomplete; Share; Export selected | Feedback opens O04; Share opens O02; recipient sees only selected content. |

**States:** loading, full evidence, missing evidence (field marked unverified), conflicting sources, detail enrichment pending/incomplete, source no longer reachable, share-recipient restricted actions, error. Preserve original Unicode and right-to-left source excerpt direction. Do not expose private model reasoning. [NFR-LANG-003, NFR-SEC-009]

### P10 Coverage and site graph

**Purpose / audience / goal:** Explain what Daleel discovered, processed, missed, and why. **Entry:** run tab, partial-run link, finding source. **Exit:** Activity, Results, external source. [BR-LIM-005, AC-005]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Coverage statement | “Complete across discovered in-scope pages” or Partial/Failed reason; explicit unknown undiscovered coverage | Never say “all site data collected.” |
| 2 | Limit summary | Configured versus consumed domains/pages/depth/time/retries/download/AI | Link to plan/run configuration. |
| 3 | Funnel / URL ledger | Discovered, fetched, skipped, failed, blocked, unprocessed counts; per-URL reason and attempts | Filter/sort by domain, outcome, depth; open source or related finding. |
| 4 | Site graph | Domains and relevant page links, bounded to discovered data | Pan/zoom/inspect node; accessible table is the nonvisual equivalent. |
| 5 | Barrier summary | robots, rate limit, auth, CAPTCHA, bot detector, timeout, quota, scope | Link to corresponding run event and valid Owner action. |
| 6 | Export | Site graph and URL ledger in available formats | Opens O03 with current view/all scope. |

**States:** live/incomplete, no discovered pages, loading graph, too-large graph with table fallback, partial, failure, export error. Graph is a visualization of observed links, not a completeness proof.

### P11 Workflow library

**Purpose / audience / goal:** Find only workflows the Owner explicitly saved. **Entry:** primary nav, Save workflow success. **Exit:** P12 or P04. [FR-BASE-003–005]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Header | Saved workflow count, New research | Opens P04. |
| 2 | Search/filter/sort | Name/query, last run, status, newest/oldest | Updates list/URL. |
| 3 | Workflow items | Name, summary, latest version, last run, source strategy, linked recipe health | Open P12; Run opens P04 with version prefilled for Owner review. |
| 4 | Item actions | Share, delete | O02 or O05; deletion warns about linked versions/runs according to policy. |

**States:** empty (unsaved runs do not appear), no matches, loading, error, populated, deletion in progress.

### P12 Saved workflow detail

**Purpose / audience / goal:** Inspect, version, rerun, and share a saved plan. **Entry:** P11, linked run, shared item. **Exit:** P04/P05, P07, P14, O02. [FR-BASE-005, FR-WKS-002–004]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Header | Name, owner, version, saved time, latest run/status; Run, Edit, Share | Run opens prefilled composer; Edit creates a proposed version; Share opens O02. |
| 2 | Overview | Query, scope, fields, relevance, evidence, dedup, limits, detail rule | Read-only until Edit. |
| 3 | Versions | Version/date/author/change summary/approval status | Select version without silently changing active version. |
| 4 | Linked runs | Run status, date, findings, stop reason | Open P07/P08. |
| 5 | Linked recipes | Site, recipe version, Active/Needs Review | Open P14. |

**States:** own workflow, shared read-only workflow, draft revision, no runs, missing/retired recipe, deleted/unavailable item, loading/error. A recipient cannot run the shared object directly. **Duplicate to my workspace** creates an independent copy; it can be edited and run only with the recipient's own limits, policy, and site sessions. A share recipient never inherits the creator's authenticated session.

### P13 Recipe library

**Purpose / audience / goal:** Find reusable site automations and identify drift. **Entry:** primary nav, run recipe gate. **Exit:** P14. [FR-AUT-001–006]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Header | Recipe count and explanation of preview/replay gate | No arbitrary code upload or server execution. |
| 2 | Search/filter | Site/task, status, last successful replay, drift state | Update list/URL. |
| 3 | Recipe items | Name/site/task, current version, status, last validation, linked workflow | Open P14; Needs Review is prominent. |

**States:** no recipes, no matches, loading, error, populated, drift warning. Recipe generation happens as part of a workflow/run rather than an invented blank-code editor.

### P14 Recipe detail and approval

**Purpose / audience / goal:** Review generated actions and activate only a verified reusable recipe. **Entry:** P13, P05, P07 drift gate. **Exit:** workflow/run or library. [FR-AUT-002–008, AC-011]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Header | Site/task, version, Draft/Previewed/Approved/Active/Needs Review/Retired, linked workflow | Owner may retire; shared recipient sees inspect-only view. |
| 2 | Action preview | Ordered structured read-only navigation, pagination, expansion, extraction steps, scope | Inspect each step and target; ambiguous or write-like steps block approval. |
| 3 | Representative pages | Page samples selected for replay and expected extracted fields/evidence | Inspect sample URLs and field checks; no claim that samples cover every future page. |
| 4 | Approval/replay panel | **Preview**, **Approve**, **Validate replay**, outcome by step and evidence check | State transitions are explicit: Draft → Previewed → Approved → Active only after successful replay. Failure → Needs Review; user can revise and reapprove a new version. |
| 5 | Versions and drift | Version history, selector/page-semantic changes, affected runs | Compare versions; never silently revise an approved version. |
| 6 | Code | Generated Playwright code, copy/download | Inspect/export only; editing or running arbitrary server code is unavailable. No credentials or session values in code. |

**States:** draft, previewing, previewed, awaiting approval, validating, validation failed with specific step/field reason, active, needs review, retired, loading/error. The user must approve a new or changed recipe even in Autonomous mode; a one-off run is not equivalent to activating a reusable recipe.

### P15 Shared with me

**Purpose / audience / goal:** Inspect explicitly shared findings and workflows without entering another personal workspace. **Entry:** primary nav, received link/in-app notice. **Exit:** P09/P12 restricted view. [FR-WKS-002–004]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Header | Shared findings/workflows count | Switch item type. |
| 2 | Search/filter | Name/query, sender, date | Filter/sort received items. |
| 3 | Shared item | Title, sender, share date, item type, source/evidence availability | Open restricted detail; no run history or session link. A saved workflow can be duplicated to the recipient's workspace. |

**States:** no shares, removed share, loading, no matches, error, populated. Remove access immediately when share grant is revoked. No “switch to sender workspace” control.

### P16 Sessions

**Purpose / audience / goal:** Establish, inspect, configure, and revoke the Owner's authorized site sessions. **Entry:** primary nav, plan/run access gate. **Exit:** O01, P05/P07. [FR-AUTH-001–006]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Header and warning | **Connect site**; user completes sign-in/MFA, Daleel does not bypass barriers | Opens O01. |
| 2 | Session list | Domain, connection/last-used time, status, expiry setting (default No expiry), last validation | Open settings; Reconnect launches O01; Revoke opens O05. |
| 3 | Session settings | Selected domain, expiry option, revoke control | Save expiry; revoke removes use from new work and marks dependent runs for attention. |
| 4 | Help | Login expired, CAPTCHA/bot detector, unsupported access explanation | Shows only normal site login/reconnect actions. |

**States:** none, connecting, active, site-invalidated/expired, needs MFA, revoked, error. The UI never displays cookies, passwords, or raw session state. “No expiry” means Daleel sets no product timeout; the site can still invalidate the session. [FR-AUTH-002]

### P17 Account and workspace settings

**Purpose / audience / goal:** Show personal-workspace identity and account settings. **Entry:** Settings. **Exit:** other settings, Home. [FR-WKS-001, FR-WKS-005]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Identity | Account email, personal workspace name/ID, Owner role | Edit display name only if identity provider supports it; otherwise read-only. |
| 2 | Sharing summary | Count of sent and received share grants | Open P15 or the source item. |
| 3 | Data location | Product-data region disclosure | Read-only; change of region is not offered without a migration capability. |
| 4 | Sign-out | Sign out of Daleel | End product session; does not revoke target-site sessions unless separately chosen. |

**States:** loading, account error, saved, read-only field, permission denied. No team-member management in personal-workspace beta.

### P18 AI processing and provider settings

**Purpose / audience / goal:** Let the Owner govern authenticated-content processing and paid model routes. **Entry:** Settings, query/plan policy warning. **Exit:** plan/run. [FR-AI-007, BR-LIM-004]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Authenticated-content AI policy | Off by default; explanation that authenticated page content may be sent to hosted AI providers only when enabled | Save policy for this personal workspace; only its Owner can change it. If off, use deterministic extraction only when a validated extractor can satisfy the field schema; otherwise mark affected fields unavailable/Unknown and do not send authenticated content to a model. |
| 2 | Model route summary | Platform-configured primary/secondary provider status and free-quota status if known | Read-only. Provider credentials and arbitrary endpoints are platform-managed. Never silently route to paid model. |
| 3 | Paid model enablement | Current enabled/disabled state and possible charges | Explicit Owner action to enable a platform-approved paid route; no default paid route and no fallback to paid service. |
| 4 | Usage | Per-run default cap, monthly cap, consumed/reserved/remaining amount, billed timeout note | Edit caps (monthly cap here); link to run usage. Search/hosting costs are separate. |

**States:** loading, saved, update error, provider unavailable, free quota exhausted, budget exhausted, policy-restricted. The Platform Operator's support view is read-only for the Owner policy and cannot override it.

### P19 Limits, storage, and deletion

**Purpose / audience / goal:** Control default run limits, understand storage, and remove retained data. **Entry:** Settings, capacity warning. **Exit:** P04, affected item. [Section 14, Section 23.5, AC-016]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Standard profile | Beta maxima and defaults: 20 domains, 500 pages, depth 5, 20 min, 2 retries/page, 100 MB; per-run AI maximum $0.25 and monthly workspace maximum $5 | Show profile here as default reference. Per-query crawl limits and AI caps may be lowered. Raising maxima requires a platform configuration change; past runs keep their recorded limits. |
| 2 | Evidence storage | Used/500 MB workspace meter, 80% warning, beta-wide capacity state if relevant | At cap, new storage-heavy runs pause; show delete/capacity path. Do not auto-delete. |
| 3 | Retained data | Counts/sizes for results, evidence artifacts, workflows, run history, sessions where measurable | Open relevant library/list for item-level deletion. |
| 4 | Delete controls | Delete selected session/workflow/run/result/artifact entry points; derived-data explanation | O05 requires clear scope; deletion progress/success shown. |

**States:** loading, under quota, 80% warning, at quota, unavailable measurement, deletion pending, deletion error, empty. The 100 MB per-run download limit is distinct from retained-evidence storage. [Section 23.5]

### P20 Operator invitations

**Purpose / audience / goal:** Invite the small beta cohort. **Entry:** authorized `/admin`. **Exit:** invitation detail or P21. [FR-ADM-001]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Admin identity | Operator role and admin-only context | Prevent accidental confusion with personal workspace. |
| 2 | Invite form | Recipient email and optional note if email service supports it | Send invitation; show queued/sent/error and email quota. |
| 3 | Invitation ledger | Invitee email, status, created/sent/accepted time, and expiry (7 days after issue) | Revoke or resend through explicit controls. |

**States:** empty, loading, sending, sent, queued due quota, failed, accepted, revoked, expired. No public signup control. Invitations expire after 7 days; resend issues a new token and revokes the prior token. [Beta implementation baseline, Section 13]

### P21 Operator workspace operations

**Purpose / audience / goal:** Inspect beta health and provide support through a constrained admin path. **Entry:** admin navigation. **Exit:** internal audit or own workspace. [FR-WKS-005, FR-ADM-004]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Workspace list | Owner identifier, active/paused run counts, quota state, high-level error state | Select workspace; no session secrets in list. |
| 2 | Support access gate | Selected workspace, required purpose, exact content scope to inspect | **Open support view** records operator, purpose, time, workspace/item before content display. |
| 3 | Support view | Private run content/findings and operational status needed for support | Inspect limited content; never raw cookies, session state, or Owner AI policy edit. |
| 4 | Return / audit link | End support inspection; open corresponding audit entry | Return to list and keep audit record. |

**States:** unauthorized, loading, reason missing, audit-write failure (content stays closed), active inspection, content unavailable, success. The access record is visible only to platform admins, not Workspace Owners. [Decision]

### P22 Internal operator access audit

**Purpose / audience / goal:** Review operator access to another user's private content. **Entry:** admin navigation or support view. **Exit:** P21. [FR-ADM-004, DR-004]

| Order | Component | Visible content | Action / result |
|---|---|---|---|
| 1 | Filter bar | Operator, workspace, item, date, purpose | Search/sort internal entries. |
| 2 | Audit ledger | Actor, time, purpose, workspace, item, access outcome | Open event metadata; never show raw secrets. |
| 3 | Export control | Internal audit export if operationally enabled | Restrict to platform admins and audit the export. [UX recommendation] |

**States:** empty, loading, error, permission denied, populated. Do not include this ledger in Owner settings or user-facing exports.

### Overlays and drawers

| ID | Content and behavior | Success / cancel / error |
|---|---|---|
| O01 Hosted site sign-in | Show target domain and a hosted remote browser; user controls normal login and MFA. Outside the remote viewport, show **Finish connection**, **Cancel**, and connection status. Do not inspect or display secret values in the application chrome. | Finish validates/stores encrypted session and returns to invoking plan/run/session page. Cancel closes without a new session. Site barrier or failed validation explains next user action, without bypass. |
| O02 Share item | Show selected finding or saved workflow, recipient chooser limited to invited users, preview of fields/evidence shared and explicit “No login session or private run history is shared.” One **Share** submission is the complete confirmation, including for authenticated findings. | Success creates a share grant and updates UI. Cancel creates none. Invalid recipient/permission/network error preserves selection. Revocation is offered from the owner's item detail. |
| O03 Export results | Choose current filtered set or all findings, CSV/JSON/clean text; include evidence/site graph when available and optional raw artifacts only if retained. Show estimated item count and whether unknown fields remain. | Generate download; progress and error do not alter run. Do not export credentials/session data. |
| O04 Feedback/correction | Current value/status/evidence, feedback choice Relevant/Irrelevant/Incomplete/Incorrect, optional correction text and reason. | Save attaches feedback to workspace/run/workflow version/finding; original finding and approved workflow remain unchanged. Cancel discards edit. |
| O05 Destructive confirmation | Name the exact item and dependent data, impact on active runs/shares, irreversible deletion or session revoke. Require explicit confirm; no generic “Are you sure?” alone. | Pending disables duplicate submit; success returns to safe parent; error retains dialog and item. No automatic retention deletion. |
| O06 Human attention gate | Inline run panel gives blocker, affected URL/task, safe choices, and what will remain incomplete. | Resume only after access/policy validation; Skip records reason; Stop retains findings. Ambiguous controls never auto-execute. |

## 4. User flows

The notation `user action → system response → destination` makes each step actionable. Flow IDs map to page/component IDs above.

### F01 First invitation and sign-in

**Goal / start / preconditions:** Invited person opens a valid invitation link; operator has issued invite.  
`Invitation link → P01 validates token and displays invitee email → user completes provider authentication → system confirms invited identity and creates/opens personal workspace → P03 Home.`  
**Decision:** invalid/expired/revoked token → access-problem state; only Platform Operator can issue another invitation. Existing invited account → sign in at P02 and return. **Success:** one isolated personal workspace. **Failure:** auth/network error preserves invite context. [FR-WKS-001, FR-ADM-001]

### F02 New general-purpose query in Approval mode

**Goal / start / preconditions:** Owner wants an evidence-backed answer; signed in.  
`P03 New research → P04 enter query and optional sites/filters; set Approval and limits → system validates input and generates typed plan → P05 presents requested/inferred criteria, sources, fields, evidence, limits and AI estimate → Owner edits/approves → system checks scope/policy/budget and creates run → P07 live activity → P08 results.`  
**Decision:** material ambiguity → P05 selectable interpretation; missing authorized access → O01; insufficient AI budget/policy block → edit settings/scope or stop. **Success:** Complete or explicitly Partial report with results and coverage. **Alternative:** Owner leaves without saving; generated workflow remains unsaved. [FR-BASE-001–004, FR-PLN-001–004]

### F03 Autonomous query with public discovery

**Goal / start / preconditions:** Owner accepts bounded delegation for a query.  
`P04 enter query, choose Autonomous, review initial envelope and caps → Start autonomous run → system generates plan and starts P07 without Save workflow → search/link discovery may reach relevant public domains inside initial scope and 20-domain Standard limit → results/coverage update.`  
**Decision:** new scope beyond envelope, access barrier, recipe change, material ambiguity, uncertain interaction, AI cap, search credits, or quota → O06 pause/skip/stop; no silent expansion. **Success:** P08/P10 show findings and accounted-for discovered frontier. **Failure:** retained partial results and precise stop reason. [FR-SRC-003, Section 17.1, AC-017]

### F04 AI Engineer opportunity search

**Goal / start / preconditions:** Owner asks for AI Engineer opportunities; query may include location, remote preference, or sites.  
`P04 query → P05/P07 plan with job fields and Balanced relevance by default → discovery produces candidates → every relevant candidate gets detail-page attempt → P08 shows title, employer, location, arrangement, relevance, detail status → P09 shows available job fields and field evidence → duplicate group merges same opportunity while retaining source listings.`  
**Decision:** detail page blocked/limit reached → finding remains visible and marked Incomplete with reason; missing field → Unknown; duplicate uncertain → inspect/correct via O04. **Success:** results include source URL, supporting evidence, relevance signal, dedup group, and detail extraction. [FR-JOB-001–005, AC-002–004]

### F05 Authenticated site and access barrier

**Goal / start / preconditions:** Owner has authorized access to a target site.  
`P05/P07 Connect site → O01 hosted remote browser → Owner signs in and completes MFA → system stores encrypted user-scoped session → return to plan/run → worker reuses session only for authorized read-only tasks.`  
**Decision:** authenticated-content AI policy off → deterministic/local processing if available, otherwise extraction-unavailable status; site asks for new MFA/CAPTCHA/bot check → pause/stop and ask Owner to use normal site flow; no workaround. **Success:** run resumes after validated session. **Failure:** session invalid/revoked → P16 reconnect or report incomplete. [FR-AUTH-001–006, FR-AI-007]

### F06 Run interruption and recovery

**Goal / start / preconditions:** Active run hits a human gate, quota, crash, or user pause.  
`P07 receives server state → O06 states affected task and safe options → Owner resolves access/reviews recipe or skips/stops → system resumes only pending tasks with persisted state → P07 updates counters → P08 retains already completed findings.`  
**Decision:** worker crash/lease expiry → automatic task reclaim with idempotent result handling; not a new user action. AI timeout may still be billed and is reconciled. Search-credit exhaustion → Partial, no paid search fallback. **Success:** resumed run or clear Partial/Failed terminal state. [Section 23.4, NFR-002–003]

### F07 Finding review, correction, and sharing

**Goal / start / preconditions:** Owner reviews a finding.  
`P08 select finding → P09 inspect each field and evidence → O04 submit relevance/correction feedback → system records feedback without rewriting past result/approved workflow → O02 choose invited recipient and Share → P15 recipient sees only selected item.`  
**Decision:** missing evidence → field is Unknown/Unverified; recipient invalid/revoked → share fails or disappears. **Success:** feedback and share grant recorded; no second confirmation for authenticated finding. **Failure:** preserve input and show error. [FR-EVD-001–005, FR-WKS-002–003]

### F08 Save, approve, and reuse automation

**Goal / start / preconditions:** Owner wants repeatable work from a successful query/run.  
`P08 Save workflow → name and explicitly save version → P12 workflow detail → if the run produced a reusable recipe, open its Draft version at P14 → Owner previews steps → approves → system replays representative pages and checks extraction/evidence → recipe becomes Active → Owner reruns saved workflow from P12.`  
**Decision:** replay fails/drift occurs → Needs Review and no activation; proposed fix creates new version for approval. **Success:** versioned reusable workflow/recipe with linked run. **Alternative:** run once without saving. [FR-BASE-003–005, FR-AUT-001–006]

### F09 Search, filter, export, and deletion

**Goal / start / preconditions:** Owner finds a prior result and manages retained data.  
`P06 search/filter run → P08 filter/sort findings → O03 export selected/current/all with evidence where available → P19 or owning item Delete → O05 displays exact scope → system removes selected content and derived data → list/usage refresh.`  
**Decision:** deletion affects shares/linked artifacts → show scope before confirmation; active run → cancel/settle before deleting run-dependent data. **Success:** download or deletion confirmed. **Failure:** no partial silent deletion; show recoverable error. [FR-ADM-003, DR-003, AC-016]

### F10 Operator invite and audited support

**Goal / start / preconditions:** Authorized Platform Operator invites a beta user or investigates a run.  
`P20 send invite → invitation status updates → invitee completes F01.` For support: `P21 select workspace/item → enter support purpose → system writes access audit → support content opens → operator inspects run content only → P22 shows event to platform admins.`  
**Decision:** audit write fails → private content remains closed; Owner AI policy remains unchanged; raw session secret is never available. **Success:** invitation or audited inspection. **Failure:** admin-only error with no content leak. [FR-WKS-005, FR-ADM-004, DR-004]

## 5. State and interaction specifications

### 5.1 Canonical state vocabulary

| Object | States displayed | Transition rule |
|---|---|---|
| Plan | Generating, Ready, Needs clarification, Invalid, Discarded | Approval mode requires explicit **Approve and run**; Autonomous may start within its envelope. |
| Run | Queued, Planning, Running, Needs attention, Pausing, Paused, Resuming, Complete, Partial, Failed, Cancelled | Server status is authoritative. Terminal run retains findings and stop reason. |
| Task/page | Discovered, Queued, Fetching, Succeeded, Skipped, Blocked, Failed, Cancelled | Every discovered in-scope task reaches an accounted-for terminal outcome for Complete. |
| Finding | Pending enrichment, Enriched, Incomplete, Unknown/Unverified field, Duplicate-grouped | Incomplete relevant findings stay visible. |
| Recipe | Draft, Previewed, Approved, Active, Needs Review, Retired | Active needs approval plus successful replay/evidence check. |
| Site session | Connecting, Active, Expired/site-invalidated, Needs user action, Revoked | Only Owner can reconnect/revoke; default product expiry is No expiry. |
| Share | Sending, Active, Revoked, Unavailable | Grant only selected result/workflow; no session or private history. |

### 5.2 Interaction rules

| Interaction | Expected behavior |
|---|---|
| Click primary CTA | Immediate pressed/loading feedback, one request, disabled while pending; success navigates once. |
| Submit form | Validate inline at the field and show a summary for multi-field errors; keep values on server failure. |
| Cancel form/dialog | Leave object unchanged; if edited, show Stay/Discard. |
| Edit approved workflow/recipe | Create proposed version; existing approved version and prior run stay unchanged. |
| Delete/revoke | O05 names exact scope and consequence; confirm is required. Once server confirms, remove item and announce success. |
| Search/filter/sort | Preserve query in URL for refresh/back; show item count and Clear filters; “no matches” differs from truly empty. |
| Navigate back | Restore list filters/scroll; unsaved form edits trigger Stay/Leave. |
| Refresh active run | Rehydrate state from server; do not resubmit run or replay browser action. |
| Live update | Announce material status/gate changes accessibly; avoid noisy per-page screen-reader updates. |
| Permission-restricted action | Hide private data; show a safe explanation and route back, never partial secret content. |
| Loading | Skeleton for layout, progress text for tasks; do not use indefinite spinner as only feedback. |
| Network failure | Preserve local edits, offer Retry, distinguish stale displayed data from live status. |
| Success feedback | Toast plus persistent destination state (saved version, share grant, run event). |

### 5.3 Critical edge states

| Trigger | Owner-facing state and next action |
|---|---|
| CAPTCHA, MFA, bot detector, access denial | “Site needs your action” with source/domain and Connect/Skip/Stop when valid. No bypass action. |
| Robots/rate limit | Blocked or delayed page with reason in P10; preserve completed findings. |
| AI per-run/monthly cap | Show estimated, reserved, actual and remaining AI use; pause before new model call. Timeout overrun is disclosed. |
| Search free quota exhausted | Partial run, search quota reason, no silent paid upgrade. |
| Storage ≥80% or at limit | Warning at 80%; at limit pause storage-heavy new work, link P19 for manual deletion/capacity. |
| Recipe drift | Needs Review; affected run pause/skip; link P14 with failed selector/field. |
| No evidence for field | Display Unknown/Unverified, not a confident factual value. |
| Unreachable detail page | Relevant finding remains Incomplete with attempted URL and reason. |
| Duplicate uncertainty | Keep grouped originals inspectable and label uncertain match. |
| Unsupported language confidence | Preserve original text; show low confidence/coverage gap, not “no result.” |
| Operator audit failure | Deny support-content view until audit record succeeds. |

## 6. Navigation and routing contract

Routes are UX recommendations. Use opaque IDs; the server checks Owner/share/admin authorization on every route and API response. A forbidden item returns a safe access state, not a leaked title or metadata. Deep links restore the selected tab and filter if permitted.

| Action | Destination | Expected state |
|---|---|---|
| Accept valid invitation | `/app` | Personal workspace Home with onboarding empty state. |
| Sign in after deep link | Original authorized route | Data loaded; forbidden destination shows access state. |
| New research | `/app/new` | Empty composer with Standard defaults. |
| Review plan (Approval) | `/app/plans/:draftId` | Editable generated proposal. |
| Start autonomous / Approve and run | `/app/runs/:runId` | Live activity with queued/planning state. |
| Open run Results | `/app/runs/:runId/results` | Findings with run status/coverage caveat. |
| Open finding | `/app/runs/:runId/results/:findingId` | Field evidence and source. |
| View coverage | `/app/runs/:runId/coverage` | URL ledger and graph, filters retained. |
| Save workflow | `/app/workflows/:workflowId` | Saved version and success state. |
| Review recipe gate | `/app/recipes/:recipeId` | Draft/Needs Review and approval/replay steps. |
| Connect site | O01, return to invoking route | Authenticated session verified or clear failure. |
| Share item | Remain on source item | Active grant and success; recipient sees P15. |
| Export | Remain on source page | Download generated or recoverable error. |
| Revoke session | `/app/sessions` | Session marked revoked; affected runs need attention. |
| Operator open support content | `/admin/workspaces/:id` | Content shown only after audit record succeeds. |

## 7. Forms and validation

The table defines beta form contracts. Character/URL limits beyond those below are implementation details to set with API schema; frontend and backend must share the same schema and error codes. Placeholder text is illustrative UX copy, not a hard product rule.

| Form / field | Type; required; default or placeholder | Validation and inline error | Submit, success, failure |
|---|---|---|---|
| Query / research question | Multiline text; required; blank; “What would you like to research?” | Trim; reject empty/whitespace: “Enter a research question.” Server may return ambiguity choices. | Generate plan/start run; retain input and show Retry on failure. |
| Query / seed URLs | URL chips; optional; blank | Only supported `http`/`https` public destinations after server safety checks; malformed URL: “Enter a valid web address.” Private-network/unsafe target rejected with safe reason. | Added to initial envelope, subject to domain cap. |
| Query / preferred sites, language, filters | Text/chips; optional; blank | Preserve as user-requested criteria; distinguish from inferred plan criteria. | Planner receives values; display interpretation on P05. |
| Query / run mode | Radio; required; **Approval** | One of Approval/Autonomous: “Choose how this run should proceed.” | Determines P05 or P07 path. |
| Query / relevance | Segmented selection; required; Balanced | Broad/Balanced/Strict only. | Saved on run; shown in results. |
| Query / Standard limits | Integer inputs; required; defaults 20 domains, 500 pages, depth 5, 20 minutes, 2 retries/page, 100 MB | Accept domains 1–20, pages 1–500, depth 0–5, minutes 1–20, retries/page 0–2, and MB 1–100. Show each maximum beside its control; reject values outside the range. | Snapshot on run, not retroactively changed. |
| Query / AI cap | Currency amount; required; $0.25 per run | $0.00–$0.25 in $0.01 increments. $0.00 disables model calls for the run; deterministic processing may continue, otherwise planning/extraction is blocked with a reason. The lower of per-run cap and monthly remaining budget governs. Paid routes still require explicit Owner enablement. | Reserve per call; stop model calls at the cap and retain partial findings. |
| Plan / fields and criteria | Structured list; at least one output field for extraction | Unique field names and supported types; show conflict/ambiguity rather than invent a field value. | Approve starts run; server validates structured plan. |
| Save workflow / name | Short text; required; suggested from query | Trim; no blank name; duplicate names may be allowed if ID/version stays unique (**UX recommendation**). | Create saved version; failure leaves run unsaved. |
| Session / expiry | Choice/date; optional; No expiry default | Future date if selected; explain site can invalidate earlier. | Save for Owner's session; error preserves prior expiry. |
| AI policy / authenticated content | Toggle; required; current workspace value | Only Owner can submit; off may make some extractions unavailable. | Persist policy; no operator override. |
| AI settings / monthly cap | Currency; required; $5.00 default | $0.00–$5.00 in $0.01 increments. $0.00 disables model calls. Reducing below already used/reserved amount blocks new AI calls but does not erase usage. | Save for future calls; show used/reserved/remaining. |
| Paid model route | Explicit toggle; disabled default | Only Owner can enable; display possible charges. | No implicit paid fallback. |
| Share / recipient | Invited-user selector; required | Recipient must be eligible; cannot select uninvited address or own workspace as a cross-workspace share. | One Share action creates grant; error preserves selection; no second confirmation. |
| Feedback / classification | Enum; required | Relevant/Irrelevant/Incomplete/Incorrect. Correction text optional; if user proposes a replacement factual value, require supporting explanation or mark as user correction, not source fact. | Append feedback; do not rewrite approved workflow. |
| Export / format and scope | Enum; required; no default scope | Choose CSV/JSON/clean text and selected/current/all; optional evidence/graph/raw artifacts only when available. | Download with progress; no secret material. |
| Operator invite / email | Email; required | Valid email syntax; generic response for account existence; quota error explicit to operator. | Create/send or queue invitation; no public signup. |
| Operator support / reason | Text; required | Nonempty purpose and selected workspace/item; audit write must succeed first. | Open scoped support view; deny if audit fails. |

**Form-wide behavior:** Associate label, hint, and error with each input. On submit, focus the first invalid field and expose a short error summary. On server conflict, show server truth and let the Owner retry; do not overwrite unsaved edits. Use clear decimal/currency formatting while storing numeric values without locale-dependent parsing. [UX recommendation]

## 8. Responsive and accessibility requirements

| Context | Layout and behavior |
|---|---|
| Desktop (recommended ≥1200 CSS px) | Persistent labelled left navigation; run/activity summary and detail can sit side by side. Tables may show more schema columns with horizontal scroll for wide dynamic outputs. |
| Tablet (recommended 768–1199 CSS px) | Collapsible navigation; single-column plan review; run counters wrap; evidence appears in a full-width panel. |
| Mobile (recommended <768 CSS px) | Labelled menu, stacked cards instead of dense tables, sticky primary CTA where safe. Finding evidence opens below field or in a full-screen view. Site graph has a usable URL-ledger fallback. Hosted remote sign-in must remain controllable; if remote viewport is unusable at this width, state the limitation and offer a supported larger viewport rather than misleading controls. |

Breakpoints are UX recommendations; confirm against actual content and remote-browser implementation. The PRD commits to a hosted browser-accessible beta, not a native mobile client. [Section 7]

**Accessibility contract.** Target WCAG 2.2 AA for the beta UI. All controls have programmatic names; headings and landmark order follow the visual hierarchy; keyboard users can reach every action, tab, graph alternative, dialog, and remote-browser chrome. Focus is visible and returns to the invoking control after dialog close. Do not trap focus inside a disconnected remote viewport. Validation errors identify the field and remedy. Status uses text/icon plus color, with contrast meeting WCAG 2.2 AA. Live regions announce stage changes and human gates, not each fetched page. Source excerpts retain `lang` and text direction; Arabic/RTL evidence is rendered correctly even though surrounding UI is English. Tables have headers and responsive equivalents. [NFR-A11Y-001, NFR-LANG-001–004]

## 9. Product-wide UX rules

1. **A CTA names its effect.** Use **Start autonomous run**, **Approve and run**, **Save workflow**, **Validate replay**, **Share**, **Revoke session**, and **Delete**; avoid generic “Continue” at consequential gates. [UX recommendation]
2. **Human approval is placed at real policy gates.** Approval mode requires plan approval before execution. Both modes require Owner preview/approval and successful replay before a generated recipe becomes Active. Autonomous mode can discover public domains within the initial envelope without per-domain prompts. Login/MFA always belongs to the user. [Section 17.1, FR-AUT-003–004]
3. **Never imply unrestricted crawling.** Every run displays limits and coverage; Complete is scoped to discovered in-scope pages. Partial findings remain accessible. [BR-LIM-005]
4. **Evidence accompanies facts.** A field without evidence is Unknown/Unverified. Relevance labels include a reason and are not probabilities. Summaries are identified as generated and link to evidence. [FR-EVD-001, BR-REL-002]
5. **Costs have separate meanings.** Show estimated/reserved/actual AI model usage under $0.25/run and $5/workspace/month defaults; search credits and hosting/storage are separate. A timed-out AI call may still be charged. [BR-LIM-004, Section 23.4]
6. **No silent save or policy expansion.** Generating/running a workflow does not save it. Edits to approved recipes create a proposed version. Scope, paid provider use, and authenticated-content AI policy never change silently. [FR-BASE-003, FR-AUT-003, FR-AI-007]
7. **Destructive actions reveal scope.** Delete and Revoke use O05; no automatic data deletion. Sharing a selected authenticated finding uses one explicit Share action without an additional confirmation. [DR-003, FR-WKS-002]
8. **Notifications are contextual.** Persistent attention appears on Home and Run activity; optional email delivery remains dependent on configured email service. Do not invent a global messaging system. [UX recommendation]
9. **Errors state recovery.** Explain what stopped, which work remains incomplete, and available safe next actions. Do not suggest CAPTCHA/bot-detector bypass or target-site writes. [FR-AUTH-005]
10. **Privacy boundaries are visible.** Owner pages do not expose another workspace. Shares include only selected content. Admin content access is separately audited, invisible in Owner audit views, and excludes session secrets. [FR-WKS-001–005]

## 10. Reusable component inventory

| ID / component | Used on | Purpose and data | Key states |
|---|---|---|---|
| C01 Workspace shell | P03–P19 | Personal navigation, identity, active work | Desktop/mobile, loading, forbidden |
| C02 Admin shell | P20–P22 | Operator-only context and nav | Authorized, forbidden |
| C03 Query editor | P04/P05 | Query, criteria, optional seeds | Empty, dirty, invalid, submitting |
| C04 Run-mode selector | P04/P05 | Approval vs Autonomous responsibilities | Selected, focus, disabled |
| C05 Limit editor/meter | P04/P05/P07/P10/P19 | Configured vs consumed run resources | Default, warning, reached, unknown telemetry |
| C06 AI usage meter | P03/P05/P07/P18 | Estimated, reserved, actual, monthly remaining | Normal, near cap, at cap, overrun disclosed |
| C07 Status badge | Lists/details | Text + icon for run/task/recipe/session | All canonical states, accessible |
| C08 Human-gate panel | P03/P07 | Blocker and safe Owner action | Active, resolving, skipped, resolved |
| C09 Dynamic finding table/card | P08/P15 | Query-specific structured results | Loading, empty, populated, partial, error |
| C10 Evidence viewer | P09/P14 | Field URL, time, excerpt, digest | Verified, unknown, conflict, unavailable |
| C11 Relevance chip | P08/P09 | Fit signal and short reason | Broad/Balanced/Strict, uncertain |
| C12 Duplicate group | P08/P09 | Grouped originals and provenance | Collapsed, expanded, uncertain |
| C13 URL ledger | P10 | Discovered page outcomes and reasons | Loading, filter-empty, populated, partial |
| C14 Site graph | P10 | Observed domain/page links | Loading, populated, oversized, accessible table |
| C15 Workflow version list | P12 | Immutable saved versions | Latest, older, proposed, unavailable |
| C16 Recipe step preview | P14 | Ordered read-only actions | Draft, invalid action, approved |
| C17 Replay validation | P14 | Representative-page result and evidence checks | Pending, running, pass, fail |
| C18 Session card | P16 | Domain, expiry, validity | Connecting, active, expired, revoked |
| C19 Share dialog | P09/P12 | Selected item and recipient | Open, sending, success, error |
| C20 Export dialog | P08/P10 | Format, scope, evidence options | Open, generating, complete, error |
| C21 Feedback drawer | P09 | Classification/correction | Clean, dirty, saving, error |
| C22 Destructive dialog | P06/P11/P16/P19 | Exact deletion/revocation scope | Open, confirming, pending, error |
| C23 Operator access gate | P21 | Purpose and selected private content | Closed, auditing, open, denied |
| C24 Empty/error panel | All lists/details | Exact state, safe next action | No data, no matches, forbidden, retry |

## 11. End-to-end journey

**Entry → Onboarding → Core action → Result → Follow-up → Completion**

1. The Platform Operator sends an invitation (P20). The user accepts it at P01, authenticates at P02 if needed, and lands in their personal workspace at P03. **Friction:** expired invite; recovery is a replacement from the operator.
2. The user selects New research, enters “Find AI Engineer opportunities” at P04, keeps Balanced relevance and Standard limits, and chooses Approval or Autonomous. **Decision:** Approval opens P05 for an editable plan; Autonomous starts P07 within the initial envelope.
3. The planner describes requested and inferred criteria, sources, fields, detail enrichment, evidence, deduplication, and expected AI usage. If authenticated access is needed, the user signs in through O01 and completes MFA personally. **Friction:** site barrier or Owner policy disallowing hosted AI processing; the run pauses/skips or reports unavailable extraction.
4. P07 shows stages, discovered pages, budget meters, and any human gate. The user can pause, resume, or cancel. **Decision:** a hard limit/search quota yields Partial with retained findings; a worker restart resumes unfinished tasks without presenting a new run.
5. P08 lists relevant opportunities and flags incomplete detail pages. The user opens P09 to inspect job fields, source URLs, original-language evidence, relevance, and duplicate originals. P10 shows visited/skipped/blocked pages and the discovered site graph. **Friction:** missing fields remain Unknown; unvisited pages are not claimed as covered.
6. The user provides correction feedback (O04), exports a selected or full result set (O03), shares a selected finding (O02), and explicitly saves the workflow. A recipe may then be previewed, approved, replay-validated, and activated at P14. **Completion:** the saved version and run remain traceable until manual deletion; no account credentials or session state are shared.

## 12. Implementation notes for design and frontend

**Data dependencies.** Use server-owned run, task, attempt, finding, evidence, share-grant, recipe-version, session-status, usage-ledger, and operator-audit resources. A run view must render from persisted state after refresh. The UI may optimistically display local form edits, but must not optimistically claim a run Complete, a recipe Active, a share Active, or a session connected. [Section 23.4]

**Frontend contract.** The API request/response baseline is [api/openapi.yaml](api/openapi.yaml). Generate TypeScript types from this contract and isolate HTTP and Neon Auth calls behind `ApiClient` and `AuthAdapter` interfaces. The auth adapter calls `authClient.token()` and attaches the returned JWT as a bearer credential; FastAPI verifies it with Neon Auth's published JWKS and configured issuer. Route loaders distinguish unauthenticated, forbidden, not found, policy blocked, partial, and retryable error states. The API returns server-enforced ceilings and structured field errors; frontend constants are display defaults only. Show the API's opaque `Problem.traceId` as a support reference on errors.

**Dynamic schema.** The result grid is driven by the generated workflow field definitions. The AI Engineer template has a known starting schema, but generic queries can produce different fields. Use a field renderer keyed by type and evidence state; do not hard-code job columns as the only result shape. [FR-BASE-001, FR-JOB-002]

**Authorization.** Apply workspace and share-grant checks on API responses and route loaders. A share recipient gets only the selected item. The operator support API has a separate role, explicit purpose, audit-before-read, and field redaction. Never send raw cookies/session state to UI logs, analytics, exports, or model prompts. [NFR-SEC-001–004, FR-AUTH-006]

**Run updates.** Polling or server push is an implementation choice. Either must handle reconnect, out-of-order events, stale cached results, and terminal status. Use run/task IDs and timestamps so Activity, Results, and Coverage agree. A cancelled run can retain completed findings. [NFR-002–003, NFR-007]

**Recipe safety.** Render structured actions as data. Generated Playwright code is inspectable/exportable but never becomes a user-editable execution surface in beta. Frontend approval does not activate until backend replay/extraction/evidence checks pass. [FR-AUT-002–008]

**Telemetry and tracing.** Track query start, plan approval, run stage/gate, finding open, evidence open, feedback, export, share, save, recipe approval/replay/drift, session connect/revoke, quota warning, and deletion outcome. Propagate W3C trace context on API calls when the configured observability stack supports it. Client spans may include route/operation, status, duration, release, and opaque trace ID; exclude query text, page HTML, evidence, sensitive URL query strings, invite tokens, bearer tokens, browser sessions, and unnecessary personal data. Do not send private finding text to analytics by default. [Section 26, NFR-OBS-001]

**Design handoff.** Use the listed Stitch resources as visual references; this specification is authoritative for P01, P02, and P06, which have no verified saved Stitch screen. Keep O01–O06 as documented overlay/component states rather than separate routes. Use page IDs and requirement IDs in frontend tickets; each ticket should specify route, permissions, API operation, data contract, state transitions, and success/error copy.

## 13. Beta implementation decisions and gates

This section translates the PRD and the product owner's direction into stable frontend behavior. No product or page-behavior decision remains open for frontend implementation. The decisions below close the previous UX open-question list. Where a value was not already confirmed in the PRD, it is an implementation baseline for the private beta and can be changed before launch without changing the page map. The Neon Auth/FastAPI verification and repository/CI setup are engineering tasks, not unresolved product decisions.

| Area | Private-beta implementation baseline | UI consequence |
|---|---|---|
| Authentication | Use the PRD-selected Neon Managed Better Auth. Invite-only email/password accounts require a verified email. Forgot password and verification use the configured transactional email sender. No public sign-up. | P01 validates a single-use invitation before account creation. P02 supports sign-in, verification state, and password reset without account enumeration. |
| Invitation lifecycle | Invitation links are email-bound, single-use, and expire after 7 days. Resending creates a new token and revokes the previous one. The operator can revoke an invitation. | Show expiry and status from the server. Expired, revoked, and invalid links provide a request-new-invite path without exposing account existence. |
| Neon Auth to FastAPI boundary | The frontend uses the official `@neondatabase/auth` client. `authClient.token()` supplies a short-lived JWT for API requests. FastAPI verifies the EdDSA signature using `NEON_AUTH_JWKS_URL`, checks the issuer from `NEON_AUTH_BASE_URL`, expiry, and subject, then resolves workspace membership and role from server-side data. Never trust browser-supplied owner/workspace IDs. A JWT may remain valid for up to 15 minutes after browser sign-out, so sensitive requests also check that the account and membership remain active. | Authentication stays behind `AuthAdapter`; it refreshes through the SDK, sends `Authorization: Bearer`, and clears local state at sign-out. Route loaders expose only authenticated/unauthenticated/forbidden states. No token enters local storage, analytics, or logs. |
| New-run default | Approval is selected for every new query. Autonomous requires an explicit per-query selection and confirmation of its bounded scope. | P04 opens with Approval selected. Changing mode updates the CTA and explains human gates; there is no silent remembered switch to Autonomous. |
| Shared workflows | Shares are revocable and read-only. A recipient may duplicate a saved workflow into their own personal workspace. The duplicate uses the recipient's limits, policy, providers, and site sessions; a shared object cannot be run directly. | P15 and shared P12 show Inspect and, for workflows, Duplicate to my workspace. Never show the sender's run history or session controls. |
| Crawl and AI ceilings | Standard is the private-beta maximum: 20 domains, 500 pages, depth 5, 20 minutes, 2 retries per page, 100 MB per run, $0.25 AI usage per run, and $5 AI usage per workspace per month. Owners can lower per-query limits and AI caps; dollar caps use $0.01 increments. A zero AI cap disables model calls; deterministic processing continues only where supported. Raising maxima is an operator configuration change. Non-AI search and hosting use is shown separately. | P04 validates at or below the server-returned maxima. P07/P18/P19 distinguish configured, reserved, actual, and remaining usage; the UI never promises the AI cap bounds hosting/search costs. |
| Provider controls | Groq is the primary model route and OpenRouter Free is the secondary route. Provider keys, endpoints, and route health are platform-managed. Paid routes are disabled unless the Owner explicitly enables a platform-approved route; free-quota exhaustion does not trigger paid fallback. | P18 displays read-only provider state, quota state when available, and an explicit paid-route control only when enabled by the platform. Never request provider API keys from beta users. |
| Authenticated-content AI policy | Off by default. When off, authenticated page content is not sent to hosted models for planning, extraction, ranking, embeddings, summaries, telemetry, or analytics. Deterministic extraction is allowed only for fields supported by a validated deterministic extractor; otherwise mark the field Unknown/Unavailable and pause or skip according to run mode. | P18 states exactly what the switch covers. P05/P07 identify policy-blocked work and offer safe next actions; no silent provider fallback. |
| Deletion and retention | User content stays until manual deletion. Confirming deletion immediately revokes related shares/sessions and queues deletion of primary live records and derived indexes/artifacts for completion within 24 hours. Encrypted backups expire within 30 days. Operational traces contain minimized metadata only and are retained for at most 30 days. A downloaded export cannot be recalled. | O05 lists the cascade and backup window. P19 shows deletion status and does not display Complete until live-store deletion is confirmed. Downloaded files are clearly identified as outside Daleel's recall. |
| Invitation and email quota | Invitation links are single-use, bound to the invited email, and expire after 7 days; resend rotates and revokes the previous token. Resend Free is the beta transactional email recommendation: 3,000 monthly messages and 100 per day. Disable paid overage. When the provider limit is reached, preserve the invitation/action as pending, explain the pause, and allow a later retry; never silently incur a charge. | P01/P20 show seven-day expiry and safe recovery. Admin invitation and password-reset flows show delivery-pending/error states with retry. See the provider's current [pricing](https://www.resend.com/pricing?product=transactional); recheck before launch. |
| Site graph | The URL ledger is the canonical accessible coverage view. The graph is a static, optional visualization; selecting a node may filter the ledger, but graph pan/zoom is not required for beta. | P10 always provides the URL ledger and table alternative. Export does not depend on the graph renderer. |
| UI and frontend stack | Use React and TypeScript with Vite for the SPA, React Router for the documented routes, TanStack Query for server state, and generated TypeScript types from `api/openapi.yaml`. Serve the built UI and `/api/v1` from one Cloud Run origin; keep Neon Auth's supported cross-origin flow in the auth adapter. | Implement the core journey against a mockable API client. API schema changes are reviewed before frontend/backend integration. Do not couple page components to raw provider SDK responses. |
| Run updates | Use conditional polling of persisted run state: every 3 seconds while the run page is foregrounded, every 15 seconds in the background, and stop polling terminal runs. Include `updated_at` and monotonic event sequence numbers; ignore stale responses. | P07, P08, and P10 render the same server-owned run/task snapshot after refresh and reconnect. No optimistic terminal status. |
| Accessibility and language | Target WCAG 2.2 AA for the beta UI. The UI is English; source text is preserved, and evidence uses language metadata plus `dir="auto"` for Arabic and other RTL excerpts. | Keyboard access and visible focus cover all controls and dialogs; status never relies on color alone; the site graph has a table alternative. |

### Frontend screen coverage

The table maps all 22 page routes to their design scope. The original Stitch set covers the core research journey. Additional Stitch screen resources are available for P11, P13, P15, P17, and P19–P22 (resource IDs are in `FRONTEND_READINESS.md`); Stitch has not added those resources to the project's listed canvas screens yet. P01, P02, and P06 have complete interaction specifications but no verified saved screen resource. Use this document as the source of truth for all page behavior and use the shared quiet visual system.

| Page IDs | Pages | Design scope |
|---|---|---|
| P01–P02 | Invitation acceptance; Sign-in and access problem | Invite validation, invite-bound sign-in, email verification, password reset, safe error states |
| P03–P10 | Home; Query composer; Plan review; Runs; Activity; Results; Finding detail; Coverage | Primary end-to-end research journey |
| P11–P14 | Workflow library/detail; Recipe library/detail and approval | Explicit save, version history, clone/share boundaries, replay gate |
| P15–P19 | Shared with me; Sessions; Account/workspace; AI policy/providers; Limits/storage/deletion | Workspace isolation, user-operated login/MFA, policy and retention controls |
| P20–P22 | Operator invitations; Workspace operations; Internal access audit | Invite management and audited, purpose-bound support access |

The core frontend milestone is P03–P10, followed by P01–P02 authentication, P11–P19 owner settings and reuse, then P20–P22 restricted operator surfaces. All routes have defined states in Sections 3 and 5; page design does not imply backend capability until its API operation is implemented.

**Release gates remain those in PRD §31.1:** a human-reviewed benchmark covers English and Arabic job/non-job queries, public HTML, PDFs, and authenticated pages; extraction-field precision is at least 90%, relevant-result recall at least 80%, every surfaced factual field has evidence or is marked unknown/unsupported, and there are zero unauthorized site changes or peer-workspace leaks. The Neon Auth integration spike is a first-sprint gate for protected API integration; the rest of the frontend can proceed against the API contract and mock adapter.
