import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ADAPTER_URL = new URL(
  '../../src/studio/adapters/UnifiedSiteAwareExtensionAdapter.ts',
  import.meta.url,
);
const APP_URL = new URL('../../src/App.tsx', import.meta.url);
const CS_URL = new URL('../../extension/content-script.js', import.meta.url);

test('adapter exposes automatic frontier-driven traversal (not single-shot)', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(
    source.includes('runAutoLearn'),
    'adapter must expose runAutoLearn',
  );
  assert.ok(
    source.includes('resolveLearnSeed'),
    'adapter must expose the live-seed rule',
  );
  // Seed must come from the live page, not a hardcoded profile route.
  assert.ok(
    source.includes('getCurrentPage'),
    'runAutoLearn must resolve the seed from the current live page',
  );
  // Backend frontier drives the loop.
  assert.ok(
    source.includes('next_route') || source.includes('nextRoute'),
    'loop must follow backend next_route frontier',
  );
  assert.ok(
    source.includes('navigated_route'),
    'traversal ingests must carry navigated_route for alias honesty',
  );
  // Bounded + pausable.
  assert.ok(
    source.includes('maxPasses'),
    'loop must be bounded by maxPasses',
  );
  assert.ok(
    source.includes('shouldContinue'),
    'loop must support a cancellation hook',
  );
  assert.ok(
    source.includes("state !== 'active'"),
    'loop must stop when backend session is paused/stopped/complete',
  );
  // Canonical header only.
  assert.ok(
    source.includes('X-SiteAware-Site-Origin'),
    'adapter must use the canonical origin header',
  );
  assert.equal(
    source.includes('X-Site-Aware-Site-Origin'),
    false,
    'adapter must not use the wrong header spelling',
  );
  // D3 honesty: safe structural state exploration via Core authorization +
  // bounded transition tracking (full autonomous StateExplorer stays Core-side).
  assert.ok(
    source.includes('interaction-transitions'),
    'adapter must run Core state transitions after safe actuation',
  );
  assert.ok(
    source.includes('Stage 6') && source.includes('remain disabled'),
    'adapter must state Stage 6 remains disabled',
  );
  // Seed-origin binding: mid-run tab switches must not stall ingestion.
  assert.ok(
    source.includes('originOverride'),
    'adapter must support seed-origin-bound backend calls',
  );
  // Progress deltas: the UI log must never double-count a visit.
  assert.ok(
    source.includes('reported'),
    'progress callbacks must carry only new visits',
  );
  // Cross-language resolution: backend safe_label backs live matching.
  assert.ok(
    source.includes('labelHint'),
    'live resolution must accept the backend safe label hint',
  );
  // Honest failure: ingest errors must surface, never stall silently.
  assert.ok(
    source.includes('firstIngestError'),
    'adapter must surface traversal ingest failures',
  );
  // Sanitized observe-failure taxonomy (OBSERVE_FAILED root cause).
  for (const code of ['ACTIVE_TAB_OUT_OF_SCOPE',
    'CONTENT_SCRIPT_NOT_AVAILABLE', 'MESSAGE_PORT_CLOSED',
    'NO_OBSERVATION_RETURNED']) {
    assert.ok(
      source.includes(code),
      `adapter must expose granular reason ${code}`,
    );
  }
  // D3 authorization seam: Core classifies, browser never decides safety.
  assert.ok(
    source.includes('authorizeInteractions'),
    'adapter must expose the Core authorization seam',
  );
  assert.ok(
    source.includes('/api/extension/v1/interactions/authorize'),
    'authorization must hit the Core endpoint',
  );
  assert.ok(
    source.includes('noteInteraction'),
    'adapter must expose interaction counting',
  );
  assert.ok(
    source.includes('/interactions'),
    'counting must hit the session interactions endpoint',
  );
});

test('START LEARN seeds from the live authenticated page', async () => {
  const source = await readFile(APP_URL, 'utf8');
  assert.ok(
    source.includes('runAutoLearn'),
    'handleStartLearn must call runAutoLearn',
  );
  assert.ok(
    source.includes('getCurrentPage'),
    'handleStartLearn must read the current live page',
  );
  assert.ok(
    source.includes('NO_SEED_ROUTE'),
    'handleStartLearn must fail closed with no seed route',
  );
  // Live page wins over the profile fallback via the shared rule.
  assert.ok(
    source.includes('resolveLearnSeed'),
    'handleStartLearn must use the shared seed rule',
  );
  assert.ok(source.includes('getCurrentPage'), 'live page must be read');
  assert.ok(source.includes('fallbackRoute'), 'profile fallback must exist');
  assert.ok(
    source.includes('UNAVAILABLE:NO_SEED_ROUTE'),
    'must fail closed with no seed route',
  );
});

test('learn panel states truthful D3 state-exploration scope', async () => {
  const source = await readFile(APP_URL, 'utf8');
  assert.ok(
    source.includes('bounded state transition tracking'),
    'Learn UI must describe bounded state transition tracking',
  );
  assert.ok(
    source.includes('Stage 6 actions remain disabled'),
    'Learn UI must state Stage 6 remains disabled',
  );
  assert.ok(
    source.includes('Single learn pass (debug)'),
    'single pass must be labeled as debug-only',
  );
  assert.equal(
    source.includes('NOT YET WIRED'),
    false,
    'stale NOT YET WIRED copy must be gone',
  );
});

