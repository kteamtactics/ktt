/* KTT Game Boy board: draws a killzone and plays a scene step by step.
   Modes: "moments" (battle analysis), "steps" (tactics concept), "puzzle" (Your move, playable).
   Scenes are written in the article files (see README). Maps come from data/maps.json. */
(function () {
  "use strict";
  var KTT = (window.KTT = window.KTT || {});
  var INK = "#141414", PAPER = "#e9e5d3", OR = "#ff6a13";
  var SIDE = {
    A: { fill: "#ff9a52", stroke: "#a8480a", text: INK, path: OR },
    B: { fill: "#9a2a2a", stroke: "#3a0d0d", text: PAPER, path: "#7a1f1f" }
  };
  var ACTIONS = {
    reposition: { name: "Reposition", help: "Move the operative up to its Move distance." },
    dash: { name: "Dash", help: "A short extra move of up to 3 squares." },
    charge: { name: "Charge", help: "Move and end in contact with an enemy." },
    fight: { name: "Fight", help: "Melee attack against an enemy in contact." },
    shoot: { name: "Shoot", help: "Ranged attack against an enemy you can see." },
    loot: { name: "Loot", help: "Mission action: score an objective you control." },
    fall_back: { name: "Fall back", help: "Leave combat and move away from the enemy." }
  };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var uid = 0;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function r2(n) { return Math.round(n * 100) / 100; }

  // ---------- grid & positions ----------
  function zoneD(m) {
    if (!m.sa) return [m.d, m.d];
    var g = m.go || 0, u = m.u, dim = (m.a === "l" || m.a === "r") ? m.w : m.h;
    var near = g, far = dim - (g + Math.floor((dim - g) / u + 1e-9) * u) || u;
    return (m.a === "l" || m.a === "t") ? [near, far] : [far, near];
  }
  function cellCentres(m, max) {
    var g = m.go || 0, u = m.u || 1, r = [];
    if (m.sa) r.push(g / 2);
    for (var i = 0; g + i * u < max - 1e-9; i++) r.push(g + i * u + u / 2);
    return r;
  }
  function colIndex(letters) {
    var n = 0;
    for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n - 1;
  }
  function cellPos(m, name) {
    var mt = /^([A-Z]+)(\d+)$/.exec(String(name).trim().toUpperCase());
    if (!mt) return null;
    var c = colIndex(mt[1]), r = +mt[2] - 1;
    if (m.kind === "grid") return [c + 0.5, r + 0.5];
    var xs = cellCentres(m, m.w), ys = cellCentres(m, m.h);
    if (c >= xs.length || r >= ys.length || c < 0 || r < 0) return null;
    return [xs[c], ys[r]];
  }
  function cellName(m, p) {
    if (m.kind === "grid") return String.fromCharCode(65 + Math.floor(p[0])) + (Math.floor(p[1]) + 1);
    var g = m.go || 0, u = m.u || 1, sa = m.sa ? 1 : 0;
    var f = function (v) { return v < g ? 0 : Math.floor((v - g) / u) + sa; };
    return String.fromCharCode(65 + f(p[0])) + (f(p[1]) + 1);
  }
  function toPos(m, v) {
    if (Array.isArray(v) && v.length >= 2) return [+v[0], +v[1]];
    if (typeof v === "string") return cellPos(m, v);
    return null;
  }
  function entryPos(m, e) { return e.length >= 3 ? [+e[1], +e[2]] : toPos(m, e[1]); }

  // ---------- state ----------
  function initial(scene) {
    var m = scene.mapData, s = { pos: {}, dead: {}, captured: {}, vp: 0, side: {}, name: {} };
    (scene.units || []).forEach(function (u) {
      var id = String(u.id);
      s.pos[id] = toPos(m, u.at) || [0, 0];
      s.side[id] = u.side === "B" ? "B" : "A";
      s.name[id] = u.name || id;
    });
    return s;
  }
  // state after step k (k = -1: deployment / starting position). Marks are those of step k only.
  function stateAt(scene, k) {
    var m = scene.mapData, s = initial(scene), steps = scene.steps || [];
    s.paths = []; s.shots = []; s.fights = []; s.killed = {}; s.active = {}; s.newCapture = {};
    for (var j = 0; j <= k && j < steps.length; j++) {
      var st = steps[j] || {}, cur = j === k;
      (st.setup || []).forEach(function (e) { var p = entryPos(m, e); if (p) s.pos[String(e[0])] = p; });
      (st.removed || []).forEach(function (id) { s.dead[String(id)] = true; });
      var paths = {};
      (st.moves || []).forEach(function (e) {
        var id = String(e[0]), p = entryPos(m, e);
        if (!p || !s.pos[id]) return;
        if (cur) {
          if (!paths[id]) paths[id] = [s.pos[id].slice()];
          paths[id].push(p);
          s.active[id] = true;
        }
        s.pos[id] = p;
      });
      if (cur) Object.keys(paths).forEach(function (id) { s.paths.push({ id: id, pts: paths[id] }); });
      ["shots", "fights"].forEach(function (key) {
        (st[key] || []).forEach(function (e) {
          var a = String(e[0]), b = String(e[1]);
          if (!cur || !s.pos[a] || !s.pos[b]) return;
          var from = e.length >= 4 ? [+e[2], +e[3]] : (e.length === 3 ? toPos(m, e[2]) : null);
          s[key].push({ a: a, b: b, from: from || s.pos[a].slice(), to: s.pos[b].slice() });
          s.active[a] = true; s.active[b] = true;
        });
      });
      (st.kills || []).forEach(function (id) { id = String(id); if (cur) { s.killed[id] = true; s.active[id] = true; } else s.dead[id] = true; });
      (st.captured || []).forEach(function (c) { c = String(c).toUpperCase(); s.captured[c] = true; if (cur) s.newCapture[c] = true; });
      if (st.unit && cur) s.active[String(st.unit)] = true;
      if (st.vp) s.vp += +st.vp || 0;
    }
    return s;
  }
  // spread operatives that stand on (almost) the same spot so none is hidden
  function displayPos(s, R) {
    var ids = Object.keys(s.pos).filter(function (k) { return !s.dead[k]; }), out = {}, seen = {};
    ids.forEach(function (k) { out[k] = s.pos[k].slice(); });
    ids.forEach(function (k) {
      if (seen[k]) return;
      var group = ids.filter(function (o) { return !seen[o] && Math.hypot(s.pos[o][0] - s.pos[k][0], s.pos[o][1] - s.pos[k][1]) < R * 1.2; });
      if (group.length > 1) {
        group.forEach(function (o, i) {
          var a = (Math.PI * 2 * i) / group.length - Math.PI / 2, d = R * 1.05;
          out[o] = [r2(s.pos[k][0] + Math.cos(a) * d), r2(s.pos[k][1] + Math.sin(a) * d)];
          seen[o] = true;
        });
      }
      seen[k] = true;
    });
    return out;
  }

  // ---------- drawing ----------
  // lines between squares: [x, y, "h"|"v", type] with type w wall, c cover, d door, b breach point
  function edgesSvg(edges) {
    var h = "";
    [0, 1, 2].forEach(function (pass) {
      (edges || []).forEach(function (e) {
        var x = e[0], y = e[1], hz = e[2] === "h", t = e[3], c = t === "c";
        var x2 = hz ? x + 1 : x, y2 = hz ? y : y + 1, mx = hz ? x + 0.5 : x, my = hz ? y : y + 0.5;
        if (pass < 2 && t === "d") {
          if (!pass) h += '<line x1="' + x + '" y1="' + y + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#111" stroke-width=".26" stroke-linecap="square"/>';
        } else if (pass < 2) {
          var col = pass ? (c ? "#8a6a3c" : "#2b2b2b") : (c ? "#4a3820" : "#111"), sw = pass ? 0.14 : 0.26;
          h += '<line x1="' + x + '" y1="' + y + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="square"/>';
        } else if (t === "d") {
          var L = 0.8, T = 0.34, ww = hz ? L : T, hh = hz ? T : L;
          h += '<rect x="' + r2(mx - ww / 2) + '" y="' + r2(my - hh / 2) + '" width="' + ww + '" height="' + hh + '" fill="' + OR + '" stroke="' + INK + '" stroke-width=".06"/>';
          h += '<line x1="' + (hz ? mx : mx - 0.17) + '" y1="' + (hz ? my - 0.17 : my) + '" x2="' + (hz ? mx : mx + 0.17) + '" y2="' + (hz ? my + 0.17 : my) + '" stroke="' + INK + '" stroke-width=".05"/>';
        } else if (t === "b") {
          h += '<circle cx="' + mx + '" cy="' + my + '" r=".3" fill="#c62f2f" stroke="' + INK + '" stroke-width=".06"/><path d="M' + r2(mx - 0.13) + " " + r2(my - 0.13) + 'l.26 .26m0 -.26l-.26 .26" stroke="#fff" stroke-width=".08"/>';
        }
      });
    });
    return h;
  }
  function drawMap(m) {
    var h = "", w = m.w, H = m.h;
    var R = function (x, y, ww, hh, f, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + hh + '" fill="' + f + '"' + (extra || "") + "/>"; };
    var txt = function (x, y, t, size, fill) {
      return '<text x="' + r2(x) + '" y="' + r2(y) + '" font-size="' + size + '" fill="' + (fill || INK) + '" text-anchor="middle" font-family="Press Start 2P, monospace">' + esc(t) + "</text>";
    };
    if (m.kind === "grid") {
      m.rows.forEach(function (row, y) {
        for (var x = 0; x < row.length; x++) {
          var t = row[x];
          if (t === "#") h += R(x, y, 1, 1, "#2b2b2b", ' stroke="#2b2b2b" stroke-width=".02"');
          else if (t === "o") h += R(x, y, 1, 1, "#8a6a3c", ' stroke="#8a6a3c" stroke-width=".02"');
          else h += R(x, y, 1, 1, (x + y) % 2 ? "#cdc9b2" : "#d7d3bd");
        }
      });
      (m.pieces || []).forEach(function (q) { h += R(q[0], q[1], q[2], q[3], "#8a6a3c", ' stroke="#4a3820" stroke-width=".06"'); });
      h += edgesSvg(m.edges);
      for (var i = 0; i < w; i++) h += txt(i + 0.5, -0.25, String.fromCharCode(65 + i), 0.32);
      for (var j = 0; j < H; j++) h += txt(-0.4, j + 0.62, j + 1, 0.32);
      h += '<rect x="0" y="0" width="' + w + '" height="' + H + '" fill="none" stroke="' + INK + '" stroke-width=".1"/>';
      return h;
    }
    var a = m.a, zd = zoneD(m), dA = zd[0], dB = zd[1];
    h += R(0, 0, w, H, "#d7d3bd");
    if (a === "b" || a === "t") {
      var my = H / 2;
      h += R(0, a === "b" ? my : 0, w, my, OR, ' fill-opacity=".08"');
      h += R(0, a === "b" ? H - dA : 0, w, dA, OR, ' fill-opacity=".22"');
      h += R(0, a === "b" ? 0 : H - dB, w, dB, "#7a1f1f", ' fill-opacity=".14"');
    } else {
      var mx = w / 2;
      h += R(a === "r" ? mx : 0, 0, mx, H, OR, ' fill-opacity=".08"');
      h += R(a === "r" ? w - dA : 0, 0, dA, H, OR, ' fill-opacity=".22"');
      h += R(a === "r" ? 0 : w - dB, 0, dB, H, "#7a1f1f", ' fill-opacity=".14"');
    }
    var u = m.u || 1, g = m.go || 0;
    for (var x = g + (g ? 0 : u); x < w - 1e-9; x += u) h += '<line x1="' + r2(x) + '" y1="0" x2="' + r2(x) + '" y2="' + H + '" stroke="' + INK + '" stroke-opacity=".12" stroke-width=".05"/>';
    for (var y = g + (g ? 0 : u); y < H - 1e-9; y += u) h += '<line x1="0" y1="' + r2(y) + '" x2="' + w + '" y2="' + r2(y) + '" stroke="' + INK + '" stroke-opacity=".12" stroke-width=".05"/>';
    var fs = u >= 2 ? 0.55 : 0.42;
    cellCentres(m, w).forEach(function (c, i) { h += txt(c, -0.35, String.fromCharCode(65 + i), fs); });
    cellCentres(m, H).forEach(function (c, i) { h += txt(-0.65, c + fs / 2.5, i + 1, fs); });
    h += '<line x1="' + w / 2 + '" y1="0" x2="' + w / 2 + '" y2="' + H + '" stroke="' + OR + '" stroke-width=".08" stroke-dasharray=".5 .35" opacity=".7"/>';
    h += '<line x1="0" y1="' + H / 2 + '" x2="' + w + '" y2="' + H / 2 + '" stroke="' + OR + '" stroke-width=".08" stroke-dasharray=".5 .35" opacity=".7"/>';
    (m.t || []).forEach(function (t) {
      var kind = t[5];
      if (kind === "w") h += R(t[0], t[1], t[2], t[3], INK);
      else {
        h += R(t[0], t[1], t[2], t[3], kind === "c" ? "#8a6a3c" : "#4a4a48", ' stroke="' + INK + '" stroke-width=".1"');
        if (t[4]) h += txt(t[0] + t[2] / 2, t[1] + t[3] / 2 + 0.22, t[4], 0.55, PAPER);
      }
    });
    (m.gr || []).forEach(function (q) { h += '<line x1="' + q[0] + '" y1="' + q[1] + '" x2="' + q[2] + '" y2="' + q[3] + '" stroke="#2a8f4a" stroke-width=".2" stroke-dasharray=".5 .3"/>'; });
    (m.wl || []).forEach(function (q) {
      var pts = [];
      for (var i = 0; i < q.length; i += 2) pts.push(q[i] + "," + q[i + 1]);
      h += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + INK + '" stroke-width=".32" stroke-linejoin="miter" stroke-linecap="square"/>';
    });
    (m.xs || []).forEach(function (q) { h += R(q[0] - 0.3, q[1] - 0.3, 0.6, 0.6, INK) + '<path d="M' + (q[0] - 0.2) + " " + (q[1] - 0.2) + 'l.4 .4m0 -.4l-.4 .4" stroke="' + PAPER + '" stroke-width=".1"/>'; });
    (m.dr || []).forEach(function (q) {
      var hz = q[2] === "h", L = 0.6, T = 0.17;
      var ww = hz ? 2 * L : 2 * T, hh = hz ? 2 * T : 2 * L;
      h += R(r2(q[0] - ww / 2), r2(q[1] - hh / 2), ww, hh, q[3] === "n" ? PAPER : OR, ' stroke="' + INK + '" stroke-width=".08"');
    });
    (m.ci || []).forEach(function (q) {
      h += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + q[2] * 0.6 + '" fill="' + PAPER + '" stroke="' + INK + '" stroke-width=".12"/>';
      h += txt(q[0], q[1] + 0.2, q[3], 0.55);
    });
    (m.o || []).forEach(function (o) {
      var f = o[0] === "a" ? OR : o[0] === "b" ? "#ffffff" : INK;
      h += '<circle cx="' + o[1] + '" cy="' + o[2] + '" r="1" fill="' + f + '" fill-opacity=".85" stroke="' + INK + '" stroke-width=".14"/>';
      if (o[0] === "c") h += '<path d="M' + (o[1] - 0.6) + " " + o[2] + "h1.2M" + o[1] + " " + (o[2] - 0.6) + 'v1.2" stroke="' + PAPER + '" stroke-width=".12"/>';
    });
    h += '<rect x="0" y="0" width="' + w + '" height="' + H + '" fill="none" stroke="' + INK + '" stroke-width=".14"/>';
    return h;
  }

  function shorten(a, b, by) {
    var len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, k = Math.max(0, (len - by) / len);
    return [r2(a[0] + (b[0] - a[0]) * k), r2(a[1] + (b[1] - a[1]) * k)];
  }
  function spriteFor(scene, side) { return ((scene.sides || {})[side] || {}).sprite || ""; }

  // opts.fx: add animation classes; opts.delay: seconds before effects play
  function drawScene(scene, s, id, opts) {
    opts = opts || {};
    var m = scene.mapData, grid = m.kind === "grid";
    var useSprites = scene.sprites != null ? !!scene.sprites : scene.mode === "puzzle";
    var R = grid ? 0.36 : 0.48, FS = grid ? 0.22 : 0.3;
    var pad = grid ? 0.8 : (m.u >= 2 ? 1.4 : 1.1);
    var D = opts.delay || 0, fx = !!opts.fx && !reduceMotion;
    var late = function (cls, extra) { return fx ? ' class="' + cls + '" style="--d:' + r2(D + (extra || 0)) + 's"' : ""; };
    var h = '<svg viewBox="' + -pad + " " + -pad + " " + r2(m.w + pad + 0.2) + " " + r2(m.h + pad + 0.2) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(m.name) + ' board">';
    h += "<defs>";
    [["a", OR], ["b", "#7a1f1f"], ["s", INK]].forEach(function (d) {
      h += '<marker id="' + id + d[0] + '" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L6 3L0 6z" fill="' + d[1] + '"/></marker>';
    });
    h += "</defs>";
    h += drawMap(m);
    (scene.objectives || []).forEach(function (o) {
      var p = toPos(m, o); if (!p) return;
      var key = String(o).toUpperCase(), cap = s.captured[key], k = grid ? 0.38 : 0.6;
      h += '<polygon data-obj="' + esc(key) + '" points="' + p[0] + "," + r2(p[1] - k) + " " + r2(p[0] + k) + "," + p[1] + " " + p[0] + "," + r2(p[1] + k) + " " + r2(p[0] - k) + "," + p[1] + '" fill="' + (cap ? "#ffffff" : OR) + '" stroke="' + INK + '" stroke-width=".09"' + (s.newCapture[key] ? late("fx-pop") : "") + "/>";
      if (s.newCapture[key] && fx) h += '<text x="' + p[0] + '" y="' + r2(p[1] - k - 0.2) + '" font-size="' + (grid ? 0.4 : 0.6) + '" fill="' + OR + '" stroke="' + INK + '" stroke-width=".04" text-anchor="middle" font-family="Press Start 2P, monospace"' + late("fx-float") + ">+VP</text>";
    });
    var dpos = displayPos(s, R);
    s.paths.forEach(function (p) {
      var pts = p.pts.slice(), last = pts.length - 1;
      if (dpos[p.id]) pts[last] = dpos[p.id];
      pts[last] = shorten(pts[last - 1], pts[last], R + 0.07);
      var sd = SIDE[s.side[p.id]];
      h += '<path d="M' + pts.map(function (q) { return q[0] + " " + q[1]; }).join("L") + '" fill="none" stroke="' + sd.path + '" stroke-width="' + (grid ? 0.12 : 0.14) + '" stroke-dasharray=".3 .18" marker-end="url(#' + id + (s.side[p.id] === "A" ? "a" : "b") + ')"' + late("fx-in", -0.2) + "/>";
    });
    s.shots.forEach(function (sh) {
      var to = shorten(sh.from, dpos[sh.b] || sh.to, R + 0.14);
      h += '<line x1="' + sh.from[0] + '" y1="' + sh.from[1] + '" x2="' + to[0] + '" y2="' + to[1] + '" stroke="' + INK + '" stroke-width=".1" stroke-dasharray=".12 .12" marker-end="url(#' + id + 's)"' + late("fx-in") + "/>";
    });
    var units = Object.keys(s.pos).filter(function (k) { return !s.dead[k]; });
    units.sort(function (a, b) { return (s.active[a] ? 1 : 0) - (s.active[b] ? 1 : 0) || dpos[a][1] - dpos[b][1]; });
    var anyActive = Object.keys(s.active).length > 0;
    units.forEach(function (k) {
      var p = dpos[k], sd = SIDE[s.side[k]], dead = s.killed[k], act = s.active[k];
      var op = !anyActive || act || dead ? 1 : 0.55;
      h += '<g data-u="' + esc(k) + '" transform="translate(' + p[0] + " " + p[1] + ')" opacity="' + op + '">';
      h += '<g' + (dead ? late("fx-die", 0.15) : "") + '><title>' + esc(s.name[k]) + " (" + esc(cellName(m, s.pos[k])) + ")</title>";
      if (act && !dead) h += '<circle r="' + r2(R + 0.3) + '" fill="none" stroke="' + OR + '" stroke-width=".12"/><circle r="' + r2(R + 0.17) + '" fill="none" stroke="' + PAPER + '" stroke-width=".12"/>';
      var spr = useSprites ? spriteFor(scene, s.side[k]) : "";
      if (spr) {
        h += '<ellipse cx="0" cy="' + r2(R * 0.55) + '" rx="' + r2(R * 0.95) + '" ry="' + r2(R * 0.45) + '" fill="' + sd.fill + '" stroke="' + sd.stroke + '" stroke-width=".08"/>';
        var sw = R * (grid ? 2.9 : 2.3), sh2 = sw * 72 / 56;
        h += '<image href="' + esc(spr) + '" x="' + r2(-sw / 2) + '" y="' + r2(R * 0.75 - sh2) + '" width="' + r2(sw) + '" height="' + r2(sh2) + '" style="image-rendering:pixelated"/>';
      } else {
        h += '<circle r="' + R + '" fill="' + sd.fill + '" stroke="' + sd.stroke + '" stroke-width=".12"/>';
        h += '<text y="' + r2(FS * 0.38) + '" font-size="' + FS + '" fill="' + sd.text + '" text-anchor="middle" font-family="Press Start 2P, monospace">' + esc(k) + "</text>";
      }
      if (dead) { var d = R + 0.05; h += '<path d="M' + r2(-d) + " " + r2(-d) + "L" + r2(d) + " " + r2(d) + "M" + r2(d) + " " + r2(-d) + "L" + r2(-d) + " " + r2(d) + '" stroke="' + INK + '" stroke-width=".14"/>'; }
      h += "</g></g>";
    });
    s.fights.forEach(function (f) {
      var a = dpos[f.a] || f.from, b = dpos[f.b] || f.to;
      var mid = [r2((a[0] + b[0]) / 2), r2((a[1] + b[1]) / 2)], k = grid ? 0.22 : 0.3;
      h += '<g' + late("fx-pop") + '><path d="M' + r2(mid[0] - k) + " " + r2(mid[1] - k) + "L" + r2(mid[0] + k) + " " + r2(mid[1] + k) + "M" + r2(mid[0] + k) + " " + r2(mid[1] - k) + "L" + r2(mid[0] - k) + " " + r2(mid[1] + k) + '" stroke="' + OR + '" stroke-width=".16"/>';
      h += '<path d="M' + mid[0] + " " + r2(mid[1] - k * 1.5) + "V" + r2(mid[1] - k * 1.1) + "M" + mid[0] + " " + r2(mid[1] + k * 1.1) + "V" + r2(mid[1] + k * 1.5) + "M" + r2(mid[0] - k * 1.5) + " " + mid[1] + "H" + r2(mid[0] - k * 1.1) + "M" + r2(mid[0] + k * 1.1) + " " + mid[1] + "H" + r2(mid[0] + k * 1.5) + '" stroke="' + INK + '" stroke-width=".08"/></g>';
    });
    return h + "</svg>";
  }

  // slide the operatives that moved in this step along their path
  function animateMoves(svgRoot, s, R) {
    if (reduceMotion) return 0;
    var dpos = displayPos(s, R), longest = 0;
    s.paths.forEach(function (p) {
      var g = svgRoot.querySelector('g[data-u="' + (window.CSS && CSS.escape ? CSS.escape(p.id) : p.id) + '"]');
      if (!g) return;
      var pts = p.pts.slice();
      pts[pts.length - 1] = dpos[p.id] || pts[pts.length - 1];
      var seg = 0.28, total = seg * (pts.length - 1);
      longest = Math.max(longest, total);
      var t0 = null;
      g.setAttribute("transform", "translate(" + pts[0][0] + " " + pts[0][1] + ")");
      function frame(ts) {
        if (t0 == null) t0 = ts;
        var t = Math.min(1, (ts - t0) / 1000 / total), f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), r = f - i;
        r = r < 0.5 ? 2 * r * r : 1 - Math.pow(-2 * r + 2, 2) / 2;
        var x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r;
        if (t >= 1) { x = pts[pts.length - 1][0]; y = pts[pts.length - 1][1]; }
        g.setAttribute("transform", "translate(" + r2(x) + " " + r2(y) + ")");
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    return longest;
  }

  // ---------- widget ----------
  function sideName(scene, key) {
    var sd = (scene.sides || {})[key] || {};
    var bits = [sd.name || (key === "A" ? "Side A" : "Side B")];
    if (sd.player) bits.push(sd.player);
    return bits.join(" · ");
  }
  function stepUnit(st) {
    if (st.unit) return String(st.unit);
    var e = (st.moves || [])[0] || (st.fights || [])[0] || (st.shots || [])[0];
    return e ? String(e[0]) : null;
  }

  function mount(root, scene) {
    if (!scene || !scene.mapData) { root.innerHTML = '<p class="gb-note">Board unavailable: unknown map.</p>'; return; }
    var id = "gb" + (++uid) + "-";
    var steps = scene.steps || [];
    var puzzle = scene.mode === "puzzle";
    var noun = scene.mode === "moments" ? "MOMENT" : "STEP";
    var R = scene.mapData.kind === "grid" ? 0.36 : 0.48;
    var k = -1, tries = 0, msg = null, wrong = false, solved = false;
    var pickedUnit = null;
    root.classList.add("gb");

    function caption(st) {
      if (puzzle) {
        if (msg) return msg;
        if (solved) return '<span class="tp">SOLVED' + (tries ? " · " + tries + " WRONG " + (tries > 1 ? "TRIES" : "TRY") : " · FIRST TRY") + "</span><p>" + esc(scene.solved_text || "Well played.") + "</p>";
        if (!st) return '<span class="tp">YOUR MOVE</span><p>' + esc(scene.question || "") + "</p>";
      }
      if (!st) return '<span class="tp">DEPLOYMENT</span>' + (scene.deployment ? "<p>" + esc(scene.deployment) + "</p>" : "<p>Starting positions. Press Next to play the game.</p>");
      return '<span class="tp">' + esc(String(st.label || noun + " " + (k + 1)).toUpperCase()) + (st.vp ? " · +" + esc(st.vp) + " VP" : "") + "</span>" +
        (st.title ? '<span class="ttl">' + esc(st.title) + "</span>" : "") + (st.text ? "<p>" + esc(st.text) + "</p>" : "");
    }

    function render(animate) {
      var s = stateAt(scene, k), st = steps[k] || null, h = "";
      if (puzzle) {
        h += '<div class="gb-top"><span class="goal">GOAL: <span>' + esc((scene.goal || "").toUpperCase()) + '</span></span><span class="vp"><b>' + s.vp + "</b> / " + esc(scene.vp_goal || "?") + " VP</span></div>";
      } else {
        h += '<div class="gb-top"><span>' + esc((scene.title || (noun === "MOMENT" ? "The game in " + steps.length + " moments" : "Step by step")).toUpperCase()) + '</span><span class="r">' + (k < 0 ? "DEPLOYMENT" : noun + " " + (k + 1) + "/" + steps.length) + "</span></div>";
      }
      h += '<div class="gb-main"><div><div class="gb-screen">' + drawScene(scene, s, id, { fx: animate, delay: 0 }) + "</div>";
      h += '<div class="gb-legend"><span><i class="a"></i>' + esc(sideName(scene, "A").toUpperCase()) + '</span><span><i class="b"></i>' + esc(sideName(scene, "B").toUpperCase()) + "</span>";
      if ((scene.objectives || []).length || (scene.mapData.o || []).length) h += '<span><i class="o"></i>OBJECTIVE</span>';
      h += "</div></div><div class=\"gb-side\">";
      if (puzzle) {
        var mine = (scene.units || []).filter(function (u) { return u.side !== "B" && !s.dead[String(u.id)]; });
        if (!pickedUnit && mine.length) pickedUnit = String(mine[0].id);
        if (mine.length > 1) {
          h += '<div class="gb-box gb-ops"><small>1. PICK AN OPERATIVE</small><div class="gb-pick">';
          mine.forEach(function (u) {
            h += '<button type="button" data-unit="' + esc(u.id) + '" aria-pressed="' + (String(u.id) === pickedUnit) + '">' + esc(u.id) + " · " + esc(String(u.name || "").toUpperCase()) + "</button>";
          });
          h += "</div></div>";
        }
        var acts = scene.actions || ["reposition", "charge", "fight", "shoot", "loot"];
        h += '<div class="gb-box gb-actions"><small>' + (mine.length > 1 ? "2. " : "") + "CHOOSE AN ACTION" + (mine.length === 1 ? " FOR " + esc(String(mine[0].name || mine[0].id).toUpperCase()) : "") + "</small>";
        acts.forEach(function (a) {
          var def = ACTIONS[a] || { name: a, help: "" };
          h += '<button type="button" data-action="' + esc(a) + '"' + (solved ? " disabled" : "") + "><b>" + esc(def.name.toUpperCase()) + "</b><span>" + esc(def.help) + "</span></button>";
        });
        h += "</div>";
      } else {
        h += '<div class="gb-box gb-menu" role="group" aria-label="Choose a ' + noun.toLowerCase() + '">';
        h += '<button type="button" data-go="-1" aria-current="' + (k === -1) + '">0. DEPLOYMENT</button>';
        steps.forEach(function (x, i) {
          h += '<button type="button" data-go="' + i + '" aria-current="' + (i === k) + '">' + (i + 1) + ". " + esc(String(x.title || "").toUpperCase()) + "</button>";
        });
        h += "</div>";
      }
      h += '<div class="gb-box gb-caption' + (wrong ? " fx-shake" : "") + '" aria-live="polite">' + caption(st) + "</div><div class=\"gb-btns\">";
      if (puzzle) {
        h += '<button type="button" data-act="reset"' + (k < 0 && !tries ? " disabled" : "") + ">↺ RESET</button>";
        h += '<button type="button" class="go" data-act="solution"' + (solved ? " disabled" : "") + ">SHOW SOLUTION</button>";
      } else {
        h += '<button type="button" data-act="prev"' + (k <= -1 ? " disabled" : "") + ">◀ PREV</button>";
        h += '<button type="button" class="go" data-act="next"' + (k >= steps.length - 1 ? " disabled" : "") + ">NEXT ▶</button>";
      }
      h += "</div></div></div>";
      root.innerHTML = h;
      wrong = false;
      if (animate) animateMoves(root.querySelector(".gb-screen svg"), s, R);
    }
    function keepFocus(sel) {
      var el = sel && root.querySelector(sel);
      if (el && !el.disabled) el.focus({ preventScroll: true });
    }
    function go(n, animate) {
      var prev = k;
      k = Math.max(-1, Math.min(steps.length - 1, n));
      render(animate && k === prev + 1);
    }
    function tryAction(action) {
      var st = steps[k + 1];
      if (!st) return;
      var okAction = String(st.action || "").toLowerCase() === action;
      var want = stepUnit(st), okUnit = !want || want === pickedUnit;
      if (okAction && okUnit) {
        msg = null; go(k + 1, true);
        if (k === steps.length - 1) { solved = true; setTimeout(function () { render(false); }, reduceMotion ? 0 : 1200); }
      } else {
        tries++;
        var def = ACTIONS[action] || { name: action };
        msg = '<span class="tp">NOT QUITE · TRY AGAIN</span><p>' + esc(st.hint || (okAction && !okUnit ? "Right action, but not with this operative." : def.name + " is not the best move right now. Think about what scores first.")) + "</p>";
        wrong = true;
        render(false);
      }
    }
    function playSolution() {
      msg = null;
      var next = function () {
        if (k >= steps.length - 1) { solved = true; render(false); return; }
        go(k + 1, true);
        setTimeout(next, reduceMotion ? 0 : 1300);
      };
      next();
    }
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b || !root.contains(b) || b.disabled) return;
      if (b.hasAttribute("data-go")) { msg = null; go(+b.getAttribute("data-go"), true); keepFocus('[data-go="' + k + '"]'); }
      if (b.hasAttribute("data-unit")) { pickedUnit = b.getAttribute("data-unit"); msg = null; render(false); keepFocus('[data-unit="' + pickedUnit + '"]'); }
      if (b.hasAttribute("data-action")) { var a = b.getAttribute("data-action"); tryAction(a); keepFocus('[data-action="' + a + '"]'); }
      var act = b.getAttribute("data-act");
      if (act === "next") { go(k + 1, true); keepFocus('[data-act="next"]'); }
      if (act === "prev") { go(k - 1, false); keepFocus('[data-act="prev"]'); }
      if (act === "reset") { k = -1; tries = 0; msg = null; solved = false; pickedUnit = null; render(false); keepFocus('[data-action]'); }
      if (act === "solution") { k = -1; msg = null; render(false); playSolution(); }
    });
    root.addEventListener("keydown", function (e) {
      if (puzzle || e.target.closest("input,textarea")) return;
      if (e.key === "ArrowRight") { go(k + 1, true); e.preventDefault(); }
      if (e.key === "ArrowLeft") { go(k - 1, false); e.preventDefault(); }
    });
    render(false);
  }

  KTT.board = { edgesSvg: edgesSvg, mount: mount, stateAt: stateAt, drawScene: drawScene, cellName: cellName, cellPos: cellPos, toPos: toPos, ACTIONS: ACTIONS };

  function boot() {
    var maps = window.KTT_MAPS || {};
    document.querySelectorAll("[data-scene]").forEach(function (el) {
      var src = el.querySelector('script[type="application/json"]');
      if (!src) return;
      var scene;
      try { scene = JSON.parse(src.textContent); } catch (e) { el.innerHTML = '<p class="gb-note">Board unavailable.</p>'; return; }
      if (!scene.mapData && maps[scene.map]) scene.mapData = maps[scene.map];
      mount(el, scene);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
