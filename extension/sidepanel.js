import {
  aiCatalogSummary,
  applyDesignPatch,
  catalog,
  configFromDesignProfile,
  defaultWidgetConfig,
  presetConfig,
  presets,
  sanitizeWidgetConfig,
  themeAppearance,
} from './shared/widget-catalog.js';

const BACKEND_URL = 'https://siteaware-widget-studio.onrender.com';

const state = {
  tabId: null,
  tabUrl: '',
  tabTitle: '',
  originKey: 'global',
  config: sanitizeWidgetConfig(defaultWidgetConfig),
  profile: null,
  injected: false,
  backendReady: false,
};

const $ = (id) => document.getElementById(id);

function t(ar, en) {
  return state.config.locale === 'ar' ? ar : en;
}

function hostnameFromUrl(url) {
  try {
    return url ? new URL(url).hostname : '';
  } catch {
    return '';
  }
}

function originFromUrl(url) {
  try {
    const parsed = new URL(url);
    return /^https?:$/.test(parsed.protocol) ? parsed.origin : '';
  } catch {
    return '';
  }
}

function canInject(url) {
  return Boolean(originFromUrl(url));
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.tabId = tab?.id ?? null;
  state.tabUrl = tab?.url || '';
  state.tabTitle = tab?.title || '';
  state.originKey = originFromUrl(state.tabUrl) || 'global';
  return tab || null;
}

async function storageGet(keys) {
  return await chrome.storage.local.get(keys);
}

async function storageSet(payload) {
  await chrome.storage.local.set(payload);
}

async function storageRemove(keys) {
  await chrome.storage.local.remove(keys);
}

async function loadConfig() {
  const key = `siteaware.config.${state.originKey}`;
  const globalKey = 'siteaware.config.global';
  const stored = await storageGet([key, globalKey]);
  state.config = sanitizeWidgetConfig(stored[key] || stored[globalKey] || defaultWidgetConfig);
}

async function saveConfig() {
  await storageSet({ [`siteaware.config.${state.originKey}`]: state.config });
}

async function ensureInjected() {
  if (state.tabId == null || !canInject(state.tabUrl)) {
    state.injected = false;
    renderStatus();
    return false;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: state.tabId },
      files: ['content-script.js'],
    });
  } catch (error) {
    const message = String(error?.message || '');
    if (!message.includes('already')) {
      setToast(t('تعذر حقن المعاينة في هذه الصفحة.', 'Could not inject preview on this page.'));
      state.injected = false;
      renderStatus();
      return false;
    }
  }
  state.injected = true;
  renderStatus();
  return true;
}

async function sendToTab(message) {
  if (!(await ensureInjected())) return null;
  return await new Promise((resolve) => {
    chrome.tabs.sendMessage(state.tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        state.injected = false;
        renderStatus();
        resolve(null);
        return;
      }
      resolve(response || null);
    });
  });
}

async function syncPreview() {
  await saveConfig();
  if (state.livePreviewOff) {
    await sendToTab({ type: 'SITEAWARE_REMOVE_WIDGET' });
    state.injected = false;
    renderStatus();
    return;
  }
  await sendToTab({ type: 'SITEAWARE_RENDER_WIDGET', config: state.config });
  renderStatus();
}

function setConfig(patch) {
  state.config = sanitizeWidgetConfig({
    ...state.config,
    ...patch,
    appearance: {
      ...state.config.appearance,
      ...(patch.appearance || {}),
    },
  });
  void syncPreview();
}

function setToast(message) {
  $('toast').textContent = message;
  window.clearTimeout(setToast.timer);
  setToast.timer = window.setTimeout(() => {
    $('toast').textContent = '';
  }, 3600);
}

async function loadBuildInfo() {
  let info = {};
  try {
    const module = await import('./build-info.js');
    info = module.BUILD_INFO || {};
  } catch {
    info = {};
  }
  const branch = info.branch || 'unknown';
  const sha = info.sha || 'unknown';
  const id = info.id || 'dev';
  $('buildInfo').innerHTML = `Build: <b>${escapeHtml(branch)}</b> · ${escapeHtml(sha)} · ${escapeHtml(id)}`;
}

