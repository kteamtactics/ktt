// PUZZLES (v2): simple "chess puzzle" engine for Kill Team. No dice: the author records the one winning line and declares the result of each attack.
// Squares are 1 inch. Rules used (edit here): Reposition = Move stat, Dash = 3, Charge = Move + 2, Fall back = Move (2 AP, only from an enemy control range),
// control range = the 8 squares around an enemy operative that can see it. Shoot needs no enemy control range and line of sight. One activation per operative.
window.PZ2=(function(){
"use strict";
const K=(x,y)=>x+","+y,D4=[[1,0],[-1,0],[0,1],[0,-1]];
const C={dash:3,chargeBonus:2,scout:6};
const ACTS={secure:{n:"Secure",ap:1,m:"obj"},loot:{n:"Loot",ap:1,m:"obj"},transmit:{n:"Initiate Transmission",ap:1,m:"obj"},orb:{n:"Move Orb",ap:1,m:"obj"},download:{n:"Download",ap:1,m:"obj"},compile:{n:"Compile Data",ap:1,m:"obj"},send:{n:"Send Data",ap:1,m:"obj"},reboot:{n:"Reboot",ap:2,m:"obj"},banner:{n:"Plant Banner",ap:1,m:"here"},clear:{n:"Clear",ap:1,m:"obj"},scout:{n:"Scout",ap:1,m:"enemy"},retrieve:{n:"Retrieve",ap:1,m:"obj"},device:{n:"Plant Device",ap:1,m:"obj"}};
const OPACT={secure:["secure"],loot:["loot"],transmission:["transmit"],orb:["orb"],download:["download"],data:["compile","send"],reboot:["reboot"],"plant-banner":["banner"],"sweep-and-clear":["clear"],"scout-enemy-movement":["scout"],retrieval:["retrieve"],"plant-devices":["device"]};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const cellName=(x,y)=>String.fromCharCode(65+x)+(y+1);
const adj=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))<=1;
function norm(p){if(!p.sols)p.sols=[p.sol||[]];if(!p.sols.length)p.sols=[[]];p.sol=p.sols[0];return p}
const sameLine=(a,b)=>a.length===b.length&&a.every((x,i)=>same(x,b[i]));
function grid(p){const b=(KTT.pzBoards.find(x=>x.id===p.board)||KTT.pzBoards[0]),t=b.r.map(r=>r.split(""));
 Object.keys(p.tw||{}).forEach(k=>{const[x,y]=k.split(",").map(Number);if(t[y]&&t[y][x]!=null)t[y][x]=p.tw[k]});return{w:t[0].length,h:t.length,t,name:b.name}}
function teamOf(n){return KTT.teams.find(t=>t.name===n)||KTT.teams[0]}
function build(p){const g=grid(p),U={};
 (p.units||[]).forEach(u=>{const tm=teamOf(u.tm),op=tm.operatives[u.o]||tm.operatives[0];U[u.id]={id:u.id,s:u.s,tm:tm.name,name:op.name,x:u.x,y:u.y,apl:u.apl||op.apl,move:op.move,save:op.save,w:op.wounds,hp:op.wounds,dead:false}});
 return{g,U,obj:(p.obj||[]).map(o=>({x:o[0],y:o[1],done:{}})),act:null,done:{},vp:0}}
function cl(S){const U={};Object.keys(S.U).forEach(k=>U[k]=Object.assign({},S.U[k]));return{g:S.g,U,obj:S.obj.map(o=>({x:o.x,y:o.y,done:Object.assign({},o.done)})),act:S.act?{u:S.act.u,ap:S.act.ap,f:Object.assign({},S.act.f)}:null,done:Object.assign({},S.done),vp:S.vp}}
const live=(S,s)=>Object.values(S.U).filter(u=>!u.dead&&(!s||u.s===s));
const solid=(S,x,y)=>{const t=S.g.t[y][x];return t==="#"||t==="o"||live(S).some(u=>u.x===x&&u.y===y)};
function los(S,a,b){let x0=a.x,y0=a.y;const x1=b.x,y1=b.y,dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx-dy;
 while(!(x0===x1&&y0===y1)){const e2=2*e;if(e2>-dy){e-=dy;x0+=sx}if(e2<dx){e+=dx;y0+=sy}if(!(x0===x1&&y0===y1)&&S.g.t[y0][x0]==="#")return false}return true}
