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
      what: "Anchor the decision in the strategy it is meant to serve — which priorities it advances, and which it trades against — before anything else.",
      good: "Every later step inherits a clear line back to strategic intent.",
      skip: "Decisions drift from strategy invisibly; day-to-day allocation and stated direction quietly diverge." },
    { phase: "Frame", n: 2, title: "Clarify authority", core: false,
      what: "Name the single accountable Decider, and who advises, is consulted, and is merely informed. One person owns the outcome — never a committee.",
      good: "Accountability becomes a structure, not a hope — and social conformity has less room to distort the choice.",
      skip: "Diffused ownership breeds noise; when it goes wrong, no one quite decided." },
    { phase: "Frame", n: 3, title: "State the decision", core: true,
      what: "Write the decision as a statement of what is being decided and its context — not a yes/no question that pre-narrows the options. Classify it: clear, complicated, complex, or chaotic.",
      good: "The real question is on the table, open enough that a better option can exist.",
      skip: "The wrong question is answered rigorously; a complex decision is treated as merely complicated." },
    { phase: "Structure", n: 4, title: "State assumptions", core: false,
      what: "Name the key claims about the world the decision rests on — each time-bounded, falsifiable, and given a review date — before evidence is gathered or options scored.",
      good: "The reasoning is on record and can be checked when the world changes.",
      skip: "Assumptions masquerade as facts — the Kodak failure mode, built in at the moment of choice." },
    { phase: "Structure", n: 5, title: "Generate options", core: true,
      what: "Generate genuine alternatives — including the do-nothing null option, priced with its own costs and risks — developed independently of any preferred answer.",
      good: "The best available path can actually be in the set you evaluate.",
      skip: "Goldilocks options. The proposer's pick wins by construction, and do-nothing is never priced." },
    { phase: "Structure", n: 6, title: "Set criteria", core: false,
      what: "State the criteria, weight them, and tie them to strategic priorities — before evidence is gathered. Weighted, owned, measurable.",
      good: "Similar decisions get made consistently; the basis of the choice is legible.",
      skip: "Implicit criteria produce inconsistent decisions and make organizational learning impossible." },
    { phase: "Evaluate", n: 7, title: "Gather evidence", core: false,
      what: "Gather the specific evidence needed to test the options against the criteria — from the lineage of prior decisions, the market, and the team. Targeted, not exhaustive.",
      good: "Analysis reduces uncertainty exactly where it matters to the choice.",
      skip: "Data collection expands to fill the space; evidence is gathered to confirm rather than to test. Paralysis." },
    { phase: "Evaluate", n: 8, title: "Evaluate options", core: false,
      what: "Score each alternative against the explicit, weighted criteria using the evidence gathered — the same framework applied to every option.",
      good: "The basis of the choice becomes auditable: not just what won, but why.",
      skip: "The room's social dynamics decide as much as the merits." },
    { phase: "Evaluate", n: 9, title: "Record the decision", core: true,
      what: "Record the choice, the options not taken, the criteria applied, the key assumptions, the named owner, and the date. This is the decision becoming an object.",
      good: "The decision can be audited, challenged, and learned from later.",
      skip: "It is an announcement, not a decision — the reasoning leaves when the people do." },
    { phase: "Deliver", n: 10, title: "Communicate rationale", core: true,
      what: "Transmit the decision with its reasoning — the options weighed, the assumptions it depends on, the owner to question — not just the conclusion. Write the memo, not the announcement.",
      good: "Teams execute adaptively because they understand what the direction is contingent on.",
      skip: "Teams comply with an incomplete picture; execution drifts from intent." },
    { phase: "Deliver", n: 11, title: "Implement", core: false,
      what: "Link the decision to action owners, milestones, and explicit kill criteria — the conditions under which you would stop.",
      good: "Commitment and action are connected, with a pre-agreed off-ramp.",
      skip: "The gap between deciding and doing opens; there is no trigger to halt a failing course." },
    { phase: "Deliver", n: 12, title: "Monitor outcomes", core: false,
      what: "Track actual outcomes against the predictions embedded in the decision. Review assumptions against their dates; reopen the decision when they expire. Compare ex-post to ex-ante.",
      good: "Experience becomes intelligence — the feedback loop that raises decision quality is finally closed.",
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
        html += '<div class="phase-label">' + s.phase + '</div>';
        lastPhase = s.phase;
      }
      html += '<button class="step-btn" data-i="' + i + '">' +
        '<span class="sn">' + s.n + '</span>' +
        '<span class="stext">' + s.title + '</span></button>';
    });
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
      rNote.textContent = "Where the compounding structure is present, the decision is strategic — regardless of the level at which it is being made.";
      return;
    }
    var score = answers.rev + answers.con + answers.asy;
    // Asymmetry is the strongest single signal for strategic.
    if (answers.asy === 1 || score >= 2) {
      rTier.className = "rtier s";
      rTier.textContent = "Strategic";
      rNote.textContent = "Give it the full apparatus: explicit options including do-nothing, weighted criteria, a named owner, and monitored assumptions. Getting it wrong won't just fail to create value — it will compound.";
    } else if (score === 1) {
      rTier.className = "rtier t";
      rTier.textContent = "Tactical";
      rNote.textContent = "Deliberate proportionately: surface the tradeoffs and connect them to strategic context, but keep the cycle short enough to learn from. Don't inflate it into a strategic process — that collapses the iteration that makes it work.";
    } else {
      rTier.className = "rtier o";
      rTier.textContent = "Operational";
      rNote.textContent = "This belongs at the level closest to execution, under delegated authority with clear escalation criteria. Escalating it taxes the attention that strategic questions need.";
    }
  }

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
      else if (done < total) msg.textContent = "Keep going — " + (total - done) + " to go.";
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
