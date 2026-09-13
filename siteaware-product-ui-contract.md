# SITEAWARE — COMPLETE PRODUCT UI CONTRACT (read-only audit)

Regenerated 2026-09-12 from current working trees. No code modified,
no commits, no pushes. On any conflict between this document and the
repositories, the repositories win.

- CORE / BACKEND: `C:\Users\UNRWA\Desktop\siteaware-local-integration` —
  branch `integration/local-e2e`, HEAD `eabc303096351a53b4999bc05296a7e949a8558e`,
  status: M `app/integration/bridge.py`, `app/integration/learning.py`,
  `app/integration/routes.py`, `extension/content-script.js`,
  `scripts/start-siteaware-local.ps1`; untracked
  `app/integration/interactions.py` (NEW 5-class classifier),
  `scripts/start-siteaware-local.ps1.ps51-backup`.
- REACT STUDIO: `C:\Users\UNRWA\Desktop\siteaware-widget-studio` —
  branch `feature/studio-extension-live-preview`, HEAD
  `a6901d59722bf8776866b398f24e50c65511a2d9`, tree committed (only
  untracked scratch: `siteaware-product-ui-contract.md`,
  `src/extension-entry.backup`, `src/styles.css.backup`).

Global invariants: **GUIDE ONLY, Stage 6 OFF**. No provider keys,
credentials, cookies, tokens, or page content in the extension — except
SiteAware's own ephemeral session token in `chrome.storage.session`.

---

## 1. Repository Inventory

**Core** (`siteaware-local-integration`): `app/agent/ auth/ browser/
discovery/ guide/ integration/ knowledge/ llm/ models/ pilot/
repositories/ runtime/ security/ semantics/ site_graph/`; entries
`server.py` (imports app from `5_serve.py`), `5_serve.py`, `menu.py`,
`tools.py`, `tools/`, `bench/`, `data/` (`siteaware.db` ~1.6 MB SQLite,
`appearance/` per-site JSON git-ignored, `widget-config.json`), `docs/`
(`architecture/`, `integration/`), `extension/` (reference MV3 +
`runtime/app_state.js`, `shared/`, `tests/loop-harness.mjs`), `tests/`
(~100 files), `scripts/`, `requirements*.txt`, `pytest.ini`, `runtime.txt`.
Key runtime files: `app/integration/routes.py` (all extension/local
endpoints), `bridge.py` (`ValidatedObservation`), `learning.py`
(`LearningSession`+manager), `interactions.py` (classifier),
`query.py` (5C), `verify.py` (5E), `appearance.py`,
`design_profile.py`, `app_profile.py`, `site_profile.py` (Rousheta consts),
`graph_bridge.py`, `extension_cors.py`; `app/fastapi_app.py` (main app);
`app/guide/resolver.py` (5C); `app/pilot/graph_ingestion.py`
(`_SAFE_ROUTE_LABELS`); `app/security/route_templates.py` (`:id`
templating); `app/discovery/*` (D0–D7). Docs:
`architecture/siteaware-product-runtime.md` (master ref + D-phase truth
matrix), `architecture/siteaware-unified-client-contract.md` (frozen
`siteaware-client-v1`), `architecture/siteaware-capability-map.md`,
`architecture/application-learning-runtime.md`,
`integration/extension-runtime-contract.md`, `DISCOVERY_ARCHITECTURE.md`,
`stage5c-guide-target.md`, `SECURITY_BASELINE.md`, `AUDIT_ACTION_PLAN.md`,
`LEGACY_*.md`. Tests that matter: `test_architecture_contracts.py` (12),
`test_convergence_contract.py`, `test_master_e2e_contract.py`,
`test_extension_loop.py`, `test_extension_app_state.py`,
`test_integration_local_e2e.py`, `test_integration_graph_edges.py`,
`test_integration_alias.py`, `test_integration_origin_binding.py`,
`test_integration_recursion.py`, `test_integration_second_app.py`,
`test_guide_stage5c.py`, `test_guide_live_5d.py`,
`test_guide_verify_5e.py`, D-stage files `test_browser_observation_d1.py`
+ `test_discovery_{route_frontier_d2,state_d3,dynamic_d4,visual_d5,
coverage_d6,reliability_d7}.py`, knowledge `test_knowledge_*.py`,
auth/runtime/graph suites.

**Studio** (`siteaware-widget-studio`): `src/App.tsx` (~2700 lines:
Studio + `OwnerPanel`), `src/extension-entry.tsx` (MV3 entry),
`src/main.tsx` (dev entry :5173), `src/studioData.tsx` (catalogs),
`src/themeIntelligence.ts` (snapshot analysis + 3 recommendation
strategies), `src/AutoMatchPanel.tsx` (legacy), `src/studio/adapters/
UnifiedSiteAwareExtensionAdapter.ts` (472 lines, the real bridge),
`src/studio/adapters/ExtensionStudioAdapter.ts` (legacy, unused by owner
flow), `src/styles.css` (design system); `extension/` (manifest MV3,
`sidepanel.html/.js` legacy vanilla, `service-worker.js`,
`content-script.js`, `build-info.js` `unbuilt` placeholder, `shared/`
`widget-catalog.js`, `site-design-analyzer.js` (`scanSiteDesignV2`),
`theme-engine.js`, `assistant-provider.js`, legacy `demo-profiles.js`,
`mock-conversation.js` — NOT used by owner flow); `scripts/
build-extension.mjs`, `vite.config.extension.ts` (iife →
`sidepanel-bundle.js` + CSS), `vite.config.ts`, `server.mjs` (dev
`/api/health|/api/chat|/api/design`), `render.yaml`, `package.json`
(react 19, vite 7, scripts: dev/dev:ui/dev:server/build/
build:extension/test:extension/preview/start); `dist/extension/`
(git-ignored output: bundle ~341 KB, CSS ~67 KB); `tests/extension/
privacy-and-config.test.mjs` (4 tests). No node_modules/dist inventoried.

---

## 2. Final Product Architecture

