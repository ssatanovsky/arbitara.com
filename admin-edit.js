/* ==========================================================================
   Arbitara — in-page admin editing.

   Lets someone logged in with an arbitara-demo account (role "admin") edit
   this page's content directly, instead of through the separate /admin
   panel: toggle sections on/off, drag-reorder them, and edit each section's
   eyebrow/title/intro text (plus the hero's) in place. Saves go through
   admin-api/worker.js's existing GET/PUT /config, authenticated with the
   bearer token POST /demo-login hands back — see that Worker's header
   comment for the cross-Worker trust model.

   Entirely inert for every other visitor: nothing here runs until someone
   opens the login popover and authenticates.
   ========================================================================== */
(function () {
  "use strict";

  var ADMIN_API = "https://arbitara-admin.slava-satanovsky.workers.dev";
  var TOK = "arb.admin.token", NAME = "arb.admin.name", ROLE = "arb.admin.role";

  function ls(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function setLs(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    var token = ls(TOK);
    if (token) headers["Authorization"] = "Bearer " + token;
    return fetch(ADMIN_API + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) { var e = new Error((d && d.error) || "Request failed"); e.status = r.status; throw e; }
        return d;
      });
    });
  }

  // ---------- styles ----------
  var css =
    ".arb-admin-btn{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;border:1px solid var(--line-2);background:var(--card);color:var(--muted);cursor:pointer;}" +
    ".arb-admin-btn:hover{color:var(--ink);border-color:var(--accent);}" +
    ".arb-admin-btn svg{width:17px;height:17px;}" +
    ".arb-admin-pop{position:absolute;top:52px;right:0;z-index:220;width:260px;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:18px;font-family:var(--sans);}" +
    ".arb-admin-pop h4{margin:0 0 12px;font-size:13px;font-weight:700;color:var(--ink);}" +
    ".arb-admin-pop input{width:100%;box-sizing:border-box;font-family:var(--sans);font-size:14px;color:var(--ink);background:var(--paper-2);border:1px solid var(--line-2);border-radius:9px;padding:9px 11px;margin-bottom:8px;}" +
    ".arb-admin-pop button{width:100%;font-family:var(--sans);font-size:14px;font-weight:600;color:var(--paper);background:var(--ink);border:none;border-radius:9px;padding:9px;cursor:pointer;}" +
    ".arb-admin-pop .arb-admin-msg{font-size:12.5px;color:var(--danger);margin-top:8px;min-height:1em;}" +
    ".arb-admin-who{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);}" +
    ".arb-admin-who b{color:var(--ink);}" +
    ".arb-admin-who a{font-size:12px;color:var(--faint);text-decoration:underline;cursor:pointer;}" +
    /* fixed edit-mode control bar */
    ".arb-edit-bar{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:300;display:flex;align-items:center;gap:12px;background:#191712;color:#F2ECE0;border-radius:999px;padding:9px 10px 9px 18px;box-shadow:0 12px 32px -8px rgba(0,0,0,.5);font-family:var(--sans);font-size:13.5px;}" +
    ".arb-edit-bar .sw{position:relative;display:inline-flex;align-items:center;gap:8px;cursor:pointer;user-select:none;}" +
    ".arb-edit-bar .sw input{position:absolute;opacity:0;width:0;height:0;}" +
    ".arb-edit-bar .sw .track{width:34px;height:19px;border-radius:999px;background:rgba(255,255,255,.2);position:relative;transition:background .15s;}" +
    ".arb-edit-bar .sw .track::after{content:'';position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:999px;background:#fff;transition:transform .15s;}" +
    ".arb-edit-bar .sw input:checked + .track{background:#CBA343;}" +
    ".arb-edit-bar .sw input:checked + .track::after{transform:translateX(15px);}" +
    ".arb-edit-bar .save-btn{font-family:var(--sans);font-size:13px;font-weight:700;color:#191712;background:#E4C97A;border:none;border-radius:999px;padding:8px 16px;cursor:pointer;}" +
    ".arb-edit-bar .save-btn:disabled{opacity:.4;cursor:default;}" +
    ".arb-edit-bar .status{font-size:12px;color:rgba(242,236,224,.65);}" +
    /* per-section edit chrome */
    ".arb-editing [contenteditable='true']{outline:1.5px dashed color-mix(in srgb, var(--accent) 55%, transparent);outline-offset:4px;border-radius:4px;cursor:text;}" +
    ".arb-editing [contenteditable='true']:focus{outline-style:solid;outline-color:var(--accent);}" +
    ".arb-sec-toolbar{position:absolute;top:10px;right:10px;z-index:5;display:flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:5px 8px;box-shadow:var(--shadow-sm);font-family:var(--sans);}" +
    ".arb-sec-toolbar .drag{cursor:grab;color:var(--faint);display:flex;}" +
    ".arb-sec-toolbar .drag svg{width:15px;height:15px;}" +
    ".arb-sec-toolbar .sw .track{width:28px;height:16px;}" +
    ".arb-sec-toolbar .sw .track::after{width:12px;height:12px;}" +
    ".arb-sec-toolbar .sw input:checked + .track::after{transform:translateX(12px);}" +
    ".arb-editing main > section{position:relative;}" +
    ".arb-editing main > section.arb-sec-off{opacity:.4;}" +
    ".arb-editing main > section.arb-sec-drag-over{box-shadow:inset 0 3px 0 var(--accent);}" +
    "@media(max-width:700px){.arb-edit-bar{left:12px;right:12px;transform:none;flex-wrap:wrap;bottom:12px;}}";
  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  var ICON_USER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"/></svg>';
  var ICON_DRAG = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>';

  // ---------- login popover ----------
  function mountLoginButton() {
    var tools = document.querySelector(".nav-tools");
    if (!tools) return;
    var wrap = document.createElement("div");
    wrap.style.position = "relative";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "arb-admin-btn";
    btn.setAttribute("aria-label", "Admin sign in");
    btn.innerHTML = ls(TOK) ? ICON_USER : ICON_LOCK;
    wrap.appendChild(btn);
    tools.insertBefore(wrap, tools.firstChild);

    var pop = null;
    function closePop() { if (pop) { pop.remove(); pop = null; } }

    function renderLoggedIn() {
      pop = document.createElement("div");
      pop.className = "arb-admin-pop";
      pop.innerHTML =
        '<div class="arb-admin-who">' + ICON_USER.replace("currentColor", "var(--accent-ink)") +
        '<span>Signed in as <b>' + esc(ls(NAME)) + '</b> (' + esc(ls(ROLE)) + ')<br><a id="arbSignOut">Sign out</a></span></div>' +
        '<button type="button" id="arbToggleEdit" style="margin-top:14px">' + (editMode ? "Exit edit mode" : "Edit this page") + "</button>";
      wrap.appendChild(pop);
      pop.querySelector("#arbSignOut").addEventListener("click", function () {
        setLs(TOK, ""); setLs(NAME, ""); setLs(ROLE, "");
        setEditMode(false);
        btn.innerHTML = ICON_LOCK;
        closePop();
      });
      pop.querySelector("#arbToggleEdit").addEventListener("click", function () {
        setEditMode(!editMode);
        closePop();
      });
    }

    function renderLoginForm() {
      pop = document.createElement("div");
      pop.className = "arb-admin-pop";
      pop.innerHTML =
        '<h4>Admin sign in</h4>' +
        '<input type="text" id="arbUser" placeholder="Username (leave blank for the admin password)" autocomplete="username">' +
        '<input type="password" id="arbPass" placeholder="Password" autocomplete="current-password">' +
        '<button type="button" id="arbLoginBtn">Sign in</button>' +
        '<div class="arb-admin-msg" id="arbLoginMsg"></div>';
      wrap.appendChild(pop);
      var msg = pop.querySelector("#arbLoginMsg");
      var doLogin = function () {
        var username = pop.querySelector("#arbUser").value.trim();
        var password = pop.querySelector("#arbPass").value;
        if (!password) { msg.textContent = "Enter a password."; return; }
        msg.textContent = "Signing in…";
        // Leaving username blank is the account system's break-glass
        // bootstrap login (password only) — send a body with no username
        // key at all, not an empty string, since that's what it checks for.
        var loginBody = username ? { username: username, password: password } : { password: password };
        api("/demo-login", { method: "POST", body: loginBody })
          .then(function (d) {
            setLs(TOK, d.token); setLs(NAME, d.name); setLs(ROLE, d.role);
            btn.innerHTML = ICON_USER;
            closePop();
          })
          .catch(function (err) { msg.textContent = err.message || "Sign in failed."; });
      };
      pop.querySelector("#arbLoginBtn").addEventListener("click", doLogin);
      pop.querySelector("#arbPass").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (pop) { closePop(); return; }
      if (ls(TOK)) renderLoggedIn(); else renderLoginForm();
    });
    document.addEventListener("click", function (e) {
      if (pop && !wrap.contains(e.target)) closePop();
    });
  }

  // ---------- edit mode ----------
  var editMode = false;
  var pending = { sections: {}, sectionText: {}, sectionOrder: null, hero: {} };
  var bar = null;

  function markDirty() {
    if (!bar) return;
    var dirty = Object.keys(pending.sections).length || Object.keys(pending.sectionText).length ||
      pending.sectionOrder || Object.keys(pending.hero).length;
    bar.querySelector(".save-btn").disabled = !dirty;
    bar.querySelector(".status").textContent = dirty ? "Unsaved changes" : "No changes";
  }

  function watchEditable(el, onChange) {
    el.setAttribute("contenteditable", "true");
    el.addEventListener("input", onChange);
  }

  function setupSectionText(sec, id) {
    var head = sec.querySelector(".head");
    if (!head) return;
    var eb = head.querySelector(".eyebrow"), h2 = head.querySelector("h2"), p = head.querySelector("p:not(.eyebrow)");
    if (eb) watchEditable(eb, function () { (pending.sectionText[id] = pending.sectionText[id] || {}).eyebrow = eb.textContent.trim(); markDirty(); });
    if (h2) watchEditable(h2, function () { (pending.sectionText[id] = pending.sectionText[id] || {}).title = h2.textContent.trim(); markDirty(); });
    if (p) watchEditable(p, function () { (pending.sectionText[id] = pending.sectionText[id] || {}).intro = p.innerHTML.trim(); markDirty(); });
  }

  function setupHeroText() {
    var hero = document.getElementById("hero");
    if (!hero) return;
    var eb = hero.querySelector(".eyebrow"), h1 = hero.querySelector("h1"), lede = hero.querySelector(".lede");
    if (eb) watchEditable(eb, function () { pending.hero.eyebrow = eb.textContent.trim(); markDirty(); });
    if (h1) watchEditable(h1, function () { pending.hero.headline = h1.innerHTML.trim(); markDirty(); });
    if (lede) watchEditable(lede, function () { pending.hero.lede = lede.innerHTML.trim(); markDirty(); });
  }

  var dragSrc = null;
  function setupToolbar(sec, id) {
    var bar = document.createElement("div");
    bar.className = "arb-sec-toolbar";
    bar.innerHTML =
      '<span class="drag" draggable="true" title="Drag to reorder">' + ICON_DRAG + "</span>" +
      '<label class="sw" title="Show this section on the page"><input type="checkbox" checked><span class="track"></span></label>';
    sec.appendChild(bar);

    var checkbox = bar.querySelector("input");
    // Reflects config.json's real current on/off state (the arb-hide-<id>
    // class config.js already applies), not just whatever's visible right
    // now — a hidden section still exists in the DOM, just CSS-hidden.
    checkbox.checked = !document.documentElement.classList.contains("arb-hide-" + id);
    sec.classList.toggle("arb-sec-off", !checkbox.checked);
    checkbox.addEventListener("change", function () {
      pending.sections[id] = checkbox.checked;
      sec.classList.toggle("arb-sec-off", !checkbox.checked);
      markDirty();
    });

    var drag = bar.querySelector(".drag");
    drag.addEventListener("dragstart", function (e) {
      dragSrc = sec;
      e.dataTransfer.effectAllowed = "move";
    });
    sec.addEventListener("dragover", function (e) {
      if (!dragSrc || dragSrc === sec) return;
      e.preventDefault();
      sec.classList.add("arb-sec-drag-over");
    });
    sec.addEventListener("dragleave", function () { sec.classList.remove("arb-sec-drag-over"); });
    sec.addEventListener("drop", function (e) {
      e.preventDefault();
      sec.classList.remove("arb-sec-drag-over");
      if (!dragSrc || dragSrc === sec) return;
      var main = sec.parentNode;
      var secs = [].slice.call(main.children);
      if (secs.indexOf(dragSrc) < secs.indexOf(sec)) main.insertBefore(dragSrc, sec.nextSibling);
      else main.insertBefore(dragSrc, sec);
      dragSrc = null;
      pending.sectionOrder = [].slice.call(main.children)
        .map(function (s) { return s.id; })
        .filter(Boolean);
      markDirty();
    });
  }

  function enterEditMode() {
    document.documentElement.classList.add("arb-editing");
    setupHeroText();
    [].forEach.call(document.querySelectorAll("main > section[id]"), function (sec) {
      if (sec.id === "hero") return;
      setupSectionText(sec, sec.id);
      setupToolbar(sec, sec.id);
    });
    mountEditBar();
  }

  function exitEditMode() {
    document.documentElement.classList.remove("arb-editing");
    if (bar) { bar.remove(); bar = null; }
    // A full reload is the simplest way to cleanly drop all the
    // contenteditable/toolbar DOM surgery above rather than trying to
    // surgically undo it.
    if (Object.keys(pending.sections).length || Object.keys(pending.sectionText).length || pending.sectionOrder || Object.keys(pending.hero).length) {
      if (confirm("Discard unsaved changes?")) location.reload();
      else { document.documentElement.classList.add("arb-editing"); editMode = true; return; }
    } else {
      location.reload();
    }
  }

  function setEditMode(on) {
    editMode = on;
    if (on) enterEditMode(); else exitEditMode();
  }

  function mountEditBar() {
    bar = document.createElement("div");
    bar.className = "arb-edit-bar";
    bar.innerHTML =
      '<span>Editing this page</span>' +
      '<button type="button" class="save-btn" disabled>Save</button>' +
      '<span class="status">No changes</span>';
    document.body.appendChild(bar);
    bar.querySelector(".save-btn").addEventListener("click", saveChanges);
  }

  function saveChanges() {
    var saveBtn = bar.querySelector(".save-btn");
    var status = bar.querySelector(".status");
    saveBtn.disabled = true;
    status.textContent = "Saving…";
    api("/config").then(function (d) {
      var cfg = d.config;
      cfg.sections = cfg.sections || {};
      Object.keys(pending.sections).forEach(function (id) { cfg.sections[id] = pending.sections[id]; });
      cfg.sectionText = cfg.sectionText || {};
      Object.keys(pending.sectionText).forEach(function (id) {
        cfg.sectionText[id] = Object.assign({}, cfg.sectionText[id], pending.sectionText[id]);
      });
      if (pending.sectionOrder) cfg.sectionOrder = pending.sectionOrder;
      if (Object.keys(pending.hero).length) cfg.hero = Object.assign({}, cfg.hero, pending.hero);
      return api("/config", { method: "PUT", body: { config: cfg, sha: d.sha } });
    }).then(function () {
      pending = { sections: {}, sectionText: {}, sectionOrder: null, hero: {} };
      status.textContent = "Saved ✓";
      setTimeout(function () { markDirty(); }, 1800);
    }).catch(function (err) {
      status.textContent = "Save failed: " + (err.message || "unknown error");
      saveBtn.disabled = false;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountLoginButton);
  else mountLoginButton();
})();