function crSet(S,side){const r=new Set();live(S).forEach(e=>{if(e.s===side)return;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const x=e.x+dx,y=e.y+dy;if(x<0||y<0||x>=S.g.w||y>=S.g.h||S.g.t[y][x]==="#")continue;if(los(S,e,{x,y}))r.add(K(x,y))}});return r}
function reach(S,u,max,ignore){const cr=ignore?new Set():crSet(S,u.s),seen=new Map([[K(u.x,u.y),0]]),q=[[u.x,u.y]],out=[];
 while(q.length){const[x,y]=q.shift(),d=seen.get(K(x,y));if(d>=max)continue;
  for(const[dx,dy]of D4){const nx=x+dx,ny=y+dy,k=K(nx,ny);if(nx<0||ny<0||nx>=S.g.w||ny>=S.g.h||seen.has(k)||solid(S,nx,ny)||cr.has(k))continue;seen.set(k,d+1);q.push([nx,ny]);out.push([nx,ny])}}
 return out}
function actsOf(p){const a=[];[p.m&&p.m.crit,p.m&&p.m.tac].forEach(id=>{(OPACT[id]||[]).forEach(k=>{if(a.indexOf(k)<0)a.push(k)})});return a}
// what the operative can do right now
function legal(S,uid,p){const u=S.U[uid];if(!u||u.dead)return null;let ap,f;
 if(S.act&&S.act.u===uid){ap=S.act.ap;f=S.act.f}else if(S.done[uid])return null;else{ap=u.apl;f={}}
 const cr=crSet(S,u.s),inCR=cr.has(K(u.x,u.y)),L={ap,f,inCR,mv:[],dash:[],fb:[],ch:[],sh:[],fi:[],ms:[]},en=live(S,u.s==="F"?"E":"F");
 if(ap>=1){
  if(!inCR&&!f.c&&!f.fb){if(!f.m)L.mv=reach(S,u,u.move);if(!f.d)L.dash=reach(S,u,C.dash)}
  if(!inCR&&!f.c&&!f.m&&!f.d&&!f.fb)L.ch=reach(S,u,u.move+C.chargeBonus,true).filter(c=>cr.has(K(c[0],c[1])));
  if(!inCR&&!f.s)L.sh=en.filter(t=>los(S,u,t)).map(t=>t.id);
  if(inCR&&!f.fi)L.fi=en.filter(t=>adj(u,t)&&los(S,u,t)).map(t=>t.id);
  if(!inCR)actsOf(p).forEach(k=>{const a=ACTS[k];if(ap<a.ap||f["a_"+k])return;
   if(a.m==="obj")S.obj.forEach((o,i)=>{if(adj(u,o)&&!o.done[k])L.ms.push({k,o:i})});
   else if(a.m==="enemy")en.forEach(t=>{if(Math.hypot(t.x-u.x,t.y-u.y)<=C.scout&&los(S,u,t))L.ms.push({k,tgt:t.id})});
   else L.ms.push({k})})}
 if(ap>=2&&inCR&&!f.fb&&!f.c)L.fb=reach(S,u,u.move);
 return L}
function apply(S,st,p){const L=legal(S,st.u,p);if(!L)return{err:"This operative cannot act."};let ok=false,cost=1,flag=null;
 const hasC=(a)=>a.some(c=>c[0]===st.x&&c[1]===st.y);
 if(st.t==="move"){ok=hasC(L.mv);flag="m"}else if(st.t==="dash"){ok=hasC(L.dash);flag="d"}else if(st.t==="fb"){ok=hasC(L.fb);cost=2;flag="fb"}else if(st.t==="charge"){ok=hasC(L.ch);flag="c"}
 else if(st.t==="shoot"){ok=L.sh.indexOf(st.tgt)>=0;flag="s"}else if(st.t==="fight"){ok=L.fi.indexOf(st.tgt)>=0;flag="fi"}
 else if(st.t==="act"&&ACTS[st.k]){ok=L.ms.some(m=>m.k===st.k&&(m.o==null||m.o===st.o)&&(m.tgt==null||m.tgt===st.tgt));cost=ACTS[st.k].ap;flag="a_"+st.k}
 if(!ok||L.ap<cost)return{err:"Illegal action."};
 const S2=cl(S);if(!(S.act&&S.act.u===st.u))S2.act={u:st.u,ap:S.U[st.u].apl,f:{}};S2.done[st.u]=1;S2.act.ap-=cost;S2.act.f[flag]=1;
 const u=S2.U[st.u];
 if(st.t==="move"||st.t==="dash"||st.t==="fb"||st.t==="charge"){u.x=st.x;u.y=st.y}
 else if(st.t==="shoot"||st.t==="fight"){const t=S2.U[st.tgt];t.hp=hpAfter(t,st);t.dead=t.hp<=0}
 else if(st.t==="act"&&st.o!=null)S2.obj[st.o].done[st.k]=1;
 S2.vp+=Number(st.vp)||0;return{S:S2}}