```text
React Owner Extension (sidepanel-bundle.js + CSS)
  │  <App adapter={UnifiedSiteAwareExtensionAdapter} />
  ▼
UnifiedSiteAwareExtensionAdapter (472 lines)
  │  fetch → http://127.0.0.1:8000 (absolute, never relative)
  │  chrome.tabs/scripting/storage.session/runtime.sendMessage
  ▼
service-worker: tab orchestration, LEARN_PASS inactive-tab navigator,
                Studio /api/chat + /api/design relay
content-script: widget renderer + SAFE observer + highlighter + SCAN_PAGE
  │  POST /api/extension/v1/* · GET /api/local/* · /dev/status
  ▼
Backend app/integration/routes.py — Bearer session +
X-SiteAware-Site-Origin double-bound, per-session rate limits
  ├── Discovery runs/frontier (D2) + LearningSessionManager (in-memory)
  ├── SiteGraph (nodes/edges/aliases) + discovery evidence tables
  ├── Knowledge (auto structural + owner text/document)
  ├── Guide 5C → 5D highlight contract → 5E verify
  ├── Appearance store data/appearance/<site_id>.json
  └── Server-side LLM provider (optional grounded enrichment)
        ▼
data/siteaware.db (sites, discovery, graph, knowledge, auth, semantics)
data/appearance/*.json · chrome.storage.session (token, memory-only)
```

Split (frozen `siteaware-client-v1`): **browser** owns tab identity,
observation, SPA-stability wait, same-origin navigation (one inactive tab),
live ctl-N/lnk-N resolution, outline highlight, manual click, route
notices; **React** owns rendering, navigation, forms, loading/empty/error
states, deterministic Auto Match, messaging — zero intelligence (no
frontier/resolution/verification/graph logic in JS); **backend** owns
sessions, frontier/dedupe/budgets, templates, evidence, graph, knowledge,
retrieval, access policy, LLM, 5C/5E, appearance, secrets; **persistence**
is SQLite + per-site JSON + ephemeral token (facts carry `run_id`);
**provider** runs server-side over grounded evidence only, else
deterministic fallback (never invention).

---

## 3. Owner Product Modes

`StudioMode` (`App.tsx:39-52`): build|design|preview|test (PreviewMode,
`test` duplicated) |auto-match|overview|application|learn|brain|
knowledge|test|assist|settings. Strip (`:1850`) renders 12 pills; router
(`:1916`) → 8 owner modes to `OwnerPanel` (`:475`); `auto-match` →
legacy `AutoMatchPanel`; `design` → AI copilot UI; else → Studio build UI.

| Mode | Renders | State/handlers | Status |
|---|---|---|---|
| overview (`:517`) | capability/readiness/page/map stat cards + Refresh | `ownerCaps/Profile/Readiness/Page/Map/Appearance`, `refreshOwnerContext` (:892) | OPERATIONAL; UNAVAILABLE when backend/tab/token missing |
| application (`:540`) | name/URL/origin/scope/language/budget + ADD→OPEN(new tab)→I HAVE LOGGED IN + 5 readiness rows | `appName/Url/Origin/Scope/Lang/Budget/Added` | OPERATIONAL client-side + live verify; NO server registry write (pilot app is backend config) |
| design (`:1970` branch) | AI prompt + shortcuts + result + full Studio rail/preview | `designPrompt/Status/Summary/Reasoning`, `runDesignCopilot` (:1717) | OPERATIONAL legacy Studio |
| learn (`:617`) | START/PAUSE/RESUME/STOP + single pass + 8 metric rows | `learnSession`, `handleStartLearn` (:917), `handleLearnAction` (:934), `handleLearnPassOnce` (:953) | OPERATIONAL (needs token + approved tab) |
| brain (`:653`) | state/pages/routes/nodes/edges/sessions + area cards | `ownerMap` | OPERATIONAL read-only |
| knowledge (`:689`) | AUTO vs CUSTOMER counts | `ownerMap` | OPERATIONAL read-only; NO add/edit/delete UI |
| test (`:718`) | question + 5C/5D/5E buttons + 9-field evidence grid | `testQuestion/Result/StructuralId/HighlightOk/Verify`, handlers :1035/1058/1069 | OPERATIONAL end-to-end |
| assist (`:756`) | grounded conversation + composer, no diagnostics | `assistInput/Log`, `handleAssistSend` (:1092) | OPERATIONAL |
| settings (`:784`) | mgmt-key field + Detect/AutoMatch/Save + stage rows | `designProfile/mgmtKey`, handlers :977/990/1010 | OPERATIONAL (PUT 403/503 w/o key) |
| build/preview/auto-match | templates, 7 galleries, live preview, quick controls, presets; snapshot editor | legacy Studio state | OPERATIONAL visual-editing only |

Loading: `ownerLoading` disables buttons ("Refreshing…"). Empty:
`UNAVAILABLE / NOT LEARNED` via `fmtOwner`. Error: red error card with
`UNAVAILABLE:*` code.

---

## 4. Unified Adapter Contract

`src/studio/adapters/UnifiedSiteAwareExtensionAdapter.ts`;
`BACKEND_BASE='http://127.0.0.1:8000'`, `APPROVED_ORIGINS=
['https://rousheta.net']`; token ← `chrome.storage.session`,
origin ← active tab. All failures throw `Error('UNAVAILABLE:<CODE>')`.