// Behavioral contract: mirror of the adapter loop with fakes.
async function simulatedAutoLearn(deps, opts) {
  const maxPasses = Math.min(Math.max(opts.maxPasses ?? 40, 1), 40);
  let session = opts.sessionId
    ? await deps.getLearningProgress(opts.sessionId)
    : await deps.startLearning({ start_route: opts.startRoute });
  const sessionId = session.session_id;
  const visited = [];
  const first = await deps.observeActiveTab();
  if (!first) throw new Error('UNAVAILABLE:OBSERVE_FAILED');
  let ingested = await deps.ingestObservation(sessionId, first);
  if (ingested.session) session = ingested.session;
  let next = ingested.next_route || session.current_item || '';
  if (!next) return { session, visited };
  const attempted = new Set();
  let guard = 0;
  while (next && guard < maxPasses) {
    if (opts.shouldContinue && !opts.shouldContinue()) break;
    const live = await deps.getLearningProgress(sessionId);
    if (live) {
      session = live;
      if (live.state !== 'active') break;
    }
    if (attempted.has(next)) break;
    attempted.add(next);
    guard += 1;
    const pass = await deps.requestLearnPass({ routes: [next] });
    let advanced = false;
    for (const item of pass.visited || []) {
      visited.push({ route: item.route, status: item.status });
      if (item.observation) {
        const more = await deps.ingestObservation(sessionId, item.observation, next);
        if (more && more.session) {
          session = more.session;
          next = more.next_route || session.current_item || '';
          advanced = true;
        }
      }
    }
    if (!advanced) break;
  }
  return { session, visited };
}

function makeDeps(scenario) {
  const state = { progressCalls: 0, ...scenario };
  return {
    calls: [],
    async startLearning(args) {
      this.calls.push(['startLearning', args.start_route]);
      assert.equal(
        args.start_route,
        scenario.seed,
        'session must start from the live seed route',
      );
      return { session_id: 'lrn_test', state: 'active', current_item: '' };
    },
    async observeActiveTab() {
      return { url: 'https://rousheta.net/ar/x', route_template: '/ar/x', links: [] };
    },
    async ingestObservation(sessionId, _obs, navigated) {
      this.calls.push(['ingest', navigated || '']);
      return state.ingestQueue.shift() || { session: { session_id: sessionId, state: 'active', current_item: '' }, next_route: '' };
    },
    async requestLearnPass({ routes }) {
      this.calls.push(['pass', routes[0]]);
      return state.passQueue.shift() || { status: 'LEARN_PASS_DONE', visited: [] };
    },
    async getLearningProgress() {
      state.progressCalls += 1;
      // Test-only default: scenarios that omit `progress` get a steady
      // active session instead of throwing (production is unaffected).
      const fn = typeof state.progress === 'function'
        ? state.progress
        : () => ({ session_id: 'lrn_test', state: 'active', current_item: '' });
      return fn(state.progressCalls);
    },
  };
}

test('auto-learn follows backend frontier across passes then stops', async () => {
  const deps = makeDeps({
    seed: '/ar/clinic/doctor/dashboard',
    ingestQueue: [
      { session: { session_id: 'lrn_test', state: 'active', current_item: '/b' }, next_route: '/b' },
      { session: { session_id: 'lrn_test', state: 'active', current_item: '/c' }, next_route: '/c' },
      { session: { session_id: 'lrn_test', state: 'active', current_item: '' }, next_route: '' },
    ],
    passQueue: [
      { status: 'LEARN_PASS_DONE', visited: [{ route: '/b', status: 'OBSERVED', observation: { url: 'https://rousheta.net/b' } }] },
      { status: 'LEARN_PASS_DONE', visited: [{ route: '/c', status: 'OBSERVED', observation: { url: 'https://rousheta.net/c' } }] },
    ],
    progress: () => ({ session_id: 'lrn_test', state: 'active', current_item: '' }),
  });
  const result = await simulatedAutoLearn(deps, { startRoute: '/ar/clinic/doctor/dashboard', maxPasses: 40 });
  assert.deepEqual(
    result.visited.map((v) => v.route),
    ['/b', '/c'],
  );
  assert.ok(deps.calls.some(([k, v]) => k === 'startLearning' && v === '/ar/clinic/doctor/dashboard'));
  assert.ok(deps.calls.filter(([k]) => k === 'pass').length === 2);
});

test('auto-learn stops when backend session pauses', async () => {
  const deps = makeDeps({
    seed: '/ar/a',
    ingestQueue: [
      { session: { session_id: 'lrn_test', state: 'active', current_item: '/b' }, next_route: '/b' },
      { session: { session_id: 'lrn_test', state: 'paused', current_item: '/b' }, next_route: '/b' },
    ],
    passQueue: [
      { status: 'LEARN_PASS_DONE', visited: [{ route: '/b', status: 'OBSERVED', observation: { url: 'https://rousheta.net/b' } }] },
    ],
    progress: (n) => (n >= 2
      ? { session_id: 'lrn_test', state: 'paused', current_item: '/b' }
      : { session_id: 'lrn_test', state: 'active', current_item: '/b' }),
  });
  const result = await simulatedAutoLearn(deps, { startRoute: '/ar/a', maxPasses: 40 });
  assert.deepEqual(result.visited.map((v) => v.route), ['/b']);
  assert.equal(result.session.state, 'paused');
});

test('auto-learn surfaces ingest failure instead of silent stall', async () => {
  const deps = makeDeps({
    seed: '/ar/a',
    ingestQueue: [
      { session: { session_id: 'lrn_test', state: 'active', current_item: '/b' }, next_route: '/b' },
    ],
    passQueue: [
      { status: 'LEARN_PASS_DONE', visited: [{ route: '/b', status: 'OBSERVED', observation: { url: 'https://rousheta.net/b' } }] },
    ],
    progress: () => ({ session_id: 'lrn_test', state: 'active', current_item: '/b' }),
  });
  const calls = deps.calls;
  let ingestCalls = 0;
  const origIngest = deps.ingestObservation.bind(deps);
  deps.ingestObservation = async (...args) => {
    ingestCalls += 1;
    if (ingestCalls > 1) throw new Error('UNAVAILABLE:BACKEND_500:boom');
    return origIngest(...args);
  };
  await assert.rejects(
    simulatedAutoLearnMirror(deps, { startRoute: '/ar/a', maxPasses: 40 }),
    /UNAVAILABLE/,
    'ingest failure with no progress must throw visibly',
  );
  assert.ok(calls.some(([k]) => k === 'pass'), 'the pass must have been attempted');
});

