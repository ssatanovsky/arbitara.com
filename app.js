/* Arbitara — arbitara.com interactions. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  /* ---------- Year ---------- */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Theme toggle ---------- */
  var root = document.documentElement;
  var themeBtn = document.getElementById("themeBtn");
  try {
    var saved = localStorage.getItem("arb-theme");
    if (saved) root.setAttribute("data-theme", saved);
  } catch (e) {}
  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("arb-theme", next); } catch (e) {}
    });
  }

  /* ---------- Nav: scrolled state + mobile toggle ---------- */
  var nav = document.getElementById("nav");
  var onScroll = function () {
    if (window.scrollY > 12) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navLinks.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- The twelve-step process (4 phases; "core" = the 5-step Light path) ---------- */
  var STEPS = [
    { phase: "Frame", n: 1, title: "Set strategic context", core: true,
      what: "Anchor the decision in the strategy it is meant to serve (which priorities it advances, and which it trades against) before anything else.",
      good: "Every later step inherits a clear line back to strategic intent.",
      skip: "Decisions drift from strategy invisibly; day-to-day allocation and stated direction quietly diverge." },
    { phase: "Frame", n: 2, title: "Clarify authority", core: false,
      what: "Name the single accountable Decider, and who advises, is consulted, and is merely informed. One person owns the outcome. Never a committee.",
      good: "Accountability becomes a structure, not a hope, and social conformity has less room to distort the choice.",
      skip: "Diffused ownership breeds noise; when it goes wrong, no one quite decided." },
    { phase: "Frame", n: 3, title: "State the decision", core: true,
      what: "Write the decision as a statement of what is being decided and its context, not a yes/no question that pre-narrows the options. Classify it: clear, complicated, complex, or chaotic.",
      good: "The real question is on the table, open enough that a better option can exist.",
      skip: "The wrong question is answered rigorously; a complex decision is treated as merely complicated." },
    { phase: "Structure", n: 4, title: "State assumptions", core: false,
      what: "Name the key claims about the world the decision rests on (each time-bounded, falsifiable, and given a review date) before evidence is gathered or options scored.",
      good: "The reasoning is on record and can be checked when the world changes.",
      skip: "Assumptions masquerade as facts: the Kodak failure mode, built in at the moment of choice." },
    { phase: "Structure", n: 5, title: "Generate options", core: true,
      what: "Generate genuine alternatives, including the do-nothing null option priced with its own costs and risks, developed independently of any preferred answer.",
      good: "The best available path can actually be in the set you evaluate.",
      skip: "Goldilocks options. The proposer's pick wins by construction, and do-nothing is never priced." },
    { phase: "Structure", n: 6, title: "Set criteria", core: false,
      what: "State the criteria, weight them, and tie them to strategic priorities before evidence is gathered. Weighted, owned, measurable.",
      good: "Similar decisions get made consistently; the basis of the choice is legible.",
      skip: "Implicit criteria produce inconsistent decisions and make organizational learning impossible." },
    { phase: "Evaluate", n: 7, title: "Gather evidence", core: false,
      what: "Gather the specific evidence needed to test the options against the criteria: from the lineage of prior decisions, the market, and the team. Targeted, not exhaustive.",
      good: "Analysis reduces uncertainty exactly where it matters to the choice.",
      skip: "Data collection expands to fill the space; evidence is gathered to confirm rather than to test. Paralysis." },
    { phase: "Evaluate", n: 8, title: "Evaluate options", core: false,
      what: "Score each alternative against the explicit, weighted criteria using the evidence gathered: the same framework applied to every option.",
      good: "The basis of the choice becomes auditable: not just what won, but why.",
      skip: "The room's social dynamics decide as much as the merits." },
    { phase: "Evaluate", n: 9, title: "Record the decision", core: true,
      what: "Record the choice, the options not taken, the criteria applied, the key assumptions, the named owner, and the date. This is the decision becoming an object.",
      good: "The decision can be audited, challenged, and learned from later.",
      skip: "It is an announcement, not a decision. The reasoning leaves when the people do." },
    { phase: "Deliver", n: 10, title: "Communicate rationale", core: true,
      what: "Transmit the decision with its reasoning (the options weighed, the assumptions it depends on, the owner to question) not just the conclusion. Write the memo, not the announcement.",
      good: "Teams execute adaptively because they understand what the direction is contingent on.",
      skip: "Teams comply with an incomplete picture; execution drifts from intent." },
    { phase: "Deliver", n: 11, title: "Implement", core: false,
      what: "Link the decision to action owners, milestones, and explicit kill criteria: the conditions under which you would stop.",
      good: "Commitment and action are connected, with a pre-agreed off-ramp.",
      skip: "The gap between deciding and doing opens; there is no trigger to halt a failing course." },
    { phase: "Deliver", n: 12, title: "Monitor outcomes", core: false,
      what: "Track actual outcomes against the predictions embedded in the decision. Review assumptions against their dates; reopen the decision when they expire. Compare ex-post to ex-ante.",
      good: "Experience becomes intelligence: the feedback loop that raises decision quality is finally closed.",
      skip: "Experience accumulates but intelligence does not; the same structural errors repeat, invisibly." }
  ];

  var phasesEl = document.getElementById("phases");
  var panelEl = document.getElementById("stepPanel");
  var activeStep = 0;

  function buildPhases() {
    if (!phasesEl) return;
    var html = "";
    var lastPhase = null;
    STEPS.forEach(function (s, i) {
      if (s.phase !== lastPhase) {
        if (lastPhase !== null) html += '</div></div>';
        html += '<div class="phase-col"><div class="phase-label">' + s.phase + '</div><div class="phase-steps">';
        lastPhase = s.phase;
      }
      html += '<button class="step-btn" data-i="' + i + '">' +
        '<span class="sn">' + s.n + '</span>' +
        '<span class="stext">' + s.title + '</span></button>';
    });
    if (lastPhase !== null) html += '</div></div>';
    phasesEl.innerHTML = html;
    phasesEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".step-btn");
      if (btn) renderStep(parseInt(btn.getAttribute("data-i"), 10));
    });
  }

  function renderStep(i) {
    activeStep = i;
    var s = STEPS[i];
    document.querySelectorAll(".step-btn").forEach(function (b) {
      b.classList.toggle("active", parseInt(b.getAttribute("data-i"), 10) === i);
    });
    panelEl.innerHTML =
      '<div class="pnum">' + s.phase.toUpperCase() + ' · STEP ' + s.n + ' OF 12</div>' +
      '<h3>' + s.title + '</h3>' +
      '<p class="what">' + s.what + '</p>' +
      '<div class="cols">' +
        '<div class="col do"><h4>When you do it</h4><p>' + s.good + '</p></div>' +
        '<div class="col skip"><h4>What goes wrong without it</h4><p>' + s.skip + '</p></div>' +
      '</div>' +
      '<div class="step-nav">' +
        '<button id="stepPrev"' + (i === 0 ? " disabled" : "") + '>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg> Previous</button>' +
        '<button id="stepNext"' + (i === STEPS.length - 1 ? " disabled" : "") + '>Next ' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
      '</div>';
    var prev = document.getElementById("stepPrev");
    var next = document.getElementById("stepNext");
    if (prev) prev.addEventListener("click", function () { if (activeStep > 0) renderStep(activeStep - 1); });
    if (next) next.addEventListener("click", function () { if (activeStep < STEPS.length - 1) renderStep(activeStep + 1); });
  }

  if (phasesEl && panelEl) { buildPhases(); renderStep(0); }

  /* ---------- Tier diagnostic ---------- */
  var answers = { rev: null, con: null, asy: null };
  document.querySelectorAll(".seg[data-q]").forEach(function (seg) {
    var q = seg.getAttribute("data-q");
    seg.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      seg.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
      btn.classList.add("on");
      answers[q] = parseInt(btn.getAttribute("data-v"), 10);
      updateDiag();
    });
  });

  function updateDiag() {
    var rTier = document.getElementById("rTier");
    var rNote = document.getElementById("rNote");
    if (!rTier) return;
    if (answers.rev === null || answers.con === null || answers.asy === null) {
      rTier.className = "rtier none";
      rTier.textContent = "Answer the three tests";
      rNote.textContent = "Where the compounding structure is present, the decision is strategic, regardless of the level at which it is being made.";
      return;
    }
    var score = answers.rev + answers.con + answers.asy;
    // Asymmetry is the strongest single signal for strategic.
    if (answers.asy === 1 || score >= 2) {
      rTier.className = "rtier s";
      rTier.textContent = "Strategic";
      rNote.textContent = "Give it the full apparatus: explicit options including do-nothing, weighted criteria, a named owner, and monitored assumptions. Getting it wrong won't just fail to create value. It will compound.";
    } else if (score === 1) {
      rTier.className = "rtier t";
      rTier.textContent = "Tactical";
      rNote.textContent = "Deliberate proportionately: surface the tradeoffs and connect them to strategic context, but keep the cycle short enough to learn from. Don't inflate it into a strategic process. That collapses the iteration that makes it work.";
    } else {
      rTier.className = "rtier o";
      rTier.textContent = "Operational";
      rNote.textContent = "This belongs at the level closest to execution, under delegated authority with clear escalation criteria. Escalating it taxes the attention that strategic questions need.";
    }
  }

  /* ---------- Self-assessment (5-question decision-management check) ----------
     Deliberately scoped to .assess / .aseg so it never touches the tier
     diagnostic's .seg[data-q] wiring above, even though both reuse the same
     .seg button styling. */
  (function () {
    var assessEl = document.querySelector(".assess");
    if (!assessEl) return;
    var fill = document.getElementById("assessFill");
    var scoreEl = document.getElementById("assessScore");
    var noteEl = document.getElementById("assessNote");
    var total = assessEl.querySelectorAll(".assess-q").length;
    var answers = {};

    var DEFAULT_NOTE = noteEl.textContent;
    var BANDS = [
      { max: 0, cls: "good",   score: "Zero gaps",
        note: "That's rare. Most organizations we talk to have at least one. Whatever keeps decisions visible and documented here, it's working." },
      { max: 2, cls: "accent", score: function (n) { return n + " of 5: a couple of gaps"; },
        note: "Common, and still cheap to close. Most organizations don't notice until the third or fourth." },
      { max: 4, cls: "warn",   score: function (n) { return n + " of 5: meaningful blind spots"; },
        note: "Real gaps in how decisions get made, governed, or remembered. Not yet a crisis, but compounding." },
      { max: 5, cls: "danger", score: "Five for five",
        note: "There's effectively no visibility into how or why decisions get made here. That's not a judgment. It's the default for most organizations that haven't made decision management a discipline yet." }
    ];

    function render() {
      var answered = Object.keys(answers).length;
      if (answered < total) {
        fill.style.width = (answered / total * 100) + "%";
        fill.style.background = "var(--line-2)";
        scoreEl.textContent = answered + " / " + total + " answered";
        noteEl.textContent = DEFAULT_NOTE;
        return;
      }
      var gaps = 0;
      Object.keys(answers).forEach(function (k) { gaps += answers[k]; });
      var band = BANDS.filter(function (b) { return gaps <= b.max; })[0];
      fill.style.width = (gaps / total * 100) + "%";
      fill.style.background = "var(--" + band.cls + ")";
      scoreEl.textContent = typeof band.score === "function" ? band.score(gaps) : band.score;
      noteEl.textContent = band.note;
    }

    assessEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".aseg button");
      if (!btn) return;
      var seg = btn.closest(".aseg");
      var q = seg.getAttribute("data-aq-seg");
      seg.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
      btn.classList.add("on");
      answers[q] = parseInt(btn.getAttribute("data-v"), 10);
      render();
    });
  })();

  /* ---------- Pre-decision checklist ---------- */
  var checklist = document.getElementById("checklist");
  if (checklist) {
    var items = checklist.querySelectorAll(".check-item");
    var fill = document.getElementById("chFill");
    var count = document.getElementById("chCount");
    var msg = document.getElementById("chMsg");
    var total = items.length;
    function refresh() {
      var done = checklist.querySelectorAll(".check-item.done").length;
      fill.style.width = (done / total * 100) + "%";
      count.textContent = done + " / " + total;
      if (done === 0) msg.textContent = "Tap each item as you clear it.";
      else if (done < total) msg.textContent = "Keep going: " + (total - done) + " to go.";
      else msg.textContent = "Every gate cleared. This one's ready to decide.";
    }
    items.forEach(function (it) {
      it.setAttribute("role", "button");
      it.setAttribute("tabindex", "0");
      function toggle() { it.classList.toggle("done"); refresh(); }
      it.addEventListener("click", toggle);
      it.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    });
    refresh();
  }

  /* ==========================================================================
     Access gate — practitioner tools & templates are members / waitlist only.
     Soft gate: unlocks in-browser after an email is submitted. Not a security
     boundary (a static site can't enforce one) — it's a lead capture + gate.
     ========================================================================== */
  (function initGate() {

    /* ===================================================================
       CONFIG — paste your Formspree endpoint to start collecting emails.
       1. Create a free form at https://formspree.io (use hello@arbitara.com).
       2. Formspree gives you a URL like  https://formspree.io/f/abcdwxyz
       3. Paste it between the quotes below and redeploy.
       Until this is set, the gate still unlocks the tools locally, but
       signups are NOT sent anywhere.
       =================================================================== */
    var WAITLIST_ENDPOINT = "";

    var ACCESS_KEY = "arb-access";
    var EMAIL_KEY = "arb-email";
    var docEl = document.documentElement;

    function hasAccess() {
      try { return localStorage.getItem(ACCESS_KEY) === "granted"; } catch (e) { return false; }
    }

    // Tools/templates behind the gate. `spaced` mirrors the element's own top margin.
    var GATED = [
      { sel: "#checklist", tool: "checklist", name: "The pre-decision checklist",
        blurb: "Run the ten-item pass over the decision on your desk.", spaced: false },
      { sel: ".diag", tool: "diagnostic", name: "The tier diagnostic",
        blurb: "Three quick tests that place a decision as strategic, tactical, or operational.", spaced: true }
    ];

    var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';

    /* ---- styles (injected so only app.js needs redeploying) ---- */
    function injectStyles() {
      if (document.getElementById("gate-styles")) return;
      var css =
        ".gate-lock{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow-sm);padding:44px 34px;text-align:center;display:flex;flex-direction:column;align-items:center;}" +
        ".gate-lock.spaced{margin-top:34px;}" +
        ".gate-lock .gl-badge{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent-ink);margin-bottom:16px;}" +
        ".gate-lock .gl-badge svg{width:24px;height:24px;}" +
        ".gate-lock .gl-tag{font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);}" +
        ".gate-lock h3{font-family:var(--serif);font-size:23px;margin:8px 0 8px;color:var(--ink);}" +
        ".gate-lock p{font-size:15px;color:var(--muted);margin:0 0 22px;max-width:42ch;}";
      var s = document.createElement("style");
      s.id = "gate-styles";
      s.textContent = css;
      document.head.appendChild(s);
    }

    /* ---- one shared unlock path: scroll to the contact form and remember
       what to open once it's been submitted. No separate modal/form. ---- */
    var pendingHref = null;

    function scrollToContact() {
      var el = document.getElementById("contact");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function requestUnlock(href) {
      pendingHref = href || null;
      scrollToContact();
      var card = document.querySelector(".contact-card");
      if (card) {
        card.classList.add("flash");
        setTimeout(function () { card.classList.remove("flash"); }, 1800);
      }
    }

    // Accepts either a plain email string (the coming-soon screen's use) or
    // a full lead object (name, email, interest, source — the contact
    // form's use). Both end up on the same list through the same endpoint.
    function send(payload) {
      var body = typeof payload === "string" ? { email: payload, source: "arbitara.com waitlist" } : payload;
      if (!WAITLIST_ENDPOINT) {
        // Not configured yet: unlock locally, nothing captured server-side.
        if (window.console) console.warn("[Arbitara] Waitlist endpoint not set: signup not stored. See WAITLIST_ENDPOINT in app.js.");
        return Promise.resolve();
      }
      return fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(Object.assign({ page: location.href }, body))
      }).then(function (r) { if (!r.ok) throw new Error("bad status " + r.status); return r; });
    }

    // Called after the contact form submits successfully — one action both
    // captures the lead and unlocks the gated tools on this device.
    function grantAccess(email) {
      try {
        localStorage.setItem(ACCESS_KEY, "granted");
        if (email) localStorage.setItem(EMAIL_KEY, email);
      } catch (e) {}
      docEl.classList.remove("arb-locked");
      docEl.classList.add("arb-unlocked");
      // Remove locked placeholders — the real tools are revealed by the CSS class swap.
      Array.prototype.forEach.call(document.querySelectorAll(".gate-lock"), function (n) { n.remove(); });
      var goto = pendingHref;
      pendingHref = null;
      if (goto) window.open(goto, "_blank", "noopener");
    }

    /* ---- locked placeholders in place of each gated tool ---- */
    function placeLocks(tools) {
      tools = tools || {};
      GATED.forEach(function (g) {
        if (g.tool && tools[g.tool] === false) return; // tool switched off entirely — hidden by config.js
        var el = document.querySelector(g.sel);
        if (!el || !el.parentNode) return;
        var card = document.createElement("div");
        card.className = "gate-lock" + (g.spaced ? " spaced" : "");
        card.setAttribute("data-tool", g.tool || "");
        card.innerHTML =
          '<span class="gl-badge">' + LOCK_SVG + '</span>' +
          '<span class="gl-tag">Members &amp; contact</span>' +
          '<h3>' + g.name + '</h3>' +
          '<p>' + g.blurb + '</p>' +
          '<button type="button" class="btn btn-primary gate-open">Unlock with the contact form</button>';
        el.parentNode.insertBefore(card, el);
        card.querySelector(".gate-open").addEventListener("click", function () { requestUnlock(); });
      });
    }

    /* ---- intercept links to the gated template (the one-page record) ---- */
    function guardRecordLinks() {
      document.addEventListener("click", function (e) {
        if (hasAccess()) return;
        var a = e.target.closest('a[href^="decision-record"]');
        if (!a) return;
        e.preventDefault();
        requestUnlock(a.getAttribute("href"));
      });
    }

    // Let the coming-soon screen (config.js) and the contact form reuse the
    // same sender, so every lead capture point on the site (gate, coming-
    // soon, contact) writes to the one list rather than separate ones.
    window.ARB_WAITLIST_SEND = send;
    window.ARB_SUBMIT_LEAD = send;
    window.ARB_GRANT_ACCESS = grantAccess;

    // Boot — waits for config.js so it can honour the gate on/off + per-tool switches.
    function boot(cfg) {
      cfg = cfg || window.ARB_CONFIG || {};
      injectStyles();
      var gateOff = cfg.gate && cfg.gate.enabled === false;
      if (gateOff || hasAccess()) {
        docEl.classList.remove("arb-locked");
        docEl.classList.add("arb-unlocked");
        return;
      }
      placeLocks(cfg.tools || {});
      guardRecordLinks();
      // Deep link from the record-page guard: jump straight to the form.
      if (location.hash === "#unlock") requestUnlock();
    }

    if (window.ARB_READY && typeof window.ARB_READY.then === "function") {
      window.ARB_READY.then(boot);
    } else {
      boot();
    }
  })();

  /* ==========================================================================
     Contact form — one form for the whole spectrum of interest, from "keep
     me posted" to "ready to buy". Submits through the same sender as the
     gate/waitlist, so it's one list, not two.
     ========================================================================== */
  (function initContact() {
    var form = document.getElementById("contactForm");
    if (!form) return;
    var msg = form.querySelector(".cf-msg");
    var btn = form.querySelector("button[type=submit]");
    var btnLabel = btn.textContent;

    function setMsg(text, isErr) {
      msg.textContent = text;
      msg.classList.toggle("err", !!isErr);
    }
    function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.name.value || "").trim();
      var email = (form.email.value || "").trim();
      var interestField = form.querySelector('input[name="interest"]:checked');
      var interest = interestField ? interestField.value : "";
      if (!name) { setMsg("Please enter your name.", true); form.name.focus(); return; }
      if (!validEmail(email)) { setMsg("Please enter a valid email address.", true); form.email.focus(); return; }
      if (!interest) { setMsg("Please choose where you're at.", true); return; }
      btn.disabled = true;
      btn.textContent = "Sending…";
      var wasLocked = document.documentElement.classList.contains("arb-locked");
      var send = window.ARB_SUBMIT_LEAD || function () { return Promise.resolve(); };
      send({ name: name, email: email, interest: interest, source: "arbitara.com contact" }).then(function () {
        if (window.ARB_GRANT_ACCESS) window.ARB_GRANT_ACCESS(email);
        setMsg(wasLocked ? "Thank you. The practitioner tools are now unlocked on this device." : "Thank you. We'll be in touch.", false);
        form.reset();
        btn.disabled = false;
        btn.textContent = btnLabel;
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = btnLabel;
        setMsg("Something went wrong sending that. Please try again.", true);
      });
    });
  })();

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }
})();
