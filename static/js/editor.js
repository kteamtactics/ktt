/* KTT board editor (owner mode): edits the "scene" of an article. Nothing is sent anywhere by itself. */
(function () {
  "use strict";
  if (!document.getElementById("editor")) return;
  var B = window.KTT.board, MAPS = window.KTT_MAPS || {}, BASE = window.KTT_BASE || "../";
  var $ = function (id) { return document.getElementById(id); };
  var scene, cur = -1, tool = null, pick = null, listeners = [];

  function blank() {
    return { map: Object.keys(MAPS)[0], mode: "moments", sides: { A: {}, B: {} }, objectives: [], units: [], steps: [] };
  }
  function map() { return MAPS[scene.map]; }
  function changed() { listeners.forEach(function (f) { f(); }); }
  function snapPos(p) {
    if ($("ed-snap").checked) return B.cellName(map(), p);
    return [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
  }
  function svgPoint(evt) {
    var svg = $("ed-board").querySelector("svg");
    var pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    var p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [p.x, p.y];
  }
  function unitAt(p, st) {
    var best = null, bd = 0.9;
    Object.keys(st.pos).forEach(function (id) {
      if (st.dead[id]) return;
      var q = st.pos[id], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < bd) { bd = d; best = id; }
    });
    return best;
  }
  function step() { return scene.steps[cur]; }
  function push(key, val) { var s = step(); (s[key] = s[key] || []).push(val); }
  function full() {
    var f = JSON.parse(JSON.stringify(scene));
    f.mapData = map();
    ["A", "B"].forEach(function (k) { var t = (f.sides[k] || {}).team; if (t) f.sides[k].sprite = BASE + "img/teams/" + t + ".svg"; });
    return f;
  }
  function draw() {
    var f = full(), st = B.stateAt(f, cur);
    $("ed-board").innerHTML = '<div class="gb" style="max-width:none"><div class="gb-screen">' + B.drawScene(f, st, "ed-") + "</div></div>";
  }
  function hint(t) { $("ed-hint").textContent = t; }

  function renderLists() {
    var u = $("ed-units"); u.innerHTML = "";
    scene.units.forEach(function (x, i) {
      var row = document.createElement("div"); row.className = "row"; row.style.flexWrap = "nowrap";
      var b = document.createElement("button");
      b.type = "button"; b.style.flex = "1";
      b.textContent = x.id + " · " + (x.side === "B" ? "B" : "A") + " · " + (x.name || "") + " · " + (Array.isArray(x.at) ? x.at.join(", ") : x.at || "not placed");
      b.addEventListener("click", function () { tool = "place"; pick = x.id; hint("Click where " + x.id + " is deployed."); });
      var del = document.createElement("button");
      del.type = "button"; del.textContent = "✕"; del.style.flex = "0 0 40px"; del.setAttribute("aria-label", "Remove " + x.id);
      del.addEventListener("click", function () { scene.units.splice(i, 1); refresh(); });
      row.appendChild(b); row.appendChild(del); u.appendChild(row);
    });
    var s = $("ed-steps"); s.innerHTML = "";
    var dep = document.createElement("button");
    dep.type = "button"; dep.className = cur === -1 ? "on" : ""; dep.textContent = scene.mode === "puzzle" ? "0. Starting position" : "0. Deployment";
    dep.addEventListener("click", function () { cur = -1; refresh(); });
    s.appendChild(dep);
    scene.steps.forEach(function (x, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = i === cur ? "on" : "";
      b.textContent = (i + 1) + ". " + (x.title || x.label || x.action || "(no title)");
      b.addEventListener("click", function () { cur = i; refresh(); });
      s.appendChild(b);
    });
    var st = step() || {};
    $("ed-step").hidden = cur < 0;
    $("ed-slabel").value = st.label || ""; $("ed-stitle").value = st.title || ""; $("ed-stext").value = st.text || "";
    $("ed-svp").value = st.vp || ""; $("ed-saction").value = st.action || ""; $("ed-sunit").value = st.unit || ""; $("ed-shint").value = st.hint || "";
    document.querySelectorAll("#editor [data-puzzle]").forEach(function (el) { el.hidden = scene.mode !== "puzzle"; });
    document.querySelectorAll("#editor [data-nopuzzle]").forEach(function (el) { el.hidden = scene.mode === "puzzle"; });
  }
  function fields() {
    $("ed-map").value = scene.map; $("ed-mode").value = scene.mode || "moments"; $("ed-title").value = scene.title || "";
    $("ed-deploy").value = scene.deployment || "";
    $("ed-goal").value = scene.goal || ""; $("ed-vpgoal").value = scene.vp_goal || ""; $("ed-question").value = scene.question || "";
    $("ed-ta").value = (scene.sides.A || {}).team || ""; $("ed-pa").value = (scene.sides.A || {}).player || "";
    $("ed-tb").value = (scene.sides.B || {}).team || ""; $("ed-pb").value = (scene.sides.B || {}).player || "";
  }
  function refresh() {
    if (cur >= scene.steps.length) cur = scene.steps.length - 1;
    renderLists(); draw(); changed();
  }
  function setField(key, val) { if (val === "" || val == null) delete scene[key]; else scene[key] = val; }

  function bind(id, ev, fn) { $(id).addEventListener(ev, fn); }
  bind("ed-map", "change", function () { scene.map = this.value; refresh(); });
  bind("ed-mode", "change", function () { scene.mode = this.value; refresh(); });
  bind("ed-title", "input", function () { setField("title", this.value); changed(); });
  bind("ed-deploy", "input", function () { setField("deployment", this.value); changed(); });
  bind("ed-goal", "input", function () { setField("goal", this.value); changed(); });
  bind("ed-vpgoal", "input", function () { setField("vp_goal", +this.value || ""); changed(); });
  bind("ed-question", "input", function () { setField("question", this.value); changed(); });
  [["ed-ta", "A", "team"], ["ed-pa", "A", "player"], ["ed-tb", "B", "team"], ["ed-pb", "B", "player"]].forEach(function (f) {
    bind(f[0], f[0].indexOf("-t") > 0 ? "change" : "input", function () {
      var sd = scene.sides[f[1]] = scene.sides[f[1]] || {};
      if (this.value) sd[f[2]] = this.value; else delete sd[f[2]];
      if (f[2] === "team") refresh(); else changed();
    });
  });
  bind("ed-uadd", "click", function () {
    var id = $("ed-uid").value.trim().toUpperCase();
    if (!id) { hint("Give the operative a short code first (2 or 3 letters)."); return; }
    if (scene.units.some(function (u) { return String(u.id) === id; })) { hint("That code is already used."); return; }
    var m = map();
    scene.units.push({ id: id, side: $("ed-uside").value, name: $("ed-uname").value.trim() || id, at: snapPos([m.w / 2, m.h / 2]) });
    $("ed-uid").value = ""; $("ed-uname").value = "";
    cur = -1; tool = "place"; pick = id; hint("Click on the map to deploy " + id + ".");
    refresh();
  });
  bind("ed-sadd", "click", function () { scene.steps.splice(cur + 1, 0, { label: "" }); cur++; refresh(); });
  bind("ed-sdel", "click", function () { if (cur >= 0) { scene.steps.splice(cur, 1); cur--; refresh(); } });
  bind("ed-sclear", "click", function () { var s = step(); if (!s) return; ["setup", "removed", "moves", "shots", "fights", "kills", "captured"].forEach(function (k) { delete s[k]; }); refresh(); });
  [["ed-slabel", "label"], ["ed-stitle", "title"], ["ed-stext", "text"], ["ed-shint", "hint"]].forEach(function (f) {
    bind(f[0], "input", function () {
      var s = step(); if (!s) return;
      if (this.value) s[f[1]] = this.value; else delete s[f[1]];
      var btns = $("ed-steps").querySelectorAll("button");
      if (btns[cur + 1]) btns[cur + 1].textContent = (cur + 1) + ". " + (s.title || s.label || s.action || "(no title)");
      changed();
    });
  });
  bind("ed-saction", "change", function () { var s = step(); if (!s) return; if (this.value) s.action = this.value; else delete s.action; refresh(); });
  bind("ed-sunit", "input", function () { var s = step(); if (!s) return; var v = this.value.trim().toUpperCase(); if (v) s.unit = v; else delete s.unit; changed(); });
  bind("ed-svp", "input", function () { var s = step(); if (!s) return; var v = +this.value; if (v) s.vp = v; else delete s.vp; refresh(); });
  document.querySelectorAll("#editor [data-tool]").forEach(function (b) {
    b.addEventListener("click", function () {
      tool = b.getAttribute("data-tool"); pick = null;
      document.querySelectorAll("#editor [data-tool]").forEach(function (x) { x.classList.toggle("ghost", x !== b); });
      if (tool === "place") { cur = -1; refresh(); }
      if (["move", "shoot", "fight", "kill", "capture", "setup"].indexOf(tool) !== -1 && cur < 0) { hint("Select or add a step first."); return; }
      hint({
        place: "Click an operative, then where it is deployed.", obj: "Click where the objective is.",
        move: "Click an operative, then each point of its path.", shoot: "Click the shooter, then its target.",
        fight: "Click the attacker, then its target.", kill: "Click the operative that dies in this step.",
        capture: "Click the objective scored in this step.", setup: "Click an operative, then where it is now (no arrow)."
      }[tool]);
    });
  });
  $("ed-board").addEventListener("click", function (e) {
    if (!e.target.closest("svg") || !tool) return;
    var p = svgPoint(e), st = B.stateAt(full(), cur), hit = unitAt(p, st);
    if (tool === "obj") { scene.objectives = scene.objectives || []; scene.objectives.push(snapPos(p)); refresh(); return; }
    if (tool === "place") {
      if (!pick) { if (hit) { pick = hit; hint("Now click where " + hit + " is deployed."); } return; }
      var u = scene.units.filter(function (x) { return String(x.id) === pick; })[0];
      if (u) u.at = snapPos(p);
      pick = null; hint("Deployed. Click another operative to move it."); refresh(); return;
    }
    if (!step()) { hint("Select or add a step first."); return; }
    if (tool === "capture") {
      var best = null, bd = 1.2;
      B.objectivesOf(full()).forEach(function (o) { var q = B.toPos(map(), o); if (!q) return; var d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = o; } });
      if (best != null) { push("captured", best); refresh(); }
      return;
    }
    if (tool === "kill") { if (hit) { push("kills", hit); refresh(); } return; }
    if (tool === "move" || tool === "setup") {
      if (!pick) { if (hit) { pick = hit; hint("Now click the destination of " + hit + ". Keep clicking to add points; choose a tool again to stop."); } return; }
      var sp = snapPos(p);
      push(tool === "move" ? "moves" : "setup", Array.isArray(sp) ? [pick, sp[0], sp[1]] : [pick, sp]);
      refresh(); return;
    }
    if (tool === "shoot" || tool === "fight") {
      if (!pick) { if (hit) { pick = hit; hint("Now click the target of " + hit + "."); } return; }
      if (hit && hit !== pick) { push(tool === "shoot" ? "shots" : "fights", [pick, hit]); pick = null; hint("Done. Click another attacker."); refresh(); }
    }
  });

  window.KTT.editor = {
    load: function (s) {
      scene = Object.assign(blank(), JSON.parse(JSON.stringify(s || {})));
      if (!MAPS[scene.map]) scene.map = Object.keys(MAPS)[0];
      scene.sides = scene.sides || { A: {}, B: {} }; scene.sides.A = scene.sides.A || {}; scene.sides.B = scene.sides.B || {};
      scene.units = scene.units || []; scene.steps = scene.steps || [];
      if (!scene.objectives || !scene.objectives.length) delete scene.objectives;
      scene.units.forEach(function (u) { u.id = String(u.id); });
      cur = -1; tool = null; pick = null; fields(); refresh();
    },
    get: function () {
      var s = JSON.parse(JSON.stringify(scene));
      ["A", "B"].forEach(function (k) { if (s.sides[k]) delete s.sides[k].sprite; });
      if (s.objectives && !s.objectives.length) delete s.objectives;
      return s;
    },
    onChange: function (f) { listeners.push(f); }
  };
  window.KTT.editor.load(blank());
})();
