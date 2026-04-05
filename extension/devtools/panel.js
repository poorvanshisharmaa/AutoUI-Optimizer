const statusEl = document.getElementById("status");
const vitalsEl = document.getElementById("vitals");
const suggestionsEl = document.getElementById("suggestions-wrap");

function rate(name, value) {
  const t = { LCP: [2.5,4], CLS: [0.1,0.25], INP: [200,500], TTFB: [0.8,1.8] };
  const [good, poor] = t[name] || [1,2];
  if (value <= good) return "good";
  if (value <= poor) return "warn";
  return "poor";
}

function fmt(name, v) {
  if (v == null) return "—";
  if (name === "CLS") return v.toFixed(3);
  if (name === "INP") return `${v}ms`;
  return `${v}s`;
}

function renderVitals(metrics) {
  const items = ["LCP","CLS","INP","TTFB"];
  vitalsEl.innerHTML = items.map(name => `
    <div class="card">
      <div class="label">${name}</div>
      <div class="value ${rate(name, metrics[name])}">${fmt(name, metrics[name])}</div>
    </div>
  `).join("");
}

function renderSuggestions(suggestions) {
  if (!suggestions.length) {
    suggestionsEl.innerHTML = '<p style="color:#94a3b8;font-size:13px;margin-bottom:16px">No issues found.</p>';
    return;
  }
  suggestionsEl.innerHTML = `
    <h3 style="font-size:14px;color:#94a3b8;text-transform:uppercase;margin-bottom:10px">
      ${suggestions.length} Suggestions
    </h3>
    ${suggestions.slice(0,8).map(s => `
      <div class="suggestion">
        <strong>${s.issue}</strong>
        <span>${s.fix}</span>
      </div>
    `).join("")}
  `;
}

async function loadData() {
  statusEl.textContent = "Loading...";

  // Ask content script for session ID
  chrome.devtools.inspectedWindow.eval(
    `window.__autoui_session_id || null`,
    async (sessionId) => {
      if (!sessionId) {
        statusEl.textContent = "No session found — browse a page with the extension active.";
        return;
      }

      const { apiBase } = await chrome.storage.local.get("apiBase");
      const base = apiBase || "https://autoui-optimizer.onrender.com";

      try {
        const res = await fetch(`${base}/api/v1/suggestions/${sessionId}`);
        const data = await res.json();
        statusEl.textContent = `Session: ${sessionId.slice(0,8)}...`;
        renderVitals({});
        renderSuggestions(data.suggestions || []);
      } catch (e) {
        statusEl.textContent = `Error: ${e.message}`;
      }
    }
  );
}

document.getElementById("btn-refresh").addEventListener("click", loadData);
loadData();
