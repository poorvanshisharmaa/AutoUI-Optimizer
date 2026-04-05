// popup.js — depends on config.js being loaded first via popup.html

const app = document.getElementById("app");

function rateMetric(name, value) {
  const thresholds = {
    LCP:  { good: 2.5,  poor: 4.0 },
    CLS:  { good: 0.1,  poor: 0.25 },
    INP:  { good: 200,  poor: 500 },
    TTFB: { good: 0.8,  poor: 1.8 },
  };
  const t = thresholds[name];
  if (!t || value === undefined || value === null) return "good";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function formatValue(name, value) {
  if (value === undefined || value === null) return "—";
  if (name === "CLS") return value.toFixed(3);
  if (name === "INP") return `${value}ms`;
  return `${value}s`;
}

function calcScore(metrics) {
  const weights = { LCP: 0.25, CLS: 0.15, INP: 0.3, TTFB: 0.1, loadTime: 0.2 };
  const normalized = {
    LCP:      metrics.LCP      ? Math.max(0, 1 - metrics.LCP / 4)      : 0.5,
    CLS:      metrics.CLS      ? Math.max(0, 1 - metrics.CLS / 0.25)   : 0.5,
    INP:      metrics.INP      ? Math.max(0, 1 - metrics.INP / 500)     : 0.5,
    TTFB:     metrics.TTFB     ? Math.max(0, 1 - metrics.TTFB / 2)      : 0.5,
    loadTime: metrics.loadTime ? Math.max(0, 1 - metrics.loadTime / 5)  : 0.5,
  };
  let score = 0;
  for (const [k, w] of Object.entries(weights)) score += (normalized[k] ?? 0.5) * w;
  return Math.round(score * 100);
}

function renderMetrics(metrics, suggestions, sessionId) {
  const score = calcScore(metrics);
  const scoreColor = score >= 80 ? "good" : score >= 50 ? "needs-improvement" : "poor";

  const metricItems = [
    { name: "LCP",  label: "Largest CP" },
    { name: "CLS",  label: "Layout Shift" },
    { name: "INP",  label: "Interaction" },
    { name: "TTFB", label: "Time to Byte" },
  ];

  const suggestionHTML = suggestions.length
    ? suggestions.slice(0, 3).map((s) => `
        <li class="suggestion-item">
          ${s.issue}
          <div><span class="impact">+${Math.round(s.impact_score * 100)}% impact</span></div>
        </li>`).join("")
    : '<li style="color:#94a3b8;font-size:12px;padding:8px 0">No critical issues found!</li>';

  app.innerHTML = `
    <div class="score-ring">
      <div class="score-number ${scoreColor}">${score}</div>
      <div class="score-label">Performance Score</div>
    </div>

    <div class="section">
      <h2>Core Web Vitals</h2>
      <div class="metric-grid">
        ${metricItems.map(({ name, label }) => `
          <div class="metric-card">
            <div class="label">${label}</div>
            <div class="value ${rateMetric(name, metrics[name])}">${formatValue(name, metrics[name])}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="section">
      <h2>Top Issues</h2>
      <ul class="suggestions-list">${suggestionHTML}</ul>
    </div>

    <div class="footer">
      <button class="btn btn-primary" id="btn-analyze">Analyze with AI</button>
      <button class="btn btn-secondary" id="btn-dashboard">Open Dashboard</button>
      <button class="btn btn-settings" id="btn-settings">Settings</button>
    </div>
    ${sessionId ? `<div class="session-id">Session: ${sessionId}</div>` : ""}
  `;

  document.getElementById("btn-analyze").addEventListener("click", () => triggerAnalysis(sessionId));
  document.getElementById("btn-dashboard").addEventListener("click", openDashboard);
  document.getElementById("btn-settings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
}

async function openDashboard() {
  const { dashboardUrl } = await chrome.storage.local.get("dashboardUrl");
  chrome.tabs.create({ url: dashboardUrl || AUTOUI_CONFIG.DASHBOARD_URL });
}

async function triggerAnalysis(sessionId) {
  const btn = document.getElementById("btn-analyze");
  btn.textContent = "Analyzing...";
  btn.disabled = true;

  if (!sessionId) {
    btn.textContent = "No session yet";
    btn.disabled = false;
    return;
  }

  chrome.runtime.sendMessage(
    { type: "TRIGGER_ANALYZE", sessionId },
    (response) => {
      if (response?.success) {
        btn.textContent = "Done — Open Dashboard";
        btn.disabled = false;
        btn.addEventListener("click", openDashboard, { once: true });
      } else {
        btn.textContent = "Retry Analysis";
        btn.disabled = false;
      }
    }
  );
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    app.innerHTML = '<div class="loading">No active tab.</div>';
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "GET_METRICS" }, async (response) => {
    if (chrome.runtime.lastError || !response) {
      app.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          Waiting for page data...<br>
          <small style="margin-top:8px;display:block;color:#4c4c7a">Try refreshing the page</small>
        </div>`;
      return;
    }

    const { metrics } = response;
    const { latestSession } = await chrome.storage.local.get("latestSession");
    const sessionId = latestSession?.sessionId;

    let suggestions = [];
    if (sessionId) {
      try {
        const { apiBase } = await chrome.storage.local.get("apiBase");
        const base = (apiBase || AUTOUI_CONFIG.DEFAULT_API).replace(/\/$/, "");
        const res = await fetch(`${base}/api/v1/suggestions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          suggestions = data.suggestions || [];
        }
      } catch (_) {}
    }

    renderMetrics(metrics.metrics || {}, suggestions, sessionId);
  });
}

init();
