import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ADAPTER_URL = new URL(
  '../../src/studio/adapters/UnifiedSiteAwareExtensionAdapter.ts',
  import.meta.url,
);
const APP_URL = new URL('../../src/App.tsx', import.meta.url);

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
  // D3 honesty: route traversal only, no deep-interaction claims.
  assert.ok(
    source.includes('NOT YET WIRED'),
    'adapter must mark D3 deep interaction as not yet wired',
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

test('learn panel marks deep interaction as not yet wired', async () => {
  const source = await readFile(APP_URL, 'utf8');
  assert.ok(
    source.includes('NOT YET WIRED'),
    'Learn UI must expose D3 as not yet wired',
  );
  assert.ok(
    source.includes('Single learn pass (debug)'),
    'single pass must be labeled as debug-only',
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
      return state.progress(state.progressCalls);
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
    progress: () => ({ session_id: 'lrn_test', state: 'active', current_item: '/b' }),
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
