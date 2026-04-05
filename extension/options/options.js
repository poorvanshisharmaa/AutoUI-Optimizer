const DEFAULT_API = "https://autoui-optimizer.onrender.com";

const apiInput   = document.getElementById("api-url");
const tokenInput = document.getElementById("user-token");
const statusEl   = document.getElementById("status");

// Load saved settings
chrome.storage.local.get(["apiBase", "userToken"], ({ apiBase, userToken }) => {
  apiInput.value   = apiBase   || DEFAULT_API;
  tokenInput.value = userToken || "";
});

document.getElementById("btn-save").addEventListener("click", () => {
  const apiBase   = apiInput.value.trim().replace(/\/$/, "") || DEFAULT_API;
  const userToken = tokenInput.value.trim();

  chrome.storage.local.set({ apiBase, userToken }, () => {
    showStatus("Settings saved!", "ok");
  });
});

document.getElementById("btn-test").addEventListener("click", async () => {
  const apiBase = apiInput.value.trim().replace(/\/$/, "") || DEFAULT_API;
  showStatus("Testing...", "");
  try {
    const res = await fetch(`${apiBase}/api/v1/health`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      showStatus("Connected successfully!", "ok");
    } else {
      showStatus(`Server returned ${res.status}`, "err");
    }
  } catch (e) {
    showStatus(`Cannot reach server: ${e.message}`, "err");
  }
});

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className   = type;
  if (type) setTimeout(() => { statusEl.className = ""; statusEl.textContent = ""; }, 4000);
}
