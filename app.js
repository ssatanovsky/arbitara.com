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

  /* ---------- Nav: scrolled state, scroll-spy, mobile menu ---------- */
  var nav = document.getElementById("nav");
  var navLinks = document.getElementById("navLinks");
  var navToggle = document.getElementById("navToggle");
  // The primary nav-links row now holds only page-level destinations
  // (Home, White paper, ...); a page's own section links live in the
  // separate #subnav row instead, so scroll-spy watches that — falling back
  // to navLinks for any page that hasn't adopted a subnav.
  var spyHost = document.getElementById("subnav") || navLinks;

  // Scroll-spy: highlight whichever same-page section is currently in view,
  // the way in-page nav works on Stripe's docs / Linear's marketing pages.
  // Cross-page links (white-paper.html, self-check.html, index.html#contact,
  // ...) are naturally excluded by the [href^="#"] selector — only real
  // same-page anchors ever get marked active. Queried fresh on every call
  // rather than cached at setup — config.js can still be adding/reordering
  // nav links (e.g. the "Decision Governance" section it builds async)
  // after this script runs, and re-querying a handful of <a> tags is cheap.
  function onScrollTick() {
    if (window.scrollY > 12) nav.classList.add("scrolled"); else nav.classList.remove("scrolled");
    if (!spyHost) return;
    var navLinkEls = [].slice.call(spyHost.querySelectorAll('a[href^="#"]'));
    var spySections = navLinkEls
      .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
      .filter(Boolean);
    if (!spySections.length) return;
    var navH = nav.offsetHeight || 66;
    var y = window.scrollY + navH + 24;
    // Near the very bottom of the page, force the last section active even
    // if its own content is shorter than the threshold above — otherwise a
    // short final section (e.g. Contact) never "wins" scroll-spy.
    var atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    var current = atBottom ? spySections[spySections.length - 1] : spySections[0];
    if (!atBottom) spySections.forEach(function (sec) { if (sec.offsetTop <= y) current = sec; });
    navLinkEls.forEach(function (a) {
      a.classList.toggle("active", document.getElementById(a.getAttribute("href").slice(1)) === current);
    });
  }
  window.addEventListener("scroll", onScrollTick, { passive: true });
  onScrollTick();

  // Mobile menu: click-outside backdrop, body-scroll lock while open,
  // Escape to close, hamburger<->X icon — the menu itself (position,
  // animation) is styled in style.css under the mobile breakpoint.
  var ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  if (navToggle && navLinks) {
    var navBackdrop = document.createElement("div");
    navBackdrop.className = "nav-backdrop";
    document.body.appendChild(navBackdrop);

    var setNavOpen = function (open) {
      navLinks.classList.toggle("open", open);
      navBackdrop.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.innerHTML = open ? ICON_CLOSE : ICON_MENU;
      root.classList.toggle("nav-open-lock", open);
      // Position the dropdown/backdrop right below the real header instead
      // of a hardcoded pixel guess — the header's total height varies by
      // page (a sub-nav row adds ~44px, and not every page has one), so a
      // fixed value drifts out of sync the moment a page's header shape
      // changes. style.css still ships a same-value fallback for the brief
      // instant before this runs.
      if (open) {
        var navH = nav.offsetHeight + "px";
        navLinks.style.top = navH;
        navBackdrop.style.top = navH;
      }
    };
    navToggle.addEventListener("click", function () {
      setNavOpen(!navLinks.classList.contains("open"));
    });
    navBackdrop.addEventListener("click", function () { setNavOpen(false); });
    navLinks.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setNavOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navLinks.classList.contains("open")) setNavOpen(false);
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

  /* ---------- Self-assessment (15-question decision-effectiveness score) ----------
     Deliberately scoped to .assess / .aseg so it never touches the tier
     diagnostic's .seg[data-q] wiring above, even though both reuse the same
     .seg button styling. Each question is a 0-3 frequency answer (Rarely..
     Always); the sum normalizes to the same 0-100 scale Bain & Company uses
     in the cited research (see .ar-bench in the HTML), so the score is
     directly comparable to their published benchmarks — not an arbitrary
     0-100 Arbitara made up. */
  (function () {
    var assessEl = document.querySelector(".assess");
    if (!assessEl) return;
    var fill = document.getElementById("assessFill");
    var scoreEl = document.getElementById("assessScore");
    var noteEl = document.getElementById("assessNote");
    var total = assessEl.querySelectorAll(".assess-q").length;
    var PER_Q_MAX = 3;
    var answers = {};

    var DEFAULT_NOTE = noteEl.textContent;
    var BANDS = [
      { max: 30, cls: "danger", label: "Ad hoc",
        note: "Decisions happen, but mostly invisibly — reasoning, ownership, and follow-up live in people's heads, not the organization. That's the default for most organizations that haven't made decision management a discipline yet, not a judgment." },
      { max: 55, cls: "warn", label: "Emerging",
        note: "Some structure exists, applied inconsistently. Real gaps remain in how decisions get made, governed, or remembered — not a crisis, but compounding." },
      { max: 75, cls: "accent", label: "Systematic",
        note: "Decisions are generally well-managed. The remaining gaps are the ones that are cheapest to close now and most expensive to ignore." },
      { max: 100, cls: "good", label: "Leading",
        note: "That's rare — most organizations we talk to score well below this. Whatever keeps decisions visible, owned, and documented here, it's working." }
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
      var raw = 0;
      Object.keys(answers).forEach(function (k) { raw += answers[k]; });
      var score = Math.round((raw / (total * PER_Q_MAX)) * 100);
      var band = BANDS.filter(function (b) { return score <= b.max; })[0];
      fill.style.width = score + "%";
      fill.style.background = "var(--" + band.cls + ")";
      scoreEl.textContent = score + " / 100 — " + band.label;
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
     Lead sender — shared by the coming-soon screen and the contact form, so
     every capture point on the site writes to the one list, not several.
     ========================================================================== */
  (function initLeadSender() {

    var LEAD_ENDPOINT = "https://arbitara-admin.slava-satanovsky.workers.dev/lead";

    // Accepts either a plain email string (the coming-soon screen's use) or
    // a full lead object (name, email, interest, source — the contact
    // form's use).
    function send(payload) {
      var body = typeof payload === "string" ? { email: payload, source: "arbitara.com waitlist" } : payload;
      body = Object.assign({ name: body.name || "", page: location.href }, body);
      return fetch(LEAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body)
      }).then(function (r) { if (!r.ok) throw new Error("bad status " + r.status); return r; });
    }

    window.ARB_WAITLIST_SEND = send;
    window.ARB_SUBMIT_LEAD = send;
  })();

  /* ==========================================================================
     Decision Governance carousel — only exists in the DOM when config.js has
     built it (config.sections.governance === true), so this just wires
     behavior onto whatever it finds; nothing to do when it's absent.
     ========================================================================== */
  (function initGovernanceCarousel() {
    function boot() {
      var root = document.getElementById("governanceCarousel");
      if (!root) return;
      var track = root.querySelector(".carousel-track");
      var slides = [].slice.call(root.querySelectorAll(".carousel-slide"));
      var dots = [].slice.call(root.querySelectorAll(".carousel-dots button"));
      var prevBtn = root.querySelector(".carousel-btn.prev");
      var nextBtn = root.querySelector(".carousel-btn.next");
      var n = slides.length;
      if (!track || !n) return;

      var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var index = 0;
      var timer = null;
      var userInteracted = false;
      var AUTOPLAY_MS = 7000;

      function render() {
        track.style.transform = "translateX(-" + (index * 100) + "%)";
        dots.forEach(function (d, i) { d.setAttribute("aria-current", i === index ? "true" : "false"); });
      }

      function goTo(i, manual) {
        index = ((i % n) + n) % n;
        if (manual) { userInteracted = true; stop(); }
        render();
      }

      function next(manual) { goTo(index + 1, manual); }
      function prev(manual) { goTo(index - 1, manual); }

      function start() {
        if (reduceMotion || userInteracted || n < 2) return;
        stop();
        timer = setInterval(function () { next(false); }, AUTOPLAY_MS);
      }
      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
      }

      prevBtn && prevBtn.addEventListener("click", function () { prev(true); });
      nextBtn && nextBtn.addEventListener("click", function () { next(true); });
      dots.forEach(function (d, i) {
        d.addEventListener("click", function () { goTo(i, true); });
      });

      root.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); prev(true); }
        else if (e.key === "ArrowRight") { e.preventDefault(); next(true); }
      });

      root.addEventListener("mouseenter", stop);
      root.addEventListener("mouseleave", function () { if (!userInteracted) start(); });
      root.addEventListener("focusin", stop);
      root.addEventListener("focusout", function () { if (!userInteracted) start(); });

      // Touch swipe
      var touchStartX = null, touchStartY = null, dragging = false;
      track.addEventListener("touchstart", function (e) {
        var t = e.touches[0];
        touchStartX = t.clientX; touchStartY = t.clientY; dragging = false;
      }, { passive: true });
      track.addEventListener("touchmove", function (e) {
        if (touchStartX == null) return;
        var t = e.touches[0];
        var dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
        if (!dragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) dragging = true;
        if (dragging) e.preventDefault();
      }, { passive: false });
      track.addEventListener("touchend", function (e) {
        if (touchStartX == null) return;
        var t = e.changedTouches[0];
        var dx = t.clientX - touchStartX;
        if (dragging && Math.abs(dx) > 40) { dx < 0 ? next(true) : prev(true); }
        touchStartX = null; touchStartY = null; dragging = false;
      });

      render();
      start();
    }

    if (window.ARB_READY && typeof window.ARB_READY.then === "function") {
      window.ARB_READY.then(boot);
    } else {
      boot();
    }
  })();

  /* ==========================================================================
     "What Arbitara is" — each framework step and platform block reveals a
     brief explanation right below its panel when clicked (and hides again
     when clicked a second time). Static markup, so no ARB_READY needed.
     ========================================================================== */
  (function initPlatform() {
    var sec = document.getElementById("platform");
    if (!sec) return;
    [].forEach.call(sec.querySelectorAll(".plat-panel"), function (panel) {
      var detail = panel.querySelector(".plat-detail");
      if (!detail) return;
      var chips = [].slice.call(panel.querySelectorAll("[data-note]"));
      function collapse() {
        chips.forEach(function (c) { c.classList.remove("active"); c.setAttribute("aria-expanded", "false"); });
        detail.hidden = true;
        detail.innerHTML = "";
      }
      chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          var wasActive = chip.classList.contains("active");
          collapse();
          if (wasActive) return; // second click on the same chip → close
          chip.classList.add("active");
          chip.setAttribute("aria-expanded", "true");
          detail.innerHTML = "<b>" + chip.getAttribute("data-label") + "</b> — " + chip.getAttribute("data-note");
          detail.hidden = false;
        });
      });
    });
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
      var jobTitle = (form.jobTitle.value || "").trim();
      var companySize = (form.companySize.value || "").trim();
      var message = (form.message.value || "").trim();
      var interestField = form.querySelector('input[name="interest"]:checked');
      var interest = interestField ? interestField.value : "";
      if (!name) { setMsg("Please enter your name.", true); form.name.focus(); return; }
      if (!validEmail(email)) { setMsg("Please enter a valid email address.", true); form.email.focus(); return; }
      if (!interest) { setMsg("Please choose where you're at.", true); return; }
      if (!form.consent.checked) { setMsg("Please agree to the Privacy Policy to continue.", true); form.consent.focus(); return; }
      btn.disabled = true;
      btn.textContent = "Sending…";
      var send = window.ARB_SUBMIT_LEAD || function () { return Promise.resolve(); };
      send({ name: name, email: email, jobTitle: jobTitle, companySize: companySize, interest: interest, message: message, source: "arbitara.com contact" }).then(function () {
        setMsg("Thank you. We'll be in touch.", false);
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
