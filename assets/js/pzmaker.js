// PUZZLE MAKER (owner mode): setup (board, teams, operatives, objective markers, terrain, mission) then play the winning line.
(function(){
const Q=new URLSearchParams(location.search),store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
if(!KTT.own.on){$("gate").hidden=false;return}
const IDX="ktt-pz2-index",KEY=i=>"ktt-pz2:"+i,readIdx=()=>{try{return JSON.parse(store.get(IDX)||"[]")}catch(e){return[]}};
const today=()=>new Date().toISOString().slice(0,10),newId=()=>"z"+Date.now().toString(36)+Math.floor(Math.random()*1e3).toString(36),T=KTT.teams,B=KTT.pzBoards;
const fresh=()=>({id:newId(),type:"puzzle",title:"",intro:"",board:B[0].id,tw:{},tA:"Angels Of Death",tB:"Raveners",units:[],obj:[],m:{vp:0,kill:[],crit:"",tac:"",killop:false,text:""},sol:[],created:today()});
function showList(){$("list").hidden=false;$("plist").innerHTML='<a class="rcard addcard" href="pzmaker.html?new"><span class="plus">+</span><b>New puzzle</b><small>Only visible to you</small></a>'+readIdx().map(x=>`<a class="rcard draft" href="pzmaker.html?edit=${esc(x.id)}"><span class="rtag">Puzzle draft</span><h3>${esc(x.title||"Untitled puzzle")}</h3><p>Click to keep working</p></a>`).join("")}
let P=null;if(Q.get("edit")){try{P=JSON.parse(store.get(KEY(Q.get("edit"))))}catch(e){}}
if(!P&&Q.has("new")){P=fresh();store.set(KEY(P.id),JSON.stringify(P));try{history.replaceState(null,"","pzmaker.html?edit="+P.id)}catch(e){}}
if(!P){showList();return}
if(!T.some(t=>t.name===P.tA))P.tA=T[0].name;if(!T.some(t=>t.name===P.tB))P.tB=T[1].name;P.m=P.m||{vp:0,kill:[]};P.tw=P.tw||{};PZ2.norm(P);
$("ed").hidden=false;
let curSol=0,tool="place:F:0",selU=null,tab="S",rapi=null;
const msg=t=>$("msg").textContent=t||"";
function save(){const ix=readIdx().filter(x=>x.id!==P.id);ix.unshift({id:P.id,title:P.title,updated:Date.now()});store.set(IDX,JSON.stringify(ix));store.set(KEY(P.id),JSON.stringify(P));$("prev").href="puzzle.html?draft="+encodeURIComponent(P.id)}
function changed(){if(P.sols.some(x=>x.length)){P.sols=[[]];P.sol=P.sols[0];curSol=0;msg("The setup changed, so the recorded solution was cleared.")}save()}
const arch=n=>(T.find(t=>t.name===n)||{archetypes:[]}).archetypes.join(" / ");
const teamOpts=sel=>T.map(t=>`<option value="${esc(t.name)}"${t.name===sel?" selected":""}>${esc(t.name)} - ${esc(t.archetypes.join(" / "))}</option>`).join("");
$("pBoard").innerHTML=B.map(b=>`<option value="${b.id}">${esc(b.name)} (${b.r[0].length}x${b.r.length})</option>`).join("");
$("tA").innerHTML=teamOpts(P.tA);$("tB").innerHTML=teamOpts(P.tB);
const o=KTT.ops;$("mCrit").innerHTML='<option value="">None</option>'+o.crit.map(c=>`<option value="${c.id}">${esc(c.n)}</option>`).join("");
function tacOpts(){const mine=T.find(t=>t.name===P.tA).archetypes,ar=[...new Set(o.tac.map(x=>x.a))].sort((a,b)=>(mine.indexOf(b)>=0)-(mine.indexOf(a)>=0));
 $("mTac").innerHTML='<option value="">None</option>'+ar.map(a=>`<optgroup label="${esc(a)}${mine.indexOf(a)>=0?" (your team)":""}">${o.tac.filter(x=>x.a===a).map(x=>`<option value="${x.id}">${esc(x.n)}</option>`).join("")}</optgroup>`).join("");$("mTac").value=P.m.tac||""}
function fill(){$("pTitle").value=P.title||"";$("pIntro").value=P.intro||"";$("pBoard").value=P.board;$("mVp").value=P.m.vp||0;$("mCrit").value=P.m.crit||"";$("mKill").checked=!!P.m.killop;$("mText").value=P.m.text||"";tacOpts();prevM()}
function prevM(){$("mPrev").textContent="Mission shown to the reader: "+PZ2.missionText(P)}
// ---------- tools and palette
function tools(){const t=[["move","Move operative"],["obj","Objective marker"],["wall","Wall"],["crate","Crate"],["floor","Clear terrain"],["erase","Erase"]];
 $("tools").innerHTML=t.map(x=>`<button type="button" class="sm${tool===x[0]?" on":""}" data-t="${x[0]}">${x[1]}</button>`).join("");
 const pal=(side,tm)=>`<span class="note" style="margin:0">${side==="F"?"Yours":"Enemy"}:</span>`+T.find(x=>x.name===tm).operatives.map((op,i)=>`<button type="button" class="sm${tool==="place:"+side+":"+i?" on":""}" data-t="place:${side}:${i}">${esc(op.name)}</button>`).join("");
 $("palA").innerHTML=pal("F",P.tA);$("palB").innerHTML=pal("E",P.tB)}
$("tools").onclick=$("palA").onclick=$("palB").onclick=e=>{const b=e.target.closest("[data-t]");if(!b)return;tool=b.dataset.t;selU=null;tools();hintTxt();drawS()};
function hintTxt(){const h={move:"Click an operative, then a free square.",obj:"Click a square to add or remove an objective marker.",wall:"Click squares to paint walls (block movement and sight).",crate:"Click squares to paint crates (block movement, not sight).",floor:"Click to restore the board's own terrain.",erase:"Click an operative or marker to remove it."}[tool];
 $("hint").textContent=h||"Click a square to place the selected operative."}
// ---------- setup board
function curState(){const s=PZ2.build(P);return s}
function drawS(){const S=curState(),cs=PZ2.sizeFor(S.g,null)||36;$("sbox").innerHTML='<div id="board"></div>';const b=$("board");
 b.style.cssText=`grid-template-columns:repeat(${S.g.w},${cs}px);grid-template-rows:repeat(${S.g.h},${cs}px);--cs:${cs}px;cursor:pointer`;b.innerHTML=PZ2.boardHTML(S,cs,{sel:selU,can:new Set()});
 b.querySelectorAll(".obj").forEach(e=>e.style.pointerEvents="none");
 $("ulist").innerHTML=P.units.length?P.units.map(u=>{const op=PZ2.teamOf(u.tm).operatives[u.o];return`<div class="urow"><span class="rtag">${u.id}</span><b>${esc(op.name)}</b><label>APL <input type="number" min="1" max="6" data-id="${u.id}" data-f="apl" value="${u.apl||op.apl}"></label>${u.s==="E"?`<label class="inl"><input type="checkbox" data-id="${u.id}" data-f="kill"${(P.m.kill||[]).indexOf(u.id)>=0?" checked":""}> target</label>`:""}<button class="sm" data-id="${u.id}" data-f="del" type="button">Remove</button></div>`}).join(""):'<p class="note">No operative yet.</p>';
 prevM()}
$("sbox").addEventListener("click",e=>{const c=e.target.closest("[data-k]");if(!c)return;const[x,y]=c.dataset.k.split(",").map(Number),S=curState(),base=B.find(q=>q.id===P.board).r[y][x],cur=S.g.t[y][x],uAt=P.units.find(u=>u.x===x&&u.y===y),oi=P.obj.findIndex(q=>q[0]===x&&q[1]===y);
 if(tool==="move"){if(uAt){selU=uAt.id;drawS();return}if(selU&&cur==="."&&oi<0){const u=P.units.find(q=>q.id===selU);if(u){u.x=x;u.y=y;selU=null;changed();drawS()}}return}
 if(tool==="erase"){if(uAt){P.units=P.units.filter(u=>u!==uAt);P.m.kill=(P.m.kill||[]).filter(i=>i!==uAt.id)}else if(oi>=0)P.obj.splice(oi,1);changed();drawS();return}
 if(tool==="obj"){if(cur==="#"||cur==="o")return;if(oi>=0)P.obj.splice(oi,1);else P.obj.push([x,y]);changed();drawS();return}
 if(tool==="wall"||tool==="crate"||tool==="floor"){if(uAt||oi>=0)return;const ch=tool==="wall"?"#":tool==="crate"?"o":".";if(ch===base)delete P.tw[x+","+y];else P.tw[x+","+y]=ch;changed();drawS();return}
 if(tool.slice(0,6)==="place:"){const[,side,i]=tool.split(":");if(uAt||cur!=="."||(side==="F"?P.tA:P.tB)==null)return;const n=P.units.filter(u=>u.s===side).map(u=>+u.id.slice(1)),id=side+(Math.max(0,...n)+1);
  P.units.push({id,s:side,tm:side==="F"?P.tA:P.tB,o:+i,x,y});changed();drawS()}});
$("ulist").addEventListener("input",e=>{const t=e.target,u=P.units.find(q=>q.id===t.dataset.id);if(!u)return;
 if(t.dataset.f==="apl"){u.apl=Math.max(1,Math.min(6,+t.value||1));changed()}else if(t.dataset.f==="kill"){const k=P.m.kill=P.m.kill||[];const i=k.indexOf(u.id);if(t.checked&&i<0)k.push(u.id);if(!t.checked&&i>=0)k.splice(i,1);save();prevM()}});
$("ulist").addEventListener("click",e=>{const b=e.target.closest("[data-f=del]");if(!b)return;P.units=P.units.filter(u=>u.id!==b.dataset.id);P.m.kill=(P.m.kill||[]).filter(i=>i!==b.dataset.id);changed();drawS()});
// ---------- fields
$("pTitle").oninput=()=>{P.title=$("pTitle").value;save()};$("pIntro").oninput=()=>{P.intro=$("pIntro").value;save()};
$("pBoard").onchange=()=>{P.board=$("pBoard").value;P.tw={};P.units=[];P.obj=[];P.m.kill=[];changed();drawS()};
$("tA").onchange=()=>{P.tA=$("tA").value;P.units=P.units.filter(u=>u.s!=="F");tool="place:F:0";tacOpts();changed();tools();drawS()};
$("tB").onchange=()=>{P.tB=$("tB").value;P.units=P.units.filter(u=>u.s!=="E");P.m.kill=[];changed();tools();drawS()};
$("mVp").oninput=()=>{P.m.vp=Math.max(0,+$("mVp").value||0);changed();prevM()};$("mCrit").onchange=()=>{P.m.crit=$("mCrit").value;changed();prevM()};$("mTac").onchange=()=>{P.m.tac=$("mTac").value;changed();prevM()};
$("mKill").onchange=()=>{P.m.killop=$("mKill").checked;save()};$("mText").oninput=()=>{P.m.text=$("mText").value;save();prevM()};
// ---------- tabs
function go(t){tab=t;$("vS").hidden=t!=="S";$("vR").hidden=t!=="R";$("tabS").classList.toggle("on",t==="S");$("tabR").classList.toggle("on",t==="R");
 if(t==="S"){$("rbox").innerHTML="";tools();hintTxt();drawS()}
 else{$("sbox").innerHTML="";if(!P.units.some(u=>u.s==="F")){msg("Place at least one of your operatives first.");return go("S")}msg("");solbar();rapi=PZ2.mount($("rbox"),P,{record:true,idx:curSol,stepsEl:$("steps"),onChange:()=>{save();solbar(true)}})}}
function solbar(soft){const b=$("solbar");if(soft){[...b.querySelectorAll("[data-s]")].forEach(x=>x.textContent="Solution "+(+x.dataset.s+1)+" ("+P.sols[+x.dataset.s].length+")");return}
 b.innerHTML=P.sols.map((l,i)=>`<button type="button" class="sm${i===curSol?" on":""}" data-s="${i}">Solution ${i+1} (${l.length})</button>`).join("")+'<button type="button" class="sm" data-a="add">+ Add another solution</button>'+(P.sols.length>1?'<button type="button" class="sm" data-a="del">Delete this solution</button>':"")}
$("solbar").onclick=e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.s!=null)curSol=+b.dataset.s;else if(b.dataset.a==="add"){P.sols.push([]);curSol=P.sols.length-1}else if(b.dataset.a==="del"){P.sols.splice(curSol,1);curSol=0}P.sol=P.sols[0];save();go("R")};
$("tabS").onclick=()=>go("S");$("tabR").onclick=()=>go("R");
// ---------- publish
function checks(){const ok=P.sols.map(l=>{const r=PZ2.replay(P,l);return l.length>0&&r.bad<0&&PZ2.missionDone(r.S,P)}),c=[["A title",!!P.title.trim()],["At least one solution recorded (tab 2)",P.sols[0].length>0]];
 P.sols.forEach((l,i)=>c.push(["Solution "+(i+1)+(l.length?" completes the mission":" is empty: record it or delete it (tab 2)"),ok[i]]));
 $("chk").innerHTML=c.map(x=>`<li class="${x[1]?"okm":"warn"}">${x[1]?"✓":"✗"} ${x[0]}</li>`).join("");return c.every(x=>x[1])}
