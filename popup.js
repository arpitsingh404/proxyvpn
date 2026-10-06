/* ProxyVPN — popup controller. All proxy state lives in the background worker. */

const $ = (id) => document.getElementById(id);

const el = {
  subtitle: $("subtitle"),
  settingsBtn: $("settingsBtn"),
  hero: $("hero"),
  pill: $("statePill"),
  stateText: $("stateText"),
  toggle: $("enableToggle"),
  heroName: $("heroName"),
  heroAddr: $("heroAddr"),
  exitIp: $("exitIp"),
  checkIp: $("checkIpBtn"),
  latency: $("latency"),
  profilesPanel: $("profilesPanel"),
  newBtn: $("newProfileBtn"),
  search: $("searchInput"),
  list: $("profileList"),
  empty: $("emptyState"),
  form: $("profileForm"),
  formTitle: $("formTitle"),
  cancelBtn: $("cancelFormBtn"),
  formError: $("formError"),
  settingsPanel: $("settingsPanel"),
  closeSettings: $("closeSettingsBtn"),
  setAutoConnect: $("setAutoConnect"),
  setShowBadge: $("setShowBadge"),
  version: $("version"),
  toast: $("toast"),
  togglePw: $("togglePw"),
  f: {
    id: $("f_id"),
    name: $("f_name"),
    scheme: $("f_scheme"),
    port: $("f_port"),
    host: $("f_host"),
    user: $("f_user"),
    pass: $("f_pass"),
    bypass: $("f_bypass"),
  },
};

let current = { profiles: [], activeId: null, enabled: false, settings: {} };
let lastError = "";
let query = "";
let pendingDelete = null;
let pendingTimer = null;

/* ------------------------------------------------------------------ */

async function send(type, payload = {}) {
  const res = await chrome.runtime.sendMessage({ type, payload });
  if (!res) throw new Error("Background worker did not respond");
  if (!res.ok) throw new Error(res.error || "Operation failed");
  return res;
}

const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);

const activeProfile = () => current.profiles.find((p) => p.id === current.activeId) || null;

function toast(msg, kind = "") {
  el.toast.textContent = msg;
  el.toast.className = "toast show " + kind;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.toast.className = "toast " + kind;
  }, 2400);
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

function render(res) {
  if (res && res.state) current = res.state;
  if (res && typeof res.lastError === "string") lastError = res.lastError;
  if (!current.settings) current.settings = {};

  const active = activeProfile();
  const on = !!current.enabled;

  /* header subtitle + pill */
  el.toggle.checked = on;
  el.hero.classList.toggle("on", on && !!active);

  if (on && active) {
    el.subtitle.textContent = `Connected · ${active.name}`;
    el.subtitle.className = "on";
    el.pill.className = "pill on";
    el.stateText.textContent = "Connected";
  } else if (on) {
    el.subtitle.textContent = "No profile selected";
    el.subtitle.className = "err";
    el.pill.className = "pill err";
    el.stateText.textContent = "No profile";
  } else if (lastError) {
    el.subtitle.textContent = "Proxy error";
    el.subtitle.className = "err";
    el.pill.className = "pill err";
    el.stateText.textContent = "Error";
  } else {
    el.subtitle.textContent = "Direct connection";
    el.subtitle.className = "";
    el.pill.className = "pill";
    el.stateText.textContent = "Direct";
  }

  /* hero body */
  if (active) {
    el.heroName.textContent = active.name;
    el.heroAddr.textContent = `${active.scheme}://${active.host}:${active.port}`;
  } else {
    el.heroName.textContent = "No proxy selected";
    el.heroAddr.textContent = "Add a profile to begin";
  }

  /* list */
  renderList();

  /* settings */
  el.setAutoConnect.checked = !!current.settings.autoConnect;
  el.setShowBadge.checked = current.settings.showBadge !== false;
}