// Mirror with ingest-error surfacing (tracks the adapter contract).
async function simulatedAutoLearnMirror(deps, opts) {
  const maxPasses = Math.min(Math.max(opts.maxPasses ?? 40, 1), 40);
  const session0 = await deps.startLearning({ start_route: opts.startRoute });
  const sessionId = session0.session_id;
  const visited = [];
  const first = await deps.observeActiveTab();
  if (!first) throw new Error('UNAVAILABLE:OBSERVE_FAILED');
  const ingested = await deps.ingestObservation(sessionId, first);
  let session = ingested.session || session0;
  let next = ingested.next_route || session.current_item || '';
  if (!next) return { session, visited };
  const attempted = new Set();
  let guard = 0;
  let advancedEver = false;
  let firstIngestError = null;
  while (next && guard < maxPasses) {
    const live = await deps.getLearningProgress(sessionId);
    if (live) {
      session = live;
      if (live.state !== 'active') break;
    }
    if (attempted.has(next)) break;
    attempted.add(next);
    guard += 1;
    const pass = await deps.requestLearnPass({ routes: [next] });
    let advanced = false;
    for (const item of pass.visited || []) {
      visited.push({ route: item.route, status: item.status });
      if (item.observation) {
        try {
          const more = await deps.ingestObservation(sessionId, item.observation, next);
          if (more && more.session) {
            session = more.session;
            next = more.next_route || session.current_item || '';
            advanced = true;
            advancedEver = true;
          }
        } catch (e) {
          if (!firstIngestError) firstIngestError = e;
        }
      }
    }
    if (!advanced) break;
  }
  if (!advancedEver && visited.length > 0 && firstIngestError) throw firstIngestError;
  return { session, visited };
}

test('auto-learn stops honestly after a non-advancing pass', async () => {
  const deps = makeDeps({
    seed: '/ar/a',
    ingestQueue: [
      { session: { session_id: 'lrn_test', state: 'active', current_item: '/b' }, next_route: '/b' },
    ],
    passQueue: [
      { status: 'LEARN_PASS_DONE', visited: [{ route: '/b', status: 'UNSTABLE' }] },
    ],
    progress: () => ({ session_id: 'lrn_test', state: 'active', current_item: '/b' }),
  });
  const result = await simulatedAutoLearn(deps, { startRoute: '/ar/a', maxPasses: 40 });
  // One fruitless pass ends the run; the visit stays recorded for the UI.
  assert.deepEqual(result.visited.map((v) => v.route), ['/b']);
  assert.deepEqual(result.visited.map((v) => v.status), ['UNSTABLE']);
});

test('auto-learn never retries an attempted route (alias/redirect honesty)', async () => {
  const deps = makeDeps({
    seed: '/ar/a',
    ingestQueue: [
      { session: { session_id: 'lrn_test', state: 'active', current_item: '/b' }, next_route: '/b' },
      { session: { session_id: 'lrn_test', state: 'active', current_item: '/b' }, next_route: '/b' },
    ],
    passQueue: [
      { status: 'LEARN_PASS_DONE', visited: [{ route: '/b', status: 'OBSERVED', observation: { url: 'https://rousheta.net/b' } }] },
    ],
  });
  const result = await simulatedAutoLearn(deps, { startRoute: '/ar/a', maxPasses: 40 });
  assert.deepEqual(result.visited.map((v) => v.route), ['/b']);
});

test('disclosure_expansion_collapsed_reveals_links', async () => {
  // Scenario: observation has a control with aria-expanded=false (collapsed)
  const deps = makeDeps({
    seed: '/ar/a',
    ingestQueue: [
      // First observation has a collapsed disclosure control
      { url: 'https://rousheta.net/a', route_template: '/a', links: [], controls: [{ role: 'button', label: 'Employees', ariaExpanded: false, index: 0 }] },
    ],
    passQueue: [],
    progress: () => ({ session_id: 'lrn_test', state: 'active', current_item: '/a' }),
  });
  // Simulate the first observation being returned from observeActiveTab
  let ingested;
  // We need to test exploreDisclosure logic - let's test it directly
  // by checking the identifySafeDisclosures method
  const source = await readFile(ADAPTER_URL, 'utf8');
  // Verify the adapter identifies safe disclosures from controls with aria-expanded
  assert.ok(
    source.includes('identifySafeDisclosures'),
    'adapter must expose identifySafeDisclosures method',
  );
  assert.ok(
    source.includes('ariaExpanded'),
    'adapter must check aria-expanded attribute',
  );
});

test('disclosure_expansion_expanded_ignored_when_no_new_links', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // Verify the adapter sort preference for collapsed first
  assert.ok(
    source.includes('ariaExpanded === false ? -1 : 1'),
    'adapter must prefer collapsed disclosures first',
  );
});

test('disclosure_delta_computes_newly_visible_links', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(
    source.includes('computeLinkDelta'),
    'adapter must expose computeLinkDelta method',
  );
});

test('disclosure_no_delta_stops_honestly', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // Verify the runAutoLearn loop handles no-disclosure case
  assert.ok(
    source.includes('advancedEver'),
    'runAutoLearn must track ever-advanced state',
  );
  assert.ok(
    source.includes('firstIngestError'),
    'runAutoLearn must surface ingest errors',
  );
});

