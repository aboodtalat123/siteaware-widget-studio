const sidePanelReady = chrome.sidePanel && chrome.sidePanel.setPanelBehavior;

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
  return undefined;
});
