# Research browser toolkit

## Implemented

`backend/daleel/browser_tools.py` provides a per-task Chromium context and validated JSON tool schema. Tools: navigate/back, DOM observation, click, search/filter fill and selection, scroll, visible-target wait, extraction and opt-in screenshot. `call(arguments)` returns structured results or sanitized errors. `run(url, decide)` connects an async planner callback to the observe/action/result loop and returns a snapshot plus proposed replay steps.

The toolkit powers the existing renderer and reviewed multi-step recipes in validation and crawling. Recipe editing includes an optional step builder, reviewable action list, approval reset on change, version history and code export. Activation requires preview, approval and evidence-grounded replay. Drift returns to review. Task results/OpenTelemetry record action types/outcomes without input text or image data.

The production worker now connects dynamic, unstructured pages to `BrowserPlanner` through the configured Groq/OpenRouter structured-output route. It can inspect, scroll, wait and extract, or propose a stable click/search/filter step. New controls create a draft recipe and a `browser_review` gate. The user reviews, previews, approves and successfully replays the recipe before resuming; subsequent crawls reuse the approved steps. Page content cannot grant permissions. This is bounded research automation; arbitrary workflows and universal site compatibility are not guaranteed.

Each page permits at most four model decisions inside the browser's 60-second and run deadlines. Every call uses the existing atomic AI reservation/settlement ledger, run/monthly caps, provider fallback rules and trace redaction. Zero-budget or unconsented authenticated pages make no browser-planning calls. A paused/cancelled run is checked before and after model calls. Credentials, storage state, screenshots and input values are excluded from model observations. Navigation stays in the durable crawl frontier, preserving page/depth limits and detail enrichment.

## Planner integration

```python
from daleel.browser_tools import browser_tools

# Scope and selectors come from trusted workflow configuration, not page text.
async with browser_tools(
    fetcher, ["careers.example.com"],
    click_selectors=["#show-details"], search_selectors=["#job-search"],
    max_actions=30, seconds=60, max_bytes=5_000_000,
) as tools:
    registry_entry = tools.tool_definition()
    observation = await tools.call({"action": "navigate", "url": "https://careers.example.com/jobs"})
    result = await tools.call({"action": "click", "selector": "#show-details"})
    # Or result = await tools.run(url, decide)
```

`decide(observation, last_result)` returns validated action arguments, or `None` when finished. Model budget and private-content consent remain the caller's responsibility. Page text is untrusted evidence. No tool evaluates arbitrary model-generated code or reads cookies/storage.

## Boundaries and recovery

- All GET/HEAD requests use the DNS-pinned transport, SSRF protection, robots rules and approved domain scope. POST/other methods, WebSockets, downloads, popups and service workers are blocked.
- Non-link controls and search/filter inputs require reviewed selectors. Password/email/OTP inputs and visible challenges trigger human gates. Unsafe/authentication controls are rejected before proposal as well as execution. Safe methods and selector review reduce risk; arbitrary sites can still misuse GET for state changes.
- Element references are checked against current observations and reviewed selectors. Recipes require stable selectors. Missing, ambiguous or hidden targets fail with drift errors.
- Defaults: 30 actions, 60 seconds, 5 MB. Worker calls retain run transfer accounting/deadlines. No unlimited retries. Browser contexts are disposed on exit. Recovery replays reviewed read-only steps from the beginning.
- Screenshots default off, need caller consent and are transient bounded outputs, excluded from recipes/traces. Proposed steps omit typed values; saved search values must be reviewed explicitly.
- Login/MFA/CAPTCHA are human-only in the separate broker; agent callers never receive broker capabilities.
- Rendered evidence uses the browser's visible text; static hidden/aria-hidden content is excluded. Explicit structured data remains a separate grounding source. Reused recipes that lose required evidence or relevance return to review instead of silently remaining active.

## Human sign-in

The viewer now uses a quiet monochrome layout, three-step instructions, signed-in/expiry status, readable mobile size, fit/zoom, keyboard/scroll disclosure, masked text with optional reveal, clear-on-send/visibility change, actionable errors and explicit close. The modal explains where codes come from, gates Finish until the browser is opened, and cancels/restarts pending connections without abandoning browsers.

Capabilities remain expiring, same-origin and non-cacheable. Closing validates capability or service identity plus workspace ownership. Saved sessions remain encrypted and independent of pending browser lifetime. Site adapters still require real-domain validation.

## Verification

Real Chromium tests cover actions, planner callbacks, stale references, scope/robots, POST rejection, human gates, budgets and screenshots. E2E covers editing/approving/validating/reusing browser recipes, responsive viewer controls, expiration, failed validation and retry. Synthetic fixtures never sign into real accounts. See [E2E instructions](E2E_TESTING.md) and [verification results](E2E_VERIFICATION.md).