function renderStatus() {
  const host = hostnameFromUrl(state.tabUrl);
  const online = state.injected && !state.livePreviewOff;
  $('siteUrl').textContent = canInject(state.tabUrl) ? state.originKey : (state.tabUrl || 'n/a');

  $('liveStatus').innerHTML = `<span class="dot ${online ? 'on' : 'off'}"></span>${online ? t('On', 'On') : t('Off', 'Off')}`;
  $('directionStatus').textContent = state.profile?.direction?.toUpperCase() || state.config.direction.toUpperCase();
  $('themeStatus').textContent = state.profile?.mode || (state.config.appearance.backgroundColor === '#ffffff' ? 'Light' : 'Custom');
  $('analysisStatus').innerHTML = state.profile
    ? `<span class="dot on"></span>${t('Ready', 'Ready')}`
    : `<span class="dot off"></span>${t('Idle', 'Idle')}`;

  $('siteCards').innerHTML = `
    <div class="site-card">
      <span class="swatch" style="background:${toHex(state.config.appearance.primaryColor, '#4f46e5')}"></span>
      <div><div class="label">${t('الموقع الحالي', 'Current site')}</div><div class="value">${escapeHtml(host || 'n/a')}</div></div>
      <span class="meta">${canInject(state.tabUrl) ? 'https' : 'blocked'}</span>
    </div>
    <div class="site-card">
      <span class="swatch" style="background:${toHex(state.config.appearance.backgroundColor, '#f5f7fb')}"></span>
      <div><div class="label">${t('النطاق', 'Scope')}</div><div class="value">${state.originKey === 'global' ? t('افتراضي', 'Default') : hostnameFromUrl(state.originKey)}</div></div>
      <span class="meta">${t('محفوظ لكل موقع', 'per-site')}</span>
    </div>
  `;
}