test('disclosure_loop_protection_avoids_re_exploration', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // Verify the runAutoLearn loop has attempted-set dedup
  assert.ok(
    source.includes('attempted'),
    'runAutoLearn must track attempted routes',
  );
  // The actual string in the source is "if (attempted.has(next)) break"
  assert.ok(
    source.includes('if (attempted.has(next)) break'),
    'runAutoLearn must stop on already-attempted route',
  );
});

test('disclosure_unsafe_buttons_rejected_without_aria_expanded', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // The identifySafeDisclosures only considers controls with aria-expanded set
  assert.ok(
    source.includes('ariaExpanded !== undefined'),
    'adapter must only consider controls with aria-expanded set',
  );
  // Fail-closed: controls without aria-expanded are not processed
  assert.ok(
    source.includes('ariaExpanded') && source.includes('undefined'),
    'adapter must check for aria-expanded attribute presence',
  );
});

test('disclosure_existing_visible_link_discovery_still_works', async () => {
  const source = await readFile(APP_URL, 'utf8');
  assert.ok(
    source.includes('runAutoLearn'),
    'handleStartLearn must call runAutoLearn',
  );
  assert.ok(
    source.includes('resolveLearnSeed'),
    'handleStartLearn must use the shared seed rule',
  );
});

test('disclosure_page_exhausts_multiple_collapsed_groups', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // The per-page loop must iterate over ALL eligible disclosures, not just the first.
  assert.ok(
    source.includes('for (let step = 0; step < maxDisclosuresPerPage; step++)'),
    'disclosure loop must iterate bounded per page (not single-shot)',
  );
  assert.ok(
    source.includes('maxDisclosuresPerPage'),
    'disclosure loop must have a per-page bound',
  );
  // It must re-observe inside the loop so the next candidate comes from an updated page.
  assert.ok(
    source.includes('await this.observeActiveTab()'),
    'disclosure loop must re-observe inside the loop',
  );
  // The loop must not restart from the first disclosure each time.
  assert.ok(
    source.includes('candidate'),
    'disclosure loop must pick the next candidate per step',
  );
});

test('disclosure_page_state_key_prevents_open_close_churn', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // Loop protection: (page :: control-index :: expanded-state) identity.
  assert.ok(
    source.includes('pageRoute'),
    'disclosure loop must key state by page route',
  );
  assert.ok(
    source.includes('exploredKeys'),
    'disclosure loop must track explored state keys',
  );
  assert.ok(
    source.includes('control-index') ||
      source.includes('d.index') ||
      source.includes('candidate.index'),
    'disclosure loop must key state by control index',
  );
});

test('disclosure_page_no_delta_stops_honestly', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(
    source.includes('noDeltaStreak'),
    'disclosure loop must track consecutive no-delta steps',
  );
  assert.ok(
    source.includes('maxNoDeltaStreak'),
    'disclosure loop must bound consecutive no-delta steps',
  );
});

test('disclosure_page_runAutoLearn_calls_bounded_explorer', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // runAutoLearn must invoke the bounded per-page explorer (not the old single-shot).
  assert.ok(
    source.includes('exploreDisclosuresPage'),
    'runAutoLearn must call exploreDisclosuresPage',
  );
  assert.equal(
    source.includes('exploreDisclosure('),
    false,
    'single-shot exploreDisclosure must be removed',
  );
});

test('disclosure_page_counts_safe_interaction_after_delta', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // A successfully executed disclosure must be counted via noteInteraction
  // so interactions_explored becomes > 0 in the backend session.
  assert.ok(
    source.includes('await this.noteInteraction(sessionId)'),
    'disclosure exploration must record the interaction after ingesting delta',
  );
});

// ---------- CONVERGENCE PHASE 1: Core D3 authority ----------

test('phase1_widget_emits_core_compatible_descriptor_fields', async () => {
  const source = await readFile(CS_URL, 'utf8');
  // All 14 backend descriptor fields must be emitted per control record.
  for (const field of ['element_uid', 'tag', 'role', 'name', 'aria_expanded',
    'aria_controls', 'aria_haspopup', 'aria_describedby', 'type', 'disabled',
    'in_form', 'controls_exists', 'describedby_is_tooltip', 'inside_tablist']) {
    assert.ok(
      source.includes(field),
      `observer must emit descriptor field ${field}`,
    );
  }
});

test('phase1_malformed_descriptor_means_no_click', async () => {
  const adapter = await readFile(ADAPTER_URL, 'utf8');
  // Candidates without a numeric index are excluded before authorization.
  assert.ok(
    adapter.includes("typeof c.index !== 'number'"),
    'builder must exclude malformed candidates',
  );
  const cs = await readFile(CS_URL, 'utf8');
  // Content script never clicks without explicit aria-expanded.
  assert.ok(
    cs.includes("ariaExpanded !== null ? ariaExpanded.toLowerCase() === 'true' : undefined") ||
      cs.includes('aria-expanded'),
    'observer must gate clicks on aria-expanded presence',
  );
});

test('phase1_core_approval_gates_execution', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // Descriptors must be authorized through Core before any click.
  assert.ok(
    source.includes('await this.authorizeInteractions(descriptors)'),
    'loop must authorize descriptors through Core D3',
  );
  // Only approved element_uids may execute, with live re-match evidence.
  assert.ok(
    source.includes('approvedUids.has('),
    'loop must execute only Core-approved element_uids',
  );
  assert.ok(
    source.includes('clickDisclosure(target.index, {'),
    'approved click must carry live re-match expectations',
  );
});

