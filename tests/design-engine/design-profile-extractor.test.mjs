import assert from 'node:assert/strict';
import { build } from 'esbuild';
import test from 'node:test';
import path from 'node:path';
import { pharmacyEvidence, saasEvidence, universityEvidence } from './fixtures/design-profile-evidence.mjs';

async function loadModule(entryPoint) {
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

const root = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const extractor = await loadModule(path.join(root, 'src/studio/design-engine/designProfileExtractor.ts'));
const foundation = await loadModule(path.join(root, 'src/studio/design-engine/themeFoundation.ts'));

test('extracts primary accent and resolves conflicts deterministically', () => {
  const profile = extractor.extractDesignProfile(saasEvidence);
  assert.equal(profile.colors.primary, '#7c8cff');
  assert.equal(profile.colors.accent, '#7c8cff');
  assert.deepEqual(profile, extractor.extractDesignProfile(saasEvidence));
});

test('extracts surface, background, text, and border colors', () => {
  const profile = extractor.extractDesignProfile(pharmacyEvidence);
  assert.equal(profile.colors.background, '#f7fbfb');
  assert.equal(profile.colors.surface, '#ffffff');
  assert.equal(profile.colors.textPrimary, '#102a2f');
  assert.equal(profile.colors.border, 'rgba(16, 42, 47, 0.14)');
});

test('extracts typography, radius, and spacing', () => {
  const profile = extractor.extractDesignProfile(universityEvidence);
  assert.equal(profile.typography.fontFamily, 'Inter, system-ui, sans-serif');
  assert.equal(profile.typography.headingFamily, 'Inter, system-ui, sans-serif');
  assert.deepEqual(profile.typography.fontWeights, [600]);
  assert.equal(profile.shape.borderRadiusMedium, 14);
  assert.equal(profile.spacing.density, 'comfortable');
  assert.equal(profile.spacing.scale, 0.88);
});

test('extracts RTL/LTR and dark/light evidence', () => {
  assert.equal(extractor.extractDesignProfile(pharmacyEvidence).identity.direction, 'rtl');
  assert.equal(extractor.extractDesignProfile(pharmacyEvidence).identity.modePreference, 'light');
  assert.equal(extractor.extractDesignProfile(saasEvidence).identity.direction, 'ltr');
  assert.equal(extractor.extractDesignProfile(saasEvidence).identity.modePreference, 'dark');
});

test('missing evidence does not invent values', () => {
  assert.deepEqual(extractor.extractDesignProfile({}), {});
  assert.deepEqual(extractor.extractDesignProfile({ colors: { accent: [{ value: 'not-a-color', count: 99 }] } }), {});
});

test('sensitive and unknown data is not part of the contract output', () => {
  const profile = extractor.extractDesignProfile({
    colors: {
      accent: [{ value: 'javascript:alert(1)', count: 10 }],
      foreground: [{ value: '<script>secret</script>', count: 10 }],
    },
    typography: {
      fontFamilies: [{ value: 'Inter; url(https://secret.example)', count: 9 }],
    },
    unknown: {
      innerText: 'patient data',
      cookie: 'token',
      url: 'https://example.test/?session=secret',
    },
  });

  assert.deepEqual(profile, {});
  assert.equal(JSON.stringify(profile).includes('patient'), false);
  assert.equal(JSON.stringify(profile).includes('secret'), false);
});

test('output is compatible with suggestThemeFromDesignProfile', () => {
  const profile = extractor.extractDesignProfile(pharmacyEvidence);
  const theme = foundation.suggestThemeFromDesignProfile(profile);
  assert.equal(theme.launcher.backgroundColor, '#0f9f8f');
  assert.equal(theme.panel.surfaceColor, '#ffffff');
  assert.equal(theme.direction, 'rtl');
});
