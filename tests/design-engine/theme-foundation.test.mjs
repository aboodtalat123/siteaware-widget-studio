import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { transform } from 'esbuild';

async function loadThemeFoundation() {
  const sourceUrl = new URL('../../src/studio/design-engine/themeFoundation.ts', import.meta.url);
  const source = await readFile(sourceUrl, 'utf8');
  const transformed = await transform(source, {
    loader: 'ts',
    format: 'esm',
    target: 'es2022',
    sourcemap: 'inline',
    sourcefile: pathToFileURL(sourceUrl.pathname).href,
  });
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(transformed.code)}`);
}

const engine = await loadThemeFoundation();

test('valid theme patch is accepted', () => {
  const result = engine.validateThemePatch({
    launcher: { backgroundColor: '#123abc', borderRadius: 24, size: 64 },
    panel: { surfaceColor: 'rgb(255, 255, 255)', shadow: 'soft' },
    guide: { overlayOpacity: 0.45 },
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.launcher.backgroundColor, '#123abc');
});

test('invalid color is rejected', () => {
  const result = engine.validateThemePatch({
    launcher: { backgroundColor: 'not-a-color' },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /safe color/);
});

test('unknown key is rejected', () => {
  const result = engine.validateThemePatch({
    launcher: { backgroundColor: '#123456', randomCss: '#fff' },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /Unknown patch field/);
});

test('raw CSS is rejected', () => {
  const result = engine.validateThemePatch({
    panel: { backgroundColor: 'url(https://example.invalid/a.png)' },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /safe color/);
});

test('JavaScript-like content is rejected', () => {
  const result = engine.validateThemePatch({
    typography: { fontFamily: 'Inter; background: javascript:alert(1)' },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /safe font/);
});

test('prototype pollution keys are rejected', () => {
  const result = engine.validateThemePatch(JSON.parse('{"launcher":{"__proto__":{"polluted":true},"backgroundColor":"#123456"}}'));

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /__proto__/);
  assert.equal({}.polluted, undefined);
});

test('extreme numeric values are rejected', () => {
  const result = engine.validateThemePatch({
    launcher: { borderRadius: 9999, size: 12 },
    guide: { overlayOpacity: 1.4, targetPadding: 200 },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /0 to 40/);
  assert.match(result.errors.join(' '), /40 to 88/);
  assert.match(result.errors.join(' '), /0 to 0.85/);
});

test('applyThemePatch is immutable', () => {
  const current = engine.getDefaultWidgetTheme();
  const snapshot = structuredClone(current);
  const next = engine.applyThemePatch(current, {
    panel: { surfaceColor: '#eeeeee' },
    direction: 'rtl',
  });

  assert.deepEqual(current, snapshot);
  assert.notEqual(next, current);
  assert.equal(next.panel.surfaceColor, '#eeeeee');
  assert.equal(next.direction, 'rtl');
});

test('DesignProfile mapping is deterministic', () => {
  const profile = {
    colors: {
      primary: '#1266cc',
      surface: '#ffffff',
      textPrimary: '#101828',
      border: 'rgba(16, 24, 40, 0.12)',
    },
    shape: { borderRadiusMedium: 14, borderRadiusLarge: 24 },
    typography: { fontFamily: 'Inter', headingFamily: 'Inter', fontScale: 'md', fontWeights: [500] },
  };

  assert.deepEqual(
    engine.suggestThemeFromDesignProfile(profile),
    engine.suggestThemeFromDesignProfile(profile),
  );
});

test('RTL maps to widget direction', () => {
  const theme = engine.suggestThemeFromDesignProfile({
    identity: { direction: 'rtl' },
  });

  assert.equal(theme.direction, 'rtl');
});

test('missing DesignProfile fields use safe defaults', () => {
  const theme = engine.suggestThemeFromDesignProfile({});
  const defaults = engine.getDefaultWidgetTheme();

  assert.deepEqual(theme, defaults);
});

test('provider output cannot bypass validator', async () => {
  const provider = {
    id: 'unsafe-provider',
    label: 'Unsafe Provider',
    async suggestThemePatch() {
      return {
        panel: { surfaceColor: '#ffffff' },
        rawCss: '.widget { display: none }',
      };
    },
  };

  const result = await engine.validateProviderThemePatch(provider, {
    prompt: 'Make it unsafe',
    designProfile: {},
    currentTheme: engine.getDefaultWidgetTheme(),
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /Unknown patch section/);
});
