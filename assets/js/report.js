// Battle analysis: report list (landing), report builder (owner) and read-only viewer.
// A report is plain JSON: {id,title,intro,conclusion,map,flip,pa,pb,ta,tb,units,steps,draft,uid}
// steps[i] = {tp,action,analysis,moves:[{u,to}],fx:[{k:"shoot"|"fight",u,t,dmg,kill,a,b}]}
(function(){
const Q=new URLSearchParams(location.search);
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
if(Q.get("owner")==="1"){store.set("ktt-owner","1");window.name="ktt-owner"}
if(Q.get("owner")==="0"){store.del("ktt-owner");window.name=""}
const OWNER=store.get("ktt-owner")==="1"||window.name==="ktt-owner";
const IDX="ktt-reports-index",KEY=id=>"ktt-report:"+id;
const readIdx=()=>{try{return JSON.parse(store.get(IDX)||"[]")}catch(e){return[]}};
const newId=()=>"r"+Date.now().toString(36)+Math.floor(Math.random()*1e3).toString(36);
const clone=o=>JSON.parse(JSON.stringify(o));
const blankDraft=tp=>({tp:tp||1,action:"",analysis:"",moves:[],fx:[],env:[]});
const fresh=()=>({id:newId(),title:"",intro:"",conclusion:"",map:"volkus-1",flip:false,pa:"",pb:"",ta:"",tb:"",units:[],props:[],steps:[],draft:blankDraft(1),uid:1,created:new Date().toISOString().slice(0,10)});
const titleOf=r=>r.title||((r.pa||"Player A")+" vs "+(r.pb||"Player B"));
// one-time migration of the previous single-report storage
(function(){const old=store.get("ktt-report-v1");if(old&&!store.get(IDX)){try{const s=JSON.parse(old),r=Object.assign(fresh(),s);store.set(KEY(r.id),JSON.stringify(r));store.set(IDX,JSON.stringify([{id:r.id,title:titleOf(r),updated:Date.now()}]))}catch(e){}}})();
// share links: the whole report is compressed into the URL (#z=...), so nobody needs files or a server
const b64u=u8=>{let s="";u8.forEach(c=>s+=String.fromCharCode(c));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
const unb64u=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
const pipe=async(u8,T)=>new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new T("deflate-raw"))).arrayBuffer());
if(/^#z=/.test(location.hash)&&window.DecompressionStream){pipe(unb64u(location.hash.slice(3)),DecompressionStream).then(u=>{const j=new TextDecoder().decode(u);try{sessionStorage.setItem("ktt-shared",j)}catch(e){store.set("ktt-shared",j)}location.replace(location.pathname+"?shared=1")}).catch(()=>{});}
let shared=null;if(Q.has("shared")){try{shared=JSON.parse(sessionStorage.getItem("ktt-shared")||store.get("ktt-shared"))}catch(e){}}
let mode="list",S=null,RO=false;
if(Q.has("game"))mode="game";
else if(shared){S=Object.assign(fresh(),shared);S.draft=blankDraft(1);S.edit=null;S.isNew=false;RO=true;mode="view"}
else if(Q.has("r")){const r=(KTT.reports||[]).find(x=>x.id===Q.get("r"));if(r){S=clone(r);S.draft=blankDraft(1);RO=true;mode="view"}}
else if(OWNER&&(Q.has("edit")||Q.has("new"))){
 if(Q.has("edit")){try{S=JSON.parse(store.get(KEY(Q.get("edit"))))}catch(e){}}
 if(S){mode="edit"}else if(Q.has("new")){S=fresh();mode="edit";persist();try{history.replaceState(null,"","analysis.html?edit="+S.id)}catch(e){}}}
function persist(){if(!S||RO)return;S.title=S.title||"";store.set(KEY(S.id),JSON.stringify(S));const ix=readIdx().filter(x=>x.id!==S.id);ix.unshift({id:S.id,title:titleOf(S),updated:Date.now()});store.set(IDX,JSON.stringify(ix))}
// ---------- landing
function landing(){$("landing").hidden=false;let h="";
 if(OWNER)h+='<a class="rcard addcard" href="analysis.html?new"><span class="plus">+</span><b>Add a battle report</b><small>Only visible to you</small></a>';
 if(OWNER)readIdx().forEach(x=>{let r=null;try{r=JSON.parse(store.get(KEY(x.id)))}catch(e){}if(!r)return;const m=mapOf(r.map);h+=`<a class="rcard draft" data-oid="d:${x.id}" href="analysis.html?edit=${x.id}"><span class="rtag">Draft - only you</span><h3>${esc(titleOf(r))}</h3><p>${esc(r.ta||"")}${r.ta&&r.tb?" vs ":""}${esc(r.tb||"")}</p><small>${m?esc(m.name)+" - ":""}${r.steps.length} step${r.steps.length===1?"":"s"}</small></a>`});
 (KTT.reports||[]).filter(r=>KTT.own.visible("r:"+r.id)).forEach(r=>{const m=mapOf(r.map);h+=`<a class="rcard" data-oid="r:${esc(r.id)}" href="analysis.html?r=${encodeURIComponent(r.id)}"><span class="rtag">Battle report</span><h3>${esc(titleOf(r))}</h3><p>${esc(r.ta||"")}${r.ta&&r.tb?" vs ":""}${esc(r.tb||"")}</p><small>${m?esc(m.name)+" - ":""}${r.steps.length} steps${r.created?" - "+esc(r.created):""}</small></a>`});
 (KTT.games||[]).filter(g=>KTT.own.visible("g:"+g.id)).forEach(g=>{const m=mapOf(g.map);h+=`<a class="rcard" data-oid="g:${esc(g.id)}" href="analysis.html?game=${encodeURIComponent(g.id)}"><span class="rtag">Game replay</span><h3>${esc(g.title)}</h3><p><b>${esc(g.ta)}</b> vs <b>${esc(g.tb)}</b></p><small>${esc(g.event||"")}${m?" - "+esc(m.name):""}</small></a>`});
 $("rgrid").innerHTML=h||'<p class="empty">No battle report published yet.</p>';
 if(OWNER)document.querySelectorAll("#rgrid [data-oid]").forEach(c=>{const id=c.dataset.oid;if(id[0]!=="d"){KTT.own.btn(c,id);return}
  const b=document.createElement("button");b.type="button";b.className="own-del";b.textContent="Delete draft";let s=0;c.classList.add("own-host");c.appendChild(b);
  b.onclick=e=>{e.preventDefault();e.stopPropagation();if(!s){s=1;b.textContent="Sure? Click again";b.classList.add("sure");return}const rid=id.slice(2);store.del(KEY(rid));store.set(IDX,JSON.stringify(readIdx().filter(x=>x.id!==rid)));location.reload()}})
}
if(mode==="list"){landing();return}
function fromGame(g){const S=fresh();S.id="g-"+g.id;S.title=g.title;S.map=g.map;S.pa=g.pa;S.pb=g.pb;S.ta=g.ta;S.tb=g.tb;
 const seen={},w={},pos={};
 S.units=Object.keys(g.ops).map(k=>{const o=g.ops[k],key=o.s+o.n;seen[key]=(seen[key]||0)+1;w[k]=o.w;pos[k]=[o.x,o.y];
  return{id:k,side:o.s,team:o.s==="A"?g.ta:g.tb,base:o.n,name:seen[key]>1?o.n+" "+seen[key]:o.n,code:o.c+(seen[key]>1?seen[key]:""),max:o.w,x:o.x,y:o.y}});
 S.uid=S.units.length+1;
 S.steps.push({tp:1,action:"Deployment complete",analysis:"",moves:[],fx:[]});
 g.steps.forEach(st=>{const moves=[],fx=[];if(st.mv&&st.o)moves.push({u:st.o,to:st.mv});if(st.mvs)for(const k in st.mvs)moves.push({u:k,to:st.mvs[k]});
  moves.forEach(m=>pos[m.u]=m.to);
  const hit=(u,t,d)=>{const kill=d>=99||w[t]-d<=0,dm=kill?w[t]:d;w[t]=kill?0:w[t]-d;fx.push({k:"shoot",u:u||null,t,dmg:dm,kill,a:u?pos[u]:null,b:pos[t]})};
  if(st.sh)hit(st.o,st.sh,st.dm||0);(st.hits||[]).forEach(h=>hit(st.o,h[0],h[1]));
  const who=st.o?g.ops[st.o].n+": ":"";
  S.steps.push({tp:st.tp,action:who+st.a+(st.an?" "+st.an:""),analysis:(st.t||"")+(st.sc?" "+st.sc:""),moves,fx,rm:st.rm?[st.rm]:undefined})});
 const sm=g.summary||[];S.intro=sm.slice(0,2).join("\n");S.conclusion=sm.slice(2).concat((g.analysis||[]).map(a=>a[0]+": "+a[1])).join("\n");return S}
if(mode==="game"){$("replay").hidden=false;if(OWNER){const g=(KTT.games||[]).find(x=>x.id===Q.get("game"));if(g){const b=document.createElement("button");b.className="sm acc";b.type="button";b.textContent="Edit this game in the report builder";b.style.margin="0 0 0 .6rem";
 b.onclick=()=>{const id="g-"+g.id;if(!store.get(KEY(id))){const r=fromGame(g);store.set(KEY(id),JSON.stringify(r));const ix=readIdx().filter(x=>x.id!==id);ix.unshift({id,title:titleOf(r),updated:Date.now()});store.set(IDX,JSON.stringify(ix))}location.href="analysis.html?edit="+id};
 $("replay").firstElementChild.after(b)}}return}
$("editor").hidden=false;
// owner: open a published report in the editor (works on a copy; send the new version to replace the published one)
if(RO&&OWNER&&Q.has("r")&&S){const b=document.createElement("button");b.className="sm acc";b.type="button";b.textContent="Edit this report";b.style.cssText="margin:.4rem 0 .8rem";
 b.onclick=()=>{const o=clone(S);o.draft=blankDraft(1);o.edit=null;o.isNew=false;if(!store.get(KEY(o.id))){store.set(KEY(o.id),JSON.stringify(o));const ix=readIdx().filter(x=>x.id!==o.id);ix.unshift({id:o.id,title:titleOf(o),updated:Date.now()});store.set(IDX,JSON.stringify(ix))}location.href="analysis.html?edit="+encodeURIComponent(o.id)};
 $("rtitleRO").after(b);if(Q.get("edit"))b.onclick()}
// ---------- editor
const svg=$("rb");
[["blank-volkus","Blank 22x30 (1-inch grid)",22,30,1,0],["blank-tomb","Blank 19x22 (3-inch grid)",19,22,3,.45],["blank-gallow","Blank 20x17 (3-inch grid)",20,17,3,2.4]].forEach(b=>{
 if(!KTT.maps.find(m=>m.id===b[0]))KTT.maps.push({id:b[0],name:b[1],w:b[2],h:b[3],a:"b",d:b[2]>=22?6:3,t:[],o:[],u:b[4],go:b[5]||undefined,sa:b[0]==="blank-gallow"?1:undefined})});
let V=RO?0:null,tool="move",sel=null,drag=null,timer=null,selP=null,ptype=null;
// universal equipment placed on the map. Sizes are in inches [length, width] and can be adjusted here.
const PROPS={hb:{n:"Heavy barricade",s:[3,.9]},lb:{n:"Light barricade",s:[2,.45]},bw:{n:"Barbed wire",s:[3,.6]},ld:{n:"Ladder",s:[.7,2]}};
const propSvg=(p,sel,pos)=>{const d=PROPS[p.k];if(!d)return"";const w=d.s[0],h=d.s[1],x=pos?pos[0]:p.x,y=pos?pos[1]:p.y;let b="";
 if(p.k==="hb")b=`<rect class="hb" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}"/><path class="ph" d="M${-w/2+.3} ${h/2}l.5 ${-h}M${-w/2+1} ${h/2}l.5 ${-h}M${-w/2+1.7} ${h/2}l.5 ${-h}M${-w/2+2.4} ${h/2}l.5 ${-h}"/>`;
 else if(p.k==="lb")b=`<rect class="lb" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}"/>`;
 else if(p.k==="bw"){let pts="";const n=8;for(let i=0;i<=n;i++)pts+=(-w/2+w*i/n)+","+(i%2?-h/2:h/2)+" ";b=`<rect class="bwh" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}"/><polyline class="bw" points="${pts}"/>`}
 else b=`<rect class="ld" x="${-w/2}" y="${-h/2}" width="${w}" height="${h}"/>`+[.2,.4,.6,.8].map(f=>`<line class="ldr" x1="${-w/2}" y1="${-h/2+h*f}" x2="${w/2}" y2="${-h/2+h*f}"/>`).join("");
 return `<g class="rp${sel?" sel":""}" data-pid="${p.id}" transform="translate(${x},${y}) rotate(${p.r||0})"><title>${d.n}</title>${b}</g>`};
const pSnap=pt=>{const m=M(),q=[Math.min(m.w,Math.max(0,pt[0])),Math.min(m.h,Math.max(0,pt[1]))];if(!$("snap").checked)return[Math.round(q[0]*10)/10,Math.round(q[1]*10)/10];
 const g=m.go||0,st=(m.u||1)/2,f=v=>v<g?Math.round(v*2)/2:+(g+Math.round((v-g)/st)*st).toFixed(2);return[f(q[0]),f(q[1])]};
const M=()=>mapOf(S.map),unit=id=>S.units.find(u=>u.id===id);
const N=()=>S.edit==null?S.steps.length:S.edit;
const started=()=>N()>0;
function apply(st,s){(s.env||[]).forEach(e=>{if(e.k==="door"){e.o?st.env.open.add(e.i):st.env.open.delete(e.i)}else{e.b?st.env.br.add(e.w):st.env.br.delete(e.w)}});(s.rm||[]).forEach(id=>{if(st.pos[id]!==undefined)st.pos[id]=null});s.moves.forEach(m=>{if(st.pos[m.u]!==undefined)st.pos[m.u]=m.to});s.fx.forEach(f=>{if(st.w[f.t]===undefined)return;st.w[f.t]=f.kill?0:Math.max(0,st.w[f.t]-(+f.dmg||0))})}
function stateAt(n,withDraft){const st={pos:{},w:{},env:{open:new Set(),br:new Set()}};S.units.forEach(u=>{st.pos[u.id]=u.x==null?null:[u.x,u.y];st.w[u.id]=u.max});
 for(let i=0;i<n&&i<S.steps.length;i++)apply(st,S.steps[i]);if(withDraft)apply(st,S.draft);return st}
const nm=id=>{const u=unit(id);return u?u.name:"?"};
// ---------- deployment zones (follow the map orientation)
function zoneSpots(side){const m=M(),a=m.a,eff=S.flip?(side==="A"?"B":"A"):side,edge=eff==="A"?a:({b:"t",t:"b",r:"l",l:"r"})[a],pad=.75,zd=zoneD(m),d=edge===a?zd[0]:zd[1];
 let x0=pad,x1=m.w-pad,y0=pad,y1=m.h-pad;
 if(edge==="b")y0=m.h-d+pad;else if(edge==="t")y1=d-pad;else if(edge==="r")x0=m.w-d+pad;else x1=d-pad;
 const xs=[],ys=[];for(let x=x0;x<=x1+.01;x+=1.6)xs.push(+x.toFixed(2));for(let y=y0;y<=y1+.01;y+=1.6)ys.push(+y.toFixed(2));
 if(!xs.length)xs.push((x0+x1)/2);if(!ys.length)ys.push((y0+y1)/2);
 const out=[];if(edge==="l"||edge==="r"){ys.forEach(y=>xs.forEach(x=>out.push([x,y])))}else{const rows=edge==="b"?ys.slice().reverse():ys;rows.forEach(y=>xs.forEach(x=>out.push([x,y])))}
 return out}
function spotFor(side,k){const sp=zoneSpots(side);return sp[k%sp.length]}
function addUnit(side,ti,oi){const t=KTT.teams[ti],o=t.operatives[oi],base=title(o.name),n=S.units.filter(u=>u.side===side&&u.base===base).length;
 const w=base.split(/\s+/);let code=(w.length>1?w[0][0]+w[1][0]:base.slice(0,2));code=code[0].toUpperCase()+(code[1]||"").toLowerCase();
 const same=S.units.filter(u=>u.side===side&&u.code.replace(/\d/g,"")===code).length;if(same)code+=(same+1);
 const p=spotFor(side,S.units.filter(u=>u.side===side).length);
 S.units.push({id:"u"+S.uid++,side,team:t.name,base,name:n?base+" "+(n+1):base,code,max:o.wounds,x:p[0],y:p[1]})}
function redeploy(){["A","B"].forEach(s=>S.units.filter(u=>u.side===s).forEach((u,k)=>{const p=spotFor(s,k);u.x=p[0];u.y=p[1]}))}
function addRoster(side){const ti=$(side==="A"?"tA":"tB").value;if(ti==="")return;
 S.units=S.units.filter(u=>u.side!==side);KTT.teams[ti].operatives.forEach((o,oi)=>addUnit(side,ti,oi));S[side==="A"?"ta":"tb"]=KTT.teams[ti].name;redeploy();cleanRefs();afterEdit()}
function cleanRefs(){const ids=new Set(S.units.map(u=>u.id));[...S.steps,S.draft].forEach(s=>{s.moves=s.moves.filter(m=>ids.has(m.u));s.fx=s.fx.filter(f=>ids.has(f.u)&&ids.has(f.t))})}
function snap(p){const m=M(),q=[Math.min(m.w-.01,Math.max(0,p[0])),Math.min(m.h-.01,Math.max(0,p[1]))];
 if(!$("snap").checked)return[Math.round(q[0]*10)/10,Math.round(q[1]*10)/10];return cellPos(m,cell(m,q))}
// ---------- drawing
function draw(){const m=M(),live=V===null,n=live?N():V,st=stateAt(n,live),prev=stateAt(live?N():Math.max(0,V-1),false);
 const step=live?S.draft:(V>0?S.steps[V-1]:null);
 svg.setAttribute("viewBox","-1.4 -1.4 "+(m.w+1.8)+" "+(m.h+1.8));
 let h='<defs><marker id="rba" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0L4 2L0 4z" fill="#a39e96"/></marker><marker id="rbr" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0L4 2L0 4z" fill="#e0301e"/></marker><marker id="rbo" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0L4 2L0 4z" fill="#ff6a13"/></marker></defs>';
 h+=mapInner(m,true,false,st.env);
 (S.props||[]).forEach(p=>h+=propSvg(p,selP===p.id&&tool==="prop",drag&&drag.prop===p.id&&drag.cur?drag.cur:null));
 if(step){const p={};for(const k in prev.pos)p[k]=prev.pos[k];
  step.moves.forEach(mv=>{const a=p[mv.u];if(a)h+=`<line class="rmv" x1="${a[0]}" y1="${a[1]}" x2="${mv.to[0]}" y2="${mv.to[1]}"/>`;p[mv.u]=mv.to});
  step.fx.forEach(f=>{const a=f.u?(f.a||st.pos[f.u]):null,b=f.b||st.pos[f.t];if(!b)return;
   if(a){const d=Math.hypot(b[0]-a[0],b[1]-a[1])||1,ux=(b[0]-a[0])/d,uy=(b[1]-a[1])/d;
   h+=`<line class="${f.k==="fight"?"rft":"rsh"}" x1="${a[0]+ux*.9}" y1="${a[1]+uy*.9}" x2="${b[0]-ux*.95}" y2="${b[1]-uy*.95}"/>`}
   if(f.dmg>0||f.kill)h+=`<text class="rdm" x="${b[0]+.9}" y="${b[1]-.9}">${f.kill?"✕ ":""}-${f.dmg||0}</text>`})}
 if(drag&&drag.cur&&drag.mv&&!drag.prop){const a=drag.from;h+=`<line class="rmv" x1="${a[0]}" y1="${a[1]}" x2="${drag.cur[0]}" y2="${drag.cur[1]}"/>`}
 // small tokens for expendables: drones, squigs, grots, familiars, hounds and other critters
 const SMALL=/DRONE(?!\s+CONTROLLER)|SQUIG|GROT\b|FAMILIAR|CANID|MASTIFF|BATTLEMUTT|CHERUB|DRAKOLITHE|PLASMACYTE|GLITCHLING|CURSEMITE|EYESTINGER|SLUDGE|GHEISTSKULL|C\.A\.T/i;
 // operatives sharing a spot are spread out and shrunk so every one stays visible and draggable
 const grp={},pl=[];S.units.forEach(u=>{let p=st.pos[u.id],dr=false;if(drag&&drag.id===u.id&&drag.cur){p=drag.cur;dr=true}if(!p)return;const it={u,p,dr,s:SMALL.test(u.base||u.name)?.62:1,o:[0,0]};pl.push(it);if(!dr){const k=Math.round(p[0]*2)+","+Math.round(p[1]*2);(grp[k]=grp[k]||[]).push(it)}});
 const B=Math.max(m.u||1,2.4);
 Object.values(grp).forEach(g=>{const n=g.length;if(n<2)return;const c=Math.ceil(Math.sqrt(n)),rw=Math.ceil(n/c),sp=Math.min(1.7,B/c),r=Math.min(.8,sp/2*.94);
  g.forEach((it,i)=>{const cx=i%c,cy=Math.floor(i/c),inRow=cy===rw-1?n-cy*c:c;it.s=r/.8*(SMALL.test(it.u.base||it.u.name)?.75:1);it.o=[(cx-(inRow-1)/2)*sp,(cy-(rw-1)/2)*sp];it.n=n})});
 pl.forEach(it=>{const u=it.u,p=it.p,dead=st.w[u.id]<=0,hurt=st.w[u.id]<u.max,many=it.s<1&&!SMALL.test(u.base||u.name)||it.n>1;
  h+=`<g class="ru ${u.side}${dead?" dead":""}${hurt&&!dead?" hurt":""}${sel===u.id?" sel":""}" data-id="${u.id}" transform="translate(${p[0]+it.o[0]},${p[1]+it.o[1]}) scale(${it.s})"><title>${esc(u.name)} ${st.w[u.id]}/${u.max}</title><circle r=".8"/><text y=".2">${esc(dead?"✕":u.code)}</text></g>`});
 svg.innerHTML=h;
 $("vPos").textContent=live?(S.edit!=null?(S.isNew?"Inserting step ":"Editing step ")+(S.edit+1):"Live ("+S.steps.length+" step"+(S.steps.length===1?"":"s")+")"):(V===0?"Deployment":"Step "+V+" / "+S.steps.length);
 $("draftBox").style.opacity=live?1:.45;
 $("rhint").textContent=RO?"":!live?"Viewing step "+V+". Press Live to edit.":tool==="env"?"Click a door to open or close it, click a wall section to breach it (click again to repair). Recorded in the current step.":tool==="prop"?(ptype?"Click the map to place a "+PROPS[ptype].n.toLowerCase()+". Drag one to move it, use Rotate or Delete for the selected one.":"Pick an equipment type, then click the map. Drag a placed one to move it."):tool==="move"?(started()?"Drag an operative to record a move.":"Drag the operatives to place them in their deployment zone. Several operatives can share a cell: they spread out automatically."):(sel?"Now click the target.":"Click the attacker, then the target.")}
function pt(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const r=p.matrixTransform(svg.getScreenCTM().inverse());return[r.x,r.y]}
svg.addEventListener("pointerdown",e=>{if(RO||V!==null)return;const g=e.target.closest(".ru");
 if(tool==="env"){const d=e.target.closest("[data-door]"),w=e.target.closest("[data-w]");if(!d&&!w)return;const d0=S.draft;d0.env=d0.env||[];
  const before=stateAt(N(),false).env,now=stateAt(N(),true).env;
  if(d){const i=+d.dataset.door;d0.env=d0.env.filter(x=>!(x.k==="door"&&x.i===i));const want=!now.open.has(i);if(want!==before.open.has(i))d0.env.push({k:"door",i,o:want})}
  else{const k=w.dataset.w;d0.env=d0.env.filter(x=>!(x.k==="wall"&&x.w===k));const want=!now.br.has(k);if(want!==before.br.has(k))d0.env.push({k:"wall",w:k,b:want})}
  afterEdit();return}
 if(tool==="prop"){const pg=e.target.closest(".rp");S.props=S.props||[];
  if(pg){const p=S.props.find(x=>x.id===pg.dataset.pid);if(p){selP=p.id;drag={prop:p.id,from:[p.x,p.y],cur:null,mv:false};svg.setPointerCapture(e.pointerId);e.preventDefault();draw();pbar()}return}
  if(ptype){const to=pSnap(pt(e)),p={id:"p"+Date.now().toString(36)+S.props.length,k:ptype,x:to[0],y:to[1],r:ptype==="ld"?0:0};S.props.push(p);selP=p.id;afterEdit();pbar();return}
  selP=null;draw();pbar();return}
 if(tool==="move"){if(!g)return;const id=g.dataset.id,st=stateAt(N(),true);drag={id,from:st.pos[id],cur:null,mv:false};svg.setPointerCapture(e.pointerId);e.preventDefault();return}
 if(!g){sel=null;draw();return}
 const id=g.dataset.id,st=stateAt(N(),true);
 if(!sel||sel===id){sel=sel===id?null:id;draw();return}
 S.draft.fx.push({k:tool,u:sel,t:id,dmg:0,kill:false,a:st.pos[sel],b:st.pos[id]});sel=null;afterEdit();
 setTimeout(()=>{const inp=document.querySelector("#fx input.dm[data-i='"+(S.draft.fx.length-1)+"']");if(inp){inp.focus();inp.select()}},60)});
svg.addEventListener("pointermove",e=>{if(!drag)return;drag.cur=pt(e);drag.mv=true;draw()});
svg.addEventListener("pointerup",()=>{if(!drag)return;const d=drag;drag=null;
 if(d.prop){const p=(S.props||[]).find(x=>x.id===d.prop);if(p&&d.mv&&d.cur){const to=pSnap(d.cur);p.x=to[0];p.y=to[1];afterEdit()}else draw();return}
if(!d.mv||!d.cur){draw();return}
 const to=snap(d.cur);if(d.from&&Math.hypot(to[0]-d.from[0],to[1]-d.from[1])<.3){draw();return}
 if(!started()&&!S.draft.moves.length&&!S.draft.fx.length){const u=unit(d.id);u.x=to[0];u.y=to[1]}else S.draft.moves.push({u:d.id,to});
 afterEdit()});
svg.addEventListener("pointercancel",()=>{drag=null;draw()});
$("rtools").addEventListener("click",e=>{const b=e.target.closest("button[data-tool]");if(!b)return;tool=b.dataset.tool;sel=null;document.querySelectorAll("#rtools button[data-tool]").forEach(x=>x.classList.toggle("on",x===b));svg.classList.toggle("ptool",tool==="prop");svg.classList.toggle("etool",tool==="env");pbar();draw()});
// ---------- equipment bar
function pbar(){const bar=$("ptools");if(!bar)return;bar.hidden=tool!=="prop";bar.querySelectorAll("[data-pt]").forEach(b=>b.classList.toggle("on",b.dataset.pt===ptype));const has=(S.props||[]).some(p=>p.id===selP);bar.querySelectorAll("[data-pa]").forEach(b=>b.disabled=b.dataset.pa==="clear"?!(S.props||[]).length:!has)}
if($("ptools"))$("ptools").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;S.props=S.props||[];
 if(b.dataset.pt){ptype=ptype===b.dataset.pt?null:b.dataset.pt;pbar();draw();return}
 const p=S.props.find(x=>x.id===selP);
 if(b.dataset.pa==="rot"&&p){p.r=((p.r||0)+45)%180;afterEdit()}
 else if(b.dataset.pa==="del"&&p){S.props=S.props.filter(x=>x!==p);selP=null;afterEdit()}
 else if(b.dataset.pa==="clear")twoStep(b,()=>{S.props=[];selP=null;afterEdit()});
 pbar()});
