import { demoProfiles } from './shared/demo-profiles.js';
import { generateRecommendations } from './shared/theme-engine.js';

const state = {
  tabId: null,
  tabTitle: '',
  tabUrl: '',
  snapshot: null,
  recommendations: [],
  target: null,
  injectedTabs: new Set(),
  activeProfileId: null,
};

const $ = (id) => document.getElementById(id);

function hostnameFromUrl(url) {
  try {
    return url ? new URL(url).hostname : '';
  } catch {
    return '';
  }
}

function setStatus(text) {
  $('status').textContent = text;
}

function renderTabMeta() {
  const hostname = hostnameFromUrl(state.tabUrl);
  const title = state.tabTitle || 'Untitled page';
  $('tabMeta').textContent = state.tabId == null
    ? 'Open a normal web page and click the extension icon.'
    : `${title}${hostname ? ` · ${hostname}` : ''}`;
}

function renderSnapshot(snapshot) {
  $('snapshot').textContent = JSON.stringify(snapshot || {}, null, 2);
  const summary = $('summary');
  summary.innerHTML = '';

  const normalized = snapshot || {};
  const cards = [
    ['Mode', normalized.pageMode || 'mixed'],
    ['Background', normalized.pageBackground || 'n/a'],
    ['Fonts', (normalized.fontFamilies || []).slice(0, 2).join(', ') || 'n/a'],
    ['Radii', `buttons ${normalized.buttonRadius ?? 'n/a'} / cards ${normalized.cardRadius ?? 'n/a'} / inputs ${normalized.inputRadius ?? 'n/a'}`],
    ['Colors', `${(normalized.brandColors || []).length} brand / ${(normalized.accentColors || []).length} accent`],
    ['Source', normalized.source?.hostname || hostnameFromUrl(state.tabUrl) || 'n/a'],
  ];

  for (const [label, value] of cards) {
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `<strong>${label}</strong><span>${value}</span>`;
    summary.appendChild(card);
  }
}

function renderRecommendations() {
  const container = $('recs');
  container.innerHTML = '';
  $('recsHint').textContent = state.recommendations.length
    ? `${state.recommendations.length} deterministic theme options`
    : 'No recommendations yet.';

  if (!state.recommendations.length) {
    container.innerHTML = '<p class="empty">Scan the page or load a demo profile to generate themes.</p>';
    return;
  }

  for (const rec of state.recommendations) {
    const card = document.createElement('div');
    card.className = 'rec-card';
    const tokens = rec.tokens || {};
    card.innerHTML = `
      <div>
        <strong>${rec.label}</strong>
        <span>${rec.origin || 'local scan'}</span>
      </div>
      <div class="swatches">
        <span style="background:${tokens.primary || '#7cc8ff'}"></span>
        <span style="background:${tokens.surface || '#111827'}"></span>
        <span style="background:${tokens.surfaceSecondary || '#172033'}"></span>
        <span style="background:${tokens.accent || tokens.primary || '#7cc8ff'}"></span>
        <span style="background:${tokens.text || '#f8fbff'}"></span>
      </div>
      <div class="row">
        <button class="primary">Apply to widget</button>
      </div>
    `;
    card.querySelector('button').addEventListener('click', async () => {
      await injectAndSend({
        type: 'SITEAWARE_RENDER_WIDGET',
        config: { theme: rec, open: true },
      });
      setStatus(`Applied ${rec.label} to the widget.`);
    });
    container.appendChild(card);
  }
}

function renderProfiles() {
  const container = $('profiles');
  container.innerHTML = '';
  for (const profile of demoProfiles) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    const active = state.activeProfileId === profile.id;
    card.innerHTML = `
      <strong>${profile.label}</strong>
      <span>${profile.note}</span>
      <div class="preview-actions">
        <button class="ghost">${active ? 'Loaded' : 'Preview'}</button>
        <button class="primary">Apply</button>
      </div>
    `;
    const [previewBtn, applyBtn] = card.querySelectorAll('button');
    previewBtn.addEventListener('click', () => {
      state.activeProfileId = profile.id;
      state.snapshot = profile.snapshot;
      state.recommendations = generateRecommendations(profile.snapshot);
      renderSnapshot(state.snapshot);
      renderRecommendations();
      setStatus(`Loaded demo profile: ${profile.label}.`);
      $('summaryHint').textContent = `Demo profile: ${profile.label}`;
      renderProfiles();
    });
    applyBtn.addEventListener('click', async () => {
      state.activeProfileId = profile.id;
      state.snapshot = profile.snapshot;
      state.recommendations = generateRecommendations(profile.snapshot);
      renderSnapshot(state.snapshot);
      renderRecommendations();
      renderProfiles();
      await injectAndSend({
        type: 'SITEAWARE_RENDER_WIDGET',
        config: { theme: state.recommendations[0], open: true },
      });
      setStatus(`Applied demo profile ${profile.label} to the widget.`);
    });
    container.appendChild(card);
  }
}

