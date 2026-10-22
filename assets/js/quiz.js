(function(){
const RANKS=[
{n:"Novice",c:"#9a9a9a",len:10,time:0,pass:.5,d:"First steps on the killzone. Your own kill team, famous heroes and the basics of Kill Team."},
{n:"Beginner",c:"#c07a3a",len:12,time:0,pass:.55,d:"Your team's operatives, weapons, ploys and the lore around it."},
{n:"Intermediate",c:"#c4ccd4",len:15,time:30,pass:.6,d:"Weapon rules and profiles, characters and general rules. The clock starts ticking."},
{n:"Expert",c:"#4fa3ff",len:15,time:25,pass:.65,d:"Ploys, equipment and list building, across teams of your allegiance."},
{n:"Master",c:"#b45cff",len:20,time:20,pass:.7,d:"Exact wording and numbers inside the rules. Misreading is punished."},
{n:"Emperor",c:"#ffcf33",len:25,time:15,pass:.75,d:"The ultimate trial. Rules wording, cross-faction comparisons, deep lore. Any team, no mercy."}];
const ALL={Imperium:{c:"#e6b422",t:"For the Emperor. Space Marines, Guard, Sisters and the Mechanicus."},Chaos:{c:"#e0342b",t:"Heretics, traitors and daemons serving the Ruinous Powers."},Xenos:{c:"#38d6b0",t:"Aliens of every kind: T'au, Eldar, Necrons, Orks, Tyranids and more."}};
const ICON={
Imperium:c=>`<svg viewBox="0 0 100 100"><path d="M50 6 88 20v30c0 24-16 38-38 46C28 88 12 74 12 50V20z" fill="none" stroke="${c}" stroke-width="5"/><path d="M50 22v56M28 42h44" stroke="${c}" stroke-width="8"/><circle cx="50" cy="42" r="9" fill="#000" stroke="${c}" stroke-width="4"/></svg>`,
Chaos:c=>`<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="12" fill="${c}"/><g stroke="${c}" stroke-width="6" fill="none"><path d="M50 8v22M50 70v22M8 50h22M70 50h22M20 20l16 16M64 64l16 16M80 20 64 36M36 64 20 80"/></g><path d="M50 3l7 11h-14zM50 97l7-11h-14zM3 50l11-7v14zM97 50l-11-7v14zM17 17l12 3-9 9zM83 83l-12-3 9-9zM83 17l-3 12-9-9zM17 83l3-12 9 9z" fill="${c}"/></svg>`,
Xenos:c=>`<svg viewBox="0 0 100 100"><path d="M6 50C24 22 76 22 94 50 76 78 24 78 6 50z" fill="none" stroke="${c}" stroke-width="5"/><ellipse cx="50" cy="50" rx="10" ry="19" fill="${c}"/><path d="M50 8v14M50 78v14M20 22l8 11M80 22l-8 11" stroke="${c}" stroke-width="5"/></svg>`};
const seal=(i,locked)=>{const r=RANKS[i],c=locked?"#444":r.c,n=i+4;let pts="";for(let k=0;k<n*2;k++){const a=Math.PI*k/n-Math.PI/2,rad=k%2?30:44;pts+=(50+rad*Math.cos(a)).toFixed(1)+","+(50+rad*Math.sin(a)).toFixed(1)+" "}
 return `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${pts}" fill="${c}" opacity=".18" stroke="${c}" stroke-width="2"/><circle cx="50" cy="50" r="27" fill="#050505" stroke="${c}" stroke-width="3"/><text x="50" y="${i===5?58:60}" text-anchor="middle" font-family="Big Shoulders Display,sans-serif" font-weight="900" font-size="${i===5?30:34}" fill="${c}">${locked?"🔒".replace("🔒","?"):["I","II","III","IV","V","VI"][i]}</text></svg>`};
function fx(x){if(!x)return "";let h="";
 if(x.r){const t=(KTT.rules||{})[x.r[0]]||{};for(const k of ["strat","fire","equip","rule"]){const it=(t[k]||[]).find(i=>i.name===x.r[1]);if(it){h=`<b>${esc(it.name)}</b>${esc(it.text)}`;break}}}
 else if(x.w)h=x.w.map(k=>esc((KTT.gloss||{})[k]||"")).filter(Boolean).join("<br>");
 return h?`<div class="qfx"><small>What it does</small>${h}</div>`:""}
const KEY="ktt-quiz-v1";
let P={al:"",fac:"",cleared:0,best:{},xp:0,seen:[],runs:0};
try{const s=JSON.parse(localStorage.getItem(KEY)||"null");if(s&&typeof s==="object")P=Object.assign(P,s)}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(P))}catch(e){}};
const V=$("qv"),M=$("qm");
const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const spr=(t,px)=>KTT.SPR&&KTT.SPR.svg?KTT.SPR.svg(t,px||4):"";
const facs=al=>KTT.teams.map(t=>t.name).filter(n=>KTT.allegiance[n]===al).sort();
const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=(h*33^s.charCodeAt(i))>>>0;return h.toString(36)};
function setTheme(){M.dataset.al=P.al||""}
function hdr(step){return `<div class="qhero"><h1>Kill Team <em>Trials</em></h1><p>Six ranks. One goal: sit on the Golden Throne. Every trial is harder than the last, and tuned to your faction.</p></div>${step?`<div class="qsteps">${["Allegiance","Faction","Ascend"].map((s,i)=>i+1===step?`<b>${i+1}. ${s}</b>`:`<span>${i+1}. ${s}</span>`).join(" &middot; ")}</div>`:""}`}
function pickAl(){setTheme();V.innerHTML=hdr(1)+`<div class="qal">${Object.keys(ALL).map(a=>`<button class="qalc" data-al="${a}" style="--c:${ALL[a].c}">${ICON[a](ALL[a].c)}<h3 style="color:${ALL[a].c}">${a}</h3><p>${ALL[a].t}</p></button>`).join("")}</div>${saveBox()}`;
 V.querySelector(".qal").onclick=e=>{const b=e.target.closest("[data-al]");if(!b)return;P.al=b.dataset.al;P.fac="";save();pickFac()};bindSave()}