$("goS").onclick=()=>KTT.pub.panel();
$("go").onclick=()=>{if(!checks()){msg("Not ready: see the checklist above the button.");$("chk").scrollIntoView({block:"center"});return}const x=JSON.parse(JSON.stringify(P));delete x.published;delete x.sol;x.created=today();msg("");KTT.pub.go($("go"),"data/pzlist.js","pzs",x)};
$("pub").onclick=()=>{if(!checks()){msg("Not ready: see the checklist above the button.");$("chk").scrollIntoView({block:"center"});return}if(!P.title.trim()){msg("Give the puzzle a title first.");return}if(!P.sol.length){msg("Record the solution first (tab 2).");return}
 const r=PZ2.replay(P,P.sol);if(r.bad>=0||!PZ2.missionDone(r.S,P)){msg("The recorded line does not complete the mission yet (tab 2).");return}msg("");
 const x=JSON.parse(JSON.stringify(P));delete x.published;delete x.sol;x.created=today();const t=JSON.stringify(x)+",",b=$("out");b.hidden=false;b.value=t;b.style.minHeight="12rem";b.onclick=()=>b.select();b.scrollIntoView({block:"center"});b.focus();b.select();msg("Text ready below: it is selected. Copy it (Ctrl+C or long press > Copy) and paste it in the chat. If you cannot copy, tap the box and use Select all.");let ok=false;try{ok=document.execCommand("copy")}catch(e){}
 $("pub").textContent=ok?"Copied":"Select all + copy below";setTimeout(()=>$("pub").textContent="Copy for publication",2200);try{navigator.clipboard&&navigator.clipboard.writeText(t).then(()=>{$("pub").textContent="Copied"},()=>{})}catch(e){}};
let dsure=0;$("del").onclick=()=>{if(!dsure){dsure=1;$("del").textContent="Sure? Click again";setTimeout(()=>{dsure=0;$("del").textContent="Delete this draft"},3500);return}store.del(KEY(P.id));store.set(IDX,JSON.stringify(readIdx().filter(x=>x.id!==P.id)));location.href="pzmaker.html"};
$("tabS").addEventListener("click",checks);$("tabR").addEventListener("click",checks);fill();save();go("S");checks();setInterval(checks,1500);
})();
