/* ==========================================================================
   Arbitara — runtime content config.
   Loaded early (in <head>) so content toggles are applied BEFORE the page is
   revealed (the page is cloaked until this resolves). Reads /config.json, which
   is edited through the admin CMS. Fails open: if config is missing, show all.
   ========================================================================== */
(function () {
  "use strict";
  var docEl = document.documentElement;

  var DEFAULTS = {
    sections: { disappear: true, anatomy: true, process: true, tiers: true, bias: true, ai: true, object: true, principles: true, toolkit: true },
    gate: { enabled: true },
    tools: { checklist: true, diagnostic: true, record: true },
    banner: { enabled: false, text: "" },
    comingSoon: { enabled: false, heading: "Something is being built here.", text: "Arbitara is in stealth. Add your email and we'll be in touch." }
  };

  // Readiness promise consumed by app.js so the gate can respect config.
  var resolveReady;
  window.ARB_READY = new Promise(function (res) { resolveReady = res; });

  var BRAND_SVG = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#1C2340"/><path d="M20 6 L32 19 L8 19 Z" fill="#EFEAE0"/><path d="M20 10.6 L27.4 18 L12.6 18 Z" fill="#BE9A3B"/><path d="M8 21 L32 21 L20 34 Z" fill="#BE9A3B"/><path d="M12.6 22 L27.4 22 L20 29.4 Z" fill="#EFEAE0"/></svg>';

  function get(o, path, dflt) {
    try { return path.split(".").reduce(function (a, k) { return a[k]; }, o); }
    catch (e) { return dflt; }
  }

  function injectStyles() {
    if (document.getElementById("arb-cfg-styles")) return;
    var css =
      // section hides
      ".arb-hide-disappear #disappear,.arb-hide-anatomy #anatomy,.arb-hide-process #process," +
      ".arb-hide-tiers #tiers,.arb-hide-bias #bias,.arb-hide-ai #ai,.arb-hide-object #object," +
      ".arb-hide-principles #principles,.arb-hide-toolkit #toolkit{display:none!important;}" +
      // whole-tool hides (for everyone, members included)
      ".arb-hide-tool-checklist #checklist{display:none!important;}" +
      ".arb-hide-tool-diagnostic .diag{display:none!important;}" +
      ".arb-hide-tool-record #recordPromo,.arb-hide-tool-record .arb-record-li,.arb-hide-tool-record a[href^='decision-record']{display:none!important;}" +
      // announcement banner
      ".arb-banner{background:var(--slate);color:#EEF1F8;font-family:var(--sans);font-size:14.5px;" +
      "text-align:center;padding:11px 44px;position:relative;line-height:1.4;}" +
      ".arb-banner a{color:#fff;text-decoration:underline;}" +
      ".arb-banner .arb-banner-x{position:absolute;top:50%;right:12px;transform:translateY(-50%);" +
      "background:transparent;border:none;color:#C9D0E4;font-size:20px;line-height:1;cursor:pointer;padding:4px 8px;}" +
      ".arb-banner .arb-banner-x:hover{color:#fff;}" +
      // coming-soon holding screen
      ".arb-coming-soon body>*{display:none!important;}" +
      ".arb-coming-soon #arb-coming{display:flex!important;}" +
      "#arb-coming{display:none;position:fixed;inset:0;z-index:200;flex-direction:column;" +
      "align-items:center;justify-content:center;text-align:center;padding:32px;background:var(--paper);color:var(--ink);}" +
      "#arb-coming .cs-mark{width:72px;height:72px;margin-bottom:26px;}" +
      "#arb-coming .cs-mark svg{width:100%;height:100%;display:block;}" +
      "#arb-coming .eyebrow{justify-content:center;}" +
      "#arb-coming h1{font-family:var(--serif);font-size:clamp(30px,6vw,50px);line-height:1.08;letter-spacing:-.02em;margin:0 0 16px;max-width:16ch;}" +
      "#arb-coming p{font-size:clamp(16px,2.4vw,19px);color:var(--muted);max-width:46ch;margin:0 0 26px;}" +
      "#arb-coming .cs-form{display:flex;gap:10px;width:min(420px,100%);}" +
      "#arb-coming .cs-form input{flex:1;min-width:0;font-family:var(--sans);font-size:15px;color:var(--ink);" +
      "background:var(--card);border:1px solid var(--line-2);border-radius:11px;padding:13px 14px;}" +
      "#arb-coming .cs-form input:focus{outline:none;border-color:var(--accent);}" +
      "#arb-coming .cs-msg{font-size:13px;margin-top:14px;min-height:1em;color:var(--good);}" +
      "#arb-coming .cs-msg.err{color:var(--danger);}" +
      // password gate (whole-site)
      ".arb-pw-lock body>*{display:none!important;}" +
      ".arb-pw-lock #arb-pw{display:flex!important;}" +
      "#arb-pw{display:none;position:fixed;inset:0;z-index:210;flex-direction:column;" +
      "align-items:center;justify-content:center;text-align:center;padding:32px;background:var(--paper);color:var(--ink);}" +
      "#arb-pw .cs-mark{width:64px;height:64px;margin-bottom:24px;}" +
      "#arb-pw .cs-mark svg{width:100%;height:100%;display:block;}" +
      "#arb-pw .eyebrow{justify-content:center;}" +
      "#arb-pw h1{font-family:var(--serif);font-size:clamp(26px,5vw,40px);line-height:1.1;letter-spacing:-.01em;margin:0 0 10px;}" +
      "#arb-pw p{color:var(--muted);font-size:15px;margin:0 0 24px;max-width:42ch;}" +
      "#arb-pw form{display:flex;gap:10px;width:min(380px,100%);}" +
      "#arb-pw input{flex:1;min-width:0;font-family:var(--sans);font-size:15px;color:var(--ink);" +
      "background:var(--card);border:1px solid var(--line-2);border-radius:11px;padding:13px 14px;}" +
      "#arb-pw input:focus{outline:none;border-color:var(--accent);}" +
      "#arb-pw .pw-msg{font-size:13px;margin-top:14px;min-height:1em;color:var(--danger);}" +
      "@media(max-width:480px){#arb-coming .cs-form,#arb-pw form{flex-direction:column;}#arb-coming .cs-form .btn,#arb-pw form .btn{justify-content:center;}}";
    var s = document.createElement("style");
    s.id = "arb-cfg-styles";
    s.textContent = css;
    (document.head || docEl).appendChild(s);
  }

  function buildBanner(text) {
    if (!text) return;
    function place() {
      if (document.querySelector(".arb-banner")) return;
      var bar = document.createElement("div");
      bar.className = "arb-banner";
      bar.innerHTML = text + '<button class="arb-banner-x" aria-label="Dismiss">×</button>';
      bar.querySelector(".arb-banner-x").addEventListener("click", function () { bar.remove(); });
      document.body.insertBefore(bar, document.body.firstChild);
    }
    if (document.body) place();
    else document.addEventListener("DOMContentLoaded", place);
  }

  function buildComingSoon(cs) {
    function place() {
      if (document.getElementById("arb-coming")) return;
      var el = document.createElement("section");
      el.id = "arb-coming";
      el.innerHTML =
        '<span class="cs-mark">' + BRAND_SVG + '</span>' +
        '<p class="eyebrow">Arbitrium · the act of judgment</p>' +
        '<h1>' + (cs.heading || DEFAULTS.comingSoon.heading) + '</h1>' +
        '<p>' + (cs.text || DEFAULTS.comingSoon.text) + '</p>' +
        '<form class="cs-form" id="csForm" novalidate>' +
          '<input type="email" name="email" required autocomplete="email" placeholder="you@company.com" aria-label="Email address">' +
          '<button type="submit" class="btn btn-primary">Join the waitlist</button>' +
        '</form>' +
        '<div class="cs-msg" aria-live="polite"></div>';
      document.body.appendChild(el);
      wireComingSoonForm(el);
    }
    if (document.body) place();
    else document.addEventListener("DOMContentLoaded", place);
  }

  function wireComingSoonForm(el) {
    var form = el.querySelector("#csForm");
    var input = el.querySelector("input[type=email]");
    var msg = el.querySelector(".cs-msg");
    var btn = el.querySelector("button[type=submit]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (input.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = "Please enter a valid email address."; msg.classList.add("err"); return;
      }
      msg.classList.remove("err");
      btn.disabled = true; btn.textContent = "Joining…";
      // Reuse the shared waitlist sender if app.js has loaded it; otherwise best-effort.
      var send = window.ARB_WAITLIST_SEND || function () { return Promise.resolve(); };
      send(email).then(function () {
        form.style.display = "none";
        msg.textContent = "You're on the list — thank you. We'll be in touch.";
      }).catch(function () {
        btn.disabled = false; btn.textContent = "Join the waitlist";
        msg.textContent = "Something went wrong. Please try again."; msg.classList.add("err");
      });
    });
  }

  // ---- whole-site password gate ----
  function sha256Hex(str) {
    if (!(window.crypto && window.crypto.subtle)) return Promise.reject(new Error("no subtle crypto"));
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
    });
  }

  function passwordCleared(pw) {
    // sessionStorage → the unlock lasts only for this browser session (re-prompts
    // after the tab is closed / the visitor leaves and comes back).
    try { return !!pw.hash && sessionStorage.getItem("arb-pw") === pw.hash; } catch (e) { return false; }
  }

  function buildPasswordGate(pw) {
    function place() {
      if (document.getElementById("arb-pw")) return;
      var el = document.createElement("section");
      el.id = "arb-pw";
      el.innerHTML =
        '<span class="cs-mark">' + BRAND_SVG + '</span>' +
        '<p class="eyebrow">Private preview</p>' +
        '<h1>' + (pw.heading || "This site is private") + '</h1>' +
        '<p>' + (pw.text || "Enter the password to continue.") + '</p>' +
        '<form id="pwForm" novalidate>' +
          '<input type="password" autocomplete="current-password" placeholder="Password" aria-label="Password">' +
          '<button type="submit" class="btn btn-primary">Enter</button>' +
        '</form>' +
        '<div class="pw-msg" aria-live="polite"></div>';
      document.body.appendChild(el);
      var form = el.querySelector("#pwForm");
      var input = el.querySelector("input");
      var msg = el.querySelector(".pw-msg");
      var btn = el.querySelector("button");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var val = (input.value || "").trim().toLowerCase();
        if (!val) return;
        btn.disabled = true;
        sha256Hex(val).then(function (h) {
          if (h === pw.hash) {
            try { sessionStorage.setItem("arb-pw", pw.hash); } catch (e2) {}
            location.reload();
          } else {
            btn.disabled = false; msg.textContent = "Incorrect password."; input.select();
          }
        }).catch(function () {
          btn.disabled = false; msg.textContent = "Could not verify — please try again.";
        });
      });
      setTimeout(function () { input.focus(); }, 50);
    }
    if (document.body) place();
    else document.addEventListener("DOMContentLoaded", place);
  }

  function uncloak() { docEl.classList.remove("arb-cloak"); }

  // Run DOM work only once the document is parsed (so sections exist to reorder).
  function whenBody(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  // Reorder the managed <section> elements to match config.sectionOrder.
  function applySectionOrder(cfg) {
    var order = cfg.sectionOrder;
    if (!order || !order.length) return;
    var main = document.querySelector("main");
    if (!main) return;
    var closing = document.getElementById("closing");
    order.forEach(function (id) {
      var s = document.getElementById(id);
      if (s && s.parentNode === main) main.insertBefore(s, closing);
    });
    syncNavAndFooter(cfg, order);
  }

  // Default nav/footer labels — used until a section has a navLabel override.
  var DEFAULT_NAV_LABELS = {
    disappear: "The Gap", anatomy: "Anatomy", process: "The Process", tiers: "Tiers",
    assessment: "Self-Check", bias: "Bias & Noise", ai: "AI & Ownership", object: "The Object",
    principles: "Principles", toolkit: "Toolkit"
  };

  function navLabelFor(cfg, id) {
    var t = (cfg.sectionText || {})[id] || {};
    return t.navLabel || DEFAULT_NAV_LABELS[id] || id;
  }

  // Reorder nav links + footer links to match sectionOrder, and apply any
  // navLabel override to both (keeps the nav, footer, and actual page order
  // — and their labels — in sync after an admin reorder/rename).
  function syncNavAndFooter(cfg, order) {
    var rank = {}; order.forEach(function (id, i) { rank[id] = i; });

    var navHost = document.getElementById("navLinks");
    if (navHost) {
      var navLinks = [].slice.call(navHost.querySelectorAll("a[href^='#']"));
      navLinks.forEach(function (a) {
        var id = a.getAttribute("href").slice(1);
        if (rank.hasOwnProperty(id)) a.textContent = navLabelFor(cfg, id);
      });
      navLinks.sort(function (a, b) {
        var ra = rank[a.getAttribute("href").slice(1)], rb = rank[b.getAttribute("href").slice(1)];
        if (ra == null) ra = 999; if (rb == null) rb = 999;
        return ra - rb;
      }).forEach(function (a) { navHost.appendChild(a); });
    }

    // Footer keeps its existing two-column grouping — only the relative order
    // within each column, and the label text, are kept in sync.
    document.querySelectorAll(".footer ul").forEach(function (ul) {
      var items = [].slice.call(ul.querySelectorAll("li"));
      items.forEach(function (li) {
        var a = li.querySelector("a[href^='#']");
        if (!a) return;
        var id = a.getAttribute("href").slice(1);
        if (rank.hasOwnProperty(id)) a.textContent = navLabelFor(cfg, id);
      });
      items.sort(function (la, lb) {
        var aA = la.querySelector("a[href^='#']"), aB = lb.querySelector("a[href^='#']");
        var ra = aA ? rank[aA.getAttribute("href").slice(1)] : null;
        var rb = aB ? rank[aB.getAttribute("href").slice(1)] : null;
        if (ra == null) ra = 999; if (rb == null) rb = 999;
        return ra - rb;
      }).forEach(function (li) { ul.appendChild(li); });
    });
  }

  // Override each section's eyebrow / title / intro from config.sectionText.
  function applySectionText(cfg) {
    var st = cfg.sectionText;
    if (!st) return;
    Object.keys(st).forEach(function (id) {
      var sec = document.getElementById(id);
      if (!sec) return;
      var head = sec.querySelector(".head");
      if (!head) return;
      var t = st[id] || {};
      var eb = head.querySelector(".eyebrow");     if (eb && t.eyebrow) eb.textContent = t.eyebrow;
      var h2 = head.querySelector("h2");           if (h2 && t.title)   h2.textContent = t.title;
      var p  = head.querySelector("p:not(.eyebrow)"); if (p && t.intro) p.innerHTML     = t.intro;
    });
  }

  // Show/hide each section's optional illustration (config.sectionText.<id>.image).
  // Nothing renders on the public site when unset — this is not a visible
  // "placeholder"; the empty-state affordance lives only in the admin editor.
  function applySectionImages(cfg) {
    var st = cfg.sectionText;
    if (!st) return;
    Object.keys(st).forEach(function (id) {
      var sec = document.getElementById(id);
      if (!sec) return;
      var head = sec.querySelector(".head");
      if (!head) return;
      var t = st[id] || {};
      var fig = sec.querySelector(".head-figure");
      if (t.image) {
        if (!fig) {
          fig = document.createElement("figure");
          fig.className = "head-figure reveal in";
          head.parentNode.insertBefore(fig, head.nextSibling);
        }
        var img = fig.querySelector("img");
        if (!img) { img = document.createElement("img"); img.alt = ""; fig.appendChild(img); }
        if (img.getAttribute("src") !== t.image) img.setAttribute("src", t.image);
      } else if (fig) {
        fig.remove();
      }
    });
  }

  // Optional hero photo (config.hero.image). Adds the .hero-photo treatment
  // only when a photo is set — otherwise the hero keeps its plain default look.
  function applyHeroImage(cfg) {
    var path = cfg.hero && cfg.hero.image;
    var hero = document.getElementById("hero");
    var host = document.getElementById("heroBg");
    if (!hero || !host) return;
    if (path) {
      hero.classList.add("hero-photo");
      var img = host.querySelector("img");
      if (!img) { img = document.createElement("img"); img.alt = ""; host.appendChild(img); }
      if (img.getAttribute("src") !== path) img.setAttribute("src", path);
    } else {
      hero.classList.remove("hero-photo");
      host.innerHTML = "";
    }
  }

  var applied = false;
  function apply(cfg) {
    if (applied) return;
    applied = true;
    window.ARB_CONFIG = cfg;

    injectStyles();

    // Whole-site password gate is the outermost layer — everything stays hidden
    // behind it until the correct password is entered.
    var pw = cfg.password || {};
    if (pw.enabled === true && !passwordCleared(pw)) {
      docEl.classList.add("arb-pw-lock");
      whenBody(function () { buildPasswordGate(pw); uncloak(); });
      resolveReady(cfg);
      return;
    }

    var sec = cfg.sections || {};
    Object.keys(DEFAULTS.sections).forEach(function (k) {
      if (sec[k] === false) docEl.classList.add("arb-hide-" + k);
    });

    var tools = cfg.tools || {};
    if (tools.checklist === false) docEl.classList.add("arb-hide-tool-checklist");
    if (tools.diagnostic === false) docEl.classList.add("arb-hide-tool-diagnostic");
    if (tools.record === false) docEl.classList.add("arb-hide-tool-record");

    // Gate off → open the tools to everyone (overrides the locked default).
    if (get(cfg, "gate.enabled", true) === false) {
      docEl.classList.add("arb-gate-off");
      docEl.classList.remove("arb-locked");
      docEl.classList.add("arb-unlocked");
    }

    whenBody(function () {
      applySectionOrder(cfg);
      applySectionText(cfg);
      applySectionImages(cfg);
      applyHeroImage(cfg);
      if (get(cfg, "comingSoon.enabled", false) === true) {
        docEl.classList.add("arb-coming-soon");
        buildComingSoon(cfg.comingSoon || DEFAULTS.comingSoon);
      } else if (get(cfg, "banner.enabled", false) === true) {
        buildBanner(get(cfg, "banner.text", ""));
      }
      uncloak();
    });
    resolveReady(cfg);
  }

  // ---- load config.json (with a hard safety timeout so we never stay cloaked) ----
  var settled = false;
  function settle(cfg) { if (settled) return; settled = true; apply(cfg); }

  setTimeout(function () { settle(DEFAULTS); }, 1500);

  try {
    fetch("config.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : DEFAULTS; })
      .then(function (j) { settle(j && typeof j === "object" ? j : DEFAULTS); })
      .catch(function () { settle(DEFAULTS); });
  } catch (e) { settle(DEFAULTS); }
})();