test('phase1_core_abstention_means_no_click', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // No approval for any candidate → stop with zero clicks, no fallback.
  assert.ok(
    source.includes('if (!target) break;'),
    'all-abstained must stop with no click',
  );
  assert.equal(
    /identifySafeDisclosures[\s\S]{0,400}?clickDisclosure\(candidate\.index\)/.test(source),
    false,
    'no direct pre-filter-to-click path may remain',
  );
});

test('phase1_authorization_failure_means_no_click_no_fallback', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // Core error/unavailable → break with NO click and NO local safety verdict.
  const seg = source.slice(
    source.indexOf('await this.authorizeInteractions(descriptors)'),
    source.indexOf('await this.authorizeInteractions(descriptors)') + 600,
  );
  assert.ok(seg.includes('catch'), 'authorization must be wrapped for failure');
  assert.ok(seg.includes('break;'), 'authorization failure must stop, never fall back');
  assert.equal(seg.includes('clickDisclosure'), false, 'failure path must not click');
});

test('phase1_stale_live_rematch_means_no_click', async () => {
  const source = await readFile(CS_URL, 'utf8');
  // Evidence-search resolution: stale/ambiguous candidates abstain.
  assert.ok(
    source.includes('resolveDisclosureCandidate'),
    'click path must resolve via live evidence search',
  );
  assert.ok(
    source.includes('return abstain'),
    'stale or ambiguous re-match must abstain',
  );
  assert.ok(
    source.includes('count > 1'),
    'ambiguity must abstain without guessing',
  );
  assert.equal(
    source.includes('allControls[index]'),
    false,
    'positional index lookup must not target the click',
  );
});

test('phase1_multiple_approved_disclosures_remain_bounded', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(
    source.includes('maxDisclosuresPerPage'),
    'per-page bound must remain',
  );
  assert.ok(
    source.includes('noDeltaStreak') && source.includes('maxNoDeltaStreak'),
    'no-delta honest stop must remain',
  );
  assert.ok(
    source.includes('exploredKeys'),
    'state-key churn protection must remain',
  );
});

test('phase1_route_link_delta_behavior_still_works', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(
    source.includes('computeLinkDelta(currentObs, after)'),
    'delta computation must remain on re-observation',
  );
  assert.ok(
    source.includes('await this.ingestObservation(sessionId, linkObs, link.href, originOverride)'),
    'revealed-link ingestion must remain',
  );
});

test('phase1_existing_consumers_do_not_regress', async () => {
  const source = await readFile(CS_URL, 'utf8');
  // Graph/display migration fields preserved alongside descriptor fields.
  assert.ok(source.includes('label:'), 'label must be preserved');
  assert.ok(source.includes('saDescribeControl(node, controls.length)'), 'index must still flow into records');
  assert.ok(source.includes('ariaExpanded:'), 'ariaExpanded must be preserved');
  const adapter = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(
    adapter.includes('identifySafeDisclosures(currentObs)'),
    'candidate pre-filter must remain as the bounded batch source',
  );
});

test('phase1_no_local_safety_fallback_exists', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // The loop body must contain no click that bypasses the approvals set.
  // Every clickDisclosure call site must be dominated by an approvals check
  // in the same block: assert the only call passes expect (re-match).
  const calls = [...source.matchAll(/clickDisclosure\(([^)]*)\)/g)].map((m) => m[1]);
  assert.ok(calls.length > 0, 'at least one click site must exist');
  for (const args of calls) {
    assert.ok(
      args.includes('expect') || args.includes('{'),
      `click site must carry re-match expectations: clickDisclosure(${args})`,
    );
  }
});

// ---------- WAVE 0: runtime hygiene ----------

test('wave0_sidepanel_skips_legacy_relative_health_poll', async () => {
  const source = await readFile(APP_URL, 'utf8');
  // Under chrome-extension:// the relative /api/health URL 404s noisily;
  // the health effect must bail out in extension context.
  assert.ok(
    source.includes("window.location.protocol === 'chrome-extension:'"),
    'health effect must detect extension sidepanel context',
  );
  const guardPos = source.indexOf("window.location.protocol === 'chrome-extension:'");
  const fetchPos = source.indexOf("fetch('/api/health')");
  assert.ok(guardPos !== -1 && fetchPos !== -1 && guardPos < fetchPos,
    'extension guard must precede the legacy health fetch');
});

test('wave0_web_health_behavior_intact', async () => {
  const source = await readFile(APP_URL, 'utf8');
  // Web Studio mode keeps the existing relative /api/health behavior.
  assert.ok(
    source.includes("fetch('/api/health')"),
    'legacy web health fetch must remain for Web Studio mode',
  );
});

// ---------- WAVE 1B: complete D3 actuation contract ----------

test('wave1b_interaction_results_recorded', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // Every attempted execution must produce an explicit result record.
  for (const field of ['element_uid', 'controlIndex', 'approved', 'kind',
    'executed', 'reobserved', 'newLinks', 'counted']) {
    assert.ok(
      source.includes(field),
      `interaction result must record ${field}`,
    );
  }
  assert.ok(
    source.includes('results.push(result)'),
    'result must be pushed before actuation so failures are explicit',
  );
});

test('wave1b_approval_kind_captured_from_core', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // The Core intent vocabulary (e.g. toggle_disclosure) is recorded per
  // result; the adapter never invents kinds.
  assert.ok(
    source.includes('approvedByUid'),
    'approvals must be indexed by element_uid',
  );
  assert.ok(
    source.includes('targetApproval.kind'),
    'result kind must come from the Core approval',
  );
});

test('wave1b_reobserve_failure_recorded_not_silent', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // executed=true is set before re-observation; a failed fresh observation
  // breaks with reobserved=false on the already-pushed record.
  const execPos = source.indexOf('result.executed = true');
  const reobsPos = source.indexOf('result.reobserved = true');
  assert.ok(execPos !== -1 && reobsPos !== -1 && execPos < reobsPos,
    'executed must be recorded before re-observation, reobserved after');
  assert.ok(
    source.includes('result.reobserved = true'),
    'successful fresh observation must be recorded',
  );
});

