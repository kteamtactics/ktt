#!/usr/bin/env python3
"""KTT site builder.

Reads the Markdown files in content/, the settings in site.yml and the maps in
data/maps.json, renders them with the templates in templates/ and writes the
finished website into _site/. GitHub runs this automatically on every change
(see .github/workflows/deploy.yml). You never need to run it yourself.

Local preview:  python3 build.py && python3 -m http.server -d _site
"""
import datetime as dt
import html
import json
import math
import os
import re
import shutil
import sys

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "_site")
SECTIONS = {
    "news": {"title": "News", "url": "news/"},
    "tactics": {"title": "Tactics", "url": "tactics/"},
    "puzzles": {"title": "Puzzles", "url": "puzzles/"},
    "battle-analysis": {"title": "Battle analysis", "url": "battle-analysis/"},
    "teams": {"title": "Teams", "url": "teams/"},
}
# season: (classified until, rules supported until)
SEASONS = {
    "octarius": ("Nov 2025", "Oct 2027"),
    "gallowdark": ("Oct 2026", "Oct 2027"),
    "bheta-decima": ("Oct 2027", "Oct 2027"),
    "volkus": ("Oct 2028", "Oct 2030"),
    "tomb world": ("Oct 2029", "Oct 2030"),
    "armageddon": ("Oct 2030", "Oct 2030"),
}
RATING_AXES = ["shooting", "melee", "defence", "tricks", "movement", "synergy"]
RULE_GROUPS = [
    ("faction", "Faction rules"),
    ("strategic", "Strategy ploys"),
    ("firefight", "Firefight ploys"),
    ("equipment", "Equipment"),
    ("operatives", "Operatives"),
]


class BuildError(Exception):
    pass


def read_doc(path):
    """Split a Markdown file into its front matter (dict) and body (str)."""
    with open(path, encoding="utf-8") as f:
        text = f.read()
    if not text.startswith("---"):
        raise BuildError(f"{rel(path)}: the file must start with a line '---'")
    parts = text.split("\n---", 1)
    if len(parts) < 2:
        raise BuildError(f"{rel(path)}: the front matter is not closed with a line '---'")
    head = parts[0][3:]
    body = parts[1]
    body = body[body.find("\n") + 1:] if "\n" in body else ""
    try:
        meta = yaml.safe_load(head) or {}
    except yaml.YAMLError as e:
        raise BuildError(f"{rel(path)}: problem in the part between the '---' lines.\n{e}")
    if not isinstance(meta, dict):
        raise BuildError(f"{rel(path)}: the part between the '---' lines must be 'name: value' lines")
    return meta, body


def rel(path):
    return os.path.relpath(path, ROOT)


def to_date(value, path):
    if isinstance(value, dt.datetime):
        return value.date()
    if isinstance(value, dt.date):
        return value
    if isinstance(value, str):
        try:
            return dt.date.fromisoformat(value.strip())
        except ValueError:
            pass
    raise BuildError(f"{rel(path)}: 'date' must look like 2026-10-27")


def fmt_date(d):
    return f"{d.day} {d.strftime('%b %Y')}"


def team_display_name(name):
    words = name.split(" ")
    return " ".join(w if i == 0 or w not in ("Of", "The", "And") else w.lower() for i, w in enumerate(words))