| Method (:line) | In → Out | Endpoint / message | Screens |
|---|---|---|---|
| `getCapabilities` :220 | — → `{contract_version, mode, stage6, capabilities}` | `GET /api/extension/capabilities` (public) | Overview, Settings |
| `getDevStatus` :226 | — → `{version, mode, stage_6, real_actions, learning_sessions,…}` | `GET /dev/status` (public) | Overview |
| `getSiteProfile` :232 | — → `{site_id, origin, allowed_host, start_route, login_route, locale, direction, access_scope,…}` | `GET /api/local/v1/site-profile` (public) | Overview, Application, Learn |
| `getReadiness` :240 | — → `{tabUrl, siteOrigin, inScope, hasSessionToken, state: READY\|LOGIN_REQUIRED\|OUT_OF_SCOPE\|NO_SESSION}` (local eval) | chrome only | Overview, Application |
| `getCurrentPage` :257 | — → `{url, origin, path}` (structural) | chrome only | Overview, Test, Assist |
| `getAppearance` :269 | `siteId` → appearance dict | `GET /api/local/v1/appearance?site_id=` (public) | Overview, Settings |
| `saveAppearance` :276 | `config, siteId, managementKey` → appearance | `PUT …/appearance?site_id=` + `X-Management-Key`, auth:false | Settings |
| `getDesignProfile` :287 | — → profile or throw | inject + `SITEAWARE_SCAN_PAGE` → `{ok, profile}` | Settings |
| `autoMatch` :308 | profile → appearance (sync, offline pure) | none (`buildAppearanceFromProfile` :179) | Settings |
| `startLearning` :313 | `{start_route, max_unique_pages=25, max_depth=3}` → session | `POST …/learning-sessions` (auth) | Learn |
| `getLearningProgress` :325 | `sessionId` → session | `GET …/learning-sessions/{id}` (auth) | Learn |
| `pauseLearning` :330 / `resumeLearning` :335 / `stopLearning` :340 (=cancel) | `sessionId` → session | `POST …/{id}/pause\|resume\|cancel` (auth) | Learn |
| `requestLearnPass` :346 | `{origin, routes≤30, maxPages=25}` → `{status, visited[{route,status,observation?}]}` | `SITEAWARE_LEARN_PASS` → worker | Learn |
| `ingestObservation` :365 | `sessionId, observation, navigatedRoute?` → `{node_id, discovered_url_id, session, next_route,…}` | `POST …/observations` (auth) | Learn |
| `getBrainMap` :373 | — → `ApplicationMap` (§10) | `GET …/application-map` (auth) | Overview, Brain, Knowledge |
| `observeActiveTab` :378 | — → observation or throw | inject + `SITEAWARE_OBSERVE` → `{status, observation}` | Test, Assist |
| `toCurrentPage` :398 | observation → `{url,title,language,direction,headings:[],links≤30,semantic_controls≤30}` | pure | Test, Assist |
| `askAssist` :411 | `question, locale` → `QueryResult` | OBSERVE best-effort + `POST …/query` (auth) | Test 5C, Assist |
| `highlightTarget` :420 | `ctl-N\|lnk-N` → bool | `SITEAWARE_HIGHLIGHT` → `{highlighted}` | Test 5D, Assist |
| `clearHighlight` :434 | — → void | `SITEAWARE_CLEAR_HIGHLIGHT` | available, NO button wired |
| `resolveStructuralId` :443 | backend identity → `ctl-i\|lnk-i\|''` | fresh OBSERVE + label match | Test 5D, Assist |
| `verifyArrival` :459 | `{expected_route, observed_route_template, observed_url, session_id?}` → `{status, reason, message_ar, recovery}` | `POST …/verify` (auth) | Test 5E |

---

## 5. Backend API Contracts (`app/integration/routes.py`)

Auth: `Authorization: Bearer …` + `X-SiteAware-Site-Origin: https://<host>`
(double-bound to registered site; `extension_cors.py` reflects
`chrome-extension://` only for `/api/extension/*`, `/api/local/*`,
`/dev/status`); per-session rate limits. Verified decorators: POST
learning-sessions :128, GET session :159, pause :168, resume :177, cancel
:186, POST observations :320, POST query :371, POST verify :397, GET
appearance :415, PUT appearance :426 (management key), GET site-profile
:444, GET application-map :449, GET capabilities :541, GET dev/status :561.

| Method+Path | Body → Response | Auth | R/W | Screens |
|---|---|---|---|---|
| `GET /api/extension/capabilities` | — → `{contract_version:'siteaware-client-v1', mode:'GUIDE_ONLY', stage6:false, capabilities:{design,learn,assist,highlight,verify:true, actions:false}}` | none | R | Overview, Settings |
| `GET /dev/status` | — → `{version, mode:'GUIDE ONLY', stage_6:'DISABLED', real_actions:'DISABLED', learning_sessions,…}` | none | R | Overview |
| `GET /api/local/v1/site-profile` | — → `{version, profile:{site_id, origin, allowed_host, start_route, login_route, locale, direction, access_scope, same_origin_only, max_unique_pages, max_depth}}` | none | R | Overview, Application, Learn |
| `GET /api/local/v1/appearance?site_id=` | — → `{version, appearance:{…v1…}}` | none | R | Overview, Settings |
| `PUT /api/local/v1/appearance?site_id=` | appearance → `{version, appearance}` (403 no key, 503 unconfigured, 422 strict) | mgmt key | W | Settings |
| `POST /api/extension/v1/learning-sessions` | `{start_route, max_unique_pages, max_depth}` → `{version, session}` + discovery run (422 budgets) | runtime | W | Learn |
| `GET …/learning-sessions/{id}` | — → `{version, session}` (404) | runtime | R | Learn |
| `POST …/{id}/pause\|resume\|cancel` | — → `{version, session}` | runtime | W | Learn |
| `POST /api/extension/v1/observations` | `{session_id, observation, navigated_route?}` → `{version, node_id, discovered_url_id, redacted_labels, session, next_route}` (409 inactive, 422 incl. mutation-route/unknown/forbidden keys) | runtime | W | Learn |
| `GET /api/extension/v1/application-map` | — → `{version, site_id, scope_id, state:learned\|not_learned, appearance_configured, pages_observed, routes_known, graph_nodes, graph_edges, auto_knowledge_sources, customer_knowledge_sources, areas[], sessions[]}` | runtime | R | Overview, Brain, Knowledge |
| `POST /api/extension/v1/query` | `{question 1–4000 chars, locale, current_page\|null}` → `QueryResult` (§19–20) | runtime | R | Test, Assist |
| `POST /api/extension/v1/verify` | `{expected_route, observed_route_template, observed_url, session_id?}` → `{version, status:verified\|not_verified\|inconclusive, reason, message_ar, recovery:none\|replan}` | runtime | R | Test 5E |
| Studio AI (not core): `POST /api/chat`, `POST /api/design` | dev `server.mjs`; worker relays to hosted Studio backend | none(dev) | R/W-config | Design |

No `application/configuration` or `readiness` HTTP endpoints exist.

---

## 6. Current Page / Context

Available (`bridge.py:192-234`): `origin`, `url` (UUID→`:id`),
`canonical_path`, `route_template`, bounded `locale/language/direction/
title`, `headings` (allowlisted only), `links[]` (same-origin templated
`href`, `route_template`, allowlisted `label`, `lnk-N`), `controls[]`
(`role`, allowlisted `label`, `ctl-N`, `has_icon`,
`icon_source∈{svg,img,font,unknown}`, `icon_evidence⊆
{aria-label,title,text}`, `disabled`, `expanded∈{true,false,null}`),
`tables[]` (header strings, `tbl-N`), `fields[]` (type/role only, `fld-N`),
`captured_at`, `access_scope∈{public,authenticated}`, `redacted_labels`,
`dropped_links`. Caps: 100 links/controls, 20 headings/tables, 30 headers,
500-char URLs. Sanitized: labels survive ONLY via `_SAFE_ROUTE_LABELS` +
generic chrome set (else `""` + redacted count); cross-origin/mutation
links dropped; UUIDs templated. Never captured (whole-payload rejection,
recursive key scan `bridge.py:43-55,75-94`): values, body text, raw
HTML/DOM, cookies/storage/headers/tokens/passwords/secrets, images,
DOM ids/XPath/selectors, field names, network bodies.