function hpAfter(t,st){const r=st.r||(st.t==='fight'?'kill':'hit');if(r==='kill')return 0;if(r==='miss')return t.hp;const d=st.d!=null&&st.d!==''?+st.d:Math.ceil(t.w/2);return Math.max(0,t.hp-d)}
function replay(p,steps){let S=build(p),bad=-1;for(let i=0;i<steps.length;i++){const r=apply(S,steps[i],p);if(r.err){bad=i;break}S=r.S}return{S,bad}}
function describe(S,st){const u=S.U[st.u],n=u?u.name:"?",at=(x,y)=>cellName(x,y);
 const T=id=>S.U[id]?S.U[id].name:"?";const res=st=>{const t=S.U[st.tgt];if(!t)return"";const h=hpAfter(t,st);return h<=0?" (incapacitated)":h===t.hp?" (no effect)":" ("+(t.hp-h)+" wound"+(t.hp-h>1?"s":"")+", "+h+" left)"};
 return({move:()=>`${n} repositions to ${at(st.x,st.y)}`,dash:()=>`${n} dashes to ${at(st.x,st.y)}`,fb:()=>`${n} falls back to ${at(st.x,st.y)}`,charge:()=>`${n} charges to ${at(st.x,st.y)}`,
  shoot:()=>`${n} shoots ${T(st.tgt)}`+res(st),
  fight:()=>`${n} fights ${T(st.tgt)}`+res(st),
  act:()=>`${n}: ${ACTS[st.k]?ACTS[st.k].n:st.k}`+(st.o!=null?` (marker ${st.o+1})`:st.tgt?` (${T(st.tgt)})`:"")})[st.t]()}
