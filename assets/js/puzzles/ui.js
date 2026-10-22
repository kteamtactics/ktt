// USER INTERFACE. No rules here (see engine.js). Board is HTML so sprites stay crisp.
(function(){
const defTeams=["Angels Of Death","Raveners"];
const names=KTT.teams.map(t=>t.name);
opt($("tF"),teamOpts().map(x=>[KTT.teams[x[0]].name,x[1],x[2]]));opt($("tE"),teamOpts().map(x=>[KTT.teams[x[0]].name,x[1],x[2]]));
$("tF").value=defTeams[0];$("tE").value=defTeams[1];
let cur=0,def,st,hist,mode=null,best=null;
$("pick").innerHTML=KTT.puzzles.map((p,i)=>`<button class="mi" data-i="${i}" type="button">${i+1}</button>`).join("");
const pct=x=>Math.round(x*100);
function load(i){cur=i!=null?i:cur;def=KTT.buildPuzzle(KTT.puzzles[cur],$("tF").value,$("tE").value);st=PZ.make(def);hist=[st];mode=null;best=null;$("result").hidden=true;
 [...$("pick").children].forEach((b,j)=>b.classList.toggle("on",j===cur));$("pgoal").textContent=KTT.puzzles[cur].goal;draw()}
const cellSize=()=>Math.max(28,Math.min(52,Math.floor(Math.min(520,(($("board").parentNode.clientWidth||520)-16))/def.w)));
function targets(){ // cells/units clickable for the current mode
 const u=st.units[st.active],L=st.active?PZ.legal(st):[];const m={};
 L.forEach(a=>{if(a.t==="end"||a.t==="activate")return;(m[a.t]=m[a.t]||[]).push(a)});return{u,L,m}}
function preview(a){ // kill chance shown over targets
 const t=st.units[a.tgt],u=st.units[a.u];
 if(a.t==="shoot"){const b=PZ.bestShot(st,u,t);return pct(PZ.applyDmg(t.dist,b.p)[0])}
 const A=PZ.bestMelee(u.melee),B=t.melee.length?PZ.bestMelee(t.melee):null,r=PZ.duelPmf(A,B||{full:"none",atk:0,hit:6,dmg:0,crit:0},Math.max(1,Math.round(PZ.expW(u))),Math.max(1,Math.round(PZ.expW(t))));return pct(PZ.applyDmg(t.dist,r.toB)[0])}
function draw(){
 const cs=cellSize(),b=$("board"),{u,L,m}=targets();b.style.cssText=`grid-template-columns:repeat(${def.w},${cs}px);grid-template-rows:repeat(${def.h},${cs}px);--cs:${cs}px`;
 const hl={},mk=(x,y,c,data)=>{hl[x+","+y]={c,data}};
 if(u&&mode){(m[mode]||[]).forEach(a=>{if(a.x!=null)mk(a.x,a.y,mode,a);else if(a.tgt){const t=st.units[a.tgt];mk(t.x,t.y,mode,a)}else if(a.o!=null){const o=st.obj[a.o];mk(o.x,o.y,mode,a)}})}
 const hold=new Set();st.obj.forEach(o=>{for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)hold.add((o.x+dx)+","+(o.y+dy))});
 let h="";
 for(let y=0;y<def.h;y++)for(let x=0;x<def.w;x++){const k=x+","+y,w=st.walls.has(k),z=hl[k];
  h+=`<div class="c ${w?"wall":(x+y)%2?"f1":"f0"}${!w&&hold.has(k)?" zone":""}${z?" hl "+z.c:""}" data-k="${k}" ${z?`role="button" tabindex="0" aria-label="${mode}"`:""}>${z&&z.data.x!=null?'<i></i>':""}</div>`}
 st.obj.forEach(o=>{h+=`<div class="obj${o.secured?" sec":""}" style="left:${o.x*cs}px;top:${o.y*cs}px" data-k="${o.x},${o.y}"><b>${o.id+1}</b></div>`});
 Object.values(st.units).forEach(un=>{const k=un.x+","+un.y,dead=un.dist[0],gone=!PZ.present(un),z=hl[k],isA=st.active===un.id;
  const wp=PZ.expW(un);
  h+=`<div class="u ${un.side==="F"?"fr":"en"}${isA?" act":""}${un.side==="F"&&!un.activated&&!st.active&&!st.over?" can":""}${gone?" gone":""}${z&&!z.data.x&&z.data.x!==0?" tgt":""}" style="left:${un.x*cs}px;top:${un.y*cs}px" data-u="${un.id}" ${z&&z.data.tgt?`data-k="${k}"`:""} title="${esc(un.label)}">
   ${KTT.SPR.svg(un.team,Math.max(1,cs*.88/16),{alt:un.label})}
   <span class="hp"><i style="width:${Math.max(0,Math.min(100,wp/un.max*100))}%"></i></span>
   ${un.side==="E"?`<span class="pk">${z&&z.data.tgt?preview(z.data)+"%":dead>0.005?pct(dead)+"%":""}</span>`:""}
   ${un.side==="F"&&un.activated&&!isA?'<span class="done">✓</span>':""}</div>`});
 b.innerHTML=h;
 $("vp").textContent=st.vp.toFixed(2).replace(/\.?0+$/,"")||"0";
 // side panel
 let w="";
 if(u){w=`<div class="uh">${KTT.SPR.svg(u.team,4)}<div><b>${esc(u.label)}</b><br><small>${esc(u.team)}</small></div></div>
  <div class="stats">Move ${u.move}" · Save ${u.save}+ · W ${Math.round(PZ.expW(u))}/${u.max}</div><div class="ap">${"●".repeat(u.ap)}${"○".repeat(u.apl-u.ap)} AP</div>`}
 else w=`<div class="uh"><div><b>${st.over?"Round over":"Choose an operative"}</b><br><small>${st.left} activation${st.left===1?"":"s"} left</small></div></div>`;
 $("who").innerHTML=w;
 const names={move:"Reposition",dash:"Dash",charge:"Charge",shoot:"Shoot",fight:"Fight",secure:"Secure"};
 let mn="";
 if(st.over)mn='';
 else if(!st.active)mn='<p class="hint">Tap one of your operatives</p>';
 else{Object.keys(names).forEach(t=>{if(m[t])mn+=`<button class="mi${mode===t?" on":""}" data-m="${t}" type="button">${names[t]}</button>`});mn+='<button class="mi end" data-m="end" type="button">End activation</button>'}
 $("menu").innerHTML=mn;
 $("msg").innerHTML=hist.length>1?"<b>"+esc(st.log[st.log.length-1].text)+"</b>"+(st.log[st.log.length-1].note?"<br>"+esc(st.log[st.log.length-1].note):""):"Select an operative to start.";
 if(st.over)finish();
}
function act(a){st=PZ.apply(st,a);hist.push(st);mode=null;
 if(st.active){const{m}=targets();const ks=Object.keys(m);if(a.t==="shoot"||a.t==="fight")mode=null}
 draw();flash(a)}
function flash(a){const last=st.log[st.log.length-1];if(last.gain>0.005){const e=document.createElement("div");e.className="float";e.textContent="+"+(Math.round(last.gain*100)/100);$("board").appendChild(e);setTimeout(()=>e.remove(),1200)}}
$("board").addEventListener("click",e=>{
 if(st.over)return;const un=e.target.closest("[data-u]"),c=e.target.closest("[data-k]");
 if(!st.active){if(un&&st.units[un.dataset.u].side==="F"&&!st.units[un.dataset.u].activated)act({t:"activate",u:un.dataset.u});return}
 if(!mode)return;const{m}=targets();
 const k=c&&c.dataset.k,list=m[mode]||[];
 if(un&&un.dataset.k){const t=st.units[un.dataset.u],a=list.find(a=>a.tgt===t.id);if(a)return act(a)}
 if(k){const[x,y]=k.split(",").map(Number);const a=list.find(a=>(a.x===x&&a.y===y)||(a.tgt&&st.units[a.tgt].x===x&&st.units[a.tgt].y===y)||(a.o!=null&&st.obj[a.o].x===x&&st.obj[a.o].y===y));if(a)act(a)}});
$("menu").addEventListener("click",e=>{const b=e.target.closest("[data-m]");if(!b)return;const t=b.dataset.m;
 if(t==="end")return act({t:"end",u:st.active});
 const list=(targets().m[t]||[]);
 if(t==="secure"&&list.length===1)return act(list[0]);
 if((t==="shoot"||t==="fight")&&list.length===1&&false)return act(list[0]);
 mode=mode===t?null:t;draw()});
$("pick").addEventListener("click",e=>{const b=e.target.closest("[data-i]");if(b)load(+b.dataset.i)});
$("reset").onclick=()=>load();$("tF").onchange=$("tE").onchange=()=>load();
// ---- results
function finish(){
 const R=$("result");R.hidden=false;
 R.innerHTML=`<div class="score"><div><small>YOUR SCORE</small><b>${st.vp.toFixed(2)}</b></div><div id="bestbox"><small>BEST LINE</small><b id="bestvp">…</b></div></div>
  <ul class="bd">${st.breakdown.map(r=>`<li><span>${esc(r[0])}</span><b>+${r[1].toFixed(2)}</b></li>`).join("")||"<li>No points scored</li>"}</ul>
  <div class="btns2"><button class="mi" id="again" type="button">TRY AGAIN</button><button class="mi" id="showbest" type="button">SHOW BEST LINE</button></div><div id="bestline"></div>`;
 $("again").onclick=()=>load();
 $("showbest").onclick=()=>{$("showbest").textContent="COMPUTING…";setTimeout(()=>{best=best||PZ.solve(PZ.make(def));showBest()},30)};
 if(best)showBest()}
function showBest(){
 const rep=best.final,mine=st;$("bestvp").textContent=best.vp.toFixed(2);$("showbest").hidden=true;
 const diff=best.vp-mine.vp;
 const acts=best.path.filter(a=>a.t!=="end");let s=PZ.make(def),lines=[];best.path.forEach(a=>{if(a.t!=="end")lines.push(PZ.describe(s,a)+(a.t==="shoot"||a.t==="fight"?"":""));s=PZ.apply(s,a)});
 const me=mine.log.filter(l=>l.a.t!=="end"&&l.a.t!=="activate").map(l=>l.text);
 let tip=diff<0.05?"You found the best line.":(()=>{const bs=rep.breakdown.map(r=>r[0].split(" (")[0]);const miss=bs.filter(x=>!mine.breakdown.some(r=>r[0].split(" (")[0]===x));return miss.length?"Missed: "+miss.join(", ")+".":"Same points, but a better order or position."})();
 $("bestline").innerHTML=`<p class="tip">${esc(tip)}</p><div class="cmp"><div><h4>Best (${best.vp.toFixed(2)})</h4><ol>${lines.map(l=>`<li>${esc(l)}</li>`).join("")}</ol></div><div><h4>Yours (${mine.vp.toFixed(2)})</h4><ol>${me.map(l=>`<li>${esc(l)}</li>`).join("")}</ol></div></div>`}
$("rules").innerHTML=Object.entries(PZ.RULES).map(([k,r])=>`<tr><td>${esc(k)}</td><td>${esc(String(r.value))}</td><td class="${r.verified?"ok":"ph"}">${r.verified?"VERIFIED":"PLACEHOLDER"}</td><td>${esc(r.note)}</td></tr>`).join("");
window.addEventListener("resize",()=>def&&draw());
load(0);
})();