addEventListener("keydown",e=>{if(tool!=="prop"||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const p=(S.props||[]).find(x=>x.id===selP);if(!p)return;
 if(e.key==="r"||e.key==="R"){p.r=((p.r||0)+45)%180;afterEdit();pbar()}else if(e.key==="Delete"||e.key==="Backspace"){S.props=S.props.filter(x=>x!==p);selP=null;afterEdit();pbar();e.preventDefault()}});
// ---------- draft panel
const cellOf=p=>p?cell(M(),p):"?";
function envText(e){const m=M();
 if(e.k==="door"){const q=(m.dr||[])[e.i];if(!q)return"Door";const hz=q[2]==="h",a=hz?cell(m,[q[0],q[1]-.2]):cell(m,[q[0]-.2,q[1]]),b=hz?cell(m,[q[0],q[1]+.2]):cell(m,[q[0]+.2,q[1]]);return (e.o?"Opens":"Closes")+" the "+(q[3]==="n"?"door":"breachable door")+" between "+a+" and "+b}
 const p=e.w.split(":"),wl=(m.wl||[])[+p[0]],pc=wl?wallPieces(m,wl,+p[0]).find(x=>x.k===e.w):null;if(!pc)return e.b?"Breaches a wall":"Repairs a wall";
 const mx=(pc.a[0]+pc.b[0])/2,my=(pc.a[1]+pc.b[1])/2,a=pc.hz?cell(m,[mx,my-.2]):cell(m,[mx-.2,my]),b=pc.hz?cell(m,[mx,my+.2]):cell(m,[mx+.2,my]);return (e.b?"Breaches":"Repairs")+" the wall between "+a+" and "+b}
function movesText(step,prevSt){const p={};for(const k in prevSt.pos)p[k]=prevSt.pos[k];return step.moves.map(mv=>{const a=p[mv.u];p[mv.u]=mv.to;return{u:mv.u,t:nm(mv.u)+": "+cellOf(a)+" → "+cellOf(mv.to)}})}
function renderFx(){const d=S.draft,prev=stateAt(N(),false);let h="";
 movesText(d,prev).forEach((m,i)=>h+=`<div class="ev"><span>Move ${esc(m.t)}</span><button class="sm" data-rm="m${i}" type="button" aria-label="Remove move">×</button></div>`);
 (d.env||[]).forEach((e,i)=>h+=`<div class="ev"><span>${esc(envText(e))}</span><button class="sm" data-rm="e${i}" type="button" aria-label="Remove">×</button></div>`);
 d.fx.forEach((f,i)=>h+=`<div class="ev"><span>${f.u?esc(nm(f.u))+(f.k==="fight"?" fights ":" shoots ")+esc(nm(f.t)):esc(nm(f.t))+" takes damage"}</span><label class="inl" style="margin:0">Dmg <input class="dm" data-i="${i}" type="number" min="0" value="${f.dmg}" style="width:4.5rem;margin-left:.3rem"></label><label class="inl" style="margin:0"><input class="kl" data-i="${i}" type="checkbox"${f.kill?" checked":""}>Out</label><button class="sm" data-rm="f${i}" type="button" aria-label="Remove">×</button></div>`);
 if(!h)h='<p class="note" style="margin:.5rem 0">'+(started()?"Drag operatives or use Shoot / Fight on the map: they appear here.":"")+'</p>';
 $("fx").innerHTML=h}
$("fx").addEventListener("click",e=>{const b=e.target.closest("button[data-rm]");if(!b)return;const k=b.dataset.rm;if(k[0]==="m")S.draft.moves.splice(+k.slice(1),1);else if(k[0]==="e")S.draft.env.splice(+k.slice(1),1);else S.draft.fx.splice(+k.slice(1),1);afterEdit()});
$("fx").addEventListener("input",e=>{const i=+e.target.dataset.i;if(e.target.classList.contains("dm")){S.draft.fx[i].dmg=Math.max(0,+e.target.value||0);const st=stateAt(N(),true);if(st.w[S.draft.fx[i].t]<=0)S.draft.fx[i].kill=true}
 else if(e.target.classList.contains("kl"))S.draft.fx[i].kill=e.target.checked;persist();draw()});
["act","ana","tp"].forEach(id=>$(id).addEventListener("input",()=>{S.draft.action=$("act").value;S.draft.analysis=$("ana").value;S.draft.tp=Math.max(1,+$("tp").value||1);persist()}));
$("addStep").onclick=()=>{if(V!==null)return;const d=S.draft;if(!started()&&!d.action.trim())d.action="Deployment complete";
 if(S.edit!=null){const ns={tp:d.tp,action:d.action.trim(),analysis:d.analysis.trim(),moves:d.moves,fx:d.fx,env:d.env||[]};if(S.isNew)S.steps.splice(S.edit,0,ns);else S.steps[S.edit]=ns;S.isNew=false;S.draft=S.stash||blankDraft(d.tp);S.stash=null;S.edit=null;$("act").value=S.draft.action;$("ana").value=S.draft.analysis;afterEdit(true);return}
 S.steps.push({tp:d.tp,action:d.action.trim(),analysis:d.analysis.trim(),moves:d.moves,fx:d.fx,env:d.env||[]});S.draft=blankDraft(d.tp);$("act").value="";$("ana").value="";afterEdit(true);$("act").focus()};
function insertAfter(i){if(S.edit==null)S.stash=S.draft;S.edit=i+1;S.isNew=true;S.draft=blankDraft(S.steps[i].tp);V=null;stop();$("act").value="";$("ana").value="";afterEdit(true);$("draftBox").scrollIntoView({behavior:"smooth",block:"nearest"})}
function editStep(i){if(S.edit==null)S.stash=S.draft;S.isNew=false;const s=S.steps[i];S.edit=i;S.draft={tp:s.tp,action:s.action,analysis:s.analysis,moves:clone(s.moves||[]),fx:clone(s.fx||[]),env:clone(s.env||[]),rm:s.rm};V=null;stop();$("act").value=S.draft.action;$("ana").value=S.draft.analysis;afterEdit(true);$("draftBox").scrollIntoView({behavior:"smooth",block:"nearest"})}
function cancelEdit(){if(S.edit==null)return;S.isNew=false;S.draft=S.stash||blankDraft(1);S.stash=null;S.edit=null;$("act").value=S.draft.action;$("ana").value=S.draft.analysis;afterEdit(true)}
if($("cancelEdit"))$("cancelEdit").onclick=cancelEdit;
$("clrStep").onclick=()=>{S.draft=blankDraft(S.draft.tp);$("act").value="";$("ana").value="";afterEdit()};
// ---------- report list
function summary(i){const prev=stateAt(i,false),s=S.steps[i],parts=movesText(s,prev).map(m=>m.t).concat((s.env||[]).map(envText));
 s.fx.forEach(f=>parts.push((f.u?nm(f.u)+(f.k==="fight"?" fights ":" shoots ")+nm(f.t):nm(f.t)+" is hit")+(f.dmg?" ("+f.dmg+" dmg"+(f.kill?", incapacitated":"")+")":f.kill?" (incapacitated)":"")));return parts.concat((s.rm||[]).map(id=>nm(id)+" is removed")).join(" · ")}
function renderList(){let h="",tp=0;if(!S.steps.length){$("rlist").innerHTML=RO?"":'<p class="note">The report is empty. Validate the deployment to start it.</p>';return}
 S.steps.forEach((s,i)=>{if(s.tp!==tp){tp=s.tp;h+=`<h4>Turning point ${tp}</h4>`}
  const body=RO?`<div class="rb2"><div class="ra ro">${esc(s.action)}</div>${s.analysis?`<div class="rz ro">${esc(s.analysis)}</div>`:""}<small>${esc(summary(i))}</small></div>`
   :`<div class="rb2"><input class="ra" data-i="${i}" data-f="action" value="${esc(s.action)}" aria-label="Action"><input class="rz" data-i="${i}" data-f="analysis" value="${esc(s.analysis)}" placeholder="Analysis" aria-label="Analysis"><small>${esc(summary(i))}</small></div><button class="sm" data-edit="${i}" type="button" aria-label="Edit step">Edit</button><button class="sm" data-ins="${i}" type="button" title="Insert a step after this one" aria-label="Insert a step after this one">+ Insert</button><button class="sm" data-del="${i}" type="button" aria-label="Delete step">×</button>`;
  h+=`<div class="rs${V===i+1?" cur":""}${S.edit===i&&!S.isNew?" editing":""}"><button class="rn" data-view="${i+1}" type="button">${i+1}</button>${body}</div>`});
 $("rlist").innerHTML=h}
$("rlist").addEventListener("input",e=>{const t=e.target;if(t.dataset.f){S.steps[+t.dataset.i][t.dataset.f]=t.value;persist()}});
function twoStep(btn,fn){if(btn.dataset.arm){fn();return}const old=btn.textContent;btn.dataset.arm="1";btn.textContent="Sure?";btn.classList.add("danger");
 setTimeout(()=>{if(btn.isConnected){delete btn.dataset.arm;btn.textContent=old;btn.classList.remove("danger")}},2600)}
$("rlist").addEventListener("click",e=>{const v=e.target.closest("[data-view]"),d=e.target.closest("[data-del]"),ed=e.target.closest("[data-edit]"),ins=e.target.closest("[data-ins]");
 if(ed){editStep(+ed.dataset.edit);return}
 if(ins){insertAfter(+ins.dataset.ins);return}
 if(d&&S.edit!=null)return;
 if(v)go(+v.dataset.view);
 else if(d)twoStep(d,()=>{S.steps.splice(+d.dataset.del,1);V=null;afterEdit(true)})});
// ---------- navigation
function go(n){stop();if(RO){V=Math.max(0,Math.min(S.steps.length,n===null?S.steps.length:n))}else V=n===null||n>S.steps.length?null:Math.max(0,n);draw();renderList()}
$("vFirst").onclick=()=>go(0);$("vPrev").onclick=()=>go(V===null?S.steps.length:V-1);$("vNext").onclick=()=>go(V===null?null:V+1);$("vLive").onclick=()=>go(null);
function stop(){if(timer){clearInterval(timer);timer=null;$("vPlay").textContent="Play"}}
$("vPlay").onclick=()=>{if(timer){stop();return}if(!S.steps.length)return;V=0;draw();renderList();$("vPlay").textContent="Pause";timer=setInterval(()=>{if(V===null||V>=S.steps.length){stop();if(!RO)go(null);return}V++;draw();renderList()},1400)};
addEventListener("keydown",e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==="ArrowRight")$("vNext").click();if(e.key==="ArrowLeft")$("vPrev").click()});
// ---------- setup
opt($("mapSel"),KTT.maps.map(m=>[m.id,esc(m.name)]));
const tOpts=teamOpts();opt($("tA"),tOpts);opt($("tB"),tOpts);opt($("oSel"),[]);
function fillO(){const side=$("oSide").value,ti=$(side==="A"?"tA":"tB").value;opt($("oSel"),ti===""?[]:KTT.teams[ti].operatives.map((o,i)=>[i,esc(o.name)]))}
["oSide","tA","tB"].forEach(i=>$(i).addEventListener("change",fillO));
$("mapSel").onchange=()=>{S.map=$("mapSel").value;if(!started())redeploy();afterEdit()};
$("flip").onchange=()=>{S.flip=$("flip").checked;if(!started())redeploy();afterEdit()};
$("pa").oninput=()=>{S.pa=$("pa").value;persist();renderTray();head()};$("pb").oninput=()=>{S.pb=$("pb").value;persist();renderTray();head()};
$("rosA").onclick=()=>addRoster("A");$("rosB").onclick=()=>addRoster("B");
$("oAdd").onclick=()=>{const side=$("oSide").value,ti=$(side==="A"?"tA":"tB").value;if(ti===""||$("oSel").value==="")return;addUnit(side,+ti,+$("oSel").value);afterEdit()};
function renderTray(){const st=stateAt(N(),true),can=!RO&&!started();$("tray").innerHTML=["A","B"].map(s=>{const us=S.units.filter(u=>u.side===s);return us.length?`<div class="trayrow"><span class="tl ${s}">${esc((s==="A"?S.pa:S.pb)||"Side "+s)}</span>${us.map(u=>`<span class="chip ${s}${st.w[u.id]<=0?" dead":""}">${esc(u.name)} <small>${st.w[u.id]}/${u.max}</small>${can?` <button class="x" data-ru="${u.id}" type="button" aria-label="Remove ${esc(u.name)}">×</button>`:""}</span>`).join("")}</div>`:""}).join("")}
$("tray").addEventListener("click",e=>{const b=e.target.closest("[data-ru]");if(!b)return;S.units=S.units.filter(u=>u.id!==b.dataset.ru);cleanRefs();afterEdit()});
// ---------- texts: title, intro, conclusion
$("rtitle").oninput=()=>{S.title=$("rtitle").value;persist()};
$("intro").oninput=()=>{S.intro=$("intro").value;persist()};$("concl").oninput=()=>{S.conclusion=$("concl").value;persist()};
const paras=t=>String(t||"").split(/\n+/).filter(x=>x.trim()).map(x=>"<p>"+esc(x)+"</p>").join("");
// ---------- score tracker (Kill, Tac Op and Crit Op per turning point, then the end bonuses)
const SC=[["c","Crit"],["t","Tac"],["k","Kill"]];
const scVal=(side,tp,f)=>{const x=((S.score&&S.score.t&&S.score.t[tp])||{})[side];return x&&x[f]!=null&&x[f]!==""?+x[f]||0:0};
const scEnd=(side,f)=>{const x=((S.score&&S.score.e)||{})[side];return x&&x[f]!=null&&x[f]!==""?+x[f]||0:0};
function scTotals(){const tps=Math.max(4,...S.steps.map(s=>s.tp||1)),o={};["A","B"].forEach(sd=>{let n=0;for(let t=1;t<=tps;t++)SC.forEach(c=>n+=scVal(sd,t,c[0]));o[sd]={play:n,end:scEnd(sd,"p")+scEnd(sd,"k")};o[sd].all=o[sd].play+o[sd].end});return o}
function scBar(){const T=scTotals(),nA=S.pa||"Player A",nB=S.pb||"Player B";const bar=$("scoreBar");if(!bar)return;
 const any=T.A.all||T.B.all||T.A.end||T.B.end;bar.hidden=RO&&!any;bar.innerHTML=`<span class="sA">${esc(nA)}</span><b class="sA">${T.A.all}</b><i>VP</i><b class="sB">${T.B.all}</b><span class="sB">${esc(nB)}</span>`;
 document.querySelectorAll("[data-tot]").forEach(e=>{const[sd,k]=e.dataset.tot.split(":");e.textContent=T[sd][k]})}
