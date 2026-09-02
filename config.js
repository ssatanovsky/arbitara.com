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
    // "governance" is deliberately false — see buildGovernanceSection() below:
    // unlike every other section here, it isn't hidden with CSS on top of
    // static markup. It's confidential pre-launch copy, so nothing about it
    // (markup, nav link, footer link) is created at all unless switched on.
    sections: { platform: true, disappear: true, anatomy: true, process: true, tiers: true, assessment: true, bias: true, ai: true, principles: true, toolkit: true, governance: false, contact: true },
    tools: { checklist: true, diagnostic: true, record: true },
    banner: { enabled: false, text: "" },
    comingSoon: { enabled: false, heading: "Something is being built here.", text: "Arbitara is in stealth. Add your email and we'll be in touch." }
  };

  // Readiness promise consumed by app.js so its behavior can respect config.
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
      // section hides — also hide the matching nav link and footer entry,
      // so a disabled section disappears everywhere, not just its own anchor
      ".arb-hide-platform #platform,.arb-hide-disappear #disappear,.arb-hide-anatomy #anatomy,.arb-hide-process #process," +
      ".arb-hide-tiers #tiers,.arb-hide-assessment #assessment,.arb-hide-bias #bias,.arb-hide-ai #ai," +
      ".arb-hide-principles #principles,.arb-hide-toolkit #toolkit,.arb-hide-contact #contact{display:none!important;}" +
      ".arb-hide-platform .nav-links a[href='#platform'],.arb-hide-disappear .nav-links a[href='#disappear'],.arb-hide-anatomy .nav-links a[href='#anatomy']," +
      ".arb-hide-process .nav-links a[href='#process'],.arb-hide-tiers .nav-links a[href='#tiers']," +
      ".arb-hide-assessment .nav-links a[href='#assessment']," +
      ".arb-hide-bias .nav-links a[href='#bias'],.arb-hide-ai .nav-links a[href='#ai']," +
      ".arb-hide-principles .nav-links a[href='#principles'],.arb-hide-toolkit .nav-links a[href='#toolkit']," +
      ".arb-hide-contact .nav-links a[href='#contact']{display:none!important;}" +
      ".arb-hide-platform .footer li:has(a[href='#platform'])," +
      ".arb-hide-disappear .footer li:has(a[href='#disappear'])," +
      ".arb-hide-anatomy .footer li:has(a[href='#anatomy'])," +
      ".arb-hide-process .footer li:has(a[href='#process'])," +
      ".arb-hide-tiers .footer li:has(a[href='#tiers'])," +
      ".arb-hide-assessment .footer li:has(a[href='#assessment'])," +
      ".arb-hide-bias .footer li:has(a[href='#bias'])," +
      ".arb-hide-ai .footer li:has(a[href='#ai'])," +
      ".arb-hide-principles .footer li:has(a[href='#principles'])," +
      ".arb-hide-toolkit .footer li:has(a[href='#toolkit'])," +
      ".arb-hide-contact .footer li:has(a[href='#contact']){display:none!important;}" +
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
        msg.textContent = "You're on the list, thank you. We'll be in touch.";
      }).catch(function () {
        btn.disabled = false; btn.textContent = "Join the waitlist";
        msg.textContent = "Something went wrong. Please try again."; msg.classList.add("err");
      });
    });
  }

  // ---- whole-site password gate ----
  // Pure-JS SHA-256 over a byte array — used when window.crypto.subtle is
  // unavailable (it only exists in secure contexts, so a visitor on plain
  // http:// would otherwise get "could not verify"). Produces the identical
  // lowercase-hex digest as crypto.subtle, so stored hashes stay compatible.
  function sha256Bytes(bytes) {
    function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
    var K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var l = bytes.length, withOne = l + 1;
    var k = (56 - (withOne % 64) + 64) % 64;
    var totalLen = withOne + k + 8;
    var m = new Uint8Array(totalLen);
    m.set(bytes); m[l] = 0x80;
    var dv = new DataView(m.buffer);
    dv.setUint32(totalLen - 8, Math.floor((l * 8) / 0x100000000));
    dv.setUint32(totalLen - 4, (l * 8) >>> 0);
    var w = new Uint32Array(64), i, t;
    for (i = 0; i < totalLen; i += 64) {
      for (t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
      for (t = 16; t < 64; t++) {
        var s0 = rotr(7, w[t-15]) ^ rotr(18, w[t-15]) ^ (w[t-15] >>> 3);
        var s1 = rotr(17, w[t-2]) ^ rotr(19, w[t-2]) ^ (w[t-2] >>> 10);
        w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
      }
      var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(6,e) ^ rotr(11,e) ^ rotr(25,e);
        var ch = (e & f) ^ (~e & g);
        var temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = rotr(2,a) ^ rotr(13,a) ^ rotr(22,a);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) >>> 0;
        h=g; g=f; f=e; e=(d+temp1)>>>0; d=c; c=b; b=a; a=(temp1+temp2)>>>0;
      }
      H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0;
      H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;
    }
    var hex = "";
    for (i = 0; i < 8; i++) hex += ("00000000" + (H[i] >>> 0).toString(16)).slice(-8);
    return hex;
  }
  function sha256Hex(str) {
    var bytes = new TextEncoder().encode(str);
    if (window.crypto && window.crypto.subtle) {
      return crypto.subtle.digest("SHA-256", bytes).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      }).catch(function () { return sha256Bytes(bytes); });
    }
    return Promise.resolve(sha256Bytes(bytes));
  }

  function passwordCleared(pw) {
    // sessionStorage → the unlock lasts only for this browser session (re-prompts
    // after the tab is closed / the visitor leaves and comes back).
    try { return !!pw.hash && sessionStorage.getItem("arb-pw") === pw.hash; } catch (e) { return false; }
  }

  // Local preview never hits the password gate — the public site (any real
  // hostname) always does. This makes `python3 dev-server.py` show the full
  // site with no password dance, while production stays gated. It's safe to
  // ship: on arbitara.com this is false, so the gate behaves normally.
  function isLocalPreview() {
    var h = location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "" /* file:// */;
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
          btn.disabled = false; msg.textContent = "Could not verify. Please try again.";
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

  // Confidential, pre-launch "Decision Governance" quote carousel. Unlike
  // every other managed section, this one has NO static markup in index.html
  // and no nav/footer <a> tags authored anywhere — when off, there is
  // nothing for a hide-class to hide, because nothing was ever created.
  // Only when cfg.sections.governance === true does this build the section,
  // its nav link, and its footer link and insert them into the page. It
  // must run before applySectionOrder()/syncNavAndFooter() so the new
  // elements get positioned and labeled exactly like any static section.
  function buildGovernanceSection(cfg) {
    if (!(cfg.sections && cfg.sections.governance === true)) return;
    if (!docEl.hasAttribute("data-arb-home")) return; // homepage only — opt-in, not opt-out, so new pages default to not building it
    if (document.getElementById("governance")) return; // already built
    var main = document.querySelector("main");
    if (!main) return;
    var t = (cfg.sectionText && cfg.sectionText.governance) || {};
    // Each slide is either a plain string (a single line, default colour) or
    // an object { a, b } where `a` is the first line (default ink) and `b` is
    // an optional second line rendered in the gold accent.
    function slideParts(s) {
      if (s && typeof s === "object") return { a: (s.a || "").trim(), b: (s.b || "").trim() };
      return { a: String(s || "").trim(), b: "" };
    }
    var slides = Array.isArray(t.slides) ? t.slides.filter(function (s) {
      var p = slideParts(s); return p.a || p.b;
    }) : [];
    if (!slides.length) return; // nothing to show

    var sec = document.createElement("section");
    sec.id = "governance";
    sec.setAttribute("aria-label", t.navLabel || "Decision Governance");

    var wrap = document.createElement("div");
    wrap.className = "wrap";
    sec.appendChild(wrap);

    if (t.eyebrow || t.title) {
      var head = document.createElement("div");
      head.className = "head reveal in";
      head.innerHTML =
        (t.eyebrow ? '<p class="eyebrow">' + t.eyebrow + "</p>" : "") +
        (t.title ? "<h2>" + t.title + "</h2>" : "") +
        (t.intro ? "<p>" + t.intro + "</p>" : "");
      wrap.appendChild(head);
      if (t.image) {
        var fig = document.createElement("figure");
        fig.className = "head-figure reveal in";
        fig.innerHTML = '<img alt="" src="' + t.image + '">';
        wrap.appendChild(fig);
      }
    }

    var n = slides.length;
    var car = document.createElement("div");
    car.className = "carousel reveal in";
    car.id = "governanceCarousel";
    car.setAttribute("role", "region");
    car.setAttribute("aria-roledescription", "carousel");
    car.setAttribute("aria-label", (t.navLabel || "Decision Governance") + " quotes");

    var slidesHtml = slides.map(function (s, i) {
      var p = slideParts(s);
      var body = (p.a ? '<span class="cs-line">' + p.a + "</span>" : "") +
                 (p.b ? '<span class="cs-line cs-accent">' + p.b + "</span>" : "");
      return '<div class="carousel-slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + " of " + n + '"><p>' + body + "</p></div>";
    }).join("");

    var dotsHtml = slides.map(function (text, i) {
      return '<button type="button" aria-label="Quote ' + (i + 1) + " of " + n + '" aria-current="' + (i === 0 ? "true" : "false") + '"></button>';
    }).join("");

    car.innerHTML =
      '<div class="carousel-viewport"><div class="carousel-track">' + slidesHtml + "</div></div>" +
      '<button type="button" class="carousel-btn prev" aria-label="Previous quote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '<button type="button" class="carousel-btn next" aria-label="Next quote"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>' +
      '<div class="carousel-dots" role="group" aria-label="Choose a quote">' + dotsHtml + "</div>";

    wrap.appendChild(car);
    main.appendChild(sec);

    var navHost = document.querySelector("#subnav .subnav-inner") || document.getElementById("navLinks");
    if (navHost) {
      var a = document.createElement("a");
      a.href = "#governance";
      a.textContent = navLabelFor(cfg, "governance");
      navHost.appendChild(a);
    }
    // Targets the FIRST footer column deliberately: on every page this
    // builds on (see the data-arb-home guard above), that column is
    // "This Page" — the section belongs there, not in whichever column
    // happens to be last.
    var footerCols = document.querySelectorAll(".footer ul");
    if (footerCols.length) {
      var li = document.createElement("li");
      var fa = document.createElement("a");
      fa.href = "#governance";
      fa.textContent = navLabelFor(cfg, "governance");
      li.appendChild(fa);
      footerCols[0].appendChild(li);
    }
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
    platform: "Platform", disappear: "The Gap", anatomy: "Anatomy", process: "The Process", tiers: "Tiers",
    assessment: "Self-Check", bias: "Bias & Noise", ai: "AI & Ownership",
    principles: "Principles", toolkit: "Toolkit", governance: "Decision Governance", contact: "Contact"
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

    var navHost = document.querySelector("#subnav .subnav-inner") || document.getElementById("navLinks");
    if (navHost) {
      // Select every link, not just #-anchors — a static link (e.g. to
      // field-guide.html) has no matching id in `rank`, but still needs to
      // be reappended in the sort below or it gets left behind at whatever
      // position the matched links' reordering happens to push it to.
      var navLinks = [].slice.call(navHost.querySelectorAll("a"));
      navLinks.forEach(function (a, i) {
        var href = a.getAttribute("href") || "";
        var id = href.charAt(0) === "#" ? href.slice(1) : null;
        if (id && rank.hasOwnProperty(id)) a.textContent = navLabelFor(cfg, id);
        a.__arbRank = (id && rank.hasOwnProperty(id)) ? rank[id] : (1000 + i);
      });
      navLinks.sort(function (a, b) { return a.__arbRank - b.__arbRank; })
        .forEach(function (a) { navHost.appendChild(a); delete a.__arbRank; });
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

  // Per-tool name / body text / optional document link, for the checklist,
  // diagnostic, and one-page record — each keyed generically off cfg.toolsText
  // so a new tool only needs an entry in TOOL_HOOKS, not new code.
  var TOOL_HOOKS = {
    checklist: { name: "#checklist .ch-head h3", body: "#checklist .ch-desc", doc: '[data-tool-doc="checklist"]' },
    diagnostic: { name: ".diag-head h3", body: ".diag-head p", doc: '[data-tool-doc="diagnostic"]' },
    record: { name: "#recordPromo h3", body: "#recordPromo p", doc: '[data-tool-doc="record"]' }
  };
  function applyToolsText(cfg) {
    var tt = cfg.toolsText;
    if (!tt) return;
    Object.keys(TOOL_HOOKS).forEach(function (id) {
      var t = tt[id];
      var hooks = TOOL_HOOKS[id];
      var nameEl = document.querySelector(hooks.name);
      if (nameEl && t && t.name) nameEl.textContent = t.name;
      var bodyEl = document.querySelector(hooks.body);
      if (bodyEl && t && t.body) bodyEl.textContent = t.body;
      var docHost = document.querySelector(hooks.doc);
      if (docHost) {
        docHost.innerHTML = (t && t.doc)
          ? '<a href="' + t.doc + '" target="_blank" rel="noopener">Download the document' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg></a>'
          : "";
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

  // Optional hero copy overrides (config.hero.eyebrow/headline/lede/ctaPrimary/
  // ctaSecondary). Each field only overrides if set — same "override if
  // present, else keep the default" convention as section text.
  function applyHeroText(cfg) {
    var h = cfg.hero || {};
    var hero = document.getElementById("hero");
    if (!hero) return;
    var eb = hero.querySelector(".eyebrow"); if (eb && h.eyebrow) eb.textContent = h.eyebrow;
    var h1 = hero.querySelector("h1"); if (h1 && h.headline) h1.innerHTML = h.headline;
    var lede = hero.querySelector(".lede"); if (lede && h.lede) lede.innerHTML = h.lede;
    var thesis = hero.querySelector(".hero-thesis"); if (thesis && h.thesis) thesis.innerHTML = h.thesis;
    var etym = hero.querySelector(".hero-etym"); if (etym && h.etym) etym.innerHTML = h.etym;
    var ctas = hero.querySelectorAll(".hero-cta .cta-label");
    if (ctas[0] && h.ctaPrimary) ctas[0].textContent = h.ctaPrimary;
    if (ctas[1] && h.ctaSecondary) ctas[1].textContent = h.ctaSecondary;
  }

  // Optional hero stats strip (config.hero.stats = [{n, l, src}, ...]). When
  // set (non-empty), fully rebuilds the .stats children from the array —
  // this is a genuine list, not field overrides, since the count itself can
  // change. Absent/empty, the static default 4 stats in index.html stand.
  function applyHeroStats(cfg) {
    var stats = cfg.hero && cfg.hero.stats;
    if (!stats || !stats.length) return;
    var host = document.querySelector(".hero .stats");
    if (!host) return;
    host.innerHTML = stats.map(function (s) {
      return '<div class="stat">' +
        '<div class="n">' + (s.n || "") + '</div>' +
        '<div class="l">' + (s.l || "") + '</div>' +
        '<div class="src">' + (s.src || "") + '</div>' +
        '</div>';
    }).join("");
  }

  // Generic override for content outside the structured sectionText/hero
  // schema — anything else the inline editor exposes (bespoke illustration
  // captions, hand-built card lists, etc.) via a `data-arb-edit="<key>"`
  // marker in the HTML. config.content is a flat {key: html} map; this
  // just innerHTML's each match, so any element can opt in by adding the
  // attribute — no per-field code needed here or in admin-edit.js.
  function applyContentOverrides(cfg) {
    var c = cfg.content;
    if (!c) return;
    Object.keys(c).forEach(function (key) {
      if (c[key] == null) return;
      var el = document.querySelector('[data-arb-edit="' + key + '"]');
      if (el) el.innerHTML = c[key];
    });
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
    if (pw.enabled === true && !passwordCleared(pw) && !isLocalPreview()) {
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

    whenBody(function () {
      buildGovernanceSection(cfg);
      applySectionOrder(cfg);
      applySectionText(cfg);
      applySectionImages(cfg);
      applyToolsText(cfg);
      applyHeroImage(cfg);
      applyHeroText(cfg);
      applyHeroStats(cfg);
      applyContentOverrides(cfg);
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