class Site:
    def __init__(self, relative_index=False):
        self.relative_index = relative_index
        with open(os.path.join(ROOT, "site.yml"), encoding="utf-8") as f:
            self.settings = yaml.safe_load(f) or {}
        with open(os.path.join(ROOT, "data", "maps.json"), encoding="utf-8") as f:
            self.maps = {m["id"]: m for m in json.load(f)}
        self.md = markdown.Markdown(extensions=["extra", "sane_lists", "smarty"])
        self.env = Environment(
            loader=FileSystemLoader(os.path.join(ROOT, "templates")),
            autoescape=select_autoescape(["html"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )
        self.docs = {k: [] for k in SECTIONS}
        self.pages = []
        self.teams = {}
        self.errors = []

    # ---------- loading ----------
    def load_pages(self):
        folder = os.path.join(ROOT, "content", "pages")
        if not os.path.isdir(folder):
            return
        for name in sorted(os.listdir(folder)):
            if not name.endswith(".md") or name.startswith("_"):
                continue
            path = os.path.join(folder, name)
            meta, body = read_doc(path)
            if meta.get("draft"):
                continue
            slug = os.path.splitext(name)[0]
            if slug in SECTIONS or slug in ("owner", "img", "css", "js"):
                raise BuildError(f"{rel(path)}: the page name '{slug}' is already used by the site. Rename the file.")
            if not meta.get("title"):
                raise BuildError(f"{rel(path)}: missing 'title'")
            self.pages.append({"slug": slug, "title": str(meta["title"]), "nav": str(meta.get("nav") or ""),
                               "standfirst": meta.get("standfirst") or "", "image": meta.get("image"),
                               "image_alt": meta.get("image_alt") or "", "body_md": body,
                               "order": int(meta.get("order") or 0), "path": f"{slug}/", "section": "page-" + slug})
        self.pages.sort(key=lambda p: (p["order"], p["title"]))

    def load(self):
        self.load_pages()
        for section in SECTIONS:
            folder = os.path.join(ROOT, "content", section)
            if not os.path.isdir(folder):
                continue
            for name in sorted(os.listdir(folder)):
                if not name.endswith(".md") or name.startswith("_"):
                    continue
                path = os.path.join(folder, name)
                try:
                    doc = self.make_doc(section, path)
                except BuildError as e:
                    self.errors.append(str(e))
                    continue
                if doc.get("draft"):
                    continue
                self.docs[section].append(doc)
        for t in self.docs["teams"]:
            self.teams[t["slug"]] = t
        for section in ("news", "tactics", "puzzles", "battle-analysis"):
            self.docs[section].sort(key=lambda d: (d["date"], d["title"]), reverse=True)
        self.docs["teams"].sort(key=lambda d: d["name"].lower())
        # validate references to teams and maps
        for section in ("tactics", "puzzles", "battle-analysis", "news"):
            for d in self.docs[section]:
                for slug in d.get("teams", []):
                    if slug not in self.teams:
                        self.errors.append(f"{d['source']}: team '{slug}' does not exist (see the file names in content/teams)")
                if d.get("scene"):
                    self.check_scene(d)
                if d.get("play"):
                    self.check_play(d)

    def make_doc(self, section, path):
        meta, body = read_doc(path)
        slug = os.path.splitext(os.path.basename(path))[0]
        doc = dict(meta)
        doc["slug"] = slug
        doc["section"] = section
        doc["source"] = rel(path)
        doc["path"] = f"{SECTIONS[section]['url']}{slug}/"
        if section == "teams":
            if not meta.get("name"):
                raise BuildError(f"{rel(path)}: missing 'name'")
            doc["name"] = team_display_name(str(meta["name"]))
            doc["title"] = doc["name"]
            doc["status"] = str(meta.get("status", "classified")).lower()
            doc["sprite"] = meta.get("sprite") or (f"img/teams/{slug}.svg" if os.path.exists(os.path.join(ROOT, "static", "img", "teams", f"{slug}.svg")) else "img/teams/unknown.svg")
            doc["guide_published"] = str(meta.get("guide", "")).strip().lower() == "published"
            doc["tags"] = [str(t) for t in (meta.get("tags") or [])]
            doc["faction"] = str(meta.get("faction") or "").strip().capitalize()
            season = SEASONS.get(str(meta.get("season") or "").strip().lower())
            doc["season_info"] = None
            if season:
                classified_until, supported_until = season
                doc["season_info"] = (
                    f"Classified until {classified_until}" if doc["status"] == "classified"
                    else f"Supported until {supported_until}")
            ratings = meta.get("ratings") or {}
            doc["ratings"] = [
                {"label": axis.upper(), "value": max(0, min(5, int(ratings[axis])))}
                for axis in RATING_AXES if ratings.get(axis) not in (None, "")
            ]
            doc["rule_groups"] = []
            rules = meta.get("rules") or {}
            if not isinstance(rules, dict):
                raise BuildError(f"{rel(path)}: 'rules' must contain faction:, strategic:, firefight:, equipment:, operatives:")
            for key, label in RULE_GROUPS:
                items = []
                for i, it in enumerate(rules.get(key) or [], 1):
                    if not isinstance(it, list) or len(it) != 2:
                        raise BuildError(f"{rel(path)}: rules, {key}, line {i} must look like [\"Name\", \"Short explanation\"]")
                    items.append({"name": str(it[0]), "text": str(it[1])})
                if items:
                    group = {"key": key, "label": label, "items": items}
                    if key == "operatives":
                        ops = []
                        for it in items:
                            op, _, rule = it["name"].partition(" · ")
                            if not rule:
                                op, rule = "", it["name"]
                            if ops and ops[-1]["op"] == op:
                                ops[-1]["items"].append({"name": rule, "text": it["text"]})
                            else:
                                ops.append({"op": op, "items": [{"name": rule, "text": it["text"]}]})
                        group["ops"] = ops
                    doc["rule_groups"].append(group)
            for key in ("strengths", "weaknesses"):
                doc[key] = [str(x) for x in (meta.get(key) or [])]
            doc["difficulty"] = int(meta["difficulty"]) if meta.get("difficulty") else 0
        else:
            for key in ("title", "date"):
                if not meta.get(key):
                    raise BuildError(f"{rel(path)}: missing '{key}'")
            doc["date"] = to_date(meta["date"], path)
            doc["date_label"] = fmt_date(doc["date"])
            doc["teams"] = [str(t) for t in (meta.get("teams") or [])]
            scene_text = " ".join(str(st.get("title", "")) + " " + str(st.get("text", "")) for st in ((meta.get("scene") or {}).get("steps") or []) if isinstance(st, dict))
            words = len(re.findall(r"\w+", body + " " + scene_text)) + 60 * len(((meta.get("scene") or {}).get("steps") or []))
            doc["read_time"] = meta.get("read_time") or max(1, math.ceil(words / 200))
        doc["body_md"] = body
        return doc

    def check_play(self, d):
        """A puzzle played on the board: operatives with their profiles, and the line of the real game."""
        pl = d["play"]
        src = d["source"]
        if not isinstance(pl, dict):
            self.errors.append(f"{src}: 'play' must contain 'map:', 'units:' and 'solution:'")
            return
        if pl.get("map") not in self.maps:
            self.errors.append(f"{src}: map '{pl.get('map')}' does not exist. Maps: {', '.join(self.maps)}")
        ids = []
        for u in pl.get("units") or []:
            if not isinstance(u, dict) or not u.get("id"):
                self.errors.append(f"{src}: every operative needs a short code (id)")
                continue
            if str(u["id"]) in ids:
                self.errors.append(f"{src}: two operatives use the code '{u['id']}'")
            ids.append(str(u["id"]))
        for i, a in enumerate(pl.get("solution") or [], 1):
            if not isinstance(a, dict) or str(a.get("unit")) not in ids:
                self.errors.append(f"{src}: activation {i} of the solution uses an unknown operative")
                continue
            for x in a.get("actions") or []:
                refs = [x.get("target")] if x.get("target") is not None else []
                refs += list(x.get("targets") or []) + list(x.get("kills") or [])
                for r in refs:
                    if str(r) not in ids:
                        self.errors.append(f"{src}: activation {i}: unknown operative '{r}'")
        teams = [((pl.get("sides") or {}).get(k) or {}).get("team") for k in ("A", "B")]
        for slug in teams:
            if slug and slug not in self.teams:
                self.errors.append(f"{src}: team '{slug}' does not exist (see the file names in content/teams)")
        if not d.get("teams"):
            d["teams"] = [t for t in teams if t]

    def play_json(self, d, url):
        pl = dict(d["play"])
        pl["mapData"] = self.maps.get(pl.get("map"))
        sides = {}
        for key in ("A", "B"):
            side = dict((pl.get("sides") or {}).get(key) or {})
            slug = side.get("team")
            if slug in self.teams:
                side.setdefault("name", self.teams[slug]["name"])
                side["sprite"] = url(self.teams[slug]["sprite"])
            sides[key] = side
        pl["sides"] = sides
        for key in ("question", "wrong"):
            if d.get(key):
                pl[key] = str(d[key])
        pl["tp"] = str(d.get("turning_point") or "")
        return json.dumps(pl, ensure_ascii=False, default=str).replace("</", "<\\/")

    def check_scene(self, d):
        sc = d["scene"]
        if not isinstance(sc, dict):
            self.errors.append(f"{d['source']}: 'scene' must contain 'map:', 'units:' and 'steps:'")
            return
        if sc.get("map") not in self.maps:
            self.errors.append(f"{d['source']}: map '{sc.get('map')}' does not exist. Maps: {', '.join(self.maps)}")
        ids = set()
        for u in sc.get("units") or []:
            if not isinstance(u, dict) or "id" not in u:
                self.errors.append(f"{d['source']}: every unit needs an 'id'")
                continue
            ids.add(str(u["id"]))
        for i, st in enumerate(sc.get("steps") or [], 1):
            if isinstance(st, dict) and sc.get("mode") == "puzzle" and str(st.get("action", "")).lower() not in ("reposition", "dash", "charge", "fight", "shoot", "loot", "fall_back"):
                self.errors.append(f"{d['source']}: puzzle step {i} needs 'action:' (reposition, charge, fight, shoot, loot, dash or fall_back)")
            if not isinstance(st, dict):
                self.errors.append(f"{d['source']}: step {i} is not written as 'name: value' lines")
                continue
            for key in ("setup", "moves"):
                for mv in st.get(key) or []:
                    if not isinstance(mv, list) or len(mv) < 2 or str(mv[0]) not in ids:
                        self.errors.append(f"{d['source']}: step {i}, {key}: {mv} (unknown unit or wrong format)")
            for key in ("shots", "fights"):
                for sh in st.get(key) or []:
                    if not isinstance(sh, list) or len(sh) < 2 or str(sh[0]) not in ids or str(sh[1]) not in ids:
                        self.errors.append(f"{d['source']}: step {i}, {key}: {sh} (unknown unit)")
            for key in ("kills", "removed"):
                for k in st.get(key) or []:
                    if str(k) not in ids:
                        self.errors.append(f"{d['source']}: step {i}, {key}: unknown unit '{k}'")

    # ---------- urls ----------
    def url_func(self, page_path, absolute=False):
        depth = page_path.count("/") if page_path else 0
        prefix = "../" * depth
        if absolute:
            prefix = "/" + str(self.settings.get("base_path", "")).strip("/") + "/"
            prefix = prefix.replace("//", "/")

        def url(target=""):
            if target.startswith(("http://", "https://", "mailto:", "#")):
                return target
            target = target.lstrip("/")
            if self.relative_index and (target == "" or target.endswith("/")):
                target += "index.html"
            if target.endswith((".js", ".css")):
                target += "?v=" + self.asset_version()
            return (prefix + target) or "./"
        return url

    def asset_version(self):
        """Short hash of the scripts, styles and maps, so browsers fetch new versions right after a change."""
        if not getattr(self, "_asset_v", None):
            import hashlib
            h = hashlib.sha1()
            for base in (os.path.join(ROOT, "static"), os.path.join(ROOT, "data")):
                for dirpath, _, files in sorted(os.walk(base)):
                    for name in sorted(files):
                        if name.endswith((".js", ".css", ".json")):
                            with open(os.path.join(dirpath, name), "rb") as f:
                                h.update(f.read())
            self._asset_v = h.hexdigest()[:8]
        return self._asset_v

    def fix_links(self, html_text, url):
        def repl(m):
            return f'{m.group(1)}="{url(m.group(2))}"'
        return re.sub(r'(src|href)="/([^"/][^"]*|)"', repl, html_text)

    # ---------- rendering ----------
    def render_md(self, text, url):
        self.md.reset()
        return self.fix_links(self.md.convert(text), url)

    def page(self, template, page_path, absolute=False, **ctx):
        url = self.url_func(page_path, absolute)
        tpl = self.env.get_template(template)
        out = tpl.render(site=self.settings, url=url, page_path=page_path, teams=self.teams, nav_pages=[p for p in self.pages if p["nav"]],
                         sections=SECTIONS, now=dt.date.today(), **ctx)
        target = os.path.join(OUT, page_path, "index.html") if not page_path.endswith(".html") and not page_path.endswith(".xml") and not page_path.endswith(".txt") else os.path.join(OUT, page_path)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            f.write(out)

    def redirect(self, old_path, new_path):
        """A small page at an old address that sends readers (and Google) to the new one."""
        url = self.url_func(old_path)
        target = url(new_path)
        canon = str(self.settings.get("url", "")).rstrip("/") + "/" + new_path
        html_text = (f'<!doctype html><meta charset="utf-8"><title>Moved</title><link rel="canonical" href="{canon}">'
                     f'<meta http-equiv="refresh" content="0; url={target}"><p><a href="{target}">This page has moved.</a></p>')
        path = os.path.join(OUT, old_path, "index.html")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html_text)

    def scene_json(self, d, url):
        sc = dict(d["scene"])
        sc["mapData"] = self.maps.get(sc.get("map"))
        sides = sc.get("sides") or {}
        for key in ("A", "B"):
            side = sides.get(key) or {}
            slug = side.get("team")
            if slug in self.teams:
                side.setdefault("name", self.teams[slug]["name"])
                side["sprite"] = url(self.teams[slug]["sprite"])
            sides[key] = side
        sc["sides"] = sides
        return json.dumps(sc, ensure_ascii=False, default=str).replace("</", "<\\/")

    def build(self):
        self.load()
        if self.errors:
            raise BuildError("\n".join(self.errors))
        if os.path.isdir(OUT):
            shutil.rmtree(OUT)
        shutil.copytree(os.path.join(ROOT, "static"), OUT)
        articles = self.docs["news"] + self.docs["tactics"] + self.docs["puzzles"] + self.docs["battle-analysis"]
        articles.sort(key=lambda d: (d["date"], d["title"]), reverse=True)

        # article bodies
        for d in articles:
            url = self.url_func(d["path"])
            body = d["body_md"]
            d["has_inline_board"] = "[[board]]" in body
            body_html = self.render_md(body.replace("[[board]]", "\n\n<div data-board-slot></div>\n\n"), url)
            d["body_html"] = body_html
            d["scene_json"] = self.scene_json(d, url) if d.get("scene") else None
            d["play_json"] = self.play_json(d, url) if d.get("play") else None
            d["answer_html"] = self.render_md(str(d.get("answer") or ""), url) if d.get("answer") else ""
        for t in self.docs["teams"]:
            t["body_html"] = self.render_md(t["body_md"], self.url_func(t["path"])) if t["body_md"].strip() else ""
            t["related"] = [a for a in articles if t["slug"] in a.get("teams", [])]

        home_guides = [t for t in self.docs["teams"] if t.get("featured") and t.get("guide_published")]
        featured = next((a for a in articles if a.get("featured")), articles[0] if articles else None)
        home_teams = [t for t in self.docs["teams"] if t.get("home")] or [t for t in self.docs["teams"] if t.get("line")]
        self.page("home.html", "", featured=featured, home_guides=home_guides,
                  latest=[a for a in articles if a is not featured][:max(0, 3 - len(home_guides))],
                  news=self.docs["news"][:3], tactics=self.docs["tactics"][:3], puzzles=self.docs["puzzles"][:3],
                  battle=self.docs["battle-analysis"][0] if self.docs["battle-analysis"] else None,
                  home_teams=home_teams[:6], team_count=len(self.docs["teams"]), section="home")
        self.page("list_news.html", "news/", items=self.docs["news"], section="news")
        tactic_tags = []
        for d in self.docs["tactics"]:
            if d.get("tag") and d["tag"] not in tactic_tags:
                tactic_tags.append(d["tag"])
        self.page("list_tactics.html", "tactics/", items=self.docs["tactics"], tags=tactic_tags, section="tactics")
        self.page("list_puzzles.html", "puzzles/", items=self.docs["puzzles"], section="puzzles")
        self.page("list_battles.html", "battle-analysis/", items=self.docs["battle-analysis"], section="battle-analysis")
        team_tags = [f for f in ("Imperium", "Chaos", "Xenos") if any(t["faction"] == f for t in self.docs["teams"])]
        counts = {s: sum(1 for t in self.docs["teams"] if t["status"] == s) for s in ("classified", "declassified")}
        self.page("list_teams.html", "teams/", items=self.docs["teams"], tags=team_tags, counts=counts, section="teams")
        for d in articles:
            tpl = {"battle-analysis": "battle.html", "puzzles": "puzzle.html"}.get(d["section"], "article.html")
            more = [a for a in self.docs[d["section"]] if a is not d][:3]
            battle = next((b for b in self.docs["battle-analysis"] if b["slug"] == d.get("battle")), None)
            self.page(tpl, d["path"], doc=d, more=more, battle=battle, section=d["section"])
            if d.get("moved_from"):
                self.redirect(str(d["moved_from"]).strip("/") + "/", d["path"])
        for t in self.docs["teams"]:
            self.page("team.html", t["path"], doc=t, section="teams")
        for pg in self.pages:
            pg["body_html"] = self.render_md(pg["body_md"], self.url_func(pg["path"]))
            self.page("page.html", pg["path"], doc=pg, section=pg["section"])
        teams_json = json.dumps([{"slug": t["slug"], "name": t["name"]} for t in self.docs["teams"]], ensure_ascii=False).replace("</", "<\\/")
        self.page("owner.html", "owner/", maps=list(self.maps.values()), teams_json=teams_json, section="owner")
        self.page("404.html", "404.html", absolute=not self.relative_index, section="404")
        self.page("sitemap.xml", "sitemap.xml", articles=articles, team_docs=self.docs["teams"])
        self.page("robots.txt", "robots.txt")
        with open(os.path.join(OUT, "js", "maps.js"), "w", encoding="utf-8") as f:
            f.write("window.KTT_MAPS=" + json.dumps(self.maps, separators=(",", ":")) + ";\n")
        if self.settings.get("ads", {}).get("enabled") and self.settings["ads"].get("client"):
            pub = self.settings["ads"]["client"].replace("ca-", "")
            with open(os.path.join(OUT, "ads.txt"), "w") as f:
                f.write(f"google.com, {pub}, DIRECT, f08c47fec0942fa0\n")
        n = len(articles) + len(self.docs["teams"])
        print(f"Built {n} pages into _site/")


if __name__ == "__main__":
    try:
        Site(relative_index="--preview" in sys.argv).build()
    except BuildError as e:
        print("\nTHE SITE WAS NOT UPDATED. Fix this and save again:\n", file=sys.stderr)
        print(str(e), file=sys.stderr)
        sys.exit(1)