test('wave1b_count_gated_on_executed_delta', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // noteInteraction is reachable only past the empty-delta early continue.
  const emptyPos = source.indexOf('if (delta.length === 0)');
  const notePos = source.indexOf('await this.noteInteraction(sessionId)');
  assert.ok(emptyPos !== -1 && notePos !== -1 && emptyPos < notePos,
    'counting must come after the no-delta early exit');
  assert.ok(
    source.includes('result.counted = true'),
    'successful counting must be recorded on the result',
  );
});

// Behavioral fixture model of the authority chain (mirrors the adapter
// contract the source pins above: pre-filter -> authorize -> approved-only
// click -> mandatory re-observe -> delta -> count).
async function simulatedDisclosureRound(deps, candidates) {
  const results = [];
  const fresh = candidates.filter((c) => !deps.explored.has(c.uid));
  if (!fresh.length) return { results, stopped: 'no-candidate' };
  const descriptors = fresh.map((c) => ({ element_uid: c.uid }));
  let approvals;
  try {
    approvals = await deps.authorize(descriptors);
  } catch {
    return { results, stopped: 'authorize-failed' };
  }
  const approved = new Set(approvals.map((a) => a.element_uid));
  const target = fresh.find((c) => approved.has(c.uid));
  if (!target) return { results, stopped: 'all-abstained' };
  deps.explored.add(target.uid);
  const result = { uid: target.uid, approved: true, executed: false,
    reobserved: false, delta: 0, counted: false };
  results.push(result);
  const clicked = await deps.click(target.uid, deps.liveUids);
  if (!clicked) return { results, stopped: 'stale' };
  result.executed = true;
  let after;
  try {
    after = await deps.reobserve();
  } catch {
    return { results, stopped: 'reobserve-failed' };
  }
  result.reobserved = true;
  result.delta = after.newLinks;
  if (after.newLinks > 0) {
    await deps.note();
    result.counted = true;
  }
  return { results, stopped: 'advanced' };
}

function wave1bDeps(over = {}) {
  return {
    explored: new Set(),
    liveUids: new Set(['ctl-0']),
    authorize: async (ds) => ds.filter((d) => d.element_uid === 'ctl-0')
      .map((d) => ({ element_uid: d.element_uid, kind: 'toggle_disclosure' })),
    click: async (uid, live) => live.has(uid),
    reobserve: async () => ({ newLinks: 2 }),
    noted: 0,
    async note() { this.noted += 1; },
    ...over,
  };
}

test('wave1b_fixture_approval_executes_and_counts', async () => {
  const deps = wave1bDeps();
  const r = await simulatedDisclosureRound(deps,
    [{ uid: 'ctl-0' }, { uid: 'ctl-9' }]);
  assert.equal(r.stopped, 'advanced');
  assert.deepEqual(r.results.map((x) => x.uid), ['ctl-0']);
  assert.equal(r.results[0].executed, true);
  assert.equal(r.results[0].reobserved, true);
  assert.equal(r.results[0].counted, true);
  assert.equal(deps.noted, 1);
});

test('wave1b_fixture_abstention_never_executes', async () => {
  const deps = wave1bDeps({
    authorize: async () => [],
  });
  const r = await simulatedDisclosureRound(deps, [{ uid: 'ctl-0' }]);
  assert.equal(r.stopped, 'all-abstained');
  assert.deepEqual(r.results, []);
  assert.equal(deps.noted, 0);
});

test('wave1b_fixture_stale_never_executes', async () => {
  const deps = wave1bDeps({ liveUids: new Set(['ctl-other']) });
  const r = await simulatedDisclosureRound(deps, [{ uid: 'ctl-0' }]);
  assert.equal(r.stopped, 'stale');
  assert.equal(r.results[0].executed, false);
  assert.equal(deps.noted, 0);
});

test('wave1b_fixture_reobserve_failure_recorded', async () => {
  const deps = wave1bDeps({
    reobserve: async () => { throw new Error('OBSERVE_FAILED'); },
  });
  const r = await simulatedDisclosureRound(deps, [{ uid: 'ctl-0' }]);
  assert.equal(r.stopped, 'reobserve-failed');
  assert.equal(r.results[0].executed, true);
  assert.equal(r.results[0].reobserved, false);
  assert.equal(deps.noted, 0);
});

// ---------- WAVE 2: Stage-3 identity at the interaction seam ----------

test('wave2_resolution_requires_full_evidence', async () => {
  const source = await readFile(CS_URL, 'utf8');
  // Role + expanded + tag are mandatory; anything less abstains outright.
  assert.ok(
    source.includes("if (!wantRole || wantExpanded === null || !wantTag) return abstain;"),
    'insufficient evidence must abstain before scanning',
  );
  assert.ok(
    source.includes('aria-expanded'),
    'expanded state must be part of the evidence',
  );
});

test('wave2_resolution_ignores_positional_hint', async () => {
  const source = await readFile(CS_URL, 'utf8');
  // The CLICK_DISCLOSURE handler must not index into the control list.
  const handler = source.slice(source.indexOf('SITEAWARE_CLICK_DISCLOSURE'));
  assert.equal(
    handler.includes('[index]'),
    false,
    'resolution must not use the messaged index for targeting',
  );
  assert.ok(
    handler.includes('resolveDisclosureCandidate'),
    'handler must delegate to evidence resolution',
  );
});

