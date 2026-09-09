import { catalog, configFromDesignProfile, defaultWidgetConfig, sanitizeWidgetConfig } from './shared/widget-catalog.js';

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

async function storageGet(key) {
  return await chrome.storage.local.get(key);
}

async function storageSet(payload) {
  await chrome.storage.local.set(payload);
}

async function loadConfig() {
  const key = `siteaware.config.${state.originKey}`;
  const globalKey = 'siteaware.config.global';
  const stored = await storageGet([key, globalKey]);
  state.config = sanitizeWidgetConfig(stored[key] || stored[globalKey] || defaultWidgetConfig);
}

async function saveConfig(scope = 'site') {
  const key = scope === 'global' ? 'siteaware.config.global' : `siteaware.config.${state.originKey}`;
  await storageSet({ [key]: state.config });
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
  await saveConfig('site');
  await sendToTab({ type: 'SITEAWARE_RENDER_WIDGET', config: state.config });
  renderControls();
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

function renderStatus() {
  const host = hostnameFromUrl(state.tabUrl);
  $('siteName').textContent = host || t('صفحة غير مدعومة', 'Unsupported page');
  $('siteUrl').textContent = canInject(state.tabUrl) ? state.originKey : state.tabUrl || 'n/a';
  $('injectStatus').textContent = state.injected ? t('نعم', 'Yes') : t('لا', 'No');
  $('permissionStatus').textContent = canInject(state.tabUrl) ? t('جاهز', 'Ready') : t('غير مدعوم', 'Blocked');
  $('backendStatus').textContent = state.backendReady ? 'Gemini ready' : 'Rule match';
  $('directionStatus').textContent = state.profile?.direction?.toUpperCase() || state.config.direction.toUpperCase();
  $('themeStatus').textContent = state.profile?.themeMode || (state.config.appearance.backgroundColor === '#ffffff' ? 'light' : 'custom');
}

function renderChoices(containerId, items, current, setter, type) {
  const container = $(containerId);
  container.innerHTML = '';
  for (const item of items) {
    const button = document.createElement('button');
    button.className = current === item.id ? 'choice active' : 'choice';
    button.type = 'button';
    button.title = item.label;
    button.innerHTML = type === 'icon'
      ? `<span class="glyph">${item.glyph}</span><small>${item.label}</small>`
      : `<span>${item.label}</span>`;
    button.addEventListener('click', () => setter(item.id));
    container.appendChild(button);
  }
}

function renderControls() {
  const config = state.config;
  document.documentElement.lang = config.locale;
  document.documentElement.dir = config.locale === 'ar' ? 'rtl' : 'ltr';
  $('languageToggle').textContent = config.locale === 'ar' ? 'EN' : 'AR';
  $('openToggle').checked = config.previewOpen;
  $('dirToggle').checked = config.direction === 'rtl';
  $('primaryColor').value = toHex(config.appearance.primaryColor, '#2563eb');
  $('surfaceColor').value = toHex(config.appearance.surfaceColor, '#ffffff');
  $('widthRange').value = String(config.appearance.widgetWidth);
  $('heightRange').value = String(config.appearance.widgetHeight);
  $('radiusSelect').value = config.appearance.radius;
  $('positionSelect').value = config.appearance.launcherPosition;
  $('scopeLabel').textContent = state.originKey === 'global' ? 'Global' : hostnameFromUrl(state.originKey);

  renderChoices('iconChoices', catalog.icons, config.assistantIcon, (value) => setConfig({ assistantIcon: value }), 'icon');
  renderChoices('launcherChoices', catalog.launchers, config.launcher, (value) => setConfig({ launcher: value }));
  renderChoices('shellChoices', catalog.chatShells, config.chatShell, (value) => setConfig({ chatShell: value }));
  renderChoices('assistantMessageChoices', catalog.messageStyles, config.assistantMessage, (value) => setConfig({ assistantMessage: value }));
  renderChoices('inputChoices', catalog.inputBars, config.inputBar, (value) => setConfig({ inputBar: value }));
  renderChoices('sendChoices', catalog.sendButtons, config.sendButton, (value) => setConfig({ sendButton: value }));
  renderProfile();
}

function renderProfile() {
  const profile = state.profile;
  const box = $('profileBox');
  if (!profile) {
    box.innerHTML = `<p>${t('افحص الموقع لاستخراج الألوان والخطوط والحواف بأمان.', 'Scan the site to extract safe colors, fonts, and radius.')}</p>`;
    return;
  }
  box.innerHTML = `
    <div class="profile-grid">
      <span>${t('الاتجاه', 'Direction')}<b>${profile.direction}</b></span>
      <span>${t('النمط', 'Theme')}<b>${profile.themeMode}</b></span>
      <span>${t('الرئيسي', 'Primary')}<b><i style="background:${profile.primary}"></i>${profile.primary}</b></span>
      <span>${t('الخلفية', 'Background')}<b><i style="background:${profile.background}"></i>${profile.background}</b></span>
      <span>${t('الحواف', 'Radius')}<b>${profile.radius}px</b></span>
      <span>${t('العينات', 'Samples')}<b>${profile.evidenceCounts?.sampledElements || 0}</b></span>
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

async function detectSiteStyle() {
  const response = await sendToTab({ type: 'SITEAWARE_SCAN_PAGE' });
  if (!response?.profile) {
    setToast(t('لم أستطع فحص هذه الصفحة.', 'Could not scan this page.'));
    return;
  }
  state.profile = response.profile;
  renderProfile();
  renderStatus();
  setToast(t('تم استخراج تصميم الصفحة بدون محتوى خاص.', 'Safe site style extracted without private content.'));
}

async function applyDetected() {
  if (!state.profile) {
    await detectSiteStyle();
  }
  if (!state.profile) return;
  state.config = configFromDesignProfile(state.profile);
  await syncPreview();
  setToast(t('تم تطبيق التصميم المستخرج مباشرة.', 'Detected style applied live.'));
}

async function aiMatchThisSite() {
  if (!state.profile) {
    await detectSiteStyle();
  }
  if (!state.profile) return;
  let next = configFromDesignProfile(state.profile);
  try {
    const response = await fetch(`${BACKEND_URL}/api/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locale: state.config.locale,
        site: { name: state.profile.source?.hostname || hostnameFromUrl(state.tabUrl), vibe: 'current website visual style' },
        config: state.config,
        catalog,
        themeMode: state.profile.themeMode,
        prompt: `Match this safe design profile only. Do not request page text. Profile: ${JSON.stringify(state.profile)}`,
      }),
    });
    const payload = await response.json();
    if (payload?.ok && payload.patch) {
      next = sanitizeWidgetConfig({ ...next, ...payload.patch, appearance: { ...next.appearance, ...(payload.patch.appearance || {}) } });
      state.backendReady = true;
    }
  } catch {
    state.backendReady = false;
  }
  state.config = next;
  await syncPreview();
  setToast(state.backendReady ? t('Gemini طبّق توصية آمنة.', 'Gemini applied a safe recommendation.') : t('Gemini غير متاح، طبّقت مطابقة محلية.', 'Gemini unavailable, local match applied.'));
}

