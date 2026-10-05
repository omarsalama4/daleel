# Daleel

Daleel is an invite-only, general-purpose research crawler for a private beta. A query becomes a bounded plan, a read-only crawl, evidence-backed findings, and optionally a saved workflow or approved reusable browser recipe.

## Repository status

The repository includes a live-connected React frontend and a FastAPI/LangGraph backend: persisted runs and tasks, scoped crawling, evidence-grounded extraction, AI cost admission, saved workflows, reusable reviewed recipes, exports, invitations, sharing and audited operator support. An optional isolated human browser broker supports configured site adapters.

Local development is configured; hosted deployment has not occurred. New Neon/Google Cloud projects, provider credentials and real-domain browser adapter validation are still required. See [backend setup](backend/README.md), [deployment](deploy/README.md) and [implementation status](BACKEND_AI_IMPLEMENTATION_STATUS.md). Previous frontend validation and implementation-plan documents describe the earlier prototype stage.

## Source documents

- [Product requirements](Daleel_Product_Requirements_Document.docx)
- [UI/UX specification](Daleel_UI_UX_Specification.md)
- [Design tokens](DESIGN.md)
- [Frontend readiness contract](FRONTEND_READINESS.md)
- [OpenAPI contract](api/openapi.yaml)

## Frontend

From `frontend/`, install dependencies with `npm ci`, then use `npm run dev`, `npm run build`, `npm run lint`, or `npm run test`. The local Node installation must include a working npm launcher. Live HTTP is the default. Explicit development demo mode keeps the mock adapter available for design review.

The repository is public by the owner's choice. The hosted product remains an invite-only private beta; server authorization and tenant controls are implemented, but hosted release validation remains pending.