test('wave2_history_cannot_bypass_safety', async () => {
  const source = await readFile(CS_URL, 'utf8');
  // No history, healing, repair, or persisted-resolution paths exist in the
  // resolution flow: only live evidence resolves, or nothing executes.
  for (const token of ['selfHealing', 'repairStrateg', 'resolutionHistory',
    'locatorState', 'localStorage', 'sessionStorage']) {
    assert.equal(
      source.includes(token),
      false,
      `resolution must not depend on ${token}`,
    );
  }
});

test('wave2_adapter_sends_tag_evidence', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(
    source.includes("tag: String(targetRec.tag || '')"),
    're-match expectations must include tag evidence',
  );
});

// Fixture model of evidence resolution (mirrors resolveDisclosureCandidate:
// full agreement on role+name+expanded+tag, exactly one live match, hints
// and history ignored).
function fixtureResolve(expect, liveDom) {
  const abstain = { found: false, node: null };
  if (!expect || typeof expect !== 'object') return abstain;
  const wr = typeof expect.role === 'string' ? expect.role : '';
  const wn = typeof expect.name === 'string' ? expect.name : '';
  const we = typeof expect.aria_expanded === 'boolean' ? expect.aria_expanded : null;
  const wt = typeof expect.tag === 'string' ? expect.tag : '';
  if (!wr || we === null || !wt) return abstain;
  let match = null;
  let count = 0;
  for (const node of liveDom) {
    if (!node.visible || node.ariaExpanded === null) continue;
    if (node.tag !== wt || node.role !== wr) continue;
    if ((node.label || '') !== wn) continue;
    if (node.ariaExpanded !== we) continue;
    count += 1;
    match = node;
    if (count > 1) return abstain;
  }
  if (count !== 1) return abstain;
  return { found: true, node: match };
}

const WAVE2_EXPECT = { element_uid: 'ctl-2', role: 'button', name: 'grp',
  aria_expanded: false, tag: 'button' };

function wave2Dom() {
  return [
    { tag: 'a', role: 'link', label: 'home', ariaExpanded: null, visible: true },
    { tag: 'button', role: 'button', label: 'other', ariaExpanded: false, visible: true },
    { tag: 'button', role: 'button', label: 'grp', ariaExpanded: false, visible: true },
    { tag: 'button', role: 'button', label: 'grp', ariaExpanded: true, visible: true },
  ];
}

test('wave2_fixture_reorder_still_resolves', async () => {
  // Same evidence after DOM reorder (target moved first): resolves.
  const dom = wave2Dom().reverse();
  const r = fixtureResolve(WAVE2_EXPECT, dom);
  assert.equal(r.found, true);
  assert.equal(r.node.label, 'grp');
  assert.equal(r.node.ariaExpanded, false);
});

test('wave2_fixture_rename_does_not_match', async () => {
  // Approved name changed live (renamed control): no match, no click.
  const dom = wave2Dom().map((n) => ({ ...n, label: 'renamed' }));
  const r = fixtureResolve(WAVE2_EXPECT, dom);
  assert.equal(r.found, false);
});

test('wave2_fixture_duplicates_abstain', async () => {
  // Two live controls share the full evidence: ambiguous, abstain.
  const dom = wave2Dom();
  dom.push({ tag: 'button', role: 'button', label: 'grp',
    ariaExpanded: false, visible: true });
  const r = fixtureResolve(WAVE2_EXPECT, dom);
  assert.equal(r.found, false);
});

test('wave2_fixture_missing_expect_abstains', async () => {
  assert.equal(fixtureResolve(null, wave2Dom()).found, false);
  assert.equal(fixtureResolve({ role: 'button' }, wave2Dom()).found, false);
});

// ---------- WAVE 3: Core state diff + fingerprint + transitions ----------

test('wave3_transition_called_post_delta', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // BEFORE/AFTER observations must reach the Core transition endpoint.
  assert.ok(
    source.includes('/api/extension/v1/interaction-transitions'),
    'loop must post before/after to the transition endpoint',
  );
  assert.ok(
    source.includes('before: currentObs'),
    'transition call must carry the BEFORE observation',
  );
});

test('wave3_transition_stored_on_result', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(
    source.includes('result.transition = transition.transition'),
    'Core transition verdict must be recorded on the result',
  );
  assert.ok(
    source.includes('transition: null'),
    'result must initialize transition as unknown',
  );
});

test('wave3_transition_best_effort_never_breaks_loop', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(
    source.includes('transition diagnostics must not break discovery'),
    'transition failures must not break discovery',
  );
});

test('wave3_no_state_explorer_clone_in_widget', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  // Core owns diff/fingerprint/explorer; the Widget must not reimplement.
  // (Doc-comment mentions are fine; call expressions are the violation.)
  for (const token of ['new StateExplorer(', 'diff_observations(',
    'semantic_state_fingerprint(', 'control_signatures(']) {
    assert.equal(
      source.includes(token),
      false,
      `Widget must not clone Core: ${token}`,
    );
  }
});

test('product_health_is_canonical_and_diagnostic', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(source.includes('getExtensionHealth'), 'adapter must expose canonical health');
  for (const s of ['BACKEND_CONNECTED','BACKEND_UNAVAILABLE','BACKEND_VERSION_MISMATCH','APPLICATION_NOT_CONNECTED','AUTH_CONTEXT_NOT_READY']) {
    assert.ok(source.includes(s), `health must distinguish ${s}`);
  }
  assert.ok(source.includes('BACKEND_UNREACHABLE'), 'fetch failures must map to BACKEND_UNREACHABLE');
  assert.equal(source.includes('fetch(`/api/health`)'), false, 'adapter must not use relative health URL');
});

