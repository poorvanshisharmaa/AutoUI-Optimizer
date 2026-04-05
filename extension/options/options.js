// options.js — depends on config.js loaded via options.html

const apiInput       = document.getElementById("api-url");
const dashboardInput = document.getElementById("dashboard-url");
const tokenInput     = document.getElementById("user-token");
const statusEl       = document.getElementById("status");

// Load saved settings
chrome.storage.local.get(["apiBase", "dashboardUrl", "userToken"], (stored) => {
  apiInput.value       = stored.apiBase       || AUTOUI_CONFIG.DEFAULT_API;
  dashboardInput.value = stored.dashboardUrl  || AUTOUI_CONFIG.DASHBOARD_URL;
  tokenInput.value     = stored.userToken     || "";
});

document.getElementById("btn-save").addEventListener("click", () => {
  const apiBase      = apiInput.value.trim().replace(/\/$/, "")       || AUTOUI_CONFIG.DEFAULT_API;
  const dashboardUrl = dashboardInput.value.trim().replace(/\/$/, "") || AUTOUI_CONFIG.DASHBOARD_URL;
  const userToken    = tokenInput.value.trim();

  chrome.storage.local.set({ apiBase, dashboardUrl, userToken }, () => {
    showStatus("Settings saved!", "ok");
  });
});

document.getElementById("btn-test").addEventListener("click", async () => {
  const apiBase = apiInput.value.trim().replace(/\/$/, "") || AUTOUI_CONFIG.DEFAULT_API;
  showStatus("Testing connection...", "");
  try {
    const res = await fetch(`${apiBase}/api/v1/health`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      showStatus(`Connected! Service: ${data.service}`, "ok");
    } else {
      showStatus(`Server returned ${res.status}`, "err");
    }
  } catch (e) {
    showStatus(`Cannot reach server: ${e.message}`, "err");
  }
});

document.getElementById("btn-reset").addEventListener("click", () => {
  apiInput.value       = AUTOUI_CONFIG.DEFAULT_API;
  dashboardInput.value = AUTOUI_CONFIG.DASHBOARD_URL;
  tokenInput.value     = "";
  showStatus("Reset to defaults", "ok");
});

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className   = type || "";
  if (type) setTimeout(() => { statusEl.className = ""; statusEl.textContent = ""; }, 4000);
}
