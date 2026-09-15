import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import {
  readProviderRouterConfig,
  redactProviderConfig,
  routeStudioAIRequest,
} from '../../server/studio-ai/providerRouter.mjs';

async function loadBundledModule(entryPoint) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
  });
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(result.outputFiles[0].text)}`);
}

const projectRoot = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const registry = await loadBundledModule(path.join(projectRoot, 'src/studio/v2/commands/commandRegistry.ts'));
const icons = await loadBundledModule(path.join(projectRoot, 'src/studio/v2/design/iconCatalog.ts'));
const mock = await loadBundledModule(path.join(projectRoot, 'src/studio/v2/ai/mockProvider.ts'));
const state = await loadBundledModule(path.join(projectRoot, 'src/studio/v2/state/studioState.ts'));
const theme = await loadBundledModule(path.join(projectRoot, 'src/studio/design-engine/themeFoundation.ts'));

test('ThemePatch remains validated through Studio V2 command registry', () => {
  const currentTheme = theme.getDefaultWidgetTheme();
  const result = registry.executeDesignCommand(
    { type: 'PREVIEW_THEME_PATCH', patch: { panel: { surfaceColor: '#ffffff', borderRadius: 22 } } },
    { currentTheme, appearanceMode: 'light' },
  );

  assert.equal(result.ok, true);
  assert.equal(result.theme, currentTheme);
  assert.equal(result.proposed.panel.borderRadius, 22);
});

test('unknown design command is rejected', () => {
  const result = registry.executeDesignCommand(
    { type: 'CLICK_HOST_SITE', selector: '#submit' },
    { currentTheme: theme.getDefaultWidgetTheme(), appearanceMode: 'light' },
  );

  assert.equal(result.ok, false);
  assert.match(result.error, /Unknown design command/);
});

test('raw CSS and raw SVG/HTML are rejected by ThemePatch validator', () => {
  assert.equal(theme.validateThemePatch({ panel: { backgroundColor: 'url(https://x.test/a.png)' } }).ok, false);
  assert.equal(theme.validateThemePatch({ typography: { fontFamily: '<svg onload=alert(1)>' } }).ok, false);
});

test('invalid icon intent is rejected and approved icon intent maps locally', () => {
  const invalid = icons.validateIconIntent({ kind: 'icon', intent: 'evil-svg', style: 'raw' });
  assert.equal(invalid.ok, false);

  const valid = icons.validateIconIntent({ kind: 'icon', intent: 'pharmacy', style: 'rounded-outline' });
  assert.equal(valid.ok, true);
  assert.equal(icons.resolveSafeIcon(valid.value).id, 'sa-pharmacy-outline');
});

test('mock provider works and output cannot bypass validator', async () => {
  const provider = mock.createMockStudioAIProvider();
  const currentTheme = theme.getDefaultWidgetTheme();
  const output = await provider.design({
    category: 'DESIGN_PATCH',
    prompt: 'Make it suitable for a pharmacy and softer',
    locale: 'en',
    designProfile: {},
    currentTheme,
  });

  const validation = theme.validateThemePatch(output);
  assert.equal(validation.ok, true);
  assert.equal(validation.value.launcher.backgroundColor, '#0f9f8f');

  const unsafe = await theme.validateProviderThemePatch(
    {
      id: 'unsafe',
      label: 'Unsafe',
      async suggestThemePatch() {
        return { rawCss: '.x{display:none}', panel: { backgroundColor: '#fff' } };
      },
    },
    { prompt: 'unsafe', designProfile: {}, currentTheme },
  );
  assert.equal(unsafe.ok, false);
});

test('provider failure fails safely and redacts secrets', async () => {
  const config = readProviderRouterConfig({
    SITEAWARE_AI_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'secret-value',
    GEMINI_MODEL: 'gemini-safe',
    SITEAWARE_AI_FALLBACK_PROVIDER: 'openai_compatible',
    AI_API_KEY: 'another-secret',
    AI_BASE_URL: 'https://provider.example/v1',
    AI_MODEL: 'compatible-model',
  });

  assert.deepEqual(redactProviderConfig(config), {
    primary: 'gemini',
    fallback: 'openai_compatible',
    gemini: { model: 'gemini-safe', hasKey: true },
    openaiCompatible: { baseUrlConfigured: true, model: 'compatible-model', hasKey: true },
  });

  const result = await routeStudioAIRequest(
    { category: 'CHAT', prompt: 'hello' },
    { gemini: async () => ({ ok: false, status: 503, message: 'down' }) },
    config,
  );
  assert.equal(result.ok, false);
  assert.equal(result.provider, 'openai_compatible');
});

test('RTL shell state, mode switching, proposal/apply/undo/reset work', () => {
  const initial = state.createInitialStudioV2State('ar');
  assert.equal(initial.dir, 'rtl');

  const assist = state.studioV2Reducer(initial, { type: 'SET_MODE', mode: 'assist' });
  assert.equal(assist.mode, 'assist');

  const proposed = state.studioV2Reducer(assist, {
    type: 'PROPOSE_PATCH',
    prompt: 'rounder',
    patch: { launcher: { size: 64 } },
    summary: 'Rounder launcher',
  });
  assert.equal(proposed.proposed.proposedTheme.launcher.size, 64);
  assert.equal(proposed.currentTheme.launcher.size, assist.currentTheme.launcher.size);

  const applied = state.studioV2Reducer(proposed, { type: 'APPLY_PROPOSAL' });
  assert.equal(applied.currentTheme.launcher.size, 64);

  const undone = state.studioV2Reducer(applied, { type: 'UNDO' });
  assert.equal(undone.currentTheme.launcher.size, assist.currentTheme.launcher.size);

  const reset = state.studioV2Reducer(applied, { type: 'RESET' });
  assert.deepEqual(reset.currentTheme, theme.getDefaultWidgetTheme());
});

test('client Studio V2 source does not reference provider secret env keys', async () => {
  const clientRoot = path.join(projectRoot, 'src/studio/v2');
  const files = await collectFiles(clientRoot);
  const forbidden = /GEMINI_API_KEY|AI_API_KEY|AI_BASE_URL|SITEAWARE_AI_PROVIDER|process\.env|import\.meta\.env/;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.equal(forbidden.test(source), false, `${file} exposes provider configuration`);
  }
});

test('dark/light tokens and reduced motion rules exist in preview CSS', async () => {
  const css = await readFile(path.join(projectRoot, 'src/studio/v2/styles/studioV2.css'), 'utf8');
  assert.match(css, /\[data-theme="dark"\]/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(full));
    if (entry.isFile() && /\.(ts|tsx|css|html)$/.test(entry.name)) files.push(full);
  }
  return files;
}