const same=(a,b)=>!!b&&a.u===b.u&&a.t===b.t&&(a.x==null||a.x===b.x&&a.y===b.y)&&(a.tgt==null||a.tgt===b.tgt)&&(a.k==null||a.k===b.k)&&(a.o==null||a.o===b.o);
const title=n=>String(n).toLowerCase().replace(/(^|[\s'-])([a-z])/g,(a,b,c)=>b+c.toUpperCase());
function missionText(p){const m=p.m||{},parts=[];
 if(m.vp>0)parts.push("score "+m.vp+" VP");
 const ks=(m.kill||[]).map(id=>(p.units||[]).find(u=>u.id===id)).filter(Boolean).map(u=>{const o=teamOf(u.tm).operatives[u.o];return"the "+(o?title(o.name):"enemy")});
 if(ks.length)parts.push("incapacitate "+ks.join(" and "));
 let t=parts.length?(parts.join(" and ").replace(/^./,c=>c.toUpperCase())+"."):"Complete the mission.";if(m.text&&!/^\s*score\s+\d+\s*(vp|victory points?)\.?\s*$/i.test(m.text))t+=" "+m.text;return t}
function missionDone(S,p){const m=p.m||{};return S.vp>=(m.vp||0)&&(m.kill||[]).every(id=>S.U[id]&&S.U[id].dead)}
function opsInfo(p){const m=p.m||{},o=KTT.ops||{},r=[];
 const c=(o.crit||[]).find(x=>x.id===m.crit),t=(o.tac||[]).find(x=>x.id===m.tac);
 if(c)r.push(["",c.s||c.t]);if(t)r.push(["",t.s||t.t]);return r}
// ---------- drawing
function boardHTML(S,cs,o){o=o||{};const g=S.g;let h="";
 for(let y=0;y<g.h;y++)for(let x=0;x<g.w;x++){const t=g.t[y][x],k=K(x,y),hl=o.hl&&o.hl[k];
  h+=`<div class="c ${t==="#"?"wall":t==="o"?"crate":(x+y)%2?"f1":"f0"}${hl?" hl "+hl:""}" data-k="${k}">${hl?"<i></i>":""}</div>`}
 S.obj.forEach((ob,i)=>{h+=`<div class="obj${Object.keys(ob.done).length?" sec":""}" style="left:${ob.x*cs}px;top:${ob.y*cs}px"><b>${i+1}</b></div>`});
 Object.values(S.U).forEach(u=>{const tg=o.tgt&&o.tgt.has(u.id);
  h+=`<div class="u ${u.s==="F"?"fr":"en"}${u.dead?" gone":""}${tg?" tgt":""}${o.sel===u.id?" act":""}${o.can&&o.can.has(u.id)?" can":""}${o.hint===u.id?" can act":""}" style="left:${u.x*cs}px;top:${u.y*cs}px" data-u="${u.id}" data-k="${K(u.x,u.y)}" title="${esc(u.name)}">${KTT.SPR.svg(u.tm,Math.max(1,cs*.88/16),{alt:u.name})}<span class="hp"><i style="width:${Math.max(0,u.hp/u.w*100)}%"></i></span><span class="pk">${esc(u.id)}</span></div>`});
 return h}
function sizeFor(g,el){return Math.max(24,Math.min(44,Math.floor(Math.min(560,(el&&el.parentNode&&el.parentNode.clientWidth||520)-16)/g.w)))}
// ---------- the playable frame (reader) and the recorder (author) share this code
const MENU=[["mv","move","Reposition"],["dash","dash","Dash"],["fb","fb","Fall back (2 AP)"],["ch","charge","Charge"],["sh","shoot","Shoot"],["fi","fight","Fight"]];
function frameHTML(){return `<div class="gb pz2"><div class="goalbar"><span id="pgoal"></span><span class="vpbig"><small>VP</small> <b id="vp">0</b></span></div>
<div class="gbmain"><div class="gbfield"><div id="board" aria-label="Battlefield"></div><div id="msg" class="msgbox"></div><div id="big" class="bigmsg" hidden></div></div>
<div class="gbside"><div class="box8" id="who"></div><div class="box8"><div id="menu" role="menu"></div></div><div class="box8" id="roster"></div><div class="box8" id="ops" hidden></div></div></div>
<div class="btns2" id="gbtn"></div><div class="box8" id="result" hidden></div></div>`}
function fillFrom(p,st){const o=Object.assign({},st);for(const l of p.sols)for(const c of l)if(same(st,c)){if(c.r!=null)o.r=c.r;if(c.d!=null)o.d=c.d;if(c.vp)o.vp=c.vp;if(c.n!=null)o.n=c.n;return o}
 if(st.t==="shoot")o.r="hit";else if(st.t==="fight")o.r="kill";return o}
function mount(R,p,cfg){cfg=cfg||{};norm(p);const rec=!!cfg.record;R.innerHTML=frameHTML();const $=id=>R.querySelector("#"+id);
 const steps=rec?p.sols[cfg.idx||0]:[];let S,sel=null,mode=null,tries=0,hint=0,solved=false,failed=false,failShown=false,last="";
 const L=()=>sel?legal(S,sel,p):null;
 function state(){const r=replay(p,steps);S=r.S;return r}
 function sync(){$("pgoal").innerHTML="<small>MISSION</small><br>"+esc(missionText(p));
  const ops=opsInfo(p);$("ops").hidden=!ops.length;$("ops").innerHTML=ops.map(o=>`<div class="op">${esc(o[1])}</div>`).join("")}
 function canAct(){return Object.values(S.U).some(u=>{if(u.s!=="F"||u.dead)return false;const l=legal(S,u.id,p);return !!l&&(l.mv.length||l.dash.length||l.fb.length||l.ch.length||l.sh.length||l.fi.length||l.ms.length)})}
 function draw(keepSteps){const bad=state().bad,cs=sizeFor(S.g,$("board")),b=$("board");
  b.style.cssText=`grid-template-columns:repeat(${S.g.w},${cs}px);grid-template-rows:repeat(${S.g.h},${cs}px);--cs:${cs}px`;
  const l=L(),hl={},tgt=new Set();
  if(l&&mode){const cls={mv:"mv",dash:"dash",fb:"mv",ch:"charge"};
   if(cls[mode]!=null)l[mode].forEach(c=>{hl[K(c[0],c[1])]=cls[mode]});
   else if(mode==="sh"||mode==="fi")l[mode].forEach(id=>tgt.add(id));
   else if(mode.slice(0,4)==="act:"){const k=mode.slice(4);l.ms.filter(m=>m.k===k).forEach(m=>{if(m.o!=null){const o=S.obj[m.o];hl[K(o.x,o.y)]="dash"}if(m.tgt)tgt.add(m.tgt)})}}
  const can=new Set();Object.values(S.U).forEach(u=>{if(u.s==="F"&&!u.dead&&(!S.done[u.id]||(S.act&&S.act.u===u.id)))can.add(u.id)});
  let hu=null;if(!rec&&hint>0&&!solved){const m=p.sols.find(x=>x.length>steps.length&&steps.every((q,i)=>same(q,x[i])));hu=m?m[steps.length].u:null}
  b.innerHTML=boardHTML(S,cs,{hl,tgt,sel,can,hint:hu});
  failed=false;const big=$("big");big.hidden=true;
  if(!rec&&!solved&&steps.length){if(missionDone(S,p)){solved=true;sel=null;mode=null;setTimeout(finish,0)}else if(!canAct()){failed=true;if(!failShown){failShown=true;tries++}}}
  if(solved){big.hidden=false;big.className="bigmsg ok";big.innerHTML="SOLVED!"}
  else if(failed){big.hidden=false;big.className="bigmsg bad";big.innerHTML='SORRY,<br>TRY AGAIN<br><button class="mi" id="bRetry" type="button">RETRY</button>';big.querySelector("#bRetry").onclick=restart}
  else failShown=false;
  $("vp").textContent=S.vp;
  $("roster").innerHTML=Object.values(S.U).map(u=>`<div class="rr${u.dead?" gone":""}"><span class="rn"><b>${esc(u.id)}</b> ${esc(u.name)}</span><span class="rb"><i class="${u.s}" style="width:${Math.max(0,u.hp/u.w*100)}%"></i></span><span class="rv">${u.hp}/${u.w}</span></div>`).join("");
  let w="";if(sel){const u=S.U[sel],ap=S.act&&S.act.u===sel?S.act.ap:S.done[sel]?0:u.apl;
   w=`<div class="uh">${KTT.SPR.svg(u.tm,4)}<div><b>${esc(u.name)}</b><br><small>${esc(u.tm)}</small></div></div><div class="stats">Move ${u.move}" · Save ${u.save}+ · W ${u.hp}/${u.w}</div><div class="ap">${"●".repeat(ap)}${"○".repeat(Math.max(0,u.apl-ap))} AP</div>`}
  else w=`<div class="uh"><div><b>${solved?"Solved":"Your operatives"}</b></div></div>`;
  $("who").innerHTML=w;
  let mn="";if(sel&&!solved){MENU.forEach(m=>{const on=l&&l[m[0]].length;mn+=`<button class="mi${mode===m[0]?" on":""}" data-m="${m[0]}" type="button"${on?"":" disabled"}>${m[2]}</button>`});
   actsOf(p).forEach(k=>{const n=l&&l.ms.filter(m=>m.k===k).length;mn+=`<button class="mi${mode==="act:"+k?" on":""}" data-m="act:${k}" type="button"${n?"":" disabled"}>${ACTS[k].n}${ACTS[k].ap>1?" ("+ACTS[k].ap+" AP)":""}</button>`})}
  else mn="";
  $("menu").innerHTML=mn;
  $("msg").innerHTML=last||"&nbsp;";
  const bt=$("gbtn");
  if(rec){bt.innerHTML='<button class="mi" id="bUndo" type="button">UNDO LAST</button>';$("bUndo").onclick=()=>{steps.pop();last="";mode=null;draw();cfg.onChange&&cfg.onChange()}}
  else if(!solved){bt.innerHTML='<button class="mi" id="bUndo" type="button">UNDO</button><button class="mi" id="bHint" type="button">HINT</button><button class="mi" id="bReset" type="button">RESTART</button>';
   $("bUndo").onclick=()=>{steps.pop();mode=null;last="";draw()};
   $("bHint").onclick=()=>{hint=Math.min(2,hint+1);const m=p.sols.find(x=>x.length>steps.length&&steps.every((q,i)=>same(q,x[i])));last=!m?"Off track: undo or restart.":hint===1?"Hint: see the glowing operative.":"Hint: "+({move:"reposition",dash:"dash",fb:"fall back",charge:"charge",shoot:"shoot",fight:"fight",act:ACTS[m[steps.length].k]?ACTS[m[steps.length].k].n.toLowerCase():"act"})[m[steps.length].t]+".";draw()};
   $("bReset").onclick=restart}
  else bt.innerHTML="";
  if(cfg.stepsEl){if(keepSteps)stat();else drawSteps(bad)}}
 function restart(){steps.length=0;sel=null;mode=null;hint=0;last="";draw()}
 function submit(){if(!steps.length){last="Play some actions first.";draw();return}
  if(p.sols.some(x=>sameLine(steps,x))){solved=true;sel=null;last="<b>Puzzle solved.</b>";draw();finish()}
  else{tries++;steps.length=0;sel=null;mode=null;hint=0;last="<b>Sorry, try again.</b> (attempts: "+tries+")";draw()}}
 function drawSteps(bad){const el=cfg.stepsEl;let s=build(p),h="";
  steps.forEach((st,i)=>{const d=describe(s,st),r=apply(s,st,p);if(r.err){h+=`<li class="bad"><b>${i+1}.</b> ${esc(d)} <em>(no longer legal: change or undo it)</em></li>`;return}
   const att=st.t==="shoot"||st.t==="fight",rr=st.r||(st.t==="fight"?"kill":"hit"),tw=s.U[st.tgt]?s.U[st.tgt].w:0;
   h+=`<li><b>${i+1}.</b> ${esc(d.replace(/ \([^)]*\)$/,""))}${att?` <select data-i="${i}" data-f="r"><option value="kill"${rr==="kill"?" selected":""}>Incapacitated</option><option value="hit"${rr==="hit"?" selected":""}>Wounded</option><option value="miss"${rr==="miss"?" selected":""}>No effect</option></select>${rr==="hit"?` <label>wounds <input type="number" min="1" max="${tw}" data-i="${i}" data-f="d" value="${st.d!=null?st.d:Math.ceil(tw/2)}"></label>`:""}`:""} <label>VP <input type="number" min="0" max="9" data-i="${i}" data-f="vp" value="${st.vp||0}"></label> <input class="note" placeholder="Why this? (optional)" data-i="${i}" data-f="n" value="${esc(st.n||"")}"></li>`;s=r.S});
  el.innerHTML=h?`<ol class="solsteps">${h}</ol>`:'<p class="note">No action recorded yet.</p>';
  el.insertAdjacentHTML("beforeend",'<p id="stt"></p>');stat()}
 function stat(){const e=cfg.stepsEl.querySelector("#stt");if(!e)return;const ok=missionDone(S,p);e.className="note "+(ok?"okm":"warn");e.textContent=steps.length?(ok?"The mission is completed by this line.":"The mission is not completed yet: "+missionText(p)):""}
 if(cfg.stepsEl)cfg.stepsEl.onchange=cfg.stepsEl.oninput=e=>{const t=e.target,i=+t.dataset.i,f=t.dataset.f;if(f==null||!steps[i])return;
  if(f==="vp")steps[i].vp=Math.max(0,Number(t.value)||0);else if(f==="r")steps[i].r=t.value;else if(f==="d")steps[i].d=Math.max(1,Number(t.value)||1);else steps[i].n=t.value;
  if(e.type==="change"){draw(f!=="r");cfg.onChange&&cfg.onChange()}else cfg.onChange&&cfg.onChange()};
 function attempt(st){
  if(rec){if(st.t==="shoot")st.r="hit";if(st.t==="fight")st.r="kill";steps.push(st);const r=replay(p,steps);last=describe(r.S,st).replace(/ \(.*\)$/,"");mode=null;draw();cfg.onChange&&cfg.onChange();return}
  const f=fillFrom(p,st);steps.push(f);hint=0;mode=null;state();last=esc(describe(replay(p,steps.slice(0,-1)).S,f));draw();if(f.vp>0)popVP(f)}
 function popVP(f){const u=S.U[f.u];if(!u)return;const cs=sizeFor(S.g,$("board")),e=document.createElement("div");e.className="vpfx";e.textContent="+"+f.vp+" VP";e.style.left=(u.x*cs+cs/2)+"px";e.style.top=(u.y*cs)+"px";$("board").appendChild(e);setTimeout(()=>e.remove(),1700)}
 function finish(){const r=$("result");r.hidden=false;let s=build(p),h="";const sol=p.sols.find(x=>sameLine(steps,x))||p.sols[0];
  sol.forEach(st=>{h+=`<li>${esc(describe(s,st))}${st.vp?` <b>+${st.vp} VP</b>`:""}${st.n?`<br><small>${esc(st.n)}</small>`:""}</li>`;const q=apply(s,st,p);if(q.S)s=q.S});
  r.innerHTML=`<h3>SOLVED${tries?" ("+(tries+1)+" tries)":""}</h3><ol>${h}</ol><div class="btns2"><button class="mi" id="again" type="button">PLAY AGAIN</button></div>`;
  $("again").onclick=()=>{solved=false;tries=0;r.hidden=true;restart()};cfg.onSolved&&cfg.onSolved()}
 $("board").addEventListener("click",e=>{if(solved||failed)return;const un=e.target.closest("[data-u]"),c=e.target.closest("[data-k]"),l=L();
  if(sel&&mode&&l){const xy=c?c.dataset.k.split(",").map(Number):null;let st=null;
   if(["mv","dash","fb","ch"].indexOf(mode)>=0){if(xy&&l[mode].some(q=>q[0]===xy[0]&&q[1]===xy[1]))st={u:sel,t:{mv:"move",dash:"dash",fb:"fb",ch:"charge"}[mode],x:xy[0],y:xy[1]}}
   else if(mode==="sh"||mode==="fi"){if(un&&l[mode].indexOf(un.dataset.u)>=0)st={u:sel,t:mode==="sh"?"shoot":"fight",tgt:un.dataset.u}}
   else{const k=mode.slice(4),m=l.ms.find(m=>m.k===k&&(m.o!=null?xy&&S.obj[m.o].x===xy[0]&&S.obj[m.o].y===xy[1]:m.tgt?un&&un.dataset.u===m.tgt:false));if(m)st={u:sel,t:"act",k,o:m.o,tgt:m.tgt}}
   if(st){if(st.o==null)delete st.o;if(st.tgt==null)delete st.tgt;return attempt(st)}}
  if(un&&S.U[un.dataset.u].s==="F"&&!S.U[un.dataset.u].dead){const id=un.dataset.u;if(S.done[id]&&!(S.act&&S.act.u===id)){last="That operative has already been activated.";draw();return}sel=id;mode=null;draw()}});
 $("menu").addEventListener("click",e=>{const b=e.target.closest("[data-m]");if(!b||b.disabled)return;const m=b.dataset.m;
  if(m.slice(0,4)==="act:"){const k=m.slice(4),l=L(),list=l.ms.filter(x=>x.k===k);if(ACTS[k].m==="here"&&list.length)return attempt({u:sel,t:"act",k})}
  mode=mode===m?null:m;draw()});
 const api={draw,sync,redraw(){sel=null;mode=null;last="";sync();draw()}};sync();state();draw();return api}
function delDraft(id){try{localStorage.removeItem("ktt-pz2:"+id);const ix=JSON.parse(localStorage.getItem("ktt-pz2-index")||"[]").filter(x=>x.id!==id);localStorage.setItem("ktt-pz2-index",JSON.stringify(ix))}catch(e){}}
function draftBtn(card,id){const b=document.createElement("button");b.type="button";b.className="own-del";b.textContent="Delete draft";let sure=0;
 b.onclick=e=>{e.preventDefault();e.stopPropagation();if(!sure){sure=1;b.textContent="Sure? Click again";b.classList.add("sure");setTimeout(()=>{sure=0;b.textContent="Delete draft";b.classList.remove("sure")},3500);return}delDraft(id);card.remove()};
 card.classList.add("own-host");card.appendChild(b)}
return{delDraft,draftBtn,norm,sameLine,K,ACTS,OPACT,C,grid,build,legal,apply,replay,describe,missionText,missionDone,opsInfo,boardHTML,sizeFor,mount,teamOf,cellName,esc,actsOf,frameHTML}})();