function pickFac(){setTheme();V.innerHTML=hdr(2)+`<button class="qback" id="bk">&larr; Change allegiance</button><div class="qfac">${facs(P.al).map((n,i)=>`<button class="qfc" data-f="${esc(n)}" style="animation-delay:${i*.03}s">${spr(n,4)}<span>${esc(n)}</span></button>`).join("")}<button class="qfc any" data-f="*"><span>No favourite faction<br><small>All ${P.al} questions</small></span></button></div>`;
 $("bk").onclick=pickAl;V.querySelector(".qfac").onclick=e=>{const b=e.target.closest("[data-f]");if(!b)return;P.fac=b.dataset.f==="*"?"":b.dataset.f;save();path()}}
function saveBox(){return `<details class="qsave"><summary>Save code (move your progress to another browser)</summary><p class="note">Progress is saved automatically in this browser. To continue elsewhere, copy your code, or paste a code and load it.</p><textarea id="sc" spellcheck="false" placeholder="Paste a save code here"></textarea><p><button class="qgh" id="sx">Show my code</button> <button class="qgh" id="sl">Load code</button> <button class="qgh" id="sr">Reset progress</button> <span id="sm" class="note"></span></p></details>`}
const enc=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const dec=s=>JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
function bindSave(){const sm=m=>$("sm").textContent=m;
 $("sx").onclick=()=>{const c={al:P.al,fac:P.fac,cleared:P.cleared,best:P.best,xp:P.xp,runs:P.runs};$("sc").value="KTT1."+enc(c);$("sc").select();sm("Copy this code and keep it somewhere safe.")};
 $("sl").onclick=()=>{try{const t=$("sc").value.trim().replace(/^KTT1\./,"");const o=dec(t);if(!o||typeof o.cleared!=="number"||!["Imperium","Chaos","Xenos",""].includes(o.al||""))throw 0;P=Object.assign(P,{al:o.al||"",fac:o.fac||"",cleared:Math.max(0,Math.min(6,o.cleared|0)),best:o.best||{},xp:+o.xp||0,runs:+o.runs||0,seen:[]});save();sm("Loaded.");P.al?path():pickAl()}catch(e){sm("This code is not valid.")}};
 let sure=false;$("sr").onclick=()=>{if(!sure){sure=true;$("sr").textContent="Sure? Click again";return}P={al:"",fac:"",cleared:0,best:{},xp:0,seen:[],runs:0};save();pickAl()}}
