import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { catalog, configFromDesignProfile, sanitizeWidgetConfig } from '../../extension/shared/widget-catalog.js';

test('widget config rejects unknown component ids from AI or storage', () => {
  const config = sanitizeWidgetConfig({
    assistantIcon: 'unknown-icon',
    launcher: 'evil-launcher',
    chatShell: 'invented-shell',
    inputBar: '<script>',
    sendButton: 'not-real',
    appearance: {
      primaryColor: 'javascript:alert(1)',
      widgetWidth: 9999,
      widgetHeight: 1,
    },
  });

  assert.equal(config.assistantIcon, 'siteaware-official');
  assert.equal(config.launcher, 'minimal-floating');
  assert.equal(config.chatShell, 'minimal-saas');
  assert.equal(config.inputBar, 'pill');
  assert.equal(config.sendButton, 'circle');
  assert.equal(config.appearance.primaryColor, '#2563eb');
  assert.equal(config.appearance.widgetWidth, 520);
  assert.equal(config.appearance.widgetHeight, 440);
});

test('site profile converts to valid catalog-backed config', () => {
  const config = configFromDesignProfile({
    mode: 'dark',
    direction: 'rtl',
    palette: {
      primary: { value: 'rgb(126, 87, 194)', confidence: 0.89, evidenceCount: 9 },
      background: { value: 'rgb(14, 18, 28)', confidence: 0.9, evidenceCount: 6 },
      surface: { value: 'rgb(25, 31, 45)', confidence: 0.8, evidenceCount: 7 },
      foreground: { value: 'rgb(248, 250, 252)', confidence: 0.8, evidenceCount: 12 },
      muted: { value: 'rgb(172, 181, 194)', confidence: 0.7, evidenceCount: 5 },
      border: { value: 'rgb(49, 59, 76)', confidence: 0.73, evidenceCount: 8 },
    },
    shape: { radius: 18 },
  });

  assert.equal(config.direction, 'rtl');
  assert.ok(catalog.icons.some((item) => item.id === config.assistantIcon));
  assert.ok(catalog.launchers.some((item) => item.id === config.launcher));
  assert.ok(catalog.chatShells.some((item) => item.id === config.chatShell));
  assert.equal(config.appearance.primaryColor, 'rgb(126, 87, 194)');
});

test('design analyzer source avoids private page content APIs', async () => {
  const source = await readFile(new URL('../../extension/shared/site-design-analyzer.js', import.meta.url), 'utf8');
  const forbidden = [
    /\binnerText\b/,
    /\btextContent\b/,
    /\bHTMLInputElement\b/,
    /\binput\.value\b/,
    /\btextarea\.value\b/,
    /document\.cookie/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bouterHTML\b/,
    /\binnerHTML\b/,
  ];

  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `Analyzer should not use ${pattern}`);
  }
});

test('extension bundle does not contain obvious secret markers', async () => {
  const files = [
    '../../extension/manifest.json',
    '../../extension/service-worker.js',
    '../../extension/content-script.js',
    '../../extension/sidepanel.js',
    '../../extension/shared/widget-catalog.js',
    '../../extension/shared/site-design-analyzer.js',
  ];
  const secretPattern = /GEMINI_API_KEY|AIza[0-9A-Za-z_-]{20,}|Bearer\s+[0-9A-Za-z._-]+|sk-[0-9A-Za-z]/;

  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.equal(secretPattern.test(source), false, `${file} contains a secret-like marker`);
  }
});
