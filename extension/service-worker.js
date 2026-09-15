/* SiteAware Studio service worker — official MV3 worker (GUIDE ONLY).
 *
 * Responsibilities (execution infrastructure only, never owns learning state):
 * - tab orchestration: open side panel on action click
 * - message routing: SITEAWARE_GET_TAB_ID
 * - LEARN_PASS: same-browser learning passes in ONE reused INACTIVE tab:
 *   navigate approved same-origin templated route, wait SPA stability,
 *   extract ONE safe observation, report, repeat. Never touches forms,
 *   never clicks, never mutates, never leaves the origin.
 * - Studio design relay: SITEAWARE_PREVIEW_CHAT / SITEAWARE_DESIGN toward
 *   the hosted Studio backend (visual editing only, never page content).
 * Backend remains intelligence/state authority (local-integration).
 */

const sidePanelReady = chrome.sidePanel && chrome.sidePanel.setPanelBehavior;
const STUDIO_BACKEND_URL = 'https://siteaware-widget-studio.onrender.com';
const LOGIN_FRAGMENTS = ['login', 'signin', 'signup', 'register'];

chrome.runtime.onInstalled.addListener(async () => {
  if (sidePanelReady) {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch {
      // Side panel behavior is best effort.
    }
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id == null) {
    return;
  }
  await chrome.sidePanel.open({ tabId: tab.id });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForStability(tabId, timeoutMs = 30000) {
  // 30 s budget: learn passes run in a BACKGROUND tab where rendering and
  // network are throttled; measured foreground settle is ~6-9 s on heavy
  // Rousheta routes. The 1.5 s quiet bar below stays strict, so genuinely
  // live pages still report UNSTABLE honestly.
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot = '';
  let quietSince = 0;
  while (Date.now() < deadline) {
    let snapshot = null;
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          state: document.readyState,
          size: document.documentElement.outerHTML.length,
        }),
      });
      snapshot = `${result?.result?.state}:${result?.result?.size}`;
    } catch {
      await sleep(500);
      continue;
    }
    if (snapshot === lastSnapshot) {
      if (!quietSince) quietSince = Date.now();
      if (Date.now() - quietSince > 1500) return true;
    } else {
      lastSnapshot = snapshot;
      quietSince = 0;
    }
    await sleep(500);
  }
  return false;
}

async function observeTab(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content-script.js'] }).catch(() => {});
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'SITEAWARE_OBSERVE' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ status: 'UNRESOLVED', error: String(chrome.runtime.lastError.message || '') });
        return;
      }
      resolve(response || { status: 'UNRESOLVED' });
    });
  });
}

async function runLearningPass({ origin, routes, maxPages }) {
  const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
  const visited = [];
  try {
    const budget = Math.min(routes.length, maxPages || 25);
    for (let i = 0; i < budget; i += 1) {
      const route = routes[i];
      if (LOGIN_FRAGMENTS.some((frag) => route.toLowerCase().includes(frag))) {
        visited.push({ route, status: 'SKIPPED_LOGIN_SCOPE' });
        continue;
      }
      const url = origin.replace(/\/$/, '') + route;
      try {
        await chrome.tabs.update(tab.id, { url });
      } catch (error) {
        visited.push({ route, status: 'NAVIGATE_FAILED' });
        continue;
      }
      const stable = await waitForStability(tab.id);
      if (!stable) {
        visited.push({ route, status: 'UNSTABLE' });
        continue;
      }
      const observed = await observeTab(tab.id);
      visited.push({ route, status: observed.status || 'UNRESOLVED', observation: observed.observation || null });
      // Best-effort progress broadcast: no receiving panel must never
      // reject into the learning pass (MV3 sendMessage without a listener
      // rejects asynchronously, which try/catch cannot intercept).
      await chrome.runtime.sendMessage({ type: 'SITEAWARE_LEARN_PROGRESS', visited: visited.length, route }).catch(() => {});
    }
  } finally {
    try {
      await chrome.tabs.remove(tab.id);
    } catch {
      /* best effort */
    }
  }
  return { visited };
}

function postToStudio(path, payload) {
  return fetch(`${STUDIO_BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === 'SITEAWARE_GET_TAB_ID') {
      sendResponse({ tabId: sender.tab?.id ?? null });
      return;
    }
    if (message?.type === 'SITEAWARE_LEARN_PASS') {
      const result = await runLearningPass({
        origin: message.origin,
        routes: Array.isArray(message.routes) ? message.routes.slice(0, 30) : [],
        maxPages: message.maxPages || 25,
      });
      sendResponse({ status: 'LEARN_PASS_DONE', ...result });
      return;
    }
    if (message?.type === 'SITEAWARE_PREVIEW_CHAT') {
      try {
        const response = await postToStudio('/api/chat', message.payload || {});
        const payload = await response.json().catch(() => ({}));
        sendResponse({
          ok: Boolean(response.ok && payload.ok !== false),
          reply: payload.reply || '',
          message: payload.message || '',
        });
      } catch (error) {
        sendResponse({ ok: false, reply: '', message: error instanceof Error ? error.message : 'Preview assistant failed.' });
      }
      return;
    }
    if (message?.type === 'SITEAWARE_DESIGN') {
      try {
        const response = await postToStudio('/api/design', message.payload || {});
        const payload = await response.json().catch(() => ({}));
        sendResponse({ ok: Boolean(response.ok), ...payload });
      } catch (error) {
        sendResponse({ ok: false, message: error instanceof Error ? error.message : 'Design copilot failed.' });
      }
      return;
    }
    sendResponse({ status: 'UNKNOWN_MESSAGE' });
  })().catch(() => {
    try {
      sendResponse({ status: 'WORKER_ERROR' });
    } catch {
      /* closed */
    }
  });
  return true;
});
