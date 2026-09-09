const sidePanelReady = chrome.sidePanel && chrome.sidePanel.setPanelBehavior;
const BACKEND_URL = 'https://siteaware-widget-studio.onrender.com';

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SITEAWARE_GET_TAB_ID') {
    sendResponse({ tabId: sender.tab?.id ?? null });
    return true;
  }
  if (message?.type === 'SITEAWARE_PREVIEW_CHAT') {
    fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload || {}),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        sendResponse({
          ok: Boolean(response.ok && payload.ok),
          reply: payload.reply || '',
          message: payload.message || '',
        });
      })
      .catch((error) => {
        sendResponse({ ok: false, reply: '', message: error instanceof Error ? error.message : 'Preview assistant failed.' });
      });
    return true;
  }
  return undefined;
});
