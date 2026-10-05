# Design System: Daleel — Quiet Research Workspace

Source: Daleel PRD and UI/UX specification. This design system guides the Stitch prototype for a private hosted research crawler. The AI Engineer opportunity search is an example; the interface must support any research query and multilingual source material.

## 1. Visual Theme and Atmosphere

Calm, restrained, and efficient. Density 4/10, variance 2/10, motion 1/10. Put the user's next decision first, and show technical details only when they help that decision. Preserve every capability through labelled tabs, drawers, and expandable sections. Avoid a dashboard full of colored cards. The application should feel like a focused research tool rather than a monitoring console.

## 2. Color Palette and Roles

- **Canvas** `#F8F9F8` — near-white app background.
- **Surface** `#FFFFFF` — sidebar, forms, tables, dialogs, and main panels.
- **Subtle surface** `#F2F4F3` — selected row or expanded section only.
- **Ink** `#202826` — primary text.
- **Muted ink** `#56615E` — secondary text and metadata.
- **Line** `#DCE2DF` — quiet dividers and control borders.
- **Deep teal** `#225A55` — the sole chromatic accent, reserved for the primary action, text links, selected control, and focus ring.

Use no colored page backgrounds, gradients, colored card fills, or multi-color status badges. Status is conveyed by a word and a simple icon in ink or muted ink, with a border if separation is needed. A critical interruption may use a single restrained left rule, never a broad saturated panel. Keep a minimum 4.5:1 contrast for text.

## 3. Typography Rules

- **UI and headings:** Geist. Use weight, spacing, and placement for hierarchy.
- **Technical values:** Geist Mono or JetBrains Mono for run IDs, timestamps, URLs, digests, and limits; use it sparingly.
- **Page title:** 26–30 px, weight 650. **Section title:** 17–19 px, weight 600. **Body:** 15–16 px, line height 1.5. **Tables:** 14 px minimum.
- Sentence case and concise labels. No all-caps headings except short table headers. No decorative serif text.

## 4. Components and Information Hierarchy

- **Actions:** at most one filled teal CTA per visible section. Secondary actions are text or neutral outline buttons. Group rare actions in an accessible menu.
- **Navigation:** neutral sidebar with a quiet selected row and a thin teal rail. Keep labels visible. Avoid a second set of large navigation tiles on the page.
- **Panels:** white with thin gray borders or dividers. Prefer one main surface and compact rows over nested cards.
- **Forms:** first show query, relevance, and Approval/Autonomous mode. Put optional seed sites, filters, and Standard limits in clearly labelled expandable sections, with current settings summarized when collapsed. Do not omit the controls.
- **Summaries:** show a short plain-language overview first. Put raw logs, full provenance, per-domain diagnostics, and detailed settings in tabs or expandable details. Make these reachable in one click.
- **Status:** show Complete, Partial, Paused, Running, Failed, Needs attention, or Unknown as text with a small icon. Never use color alone. Explain the reason and next action close to the status.
- **Evidence:** show key source and citation in a finding row; expose field-level excerpts, fetch time, snapshot, digest, and raw source in a detail view.
- **Empty, partial, and blocked states:** retain surfaced findings and provide a clear next step.
- **Targets:** buttons, inputs, and disclosure rows have at least 44 px pointer targets. Visible keyboard focus.

## 5. Layout Principles

Desktop: 220–240 px sidebar and one readable content column. Use a second column only for an essential summary or evidence comparison. Keep query inputs around 760–880 px wide. Avoid repeated three-column metrics and duplicated explanations. Use generous 24–32 px separation between major tasks, but compact 8–12 px spacing within related data. Below 768 px use one column, a labelled navigation menu, stacked results, and no horizontal page scroll.

The primary journey remains: New research → plan review in Approval mode or live run in Autonomous mode → results → finding detail → coverage, workflow, and recipe reuse. Preserve distinct human approval gates for the plan and for generated recipes. For access barriers, show the authorized browser session and Skip page choices. Never imply automated CAPTCHA/MFA bypass or target-site writes.

## 6. Motion and Interaction

Use 120–180 ms transitions only for focus, hover, tabs, drawers, and disclosure. Respect reduced motion. No perpetual animation, pulsing counters, cascading reveals, or shifting layouts while a run updates.

## 7. Anti-Patterns Banned

- No mint-washed page, teal-tinted cards everywhere, rainbow semantic statuses, neon, gradients, or purple AI visual styling.
- No decorative KPI grid, oversized numeric tiles, duplicate budget cards, or repeated explanatory copy.
- No icon-only essential action, tiny low-contrast metadata, dense telemetry on the primary path, or more than one filled CTA per area.
- No hidden capability without a clear labelled way to reach it; no removal of evidence, limits, sessions, workflows, recipes, or coverage.
- No claim of complete web coverage, fabricated evidence, automatic workflow saving, target-site writes, or CAPTCHA/MFA bypass.
