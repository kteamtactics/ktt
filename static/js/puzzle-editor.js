/* KTT owner mode: set up a puzzle (map, operatives with their profiles, positions)
   and record the winning line by playing it on the board.
   KTT.pzeditor.load(play) / KTT.pzeditor.get() */
(function () {
  "use strict";
  var KTT = window.KTT = window.KTT || {};
  var B = KTT.board, MAPS = window.KTT_MAPS || {}, TEAMS = window.KTT_TEAMS || [];
  var root = document.getElementById("o-pzwrap");
  if (!root) return;
  var play, placing = null, rec = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function teamOptions(v) {
    return '<option value="">—</option>' + TEAMS.map(function (t) { return '<option value="' + esc(t.slug) + '"' + (t.slug === v ? " selected" : "") + ">" + esc(t.name) + "</option>"; }).join("");
  }
  function map() { return MAPS[play.map] || MAPS[Object.keys(MAPS)[0]]; }
  function lines(v) { return (v || []).map(String).join("\n"); }
  function unlines(v) { return v.split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }

  function load(p) {
    play = JSON.parse(JSON.stringify(p || {}));
    play.map = play.map && MAPS[play.map] ? play.map : (MAPS["puzzle-1"] ? "puzzle-1" : Object.keys(MAPS)[0]);
    play.sides = play.sides || { A: {}, B: {} };
    play.sides.A = play.sides.A || {}; play.sides.B = play.sides.B || {};
    play.units = play.units || [];
    play.solution = play.solution || [];
    placing = null; rec = null;
    render();
  }

  function render() {
    var h = '<div class="pz-ed">';
    h += '<h3 class="label" style="color:var(--text)">1. The board</h3><div class="row">';
    h += '<label>Map<select id="pe-map">' + Object.keys(MAPS).map(function (k) { return '<option value="' + esc(k) + '"' + (k === play.map ? " selected" : "") + ">" + esc(MAPS[k].name || k) + "</option>"; }).join("") + "</select></label>";
    h += '</div><div class="row">';
    h += '<label>Your side: team<select id="pe-ta">' + teamOptions(play.sides.A.team) + '</select></label><label>Player (the winner)<input id="pe-pa" value="' + esc(play.sides.A.player || "") + '" placeholder="Nick"></label>';
    h += '</div><div class="row">';
    h += '<label>Opponent: team<select id="pe-tb">' + teamOptions(play.sides.B.team) + '</select></label><label>Player<input id="pe-pb" value="' + esc(play.sides.B.player || "") + '" placeholder="James"></label>';
    h += "</div>";

    h += '<h3 class="label" style="color:var(--text);margin-top:20px">2. The operatives</h3>';
    h += '<p class="small">One block per operative still on the board. <b>Weapons</b>: one per line, written <code>Name | melee</code> or <code>Name | ranged | rules</code> (in the rules, <code>Torrent 2"</code> lets it hit other targets within 2" of the first one, <code>Salvo</code> lets it pick several targets anywhere, <code>Salvo 3</code> up to 3). Without weapons, the operative can still Fight and Shoot. <b>Other actions</b> (ploys, unique actions): one per line, <code>Name | AP</code>. To place an operative, click <b>Place on the board</b>, then click on the board: it goes to the centre of the square (hold Shift to place it exactly where you click).</p>';
    play.units.forEach(function (u, i) {
      h += '<div class="pz-unit" data-i="' + i + '">';
      h += '<div class="row"><label style="max-width:90px">Code<input data-f="id" value="' + esc(u.id) + '" maxlength="3"></label><label style="flex:3">Name<input data-f="name" value="' + esc(u.name || "") + '"></label>';
      h += '<label style="max-width:120px">Side<select data-f="side"><option value="A"' + (u.side !== "B" ? " selected" : "") + '>Yours</option><option value="B"' + (u.side === "B" ? " selected" : "") + ">Opponent</option></select></label></div>";
      h += '<div class="row"><label>APL<input data-f="apl" type="number" min="1" max="5" value="' + esc(u.apl || "") + '"></label><label>Move (")<input data-f="move" type="number" min="1" max="12" value="' + esc(u.move || "") + '"></label><label>Wounds<input data-f="wounds" type="number" min="1" max="40" value="' + esc(u.wounds || "") + '"></label>';
      if (u.side !== "B") h += '<label class="o-check" style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" data-f="control"' + (u.control ? " checked" : "") + "> The reader plays it</label>";
      h += "</div>";
      var on = u.bonus_on || [];
      h += '<div class="row" style="align-items:center;justify-content:flex-start;gap:10px"><label style="max-width:150px">Extra AP<input data-f="bonus_ap" type="number" min="0" max="3" value="' + esc(u.bonus_ap || "") + '" placeholder="0"></label><span class="small">after its first</span>' +
        ["charge", "fight", "shoot"].map(function (t) { return '<label class="o-check" style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" data-on="' + t + '"' + (on.indexOf(t) !== -1 ? " checked" : "") + "> " + t.charAt(0).toUpperCase() + t.slice(1) + "</label>"; }).join("") +
        '<span class="small">(e.g. Wrecka Krew: +1 AP after its first Charge, Fight or Shoot)</span></div>';
      h += '<div class="row"><label style="flex:2">Weapons<textarea data-f="weapons" rows="2" placeholder="Big choppa | melee&#10;Kustom shoota | ranged | Torrent 2&quot;">' + esc(lines(u.weapons)) + '</textarea></label><label>Other actions<textarea data-f="actions" rows="2" placeholder="Waaagh! | 0">' + esc(lines(u.actions)) + "</textarea></label></div>";
      h += '<div class="row" style="justify-content:flex-start"><button class="btn sm' + (placing === i ? "" : " ghost") + '" type="button" data-place="' + i + '">' + (placing === i ? "Click on the board…" : "Place on the board") + '</button><span class="small">' + (u.at ? "On " + esc(Array.isArray(u.at) ? B.cellName(map(), u.at) : u.at) : "Not placed yet") + '</span><span style="flex:1"></span><button class="btn sm ghost" type="button" data-del="' + i + '">Remove</button></div>';
      h += "</div>";
    });
    h += '<button class="btn sm ghost" type="button" id="pe-add">Add an operative</button>';
    h += '<div class="o-mapprev" id="pe-board" style="margin-top:12px"></div>';

    h += '<h3 class="label" style="color:var(--text);margin-top:20px">3. The winning line</h3>';
    if (rec) {
      h += '<p class="small">Play the line of the real game. Activate the operatives in the order of the game (the opponent\'s too, if they act in between), do each action, and say who is incapacitated after each attack. Then <b>Keep this line</b>.</p>';
      h += '<div id="pe-rec"></div><div class="row" style="margin-top:10px"><button class="btn" type="button" id="pe-keep">Keep this line</button><button class="btn ghost" type="button" id="pe-cancel">Cancel</button></div>';
    } else {
      h += solutionHtml();
      h += '<div class="row" style="justify-content:flex-start"><button class="btn sm" type="button" id="pe-record">' + (play.solution.length ? "Record the line again" : "Record the line") + '</button>' + (play.solution.length ? '<button class="btn sm ghost" type="button" id="pe-try">Try it as a reader</button>' : "") + "</div>";
      h += '<div id="pe-trybox"></div>';
    }
    h += "</div>";
    root.innerHTML = h;
    drawBoard();
    if (rec) {
      rec = KTT.puzzle.mount($("pe-rec"), data(), { mode: "record" });
    }
  }
  function data() {
    var m = map();
    return { mapData: m, sides: sidesWithNames(), units: play.units.filter(function (u) { return u.id && u.at; }), solution: play.solution, question: "Record the line", tp: "", inch: play.inch, base: play.base };
  }
  function sidesWithNames() {
    var out = {};
    ["A", "B"].forEach(function (k) {
      var sd = play.sides[k] || {}, t = TEAMS.filter(function (x) { return x.slug === sd.team; })[0];
      out[k] = { player: sd.player || "", name: t ? t.name : "" };
    });
    return out;
  }
  function solutionHtml() {
    if (!play.solution.length) return '<p class="small">No line recorded yet.</p>';
    var names = {}; play.units.forEach(function (u) { names[String(u.id)] = u.name || u.id; });
    var h = '<ol class="small" style="margin:0 0 10px;padding-left:20px;color:var(--text)">';
    play.solution.forEach(function (a) {
      h += "<li><b>" + esc(names[String(a.unit)] || a.unit) + "</b>: " + esc((a.actions || []).map(function (x) {
        var n = { reposition: "Reposition", dash: "Dash", charge: "Charge", fall_back: "Fall Back", fight: "Fight", shoot: "Shoot", custom: x.name }[x.type] || x.type;
        if (x.target) n += " " + (names[String(x.target)] || x.target);
        if (x.targets) n += " " + x.targets.map(function (t) { return names[String(t)] || t; }).join(", ");
        if (x.kills && x.kills.length) n += " (kills " + x.kills.map(function (t) { return names[String(t)] || t; }).join(", ") + ")";
        return n;
      }).join(" → ")) + "</li>";
    });
    return h + "</ol>";
  }
  function drawBoard() {
    var m = map(), s = { pos: {}, dead: {}, captured: {}, side: {}, name: {}, paths: [], shots: [], fights: [], killed: {}, active: {}, newCapture: {} };
    play.units.forEach(function (u) {
      if (!u.id || !u.at) return;
      var k = String(u.id); s.pos[k] = B.toPos(m, u.at); s.side[k] = u.side === "B" ? "B" : "A"; s.name[k] = u.name || k;
    });
    if (placing != null && play.units[placing]) s.active[String(play.units[placing].id)] = true;
    $("pe-board").innerHTML = B.drawScene({ mapData: m, units: [], sides: {}, sprites: false }, s, "pe");
  }
  function readUnits() {
    root.querySelectorAll(".pz-unit").forEach(function (el) {
      var u = play.units[+el.getAttribute("data-i")];
      el.querySelectorAll("[data-f]").forEach(function (f) {
        var k = f.getAttribute("data-f"), v = f.type === "checkbox" ? f.checked : f.value.trim();
        if (k === "weapons" || k === "actions") v = unlines(f.value);
        if (k === "apl" || k === "move" || k === "wounds" || k === "bonus_ap") v = v === "" ? "" : +v;
        if (k === "id") v = v.toUpperCase();
        if (v === "" || v === false || (Array.isArray(v) && !v.length)) delete u[k]; else u[k] = v;
      });
      var on = [].slice.call(el.querySelectorAll("[data-on]")).filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute("data-on"); });
      if (on.length) u.bonus_on = on; else delete u.bonus_on;
      if (!u.bonus_ap) { delete u.bonus_ap; }
      if (u.side === "B") delete u.control;
    });
    play.map = $("pe-map").value;
    play.sides.A.team = $("pe-ta").value; play.sides.A.player = $("pe-pa").value.trim();
    play.sides.B.team = $("pe-tb").value; play.sides.B.player = $("pe-pb").value.trim();
    ["A", "B"].forEach(function (k) { Object.keys(play.sides[k]).forEach(function (q) { if (!play.sides[k][q]) delete play.sides[k][q]; }); });
  }

  root.addEventListener("change", function (e) {
    if (rec) return;
    readUnits();
    if (e.target.id === "pe-map" || e.target.getAttribute("data-f") === "side") render(); else drawBoard();
  });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b && root.contains(b) && !b.closest("#pe-rec") && !b.closest("#pe-trybox")) {
      if (b.id !== "pe-keep" && b.id !== "pe-cancel" && !rec) readUnits();
      if (b.id === "pe-add") {
        var n = play.units.length + 1, side = play.units.filter(function (u) { return u.side !== "B"; }).length > play.units.filter(function (u) { return u.side === "B"; }).length ? "B" : "A";
        play.units.push({ id: "U" + n, name: "", side: side, control: side === "A" ? true : undefined });
        if (side === "B") delete play.units[play.units.length - 1].control;
        placing = play.units.length - 1; render(); return;
      }
      if (b.hasAttribute("data-place")) { placing = +b.getAttribute("data-place"); render(); return; }
      if (b.hasAttribute("data-del")) { play.units.splice(+b.getAttribute("data-del"), 1); placing = null; render(); return; }
      if (b.id === "pe-record") {
        var ids = play.units.map(function (u) { return u.id; });
        if (!play.units.length || play.units.some(function (u) { return !u.id || !u.at; })) { alertMsg("Give every operative a code and place it on the board first."); return; }
        if (ids.some(function (x, i) { return ids.indexOf(x) !== i; })) { alertMsg("Two operatives use the same code."); return; }
        rec = true; render(); return;
      }
      if (b.id === "pe-keep") { play.solution = rec.solution(); rec = null; render(); return; }
      if (b.id === "pe-cancel") { rec = null; render(); return; }
      if (b.id === "pe-try") {
        var d = data(); d.question = "Find " + (play.sides.A.player || "the winner") + "'s line"; d.units = play.units;
        KTT.puzzle.mount($("pe-trybox"), d, {});
        return;
      }
    }
    var svg = e.target.closest("#pe-board svg");
    if (svg && placing != null) {
      var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      var p = pt.matrixTransform(svg.getScreenCTM().inverse()), m = map();
      if (p.x < 0 || p.y < 0 || p.x > m.w || p.y > m.h) return;
      play.units[placing].at = m.kind === "grid" ? B.cellName(m, [p.x, p.y]) : [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
      if (e.shiftKey) play.units[placing].at = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
      placing = null; render();
    }
  });
  function alertMsg(t) {
    var el = $("pe-msg");
    if (!el) { el = document.createElement("p"); el.id = "pe-msg"; el.className = "small"; el.style.color = "var(--or)"; root.appendChild(el); }
    el.textContent = t;
  }

  KTT.pzeditor = {
    load: load,
    get: function () {
      if (!rec) readUnits();
      var out = JSON.parse(JSON.stringify(play));
      if (!out.solution.length) delete out.solution;
      out.units.forEach(function (u) { Object.keys(u).forEach(function (k) { if (u[k] == null || u[k] === "") delete u[k]; }); });
      return out;
    }
  };
})();
