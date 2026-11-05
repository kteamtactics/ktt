/* KTT puzzle engine: the reader plays one or more activations of a real game,
   with the actions of Kill Team, and tries to find the line the winner played.
   KTT.puzzle.mount(root, data, opts)
     data: { mapData, sides, units, solution, objectives, inch, base, question, winner }
     opts.mode: "play" (default) or "record" (author mode: every operative can be activated,
                kills are chosen by hand, and the line is returned by handle.solution())
     opts.onWin(), opts.onReveal(), opts.onChange()
   No dice: an attack kills only if it is what happened in the real game. */
(function () {
  "use strict";
  var KTT = window.KTT = window.KTT || {};
  var B = KTT.board;
  var uid = 0;
  var ACT = {
    reposition: { name: "Reposition", ap: 1, help: "Move up to its Move." },
    dash: { name: "Dash", ap: 1, help: "Move up to 3\"." },
    charge: { name: "Charge", ap: 1, help: "Move up to its Move + 2\" and end in control range of an enemy." },
    fall_back: { name: "Fall Back", ap: 2, help: "Leave control range of enemies, up to its Move." },
    fight: { name: "Fight", ap: 1, help: "Fight an enemy in control range." },
    shoot: { name: "Shoot", ap: 1, help: "Shoot an enemy with a ranged weapon." }
  };
  var MOVES = { reposition: 1, dash: 1, charge: 1, fall_back: 1 };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function r1(v) { return Math.round(v * 10) / 10; }
  function same(a, b) { return String(a) === String(b); }
  function sameSet(a, b) {
    a = (a || []).map(String).sort(); b = (b || []).map(String).sort();
    return a.length === b.length && a.every(function (x, i) { return x === b[i]; });
  }
  // weapons: "Name | melee" or "Name | ranged | rules". In the rules, Torrent 2" = other targets within 2" of the first one,
  // Salvo (or Salvo 3) = several targets anywhere. With no weapon of a kind, the operative still gets a plain Fight / Shoot.
  function weapons(u, real) {
    var list = (u.weapons || []).map(function (w) {
      if (typeof w !== "string") w = [w.name, w.kind, w.rules || (w.torrent ? "Torrent " + w.torrent + '"' : "")].join(" | ");
      var p = w.split("|").map(function (x) { return x.trim(); }), rules = p.slice(2).join(" ");
      var t = /torrent\s*(\d+(?:\.\d+)?)/i.exec(rules), sv = /salvo\s*(\d+)?/i.exec(rules);
      return { name: p[0], kind: /melee/i.test(p[1] || "") ? "melee" : "ranged", torrent: t ? +t[1] : 0, salvo: sv ? (+sv[1] || 99) : 0, rules: p.slice(2).join(" · ") };
    });
    if (real) return list;
    if (!list.some(function (w) { return w.kind === "melee"; })) list.push({ name: "Melee", kind: "melee", torrent: 0, salvo: 0, rules: "", plain: true });
    if (!list.some(function (w) { return w.kind === "ranged"; })) list.push({ name: "Ranged", kind: "ranged", torrent: 0, salvo: 0, rules: "", plain: true });
    return list;
  }
  function extraActions(u) {
    return (u.actions || []).map(function (a) {
      if (typeof a === "string") { var p = a.split("|").map(function (x) { return x.trim(); }); return { name: p[0], ap: p[1] === "" || p[1] == null ? 1 : +p[1] || 0 }; }
      return { name: a.name, ap: a.ap == null ? 1 : +a.ap || 0 };
    });
  }

  function mount(root, data, opts) {
    opts = opts || {};
    var record = opts.mode === "record";
    var m = data.mapData;
    if (!m) { root.innerHTML = '<p class="gb-note">Puzzle unavailable: unknown map.</p>'; return null; }
    var id = "pz" + (++uid) + "-";
    var grid = m.kind === "grid";
    var R = grid ? 0.36 : 0.48;
    var INCH = +data.inch || 1, BASE = data.base != null ? +data.base : 1;
    var units = (data.units || []).map(function (u) { return u; });
    var byId = {}; units.forEach(function (u) { byId[String(u.id)] = u; });
    var solution = record ? [] : (data.solution || []);
    var scene = { mapData: m, sides: data.sides || {}, units: units, objectives: data.objectives, sprites: false };
    var winner = (data.sides && data.sides.A && data.sides.A.player) || "the winner";

    var st, act, mode, msg, result, done, fx = false;
    function reset(noAuto) {
      st = { pos: {}, dead: {}, side: {}, name: {}, used: {}, log: [], k: 0 };
      units.forEach(function (u) {
        var k = String(u.id);
        st.pos[k] = B.toPos(m, u.at) || [0.5, 0.5];
        st.side[k] = u.side === "B" ? "B" : "A";
        st.name[k] = u.name || k;
      });
      act = null; mode = null; msg = null; result = null; done = false;
      marks = { paths: [], shots: [], fights: [], killed: {} };
      if (!record && !noAuto) autoPlay();
      render();
    }
    var marks;

    // ---------- geometry ----------
    function gap(a, b) { return Math.hypot(st.pos[a][0] - st.pos[b][0], st.pos[a][1] - st.pos[b][1]) / INCH - BASE; }
    function gapP(p, b) { return Math.hypot(p[0] - st.pos[b][0], p[1] - st.pos[b][1]) / INCH - BASE; }
    function enemies(k) { return Object.keys(st.pos).filter(function (o) { return !st.dead[o] && st.side[o] !== st.side[k]; }); }
    function inControl(k, p) { return enemies(k).filter(function (o) { return (p ? gapP(p, o) : gap(k, o)) <= 1.0001; }); }
    function cross(p1, p2, p3, p4) {
      var d = function (a, b, c) { return (c[0] - a[0]) * (b[1] - a[1]) - (b[0] - a[0]) * (c[1] - a[1]); };
      var d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
      return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    }
    function blocked(a, b) {
      if (!grid) return false;
      var hit = (m.edges || []).some(function (e) {
        if (e[3] === "c" || e[3] === "d") return false;
        var p = [e[0], e[1]], q = e[2] === "h" ? [e[0] + 1, e[1]] : [e[0], e[1] + 1];
        return cross(a, b, p, q);
      });
      if (hit) return true;
      var n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1);
      for (var i = 1; i <= n; i++) {
        var x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n;
        var row = (m.rows || [])[Math.floor(y)] || "";
        if (row.charAt(Math.floor(x)) === "#") return true;
      }
      return false;
    }
    function inside(p) { return p[0] > 0 && p[1] > 0 && p[0] < m.w && p[1] < m.h; }
    function solid(p) { return grid && ((m.rows || [])[Math.floor(p[1])] || "").charAt(Math.floor(p[0])) === "#"; }
    // length of the shortest way from a to b going around walls (in map units), Infinity if there is none
    function pathLen(a, b) {
      var d0 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!blocked(a, b)) return d0;
      var S = 0.5, W = Math.ceil(m.w / S), H = Math.ceil(m.h / S), N = W * H, i, j;
      var pos = function (n) { return [(n % W) * S + S / 2, Math.floor(n / W) * S + S / 2]; };
      var dist = new Array(N), seen = new Array(N), best = Infinity;
      for (i = 0; i < N; i++) { dist[i] = Infinity; seen[i] = solid(pos(i)); }
      for (i = 0; i < N; i++) {
        var q = pos(i), da = Math.hypot(q[0] - a[0], q[1] - a[1]);
        if (!seen[i] && da <= 1.2 && !blocked(a, q)) dist[i] = da;
      }
      var OFF = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [2, 1], [1, 2], [-2, 1], [-1, 2], [2, -1], [1, -2], [-2, -1], [-1, -2]];
      for (;;) {
        var u = -1, du = Infinity;
        for (i = 0; i < N; i++) if (!seen[i] && dist[i] < du) { du = dist[i]; u = i; }
        if (u < 0 || du >= best) break;
        seen[u] = true;
        var pu = pos(u), db = Math.hypot(b[0] - pu[0], b[1] - pu[1]);
        if (db <= 1.2 && !blocked(pu, b)) best = Math.min(best, du + db);
        var x = u % W, y = Math.floor(u / W);
        for (j = 0; j < OFF.length; j++) {
          var nx = x + OFF[j][0], ny = y + OFF[j][1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          var v = ny * W + nx; if (seen[v]) continue;
          var pv = pos(v), nd = du + Math.hypot(pv[0] - pu[0], pv[1] - pu[1]);
          if (nd < dist[v] && !blocked(pu, pv)) dist[v] = nd;
        }
      }
      return best;
    }

    // ---------- the expected line ----------
    function expected() { return solution[st.k] || null; }
    function isAuto(a) { return a && (a.auto || (byId[String(a.unit)] && byId[String(a.unit)].control === false && !record) || (byId[String(a.unit)] || {}).side === "B"); }
    function autoPlay() {
      while (!record && expected() && isAuto(expected())) {
        var a = expected();
        (a.actions || []).forEach(function (x) { applyAction(a.unit, x, true); });
        fx = true;
        st.log.push({ unit: String(a.unit), actions: a.actions || [], auto: true });
        st.k++;
      }
    }
    function matchAction(x, want) {
      if (!want || x.type !== want.type) return false;
      if (x.type === "custom") return same(x.name, want.name);
      if (want.weapon && !same(x.weapon, want.weapon)) return false;
      if (x.type === "fight" || x.type === "charge") { if (!same(x.target, want.target)) return false; }
      if (x.type === "shoot" && !sameSet(x.targets, want.targets)) return false;
      if (MOVES[x.type] && want.at && !want.any) {
        var p = B.toPos(m, want.at), tol = (want.tol != null ? +want.tol : 1.5) * INCH;
        if (Math.hypot(p[0] - x.at[0], p[1] - x.at[1]) > tol) return false;
      }
      return true;
    }
    // kills happen only when the attack is the one of the real game
    function killsFor(unit, x) {
      var e = expected();
      if (!e || !same(e.unit, unit)) return [];
      var want = (e.actions || [])[act.actions.length];
      return matchAction(x, want) ? (want.kills || []).map(String) : [];
    }

    // ---------- doing things ----------
    function applyAction(unit, x, animate) {
      unit = String(unit);
      if (MOVES[x.type]) {
        var to = B.toPos(m, x.at) || x.at;
        marks.paths.push({ id: unit, pts: [st.pos[unit].slice(), to.slice()] });
        st.pos[unit] = to.slice();
      }
      if (x.type === "fight" || x.type === "charge") {
        if (x.type === "fight") marks.fights.push({ a: unit, b: String(x.target), from: st.pos[unit].slice(), to: st.pos[String(x.target)].slice() });
      }
      if (x.type === "shoot") (x.targets || []).forEach(function (t) { if (st.pos[String(t)]) marks.shots.push({ a: unit, b: String(t), from: st.pos[unit].slice(), to: st.pos[String(t)].slice() }); });
      (x.kills || []).forEach(function (k) { k = String(k); st.dead[k] = true; marks.killed[k] = true; });
    }
    // pay the AP of an action; some operatives gain AP the first time they Charge, Fight or Shoot
    function spend(k, x) {
      act.ap -= x.ap;
      var u = byId[k], on = u.bonus_on || [];
      if (+u.bonus_ap && !act.bonus && on.indexOf(x.type) !== -1) { act.bonus = true; act.ap += +u.bonus_ap; return +u.bonus_ap; }
      return 0;
    }
    function startActivation(k) {
      if (act || done) return;
      act = { unit: k, ap: +(byId[k].apl || 2), actions: [] };
      st.used[k] = true; mode = null; msg = null; marks = { paths: [], shots: [], fights: [], killed: {} };
      render();
    }
    function can(type, w) {
      if (!act) return "";
      var k = act.unit, u = byId[k], did = act.actions.map(function (x) { return x.type; });
      var cost = type === "custom" ? w.ap : ACT[type].ap;
      if (cost > act.ap) return "Not enough AP.";
      if (type === "custom") return act.actions.some(function (x) { return x.type === "custom" && same(x.name, w.name); }) ? "Already done in this activation." : "";
      if (did.indexOf(type) !== -1) return "Already done in this activation.";
      var ctl = inControl(k).length > 0;
      var moved = did.filter(function (t) { return t === "reposition" || t === "fall_back" || t === "charge"; }).length;
      if ((type === "reposition" || type === "charge" || type === "fall_back") && moved) return "It already made a Reposition, Charge or Fall Back.";
      if ((type === "reposition" || type === "dash" || type === "charge") && ctl) return "It is in control range of an enemy.";
      if (type === "fall_back" && !ctl) return "It is not in control range of an enemy.";
      if (type === "fight") { if (!ctl) return "No enemy in its control range."; }
      if (type === "shoot") { if (ctl) return "It can't shoot while in control range of an enemy."; }
      return "";
    }
    function hint(t) { msg = { kind: "hint", text: t }; }
    function choose(type, w) {
      var why = can(type, w);
      if (why) { hint(why); render(); return; }
      if (type === "custom") { doAction({ type: "custom", name: w.name, ap: w.ap }); return; }
      mode = { type: type, weapon: w || null, targets: [] };
      var name = ACT[type].name;
      if (type === "reposition" || type === "dash" || type === "fall_back") hint(name + ": click where it goes.");
      else if (type === "charge") hint("Charge: click the enemy it charges.");
      else if (type === "fight") hint("Fight with " + w.name + ": click the enemy.");
      else if (type === "shoot") hint("Shoot with " + w.name + ": click the target" + (w.torrent ? ", then the other targets within " + w.torrent + "\" of it (Torrent), then Confirm." : w.salvo ? ", then the other targets (Salvo), then Confirm." : "."));
      render();
    }
    function doAction(x) {
      var k = act.unit;
      x.ap = x.type === "custom" ? x.ap : ACT[x.type].ap;
      if (x.type === "fight" || x.type === "shoot") {
        if (record) {
          if (!x.kills) { mode = { type: "kills", x: x, sel: [] }; hint("Who is incapacitated by this attack? Pick them, then Confirm."); render(); return; }
        } else x.kills = killsFor(k, x);
      }
      var gained = spend(k, x);
      act.actions.push(x);
      applyAction(k, x, true);
      fx = true; mode = null; msg = null;
      var note = gained ? " " + st.name[k] + " gains " + gained + " AP." : "";
      if (x.type === "fight" || x.type === "shoot") {
        var dead = x.kills || [];
        hint((dead.length ? dead.map(function (t) { return st.name[t]; }).join(", ") + (dead.length > 1 ? " are" : " is") + " incapacitated." : "No one is incapacitated.") + note);
      } else if (note) hint(note.trim());
      render();
      if (opts.onChange) opts.onChange();
    }

    function click(p) {
      if (done) return;
      var hit = unitAt(p);
      if (!act) {
        if (hit && canActivate(hit)) startActivation(hit);
        else if (hit) { hint(st.used[hit] ? st.name[hit] + " has already been activated." : "You don't control " + st.name[hit] + "."); render(); }
        return;
      }
      if (!mode) { if (hit && hit !== act.unit) { hint("Finish the activation of " + st.name[act.unit] + " first."); render(); } return; }
      var k = act.unit, u = byId[k], t = mode.type;
      if (t === "reposition" || t === "dash" || t === "fall_back" || (t === "charge" && mode.target)) {
        var to = [r1(p[0]), r1(p[1])];
        var max = t === "dash" ? 3 : (+u.move || 6) + (t === "charge" ? 2 : 0);
        if (!inside(to)) return;
        if (solid(to)) { hint("It can't end its move inside a wall."); render(); return; }
        var dist = pathLen(st.pos[k], to) / INCH;
        if (dist === Infinity) { hint("It can't get there: walls block every way."); render(); return; }
        if (dist > max + 0.05) { hint(ACT[t].name + ": the shortest way" + (blocked(st.pos[k], to) ? " around the walls" : "") + " is " + r1(dist) + "\", the most is " + max + "\"."); render(); return; }
        if (t === "charge") {
          if (gapP(to, mode.target) > 1.0001) { hint("A charge must end in control range (1\") of " + st.name[mode.target] + "."); render(); return; }
        } else if (inControl(k, to).length) { hint("It can't end this move in control range of an enemy."); render(); return; }
        var x = { type: t, at: to };
        if (t === "charge") x.target = mode.target;
        doAction(x);
        return;
      }
      if (!hit || st.side[hit] === st.side[k]) { hint("Click an enemy operative."); render(); return; }
      if (t === "charge") {
        if (gap(k, hit) > (+u.move || 6) + 2 + 1) { hint(st.name[hit] + " is too far to charge."); render(); return; }
        mode.target = hit; hint("Charge " + st.name[hit] + ": click where it ends, in control range (1\") of it."); render(); return;
      }
      if (t === "fight") {
        if (gap(k, hit) > 1.0001) { hint(st.name[hit] + " is not in control range."); render(); return; }
        doAction({ type: "fight", target: hit, weapon: mode.weapon.name }); return;
      }
      if (t === "shoot") {
        var w = mode.weapon;
        if (mode.targets.indexOf(hit) !== -1) { mode.targets.splice(mode.targets.indexOf(hit), 1); render(); return; }
        if (!mode.targets.length) {
          mode.targets.push(hit);
          if (!w.torrent && !w.salvo) { doAction({ type: "shoot", targets: mode.targets.slice(), weapon: w.name }); return; }
          hint(w.torrent ? "Torrent: click the other targets within " + w.torrent + "\" of " + st.name[hit] + ", then Confirm." : "Salvo: click the other targets, then Confirm.");
        } else {
          if (w.salvo && mode.targets.length >= w.salvo) { hint("Salvo: " + w.salvo + " targets at most."); render(); return; }
          if (w.torrent && gap(mode.targets[0], hit) > w.torrent + 0.0001) { hint(st.name[hit] + " is not within " + w.torrent + "\" of " + st.name[mode.targets[0]] + "."); render(); return; }
          mode.targets.push(hit); hint(mode.targets.length + " targets. Click more, or Confirm.");
        }
        render();
      }
    }
    function canActivate(k) {
      if (st.dead[k] || st.used[k]) return false;
      return record || (byId[k].control !== false && st.side[k] === "A" && byId[k].control);
    }
    function unitAt(p) {
      var best = null, bd = R * 1.6;
      Object.keys(st.pos).forEach(function (k) {
        if (st.dead[k]) return;
        var d = Math.hypot(st.pos[k][0] - p[0], st.pos[k][1] - p[1]);
        if (d < bd) { bd = d; best = k; }
      });
      return best;
    }

    // ---------- end of activation: compare with the real game ----------
    function endActivation() {
      if (!act) return;
      if (mode && mode.type === "shoot" && mode.targets.length) { doAction({ type: "shoot", targets: mode.targets.slice(), weapon: mode.weapon.name }); if (mode) return; }
      var a = { unit: act.unit, actions: act.actions.map(function (x) { var y = {}; Object.keys(x).forEach(function (q) { y[q] = x[q]; }); return y; }) };
      st.log.push(a);
      act = null; mode = null;
      if (record) { solution.push(a); st.k++; hint("Activation recorded. Activate the next operative, or click Keep this line."); render(); if (opts.onChange) opts.onChange(); return; }
      var e = expected();
      var ok = e && same(e.unit, a.unit) && (e.actions || []).length === a.actions.length &&
        a.actions.every(function (x, i) { return matchAction(x, e.actions[i]); });
      if (!ok) {
        result = "lose";
        msg = { kind: "lose", text: "That's not what " + winner + " played." + (e && e.wrong ? " " + e.wrong : data.wrong ? " " + data.wrong : "") };
        render(); return;
      }
      st.k++;
      autoPlay();
      if (st.k >= solution.length) {
        result = "win"; done = true;
        msg = { kind: "win", text: "You found " + winner + "'s line." };
        render();
        if (opts.onWin) opts.onWin();
        return;
      }
      msg = { kind: "ok", text: "Same as " + winner + ". Keep going: activate your next operative." };
      render();
    }
    function showLine() {
      reset(true); done = true; result = "shown";
      var steps = [];
      solution.forEach(function (a) { (a.actions || []).forEach(function (x) { steps.push([a.unit, x]); }); });
      var i = 0;
      msg = { kind: "hint", text: winner + "'s line, step by step." };
      function next() {
        if (i >= steps.length) { msg = { kind: "win", text: "This is what " + winner + " played." }; render(); if (opts.onReveal) opts.onReveal(); return; }
        var s = steps[i++];
        marks = { paths: [], shots: [], fights: [], killed: {} };
        var last = st.log[st.log.length - 1];
        if (last && last.unit === String(s[0]) && last.show === i) { last.actions.push(s[1]); last.show = i + 1; } else st.log.push({ unit: String(s[0]), actions: [s[1]], show: i + 1 });
        applyAction(s[0], s[1], true);
        fx = true;
        act = { unit: String(s[0]), ap: 0, actions: [], show: true };
        msg = { kind: "hint", text: st.name[String(s[0])] + ": " + describe(s[1]) };
        render();
        act = null;
        setTimeout(next, 1400);
      }
      next();
    }
    function describe(x) {
      if (x.type === "custom") return x.name;
      var n = ACT[x.type].name;
      if (x.type === "fight") return n + " " + st.name[String(x.target)] + (x.weapon ? " (" + x.weapon + ")" : "");
      if (x.type === "charge") return n + " " + st.name[String(x.target)];
      if (x.type === "shoot") return n + " " + (x.targets || []).map(function (t) { return st.name[String(t)]; }).join(", ") + (x.weapon ? " (" + x.weapon + ")" : "");
      return n;
    }

    // ---------- drawing ----------
    function render() {
      var s = { pos: st.pos, dead: {}, captured: {}, side: st.side, name: st.name, paths: marks.paths, shots: marks.shots, fights: marks.fights, killed: marks.killed, active: {}, newCapture: {} };
      Object.keys(st.dead).forEach(function (k) { if (!marks.killed[k]) s.dead[k] = true; });
      if (act) s.active[act.unit] = true;
      if (mode && mode.targets) mode.targets.forEach(function (t) { s.active[t] = true; });
      if (mode && mode.target) s.active[mode.target] = true;
      var h = '<div class="gb-top"><span class="goal">' + esc(String(data.question || "Find the line").toUpperCase()) + '</span><span class="r">' + (record ? "RECORDING" : result === "win" ? "SOLVED" : "TP " + esc(data.tp || "?")) + "</span></div>";
      h += '<div class="gb-main"><div><div class="gb-screen pz-screen">' + B.drawScene(scene, s, id, { fx: fx }) + "</div>";
      h += '<div class="gb-legend"><span><i class="a"></i>' + esc(side("A")) + '</span><span><i class="b"></i>' + esc(side("B")) + "</span></div>";
      h += rosterHtml() + "</div><div class=\"gb-side\">";
      if (msg) h += '<div class="gb-box pz-msg pz-' + msg.kind + (msg.kind === "lose" ? " fx-shake" : "") + '" aria-live="polite">' + (msg.kind === "win" ? '<span class="tp">WELL PLAYED</span>' : msg.kind === "lose" ? '<span class="tp">NOT THIS TIME</span>' : msg.kind === "ok" ? '<span class="tp">GOOD</span>' : "") + "<p>" + esc(msg.text) + "</p></div>";
      if (act && !act.show) {
        var u = byId[act.unit];
        if (mode && mode.type === "kills") {
          h += '<div class="gb-box gb-actions"><small>WHO IS INCAPACITATED BY THIS ATTACK?</small>';
          (mode.x.targets || [mode.x.target]).forEach(function (t) { var on = mode.sel.indexOf(String(t)) !== -1; h += '<button type="button" data-kill="' + esc(t) + '" aria-pressed="' + on + '"><b>' + esc(String(st.name[String(t)]).toUpperCase()) + "</b><span>" + (on ? "Incapacitated" : "Survives (click to change)") + "</span></button>"; });
          h += '<button type="button" class="pz-go" data-killok><b>CONFIRM</b><span>Record this attack.</span></button></div>';
          h += "</div></div>";
          root.innerHTML = h; fx = false; return;
        }
        h += '<div class="gb-box gb-actions"><small>' + esc(String(st.name[act.unit]).toUpperCase()) + " · " + act.ap + " AP LEFT" + (+u.bonus_ap && !act.bonus ? " (+" + (+u.bonus_ap) + " AFTER ITS FIRST " + (u.bonus_on || []).map(function (t) { return ACT[t] ? ACT[t].name.toUpperCase() : t; }).join(" / ") + ")" : "") + "</small>";
        ["reposition", "dash", "charge", "fall_back"].forEach(function (t) { h += btn(t, null, ACT[t].name, ACT[t].ap + " AP · " + ACT[t].help); });
        weapons(u).forEach(function (w, i) {
          var t = w.kind === "melee" ? "fight" : "shoot";
          h += btn(t, i, w.plain ? (t === "fight" ? "Fight" : "Shoot") : (t === "fight" ? "Fight · " : "Shoot · ") + w.name, "1 AP" + (w.rules ? " · " + w.rules : ""));
        });
        extraActions(u).forEach(function (w, i) { h += btn("custom", i, w.name, w.ap + " AP"); });
        if (mode && mode.type === "shoot" && mode.targets.length && (mode.weapon.torrent || mode.weapon.salvo)) h += '<button type="button" class="pz-go" data-confirm><b>CONFIRM THE SHOT</b><span>' + mode.targets.length + " target(s)</span></button>";
        if (mode) h += '<button type="button" data-cancel><b>CANCEL</b><span>Choose another action.</span></button>';
        h += "</div>";
        h += '<div class="gb-btns"><button type="button" class="go" data-end>END ACTIVATION</button></div>';
      } else if (!done && result !== "lose") {
        var ready = Object.keys(st.pos).filter(canActivate);
        h += '<div class="gb-box gb-ops"><small>' + (record ? "CLICK AN OPERATIVE TO ACTIVATE IT (BOTH SIDES)" : "ACTIVATE AN OPERATIVE") + '</small><div class="gb-pick">';
        ready.forEach(function (k) { h += '<button type="button" data-activate="' + esc(k) + '">' + esc(k) + " · " + esc(String(st.name[k]).toUpperCase()) + "</button>"; });
        if (!ready.length) h += "<span>No operative left to activate.</span>";
        h += "</div></div>";
      }
      if (st.log.length) {
        h += '<div class="gb-box gb-log"><small>' + (record ? "THE LINE SO FAR" : "WHAT HAPPENED") + "</small>";
        st.log.forEach(function (a, i) {
          h += "<span><b>" + (i + 1) + ". " + esc(st.name[a.unit] || a.unit) + "</b>" + (a.auto ? " (" + esc(side(st.side[a.unit])) + ")" : "") + ": " + esc((a.actions || []).map(describe).join(" → ") || "nothing") + "</span>";
        });
        h += "</div>";
      }
      h += '<div class="gb-btns">';
      if (!record) {
        h += '<button type="button" data-reset>↺ TRY AGAIN</button>';
        if (result !== "win" && result !== "shown") h += '<button type="button" data-show>SHOW ' + esc(String(winner).toUpperCase()) + "'S LINE</button>";
      } else {
        h += '<button type="button" data-undo' + (act || st.log.length ? "" : " disabled") + ">↶ UNDO</button>";
        h += '<button type="button" data-reset>↺ START AGAIN</button>';
      }
      h += "</div></div></div>";
      root.innerHTML = h;
      fx = false;
    }
    function side(k) { var sd = (data.sides || {})[k] || {}; return String(sd.player ? sd.player + (sd.name ? " · " + sd.name : "") : sd.name || (k === "A" ? "You" : "Opponent")).toUpperCase(); }
    function btn(t, i, label, sub) {
      var w = t === "custom" ? extraActions(byId[act.unit])[i] : (i != null ? weapons(byId[act.unit])[i] : null);
      var why = can(t, w), on = mode && mode.type === t && (!w || mode.weapon === w || (mode.weapon && w && mode.weapon.name === w.name));
      return '<button type="button" data-a="' + t + '"' + (i != null ? ' data-i="' + i + '"' : "") + (why ? ' class="pz-off" title="' + esc(why) + '"' : "") + (on ? ' aria-pressed="true"' : "") + "><b>" + esc(label.toUpperCase()) + "</b><span>" + esc(why || sub) + "</span></button>";
    }
    function rosterHtml() {
      var h = '<div class="pz-roster">';
      units.forEach(function (u) {
        var k = String(u.id);
        h += '<div class="' + (st.dead[k] ? "dead" : "") + '"><i class="' + (st.side[k] === "B" ? "b" : "a") + '"></i><b>' + esc(k) + "</b> " + esc(u.name || k) +
          ' <small>APL ' + esc(u.apl || "?") + " · M " + esc(u.move || "?") + '"' + (u.wounds ? " · W " + esc(u.wounds) : "") + "</small>" +
          (weapons(u, true).length ? '<small class="w">' + weapons(u, true).map(function (w) { return esc(w.name) + (w.rules ? " (" + esc(w.rules) + ")" : ""); }).join(" · ") + "</small>" : "") + "</div>";
      });
      return h + "</div>";
    }
    function svgPoint(e) {
      var svg = root.querySelector(".pz-screen svg"), pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      var p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return [p.x, p.y];
    }
    root.classList.add("gb", "pz");
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b && root.contains(b)) {
        if (b.hasAttribute("data-activate")) startActivation(b.getAttribute("data-activate"));
        else if (b.hasAttribute("data-a")) {
          var t = b.getAttribute("data-a"), i = b.getAttribute("data-i");
          choose(t, t === "custom" ? extraActions(byId[act.unit])[+i] : i != null ? weapons(byId[act.unit])[+i] : null);
        } else if (b.hasAttribute("data-kill")) { var kk = b.getAttribute("data-kill"), ix = mode.sel.indexOf(kk); if (ix === -1) mode.sel.push(kk); else mode.sel.splice(ix, 1); render(); }
        else if (b.hasAttribute("data-killok")) { var xx = mode.x; xx.kills = mode.sel.slice(); mode = null; doAction(xx); }
        else if (b.hasAttribute("data-confirm")) doAction({ type: "shoot", targets: mode.targets.slice(), weapon: mode.weapon.name });
        else if (b.hasAttribute("data-cancel")) { mode = null; msg = null; render(); }
        else if (b.hasAttribute("data-end")) endActivation();
        else if (b.hasAttribute("data-reset")) { if (record) solution = []; reset(); if (opts.onChange) opts.onChange(); }
        else if (b.hasAttribute("data-show")) showLine();
        else if (b.hasAttribute("data-undo")) undo();
        return;
      }
      if (e.target.closest(".pz-screen svg")) click(svgPoint(e));
    });
    // author mode: undo the last action (or the last recorded activation)
    function undo() {
      if (act) {
        var cur = { unit: act.unit, actions: act.actions.slice(0, -1) }, had = act.actions.length;
        replay();
        if (had) {
          startActivation(cur.unit);
          cur.actions.forEach(function (x) { spend(cur.unit, x); act.actions.push(x); applyAction(cur.unit, x); });
          render();
        }
      } else if (solution.length) { solution = solution.slice(0, -1); replay(); }
      if (opts.onChange) opts.onChange();
    }
    function replay() {
      var keep = solution.slice(); reset(); solution = keep;
      solution.forEach(function (a) { st.used[String(a.unit)] = true; (a.actions || []).forEach(function (x) { applyAction(a.unit, x); }); st.log.push(a); st.k++; });
      marks = { paths: [], shots: [], fights: [], killed: {} };
      render();
    }
    reset();
    return {
      solution: function () { return solution.slice(); },
      reset: reset
    };
  }

  KTT.puzzle = { mount: mount, weapons: weapons };
  document.querySelectorAll("[data-puzzle]").forEach(function (el) {
    var src = document.getElementById(el.getAttribute("data-puzzle"));
    if (!src) return;
    var data = JSON.parse(src.textContent);
    var answer = document.getElementById("pz-answer");
    var reveal = function () { if (answer) { answer.hidden = false; } };
    mount(el, data, { onWin: reveal, onReveal: reveal });
  });
})();