function path(){setTheme();const top=Math.min(P.cleared,5),pct=Math.round(P.cleared/6*100);
 const rk=P.cleared>=6?"Emperor":P.cleared?RANKS[P.cleared-1].n:"Unranked";
 V.innerHTML=hdr(3)+`<div class="qbar"><div class="who">${P.fac?spr(P.fac,3):ICON[P.al]("var(--ac)").replace("<svg",'<svg style="width:48px;height:48px"')}<div><small>${P.al}</small><b>${esc(P.fac||"Unsworn")}</b></div></div><div class="xp"><small>Current rank: <b style="color:var(--ac)">${rk}</b> &middot; ${P.xp} XP</small><div class="qxp"><i style="width:${pct}%"></i></div></div><div class="qbtns"><button class="qgh" id="ch">Change faction</button></div></div>
 <div class="qpath">${RANKS.map((r,i)=>{const lock=i>P.cleared,cur=i===P.cleared,done=i<P.cleared,b=P.best[i];
 return `<div class="qrk${lock?" lock":""}${cur?" cur":""}"><div class="seal">${seal(i,lock)}</div><div><h3 style="color:${lock?"#777":r.c}">${r.n}</h3><p>${lock?"Defeat the previous rank to unlock.":r.d}</p><div class="meta"><b>${r.len}</b> questions &middot; ${r.time?`<b>${r.time}s</b> per question`:"no timer"} &middot; <b>${Math.round(r.pass*100)}%</b> to pass</div></div><div class="st">${done?`<div>Cleared &#10003;${b!=null?`<br>Best ${b}%`:""}</div><div class="go"><button class="qgo ghost" data-r="${i}">Retry</button></div>`:cur?`<div class="go"><button class="qgo" data-r="${i}">${i===5?"Face the Emperor":"Begin trial"}</button></div>`:"&nbsp;"}</div></div>`}).join("")}</div>`+saveBox();
 $("ch").onclick=pickAl;V.querySelector(".qpath").onclick=e=>{const b=e.target.closest("[data-r]");if(b)run(+b.dataset.r)};bindSave()}
// ---- selection
function build(ri){const r=RANKS[ri],lv=ri+1,seen=new Set(P.seen);
 const tw=d=>{const k=d-lv;if(k===0)return 1;if(lv===6)return k===-1?.6:k===-2?.2:0;if(lv===1)return k===1?.25:0;return k===-1?.3:k===1?(lv===5?.3:.2):0};
 const mine=P.fac,al=P.al,hard=lv>=5;
 const SH=[[.6,.02,0,.38],[.5,.04,0,.46],[.4,.1,.05,.45],[.2,.2,.2,.4],[.08,.2,.37,.35],[.04,.2,.4,.36]][ri];
 const grp=q=>{if(!q.t)return 3;if(mine?q.t===mine:q.al===al)return 0;if(q.al===al)return 1;return 2};
 const G=[[],[],[],[]];
 KTT.qbank.forEach(q=>{const w=tw(q.d);if(w<=0||KTT.own.has("q:"+hash(q.q)))return;let x=w;if(seen.has(hash(q.q)))x*=.25;if(hard&&q.c==="lore")x*=1.2;const g=grp(q);G[g].push([-Math.log(Math.random())/x,q])});
 G.forEach(g=>g.sort((a,b)=>a[0]-b[0]));
 const quota=SH.map(p=>Math.round(p*r.len));let dq=r.len-quota.reduce((a,b)=>a+b,0);quota[3]+=dq;
 const out=[],tc={},used=new Set();
 const take=(g,n)=>{let c=0;for(const [,q] of G[g]){if(c>=n||out.length>=r.len)break;if(used.has(q))continue;const k=q.t+"|"+q.c;if(q.t&&(tc[k]||0)>=(g===0?(ri<2?8:5):2))continue;tc[k]=(tc[k]||0)+1;used.add(q);out.push(q);c++}return c};
 let short=0;[0,1,2,3].forEach(g=>{short+=quota[g]-take(g,quota[g])});
 if(short>0)[3,0,1,2].forEach(g=>{if(short>0)short-=take(g,short)});
 for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
 return out}