function renderScore(){const box=$("scoreBox");if(!box)return;const T=scTotals(),tps=Math.max(4,...S.steps.map(s=>s.tp||1)),nA=S.pa||"Player A",nB=S.pb||"Player B";
 const inp=(kind,tp,sd,f,v)=>RO?`<td>${v||0}</td>`:`<td><input class="sci" type="number" min="0" inputmode="numeric" data-k="${kind}" data-tp="${tp}" data-sd="${sd}" data-f="${f}" value="${v?v:""}" placeholder="0" aria-label="${sd==="A"?"A":"B"} ${f}"></td>`;
 let h=`<div class="scw"><table class="sct"><thead><tr><th rowspan="2">Turning point</th><th colspan="3" class="sA">${esc(nA)}</th><th colspan="3" class="sB">${esc(nB)}</th></tr><tr>${["A","B"].map(()=>SC.map(c=>`<th>${c[1]}</th>`).join("")).join("")}</tr></thead><tbody>`;
 for(let t=1;t<=tps;t++)h+=`<tr><th>TP${t}</th>${["A","B"].map(sd=>SC.map(c=>inp("t",t,sd,c[0],scVal(sd,t,c[0]))).join("")).join("")}</tr>`;
 h+=`<tr class="sce"><th>End bonus</th>${["A","B"].map(sd=>`<td colspan="3"><label>Primary ${RO?`<b>${scEnd(sd,"p")}</b>`:`<input class="sci" type="number" min="0" inputmode="numeric" data-k="e" data-sd="${sd}" data-f="p" value="${scEnd(sd,"p")||""}" placeholder="0" aria-label="${sd} primary bonus">`}</label> <label>Kill ${RO?`<b>${scEnd(sd,"k")}</b>`:`<input class="sci" type="number" min="0" inputmode="numeric" data-k="e" data-sd="${sd}" data-f="k" value="${scEnd(sd,"k")||""}" placeholder="0" aria-label="${sd} kill bonus">`}</label></td>`).join("")}</tr>`;
 h+=`<tr class="sct2"><th>Total</th><td colspan="3" class="sA"><b data-tot="A:all">${T.A.all}</b></td><td colspan="3" class="sB"><b data-tot="B:all">${T.B.all}</b></td></tr></tbody></table></div>`;
 const any=T.A.all||T.B.all;box.hidden=RO&&!any;$("scoreBody").innerHTML=h;scBar()}