async function resetThisSite() {
  state.config = sanitizeWidgetConfig(defaultWidgetConfig);
  await chrome.storage.local.remove(`siteaware.config.${state.originKey}`);
  await syncPreview();
}

function bind() {
  $('languageToggle').addEventListener('click', () => setConfig({ locale: state.config.locale === 'ar' ? 'en' : 'ar' }));
  $('openToggle').addEventListener('change', (event) => setConfig({ previewOpen: event.target.checked }));
  $('dirToggle').addEventListener('change', (event) => setConfig({ direction: event.target.checked ? 'rtl' : 'ltr' }));
  $('primaryColor').addEventListener('input', (event) => setConfig({ appearance: { primaryColor: event.target.value } }));
  $('surfaceColor').addEventListener('input', (event) => setConfig({ appearance: { surfaceColor: event.target.value } }));
  $('widthRange').addEventListener('input', (event) => setConfig({ appearance: { widgetWidth: Number(event.target.value) } }));
  $('heightRange').addEventListener('input', (event) => setConfig({ appearance: { widgetHeight: Number(event.target.value) } }));
  $('radiusSelect').addEventListener('change', (event) => setConfig({ appearance: { radius: event.target.value } }));
  $('positionSelect').addEventListener('change', (event) => setConfig({ appearance: { launcherPosition: event.target.value } }));
  $('detectBtn').addEventListener('click', detectSiteStyle);
  $('applyDetectedBtn').addEventListener('click', applyDetected);
  $('matchBtn').addEventListener('click', aiMatchThisSite);
  $('removeBtn').addEventListener('click', async () => {
    await sendToTab({ type: 'SITEAWARE_REMOVE_WIDGET' });
    state.injected = false;
    renderStatus();
  });
  $('resetBtn').addEventListener('click', resetThisSite);
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

async function checkBackend() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    const payload = await response.json();
    state.backendReady = payload?.mode === 'ready';
  } catch {
    state.backendReady = false;
  }
}

async function boot() {
  await getActiveTab();
  await loadConfig();
  renderControls();
  renderStatus();
  await checkBackend();
  await syncPreview();
}

bind();
void boot();
