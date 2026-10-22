// Game replays (uses data/games.js). To add a game, append an object to KTT.games.
const G=KTT.games;let gc=null,gi=-1,gt=null;
const rMap=id=>KTT.maps.find(m=>m.id===id);
$("gF").innerHTML='<option value="">All teams</option>'+[...new Set(G.flatMap(g=>[g.ta,g.tb]))].map(t=>`<option>${esc(t)}</option>`).join("");
function renderG(){const f=$("gF").value;
 $("gArch").innerHTML=G.filter(g=>!f||g.ta===f||g.tb===f).map(g=>`<div class="card"><h3>${esc(g.title)}</h3><p>${esc(g.event)}${g.map?" - Map: "+esc(rMap(g.map).name):""}</p><p><b>${esc(g.ta)}</b> (${esc(g.pa)}) vs <b>${esc(g.tb)}</b> (${esc(g.pb)})</p><button class="sm" data-g="${g.id}">Replay</button></div>`).join("")||'<p class="empty">No games for this team yet.</p>'}
$("gF").onchange=renderG;
$("gArch").onclick=e=>{const b=e.target.closest("button[data-g]");if(b)openG(b.dataset.g)};
$("gBack").onclick=()=>{stopP();$("gView").hidden=true;$("gList").hidden=false};
function openG(id){gc=G.find(g=>g.id===id);if(!gc)return;gi=-1;$("gList").hidden=true;$("gView").hidden=false;
 $("gT").textContent=gc.title;$("gS").textContent=gc.event+" - "+gc.ta+" vs "+gc.tb;
 $("gD").innerHTML=gc.demo?"<p class=\"demo\">Demonstration game with invented moves.</p>":(gc.summary||[]).map(n=>"<p style=\"color:var(--text);margin:.4rem 0\">"+esc(n)+"</p>").join("")+((gc.notes||[]).length?"<details><summary>Game details</summary>"+(gc.notes||[]).map(n=>"<p style=\"margin:.2rem 0\">"+esc(n)+"</p>").join("")+"</details>":"");
 $("gR").max=gc.steps.length;
 let h="",tp=0;gc.steps.forEach((s,i)=>{if(s.tp!==tp){tp=s.tp;h+=`<h4>Turning point ${tp}</h4>`}
  h+=`<button data-i="${i}">${i+1}. ${s.o?esc(gc.ops[s.o].n)+": ":""}${esc(s.a)}${s.mv?" to "+cell(rMap(gc.map),s.mv):""} <span class="an">${esc(s.an||"")}</span></button>`});
 $("gL").innerHTML=h;$("gA").innerHTML=(gc.analysis||[]).map(a=>`<h3 style="margin:1.4rem 0 .3rem">${esc(a[0])}</h3><p>${esc(a[1])}</p>`).join("");draw()}
function stateAt(i){const p={},w={},off={};for(const k in gc.ops){p[k]=[gc.ops[k].x,gc.ops[k].y];w[k]=gc.ops[k].w}
 for(let j=0;j<=i;j++){const s=gc.steps[j];if(s.mv)p[s.o]=s.mv;if(s.mvs)for(const k in s.mvs)p[k]=s.mvs[k];(s.hits||[]).forEach(h=>{w[h[0]]=Math.max(0,w[h[0]]-h[1])});if(s.sh)w[s.sh]=Math.max(0,w[s.sh]-s.dm);if(s.rm)off[s.rm]=1}return{p,w,off}}
function draw(){const m=rMap(gc.map),st=stateAt(gi),s=gi>=0?gc.steps[gi]:null,prev=gi>0?stateAt(gi-1):stateAt(-1);
 let h='<defs><marker id="ah" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0L4 2L0 4z" fill="var(--muted)"/></marker></defs>';
 h+=mapInner(m,true,true);(m.dr||[]).forEach((q,di)=>{const o=gc.dopen&&gc.dopen[di];h+=doorSvg(q,o!==undefined&&gi>=o)});$("map").setAttribute("viewBox","-1.4 -1.4 "+(m.w+1.4)+" "+(m.h+1.4));
 if(s&&s.mv){const a=prev.p[s.o];h+=`<line class="mv" x1="${a[0]}" y1="${a[1]}" x2="${s.mv[0]}" y2="${s.mv[1]}"/>`}
 if(s&&s.mvs)for(const k in s.mvs){const a=prev.p[k],b=s.mvs[k];h+=`<line class="mv" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`}
 if(s&&s.sh){const a=st.p[s.o],b=st.p[s.sh];h+=`<line class="sh" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`}
 (gc.bar||[]).forEach(b=>h+=`<rect class="kw" x="${b[0]-.8}" y="${b[1]-.25}" width="1.6" height=".5"/>`);
 for(const k in gc.ops){if(st.off[k])continue;const o=gc.ops[k],p=st.p[k];h+=`<g class="u ${o.s}${st.w[k]<=0?" dead":""}" style="transform:translate(${p[0]}px,${p[1]}px)"><circle r=".8"/><text y=".22">${esc(o.c)}</text></g>`}
 $("map").innerHTML=h;
 $("gC").innerHTML=s?`<b>Turning point ${s.tp}: ${s.o?esc(gc.ops[s.o].n)+", ":""}${esc(s.a)}</b> <span class="an">${esc(s.an||"")}</span><p>${esc(s.t)}</p>${s.mv?`<p>Moves to <b>${cell(m,s.mv)}</b>.</p>`:""}${s.sh?`<p>${s.dm>=99?"Kills":"Hits"} ${esc(gc.ops[s.sh].n)}${s.dm>=99?".":" for "+s.dm+" damage."}</p>`:""}${s.sc?`<p><b>${esc(s.sc)}</b></p>`:""}${s.vp?`<p>Score: ${s.vp[0]} - ${s.vp[1]}</p>`:""}`:(gc.steps.length?"<p>Setup. Press Next to start the replay.</p>":"<p>Deployment.</p>");
 $("gW").innerHTML=Object.keys(gc.ops).map(k=>{const o=gc.ops[k],w=st.w[k];return`<div class="wb ${o.s}"><span>${esc(o.n)}</span><s><i style="width:${w/o.w*100}%"></i></s><span>${st.off[k]?"off map":w+"/"+o.w}</span></div>`}).join("");
 $("gR").value=gi+1;
 document.querySelectorAll("#gL button").forEach(b=>{const on=+b.dataset.i===gi;on?b.setAttribute("aria-current","true"):b.removeAttribute("aria-current");if(on){const L=$("gL");L.scrollTop+=b.getBoundingClientRect().top-L.getBoundingClientRect().top-L.clientHeight/2}})}
const go=i=>{gi=Math.max(-1,Math.min(gc.steps.length-1,i));draw()};
function stopP(){if(gt){clearInterval(gt);gt=null;$("gPlay").textContent="Play"}}
$("gFirst").onclick=()=>{stopP();go(-1)};$("gLast").onclick=()=>{stopP();go(gc.steps.length-1)};
$("gPrev").onclick=()=>{stopP();go(gi-1)};$("gNext").onclick=()=>{stopP();go(gi+1)};
$("gPlay").onclick=()=>{if(gt)return stopP();$("gPlay").textContent="Pause";if(gi>=gc.steps.length-1)go(-1);gt=setInterval(()=>{if(gi>=gc.steps.length-1)stopP();else go(gi+1)},1800)};
$("gR").oninput=e=>{stopP();go(+e.target.value-1)};
$("gL").onclick=e=>{const b=e.target.closest("button[data-i]");if(b){stopP();go(+b.dataset.i)}};
renderG();