---

## 7. Learning / Discovery

`START LEARN` → run+session (frontier seeded) → single pass: LEARN_PASS →
one inactive tab → skip login fragments → navigate → 1.5 s-quiet SPA
stability → OBSERVE → ingest each visit → progress refresh. Stops:
frontier exhausted, `max_unique_pages`, pause/cancel. Server fan-out per
observation: discovery evidence → graph node → evidence edges + Auto
Knowledge (`graph_bridge`) → session accounting (idempotent per template;
locale redirects → `aliases`, never pages) → `next_route`; safe links
(depth<max) extend frontier. D-map (`siteaware-product-runtime.md:48-59`):
D0 bench lab LAB ONLY; D1 rendered observation ACTIVE; D2 frontier/dedupe
ACTIVE; D3 state identity PARTIAL (templates); D4 dynamic HISTORICAL
(Playwright path, not extension); D5 visual MODELS ONLY (captures OFF);
D6 coverage ACTIVE (run-scoped); D7 budgets ACTIVE. Backend fetchers serve
the crawl path into the same tables; same-browser path never fetches.

---

## 8. Learn Screen Data

From `LearningSession.as_dict()` (`learning.py:52-72`): `session_id`
(`lrn_`+12hex), `state` active|paused|complete|cancelled, `current_item`,
`pages_observed`, `aliases_resolved`, `frontier_depth`, `nodes_added`,
`edges_added`, `observations_ingested`, `rejected_routes`,
`interactions_explored`, `site_id/scope_id/run_id`,
`max_unique_pages/max_depth`, `created_at/updated_at`; per-visit
`{route,status:OBSERVED|SKIPPED_LOGIN_SCOPE|NAVIGATE_FAILED|UNSTABLE|
UNRESOLVED,observation?}`; map-level counts + `sessions[]`. UI shows 8
rows. NOT AVAILABLE: per-class safe/blocked/unknown breakdowns (no
counters), per-page state lists, error stream, coverage % (counts only).

---

## 9. Interaction Safety (`app/integration/interactions.py`, untracked v1)

Exactly one class per control + `interact` bool; no evidence → UNKNOWN →
never touched; bilingual EN+AR substring markers, over-blocking intended:
`observe_only` (default; disabled stays observable), `safe_ui_state`
(interact:true — tab/menu/menubar/menuitem*/dialog/alertdialog/
disclosure/switch), `safe_navigation` (interact:true — href + resolved safe
same-origin target), `unsafe_mutation` (save/submit/delete/remove/create/
send/pay/purchase/upload/prescribe/approve/confirm/logout/login/signin/
signup/password/checkout/subscribe/delet/cancel + AR roots — label/role/
href), `unknown` (unresolved links, targetless buttons, malformed, rest).
Caveat: authorizes observation-time learning only; current traversal loop
navigates routes, not controls (`note_interaction` unwired to the pass) —
tabs/menus/accordions describable, routes traversable, rest observe-only.

---

## 10. Application Brain

`GET /application-map` (`routes.py:449-539`): `site_id/scope_id`
(isolated; PUBLIC≠AUTHENTICATED server-side), `state`
learned|not_learned, `appearance_configured` (+schema version),
`pages_observed` (ever_observed>0), `routes_known`, `graph_nodes`,
`graph_edges` (summed outgoing ≤500×500), `auto_knowledge_sources`
(`source_key` ⇒ `auto:`), `customer_knowledge_sources` (rest),
`areas[]` (allowlisted tails `{entity_id,label_ar,label_en}`),
`sessions[]` (`{session_id,state,pages_observed}`). Internal (NOT for UI
dumps): `node_id=route_node_id(canonical_route_key)`,
`canonical_route_key`, `ever_observed`, edge lists.

## 11. Brain Screen Data Contract (showable TODAY)

Graph overview (`graph_nodes/graph_edges/routes_known`); page cards
(`pages_observed` + `areas[]` cards: entity + AR/EN label + fixed
`Status: VERIFIED / Scope / id` caption — per-page URL/state detail NOT
available); transitions/aliases as counts only (`aliases_resolved`;
pairs not exposed); scope/coverage via `scope_id/state/sessions[]`
(`session_id/state/pages_observed` = current/last runs); evidence/
verification/knowledge refs NOT here (tables / per-query).

---

## 12. Knowledge

**Auto**: `record_structural_knowledge` (`graph_bridge.py:212`) writes
`source_key="auto:"+sha256(…)` evidence-backed structural sources;
SQLite `knowledge_sources` (+chunks/versions); reads
`GET /api/sites/{id}/knowledge/{sources,chunks,versions,content,search,
retrieval(+/graph,/agentic),evidence,answer}` (management-gated,
`fastapi_app.py`). UI: count only. **Customer**: `POST
…/knowledge/sources/text` (`KnowledgeTextCreate`, `fastapi_app.py:1405`,
repo `create_owner_text_source` :110), document create/update
(multipart), update text, `tombstone_source` (repo :555) delete,
lexical/embeddings rebuild+status; site+scope isolated, `source_key`
unique. UI: count only, read-only. ADD/EDIT/DELETE owner UI: NOT
available (backend ready with mgmt key; unwired — needs design + key UX).

---

## 13. Design System / Studio (`src/studioData.tsx`)

