// AutoUI Optimizer - Background Service Worker

const DEFAULT_API = "https://autoui-optimizer.onrender.com";

async function getApiBase() {
  const { apiBase } = await chrome.storage.local.get("apiBase");
  return (apiBase || DEFAULT_API).replace(/\/$/, "");
}

// Retry pending metrics on startup
chrome.runtime.onStartup.addListener(async () => {
  const { pendingMetrics } = await chrome.storage.local.get("pendingMetrics");
  if (pendingMetrics) {
    const base = await getApiBase();
    try {
      await fetch(`${base}/api/v1/performance/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingMetrics),
      });
      await chrome.storage.local.remove("pendingMetrics");
    } catch (_) {}
  }
});

// Forward messages between content script and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "METRICS_UPLOADED") {
    chrome.storage.local.set({
      latestSession: { sessionId: msg.sessionId, tabId: sender.tab?.id },
    });
  }

  if (msg.type === "FETCH_SUGGESTIONS") {
    getApiBase().then(base =>
      fetch(`${base}/api/v1/suggestions/${msg.sessionId}`)
        .then((r) => r.json())
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }))
    );
    return true;
  }

  if (msg.type === "TRIGGER_ANALYZE") {
    getApiBase().then(base =>
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
});