$("scoreBody")&&$("scoreBody").addEventListener("input",e=>{const t=e.target;if(!t.classList.contains("sci"))return;S.score=S.score||{t:{},e:{}};S.score.t=S.score.t||{};S.score.e=S.score.e||{};
 const v=Math.max(0,Math.floor(+t.value||0));if(t.dataset.k==="t"){const o=S.score.t[t.dataset.tp]=S.score.t[t.dataset.tp]||{};(o[t.dataset.sd]=o[t.dataset.sd]||{})[t.dataset.f]=v}else{(S.score.e[t.dataset.sd]=S.score.e[t.dataset.sd]||{})[t.dataset.f]=v}persist();scBar()});
function head(){const m=M();renderScore();$("rsub").textContent=[S.pa&&(S.pa+(S.ta?" ("+S.ta+")":"")),S.pb&&(S.pb+(S.tb?" ("+S.tb+")":""))].filter(Boolean).join(" vs ")+(S.pa||S.pb?" - ":"")+m.name}
// ---------- export
function asText(){let t=titleOf(S)+"\n"+$("rsub").textContent+"\n";{const T=scTotals();if(T.A.all||T.B.all){t+="Score: "+(S.pa||"Player A")+" "+T.A.all+" - "+T.B.all+" "+(S.pb||"Player B")+" (end bonus: "+T.A.end+" / "+T.B.end+")\n"}}if(S.intro)t+="\n"+S.intro+"\n";let tp=0;
 S.steps.forEach((s,i)=>{if(s.tp!==tp){tp=s.tp;t+="\nTurning point "+tp+"\n"}t+=(i+1)+". "+s.action+(s.analysis?"\n   Analysis: "+s.analysis:"")+(summary(i)?"\n   ["+summary(i)+"]":"")+"\n"});
 if(S.conclusion)t+="\nConclusion\n"+S.conclusion+"\n";return t}