function renderList() {
  const q = query.trim().toLowerCase();
  const items = current.profiles.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.host.toLowerCase().includes(q) ||
      p.scheme.toLowerCase().includes(q)
  );

  el.list.innerHTML = "";
  el.empty.classList.toggle("hidden", current.profiles.length > 0);

  if (!current.profiles.length || !items.length) {
    el.list.classList.add("hidden");
    if (current.profiles.length && !items.length) {
      el.empty.classList.remove("hidden");
      el.empty.querySelector(".empty-title").textContent = "No matches";
      el.empty.querySelector(".empty-sub").textContent = "Try a different search term.";
    } else {
      el.empty.querySelector(".empty-title").textContent = "No proxy profiles yet";
      el.empty.querySelector(".empty-sub").textContent =
        "Add an HTTP or SOCKS proxy to get started.";
    }
    return;
  }

  el.list.classList.remove("hidden");

  for (const p of items) {
    const isActive = p.id === current.activeId && current.enabled;
    const li = document.createElement("li");
    li.className = "profile" + (p.id === current.activeId ? " active" : "");
    li.dataset.id = p.id;
    li.title = isActive ? "Disconnect" : "Connect with this profile";

    const letter = (p.name.match(/[a-z0-9]/i) || [p.scheme[0]])[0];

    li.innerHTML = `
      <span class="avatar" data-scheme="${escapeHtml(p.scheme)}">${escapeHtml(letter)}</span>
      <div class="meta">
        <div class="row1">
          <span class="name">${escapeHtml(p.name)}</span>
          <span class="badge">${escapeHtml(p.scheme)}</span>
          ${
            p.username
              ? `<span class="lock" title="Uses authentication"><svg viewBox="0 0 24 24" width="11" height="11"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>`
              : ""
          }
        </div>
        <div class="addr mono">${escapeHtml(p.host)}:${escapeHtml(String(p.port))}</div>
      </div>
      <div class="actions">
        ${
          pendingDelete === p.id
            ? `<button class="btn tiny danger" data-act="confirm-delete">Delete</button>
               <button class="icon-btn" data-act="cancel-delete" title="Cancel" aria-label="Cancel">
                 <svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
               </button>`
            : `${
                isActive
                  ? `<span class="check" title="Active"><svg viewBox="0 0 24 24" width="12" height="12"><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span>`
                  : ""
              }
               <button class="icon-btn" data-act="edit" title="Edit" aria-label="Edit">
                 <svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
               </button>
               <button class="icon-btn danger" data-act="delete" title="Delete" aria-label="Delete">
                 <svg viewBox="0 0 24 24" width="14" height="14"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>
               </button>`
        }
      </div>`;
    el.list.appendChild(li);
  }
}

async function refresh() {
  try {
    render(await send("getState"));
  } catch (err) {
    el.subtitle.textContent = err.message;
    el.subtitle.className = "err";
  }
}

/* ------------------------------------------------------------------ *
 * Form
 * ------------------------------------------------------------------ */

function openForm(profile) {
  el.profilesPanel.classList.add("hidden");
  el.settingsPanel.classList.add("hidden");
  el.form.classList.remove("hidden");
  el.formError.textContent = "";
  el.formTitle.textContent = profile ? "Edit profile" : "New profile";

  el.f.id.value = profile?.id || "";
  el.f.name.value = profile?.name || "";
  el.f.scheme.value = profile?.scheme || "http";
  el.f.port.value = profile?.port ?? "";
  el.f.host.value = profile?.host || "";
  el.f.user.value = profile?.username || "";
  el.f.pass.value = profile?.password || "";
  el.f.bypass.value = (profile?.bypassList || []).join(", ");
  el.f.pass.type = "password";

  el.f.name.focus();
}

function closeForm() {
  el.form.classList.add("hidden");
  el.form.reset();
  el.formError.textContent = "";
  el.profilesPanel.classList.remove("hidden");
}

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

el.toggle.addEventListener("change", async () => {
  try {
    if (el.toggle.checked && !current.profiles.length) {
      el.toggle.checked = false;
      toast("Add a profile first", "err");
      openForm(null);
      return;
    }
    render(await send("setEnabled", { value: el.toggle.checked }));
  } catch (err) {
    await refresh();
    toast(err.message, "err");
  }
});

el.newBtn.addEventListener("click", () => openForm(null));
el.cancelBtn.addEventListener("click", closeForm);

el.search.addEventListener("input", () => {
  query = el.search.value;
  renderList();
});

