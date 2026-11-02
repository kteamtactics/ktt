/* KTT: menu, list filters, newsletter. */
(function () {
  "use strict";
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // mobile menu
  var btn = document.querySelector(".menu-btn"), nav = document.querySelector(".nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // grid backgrounds: stretch the squares slightly so every grid ends on a full square
  var GRID = 16;
  function fitGrid(el) {
    var w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    var cw = w / Math.max(1, Math.round(w / GRID)), ch = h / Math.max(1, Math.round(h / GRID));
    el.style.backgroundSize = cw + "px " + ch + "px";
  }
  var grids = $$(".pix");
  grids.forEach(fitGrid);
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function (entries) { entries.forEach(function (e) { fitGrid(e.target); }); });
    grids.forEach(function (el) { ro.observe(el); });
  } else {
    window.addEventListener("resize", function () { grids.forEach(fitGrid); });
  }

  // list filters: <div data-filter-list> with chips [data-tag], segmented [data-status], search [data-search]
  $$("[data-filter-list]").forEach(function (box) {
    var items = $$("[data-item]", box.parentNode);
    var empty = box.parentNode.querySelector("[data-empty]");
    var state = { tag: "all", status: box.getAttribute("data-default-status") || "all", q: "" };
    function apply() {
      var shown = 0;
      items.forEach(function (it) {
        var tags = (it.getAttribute("data-tags") || "").split("|");
        var ok = (state.tag === "all" || tags.indexOf(state.tag) !== -1) &&
          (state.status === "all" || it.getAttribute("data-status") === state.status) &&
          (!state.q || (it.getAttribute("data-name") || "").indexOf(state.q) !== -1);
        it.hidden = !ok;
        if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      $$("[data-tag]", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-tag") === state.tag ? "true" : "false"); });
      $$("[data-status]", box).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-status") === state.status ? "true" : "false"); });
    }
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-tag")) state.tag = b.getAttribute("data-tag");
      if (b.hasAttribute("data-status")) state.status = b.getAttribute("data-status");
      apply();
    });
    var search = box.querySelector("[data-search]");
    if (search) search.addEventListener("input", function () { state.q = search.value.trim().toLowerCase(); apply(); });
    var hash = decodeURIComponent((location.hash || "").slice(1)).toLowerCase();
    if (hash && box.querySelector('[data-tag="' + hash + '"]')) state.tag = hash;
    apply();
  });

  // newsletter while no email service is set: open the visitor's mail app
  $$("form[data-mailto]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (f.querySelector("input[type=email]") || {}).value || "";
      if (!email) return;
      var to = f.getAttribute("data-mailto");
      location.href = "mailto:" + to + "?subject=" + encodeURIComponent("KTT newsletter signup") + "&body=" + encodeURIComponent("Please add " + email + " to the KTT newsletter.");
      var done = f.parentNode.querySelector(".nl-done");
      if (done) done.hidden = false;
    });
  });
})();
