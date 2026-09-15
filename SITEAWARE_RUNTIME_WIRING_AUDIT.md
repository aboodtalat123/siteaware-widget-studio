# SiteAware Runtime Wiring Audit

## Executive Verdict

`SYSTEM ARCHITECTURE WIRED — LIVE RETEST REQUIRED`

The Studio/Extension runtime is wired to the canonical local backend, and the missing Extension caller for AI-assisted discovery was added. A fresh authenticated browser run is still required before any `LIVE PROVEN` claim.

## Current Runtime

- Studio branch: `feature/studio-extension-live-preview`
- Studio baseline before this audit: `8066908e7faff3d2183df7f845c4c96bfb99f275`
- Backend branch observed: `integration/local-e2e`
- Backend HEAD observed: `eabc303096351a53b4999bc05296a7e949a8558e`
- Running backend process: `python scripts/local_serve.py 8000`
- Backend app factory: `app/fastapi_app.py:create_app()`
- Integration route registration: `app/fastapi_app.py` imports and calls `register_integration_routes`

## Gemini

- `.env` loaded: `true`
- `GEMINI_API_KEY` configured after UTF-8 no-BOM fix: `true`
- Key length observed safely: `53`
- `GEMINI_MODEL`: `gemini-3.8-flash`
- Provider: `gemini-discovery-v1`
- Real minimal provider call: `FAIL:AI_ASSIST_PROVIDER_UNAVAILABLE`
- Secret exposure: no key value printed, logged, bundled, or committed.

## Extension To Backend Map

```text
src/extension-entry.tsx
→ src/App.tsx
→ src/studio/adapters/UnifiedSiteAwareExtensionAdapter.ts
→ extension/service-worker.js
→ extension/content-script.js
→ http://127.0.0.1:8000/api/extension/v1/*
→ siteaware-local-integration/app/integration/routes.py
```

## Endpoint Map

- Runtime session: `POST /api/extension/v1/runtime-session`
- Learning session: `POST /api/extension/v1/learning-sessions`
- Learning progress: `GET /api/extension/v1/learning-sessions/{session_id}`
- Observation ingest: `POST /api/extension/v1/observations`
- D3 authorization: `POST /api/extension/v1/interactions/authorize`
- Interaction transition: `POST /api/extension/v1/interaction-transitions`
- D6 coverage: `GET /api/extension/v1/learning-sessions/{session_id}/coverage`
- D7 reliability: `GET /api/extension/v1/learning-sessions/{session_id}/reliability`
- AI discovery: `POST /api/extension/v1/learning-sessions/{session_id}/ai-discovery`
- Application map: `GET /api/extension/v1/application-map`
- Assist query: `POST /api/extension/v1/query`
- Verify: `POST /api/extension/v1/verify`

## AI Discovery Fix Applied

Before this audit, the backend endpoint existed but the Extension adapter did not call `/ai-discovery`.

Now `UnifiedSiteAwareExtensionAdapter.getAiDiscoveryCandidates()` calls the backend endpoint when deterministic D3 produces no executable disclosure target.

Safety chain after the fix:

```text
D1 sanitized observation
→ deterministic disclosure descriptors
→ Core D3 authorize
→ if no target: backend AI discovery proposal
→ map AI evidence_id/element_uid back to original descriptors
→ Core D3 authorize again
→ content script live DOM re-match
→ structural click only if exact one match
→ re-observe
→ link delta
→ ingest same D2 frontier
```

AI never clicks coordinates and cannot bypass D3.

## Test Results

- Widget/Extension build: `PASS`
- Extension tests: `PASS, 73 passed, 0 failed`
- Backend selected tests: `FAIL`

Backend selected failures are in existing fixtures/contracts, including:

- `_db.connect()` called without required `database_url`
- `LearningSessionManager.note_observation` missing in tests
- fixture constructors missing required arguments
- Arabic collapsed fixture imports missing `should_invoke_ai_visual_fallback`

## Security And Privacy

- Gemini key remains outside React/Extension bundle.
- Extension test confirms no obvious secret markers in bundle.
- AI visual path is server-side/fallback-only; screenshots remain off in the Extension caller added here.
- Auto Learn remains structural: no submit/save/create/delete/send/approve/pay/upload/logout.
- Stage 6 remains OFF.

## Remaining Gaps

- Real Gemini provider call returned `AI_ASSIST_PROVIDER_UNAVAILABLE`; likely provider/model/API availability needs provider-side verification.
- Backend graph/D6/D7 E2E is not proven because selected backend tests fail before validating the actual runtime.
- Fresh authenticated browser retest is required on the approved site.

## Live Browser Retest Steps

1. Start or restart backend from `C:\Users\UNRWA\Desktop\siteaware-local-integration` using the canonical local server.
2. Reload unpacked extension from `C:\Users\UNRWA\Desktop\siteaware-widget-studio\dist\extension`.
3. Open the approved authenticated site.
4. Create/refresh runtime session from the extension.
5. Run Learn from the current authenticated page.
6. Confirm collapsed navigation opens only after D3 authorization.
7. Ask Arabic and English guide intents:
   `وين المواعيد؟`, `وديني عالمواعيد`, `وين قائمة الموظفين؟`, `Where are appointments?`, `Take me to appointments.`
8. Verify graph nodes and edges through Application Map and backend graph checks.