el.list.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-act]");
  const li = e.target.closest("li");
  if (!li) return;
  const id = li.dataset.id;
  const profile = current.profiles.find((p) => p.id === id);
  if (!profile) return;

  if (btn) {
    const act = btn.dataset.act;
    if (act === "edit") {
      openForm(profile);
    } else if (act === "delete") {
      // Two-step delete (native confirm() is unreliable inside a popup).
      pendingDelete = id;
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        pendingDelete = null;
        renderList();
      }, 4000);
      renderList();
    } else if (act === "cancel-delete") {
      pendingDelete = null;
      clearTimeout(pendingTimer);
      renderList();
    } else if (act === "confirm-delete") {
      pendingDelete = null;
      clearTimeout(pendingTimer);
      try {
        render(await send("deleteProfile", { id }));
        toast("Profile deleted");
      } catch (err) {
        toast(err.message, "err");
      }
    }
    return;
  }

  if (pendingDelete === id) {
    pendingDelete = null;
    clearTimeout(pendingTimer);
    renderList();
    return;
  }

  // Card click = connect / disconnect
  const isActive = profile.id === current.activeId && current.enabled;
  try {
    if (isActive) {
      render(await send("setEnabled", { value: false }));
      toast("Disconnected");
    } else {
      render(await send("selectProfile", { id, enable: true }));
      toast(`Connected · ${profile.name}`, "ok");
    }
  } catch (err) {
    await refresh();
    toast(err.message, "err");
  }
});

el.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  el.formError.textContent = "";

  const profile = {
    id: el.f.id.value || undefined,
    name: el.f.name.value,
    scheme: el.f.scheme.value,
    host: el.f.host.value,
    port: el.f.port.value,
    username: el.f.user.value,
    password: el.f.pass.value,
    bypassList: el.f.bypass.value,
  };

  if (!profile.host.trim()) {
    el.formError.textContent = "Host is required";
    return;
  }
  const port = Number.parseInt(profile.port, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    el.formError.textContent = "Port must be 1–65535";
    return;
  }

  try {
    render(await send("saveProfile", { profile }));
    closeForm();
    toast("Profile saved", "ok");
  } catch (err) {
    el.formError.textContent = err.message;
  }
});

el.togglePw.addEventListener("click", () => {
  el.f.pass.type = el.f.pass.type === "password" ? "text" : "password";
});

el.checkIp.addEventListener("click", async () => {
  el.checkIp.disabled = true;
  el.checkIp.classList.add("spin");
  el.exitIp.textContent = "…";
  el.exitIp.className = "metric-value mono";
  el.latency.textContent = "…";
  el.latency.className = "metric-value mono";
  try {
    const res = await send("testConnection");
    if (res.ip) {
      el.exitIp.textContent = res.ip;
      el.exitIp.className = "metric-value mono ok";
      el.latency.textContent = `${res.ms} ms`;
      el.latency.className = "metric-value mono ok";
    } else {
      el.exitIp.textContent = "failed";
      el.exitIp.className = "metric-value mono err";
      el.latency.textContent = "—";
      el.latency.className = "metric-value mono";
      toast("Connection failed", "err");
    }
  } catch (err) {
    el.exitIp.textContent = "failed";
    el.exitIp.className = "metric-value mono err";
  } finally {
    el.checkIp.disabled = false;
    el.checkIp.classList.remove("spin");
  }
});

el.settingsBtn.addEventListener("click", () => {
  const showing = !el.settingsPanel.classList.contains("hidden");
  el.settingsPanel.classList.toggle("hidden", showing);
  el.profilesPanel.classList.toggle("hidden", !showing);
  el.form.classList.add("hidden");
});

el.closeSettings.addEventListener("click", () => {
  el.settingsPanel.classList.add("hidden");
  el.profilesPanel.classList.remove("hidden");
});

async function pushSettings() {
  try {
    render(
      await send("updateSettings", {
        settings: {
          autoConnect: el.setAutoConnect.checked,
          showBadge: el.setShowBadge.checked,
        },
      })
    );
  } catch (err) {
    toast(err.message, "err");
  }
}

el.setAutoConnect.addEventListener("change", pushSettings);
el.setShowBadge.addEventListener("change", pushSettings);

/* ------------------------------------------------------------------ */

try {
  el.version.textContent = "v" + chrome.runtime.getManifest().version;
} catch (_) {
  /* noop */
}

refresh();
