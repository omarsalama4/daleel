# Daleel

Daleel is an invite-only, general-purpose research crawler for a private beta. A query becomes a bounded plan, a read-only crawl, evidence-backed findings, and optionally a saved workflow or approved reusable browser recipe.

## Repository status

The `frontend/` application is a **UI prototype with a stateful mock API**. It renders the 22 specified screens and can demonstrate the query, plan, run, results, recipes, sessions, sharing, and operator flows. It does not crawl websites, authenticate with Neon, connect a hosted browser, enforce server-side limits, or persist data. Selecting the HTTP adapter requires a backend that has not been implemented yet. See [frontend validation](FRONTEND_VALIDATION_REPORT.md) and the [backend and AI plan](BACKEND_AI_IMPLEMENTATION_PLAN.md).

## Source documents

- [Product requirements](Daleel_Product_Requirements_Document.docx)
- [UI/UX specification](Daleel_UI_UX_Specification.md)
- [Design tokens](DESIGN.md)
- [Frontend readiness contract](FRONTEND_READINESS.md)
- [OpenAPI contract](api/openapi.yaml)

## Frontend

From `frontend/`, install dependencies with `npm ci`, then use `npm run dev`, `npm run build`, `npm run lint`, or `npm run test`. The local Node installation must include a working npm launcher. Keep the mock adapter for design review only.

The repository is private while the hosted beta, auth boundary, and data-handling controls are being built.