KTT.qbuild=build;
// ---- run
let Q,qi,sc,streak,wrong,ri,timer,removed=0;
function run(i){removed=0;ri=i;Q=build(i);qi=0;sc=0;streak=0;wrong=[];q()}
function q(){clearInterval(timer);if(qi>=Q.length)return result();const r=RANKS[ri],x=Q[qi];
 V.innerHTML=`<div class="qrun"><div class="qhud"><span><b>${r.n}</b> trial</span><span>Question ${qi+1} / ${Q.length}</span><span>Score <b>${sc}</b></span></div><div class="qprog"><i style="width:${qi/Q.length*100}%"></i></div><div class="qtime${r.time?" on":""}" id="tm"><i></i></div>
 <div class="qcard">${removed?`<small class="note">Question removed for you (${removed}). Use Removal list at the top to send me the list.</small>`:""}<span class="qtag">${esc({rules:"Rules",lore:"Lore",data:"Data",weapons:"Weapons",roster:"Roster",build:"List building",math:"Maths"}[x.c]||x.c)}${x.t?" &middot; "+esc(x.t):""}</span><div class="qq">${esc(x.q)}</div><div class="qo">${x.o.map((o,k)=>`<button data-i="${k}" data-k="${"ABCD"[k]}">${esc(o)}</button>`).join("")}</div><div id="fb"></div></div>
 <div class="qrow"><span class="qstreak" id="stk">${streak>=2?"Streak x"+streak:""}</span>${KTT.own.on?`<button class="qgh" id="qrm">Remove this question</button> `:""}<button class="qgh" id="qt">Abandon</button></div></div>`;
 $("qt").onclick=path;if($("qrm")){let s=0;$("qrm").onclick=()=>{if(!s){s=1;$("qrm").textContent="Sure? Click again";return}KTT.own.hide("q:"+hash(x.q),x.q);Q.splice(qi,1);removed++;q()}}let done=false;
 const fin=(pick)=>{if(done)return;done=true;clearInterval(timer);const ok=pick===x.a;
  V.querySelectorAll(".qo button").forEach((b,k)=>{b.disabled=true;if(k===x.a)b.classList.add("ok");else if(k===pick)b.classList.add("ko")});
  if(ok){sc++;streak++}else{streak=0;wrong.push(x)}
  P.seen.push(hash(x.q));if(P.seen.length>4000)P.seen=P.seen.slice(-3000);
  $("fb").innerHTML=`<div class="qfb ${ok?"good":"bad"}"><b>${pick==null?"Time is up.":ok?(streak>=3?"Brilliant. Streak x"+streak:"Correct."):"Not quite."}</b>${esc(x.e)}${fx(x.x)}</div><div class="qrow"><span></span><button class="qgo" id="nx">${qi+1<Q.length?"Next":"See verdict"}</button></div>`;
  $("stk").textContent=streak>=2?"Streak x"+streak:"";$("nx").onclick=()=>{qi++;q()};$("nx").focus()};
 V.querySelector(".qo").onclick=e=>{const b=e.target.closest("button[data-i]");if(b&&!b.disabled)fin(+b.dataset.i)};
 if(r.time){const t0=Date.now(),bar=$("tm");timer=setInterval(()=>{const f=1-(Date.now()-t0)/1000/r.time;bar.firstChild.style.transform=`scaleX(${Math.max(0,f)})`;bar.classList.toggle("low",f<.3);if(f<=0)fin(null)},80)}}