function toHex(value, fallback) {
  const text = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text;
  const match = text.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return fallback;
  return `#${[match[1], match[2], match[3]].map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
}

function renderChoices(containerId, items, current, setter, kind) {
  const container = $(containerId);
  container.innerHTML = '';
  const byFeatured = [...(items || [])].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  for (const item of byFeatured) {
    const button = document.createElement('button');
    button.className = current === item.id ? 'choice active' : 'choice';
    button.type = 'button';
    button.title = item.label;
    if (kind === 'icon') {
      const preview = item.svg
        ? `<span class="mark-preview">${item.svg}</span>`
        : `<span class="glyph">${escapeHtml(item.glyph || 'S')}</span>`;
      button.innerHTML = `${preview}<small>${escapeHtml(item.label)}</small>`;
    } else if (kind === 'theme') {
      button.innerHTML = `<span class="theme-swatches"><i style="background:${item.primary}"></i><i style="background:${item.surface}"></i><i style="background:${item.background}"></i></span><small>${escapeHtml(item.label)}</small>`;
    } else if (kind === 'preset') {
      button.innerHTML = `<span class="glyph" style="background:transparent;color:var(--accent);border:1px solid var(--line-strong)">✦</span><small>${escapeHtml(item.label)}</small>`;
    } else {
      button.innerHTML = `<span>${escapeHtml(item.label)}</span>`;
    }
    button.addEventListener('click', () => setter(item.id));
    container.appendChild(button);
  }
}

function renderControls() {
  const config = state.config;
  document.documentElement.lang = config.locale === 'ar' ? 'ar' : 'en';
  document.documentElement.dir = config.locale === 'ar' ? 'rtl' : 'ltr';
  $('languageToggle').textContent = config.locale === 'ar' ? 'EN' : 'AR';
  $('assistantName').value = config.assistantName || 'SiteAware';
  $('openToggle').checked = config.previewOpen;
  $('previewToggle').checked = !state.livePreviewOff;
  $('dirToggle').checked = config.direction === 'rtl';

  $('primaryColor').value = toHex(config.appearance.primaryColor, '#4f46e5');
  $('surfaceColor').value = toHex(config.appearance.surfaceColor, '#ffffff');
  $('backgroundColor').value = toHex(config.appearance.backgroundColor, '#f5f7fb');
  $('textColor').value = toHex(config.appearance.textColor, '#111318');
  $('mutedColor').value = toHex(config.appearance.mutedTextColor, '#676c78');
  $('borderColor').value = toHex(config.appearance.borderColor, '#e5e7eb');

  $('fontScaleRange').value = String(config.appearance.fontScale);
  $('fontScaleValue').textContent = Number(config.appearance.fontScale).toFixed(2);
  $('densitySelect').value = config.appearance.density;
  $('widthRange').value = String(config.appearance.widgetWidth);
  $('heightRange').value = String(config.appearance.widgetHeight);
  $('radiusSelect').value = config.appearance.radius;
  $('launcherSizeSelect').value = config.appearance.launcherSize;
  $('positionSelect').value = config.appearance.launcherPosition;
  $('shadowRange').value = String(config.appearance.shadowStrength);
  $('shadowValue').textContent = Number(config.appearance.shadowStrength).toFixed(2);

  renderChoices('iconChoices', catalog.icons, config.assistantIcon, (value) => setConfig({ assistantIcon: value }), 'icon');
  renderChoices('launcherChoices', catalog.launchers, config.launcher, (value) => setConfig({ launcher: value }));
  renderChoices('shellChoices', catalog.chatShells, config.chatShell, (value) => setConfig({ chatShell: value }));
  renderChoices('headerChoices', catalog.headers, config.header, (value) => setConfig({ header: value }));
  renderChoices('assistantMessageChoices', catalog.messageStyles, config.assistantMessage, (value) => setConfig({ assistantMessage: value }));
  renderChoices('userMessageChoices', catalog.userMessages, config.userMessage, (value) => setConfig({ userMessage: value }));
  renderChoices('inputChoices', catalog.inputBars, config.inputBar, (value) => setConfig({ inputBar: value }));
  renderChoices('sendChoices', catalog.sendButtons, config.sendButton, (value) => setConfig({ sendButton: value }));
  renderChoices('sourceChoices', catalog.sourceCitations, config.sourceCitation, (value) => setConfig({ sourceCitation: value }));
  renderChoices('ctaChoices', catalog.takeMeThere, config.takeMeThere, (value) => setConfig({ takeMeThere: value }));
  renderChoices('themeChoices', catalog.themes, config.theme, applyTheme, 'theme');
  renderChoices('presetChoices', presets, null, applyPreset, 'preset');

  renderProfile();
}

function applyTheme(themeId) {
  const appearance = themeAppearance(themeId, state.config.appearance);
  setConfig({ theme: themeId, appearance });
}

function applyPreset(presetId) {
  const next = presetConfig(presetId);
  state.config = sanitizeWidgetConfig({ ...next, locale: state.config.locale, previewOpen: true });
  void syncPreview();
  renderControls();
  setToast(t('تم تطبيق القالب.', 'Preset applied.'));
}

function renderProfile() {
  const profile = state.profile;
  const box = $('profileBox');
  if (!profile) {
    box.innerHTML = `<p>${t('افحص الموقع لاستخراج الألوان والخطوط والحواف بأمان.', 'Scan the site to extract safe colors, fonts, and radius.')}</p>`;
    return;
  }
  const primary = profile.palette?.primary?.value;
  const surface = profile.palette?.surface?.value;
  const background = profile.palette?.background?.value;
  const border = profile.palette?.border?.value;
  const textColor = profile.palette?.foreground?.value;
  const confidence = Math.round((profile.confidence?.overall || 0) * 100);
  const confLabel = confidence >= 70 ? t('عالية', 'High') : confidence >= 40 ? t('متوسطة', 'Medium') : t('منخفضة', 'Low');

  box.innerHTML = `
    <div class="profile-grid">
      <div class="row"><span class="k">${t('النمط', 'Theme')}</span><span class="v">${escapeHtml(profile.mode || 'n/a')}</span></div>
      <div class="row"><span class="k">${t('الاتجاه', 'Direction')}</span><span class="v">${escapeHtml((profile.direction || 'ltr').toUpperCase())}</span></div>
      <div class="row"><span class="k">${t('الرئيسي', 'Primary')}</span><span class="v"><i style="background:${escapeAttr(primary)}"></i>${escapeHtml(primary || 'n/a')}</span></div>
      <div class="row"><span class="k">${t('السطح', 'Surface')}</span><span class="v"><i style="background:${escapeAttr(surface)}"></i>${escapeHtml(surface || 'n/a')}</span></div>
      <div class="row"><span class="k">${t('الخلفية', 'Background')}</span><span class="v"><i style="background:${escapeAttr(background)}"></i>${escapeHtml(background || 'n/a')}</span></div>
      <div class="row"><span class="k">${t('النص', 'Text')}</span><span class="v"><i style="background:${escapeAttr(textColor)}"></i>${escapeHtml(textColor || 'n/a')}</span></div>
      <div class="row"><span class="k">${t('الحدود', 'Border')}</span><span class="v"><i style="background:${escapeAttr(border)}"></i>${escapeHtml(border || 'n/a')}</span></div>
      <div class="row"><span class="k">${t('الخط', 'Font')}</span><span class="v">${escapeHtml(profile.typography?.fontFamily || 'n/a')}</span></div>
      <div class="row"><span class="k">${t('الحواف', 'Radius')}</span><span class="v">${profile.shape?.radius ?? 0}px</span></div>
      <div class="row"><span class="k">${t('الظل', 'Shadow')}</span><span class="v">${escapeHtml(profile.effects?.shadowStyle || 'none')}</span></div>
      <div class="row"><span class="k">${t('الثقة', 'Confidence')}</span><span class="v">${confidence}% · ${confLabel}</span></div>
      <div class="row conf">${t('عيّنات', 'Samples')}: ${profile.evidence?.visibleElementsSampled || 0} · ${t('تفاعلية', 'interactive')}: ${profile.evidence?.interactiveElementsSampled || 0} · ${t('متغيرات', 'vars')}: ${profile.evidence?.cssVariablesUsed || 0}</div>
    </div>
  `;
}

async function detectSiteStyle() {
  const response = await sendToTab({ type: 'SITEAWARE_SCAN_PAGE' });
  if (!response?.profile) {
    setToast(t('لم أستطع فحص هذه الصفحة.', 'Could not scan this page.'));
    return null;
  }
  state.profile = response.profile;
  renderProfile();
  renderStatus();
  setToast(t('تم استخراج تصميم الصفحة بدون محتوى خاص.', 'Safe site style extracted without private content.'));
  return state.profile;
}

async function applyDetected() {
  const profile = state.profile || (await detectSiteStyle());
  if (!profile) return;
  state.config = configFromDesignProfile(profile);
  await syncPreview();
  renderControls();
  setToast(t('تم تطبيق التصميم المستخرج مباشرة (بدون Gemini).', 'Detected style applied live (no Gemini).'));
}

async function aiMatchThisSite() {
  const profile = state.profile || (await detectSiteStyle());
  if (!profile) return;
  const fallback = configFromDesignProfile(profile);
  let next = fallback;
  try {
    const response = await fetch(`${BACKEND_URL}/api/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locale: state.config.locale,
        site: { name: profile.hostname || hostnameFromUrl(state.tabUrl), vibe: 'current website visual style' },
        config: state.config,
        catalog: aiCatalogSummary(),
        themeMode: profile.mode === 'dark' ? 'dark' : 'light',
        prompt: t(
          'طابق هذا الملف الآمن فقط. لا تطلب نص الصفحة. اختر من الكتالوج المسموح.',
          'Match this safe design profile only. Do not request page text. Choose from the allowed catalog.'
        ) + ` profile: ${JSON.stringify(profile)}`,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (payload?.ok && payload.patch) {
      next = applyDesignPatch(fallback, payload.patch);
      state.backendReady = true;
    }
  } catch {
    state.backendReady = false;
  }
  state.config = next;
  await syncPreview();
  renderControls();
  setToast(state.backendReady ? t('Gemini طبّق توصية آمنة.', 'Gemini applied a safe recommendation.') : t('Gemini غير متاح، طبّقت مطابقة محلية.', 'Gemini unavailable, local match applied.'));
}