11 categories (`:1181`): assistantIcon 20 (orb-01…premium-20), launcher
**20**, chatShell **12**, assistantMessage **12**, userMessage **12**,
inputBar **10**, sendButton **15**, header **10**, sourceCitation **8**,
takeMeThere/CTA **10**, theme **12** palettes (siteaware-default,
neutral-light, dark, midnight, blue-saas, purple-ai, emerald, warm-beige,
graphite, healthcare, education, premium-black). 15 full presets (`:757`):
apple-liquid-glass, apple-calm, copilot-dock, claude-editorial,
chatgpt-minimal, gemini-glass, intercom-support, siteaware-default,
clean-saas, enterprise, dark-ai, friendly, healthcare, education, premium.
Studio `AppearanceConfig` (`:54`): `radius` sm|md|lg|xl,
`widgetWidth/Height`, `density` compact|comfortable|spacious,
`fontScale`, `shadowStrength`, `launcherSize` sm|md|lg,
`launcherPosition` bottom-right|bottom-left|left-edge|right-edge,
`primaryColor`. Backend AppearanceConfig v1 is a DIFFERENT strict schema
(flat `theme/primary_color/radius_px/density/launcher_position/
launcher_shape/direction/font_scale/panel_width_px/panel_height_px/locale`
+ nested `launcher{style,size,icon}/palette{secondary,background,surface,
text,muted,border}/chat{message_style,input_style,send_style}/
typography{font_category}/assistant{name,cta_style}/shadow{family}` +
`version/site_id`); Studio↔backend mapping is manual (Save sends a subset).

---

## 14. Website Design Detection (`SITEAWARE_SCAN_PAGE`)

`scanSiteDesignV2(document)` (`shared/site-design-analyzer.js:3`) →
`{ok, profile}`; computed-style evidence only. AVAILABLE: color/surface/
text/border #hex lists, font families (short names), weights, radius +
button/card/input radii, shadow (none|soft|medium), direction/locale, icon
source/fill/sizes, evidence counters. PARTIAL: `density_hint` (accepted,
dropped). NOT AVAILABLE: spacing scale, button/input/card traits (radii
only). Sanitization: validator rejects DOM/cookies/tokens/bodies/URLs/
markup/secrets, wrong types, unknown keys, out-of-range numbers.

---

## 15. SiteDesignProfile

Exact schema (`design_profile.py`, version `siteaware-design-profile-v1`).
Validator: `validate_site_design_profile` — unknown keys rejected;
`_check_color` (#hex, 7 chars); `_check_text` (non-empty ≤64 chars, no
forbidden markers, no `<>`); lists bounded; numbers ranged.

| Field | Accepted | Rejected/dropped | Source |
|---|---|---|---|
| `application_id` | str 1–64 | empty/>64 | extension config (e.g. `rousheta`) |
| `origin` | `https://…` ≤120 | other schemes/paths/query | active tab origin |
| `dominant_colors/surface_colors/text_colors/border_colors` | ≤12 #hex each | non-hex, >12 | sampled computed styles |
| `font_families` | ≤8 short names ≤64 chars | URLs/markup/secret-like | computed font stacks, cleaned |
| `font_weights` | ≤8 ints 100–900 | others | computed weights |
| `font_scale` | 0.75–1.5 | else | measured/default 1.0 |
| `radius_px/button_radius_px/card_radius_px/input_radius_px` | ints 0–32 | else | measured radii |
| `shadow` | none\|soft\|medium | else | blur/spread heuristic |
| `direction` | rtl\|ltr\|auto | else | `document.dir` |
| `locale` | str ≤16 | longer | `document.lang` |
| `icon_source` | svg\|img\|font\|css\|unknown | else | observed icon markup kinds |
| `icon_fill` | outline\|filled\|unknown | else | stroke/fill heuristic |
| `icon_sizes_px` | ≤8 ints 8–96 | else | measured icon boxes |
| `evidence_elements_sampled/evidence_interactive_sampled` | ints 0–100000 | else | sampler counters |
| `density_hint` | key accepted | **value dropped** (never copied to profile) | — |

Privacy: no DOM/cookies/tokens/bodies/URLs (except `origin`)/
markup/secrets; `_FORBIDDEN_MARKERS`: `sk- ghp_ akia bearer password
secret token cookie apikey api_key javascript: <script http:// https://
data: blob:`. Realistic example (supported fields only):

```json
{
  "version": "siteaware-design-profile-v1",
  "application_id": "rousheta",
  "origin": "https://rousheta.net",
  "dominant_colors": ["#6d28d9", "#8b5cf6"],
  "surface_colors": ["#ffffff"],
  "text_colors": ["#1e1b2e"],
  "border_colors": ["#ece9f5"],
  "font_families": ["system"],
  "font_weights": [400, 700],
  "font_scale": 1.0,
  "radius_px": 12,
  "button_radius_px": 12,
  "card_radius_px": 16,
  "input_radius_px": 12,
  "shadow": "soft",
  "direction": "rtl",
  "locale": "ar",
  "icon_source": "svg",
  "icon_fill": "outline",
  "icon_sizes_px": [22, 24],
  "evidence_elements_sampled": 84,
  "evidence_interactive_sampled": 17
}
```

---

## 16. Auto Match

Actual implementation: `buildAppearanceFromProfile` (adapter:179), called
by `autoMatch` (:308) from `handleAutoMatchApply` (`App.tsx:990`). Input:
§15 profile dict. Output: flat backend-named appearance dict. Mapped:
first #hex of `dominant_colors`→`primary_color` (fallback `#6d28d9`);
first #hex of surface/text/border lists → `surface/text/border` (omitted
if none); `radius_px` clamped 0–32 (fallback 12); `direction` ltr
passthrough else rtl; `locale` sliced 8 chars (fallback `ar`); first font
matching `/^[A-Za-z0-9 \-]{1,32}$/` (≤4 kept) → `font`; fixed
`theme:'light'`, `density:'comfortable'`,
`launcher_position:'bottom-right'`, `launcher_shape:'round'`,
`font_scale:1.0`, `panel_width_px:380`, `panel_height_px:560`. NOT mapped:
secondary/background entries, weights, shadow, density, icon style/size,
launcher style/size/position, chat/input/send/typography/assistant
sections, dark mode. Limitations: single-color heuristics, no contrast
check, fixed geometry. Fallback/error: no profile → throw
`UNAVAILABLE:NO_DESIGN_PROFILE`; handler additionally writes
`primary_color/panel_width_px/panel_height_px` into Studio
`config.appearance` so preview visibly changes. No network, no AI, no
fake `{ok:true}`.

---

## 17. Recommended Assistant Design Data

Per §15 field, what future UI may truthfully recommend:

