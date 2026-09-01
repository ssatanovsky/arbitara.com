/* ==========================================================================
   Arbitara — investor deck carousel (investor.html only).

   The whole-page lock/reveal is handled generically by admin-edit.js's
   applyPageGate() (driven by the data-arb-page-gate / data-arb-page-locked
   / data-arb-page-gated attributes in investor.html) — this file is now
   only the deck carousel.

   It fetches the confidential deck from admin-api/worker.js's GET
   /gated-deck using the same bearer token admin-edit.js already stores
   (localStorage "arb.admin.token") — no separate login here. On success,
   renders it as a slide-by-slide carousel with pdf.js (vendored,
   assets/pdf.min.js + pdf.worker.min.js). On any failure (no token, not
   authorized, nothing uploaded yet), the static "sign in" / "no deck"
   teaser already in the page's HTML is simply left alone — this script
   never announces *why* it didn't load, so there's nothing for an
   unauthorized visitor to learn from the failure mode.

   Retries after a sign-in via the same hook the page gate uses:
   admin-edit.js dispatches "arb:gated-applied" once GET /gated-content
   resolves, whether on page load with a stored token or right after login.
   ========================================================================== */
(function () {
  "use strict";

  var ADMIN_API = "https://arbitara-admin.slava-satanovsky.workers.dev";
  var TOK = "arb.admin.token";

  // pdf.js needs its worker file's URL, and this file lives at a different
  // path locally (assets/investor.js) than on the deployed site
  // (deploy.sh flattens assets/ into the root, so it's just investor.js
  // there) — a hardcoded "assets/pdf.worker.min.js" 404s once deployed,
  // which pdf.js fails on silently (no console error, carousel just never
  // renders — exactly the bug this comment is here to stop someone from
  // reintroducing). Derive it from *this script's own* URL instead, so it's
  // correct in both places: swap "investor.js" for "pdf.worker.min.js" in
  // the same directory. document.currentScript is only valid during this
  // synchronous top-level run, so it's captured here, not inside a callback.
  var WORKER_SRC = (function () {
    var src = document.currentScript && document.currentScript.src;
    return src ? src.replace(/investor\.js(\?.*)?$/, "pdf.worker.min.js") : "pdf.worker.min.js";
  })();

  function ls(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }

  // ---------- deck carousel ----------
  var host = document.getElementById("deckCarousel");
  if (!host) return;

  var ICON_PREV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

  var loaded = false;
  function loadDeck() {
    if (loaded) return;
    var token = ls(TOK);
    if (!token) return;
    fetch(ADMIN_API + "/gated-deck", { headers: { Authorization: "Bearer " + token } })
      .then(function (r) { if (!r.ok) throw new Error("no access"); return r.arrayBuffer(); })
      .then(function (buf) {
        if (!window.pdfjsLib) throw new Error("pdf.js not loaded");
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        return window.pdfjsLib.getDocument({ data: buf }).promise;
      })
      .then(function (pdf) { loaded = true; buildCarousel(pdf); })
      .catch(function () { /* leave the static teaser in place */ });
  }

  function buildCarousel(pdf) {
    var total = pdf.numPages;
    var current = 0;
    var renderToken = 0; // guards against a slow render landing after a newer one starts

    host.innerHTML =
      '<div class="deck-viewer">' +
        '<button type="button" class="deck-nav prev" aria-label="Previous slide">' + ICON_PREV + "</button>" +
        '<div class="deck-stage"><canvas class="deck-canvas"></canvas></div>' +
        '<button type="button" class="deck-nav next" aria-label="Next slide">' + ICON_NEXT + "</button>" +
      "</div>" +
      '<div class="deck-controls">' +
        '<div class="deck-dots"></div>' +
        '<div class="deck-counter"><span class="deck-cur">1</span> / <span class="deck-total">' + total + "</span></div>" +
      "</div>";

    var canvas = host.querySelector(".deck-canvas");
    var ctx = canvas.getContext("2d");
    var dotsHost = host.querySelector(".deck-dots");
    var curEl = host.querySelector(".deck-cur");
    var prevBtn = host.querySelector(".prev");
    var nextBtn = host.querySelector(".next");

    var dots = [];
    for (var i = 0; i < total; i++) {
      (function (idx) {
        var d = document.createElement("button");
        d.type = "button";
        d.className = "deck-dot";
        d.setAttribute("aria-label", "Go to slide " + (idx + 1));
        d.addEventListener("click", function () { goTo(idx); });
        dotsHost.appendChild(d);
        dots.push(d);
      })(i);
    }

    function renderPage(i) {
      var myToken = ++renderToken;
      pdf.getPage(i + 1).then(function (page) {
        var stageWidth = host.querySelector(".deck-stage").clientWidth || 900;
        var baseViewport = page.getViewport({ scale: 1 });
        var scale = Math.min(stageWidth / baseViewport.width, 2.4);
        var dpr = window.devicePixelRatio || 1;
        var viewport = page.getViewport({ scale: scale * dpr });
        if (myToken !== renderToken) return; // a newer slide was requested meanwhile
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = (viewport.width / dpr) + "px";
        canvas.style.height = (viewport.height / dpr) + "px";
        page.render({ canvasContext: ctx, viewport: viewport });
      });
    }

    function goTo(i) {
      current = Math.max(0, Math.min(total - 1, i));
      renderPage(current);
      curEl.textContent = current + 1;
      dots.forEach(function (d, idx) { d.classList.toggle("on", idx === current); });
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === total - 1;
    }

    prevBtn.addEventListener("click", function () { goTo(current - 1); });
    nextBtn.addEventListener("click", function () { goTo(current + 1); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") goTo(current - 1);
      else if (e.key === "ArrowRight") goTo(current + 1);
    });

    var touchStartX = null;
    var stage = host.querySelector(".deck-stage");
    stage.addEventListener("touchstart", function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (touchStartX == null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
      touchStartX = null;
    }, { passive: true });

    window.addEventListener("resize", function () { renderPage(current); });

    goTo(0);
  }

  document.addEventListener("arb:gated-applied", loadDeck);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadDeck);
  else loadDeck();
})();
