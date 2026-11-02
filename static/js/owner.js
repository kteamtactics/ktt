/* KTT owner mode: edit and publish the site's files on GitHub from the browser.
   The GitHub key is kept on this device only, encrypted with the owner's password (AES-GCM, PBKDF2). */
(function () {
  "use strict";
  var root = document.getElementById("owner");
  if (!root) return;
  var REPO = root.getAttribute("data-repo"), BRANCH = root.getAttribute("data-branch") || "main";
  var BASE = window.KTT_BASE || "../", TEAMS = window.KTT_TEAMS || [];
  var KEY = "ktt-owner-key";
  var $ = function (id) { return document.getElementById(id); };
  var token = null, section = "news", doc = null;

  // ---------- small helpers ----------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function b64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function unb64(s) { return decodeURIComponent(escape(atob(s.replace(/\n/g, "")))); }
  function slugify(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "page"; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function dateStr(v) {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return v ? String(v).slice(0, 10) : "";
  }
  function msg(t, bad) { var m = $("o-msg"); m.textContent = t; m.style.color = bad ? "#ff8a7a" : ""; }

  // ---------- encryption of the GitHub key ----------
  var enc = new TextEncoder(), dec = new TextDecoder();
  function buf2b(b) { return btoa(String.fromCharCode.apply(null, new Uint8Array(b))); }
  function b2buf(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function deriveKey(pass, salt) {
    return crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]).then(function (k) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: 250000, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }
  function lockToken(tok, pass) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(pass, salt).then(function (k) { return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, enc.encode(tok)); })
      .then(function (data) { store(KEY, JSON.stringify({ s: buf2b(salt), i: buf2b(iv), d: buf2b(data) })); });
  }
  function unlockToken(pass) {
    var box = JSON.parse(load(KEY));
    return deriveKey(pass, b2buf(box.s)).then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: b2buf(box.i) }, k, b2buf(box.d)); })
      .then(function (d) { return dec.decode(d); });
  }

  // ---------- GitHub ----------
  function api(method, path, body) {
    return fetch("https://api.github.com/repos/" + REPO + path, {
      method: method,
      headers: { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (r.status === 404 && method === "GET") return null;
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) {
        var why = r.status === 401 ? "GitHub refused the key (it may have expired)." : r.status === 403 ? "The key does not allow this. Check its permissions (Contents: read and write)." : r.status === 409 || r.status === 422 ? "The file changed on GitHub in the meantime. Reload it and try again." : (j.message || "GitHub error " + r.status);
        throw new Error(why);
      });
      return r.status === 204 ? {} : r.json();
    });
  }
  function getFile(path) {
    return api("GET", "/contents/" + path + "?ref=" + BRANCH).then(function (j) { return j ? { text: unb64(j.content), sha: j.sha } : null; });
  }
  function putFile(path, text, sha, message, isBase64) {
    return api("PUT", "/contents/" + path, { message: message, content: isBase64 ? text : b64(text), sha: sha || undefined, branch: BRANCH });
  }

  // ---------- publication status ----------
  var pollTimer = null;
  function status(t, cls) { var s = $("o-status"); s.textContent = t; s.className = "o-status " + (cls || ""); }
  function watchBuild(since) {
    clearTimeout(pollTimer);
    status("Publishing…", "busy");
    var tries = 0;
    (function poll() {
      tries++;
      api("GET", "/actions/runs?per_page=5&branch=" + BRANCH).then(function (j) {
        var run = ((j && j.workflow_runs) || []).filter(function (r) { return new Date(r.created_at).getTime() >= since - 15000; })[0];
        if (run && run.status === "completed") {
          if (run.conclusion === "success") status("Online ✓", "ok");
          else { status("Not published: see GitHub › Actions", "bad"); msg("The site was not updated because of an error in a file. Open " + run.html_url + " to see which line to fix.", true); }
          return;
        }
        if (tries < 60) pollTimer = setTimeout(poll, 5000); else status("Still publishing. Check GitHub › Actions.", "busy");
      }).catch(function () { status("Published. The site updates in about a minute.", "ok"); });
    })();
  }

  // ---------- lock screen ----------
  function showLock() {
    $("o-app").hidden = true; $("o-lock").hidden = false;
    var has = !!load(KEY);
    $("o-unlock").hidden = !has; $("o-setup").hidden = has;
    (has ? $("o-pass") : $("o-token")).focus();
  }
  function start() {
    $("o-lock").hidden = true; $("o-app").hidden = false;
    api("GET", "").then(function (r) { if (!r) throw new Error("Repository " + REPO + " not found with this key."); openSection("news"); })
      .catch(function (e) { token = null; showLock(); $("o-lockmsg").textContent = e.message; });
  }
  $("o-unlock").addEventListener("submit", function (e) {
    e.preventDefault();
    unlockToken($("o-pass").value).then(function (t) { token = t; $("o-pass").value = ""; $("o-lockmsg").textContent = ""; start(); })
      .catch(function () { $("o-lockmsg").textContent = "Wrong password."; });
  });
  $("o-setup").addEventListener("submit", function (e) {
    e.preventDefault();
    var p1 = $("o-newpass").value, p2 = $("o-newpass2").value, t = $("o-token").value.trim();
    if (p1 !== p2) { $("o-lockmsg").textContent = "The two passwords are different."; return; }
    token = t;
    api("GET", "").then(function (r) {
      if (!r) throw new Error("Repository " + REPO + " not found with this key.");
      return lockToken(t, p1);
    }).then(function () { $("o-token").value = ""; $("o-newpass").value = ""; $("o-newpass2").value = ""; $("o-lockmsg").textContent = ""; start(); })
      .catch(function (err) { token = null; $("o-lockmsg").textContent = err.message; });
  });
  $("o-forget").addEventListener("click", function () { store(KEY, null); showLock(); });
  $("o-lockbtn").addEventListener("click", function () { token = null; doc = null; showLock(); });

  // ---------- sections and lists ----------
  var FOLDERS = { news: "content/news", tactics: "content/tactics", "battle-analysis": "content/battle-analysis", teams: "content/teams", pages: "content/pages" };
  var NOUN = { news: "news article", tactics: "tactics article", "battle-analysis": "battle analysis", teams: "team", pages: "page" };
  document.querySelectorAll("#o-app [data-sec]").forEach(function (b) {
    b.addEventListener("click", function () { openSection(b.getAttribute("data-sec")); });
  });
  function openSection(sec) {
    section = sec; doc = null;
    document.querySelectorAll("#o-app [data-sec]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-sec") === sec ? "true" : "false"); });
    $("o-edit").hidden = true; $("o-mapedit").hidden = true; $("o-list").hidden = false;
    if (sec === "settings") { openFile("site.yml"); return; }
    if (sec === "maps") { openMaps(); return; }
    $("o-list").innerHTML = '<p class="small">Loading…</p>';
    api("GET", "/contents/" + FOLDERS[sec] + "?ref=" + BRANCH).then(function (items) {
      items = (items || []).filter(function (f) { return /\.md$/.test(f.name) && f.name[0] !== "_"; });
      var h = '<button class="btn" type="button" id="o-new">New ' + NOUN[sec] + "</button>";
      h += '<div class="o-items">';
      items.forEach(function (f) {
        var slug = f.name.replace(/\.md$/, "");
        var label = sec === "teams" ? ((TEAMS.filter(function (t) { return t.slug === slug; })[0] || {}).name || slug) : slug.replace(/-/g, " ");
        h += '<button type="button" class="o-item" data-path="' + esc(f.path) + '">' + (sec === "teams" ? '<img class="pxi" src="' + BASE + "img/teams/" + esc(slug) + '.svg" alt="" onerror="this.style.visibility=\'hidden\'">' : "") + "<span>" + esc(label) + "</span></button>";
      });
      h += "</div>";
      if (!items.length) h += '<p class="small">Nothing here yet.</p>';
      $("o-list").innerHTML = h;
      var nb = $("o-new"); if (nb) nb.addEventListener("click", newDoc);
      $("o-list").querySelectorAll("[data-path]").forEach(function (b) { b.addEventListener("click", function () { openFile(b.getAttribute("data-path")); }); });
    }).catch(function (e) { $("o-list").innerHTML = '<p class="small">' + esc(e.message) + "</p>"; });
  }

  // ---------- front matter ----------
  function split(text) {
    if (text.slice(0, 3) !== "---") return { meta: {}, body: text };
    var end = text.indexOf("\n---", 3);
    if (end < 0) return { meta: {}, body: text };
    var head = text.slice(3, end), rest = text.slice(end + 4);
    rest = rest.slice(rest.indexOf("\n") + 1);
    return { meta: (window.jsyaml.safeLoad || window.jsyaml.load)(head) || {}, body: rest };
  }
  function join(meta, body) {
    var clean = {};
    Object.keys(meta).forEach(function (k) {
      var v = meta[k];
      if (v === "" || v == null || (Array.isArray(v) && !v.length && k !== "teams")) return;
      clean[k] = v;
    });
    return "---\n" + (window.jsyaml.safeDump || window.jsyaml.dump)(clean, { lineWidth: -1, noRefs: true, flowLevel: 4 }) + "---\n" + (body || "").replace(/^\n+/, "");
  }

  // ---------- form ----------
  var FIELDS = {
    news: [["title", "Title", "text"], ["date", "Date", "date"], ["tag", "Label (small orange word above the title)", "text"], ["standfirst", "Standfirst (one or two sentences under the title)", "area"], ["image", "Image", "image"], ["image_alt", "What the image shows (for the blind and for Google)", "text"], ["featured", "Big on the home page", "check"], ["teams", "Teams in this article", "teams"], ["draft", "Draft (not published yet)", "check"]],
    tactics: [["title", "Title", "text"], ["date", "Date", "date"], ["tag", "Concept (used for the filters: Positioning, Activations, Objectives, Your move…)", "text"], ["standfirst", "Standfirst", "area"], ["image", "Image for the cards", "image"], ["image_alt", "What the image shows", "text"], ["takeaway", "What to remember (orange box)", "area"], ["featured", "Big on the home page", "check"], ["teams", "Teams in this article", "teams"], ["draft", "Draft (not published yet)", "check"]],
    "battle-analysis": [["title", "Title", "text"], ["date", "Date", "date"], ["event", "Event (e.g. LVO Kill Team Championships · Day 1)", "text"], ["map_name", "Map", "text"], ["score", "Score", "text"], ["winner.player", "Winner", "text"], ["winner.team", "Winner's team", "team"], ["loser.player", "Opponent", "text"], ["loser.team", "Opponent's team", "team"], ["lesson", "The lesson (orange box)", "area"], ["video", "Link to the video (optional)", "text"], ["standfirst", "One sentence for the cards", "area"], ["featured", "Big on the home page", "check"], ["draft", "Draft (not published yet)", "check"]],
    pages: [["title", "Title", "text"], ["nav", "Name in the top menu (empty = not in the menu)", "text"], ["order", "Position in the menu (1, 2, 3…)", "text"], ["standfirst", "Standfirst (under the title)", "area"], ["image", "Image", "image"], ["image_alt", "What the image shows", "text"], ["draft", "Draft (not published yet)", "check"]],
    teams: [["name", "Name", "text"], ["guide", "Guide published: the rules are visible on the site (untick = \"Guide in progress\")", "pub"], ["sprite", "Pixel art (optional: leave empty to keep the current one)", "image"], ["faction", "Faction", "select:Imperium,Chaos,Xenos"], ["status", "List", "select:classified,declassified"], ["season", "Season", "select:,Octarius,Gallowdark,Bheta-Decima,Volkus,Tomb World,Armageddon"], ["released", "Release date (e.g. June 2024)", "text"], ["line", "One line on the card", "area"], ["summary", "Short summary on the team page", "area"], ["plays_best", "Plays best", "text"], ["good_for", "Good for", "text"], ["strengths", "Best at (one per line)", "lines"], ["weaknesses", "Worst at (one per line)", "lines"], ["difficulty", "Difficulty", "select:,1,2,3"], ["ratings.shooting", "Shooting (stars)", "select:,1,2,3,4,5"], ["ratings.melee", "Melee (stars)", "select:,1,2,3,4,5"], ["ratings.defence", "Defence (stars)", "select:,1,2,3,4,5"], ["ratings.tricks", "Tricks (stars)", "select:,1,2,3,4,5"], ["ratings.movement", "Movement (stars)", "select:,1,2,3,4,5"], ["ratings.synergy", "Synergy (stars)", "select:,1,2,3,4,5"], ["home", "Show on the home page", "check"], ["featured", "In the Latest list on the home page (only once the guide is published)", "check"], ["rules.faction", "Faction rules: one per line, written Name: what it does", "rules"], ["rules.strategic", "Strategy ploys: one per line, Name: what it does", "rules"], ["rules.firefight", "Firefight ploys: one per line, Name: what it does", "rules"], ["rules.equipment", "Equipment: one per line, Name: what it does", "rules"], ["rules.operatives", "Operatives: one per line, Operative · rule: what it does", "rules"]]
  };
  function getp(o, path) { return path.split(".").reduce(function (a, k) { return a && a[k] != null ? a[k] : undefined; }, o); }
  function setp(o, path, v) {
    var ks = path.split("."), last = ks.pop(), t = o;
    ks.forEach(function (k) { if (!t[k] || typeof t[k] !== "object") t[k] = {}; t = t[k]; });
    if (v === "" || v == null || v === false) delete t[last]; else t[last] = v;
    if (ks.length && !Object.keys(t).length) { var p = o; ks.slice(0, -1).forEach(function (k) { p = p[k]; }); delete p[ks[ks.length - 1]]; }
  }
  function fieldHtml(f, meta, i) {
    var key = f[0], label = f[1], type = f[2], v = getp(meta, key), id = "f" + i;
    if (type === "rules") return "<label>" + esc(label) + '<textarea class="o-rules" id="' + id + '" data-k="' + key + '" data-t="rules">' + esc((v || []).map(function (r) { return r[0] + ": " + r[1]; }).join("\n")) + "</textarea></label>";
    if (type === "pub") return '<label class="o-check" style="grid-column:1/-1"><input type="checkbox" id="' + id + '" data-k="' + key + '" data-t="pub"' + (v === "published" ? " checked" : "") + "> " + esc(label) + "</label>";
    if (type === "check") return '<label class="o-check"><input type="checkbox" id="' + id + '" data-k="' + key + '" data-t="check"' + (v ? " checked" : "") + "> " + esc(label) + "</label>";
    var h = "<label>" + esc(label);
    if (type === "area") h += '<textarea id="' + id + '" data-k="' + key + '" data-t="text">' + esc(v || "") + "</textarea>";
    else if (type === "lines") h += '<textarea id="' + id + '" data-k="' + key + '" data-t="lines">' + esc((v || []).join("\n")) + "</textarea>";
    else if (type === "date") h += '<input type="date" id="' + id + '" data-k="' + key + '" data-t="text" value="' + esc(dateStr(v)) + '">';
    else if (type.indexOf("select:") === 0) {
      h += '<select id="' + id + '" data-k="' + key + '" data-t="' + (key.indexOf("ratings") === 0 || key === "difficulty" ? "num" : "text") + '">';
      type.slice(7).split(",").forEach(function (o) { h += '<option value="' + esc(o) + '"' + (String(v == null ? "" : v) === o ? " selected" : "") + ">" + esc(o || "—") + "</option>"; });
      h += "</select>";
    } else if (type === "team") {
      h += '<select id="' + id + '" data-k="' + key + '" data-t="text"><option value="">—</option>';
      TEAMS.forEach(function (t) { h += '<option value="' + esc(t.slug) + '"' + (v === t.slug ? " selected" : "") + ">" + esc(t.name) + "</option>"; });
      h += "</select>";
    } else if (type === "teams") {
      h += '<select id="' + id + '" data-k="' + key + '" data-t="multi" multiple size="5">';
      TEAMS.forEach(function (t) { h += '<option value="' + esc(t.slug) + '"' + ((v || []).indexOf(t.slug) !== -1 ? " selected" : "") + ">" + esc(t.name) + "</option>"; });
      h += '</select><span class="small">Hold Ctrl (Cmd on a Mac) to pick several.</span>';
    } else if (type === "image") {
      h += '<div class="row" style="flex-wrap:nowrap"><input id="' + id + '" data-k="' + key + '" data-t="text" value="' + esc(v || "") + '" placeholder="/img/articles/name.jpg" style="flex:1"><button class="btn sm ghost" type="button" data-upload="' + id + '" style="flex:0 0 auto">Upload an image</button></div>';
      if (v) h += '<img class="o-thumb pxi" src="' + esc(BASE + String(v).replace(/^\//, "")) + '" alt="">';
    } else h += '<input id="' + id + '" data-k="' + key + '" data-t="text" value="' + esc(v == null ? "" : v) + '">';
    return h + "</label>";
  }
  function renderForm() {
    var f = $("o-form"), h = "";
    if (doc.kind === "raw") {
      h = '<label>Settings file<textarea id="o-raw" class="o-raw">' + esc(doc.text) + "</textarea></label>";
    } else {
      (FIELDS[doc.section] || []).forEach(function (fd, i) { h += fieldHtml(fd, doc.meta, i); });
      h += '<label>' + (doc.section === "teams" ? "Full guide (optional, shown under the rules once the guide is published)" : doc.section === "battle-analysis" ? "Summary of the game" : "Text") +
        ' <span class="small">(a blank line = new paragraph · ## Subtitle · **bold** · *italic*' + (doc.section === "tactics" ? " · [[board]] = where the board goes" : "") + ")</span>" +
        '<textarea id="o-body" class="o-body">' + esc(doc.body) + "</textarea></label>";
    }
    f.innerHTML = h;
    f.querySelectorAll("[data-upload]").forEach(function (b) { b.addEventListener("click", function () { upload(b.getAttribute("data-upload")); }); });
    var hasBoardType = doc.section === "tactics" || doc.section === "battle-analysis";
    $("o-boardwrap").hidden = !(hasBoardType && doc.meta.scene);
    $("o-addboard").hidden = !(hasBoardType && !doc.meta.scene);
    if (hasBoardType && doc.meta.scene) window.KTT.editor.load(doc.meta.scene);
    $("o-delete").hidden = doc.kind === "raw" || doc.isNew;
    $("o-confirm").hidden = true;
    var v = $("o-view");
    v.hidden = doc.isNew || doc.kind === "raw";
    if (!v.hidden) v.href = BASE + doc.url;
  }
  function readForm() {
    if (doc.kind === "raw") { doc.text = $("o-raw").value; return; }
    $("o-form").querySelectorAll("[data-k]").forEach(function (el) {
      var k = el.getAttribute("data-k"), t = el.getAttribute("data-t"), v;
      if (t === "check") v = el.checked;
      else if (t === "pub") v = el.checked ? "published" : "";
      else if (t === "rules") v = el.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) {
        var i = x.indexOf(": ");
        return i > 0 ? [x.slice(0, i).trim(), x.slice(i + 2).trim()] : [x, ""];
      });
      else if (t === "lines") v = el.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
      else if (t === "multi") v = Array.prototype.slice.call(el.selectedOptions).map(function (o) { return o.value; });
      else if (t === "num") v = el.value ? +el.value : "";
      else v = el.value.trim();
      if (Array.isArray(v) && !v.length && k !== "teams") v = "";
      if (k.indexOf("rules.") === 0 && v === "") { if (doc.meta.rules) delete doc.meta.rules[k.slice(6)]; if (doc.meta.rules && !Object.keys(doc.meta.rules).length) delete doc.meta.rules; return; }
      setp(doc.meta, k, v);
    });
    if (doc.meta.date) doc.meta.date = dateStr(doc.meta.date);
    doc.body = $("o-body").value;
    if (!$("o-boardwrap").hidden) doc.meta.scene = window.KTT.editor.get();
  }

  // ---------- open / new / save / delete ----------
  function showEdit(path) {
    $("o-list").hidden = true; $("o-edit").hidden = false; $("o-path").textContent = path; msg("");
    window.scrollTo({ top: root.offsetTop - 16 });
  }
  function openFile(path) {
    showEdit(path);
    $("o-form").innerHTML = '<p class="small">Loading…</p>';
    getFile(path).then(function (f) {
      if (!f) throw new Error("File not found: " + path);
      if (path === "site.yml") doc = { kind: "raw", path: path, sha: f.sha, text: f.text };
      else {
        var parts = split(f.text), slug = path.split("/").pop().replace(/\.md$/, "");
        doc = { kind: "md", section: section, path: path, sha: f.sha, meta: parts.meta, body: parts.body, url: (section === "teams" ? "teams/" : section === "pages" ? "" : section + "/") + slug + "/" };
      }
      renderForm();
    }).catch(function (e) { $("o-form").innerHTML = '<p class="small">' + esc(e.message) + "</p>"; });
  }
  function newDoc() {
    var meta = section === "teams" ? { name: "", status: "classified", faction: "Imperium" } : section === "pages" ? { title: "" } : { title: "", date: today() };
    if (section === "battle-analysis") meta.scene = { map: "volkus-1", mode: "moments", sides: { A: {}, B: {} }, units: [], steps: [] };
    doc = { kind: "md", section: section, path: "", sha: null, meta: meta, body: "", isNew: true };
    showEdit("New " + NOUN[section]);
    renderForm();
    var t = $("o-form").querySelector('[data-k="title"],[data-k="name"]'); if (t) t.focus();
  }
  $("o-back").addEventListener("click", function () { openSection(section); });
  $("o-addboard").addEventListener("click", function () {
    readForm();
    doc.meta.scene = { map: section === "tactics" ? "divided-field" : "volkus-1", mode: section === "tactics" ? "steps" : "moments", sides: { A: {}, B: {} }, units: [], steps: [] };
    renderForm();
  });
  $("o-noboard").addEventListener("click", function () { readForm(); delete doc.meta.scene; $("o-boardwrap").hidden = true; renderForm(); });
  $("o-save").addEventListener("click", function () {
    readForm();
    var path = doc.path, text;
    if (doc.kind === "raw") {
      try { (window.jsyaml.safeLoad || window.jsyaml.load)(doc.text); } catch (e) { msg("There is a mistake in the settings: " + e.message, true); return; }
      text = doc.text;
    } else {
      var nm = doc.section === "teams" ? doc.meta.name : doc.meta.title;
      if (!nm) { msg(doc.section === "teams" ? "Give the team a name first." : "Give it a title first.", true); return; }
      if (doc.isNew) {
        var sl = slugify(nm);
        if (doc.section === "pages" && ["news", "tactics", "battle-analysis", "teams", "owner", "img", "css", "js"].indexOf(sl) !== -1) { msg("This title is already used by a section of the site. Choose another one.", true); return; }
        path = FOLDERS[doc.section] + "/" + sl + ".md";
        doc.url = (doc.section === "teams" ? "teams/" : doc.section === "pages" ? "" : doc.section + "/") + sl + "/";
      }
      if (doc.meta.scene && doc.meta.scene.mode === "puzzle") {
        var bad = (doc.meta.scene.steps || []).findIndex(function (s) { return !s.action; });
        if (bad !== -1) { msg("Puzzle step " + (bad + 1) + " needs its right action (in the board, under Steps).", true); return; }
      }
      text = join(doc.meta, doc.body);
    }
    $("o-save").disabled = true; msg("Sending to GitHub…");
    var since = Date.now();
    (doc.isNew ? getFile(path) : Promise.resolve(null)).then(function (exists) {
      if (exists) throw new Error("A page with this title already exists. Change the title.");
      return putFile(path, text, doc.sha, (doc.isNew ? "Add " : "Update ") + path + " (owner mode)");
    }).then(function (r) {
      doc.sha = r.content.sha; doc.path = path; doc.isNew = false;
      $("o-path").textContent = path; $("o-delete").hidden = doc.kind === "raw";
      var v = $("o-view"); if (doc.url) { v.hidden = false; v.href = BASE + doc.url; }
      msg("Saved. The site updates in about a minute.");
      watchBuild(since);
    }).catch(function (e) { msg(e.message, true); }).then(function () { $("o-save").disabled = false; });
  });
  $("o-delete").addEventListener("click", function () { $("o-confirm").hidden = false; $("o-yes").focus(); });
  $("o-no").addEventListener("click", function () { $("o-confirm").hidden = true; });
  $("o-yes").addEventListener("click", function () {
    var since = Date.now();
    api("DELETE", "/contents/" + doc.path, { message: "Delete " + doc.path + " (owner mode)", sha: doc.sha, branch: BRANCH }).then(function () {
      watchBuild(since); openSection(section);
    }).catch(function (e) { msg(e.message, true); });
  });

  // ---------- image upload ----------
  function upload(inputId) {
    var pickr = document.createElement("input");
    pickr.type = "file"; pickr.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
    pickr.addEventListener("change", function () {
      var file = pickr.files[0]; if (!file) return;
      if (file.size > 3 * 1024 * 1024) { msg("This image is too heavy (over 3 MB). Make it smaller first.", true); return; }
      var name = slugify(file.name.replace(/\.[^.]+$/, "")) + "." + (file.name.split(".").pop() || "jpg").toLowerCase();
      var path = "static/img/articles/" + name;
      msg("Uploading the image…");
      var reader = new FileReader();
      reader.onload = function () {
        var data = String(reader.result).split(",")[1];
        getFile(path).then(function (ex) {
          if (ex) return { exists: true };
          return putFile(path, data, null, "Add image " + name + " (owner mode)", true);
        }).then(function () {
          $(inputId).value = "/img/articles/" + name;
          msg("Image ready: it appears on the site with the next publication. Press Publish.");
        }).catch(function (e) { msg(e.message, true); });
      };
      reader.readAsDataURL(file);
    });
    pickr.click();
  }


  // ---------- maps ----------
  var MAPFILE = "data/maps.json", maps = null, mapsSha = null, mapIdx = -1, paint = ".";
  function mapMsg(t, bad) { var m = $("o-mapmsg"); m.textContent = t; m.style.color = bad ? "#ff8a7a" : ""; }
  function openMaps() {
    $("o-mapedit").hidden = true; $("o-list").hidden = false;
    $("o-list").innerHTML = '<p class="small">Loading…</p>';
    getFile(MAPFILE).then(function (f) {
      maps = JSON.parse(f.text); mapsSha = f.sha;
      var h = '<div class="row"><button class="btn" type="button" id="o-newmap">New map (squares)</button></div>';
      h += '<p class="small">Maps are shared by every board on the site (battle analysis and puzzles). Square maps are painted cell by cell; killzone maps are edited with their numbers. To start from an existing map, open it and use “Save as a copy”.</p><div class="o-items">';
      maps.forEach(function (m, i) { h += '<button type="button" class="o-item" data-map="' + i + '"><span>' + esc(m.name || m.id) + ' <span class="small">· ' + (m.kind === "grid" ? "squares" : "killzone") + "</span></span></button>"; });
      $("o-list").innerHTML = h + "</div>";
      $("o-newmap").addEventListener("click", function () {
        var rows = []; for (var y = 0; y < 10; y++) rows.push(new Array(15).join("."));
        editMap(-1, { id: "", kind: "grid", name: "", w: 14, h: 10, u: 1, rows: rows });
      });
      $("o-list").querySelectorAll("[data-map]").forEach(function (b) { b.addEventListener("click", function () { var i = +b.getAttribute("data-map"); editMap(i, JSON.parse(JSON.stringify(maps[i]))); }); });
    }).catch(function (e) { $("o-list").innerHTML = '<p class="small">' + esc(e.message) + "</p>"; });
  }
  var cur = null;
  function editMap(i, m) {
    mapIdx = i; cur = m;
    $("o-list").hidden = true; $("o-mapedit").hidden = false; mapMsg("");
    var grid = m.kind === "grid";
    var h = '<label>Name<input id="m-name" value="' + esc(m.name || "") + '"></label>';
    h += '<label>Short code (used in articles; letters, numbers and dashes)<input id="m-id" value="' + esc(m.id || "") + '"' + (i >= 0 ? " readonly" : "") + "></label>";
    if (grid) h += '<label>Width (squares)<input id="m-w" type="number" min="4" max="40" value="' + m.w + '"></label><label>Height (squares)<input id="m-h" type="number" min="4" max="40" value="' + m.h + '"></label>';
    $("o-mapform").innerHTML = h;
    $("o-mapdelete").hidden = i < 0;
    $("o-mapsave").textContent = "Publish";
    var old = $("o-mapcopy"); if (old) old.remove();
    if (i >= 0) {
      var c = document.createElement("button"); c.className = "btn ghost"; c.type = "button"; c.id = "o-mapcopy"; c.textContent = "Save as a copy";
      $("o-mapsave").after(c);
      c.addEventListener("click", function () { readMap(); var copy = JSON.parse(JSON.stringify(cur)); copy.name = (copy.name || copy.id) + " (copy)"; copy.id = ""; editMap(-1, copy); mapMsg("This is a copy: give it a name and a code, then Publish."); });
    }
    $("o-mapgridwrap").hidden = !grid; $("o-maprawwrap").hidden = grid;
    if (grid) {
      ["m-w", "m-h"].forEach(function (k) { $(k).addEventListener("change", resizeGrid); });
      drawGrid();
    } else {
      var raw = JSON.parse(JSON.stringify(m)); delete raw.id; delete raw.name;
      $("o-mapraw").value = "{\n" + Object.keys(raw).map(function (k) {
        var v = raw[k];
        if (Array.isArray(v) && v.length && Array.isArray(v[0])) return ' "' + k + '": [\n' + v.map(function (x) { return "  " + JSON.stringify(x); }).join(",\n") + "\n ]";
        return ' "' + k + '": ' + JSON.stringify(v);
      }).join(",\n") + "\n}";
      $("o-mapraw").onchange = function () { try { readMap(); preview(); mapMsg(""); } catch (e) { mapMsg("The numbers are not valid: " + e.message, true); } };
    }
    preview();
  }
  function resizeGrid() {
    var w = Math.max(4, Math.min(40, +$("m-w").value || 14)), hh = Math.max(4, Math.min(40, +$("m-h").value || 10));
    var rows = [];
    for (var y = 0; y < hh; y++) { var r = (cur.rows[y] || ""); rows.push((r + new Array(w + 1).join(".")).slice(0, w)); }
    cur.w = w; cur.h = hh; cur.rows = rows; drawGrid(); preview();
  }
  function drawGrid() {
    var g = $("o-mapgrid"), h = "";
    g.style.gridTemplateColumns = "repeat(" + cur.w + ",1fr)";
    cur.rows.forEach(function (r, y) { for (var x = 0; x < cur.w; x++) { var c = r[x] || "."; h += '<span data-x="' + x + '" data-y="' + y + '" class="' + (c === "#" ? "w" : c === "o" ? "c" : "") + '" title="' + String.fromCharCode(65 + x) + (y + 1) + '"></span>'; } });
    g.innerHTML = h;
  }
  (function () {
    var down = false;
    function hit(e) {
      var el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || !el.hasAttribute || !el.hasAttribute("data-x")) return;
      var x = +el.getAttribute("data-x"), y = +el.getAttribute("data-y"), r = cur.rows[y];
      if (r[x] === paint) return;
      cur.rows[y] = r.slice(0, x) + paint + r.slice(x + 1);
      el.className = paint === "#" ? "w" : paint === "o" ? "c" : "";
    }
    var g = $("o-mapgrid");
    g.addEventListener("pointerdown", function (e) { down = true; hit(e); e.preventDefault(); });
    window.addEventListener("pointermove", function (e) { if (down) hit(e); });
    window.addEventListener("pointerup", function () { if (down) { down = false; preview(); } });
    document.querySelectorAll("[data-paint]").forEach(function (b) {
      b.addEventListener("click", function () {
        paint = b.getAttribute("data-paint");
        document.querySelectorAll("[data-paint]").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
      });
    });
  })();
  function readMap() {
    cur.name = $("m-name").value.trim();
    if (mapIdx < 0) cur.id = slugify($("m-id").value.trim() || cur.name);
    if (cur.kind !== "grid") {
      var raw = JSON.parse($("o-mapraw").value);
      Object.keys(cur).forEach(function (k) { if (k !== "id" && k !== "name") delete cur[k]; });
      Object.keys(raw).forEach(function (k) { if (k !== "id" && k !== "name") cur[k] = raw[k]; });
    }
  }
  function preview() {
    try {
      var B = window.KTT.board, sc = { mapData: cur, units: [], steps: [], sides: { A: {}, B: {} } };
      $("o-mapprev").innerHTML = B.drawScene(sc, B.stateAt(sc, -1), "mp");
    } catch (e) { $("o-mapprev").innerHTML = '<p class="small">No preview: ' + esc(e.message) + "</p>"; }
  }
  $("o-mapback").addEventListener("click", openMaps);
  $("o-mapsave").addEventListener("click", function () {
    try { readMap(); } catch (e) { mapMsg("The numbers are not valid: " + e.message, true); return; }
    if (!cur.name) { mapMsg("Give the map a name.", true); return; }
    if (!cur.id) { mapMsg("Give the map a short code.", true); return; }
    $("o-mapsave").disabled = true; mapMsg("Sending to GitHub…");
    var since = Date.now();
    getFile(MAPFILE).then(function (f) {
      var list = JSON.parse(f.text);
      var at = list.findIndex(function (m) { return m.id === cur.id; });
      if (mapIdx < 0 && at !== -1) throw new Error("A map with the code “" + cur.id + "” already exists. Choose another code.");
      if (at === -1) list.push(cur); else list[at] = cur;
      var txt = "[\n" + list.map(function (m) { return JSON.stringify(m); }).join(",\n") + "\n]\n";
      return putFile(MAPFILE, txt, f.sha, (mapIdx < 0 ? "Add map " : "Update map ") + cur.id + " (owner mode)");
    }).then(function () {
      mapIdx = 1; $("o-mapdelete").hidden = false;
      mapMsg("Saved. The map is usable in the boards in about a minute (reload this page then).");
      watchBuild(since);
    }).catch(function (e) { mapMsg(e.message, true); }).then(function () { $("o-mapsave").disabled = false; });
  });
  $("o-mapdelete").addEventListener("click", function () {
    if (!window.confirm("Delete the map “" + (cur.name || cur.id) + "” for good? Articles that use it will stop the site from updating until they use another map.")) return;
    var since = Date.now();
    getFile(MAPFILE).then(function (f) {
      var list = JSON.parse(f.text).filter(function (m) { return m.id !== cur.id; });
      return putFile(MAPFILE, "[\n" + list.map(function (m) { return JSON.stringify(m); }).join(",\n") + "\n]\n", f.sha, "Delete map " + cur.id + " (owner mode)");
    }).then(function () { watchBuild(since); openMaps(); }).catch(function (e) { mapMsg(e.message, true); });
  });

  if (!window.crypto || !crypto.subtle) { $("o-lock").hidden = false; $("o-lockmsg").textContent = "This browser cannot keep the key safely. Use a recent Chrome, Firefox or Safari."; return; }
  showLock();
})();
