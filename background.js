/**
 * ProxyVPN — background service worker
 *
 * Owns all proxy state. The popup only sends messages; every proxy mutation
 * happens here so the badge, the applied configuration and the cached auth
 * credentials never drift apart.
 *
 * Storage shape (chrome.storage.local under STORAGE_KEY):
 *   {
 *     profiles: [{ id, name, scheme, host, port, username, password, bypassList }],
 *     activeId: string | null,
 *     enabled:  boolean,
 *     settings: { autoConnect: boolean, showBadge: boolean }
 *   }
 */

const STORAGE_KEY = "proxyVpnState";

const DEFAULT_BYPASS = ["localhost", "127.0.0.1", "::1", "<local>"];

const DEFAULT_SETTINGS = { autoConnect: false, showBadge: true };

const DEFAULT_STATE = {
  profiles: [],
  activeId: null,
  enabled: false,
  settings: { ...DEFAULT_SETTINGS },
};

/** In-memory mirror of storage so the auth handler (which must answer fast) stays sync. */
let state = structuredClone(DEFAULT_STATE);

/** Last proxy error reported by Chrome, surfaced in the popup. */
let lastError = "";

/* ------------------------------------------------------------------ *
 * State helpers
 * ------------------------------------------------------------------ */

async function loadState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  state = structuredClone(DEFAULT_STATE);
  Object.assign(state, stored[STORAGE_KEY] || {});
  state.settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };
  if (!Array.isArray(state.profiles)) state.profiles = [];
  // Repair a dangling activeId.
  if (state.activeId && !activeProfile()) {
    state.activeId = state.profiles[0]?.id ?? null;
  }
  return state;
}

async function saveState() {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function activeProfile() {
  return state.profiles.find((p) => p.id === state.activeId) || null;
}

function makeId() {
  return "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/* ------------------------------------------------------------------ *
 * Proxy configuration
 * ------------------------------------------------------------------ */

const SCHEMES = ["http", "https", "socks4", "socks5"];

function sanitizeProfile(input) {
  const scheme = SCHEMES.includes(input.scheme) ? input.scheme : "http";
  const port = Number.parseInt(input.port, 10);
  return {
    id: input.id || makeId(),
    name: String(input.name || "").trim() || "Unnamed proxy",
    scheme,
    host: String(input.host || "").trim(),
    port: Number.isFinite(port) && port > 0 && port <= 65535 ? port : 8080,
    username: String(input.username || ""),
    password: String(input.password || ""),
    bypassList: Array.isArray(input.bypassList)
      ? input.bypassList.map((s) => String(s).trim()).filter(Boolean)
      : String(input.bypassList || "")
          .split(/\s*[\n,]\s*/)
          .map((s) => s.trim())
          .filter(Boolean),
  };
}

function toProxyConfig(profile) {
  const bypass = profile.bypassList.length ? profile.bypassList : DEFAULT_BYPASS;
  return {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: profile.scheme,
        host: profile.host,
        port: profile.port,
      },
      bypassList: bypass,
    },
  };
}

function setProxySettings(value) {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.set({ value, scope: "regular" }, () => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve();
    });
  });
}

function setBadge(on) {
  const show = state.settings.showBadge;
  chrome.action.setBadgeText({ text: show && on ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ color: on ? "#10b981" : "#64748b" });
  chrome.action.setTitle({
    title: on && activeProfile() ? `ProxyVPN — ${activeProfile().name}` : "ProxyVPN — direct",
  });
}

/** Push current state to Chrome. Safe to call at any time. */
async function applyProxy() {
  const profile = activeProfile();

  if (!state.enabled || !profile || !profile.host) {
    await setProxySettings({ mode: "direct" });
    setBadge(false);
    return;
  }

  try {
    await setProxySettings(toProxyConfig(profile));
    lastError = "";
    setBadge(true);
  } catch (err) {
    lastError = err.message || String(err);
    setBadge(false);
    throw err;
  }
}

/* ------------------------------------------------------------------ *
 * Proxy errors (e.g. unreachable upstream)
 * ------------------------------------------------------------------ */

chrome.proxy.onProxyError.addListener((details) => {
  lastError = details?.error || "Proxy error";
  chrome.action.setBadgeText({ text: "!" });
  chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
});

/* ------------------------------------------------------------------ *
 * Proxy authentication (username / password proxies)
 * ------------------------------------------------------------------ */

chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (!state.enabled) {
      callback({});
      return;
    }
    const profile = activeProfile();
    if (profile && profile.username) {
      callback({
        authCredentials: {
          username: profile.username,
          password: profile.password || "",
        },
      });
    } else {
      // Let Chrome show its own auth prompt.
      callback({});
    }
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

/* ------------------------------------------------------------------ *
 * Messaging API used by the popup
 * ------------------------------------------------------------------ */

const handlers = {
  async getState() {
    return { ok: true, state, active: activeProfile(), lastError };
  },

  async setEnabled({ value }) {
    state.enabled = Boolean(value);
    await saveState();
    await applyProxy();
    return { ok: true, state, active: activeProfile(), lastError };
  },

  async selectProfile({ id, enable = true }) {
    if (!state.profiles.some((p) => p.id === id)) {
      return { ok: false, error: "Profile not found" };
    }
    state.activeId = id;
    if (enable) state.enabled = true;
    await saveState();
    await applyProxy();
    return { ok: true, state, active: activeProfile(), lastError };
  },

  async saveProfile({ profile }) {
    const clean = sanitizeProfile(profile);
    if (!clean.host) return { ok: false, error: "Host is required" };

    const idx = state.profiles.findIndex((p) => p.id === clean.id);
    if (idx >= 0) state.profiles[idx] = clean;
    else state.profiles.push(clean);

    if (!state.activeId) state.activeId = clean.id;
    await saveState();
    await applyProxy();
    return { ok: true, state, active: activeProfile() };
  },

  async deleteProfile({ id }) {
    state.profiles = state.profiles.filter((p) => p.id !== id);
    if (state.activeId === id) state.activeId = state.profiles[0]?.id ?? null;
    await saveState();
    await applyProxy();
    return { ok: true, state, active: activeProfile() };
  },

  async updateSettings({ settings }) {
    state.settings = { ...state.settings, ...settings };
    await saveState();
    setBadge(state.enabled);
    return { ok: true, state, active: activeProfile() };
  },

  async testConnection() {
    // A request through this extension is routed by Chrome's proxy settings,
    // so a plain fetch reflects the current egress IP / proxy path.
    const started = Date.now();
    try {
      const res = await fetch("https://api.ipify.org?format=json", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      return { ok: true, ip: data.ip, ms: Date.now() - started, lastError: "" };
    } catch (err) {
      return { ok: false, error: err.message || "Request failed" };
    }
  },
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handler = handlers[msg?.type];
  if (!handler) return false;

  Promise.resolve(handler(msg.payload || {}))
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));
  return true; // keep the channel open for the async response
});

/* ------------------------------------------------------------------ *
 * Lifecycle
 * ------------------------------------------------------------------ */

async function boot({ autoConnect = false } = {}) {
  await loadState();
  if (autoConnect && state.settings.autoConnect && state.activeId) {
    state.enabled = true;
    await saveState();
  }
  await applyProxy();
}

chrome.runtime.onInstalled.addListener(() => boot({ autoConnect: true }));
chrome.runtime.onStartup.addListener(() => boot({ autoConnect: true }));

// Keep the in-memory mirror fresh on every worker wake-up.
boot();