function confetti(c){if(reduce)return;for(let i=0;i<70;i++){const e=document.createElement("i");e.className="confetti";e.style.left=Math.random()*100+"vw";e.style.background=[c,"#fff","#ff6a13"][i%3];e.style.animationDuration=2+Math.random()*2.5+"s";e.style.animationDelay=Math.random()*.6+"s";document.body.appendChild(e);setTimeout(()=>e.remove(),5500)}}
function result(){const r=RANKS[ri],pct=Math.round(sc/Q.length*100),pass=sc/Q.length>=r.pass,first=pass&&ri===P.cleared;
 P.runs++;P.best[ri]=Math.max(P.best[ri]||0,pct);P.xp+=sc*(ri+1)*10+(pass?50*(ri+1):0);if(first)P.cleared=ri+1;save();
 const fin=ri===5&&pass;
 V.innerHTML=`<div class="qres${pass?" win":""}"><div class="seal">${seal(ri,false)}</div><h2>${fin?"All hail the <em>Emperor</em>":pass?(first?`Rank up: <em>${r.n}</em>`:`<em>${r.n}</em> trial passed`):"The trial <em>defeated</em> you"}</h2><div class="qscore" id="cnt">0%</div><p>${sc} / ${Q.length} correct &middot; ${Math.round(r.pass*100)}% needed &middot; +${sc*(ri+1)*10+(pass?50*(ri+1):0)} XP</p><p>${pass?(fin?"There is nothing left to learn... until the next codex.":"The next rank awaits. Questions get harder, and the clock gets shorter."):"Review your mistakes below, then try again. Questions are re-drawn each time."}</p>
 <p><button class="qgo" id="pa">${pass&&ri<5&&first?"To the path":"Back to the path"}</button> ${!pass||!first?`<button class="qgo ghost" id="rt">Try again</button>`:""}</p>
 ${wrong.length?`<div class="qrev"><h3>To review</h3>${wrong.map(w=>`<div><b>${esc(w.q)}</b><small>Answer: ${esc(w.o[w.a])}. ${esc(w.e)}</small>${fx(w.x)}</div>`).join("")}</div>`:""}</div>`;
 $("pa").onclick=path;if($("rt"))$("rt").onclick=()=>run(ri);
 const el=$("cnt"),t0=performance.now();(function f(n){const k=Math.min(1,(n-t0)/900);el.textContent=Math.round(pct*(1-Math.pow(1-k,3)))+"%";if(k<1)requestAnimationFrame(f)})(t0);
 if(pass)confetti(r.c)}
// ---- embers
(function(){const c=$("embers"),x=c.getContext("2d");if(reduce)return;let w,h,ps=[];
 const rs=()=>{w=c.width=c.offsetWidth;h=c.height=c.offsetHeight;ps=[];const n=Math.min(70,Math.round(w/16));for(let i=0;i<n;i++)ps.push(mk(true))};
 const mk=init=>({x:Math.random()*w,y:init?Math.random()*h:h+10,r:Math.random()*2+.5,v:.2+Math.random()*.7,s:Math.random()*6,a:.2+Math.random()*.6});
 let col="255,106,19";const cols={Imperium:"230,180,34",Chaos:"224,52,43",Xenos:"56,214,176"};
 function tick(){col=cols[M.dataset.al]||"255,106,19";x.clearRect(0,0,w,h);ps.forEach((p,i)=>{p.y-=p.v;p.s+=.02;p.x+=Math.sin(p.s)*.4;if(p.y<-10)ps[i]=mk();x.beginPath();x.fillStyle=`rgba(${col},${p.a*(p.y/h)})`;x.shadowColor=`rgb(${col})`;x.shadowBlur=8;x.arc(p.x,p.y,p.r,0,7);x.fill()});requestAnimationFrame(tick)}
 addEventListener("resize",rs);rs();tick()})();
P.al?(P.fac||P.cleared||P.runs?path():pickFac()):pickAl();
})();