async function runDesignCopilot() {
  const prompt = $('designPrompt').value.trim();
  if (!prompt) {
    setToast(t('اكتب وصف التصميم أولاً.', 'Describe the design first.'));
    return;
  }
  const box = $('designSummary');
  box.innerHTML = `<p>${t('Gemini يعيد تركيب التصميم الآن…', 'Gemini is recomposing the widget…')}</p>`;
  try {
    const response = await fetch(`${BACKEND_URL}/api/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locale: state.config.locale,
        prompt,
        site: { name: hostnameFromUrl(state.tabUrl), vibe: 'current site' },
        config: state.config,
        catalog: aiCatalogSummary(),
        themeMode: state.config.appearance.backgroundColor === '#ffffff' ? 'light' : 'dark',
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!payload?.ok) {
      throw new Error(payload?.message || 'Design request failed.');
    }
    state.config = applyDesignPatch(state.config, payload.patch);
    state.backendReady = true;
    await syncPreview();
    renderControls();
    box.innerHTML = `<p>${escapeHtml(payload.summary || t('تم تطبيق تعديلات الذكاء.', 'AI designer applied changes.'))}</p>`;
  } catch (error) {
    state.backendReady = false;
    box.innerHTML = `<p>${escapeHtml(error?.message || t('تعذر تطبيق الذكاء الآن.', 'Could not apply AI now.'))}</p>`;
    setToast(t('Gemini غير متاح — عدّل يدوياً من الأقسام.', 'Gemini unavailable — edit manually from the sections.'));
  }
}

async function resetThisSite() {
  state.config = sanitizeWidgetConfig(defaultWidgetConfig);
  await storageRemove([`siteaware.config.${state.originKey}`]);
  await syncPreview();
  renderControls();
  setToast(t('تمت إعادة ضبط هذا الموقع.', 'This site was reset.'));
}

function exportConfig() {
  const blob = new Blob([JSON.stringify(state.config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'siteaware-widget-studio-config.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

async function checkBackend() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    const payload = await response.json();
    state.backendReady = payload?.mode === 'ready';
  } catch {
    state.backendReady = false;
  }
}

function bind() {
  $('languageToggle').addEventListener('click', () => setConfig({ locale: state.config.locale === 'ar' ? 'en' : 'ar' }));
  $('assistantName').addEventListener('input', (event) => setConfig({ assistantName: event.target.value }));
  $('dirToggle').addEventListener('change', (event) => setConfig({ direction: event.target.checked ? 'rtl' : 'ltr' }));
  $('openToggle').addEventListener('change', (event) => setConfig({ previewOpen: event.target.checked }));
  $('previewToggle').addEventListener('change', (event) => {
    state.livePreviewOff = !event.target.checked;
    if (state.livePreviewOff) {
      void sendToTab({ type: 'SITEAWARE_REMOVE_WIDGET' });
      state.injected = false;
      renderStatus();
    } else {
      void syncPreview();
    }
  });

  $('primaryColor').addEventListener('input', (event) => setConfig({ appearance: { primaryColor: event.target.value } }));
  $('surfaceColor').addEventListener('input', (event) => setConfig({ appearance: { surfaceColor: event.target.value } }));
  $('backgroundColor').addEventListener('input', (event) => setConfig({ appearance: { backgroundColor: event.target.value } }));
  $('textColor').addEventListener('input', (event) => setConfig({ appearance: { textColor: event.target.value } }));
  $('mutedColor').addEventListener('input', (event) => setConfig({ appearance: { mutedTextColor: event.target.value } }));
  $('borderColor').addEventListener('input', (event) => setConfig({ appearance: { borderColor: event.target.value } }));

  $('fontScaleRange').addEventListener('input', (event) => setConfig({ appearance: { fontScale: Number(event.target.value) } }));
  $('densitySelect').addEventListener('change', (event) => setConfig({ appearance: { density: event.target.value } }));
  $('widthRange').addEventListener('input', (event) => setConfig({ appearance: { widgetWidth: Number(event.target.value) } }));
  $('heightRange').addEventListener('input', (event) => setConfig({ appearance: { widgetHeight: Number(event.target.value) } }));
  $('radiusSelect').addEventListener('change', (event) => setConfig({ appearance: { radius: event.target.value } }));
  $('launcherSizeSelect').addEventListener('change', (event) => setConfig({ appearance: { launcherSize: event.target.value } }));
  $('positionSelect').addEventListener('change', (event) => setConfig({ appearance: { launcherPosition: event.target.value } }));
  $('shadowRange').addEventListener('input', (event) => setConfig({ appearance: { shadowStrength: Number(event.target.value) } }));

  $('detectBtn').addEventListener('click', detectSiteStyle);
  $('applyDetectedBtn').addEventListener('click', applyDetected);
  $('matchBtn').addEventListener('click', aiMatchThisSite);
  $('designApplyBtn').addEventListener('click', runDesignCopilot);
  $('designExampleBtn').addEventListener('click', () => {
    $('designPrompt').value = state.config.locale === 'ar'
      ? 'اجعل التصميم أبيض ونظيفًا، الأيقونة رسمية، ونافذة المحادثة هادئة مع زر إرسال دائري.'
      : 'Make it a clean white widget with the official mark, a calm chat window, and a circular send button.';
  });
  $('resetBtn').addEventListener('click', resetThisSite);
  $('exportBtn').addEventListener('click', exportConfig);
  $('removeBtn').addEventListener('click', async () => {
    await sendToTab({ type: 'SITEAWARE_REMOVE_WIDGET' });
    state.injected = false;
    state.livePreviewOff = true;
    $('previewToggle').checked = false;
    renderStatus();
  });
}

chrome.tabs.onActivated?.addListener(async () => {
  await boot();
});

chrome.tabs.onUpdated?.addListener((tabId, changeInfo) => {
  if (tabId === state.tabId && (changeInfo.status === 'complete' || changeInfo.url)) {
    void boot();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'SITEAWARE_ROUTE_CHANGED') {
    void getActiveTab().then(() => {
      renderStatus();
      void syncPreview();
    });
  }
});

async function boot() {
  await getActiveTab();
  await loadConfig();
  renderControls();
  renderStatus();
  await checkBackend();
  await syncPreview();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return String(value ?? '').replace(/["\\]/g, '\\$&');
}

bind();
void loadBuildInfo();
void boot();