# Daleel (دليل) — Quiet Research Workspace Frontend

A high-fidelity UI prototype for **Daleel (دليل)**, based on the **Product Requirements Document (PRD v1.4)**, **UI/UX Specification (v1.1)**, **DESIGN.md Design Tokens**, and **OpenAPI 3.1 Contract**.

> Prototype status: the default adapters use in-memory mock data. Screens for crawling, security boundaries, hosted sign-in, recipes, and operator audit illustrate intended behavior; they do not implement those services. The live auth adapter and API contract still need integration. See the repository's `FRONTEND_VALIDATION_REPORT.md`.

---

## 🧭 Design System & Aesthetic Principles

Daleel is conceived as an editorial, calm, and distraction-free workspace for rigorous web research. It strictly adheres to the **Stitch UI** design specification:

- **Density:** 4 / 10 (Restrained density, generous breathing room, intentional whitespace).
- **Core Color Palette:**
  - **Canvas:** `#F8F9F8` (Off-white / calm warm gray)
  - **Surface:** `#FFFFFF` (Crisp white for panels, tables, and dialogs)
  - **Line / Border:** `#DCE2DF` (Subtle 1px hairline dividers)
  - **Primary Ink:** `#202826` (High-contrast charcoal slate)
  - **Muted Ink:** `#596561` (Secondary metadata and subtle labels)
  - **Deep Teal Accent:** `#225A55` (Quiet purposeful accent for primary actions)
  - **Alert / Destructive:** `#A33B2E` (Subdued terracotta crimson for warnings and cancellations)
- **Zero Visual Noise:**
  - **No rainbow status badges:** Statuses are expressed with restrained text and a 14px monotone icon.
  - **No mint-tinted card backgrounds:** Surfaces stay pure white `#FFFFFF` with hairline borders.
  - **No oversized KPI tiles:** Metrics are displayed in compact, understated metadata grids.
  - **RTL & Bidirectional Typography:** Full support for Arabic source excerpts and evidence using `dir="auto"` and unicode isolation.

---

## 🛠 Technology Stack

- **Framework:** React 19 + TypeScript (Strict null-checking and OpenAPI typed models)
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`) + Custom CSS variables matching `DESIGN.md`
- **Routing:** React Router 7 (`react-router-dom`)
- **Icons:** Lucide React (Subtle 14px–18px stroke icons)
- **Data Layer:** Dual API Client (`HttpApiClient` for live FastAPI backend, `MockApiClient` for instant high-fidelity local demonstration)
- **Authentication:** `AuthAdapter` pattern with Neon Auth JWT injection and dual-role mock provider (Workspace Owner & Platform Operator)

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v20+` (tested on Node `v24.11.1`)
- npm `v10+`

### Installation & Running

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Run production build and type check
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

---

## 📐 Application Architecture & Routes

### Workspace Shell (`/app`) — Researcher & Workspace Owner
| Route | Screen ID | Description |
|---|---|---|
| `/invite/:token` | **P01** | Invitation Acceptance & Account Setup (7-day single-use token) |
| `/sign-in` | **P02** | Sign-in & Access Problem Resolution (Workspace isolation recovery) |
| `/app` | **P03** | Workspace Home (Recent runs, consumption meter, quick start) |
| `/app/new` | **P04** | Query Composer (Approval default, seed URLs, limit caps) |
| `/app/plans/:draftId` | **P05** | Plan Review Gate (Domain targets, structured schema, search strategy) |
| `/app/runs` | **P06** | Runs Directory (Filterable list of research runs with live status) |
| `/app/runs/:runId` | **P07** | Run Live Activity (Streaming event log, stage indicators, Human Gate banner) |
| `/app/runs/:runId/results` | **P08** | Run Results (Structured findings data table, incomplete extraction panel) |
| `/app/runs/:runId/results/:findingId` | **P09** | Finding Detail & Grounding Viewer (Field-by-field quotes & selectors) |
| `/app/runs/:runId/coverage` | **P10** | Coverage Ledger & Site Graph (Domain crawl topology & URL audit) |
| `/app/workflows` | **P11** | Saved Workflows Library (Explicitly saved playbooks, no auto-pollute) |
| `/app/workflows/:workflowId` | **P12** | Saved Workflow Detail (Version history, parameters, duplicate action) |
| `/app/recipes` | **P13** | Recipe Library (Deterministic Playwright automation with drift flags) |
| `/app/recipes/:recipeId` | **P14** | Recipe Detail & Approval (Side-by-side code review & replay gate) |
| `/app/shared` | **P15** | Shared With Me (Cross-workspace isolation, duplicate-to-own-workspace) |
| `/app/sessions` | **P16** | Site Sessions screen (remote sign-in simulation in mock mode) |
| `/app/settings/account` | **P17** | Account Settings & Support Access Grant |
| `/app/settings/ai` | **P18** | AI Model & Cost Settings (Private content toggle OFF by default) |
| `/app/settings/limits` | **P19** | Workspace Limits & Storage Ledger (Profile limits, 500 MB budget meter) |

### Platform Operator Console (`/admin`)
| Route | Screen ID | Description |
|---|---|---|
| `/admin/invitations` | **P20** | Operator Invitations (Issue single-use token links, revoke access) |
| `/admin/workspaces` | **P21** | Operator Workspaces Directory (mock operational data) |
| `/admin/access-audit` | **P22** | Operator Access & Audit screen (mock audit data) |

---

## 🧩 Overlays & Attention Gates

- **O01 Hosted Interactive Browser Sign-In Modal (`O01HostedSignInModal.tsx`):** Hand-off for interactive MFA, SSO, or CAPTCHA; never stores or exposes credentials.
- **O02 Share Item Modal (`O02ShareItemModal.tsx`):** Grants explicit view-only access with strict cross-workspace isolation reminders.
- **O03 Export Results Modal (`O03ExportResultsModal.tsx`):** Multi-format export (Clean JSON, CSV, Field-cited Markdown, URL Ledger).
- **O04 Field Grounding Feedback Drawer (`O04FeedbackDrawer.tsx`):** Fine-grained quote correction, selector repair, and conflict reporting.
- **O05 Destructive Action Modal (`O05DestructiveConfirmModal.tsx`):** Exact-match confirmation for irreversible actions (workspace deletion, run cancellation).
- **O06 Attention Gate Banner (`HumanGateBanner.tsx`):** Actionable, non-blocking alert for CAPTCHA, authentication, or drift events with safe recovery paths (`connect_site`, `review_recipe`, `skip_task`, `stop`).

---

## 🔒 Intended Security Boundaries (not enforced by the prototype)

1. **Zero-Bypass Policy:** The production crawler must pause and alert the researcher at MFA, CAPTCHA, and anti-bot barriers. The current UI only simulates this gate.
2. **Authenticated Content Privacy:** The production backend must enforce the Owner's authenticated-content AI setting; the mock initializes it to false.
3. **Hard Limit Enforcement:** The production scheduler must enforce domain, page, depth, time, retry, byte, and AI spend caps. The UI currently validates some client inputs.
4. **Tenant Isolation:** The production API and database must enforce workspace authorization and Row Level Security. The mock does not provide a security boundary.