- primary color — DETERMINISTIC (first dominant #hex)
- secondary/accent — DETERMINISTIC, weak (second dominant #hex; no role
  semantics — label "inspired by", not "detected")
- background — NOT CURRENTLY POSSIBLE (no background field; surface is not
  background)
- surface — DETERMINISTIC (first surface #hex)
- text — DETERMINISTIC (first text #hex)
- borders — DETERMINISTIC (first border #hex)
- typography — DETERMINISTIC, partial (family list + weights + scale;
  no pairing/role mapping)
- radius — DETERMINISTIC (4-way splits)
- shadows — DETERMINISTIC (none|soft|medium enum)
- direction — DETERMINISTIC (rtl|ltr|auto)
- density — NOT CURRENTLY POSSIBLE (`density_hint` dropped; needs new
  evidence + validator change)
- launcher — NOT CURRENTLY POSSIBLE (no launcher-shape evidence)
- icon style — AI-ENRICHED at best (source/fill/sizes describe observed
  icons; taste mapping needs AI + icon catalog)
- chat shell — AI-ENRICHED (style choice, not measurement; AI Designer over
  catalog is the path)

---

## 18. AI Designer

Actual flow TODAY: `runDesignCopilot` (`App.tsx:1717`) and style analysis
(`:1679`) POST `/api/design` with `{prompt|locale, site:{name,vibe},
config (FULL Studio config), themeMode, catalog: buildDesignCatalog()
(variant id/label/note lists)}` — verified request bodies at `:1682` and
`:1733`. From the extension, worker `SITEAWARE_DESIGN` relays the same
payload to the hosted Studio backend. Response `{ok, summary?,
reasoning[]?, patch?}` → `applyDesignPatch` (`:1440`) →
`normalizeDesignPatch` (`:1362`) allowlists every key (unknown ids dropped,
numbers clamped, colors `/^#[0-9a-f]{6}$/`). Endpoint: dev `server.mjs`
`/api/design`; production: hosted Studio backend (NOT core). Provider:
server-side only; failure → error card, local state kept. No-key: style
path degrades to local deterministic match (`themeIntelligence`) with
explicit notice. NOT sent: raw DOM, values, credentials, tokens,
screenshots. **SiteDesignProfile is NOT included in the request today**
(verified in both bodies) — attaching it is the §17 upgrade path.

---

## 19. Test Mode / 5C / 5D / 5E

5C — input `{question (trimmed, 1–4000 chars), locale, current_page
(toCurrentPage or null)}`; `POST /query` → `run_local_query`:
`resolve_guide_target` statuses RESOLVED|AMBIGUOUS|UNRESOLVED|OUT_OF_SCOPE|
GONE (reasons `ambiguous_control_match/route_match`,
`ambiguous/unresolved_target`) + deterministic graph allowlist fallback.
Output `QueryResult`: `answer`, `grounded`, `target{identity,safe_label}|
null`, `path[]`, `path_status`, `verification{expected_route}`,
`resolution{status,reason}`, `evidence{graph_path,path_status,
target_node_observed,current_node_observed}`,
`current_page{route_template,identity,observed}`,
`guide{mode:'highlight',target_identity,expected_route}|null`,
`version,provider_used`. Ungrounded → refusal text, never invented.
5D — `guide.target_identity||target.identity` → `resolveStructuralId`
(fresh OBSERVE, case-insensitive match controls→links) → `ctl-i|lnk-i` →
`SITEAWARE_HIGHLIGHT {structural_id}` → `saHighlightTarget`
(same selector/visibility/cap as collection) → `{highlighted}` → 3 px
outline + badge + best-effort scroll, zero behavior change. Failures:
`''` (no match), `false` (missing node), throw (no tab/worker).
Founder clicks MANUALLY — no auto-click exists. 5E — `POST /verify
{expected_route, observed_route_template, observed_url, session_id?}` →
`verify_navigation` templates both sides (`:id`): `verified
(route_matched|alias_reconciled)` | `not_verified (route_mismatch)` |
`inconclusive (no_expected_route)` + `message_ar` + `recovery
(none|replan)`; aliases reconcile locale redirects. Click alone never
verifies. UI shows truthfully: Current Page, Access Scope, Grounding,
Answer, Target identity, Expected route, Structural id, 5D state,
5E verdict. Nothing faked.

---

## 20. Assist Mode

`handleAssistSend` → `askAssist(question, locale)` (OBSERVE best-effort →
`POST /query`) → append `answer` (throw → `UNAVAILABLE / NOT LEARNED`) →
if `guide.target_identity`, resolve + highlight (fail-silent). Scope from
session (`auth:` prefix → AUTH_PROFILE else PUBLIC); retrieval over graph
+ knowledge with access gating; server-side provider enrichment over
grounded evidence only; deterministic fallback otherwise. Available
response fields: `answer, grounded, target, path, path_status,
verification, resolution, evidence, current_page, guide, provider_used,
version`. Assist renders text only; diagnostics stay in TEST.

## 21. Content Script

Studio `extension/content-script.js` (~770 lines), guard
`__SITEAWARE_WIDGET_STUDIO_LOADED__`, dual role:

| Message | In → Out | Purpose | Privacy |
|---|---|---|---|
| `SITEAWARE_OBSERVE` (:733) | — → `{status:'OBSERVED', observation{url,title,language,direction,route_template,origin,links≤100,controls≤100,captured_at,access_scope}}` | safe snapshot | structural only (§6) |
| `SITEAWARE_HIGHLIGHT` (:741) | `{structural_id}` → `{status:'HIGHLIGHTED', highlighted}` | 5D outline | outline+scroll only |
| `SITEAWARE_CLEAR_HIGHLIGHT` (:749) | — → `{status:'CLEARED'}` | remove outlines | none |
| `SITEAWARE_SCAN_PAGE` (:768) | — → `{ok, profile}` via `scanSiteDesignV2` | design evidence | computed styles only |
| `SITEAWARE_RENDER_WIDGET` (:758) | `{config}` → `{ok}` | live Studio preview | renders owned widget DOM |
| `SITEAWARE_REMOVE_WIDGET` (:763) | — → `{ok:true}` | remove preview | none |
| `SITEAWARE_ROUTE_CHANGED` (outbound) | `{url}`, debounced observer | SPA notice → panel refresh | path only |

No network in script. Canonical pure reference: core
`extension/content-script.js` (290 lines, OBSERVE/HIGHLIGHT/CLEAR only).

---

## 22. Service Worker

Studio `extension/service-worker.js` (~175 lines). REAL: side-panel
behavior on install + `action.onClicked` → `sidePanel.open`;
`SITEAWARE_GET_TAB_ID` (:135) → `{tabId}`; `SITEAWARE_LEARN_PASS`
(:139) → `runLearningPass` (:84: one `about:blank` inactive tab reused;
skip login-fragment routes; `tabs.update`; `waitForStability`
readyState+size quiet 1.5 s ≤15 s; `observeTab`; `SITEAWARE_LEARN_PROGRESS
{visited,route}` notices; tab closed) → `{status:'LEARN_PASS_DONE',
visited[]}`; `SITEAWARE_PREVIEW_CHAT` (:148) → hosted Studio
`POST /api/chat` → `{ok,reply,message}` (preview assistant only);
`SITEAWARE_DESIGN` (:162) → hosted `POST /api/design` →
`{ok,…patch/summary}` (visual editing only); unknown →
`{status:'UNKNOWN_MESSAGE'}`, exceptions → `{status:'WORKER_ERROR'}`.
NOT implemented: frontier ownership (backend), observation (content
script), clicks/fills/mutations, user-tab navigation. Stateless.

---

## 23. Stage 6

Proven separately from owner navigation (`routes.py` verified lines):
capabilities `mode:'GUIDE_ONLY'` (:549), `stage6:false` (:550),
`capabilities.actions:false` (:557); `/dev/status` `mode:'GUIDE ONLY'`,
`stage_6:'DISABLED'`, `real_actions:'DISABLED'` (:561-567); zero
execution-kernel imports in `app/integration/` (only docstring tripwire
note :7). Owner UI exposes no action affordances (highlight-without-click,
navigate+observe-only learn, read-only knowledge). The 9-section nav is
NOT Stage 6.

---

## 24. Current UI Structure

`div.app-shell` (mode/theme/radius/density/launcher/view classes, inline
css vars) → `header.hero` (eyebrow, title + api-status-pill, description,
meta, AR/EN + light/dark + Save/Export/Reset) → `section.mode-strip.panel`
(12 `mode-pill`s + variant-count stat) → `main.studio-grid` (3 col:
`aside.panel.left-rail` | `section.preview-column` |
`aside.panel.right-rail`). Left rail: 8 owner modes → `OwnerPanel`
(sticky intro/refresh/error + per-concern `panel-section`); auto-match →
`AutoMatchPanel`; design → copilot; build/preview → templates + 7
galleries. Preview column: toolbar (device/site toggles, AI state,
copilot-template, widget toggle) + `laptop-preview-stage` (dock + live
widget) + launcher overlay. Right rail (always designer): quick controls
(`demo-kit` + 9-field `settings-grid`) + named presets. Responsive:
`.preview-focused` collapses to one column hiding rails; device pills
rescale; NO dedicated narrow-owner layout — 12 pills wrap tall in ~360 px,
owner content shares the left rail with the tall preview column, right
rail stays designer controls in owner modes.

---

## 25. Current CSS / Design Tokens (`src/styles.css`)

Vars (`:root`): `--background #f6f8fd`, `--surface #ffffff`,
`--surface-secondary #eef3fb`, `--text #111827`, `--muted-text`,
`--primary #2563eb`, `--primary-text #ffffff`,
`--border rgba(17,24,39,.12)`, `--assistant-bubble #f3f6fb`,
`--user-bubble #dbeafe`, `--success #10855a`, `--warning #ca8a04`,
`--danger #c2415b`, `--shadow-color 0 24px 60px rgba(16,24,40,.12)`,
`--radius 30px`, `--font-scale 1`, `--shadow-strength .9`,
`--widget-width 420px`, `--widget-height 620px`; patterns `color-mix()`
tints, `calc(16px * var(--font-scale))`, shadow calc with
`--shadow-strength`, `blur(18px)` panels, `999px` pills; system font stack
only (Google Fonts removed). Classes: `app-shell, panel, panel-section
(+.sticky), panel-heading, mode-strip, mode-pill (+.active), device-pill,
site-pill, mode-stat, api-status-pill, hero* family, studio-grid,
left/right-rail, preview-column/toolbar, preview-ai-state, category-pill,
preset-card/library, variant-card/grid (+ per-category galleries),
theme-card/grid, chat-template/response/composer/send-style grids+cards,
copilot-intro/textarea/suggestion-grid/result-card/insight-list,
style-intake(+note)/reasoning, auto-*/sample-*/analysis-*/recommendation-*/
contrast-*/spotlight-*, demo-kit, settings-grid, search-input,
primary/secondary/ghost/cta/send/copilot-template buttons,
toggle-launcher, code-block, conversation (+typing), message-row
(+user/assistant-row), message-card (+user/assistant-message),
message-avatar/meta, status-dot/line, source-*/action-row, composer
(+widget-input), widget-shell/header/title/avatar/actions, action-icon,
laptop-preview-stage, assistant-dock, site-frame/canvas, mock-site*,
site-chrome/address/dots, site-launcher-overlay, launcher-node (+size/
position) + 20 launcher families, preview/site-zone-labels, empty-state,
build-info, toast`.

---

## 26. Current Visual Problems (read-only; NOT fixed)

Too many top-level modes (12 pills, owner+legacy mixed, tall wrap in
360 px); TEST pill mislabeled "Test Experience" for 5C/5D/5E; Studio and
Owner tools mixed (right-rail designer controls persist in owner modes);
long Design controls (templates + 7 galleries + preview + presets);
owner evidence grids scroll beside the tall preview column; hidden/
overflow navigation (no compact dashboard — Overview is a stat list);
weak hierarchy (error/empty states share one red card + `UNAVAILABLE`
strings: token vs scope vs backend-down look alike); legacy
build/preview/auto-match exposed as primary modes; management-key PUT
has only a password field (403/503 surprise); Assist/TEST separation
relies on navigation, not visual language.

---

## 27. Data Availability Matrix

| Screen | Data/field | Source | Real-time? | R/W | Available? | Notes |
|---|---|---|---|---|---|---|
| Overview | capabilities/mode/stage6 | capabilities | on Refresh | R | YES | — |
| Overview | site identity/origin/scope | site-profile | on Refresh | R | YES | — |
| Overview | tab URL/path, readiness | chrome+token | on Refresh | R | YES | guides login |
| Overview | pages/nodes/edges/auto/customer/appearance | application-map | on Refresh | R | YES | — |
| Application | form + 5 readiness rows | local state + readiness | on Verify | R | YES | no server registry |
| Design | catalogs/presets/config/AI patch | Studio + /api/design | interactive | R/W-config | YES | visual only |
| Learn | §8 session metrics + visits | session API + worker | per action | R/W-session | YES | — |
| Brain | nodes/edges/areas/sessions | application-map | on Refresh | R | YES | counts+areas only |
| Knowledge | auto/customer counts | application-map | on Refresh | R | YES | counts only |
| Test | answer/grounding/target/route/highlight/verdict | query+worker+verify | per action | R/W-session | YES | — |
| Assist | grounded answer + highlight | query+worker | per message | R | YES | — |
| Settings | appearance/profile/stage | appearance API + SCAN | per action | R/W-keyed | YES | PUT needs key |
| — | per-class interaction counts | none | — | — | NO | classifier w/o counters |
| — | per-page URL/state detail | none exposed | — | — | NO | — |
| — | coverage % | counts only | — | — | NO | raw counts exist |

---

## 28. Action Availability Matrix

| Action | Screen | Implementation | Contract | Safe? | Today? | Limitation |
|---|---|---|---|---|---|---|
| Add Application | Application | local flag | none (client) | yes | YES | no server registry |
| Verify Login | Application | `getReadiness`+refresh | chrome only | yes | YES | — |
| Detect Website | Settings | SCAN_PAGE | chrome message | yes | YES | — |
| Auto Match | Settings | pure transform | none | yes | YES | partial fields (§16) |
| AI Designer | Design | `/api/design`+allowlist | Studio backend | yes | YES | profile not attached |
| Start Learn | Learn | learning-sessions | backend auth | yes | YES | token+tab needed |
| Pause / Resume / Stop | Learn | …/pause\|resume\|cancel | backend auth | yes | YES | state-gated no-ops |
| Single Learn Pass | Learn | LEARN_PASS+ingest | worker+backend | yes | YES | ≤30 routes/pass |
| View Brain | Brain | application-map | backend auth | yes | YES | — |
| View Auto Knowledge | Knowledge | map count | backend auth | yes | YES | count only |
| Add/Edit/Delete Customer Knowledge | — | UNWIRED | backend ready+key | n/a | NO | backend-only |
| Ask Question | Test/Assist | query | backend auth | yes | YES | — |
| 5C Resolve | Test | `askAssist` | backend auth | yes | YES | — |
| 5D Highlight | Test | worker message | chrome | yes | YES | manual click |
| 5E Verify | Test | verify endpoint | backend auth | yes | YES | needs expected route |
| Save Appearance | Settings | PUT+key | backend+mgmt key | yes | YES | 403/503 w/o key |
| Preview Assistant | Design | provider/assistant-provider | Studio/dev | yes | YES | preview only |

Backend support ≠ UI support (see Customer Knowledge row).

---

## 29. Design-safe Boundaries

MAY CHANGE: layout, hierarchy, navigation structure/labels (keep mode
KEYS), cards, icons, spacing, colors, responsive behavior, grouping,
loading/empty/error presentation (keep `UNAVAILABLE:*` codes visible),
gallery/preset arrangements. MUST NOT CHANGE: endpoint paths/methods/
bodies, adapter semantics, `SITEAWARE_*` names+shapes, privacy boundaries
(allowlist/redaction/templating/forbidden keys), ctl-N/lnk-N/tbl-N/fld-N
ordinal semantics, session machine (active|paused|complete|cancelled),
5C statuses/reasons, 5E verified/not_verified/inconclusive + recovery,
`GUIDE_ONLY`/stage6-false/actions-false, Bearer + site-origin auth,
management-key gating, per-site appearance isolation, `BUILD_INFO`
injection, backend truth/error semantics.

---

## 30. Ideal UI Information Architecture (capabilities only, no coding)

OVERVIEW (landing dashboard): readiness banner
(READY/LOGIN_REQUIRED/OUT_OF_SCOPE/NO_SESSION) + 4 count tiles
(pages, nodes/edges, auto, customer) + appearance + stage + Refresh.
APPLICATION (gate): form → open → verify (unchanged) + origin/token chips.
DESIGN (keep legacy Studio intact): templates, galleries, copilot, preview,
presets; surface Detect/AutoMatch/Save as header shortcuts (no logic
duplication). LEARN: session card + lifecycle + pass log + metrics;
future per-visit list (data already returned). BRAIN: counts + area cards
+ session chips; alias pairs need an endpoint field — do not mock.
KNOWLEDGE: two sections as today; future: wire text/document + tombstone
APIs behind key (backend ready). TEST: keep 5C→5D→5E stepper + evidence
grid; add Clear-highlight (`clearHighlight` exists, unwired). ASSIST: pure
chat + "open in TEST" handoff. SETTINGS: connection (capabilities/dev
status), management key, appearance raw view. Legacy Build/Preview/
Auto Match: internal DESIGN functionality, demote from primary nav.

---

## 31. Final Product UI Contract Summary

Safe to expose: capabilities/dev-status/site-profile/appearance-GET,
readiness/current-page (chrome-local), full learning lifecycle + single
passes, application-map counts + areas, grounded query + highlight +
verify, deterministic Auto Match, catalog-allowlisted AI Designer,
appearance PUT behind key. Partial: knowledge (counts only — writes
backend-ready but unwired), brain detail (areas/counts, no per-page
states), interaction classes (classifier new, counts absent, control
execution unwired), density/launcher/shell recommendations (no evidence
or AI path yet), AI Designer without profile attached. Unavailable:
server app-registry writes, per-class metrics, coverage %, per-page
state/URL detail, alias pairs, in-UI customer-KB management, provider
control from extension. Honesty gaps to preserve: `UNAVAILABLE /
NOT LEARNED` empties, `UNAVAILABLE:*` error codes, refusal texts,
alias-vs-page distinction, allowlist≠knowledge attribution. Constraints:
360 px panel, 12-pill strip, mixed rails, frozen contracts/messages/
ordinals/state-machines/privacy/Stage-6-OFF. Risks: core branch carries
uncommitted work (bridge/learning/routes/content-script + untracked
classifier) — behavior may shift under this document; Studio↔backend
appearance schemas differ (manual mapping); TEST pill mislabel;
management-key UX (silent 403/503); `density_hint` silently dropped.

SITEAWARE UI CONTRACT AUDIT COMPLETE — NO CODE CHANGED


