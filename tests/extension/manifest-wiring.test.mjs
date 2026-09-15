import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const SRC_MANIFEST = new URL('../../extension/manifest.json', import.meta.url);
const DIST_MANIFEST = new URL('../../dist/extension/manifest.json', import.meta.url);
const SRC_WORKER = new URL('../../extension/service-worker.js', import.meta.url);
const DIST_WORKER = new URL('../../dist/extension/service-worker.js', import.meta.url);
const SRC_CS = new URL('../../extension/content-script.js', import.meta.url);
const DIST_CS = new URL('../../dist/extension/content-script.js', import.meta.url);
const DIST_HTML = new URL('../../dist/extension/sidepanel.html', import.meta.url);

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

test('manifest auto-injects the observer on the approved pilot origin', async () => {
  const manifest = JSON.parse(await readFile(SRC_MANIFEST, 'utf8'));
  const scripts = manifest.content_scripts || [];
  const rousheta = scripts.filter((entry) => (
    Array.isArray(entry.matches) &&
    entry.matches.includes('https://rousheta.net/*') &&
    Array.isArray(entry.js) &&
    entry.js.includes('content-script.js')
  ));
  assert.equal(rousheta.length, 1, 'exactly one rousheta content-script entry');
  assert.equal(rousheta[0].run_at, 'document_idle');
  const hosts = manifest.host_permissions || [];
  assert.ok(hosts.includes('https://rousheta.net/*'), 'rousheta host permission');
  assert.ok(hosts.includes('http://127.0.0.1/*'), 'loopback host permission');
  assert.ok(!hosts.includes('<all_urls>'), 'no all-urls permission');
});

test('dist manifest/worker/observer match their canonical sources', async () => {
  const [srcManifest, distManifest] = await Promise.all([
    readFile(SRC_MANIFEST, 'utf8'),
    readFile(DIST_MANIFEST, 'utf8'),
  ]);
  assert.deepEqual(JSON.parse(distManifest), JSON.parse(srcManifest));

  const [srcWorker, distWorker] = await Promise.all([
    readFile(SRC_WORKER, 'utf8'),
    readFile(DIST_WORKER, 'utf8'),
  ]);
  assert.equal(sha256(distWorker), sha256(srcWorker), 'worker must not be stale');

  const [srcCs, distCs] = await Promise.all([
    readFile(SRC_CS, 'utf8'),
    readFile(DIST_CS, 'utf8'),
  ]);
  assert.equal(sha256(distCs), sha256(srcCs), 'observer must not be stale');
});

test('observer answers the exact contract the adapter expects', async () => {
  const source = await readFile(SRC_CS, 'utf8');
  assert.ok(source.includes("message?.type === 'SITEAWARE_OBSERVE'"));
  assert.ok(source.includes("status: 'OBSERVED'"));
  assert.ok(source.includes('collectSafeObservation()'));
});

test('observer emits the backend-required canonical_path', async () => {
  // Live regression: seed ingests failed with observation_bad_canonical_path
  // because collectSafeObservation sent route_template but no canonical_path.
  const source = await readFile(SRC_CS, 'utf8');
  const start = source.indexOf('function collectSafeObservation()');
  assert.ok(start !== -1, 'collectSafeObservation must exist');
  const body = source.slice(start, start + 3000);
  assert.ok(
    body.includes('canonical_path'),
    'observation must include canonical_path for bridge validation',
  );
});

test('learn-pass stability budget covers throttled background tabs', async () => {
  const source = await readFile(SRC_WORKER, 'utf8');
  const m = /waitForStability\(tabId,\s*timeoutMs\s*=\s*(\d+)\)/.exec(source);
  assert.ok(m, 'stability timeout must be declared');
  assert.ok(Number(m[1]) >= 30000, 'budget must cover background throttling');
});

test('dist ships one canonical extension (no legacy wiring)', async () => {
  const html = await readFile(DIST_HTML, 'utf8');
  assert.ok(html.includes('<div id="root"></div>'));
  assert.ok(html.includes('sidepanel-bundle.js'));
  assert.ok(!html.includes('sidepanel.js'), 'html must not load legacy sidepanel.js');

  const entries = await readdir(new URL('../../dist/extension/', import.meta.url));
  assert.ok(!entries.includes('sidepanel.js'), 'dist must not ship legacy sidepanel.js');
  assert.ok(!entries.some((e) => e.includes('legacy-backup')), 'no legacy backups in dist');
  assert.ok(!entries.some((e) => e.endsWith('.bak') || e.endsWith('.backup')), 'no backup files in dist');
  for (const required of ['manifest.json', 'service-worker.js', 'content-script.js',
    'sidepanel.html', 'sidepanel-bundle.js', 'siteaware-widget-studio.css']) {
    assert.ok(entries.includes(required), `dist must contain ${required}`);
  }
});