function copyOut(text,btn,label){const o=$("out");o.hidden=false;o.value=text;o.focus();o.select();let ok=false;try{ok=document.execCommand("copy")}catch(e){}
 const done=m=>{btn.textContent=m;setTimeout(()=>btn.textContent=label,2200)};
 if(ok)done("Copied");else done("Select all + copy below");
 try{o.scrollIntoView({block:"nearest"});navigator.clipboard&&navigator.clipboard.writeText(text).then(()=>done("Copied"),()=>{})}catch(e){}}
$("shareBtn").onclick=async()=>{const o=clone(S);o.draft=blankDraft(1);o.edit=null;o.isNew=false;delete o.stash;const btn=$("shareBtn");
 try{const z=b64u(await pipe(new TextEncoder().encode(JSON.stringify(o)),CompressionStream));copyOut(location.origin+location.pathname+"#z="+z,btn,"Copy share link")}catch(e){btn.textContent="Not supported by this browser"}};
$("copy").onclick=()=>copyOut(asText(),$("copy"),"Copy report as text");
$("featBtn").onclick=()=>{const o=clone(S);o.draft=blankDraft(1);o.edit=null;o.isNew=false;delete o.stash;o.feat=true;copyOut(JSON.stringify(o)+",",$("featBtn"),"Copy for front page")};
const outRep=feat=>{const o=clone(S);o.draft=blankDraft(1);o.edit=null;o.isNew=false;delete o.stash;if(feat)o.feat=true;else delete o.feat;return o};
$("goBtn").onclick=()=>KTT.pub.go($("goBtn"),"data/reports.js","reports",outRep(false));$("goFeat").onclick=()=>KTT.pub.go($("goFeat"),"data/reports.js","reports",outRep(true));$("goSet").onclick=()=>KTT.pub.panel();
$("pubBtn").onclick=()=>{const o=clone(S);o.draft=blankDraft(1);o.edit=null;o.isNew=false;delete o.stash;copyOut(JSON.stringify(o)+",",$("pubBtn"),"Copy for publication")};
$("save").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(S)],{type:"application/json"}));a.download="ktt-battle-report.json";a.click()};
$("load").onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const j=JSON.parse(t);if(!j.units||!j.steps||!mapOf(j.map))throw 0;j.id=S.id;S=j;V=null;afterEdit(true)}catch(x){alert("This file is not a KTT battle report.")}})};
$("delRep").onclick=()=>twoStep($("delRep"),()=>{store.del(KEY(S.id));store.set(IDX,JSON.stringify(readIdx().filter(x=>x.id!==S.id)));location.href="analysis.html"});
// ---------- refresh
function modeUI(){const setupOn=!RO&&!started();
 document.querySelectorAll(".edonly").forEach(el=>{if(RO)el.hidden=true});
 if(RO){$("rtitleRO").hidden=false;$("rtitleRO").textContent=titleOf(S);$("introRO").hidden=!S.intro;$("introRO").innerHTML=paras(S.intro);$("conclRO").hidden=!S.conclusion;$("conclRO").innerHTML=paras(S.conclusion);$("vLive").hidden=true;$("introBox").hidden=!S.intro;$("conclBox").hidden=!S.conclusion;$("draftBox").hidden=true;$("setup").hidden=true;return}
 $("setup").hidden=!setupOn;const ed=S.edit!=null;$("draftH").textContent=ed?(S.isNew?"Inserting step ":"Editing step ")+(S.edit+1):started()?"Next step":"2. Deployment";$("addStep").textContent=ed?(S.isNew?"Insert step":"Save changes"):started()?"Add to report":"Add deployment to report";if($("cancelEdit"))$("cancelEdit").hidden=!ed;$("draftBox").classList.toggle("editing",ed);
 $("act").placeholder=started()?"The captain advances, shoots and dashes":"Deployment complete";$("ana").placeholder=started()?"He pressures the enemy in the centre":"Why this deployment?"}
function afterEdit(full){persist();try{pbar()}catch(e){}if(full){$("mapSel").value=S.map;$("flip").checked=!!S.flip;$("pa").value=S.pa||"";$("pb").value=S.pb||"";$("rtitle").value=S.title||"";$("intro").value=S.intro||"";$("concl").value=S.conclusion||"";$("act").value=S.draft.action;$("ana").value=S.draft.analysis}
 $("tp").value=S.draft.tp;modeUI();head();draw();renderFx();renderList();renderTray();$("saved").textContent=RO?"":"Saved in this browser"}
fillO();afterEdit(true);
document.title=titleOf(S)+" | KTT";
})();