function renderTarget(target) {
  $('target').textContent = target ? JSON.stringify(target, null, 2) : 'No target selected.';
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function refreshActiveTab() {
  const tab = await getActiveTab();
  state.tabId = tab?.id ?? null;
  state.tabTitle = tab?.title || '';
  state.tabUrl = tab?.url || '';
  renderTabMeta();
  return tab;
}

async function ensureInjected(tabId = state.tabId) {
  if (tabId == null || state.injectedTabs.has(tabId)) {
    return true;
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content-script.js'],
  });
  state.injectedTabs.add(tabId);
  return true;
}

async function sendMessageToTab(tabId, message) {
  return await new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });
}

async function injectAndSend(message, { retry = true } = {}) {
  await refreshActiveTab();
  if (state.tabId == null) {
    setStatus('No active tab found.');
    return null;
  }

  try {
    await ensureInjected(state.tabId);
    return await sendMessageToTab(state.tabId, message);
  } catch (error) {
    if (!retry) {
      setStatus(`Could not reach the page: ${error.message}`);
      return null;
    }

    state.injectedTabs.delete(state.tabId);
    try {
      await ensureInjected(state.tabId);
      return await sendMessageToTab(state.tabId, message);
    } catch (retryError) {
      setStatus(`Could not reach the page: ${retryError.message}`);
      return null;
    }
  }
}

async function scanPage() {
  setStatus('Scanning this page...');
  const response = await injectAndSend({ type: 'SITEAWARE_SCAN_PAGE' });
  if (!response?.snapshot) {
    return;
  }

  state.snapshot = response.snapshot;
  state.recommendations = response.recommendations || generateRecommendations(response.snapshot);
  state.activeProfileId = null;
  renderSnapshot(state.snapshot);
  renderRecommendations();
  renderProfiles();
  $('summaryHint').textContent = 'Live page scan complete.';
  setStatus('Scan complete. Recommendations are ready.');
}

async function applyStrategy(strategy, label) {
  setStatus(`Applying ${label}...`);
  const response = await injectAndSend({ type: 'SITEAWARE_AUTO_MATCH', strategy });
  if (response?.snapshot) {
    state.snapshot = response.snapshot;
    state.recommendations = response.recommendations || generateRecommendations(response.snapshot);
    renderSnapshot(state.snapshot);
    renderRecommendations();
    $('summaryHint').textContent = `${label} applied from a live scan.`;
  }
  setStatus(`${label} applied to the widget.`);
}

function bindActions() {
  $('scanBtn').addEventListener('click', scanPage);
  $('brandBtn').addEventListener('click', () => applyStrategy('auto-brand', 'Brand Match'));
  $('contrastBtn').addEventListener('click', () => applyStrategy('auto-contrast', 'High Contrast'));
  $('premiumBtn').addEventListener('click', () => applyStrategy('auto-premium', 'Premium'));
  $('injectBtn').addEventListener('click', async () => {
    const theme = state.recommendations[0] || generateRecommendations(state.snapshot || demoProfiles[0].snapshot)[0];
    await injectAndSend({ type: 'SITEAWARE_RENDER_WIDGET', config: { theme, open: true } });
    setStatus(`Injected widget using ${theme.label}.`);
  });
  $('removeBtn').addEventListener('click', async () => {
    await injectAndSend({ type: 'SITEAWARE_REMOVE_WIDGET' });
    setStatus('Widget removed.');
  });
  $('pickBtn').addEventListener('click', async () => {
    await injectAndSend({ type: 'SITEAWARE_START_TARGET_PICKER' });
    setStatus('Target picker is active. Click an element on the page.');
  });
  $('clearBtn').addEventListener('click', async () => {
    await injectAndSend({ type: 'SITEAWARE_CLEAR_TARGET' });
    state.target = null;
    renderTarget(null);
    setStatus('Target selection cleared.');
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'SITEAWARE_SCAN_RESULT') {
    state.snapshot = message.snapshot;
    state.recommendations = message.recommendations || generateRecommendations(message.snapshot);
    state.activeProfileId = null;
    renderSnapshot(state.snapshot);
    renderRecommendations();
    renderProfiles();
    $('summaryHint').textContent = 'Live page scan complete.';
    setStatus('Scan result received from the page.');
  }

  if (message?.type === 'SITEAWARE_TARGET_SELECTED') {
    state.target = message.metadata;
    renderTarget(state.target);
    setStatus('Target selected.');
  }

  if (message?.type === 'SITEAWARE_TARGET_PICKER_CANCELLED') {
    setStatus('Target picker canceled.');
  }
});

chrome.tabs.onActivated?.addListener(() => {
  void refreshActiveTab();
});

chrome.tabs.onUpdated?.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' || changeInfo.url) {
    state.injectedTabs.delete(tabId);
  }
  if (tabId === state.tabId && changeInfo.status === 'complete') {
    state.tabTitle = tab?.title || state.tabTitle;
    state.tabUrl = tab?.url || state.tabUrl;
    renderTabMeta();
  }
});

bindActions();
renderTarget(null);
renderSnapshot(null);
renderRecommendations();
renderProfiles();
void refreshActiveTab().then((tab) => {
  if (tab) {
    setStatus(`Ready for ${hostnameFromUrl(tab.url) || 'the active tab'}.`);
  }
});
