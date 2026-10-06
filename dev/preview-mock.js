/*
 * Preview-only chrome.* mock.
 *
 * Loaded by the generated dev/preview.html so the real popup.js can run in a
 * normal browser tab (no extension APIs available there). It mirrors the
 * background worker's message handlers with in-memory sample data.
 */
(function () {
  const seed = [
    {
      id: "p_demo1",
      name: "US East — SOCKS5",
      scheme: "socks5",
      host: "203.0.113.10",
      port: 1080,
      username: "",
      password: "",
      bypassList: ["localhost", "127.0.0.1"],
    },
    {
      id: "p_demo2",
      name: "EU HTTP (auth)",
      scheme: "http",
      host: "proxy.eu.example.com",
      port: 8080,
      username: "demo",
      password: "secret",
      bypassList: ["localhost", "127.0.0.1", "*.internal"],
    },
    {
      id: "p_demo3",
      name: "Local Tor",
      scheme: "socks5",
      host: "127.0.0.1",
      port: 9050,
      username: "",
      password: "",
      bypassList: ["localhost", "127.0.0.1"],
    },
  ];

  let state = {
    profiles: seed,
    activeId: "p_demo1",
    enabled: true,
    settings: { autoConnect: false, showBadge: true },
  };
  let lastError = "";

  const active = () => state.profiles.find((p) => p.id === state.activeId) || null;

  const handlers = {
    getState: () => ({ ok: true, state, active: active(), lastError }),
    setEnabled: ({ value }) => {
      state.enabled = !!value;
      return { ok: true, state, active: active(), lastError };
    },
    selectProfile: ({ id, enable = true }) => {
      state.activeId = id;
      if (enable) state.enabled = true;
      return { ok: true, state, active: active(), lastError };
    },
    saveProfile: ({ profile }) => {
      const clean = Object.assign({}, profile);
      if (!clean.id) clean.id = "p_" + Math.random().toString(36).slice(2, 8);
      clean.port = Number(clean.port) || 8080;
      clean.bypassList = String(clean.bypassList || "")
        .split(/\s*,\s*/)
        .filter(Boolean);
      const i = state.profiles.findIndex((p) => p.id === clean.id);
      if (i >= 0) state.profiles[i] = clean;
      else state.profiles.push(clean);
      if (!state.activeId) state.activeId = clean.id;
      return { ok: true, state, active: active() };
    },
    deleteProfile: ({ id }) => {
      state.profiles = state.profiles.filter((p) => p.id !== id);
      if (state.activeId === id)
        state.activeId = state.profiles[0] ? state.profiles[0].id : null;
      return { ok: true, state, active: active() };
    },
    updateSettings: ({ settings }) => {
      state.settings = Object.assign({}, state.settings, settings);
      return { ok: true, state, active: active() };
    },
    testConnection: () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              ip: state.enabled ? "203.0.113.10" : "198.51.100.7",
              ms: 42,
            }),
          650
        )
      ),
  };

  window.chrome = {
    runtime: {
      id: "preview",
      getManifest: () => ({ version: "1.1.0" }),
      sendMessage: (msg) => {
        const fn = handlers[msg.type];
        return Promise.resolve(
          fn ? fn(msg.payload || {}) : { ok: false, error: "unknown message: " + msg.type }
        );
      },
    },
  };

  // Popups cannot show native confirm(); auto-confirm deletes so the preview works.
  window.confirm = () => true;
})();
