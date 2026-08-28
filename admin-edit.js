/* ==========================================================================
   Arbitara — sign-in, in-page admin editing, and audience-gated content.

   Any arbitara-demo account can sign in here (the lock icon in the nav).
   What that unlocks depends on role:
     - role "admin": in-page editing — toggle sections on/off, reorder them,
       edit text/images in place, manage audience-gated content — saved
       through admin-api/worker.js's /config, /gated-admin.
     - any other role: nothing to edit, but GET /gated-content is fetched
       and swapped into any [data-arb-gated="<key>"] element the account is
       authorized to see (see admin-api/worker.js's header comment for the
       full authorization model — gated content never lives in config.json,
       since that file is public).

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
    /* reorder + image-upload buttons in the section toolbar */
    ".arb-sec-toolbar .reorder{display:flex;flex-direction:column;}" +
    ".arb-sec-toolbar .reorder button{display:flex;align-items:center;justify-content:center;width:16px;height:13px;padding:0;border:none;background:none;color:var(--faint);cursor:pointer;}" +
    ".arb-sec-toolbar .reorder button svg{width:11px;height:11px;}" +
    ".arb-sec-toolbar .reorder button:hover:not(:disabled){color:var(--ink);}" +
    ".arb-sec-toolbar .reorder button:disabled{opacity:.25;cursor:default;}" +
    ".arb-img-btn{position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:7px;color:var(--faint);cursor:pointer;}" +
    ".arb-img-btn:hover{color:var(--ink);background:var(--paper-2);}" +
    ".arb-img-btn svg{width:15px;height:15px;}" +
    ".arb-img-btn.arb-img-busy{opacity:.4;pointer-events:none;}" +
    ".arb-img-btn input{position:absolute;inset:0;opacity:0;cursor:pointer;}" +
    /* gated-content manager modal */
    ".arb-gated-modal{position:fixed;inset:0;z-index:400;background:rgba(20,18,14,.55);display:flex;align-items:center;justify-content:center;padding:24px;}" +
    ".arb-gated-panel{width:100%;max-width:640px;max-height:86vh;overflow:auto;background:var(--card);border-radius:16px;box-shadow:var(--shadow);padding:24px;font-family:var(--sans);}" +
    ".arb-gated-panel h4{margin:0 0 8px;font-size:16px;font-weight:700;color:var(--ink);}" +
    ".arb-gated-panel h5{margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);}" +
    ".arb-gated-note{font-size:12.5px;line-height:1.5;color:var(--muted);margin:0 0 14px;}" +
    ".arb-gated-note code{background:var(--paper-2);padding:1px 5px;border-radius:4px;}" +
    ".arb-gated-section{margin-bottom:18px;}" +
    ".arb-gated-row{border:1px solid var(--line-2);border-radius:10px;padding:12px;margin-bottom:10px;position:relative;}" +
    ".arb-gated-row .row-selects{display:flex;gap:8px;margin-bottom:8px;}" +
    ".arb-gated-row .row-selects>*{flex:1;min-width:0;box-sizing:border-box;font-family:var(--sans);font-size:13px;color:var(--ink);background:var(--paper-2);border:1px solid var(--line-2);border-radius:8px;padding:7px 10px;}" +
    ".arb-gated-row .row-html{width:100%;box-sizing:border-box;min-height:70px;font-family:ui-monospace,monospace;font-size:12.5px;color:var(--ink);background:var(--paper-2);border:1px solid var(--line-2);border-radius:8px;padding:8px 10px;margin-bottom:8px;resize:vertical;}" +
    ".blk-auds{display:flex;flex-wrap:wrap;gap:10px;align-items:center;}" +
    ".blk-aud-opt{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:var(--muted);}" +
    ".row-role-all-label{font-weight:700;color:var(--ink);padding-right:10px;border-right:1px solid var(--line-2);}" +
    ".arb-gated-rm{position:absolute;top:10px;right:10px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:none;background:none;color:var(--faint);cursor:pointer;flex:none;}" +
    ".arb-gated-rm:hover{color:var(--danger);}" +
    ".arb-gated-rm svg{width:13px;height:13px;}" +
    ".arb-gated-add{font-family:var(--sans);font-size:12.5px;font-weight:600;color:var(--accent-ink);background:none;border:1px dashed var(--line-2);border-radius:8px;padding:7px 12px;cursor:pointer;}" +
    ".arb-gated-msg{font-size:12.5px;color:var(--danger);min-height:1em;margin:10px 0;}" +
    ".arb-gated-actions{display:flex;justify-content:flex-end;gap:10px;}" +
    ".arb-gated-cancel{font-family:var(--sans);font-size:13px;color:var(--muted);background:none;border:1px solid var(--line-2);border-radius:9px;padding:8px 16px;cursor:pointer;}" +
    ".arb-gated-save{font-family:var(--sans);font-size:13px;font-weight:700;color:var(--paper);background:var(--ink);border:none;border-radius:9px;padding:8px 16px;cursor:pointer;}" +
    "@media(max-width:700px){.arb-edit-bar{left:12px;right:12px;transform:none;flex-wrap:wrap;bottom:12px;}}";
  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  var ICON_USER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"/></svg>';
  var ICON_DRAG = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>';
  var ICON_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
  var ICON_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  var ICON_IMG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 15l-5-5-9 9"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  // ---------- login popover ----------
  function mountLoginButton() {
    var tools = document.querySelector(".nav-tools");
    if (!tools) return;
    var wrap = document.createElement("div");
    wrap.style.position = "relative";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "arb-admin-btn";
    btn.setAttribute("aria-label", "Sign in");
    btn.innerHTML = ls(TOK) ? ICON_USER : ICON_LOCK;
    wrap.appendChild(btn);
    tools.insertBefore(wrap, tools.firstChild);

    var pop = null;
    function closePop() { if (pop) { pop.remove(); pop = null; } }

    function renderLoggedIn() {
      var isAdminRole = ls(ROLE) === "admin";
      pop = document.createElement("div");
      pop.className = "arb-admin-pop";
      pop.innerHTML =
        '<div class="arb-admin-who">' + ICON_USER.replace("currentColor", "var(--accent-ink)") +
        '<span>Signed in as <b>' + esc(ls(NAME)) + '</b> (' + esc(ls(ROLE)) + ')<br><a id="arbSignOut">Sign out</a></span></div>' +
        (isAdminRole
          ? '<button type="button" id="arbToggleEdit" style="margin-top:14px">' + (editMode ? "Exit edit mode" : "Edit this page") + "</button>" +
            '<button type="button" id="arbManageGated" style="margin-top:8px;background:var(--card);color:var(--ink);border:1px solid var(--line-2);">Manage gated content</button>'
          : "");
      wrap.appendChild(pop);
      pop.querySelector("#arbSignOut").addEventListener("click", function () {
        setLs(TOK, ""); setLs(NAME, ""); setLs(ROLE, "");
        setEditMode(false);
        btn.innerHTML = ICON_LOCK;
        closePop();
      });
      if (isAdminRole) {
        pop.querySelector("#arbToggleEdit").addEventListener("click", function () {
          setEditMode(!editMode);
          closePop();
        });
        pop.querySelector("#arbManageGated").addEventListener("click", function () {
          closePop();
          openGatedManager();
        });
      }
    }

    function renderLoginForm() {
      pop = document.createElement("div");
      pop.className = "arb-admin-pop";
      pop.innerHTML =
        '<h4>Sign in</h4>' +
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
            applyGatedContent();
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
  var pending = { sections: {}, sectionText: {}, sectionOrder: null, hero: {}, content: {} };
  var bar = null;

  function isDirty() {
    return !!(Object.keys(pending.sections).length || Object.keys(pending.sectionText).length ||
      pending.sectionOrder || Object.keys(pending.hero).length || Object.keys(pending.content).length);
  }

  function markDirty() {
    if (!bar) return;
    var dirty = isDirty();
    bar.querySelector(".save-btn").disabled = !dirty;
    bar.querySelector(".status").textContent = dirty ? "Unsaved changes" : "No changes";
  }

  function watchEditable(el, onChange) {
    el.setAttribute("contenteditable", "true");
    el.addEventListener("input", onChange);
  }

  // Reusable "upload an image" control: a small button that opens a file
  // picker, sends the file to the existing /upload endpoint (same contract
  // the old /admin panel's image uploader used — id + contentType +
  // contentBase64 in, {path} out), and hands the resulting path to onDone.
  // id must match [a-zA-Z0-9_-]{1,64} server-side; "hero" and each section's
  // own id are what the old admin panel used, so reuse those — a re-upload
  // just overwrites the same uploads/<id>.<ext> file.
  var MAX_IMAGE_BYTES = 4 * 1024 * 1024;
  var IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
  function mountImageUpload(host, id, title, onDone) {
    var btn = document.createElement("label");
    btn.className = "arb-img-btn";
    btn.title = title || "Upload image";
    btn.innerHTML = ICON_IMG;
    var input = document.createElement("input");
    input.type = "file";
    input.accept = IMAGE_TYPES.join(",");
    btn.appendChild(input);
    host.appendChild(btn);
    input.addEventListener("change", function () {
      var file = input.files[0];
      input.value = "";
      if (!file) return;
      if (IMAGE_TYPES.indexOf(file.type) < 0) { alert("Unsupported file type."); return; }
      if (file.size > MAX_IMAGE_BYTES) { alert("Image is over 4MB."); return; }
      var reader = new FileReader();
      reader.onload = function () {
        btn.classList.add("arb-img-busy");
        api("/upload", { method: "POST", body: { id: id, contentType: file.type, contentBase64: reader.result } })
          .then(function (d) {
            btn.classList.remove("arb-img-busy");
            onDone(d.path, reader.result);
          })
          .catch(function (err) {
            btn.classList.remove("arb-img-busy");
            alert("Upload failed: " + (err.message || "unknown error"));
          });
      };
      reader.readAsDataURL(file);
    });
    return btn;
  }

  function setupSectionText(sec, id) {
    var head = sec.querySelector(".head");
    if (!head) return;
    var eb = head.querySelector(".eyebrow"), h2 = head.querySelector("h2"), p = head.querySelector("p:not(.eyebrow)");
    if (eb) watchEditable(eb, function () { (pending.sectionText[id] = pending.sectionText[id] || {}).eyebrow = eb.textContent.trim(); markDirty(); });
    if (h2) watchEditable(h2, function () { (pending.sectionText[id] = pending.sectionText[id] || {}).title = h2.textContent.trim(); markDirty(); });
    if (p) watchEditable(p, function () { (pending.sectionText[id] = pending.sectionText[id] || {}).intro = p.innerHTML.trim(); markDirty(); });
  }

  // Shows the uploaded image immediately (from the just-read data URL, same
  // "don't wait on GitHub" trick the old admin panel used) by creating the
  // same .head-figure/img structure config.js's applySectionImages builds,
  // so the change is visible without a save+reload round-trip.
  function setSectionImagePreview(sec, head, dataUrl) {
    var fig = sec.querySelector(".head-figure");
    if (!dataUrl) { if (fig) fig.remove(); return; }
    if (!fig) {
      fig = document.createElement("figure");
      fig.className = "head-figure reveal in";
      head.parentNode.insertBefore(fig, head.nextSibling);
    }
    var img = fig.querySelector("img");
    if (!img) { img = document.createElement("img"); img.alt = ""; fig.appendChild(img); }
    img.setAttribute("src", dataUrl);
  }

  function setupHeroText() {
    var hero = document.getElementById("hero");
    if (!hero) return;
    var eb = hero.querySelector(".eyebrow"), h1 = hero.querySelector("h1");
    // Two separate paragraphs both carry class "lede" (a shared visual
    // style), so scope this to the FIRST one specifically — the second is
    // .hero-thesis, wired below as its own field.
    var lede = hero.querySelector("p.lede:not(.hero-thesis)");
    if (eb) watchEditable(eb, function () { pending.hero.eyebrow = eb.textContent.trim(); markDirty(); });
    if (h1) watchEditable(h1, function () { pending.hero.headline = h1.innerHTML.trim(); markDirty(); });
    if (lede) watchEditable(lede, function () { pending.hero.lede = lede.innerHTML.trim(); markDirty(); });
    var thesis = hero.querySelector(".hero-thesis");
    if (thesis) watchEditable(thesis, function () { pending.hero.thesis = thesis.innerHTML.trim(); markDirty(); });
    var etym = hero.querySelector(".hero-etym");
    if (etym) watchEditable(etym, function () { pending.hero.etym = etym.innerHTML.trim(); markDirty(); });
    var ctas = hero.querySelectorAll(".hero-cta .cta-label");
    if (ctas[0]) watchEditable(ctas[0], function () { pending.hero.ctaPrimary = ctas[0].textContent.trim(); markDirty(); });
    if (ctas[1]) watchEditable(ctas[1], function () { pending.hero.ctaSecondary = ctas[1].textContent.trim(); markDirty(); });
  }

  // The 4 hero stats are a list, not independent fields (config.hero.stats
  // fully replaces the array on save — see applyHeroStats in config.js), so
  // any single number/label/source edit re-collects all 4 into pending.
  function setupHeroStats() {
    var stats = document.querySelectorAll(".hero .stats .stat");
    if (!stats.length) return;
    function collect() {
      pending.hero.stats = [].map.call(stats, function (s) {
        var n = s.querySelector(".n"), l = s.querySelector(".l"), src = s.querySelector(".src");
        return { n: n ? n.textContent.trim() : "", l: l ? l.textContent.trim() : "", src: src ? src.textContent.trim() : "" };
      });
      markDirty();
    }
    [].forEach.call(stats, function (s) {
      ["n", "l", "src"].forEach(function (cls) {
        var el = s.querySelector("." + cls);
        if (el) watchEditable(el, collect);
      });
    });
  }

  // The hero can't be hidden or reordered, so its toolbar carries just the
  // photo uploader (config.hero.image / applyHeroImage in config.js).
  function setupHeroToolbar() {
    var hero = document.getElementById("hero");
    if (!hero) return;
    var bar = document.createElement("div");
    bar.className = "arb-sec-toolbar";
    hero.appendChild(bar);
    mountImageUpload(bar, "hero", "Upload hero photo", function (path, dataUrl) {
      pending.hero.image = path;
      hero.classList.add("hero-photo");
      var host = document.getElementById("heroBg");
      if (host) {
        var img = host.querySelector("img");
        if (!img) { img = document.createElement("img"); img.alt = ""; host.appendChild(img); }
        img.setAttribute("src", dataUrl);
      }
      markDirty();
    });
  }

  var dragSrc = null;
  var toolbars = []; // {sec, upBtn, downBtn} — for enabling/disabling reorder buttons at the ends
  function refreshReorderButtons() {
    toolbars.forEach(function (t, i) {
      t.upBtn.disabled = i === 0;
      t.downBtn.disabled = i === toolbars.length - 1;
    });
  }

  function moveSection(sec, dir) {
    var main = sec.parentNode;
    var sibling = dir < 0 ? sec.previousElementSibling : sec.nextElementSibling;
    if (!sibling) return;
    if (dir < 0) main.insertBefore(sec, sibling); else main.insertBefore(sibling, sec);
    pending.sectionOrder = [].slice.call(main.children).map(function (s) { return s.id; }).filter(Boolean);
    // Keep the toolbars array's order in sync so refreshReorderButtons()
    // disables the right ends after the swap.
    toolbars.sort(function (a, b) {
      return [].slice.call(main.children).indexOf(a.sec) - [].slice.call(main.children).indexOf(b.sec);
    });
    refreshReorderButtons();
    markDirty();
  }

  function setupToolbar(sec, id) {
    var bar = document.createElement("div");
    bar.className = "arb-sec-toolbar";
    bar.innerHTML =
      '<span class="drag" draggable="true" title="Drag to reorder">' + ICON_DRAG + "</span>" +
      '<span class="reorder"><button type="button" class="up" title="Move up">' + ICON_UP + '</button>' +
      '<button type="button" class="down" title="Move down">' + ICON_DOWN + "</button></span>" +
      '<label class="sw" title="Show this section on the page"><input type="checkbox" checked><span class="track"></span></label>';
    sec.appendChild(bar);

    var head = sec.querySelector(".head");
    if (head) {
      mountImageUpload(bar, id, "Upload illustration", function (path, dataUrl) {
        (pending.sectionText[id] = pending.sectionText[id] || {}).image = path;
        setSectionImagePreview(sec, head, dataUrl);
        markDirty();
      });
    }

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

    var upBtn = bar.querySelector(".up"), downBtn = bar.querySelector(".down");
    upBtn.addEventListener("click", function () { moveSection(sec, -1); });
    downBtn.addEventListener("click", function () { moveSection(sec, 1); });
    toolbars.push({ sec: sec, upBtn: upBtn, downBtn: downBtn });

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
      toolbars.sort(function (a, b) {
        return [].slice.call(main.children).indexOf(a.sec) - [].slice.call(main.children).indexOf(b.sec);
      });
      refreshReorderButtons();
      markDirty();
    });
  }

  // Any element anywhere on the page can opt into inline editing by adding
  // data-arb-edit="<unique key>" — no per-field wiring code needed here.
  // Saved into config.content[key] (see applyContentOverrides in config.js).
  function setupGenericEditable() {
    [].forEach.call(document.querySelectorAll("[data-arb-edit]"), function (el) {
      var key = el.getAttribute("data-arb-edit");
      watchEditable(el, function () { pending.content[key] = el.innerHTML.trim(); markDirty(); });
    });
  }

  function enterEditMode() {
    document.documentElement.classList.add("arb-editing");
    toolbars = [];
    setupHeroText();
    setupHeroStats();
    setupHeroToolbar();
    [].forEach.call(document.querySelectorAll("main > section[id]"), function (sec) {
      if (sec.id === "hero") return;
      setupSectionText(sec, sec.id);
      setupToolbar(sec, sec.id);
    });
    setupGenericEditable();
    refreshReorderButtons();
    mountEditBar();
  }

  function exitEditMode() {
    document.documentElement.classList.remove("arb-editing");
    if (bar) { bar.remove(); bar = null; }
    // A full reload is the simplest way to cleanly drop all the
    // contenteditable/toolbar DOM surgery above rather than trying to
    // surgically undo it.
    if (isDirty()) {
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
      if (Object.keys(pending.content).length) cfg.content = Object.assign({}, cfg.content, pending.content);
      return api("/config", { method: "PUT", body: { config: cfg, sha: d.sha } });
    }).then(function () {
      pending = { sections: {}, sectionText: {}, sectionOrder: null, hero: {}, content: {} };
      status.textContent = "Saved ✓";
      setTimeout(function () { markDirty(); }, 1800);
    }).catch(function (err) {
      status.textContent = "Save failed: " + (err.message || "unknown error");
      saveBtn.disabled = false;
    });
  }

  // ---------- audience-gated content ----------
  // Any signed-in account (any role) can be authorized for gated blocks —
  // see admin-api/worker.js's GET /gated-content for the server-side
  // filtering logic. Swaps authorized blocks' HTML into every matching
  // [data-arb-gated="<key>"] element (querySelectorAll, not just the
  // first — the same block can populate more than one spot on a page,
  // e.g. a nav link that also needs to show in the footer); unauthorized/
  // unmentioned keys just keep whatever public teaser is already in the
  // page's static HTML.
  function applyGatedContent() {
    if (!ls(TOK)) return;
    api("/gated-content").then(function (d) {
      var blocks = d.blocks || {};
      var pages = d.pages || {};
      Object.keys(blocks).forEach(function (key) {
        [].forEach.call(document.querySelectorAll('[data-arb-gated="' + key + '"]'), function (el) {
          el.innerHTML = blocks[key];
        });
      });
      // Lets page-specific scripts (e.g. investor.js's deck carousel and
      // whole-page content gate) know it's worth (re)trying their own
      // gated logic now — carries the raw blocks/pages so a listener can
      // check what it's authorized for without a second fetch.
      document.dispatchEvent(new CustomEvent("arb:gated-applied", { detail: { blocks: blocks, pages: pages } }));
    }).catch(function (err) {
      // A 401 means the stored token is no longer valid (expired/revoked) —
      // drop it so the nav button reflects "signed out" on next interaction.
      if (err.status === 401) { setLs(TOK, ""); setLs(NAME, ""); setLs(ROLE, ""); }
    });
  }

  // ---------- gated-content manager (admin only) ----------
  // Access is granted by the caller's arbitara-demo role, not an admin-
  // curated username list — keep this list in sync with ROLES in
  // demo-api/worker.js if that list ever changes. "admin" isn't offered
  // as a checkbox since an admin session already sees everything
  // unconditionally (see resolveGatedAccess() server-side).
  var GATED_ROLES = [
    { id: "investor", label: "Investor" },
    { id: "governance", label: "Governance" },
    { id: "developer", label: "Developer" },
    { id: "user", label: "User" },
  ];
  // Every page that can carry a gated rule, and every known section within
  // it — so admin builds a rule as Page → Section (or "All", the whole
  // page) → Roles, three dropdowns, instead of typing a key blind. Keep
  // this in sync with KNOWN_PAGES in admin-api/worker.js and the real
  // .html files. A page with no `sections` entries yet still works — its
  // Section dropdown just only offers "All (whole page)". "other" is the
  // escape hatch for a one-off spot not listed here, or a key created
  // before this dropdown existed (e.g. from testing) — its own key is
  // freeform text.
  var GATED_PAGES = [
    { id: "index", label: "Main", sections: [] },
    { id: "white-paper", label: "White paper", sections: [] },
    { id: "self-check", label: "Self-check", sections: [] },
    { id: "investor", label: "Investors", sections: [
      { key: "investor.opportunity", label: "Opportunity" },
      { key: "investor.competitive", label: "Competitive landscape" },
      { key: "investor.businessModel", label: "Business model" },
      { key: "investor.pathTo100m", label: "Path to $100M" },
      { key: "investor.goToMarket", label: "Go-to-market" },
      { key: "investor.ask", label: "The ask" },
      { key: "investor.deck", label: "Deck access (controls the PDF carousel — the content field below is unused for this one)" },
    ] },
    { id: "other", label: "Other (custom)", sections: null },
  ];
  function gatedPage(id) { return GATED_PAGES.filter(function (p) { return p.id === id; })[0] || GATED_PAGES[GATED_PAGES.length - 1]; }
  // Where a known block key lives, for loading existing data back into the
  // Page/Section shape — {pageId, sectionKey}, or null if it's not in the
  // catalog (falls back to the "Other (custom)" page with this as its key).
  function gatedLocate(key) {
    var found = null;
    GATED_PAGES.forEach(function (p) {
      (p.sections || []).forEach(function (s) { if (s.key === key) found = { pageId: p.id, sectionKey: key }; });
    });
    return found;
  }

  var blockUidSeq = 0;
  function nextBlockUid() { return "b" + (++blockUidSeq) + Date.now().toString(36); }

  // Reads the manager panel's current DOM state back into a working array
  // of rows — called before every add/remove so in-progress edits survive
  // a re-render, and again on Save. Each row carries a client-only `uid`
  // so removal/lookup is unambiguous regardless of render order. A row
  // with sectionKey === "" is a whole-page rule (saves to doc.pages); any
  // other row saves to doc.blocks under its key (either the chosen
  // section, or customKey when pageId is "other").
  function collectGatedWorking(panel, deckMeta) {
    var rowsArr = [].map.call(panel.querySelectorAll(".arb-gated-row"), function (row) {
      return {
        uid: row.getAttribute("data-uid"),
        pageId: row.querySelector(".row-page").value,
        sectionKey: row.querySelector(".row-section") ? row.querySelector(".row-section").value : "",
        customKey: row.querySelector(".row-custom-key") ? row.querySelector(".row-custom-key").value.trim() : "",
        html: row.querySelector(".row-html").value,
        roles: [].map.call(row.querySelectorAll(".row-role:checked"), function (cb) { return cb.value; }),
      };
    });
    // deckMeta doesn't live in the DOM (the upload button has no form
    // field for it) — threaded through explicitly so add/remove re-renders
    // don't lose track of "a deck is already uploaded".
    return { rowsArr: rowsArr, deckMeta: deckMeta };
  }

  function rowsArrToDoc(rowsArr) {
    var pages = {}, blocks = {};
    rowsArr.forEach(function (r) {
      var key = r.pageId === "other" ? r.customKey : r.sectionKey;
      if (!key) { if (r.pageId !== "other") pages[r.pageId] = { roles: r.roles }; return; }
      blocks[key] = { html: r.html, roles: r.roles };
    });
    return { pages: pages, blocks: blocks };
  }

  function formatBytes(n) {
    if (!n) return "0 B";
    var units = ["B", "KB", "MB", "GB"], i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return n.toFixed(i ? 1 : 0) + " " + units[i];
  }
  function deckStatusText(meta) {
    if (!meta || !meta.size) return "No deck uploaded yet.";
    var when = meta.uploadedAt ? new Date(meta.uploadedAt).toLocaleDateString() : "";
    return "Current deck: " + formatBytes(meta.size) + (when ? " · uploaded " + when : "");
  }

  var gatedModal = null;
  function closeGatedModal() { if (gatedModal) { gatedModal.remove(); gatedModal = null; } }

  function gatedRowHtml(r) {
    var page = gatedPage(r.pageId);
    var pageOptions = GATED_PAGES.map(function (p) {
      return '<option value="' + esc(p.id) + '"' + (p.id === r.pageId ? " selected" : "") + ">" + esc(p.label) + "</option>";
    }).join("");
    var sectionControl;
    if (page.sections === null) {
      sectionControl = '<input class="row-custom-key" type="text" placeholder="custom key, e.g. somepage.section" value="' + esc(r.customKey) + '">';
    } else {
      var sectionOptions = '<option value=""' + (r.sectionKey ? "" : " selected") + '>All (whole page)</option>' +
        page.sections.map(function (s) {
          return '<option value="' + esc(s.key) + '"' + (s.key === r.sectionKey ? " selected" : "") + ">" + esc(s.label) + "</option>";
        }).join("");
      sectionControl = '<select class="row-section">' + sectionOptions + "</select>";
    }
    var allChecked = GATED_ROLES.every(function (role) { return r.roles.indexOf(role.id) >= 0; });
    var roleChecks = '<label class="blk-aud-opt row-role-all-label"><input type="checkbox" class="row-role-all"' + (allChecked ? " checked" : "") + ">All</label>" +
      GATED_ROLES.map(function (role) {
        var checked = r.roles.indexOf(role.id) >= 0 ? "checked" : "";
        return '<label class="blk-aud-opt"><input type="checkbox" class="row-role" value="' + esc(role.id) + '" ' + checked + ">" + esc(role.label) + "</label>";
      }).join("");
    var isWholePage = page.sections !== null && !r.sectionKey;
    return '<div class="arb-gated-row" data-uid="' + esc(r.uid) + '">' +
      '<div class="row-selects"><select class="row-page">' + pageOptions + "</select>" + sectionControl + "</div>" +
      '<textarea class="row-html" placeholder="HTML shown to authorized viewers"' + (isWholePage ? ' style="display:none"' : "") + ">" + esc(r.html) + "</textarea>" +
      '<div class="blk-auds row-roles">' + roleChecks + "</div>" +
      '<button type="button" class="arb-gated-rm" title="Remove rule">' + ICON_X + "</button></div>";
  }

  function renderGatedManager(working) {
    var panel = document.createElement("div");
    panel.className = "arb-gated-panel";
    gatedModal.innerHTML = "";
    gatedModal.appendChild(panel);
    var deckMeta = working.deckMeta;

    var rowsHtml = working.rowsArr.map(gatedRowHtml).join("") || '<p class="arb-gated-note">No rules yet.</p>';

    panel.innerHTML =
      "<h4>Manage gated content</h4>" +
      '<p class="arb-gated-note">Each row is a rule: pick a page, then either "All" (the whole page, no content — just who can open it) or one of its sections (with the content shown there), then which roles can see it. An admin account always sees everything, regardless of these checkboxes. "Other (custom)" is only for a one-off spot not listed here.</p>' +
      '<div class="arb-gated-section"><h5>Investor deck (PDF)</h5>' +
      '<p class="arb-gated-note" id="arbDeckStatus">' + esc(deckStatusText(deckMeta)) + '</p>' +
      '<p class="arb-gated-note">Uploads immediately — no separate save. Who can view it is controlled the same way as any rule below: pick page "Investors" → section "Deck access" → the roles that should see it.</p>' +
      '<label class="arb-gated-add" style="display:inline-block;cursor:pointer;">Upload / replace deck (PDF, max 20MB)' +
      '<input type="file" accept="application/pdf" id="arbDeckFile" style="display:none"></label></div>' +
      '<div class="arb-gated-section"><h5>Access rules</h5><div class="arb-gated-block-list">' + rowsHtml + "</div>" +
      '<button type="button" class="arb-gated-add" id="arbAddBlock">+ Add rule</button></div>' +
      '<div class="arb-gated-msg" id="arbGatedMsg"></div>' +
      '<div class="arb-gated-actions"><button type="button" class="arb-gated-cancel" id="arbGatedCancel">Cancel</button>' +
      '<button type="button" class="arb-gated-save" id="arbGatedSave">Save</button></div>';

    panel.querySelector("#arbDeckFile").addEventListener("change", function (e) {
      var file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      if (file.type !== "application/pdf") { alert("Please upload a PDF file."); return; }
      if (file.size > 20 * 1024 * 1024) { alert("PDF is over 20MB."); return; }
      var statusEl = panel.querySelector("#arbDeckStatus");
      statusEl.textContent = "Uploading…";
      var reader = new FileReader();
      reader.onload = function () {
        api("/gated-deck", { method: "POST", body: { contentBase64: reader.result } })
          .then(function (d) { deckMeta = d; statusEl.textContent = deckStatusText(d); })
          .catch(function (err) { statusEl.textContent = "Upload failed: " + (err.message || "unknown error"); });
      };
      reader.readAsDataURL(file);
    });

    [].forEach.call(panel.querySelectorAll(".arb-gated-row .arb-gated-rm"), function (btn) {
      btn.addEventListener("click", function () {
        var uid = btn.closest(".arb-gated-row").getAttribute("data-uid");
        var w = collectGatedWorking(panel, deckMeta);
        w.rowsArr = w.rowsArr.filter(function (r) { return r.uid !== uid; });
        renderGatedManager(w);
      });
    });

    // Page dropdown changed: the section control's shape depends on the
    // page (a real <select> of that page's sections, or a free-text key
    // for "Other"), so re-collect + swap that one row's pageId + re-render
    // — simplest way to rebuild the right control without duplicating
    // gatedRowHtml's branching here too.
    [].forEach.call(panel.querySelectorAll(".row-page"), function (sel) {
      var row = sel.closest(".arb-gated-row");
      sel.addEventListener("change", function () {
        var w = collectGatedWorking(panel, deckMeta);
        var uid = row.getAttribute("data-uid");
        w.rowsArr = w.rowsArr.map(function (r) {
          if (r.uid !== uid) return r;
          return Object.assign({}, r, { pageId: sel.value, sectionKey: "", customKey: "" });
        });
        renderGatedManager(w);
      });
    });

    // Section dropdown changed: just toggle the content textarea for this
    // one row (hidden for "All (whole page)" rows, since those are pure
    // access rules with no content) — no full re-render needed.
    [].forEach.call(panel.querySelectorAll(".row-section"), function (sel) {
      var row = sel.closest(".arb-gated-row");
      var textarea = row.querySelector(".row-html");
      sel.addEventListener("change", function () {
        textarea.style.display = sel.value ? "" : "none";
      });
    });

    // "All" role checkbox is sugar for checking every individual role, and
    // reflects (on render) whether they already all happen to be checked.
    [].forEach.call(panel.querySelectorAll(".row-role-all"), function (allBox) {
      var row = allBox.closest(".arb-gated-row");
      var roleBoxes = [].slice.call(row.querySelectorAll(".row-role"));
      allBox.addEventListener("change", function () {
        roleBoxes.forEach(function (cb) { cb.checked = allBox.checked; });
      });
      roleBoxes.forEach(function (cb) {
        cb.addEventListener("change", function () {
          allBox.checked = roleBoxes.every(function (b) { return b.checked; });
        });
      });
    });

    panel.querySelector("#arbAddBlock").addEventListener("click", function () {
      var w = collectGatedWorking(panel, deckMeta);
      w.rowsArr.push({ uid: nextBlockUid(), pageId: GATED_PAGES[0].id, sectionKey: "", customKey: "", html: "", roles: [] });
      renderGatedManager(w);
    });

    panel.querySelector("#arbGatedCancel").addEventListener("click", closeGatedModal);
    panel.querySelector("#arbGatedSave").addEventListener("click", function () {
      var w = collectGatedWorking(panel, deckMeta);
      var msg = panel.querySelector("#arbGatedMsg");
      msg.style.color = "var(--danger)";
      msg.textContent = "Saving…";
      api("/gated-admin", { method: "PUT", body: { doc: rowsArrToDoc(w.rowsArr) } })
        .then(function () {
          msg.style.color = "var(--muted)";
          msg.textContent = "Saved.";
          applyGatedContent();
          setTimeout(closeGatedModal, 700);
        })
        .catch(function (err) { msg.textContent = "Save failed: " + (err.message || "unknown error"); });
    });
  }

  function openGatedManager() {
    if (gatedModal) return;
    gatedModal = document.createElement("div");
    gatedModal.className = "arb-gated-modal";
    gatedModal.innerHTML = '<div class="arb-gated-panel"><h4>Manage gated content</h4><p class="arb-gated-note">Loading…</p></div>';
    document.body.appendChild(gatedModal);
    gatedModal.addEventListener("click", function (e) { if (e.target === gatedModal) closeGatedModal(); });
    api("/gated-admin").then(function (d) {
      var doc = d.doc || { pages: {}, blocks: {} };
      var rowsArr = [];
      Object.keys(doc.pages || {}).forEach(function (pageId) {
        rowsArr.push({ uid: nextBlockUid(), pageId: pageId, sectionKey: "", customKey: "", html: "", roles: (doc.pages[pageId] || {}).roles || [] });
      });
      Object.keys(doc.blocks || {}).forEach(function (key) {
        var b = doc.blocks[key] || {};
        var loc = gatedLocate(key);
        rowsArr.push(loc
          ? { uid: nextBlockUid(), pageId: loc.pageId, sectionKey: loc.sectionKey, customKey: "", html: b.html || "", roles: b.roles || [] }
          : { uid: nextBlockUid(), pageId: "other", sectionKey: "", customKey: key, html: b.html || "", roles: b.roles || [] });
      });
      renderGatedManager({ rowsArr: rowsArr, deckMeta: d.deckMeta || null });
    }).catch(function (err) {
      gatedModal.querySelector(".arb-gated-panel").innerHTML =
        "<h4>Manage gated content</h4><p class=\"arb-gated-note\">Failed to load: " + esc(err.message || "error") + "</p>";
    });
  }

  function boot() {
    mountLoginButton();
    applyGatedContent();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
