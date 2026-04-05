// AutoUI Optimizer — Background Service Worker
// Loads config.js values; falls back to AUTOUI_CONFIG.DEFAULT_API

async function getApiBase() {
  const { apiBase } = await chrome.storage.local.get("apiBase");
  return (apiBase || AUTOUI_CONFIG.DEFAULT_API).replace(/\/$/, "");
}

// Retry pending metrics from previous failed uploads
chrome.runtime.onStartup.addListener(async () => {
  const { pendingMetrics } = await chrome.storage.local.get("pendingMetrics");
  if (!pendingMetrics) return;
  const base = await getApiBase();
  try {
    await fetch(`${base}/api/v1/performance/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendingMetrics),
    });
    await chrome.storage.local.remove("pendingMetrics");
  } catch (_) {}
});

// Message bridge between content script / popup / devtools
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "METRICS_UPLOADED") {
    chrome.storage.local.set({
      latestSession: { sessionId: msg.sessionId, tabId: sender.tab?.id },
    });
    return;
  }

  if (msg.type === "FETCH_SUGGESTIONS") {
    getApiBase().then((base) =>
      fetch(`${base}/api/v1/suggestions/${msg.sessionId}`)
        .then((r) => r.json())
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }))
    );
    return true; // keep message channel open for async
  }

  if (msg.type === "TRIGGER_ANALYZE") {
    getApiBase().then((base) =>
      fetch(`${base}/api/v1/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: msg.sessionId }),
      })
        .then((r) => r.json())
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }))
    );
    return true;
  }

  if (msg.type === "GET_CONFIG") {
    sendResponse({ config: AUTOUI_CONFIG });
  }
});