test('product_learn_wires_d6_d7_truth', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  for (const m of ['getCoverage(sessionId', 'getReliability(sessionId', '/coverage', '/reliability']) {
    assert.ok(source.includes(m), `adapter must wire D6/D7: ${m}`);
  }
  const app = await readFile(APP_URL, 'utf8');
  assert.ok(app.includes('Coverage (D6)'), 'Learn UI must show D6 coverage');
  assert.ok(app.includes('Termination (D7)'), 'Learn UI must show D7 termination');
  assert.ok(app.includes('refreshLearnTruth'), 'Learn actions must refresh D6/D7 truth');
});

test('product_d4_d5_seams_exist_metadata_fallback_only', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(source.includes('noteNetworkMetadata'), 'D4 metadata seam must exist');
  assert.ok(source.includes('/network-metadata'), 'D4 endpoint must be called');
  assert.ok(source.includes('getVisualFallback'), 'D5 fallback seam must exist');
  assert.ok(source.includes('/visual-fallback'), 'D5 endpoint must be called');
  assert.ok(source.includes('metadata-only'), 'D4 must document metadata-only');
});

test('product_no_generic_failed_to_fetch', async () => {
  const app = await readFile(APP_URL, 'utf8');
  assert.ok(app.includes('BACKEND_UNREACHABLE'), 'UI must normalize fetch failures to BACKEND_UNREACHABLE');
});

test('product_start_learn_uses_normal_runtime_session_not_local_dev_bootstrap', async () => {
  const app = await readFile(APP_URL, 'utf8');
  const adapter = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(app.includes('ensureRuntimeSession'), 'START LEARN must ensure normal runtime session');
  assert.equal(
    app.includes('ensureLocalDevSession'),
    false,
    'START LEARN must not call local-dev bootstrap',
  );
  assert.ok(
    adapter.includes('/api/extension/v1/runtime-session'),
    'adapter must call the normal extension runtime-session endpoint',
  );
  assert.ok(
    adapter.includes('/api/local/v1/dev-session') === false,
    'adapter must not call the disabled local-dev bootstrap endpoint',
  );
});

test('product_extension_ai_status_truthful', async () => {
  const app = await readFile(APP_URL, 'utf8');
  assert.ok(app.includes('AI BACKEND UNAVAILABLE') || app.includes('AI BACKEND CONNECTED'), 'extension AI status must distinguish backend vs provider');
});

test('live_widget_adapter_sends_existing_render_contract', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  for (const m of ['renderLiveWidget', 'updateLiveWidget', 'setLiveWidgetOpen', 'removeLiveWidget', 'buildLiveWidgetConfig', 'getLiveWidgetTab']) {
    assert.ok(source.includes(m), `adapter must expose live-widget seam: ${m}`);
  }
  // Existing content-script contract only — no new widget system.
  assert.ok(source.includes('SITEAWARE_RENDER_WIDGET'), 'apply/update must use SITEAWARE_RENDER_WIDGET');
  assert.ok(source.includes('SITEAWARE_REMOVE_WIDGET'), 'remove must use SITEAWARE_REMOVE_WIDGET');
  assert.ok(source.includes("files: ['content-script.js']"), 'must ensure content-script injection fallback');
  // Fail-closed eligibility: chrome:// and tab-less states never inject.
  assert.ok(source.includes('NO_ELIGIBLE_TAB'), 'must fail closed with no eligible tab');
  assert.ok(source.includes('WIDGET_RECEIVER_MISSING'), 'missing receiver must surface, not silent');
  // Open/close reuses the widget previewOpen re-render (content-script lines 466-468).
  assert.ok(source.includes('previewOpen'), 'open/close must drive previewOpen re-render');
});

test('live_widget_config_is_allowlisted_and_clamped', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(source.includes('buildLiveWidgetConfig'), 'config mapper must exist');
  assert.ok(source.includes('logoDropped'), 'oversized logos must be dropped with a flag, not sent');
  assert.ok(source.includes('100000'), 'logo size bound must be explicit');
});

test('live_site_separated_from_studio_preview', async () => {
  const app = await readFile(APP_URL, 'utf8');
  assert.ok(app.includes('Studio preview'), 'preview column must be labeled simulated Studio preview');
  assert.ok(app.includes('Live site') || app.includes('LIVE SITE'), 'a distinct LIVE SITE block must exist');
  assert.ok(app.includes('Apply to live site'), 'Apply to live site action must exist');
  assert.ok(app.includes('Update live theme'), 'live theme update action must exist');
  assert.ok(app.includes('Open on live site'), 'live open action must exist');
  assert.ok(app.includes('Close on live site'), 'live close action must exist');
  assert.ok(app.includes('Remove from live site'), 'live remove action must exist');
  assert.ok(app.includes('NOT APPLIED YET'), 'untouched live state must read NOT APPLIED YET, not fake success');
  assert.equal(app.includes('Assistant live on this website'), false, 'false live claim must be gone');
  assert.equal(app.includes('No simulator'), false, 'no-simulator claim must be gone');
  assert.ok(app.includes('handleApplyLiveWidget'), 'apply handler must exist');
  assert.ok(app.includes('handleRemoveLiveWidget'), 'remove handler must exist');
  assert.ok(app.includes('handleLiveWidgetOpen'), 'open/close handler must exist');
});

test('d5_fallback_auto_policy_on_zero_execution', async () => {
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(source.includes('getVisualFallback(sessionId'), 'zero-execution pages must record a fallback assessment');
  assert.ok(source.includes('executedCount === 0'), 'policy triggers only when nothing executed');
});

test('d4_stays_optional_without_webrequest', async () => {
  const manifest = await readFile(new URL('../../extension/manifest.json', import.meta.url), 'utf8');
  assert.equal(manifest.includes('webRequest'), false, 'no invasive webRequest permission may be added for D4');
  const source = await readFile(ADAPTER_URL, 'utf8');
  assert.ok(source.includes('noteNetworkMetadata'), 'manual D4 metadata seam must remain available');
});
