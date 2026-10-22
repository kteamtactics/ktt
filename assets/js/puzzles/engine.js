// BATTLEFIELD STATE + PROBABILITY ENGINE (no DOM). Wounds are probability distributions.
PZ.make=function(def){
 const st={w:def.w,h:def.h,walls:new Set(def.walls.map(p=>p[0]+","+p[1])),units:{},obj:def.objectives.map((o,i)=>({id:i,x:o[0],y:o[1],secured:false})),active:null,left:def.activations,vp:0,over:false,log:[],breakdown:[]};
 def.units.forEach(u=>{const d=u.data,dist=new Array(d.max+1).fill(0);dist[Math.max(1,Math.min(d.max,u.wounds||d.max))]=1;
  st.units[u.id]={id:u.id,side:u.side,label:u.label||d.name,team:d.team,op:d.name,x:u.x,y:u.y,max:d.max,dist,apl:d.apl,move:d.move,save:d.save,ranged:d.ranged,melee:d.melee,activated:false,ap:0,f:{}}});
 return st};
PZ.clone=s=>({w:s.w,h:s.h,walls:s.walls,units:Object.fromEntries(Object.entries(s.units).map(([k,u])=>[k,Object.assign({},u,{dist:u.dist.slice(),f:Object.assign({},u.f)})])),obj:s.obj.map(o=>Object.assign({},o)),active:s.active,left:s.left,vp:s.vp,over:s.over,log:s.log.slice(),breakdown:s.breakdown.slice()});
PZ.key=s=>s.active+"|"+s.left+"|"+s.over+"|"+Object.values(s.units).map(u=>u.x+","+u.y+","+u.ap+","+Object.keys(u.f).join("")+","+(u.activated?1:0)+","+u.dist.map(p=>Math.round(p*15)).join(".")).join(";")+"|"+s.obj.map(o=>o.secured?1:0).join("");
PZ.pDead=u=>u.dist[0];
PZ.present=u=>u.dist[0]<0.5;
PZ.expW=u=>u.dist.reduce((a,p,i)=>a+p*i,0);
const key=(x,y)=>x+","+y;
PZ.units=(s,side)=>Object.values(s.units).filter(u=>PZ.present(u)&&(!side||u.side===side));
const occ=(s,x,y)=>PZ.units(s).some(u=>u.x===x&&u.y===y);
PZ.los=function(s,a,b){let x0=a.x,y0=a.y;const x1=b.x,y1=b.y,dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx-dy;
 while(!(x0===x1&&y0===y1)){const e2=2*e;if(e2>-dy){e-=dy;x0+=sx}if(e2<dx){e+=dx;y0+=sy}if(!(x0===x1&&y0===y1)&&s.walls.has(key(x0,y0)))return false}return true};
PZ.crSet=(s,side)=>{const r=new Set(),R=PZ.C.reach;PZ.units(s).forEach(e=>{if(e.side===side)return;for(let dx=-R;dx<=R;dx++)for(let dy=-R;dy<=R;dy++){const x=e.x+dx,y=e.y+dy;if(x<0||y<0||x>=s.w||y>=s.h)continue;if(PZ.los(s,e,{x,y}))r.add(key(x,y))}});return r};
PZ.inCR=(s,u)=>PZ.crSet(s,u.side).has(key(u.x,u.y));
PZ.reach=function(s,u,max,ignoreCR){const cr=ignoreCR?new Set():PZ.crSet(s,u.side),seen=new Map([[key(u.x,u.y),0]]),q=[[u.x,u.y]],out=[];
 while(q.length){const[x,y]=q.shift(),d=seen.get(key(x,y));if(d>=max)continue;
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(nx<0||ny<0||nx>=s.w||ny>=s.h||seen.has(k)||s.walls.has(k)||occ(s,nx,ny)||cr.has(k))continue;seen.set(k,d+1);q.push([nx,ny]);out.push([nx,ny,d+1])}}
 return out};
PZ.path=function(s,u,tx,ty){const prev=new Map(),q=[[u.x,u.y]];prev.set(key(u.x,u.y),null);
 while(q.length){const[x,y]=q.shift();if(x===tx&&y===ty)break;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(nx<0||ny<0||nx>=s.w||ny>=s.h||prev.has(k)||s.walls.has(k)||occ(s,nx,ny))continue;prev.set(k,[x,y]);q.push([nx,ny])}}
 const p=[];let c=[tx,ty];while(c){p.unshift(c);c=prev.get(key(c[0],c[1]))}return p};
// ---- probability tables (cached, fixed seed => same numbers every time)
const cache=new Map();
function pmf(arr,n){const o=new Array(n+1).fill(0);arr.forEach(x=>{o[Math.min(n,x)]++});return o.map(v=>v/arr.length)}
PZ.shotPmf=function(w,save){const k="s|"+w.full+"|"+save;if(cache.has(k))return cache.get(k);
 const N=PZ.C.samples,a=KTTDice.withSeed(7,()=>{const r=[];const W={atk:w.atk,hit:w.hit,acc:w.acc,lethal:w.lethal,bal:w.bal,cea:w.cea,rend:w.rend,pun:w.pun,sev:w.sev,dmg:w.dmg,crit:w.crit,dev:w.dev,brutal:w.brutal},t={save,dice:3,pierce:w.pierce,pcrit:w.pcrit};for(let i=0;i<N;i++)r.push(KTTDice.shoot(W,t));return r});
 const mx=Math.max(...a),p=pmf(a,mx);cache.set(k,p);return p};
PZ.duelPmf=function(A,B,wa,wb){const k="d|"+A.full+"|"+B.full+"|"+wa+"|"+wb;if(cache.has(k))return cache.get(k);
 const N=8000,rs=KTTDice.withSeed(11,()=>{const r=[];const mk=w=>({atk:w.atk,hit:w.hit,dmg:w.dmg,crit:w.crit,lethal:w.lethal,bal:w.bal,cea:w.cea,brutal:w.brutal,rend:w.rend,sev:w.sev});for(let i=0;i<N;i++)r.push(KTTDice.duel(mk(A),mk(B),wa,wb,true));return r});
 const toB=pmf(rs.map(r=>r.dB),wb),toA=pmf(rs.map(r=>r.dA),wa),o={toB,toA};cache.set(k,o);return o};
PZ.applyDmg=(dist,p)=>{const o=new Array(dist.length).fill(0);dist.forEach((pw,w)=>{if(!pw)return;p.forEach((pd,d)=>{if(!pd)return;o[Math.max(0,w-d)]+=pw*pd})});return o};
// best usable ranged weapon vs a target
PZ.canUse=(u,w)=>{if(!w.heavy)return true;const f=u.f;if(!f.m&&!f.d)return true;return !!w.heavy.allow&&((f.m&&!f.d&&w.heavy.allow==="reposition")||(f.d&&!f.m&&w.heavy.allow==="dash"))};
PZ.bestShot=(s,u,t)=>{let best=null;const dist2=Math.hypot(t.x-u.x,t.y-u.y);u.ranged.forEach(w=>{if(w.rngv!=null&&dist2>w.rngv)return;if(!PZ.canUse(u,w))return;const p=PZ.shotPmf(w,t.save),e=p.reduce((a,x,i)=>a+x*i,0);if(!best||e>best.e)best={w,p,e}});return best};
PZ.bestMelee=(w2)=>w2.slice().sort((a,b)=>PZ.ev(b,4)-PZ.ev(a,4))[0];
const adj=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))<=PZ.C.reach;
// solver only: keep one destination per "useful signature" so the search stays fast
const dfs=new WeakMap();
PZ.dfield=function(s){if(dfs.has(s.walls)&&dfs.get(s.walls).k===s.obj.length+"|"+Object.keys(s.units).map(k=>s.units[k].side==="E"?s.units[k].x+","+s.units[k].y:"").join(""))return dfs.get(s.walls).f;
 const f=new Map(),q=[];const tg=s.obj.map(o=>[o.x,o.y]).concat(Object.values(s.units).filter(u=>u.side==="E").map(u=>[u.x,u.y]));
 tg.forEach(t=>{f.set(key(t[0],t[1]),0);q.push(t)});
 while(q.length){const[x,y]=q.shift(),d=f.get(key(x,y));for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(!dx&&!dy||nx<0||ny<0||nx>=s.w||ny>=s.h||f.has(k)||s.walls.has(k))continue;f.set(k,d+1);q.push([nx,ny])}}
 dfs.set(s.walls,{k:s.obj.length+"|"+Object.keys(s.units).map(k=>s.units[k].side==="E"?s.units[k].x+","+s.units[k].y:"").join(""),f});return f};
PZ.prune=function(s,u,cells){const f=PZ.dfield(s),en=PZ.units(s,"E"),best=new Map();
 const all=cells.concat([[u.x,u.y,0]]);
 all.forEach(c=>{const p={x:c[0],y:c[1]};let sig=en.map(e=>PZ.los(s,p,e)?(Math.hypot(e.x-p.x,e.y-p.y)<=6?2:1):0).join("")+"|"+s.obj.map(o=>adj(p,o)?1:0).join("")+"|"+en.map(e=>adj(p,e)?1:0).join("")+"|"+(f.get(key(p.x,p.y))||0);
  if(!best.has(sig)||c[2]<best.get(sig)[2])best.set(sig,c)});
 return[...best.values()].filter(c=>!(c[0]===u.x&&c[1]===u.y))};
PZ.legal=function(s,solver){
 if(s.over)return[];
 if(!s.active){const r=PZ.units(s,"F").filter(u=>!u.activated);return s.left>0?r.map(u=>({t:"activate",u:u.id})):[]}
 const u=s.units[s.active],a=[],f=u.f,cr=PZ.inCR(s,u),can=u.ap>=PZ.C.cost;
 if(can){
  const heavyShot=f.hs&&!f.hsAllow;
  if(!cr&&!f.c&&!heavyShot){
   const cm=!f.m,cd=!f.d;
   if(cm||cd){let cells=PZ.reach(s,u,Math.max(cm?u.move:0,cd?PZ.C.dash:0));if(solver)cells=PZ.prune(s,u,cells);
    cells.forEach(d=>{if(cm&&d[2]<=u.move)a.push({t:"move",u:u.id,x:d[0],y:d[1]});if(cd&&d[2]<=PZ.C.dash&&!(solver&&cm&&d[2]<=u.move))a.push({t:"dash",u:u.id,x:d[0],y:d[1]})})}}
  if(!cr&&!f.c&&!f.m&&!f.d&&!f.hs){const en=PZ.crSet(s,u.side);PZ.reach(s,u,u.move+PZ.C.chargeBonus,true).forEach(d=>{if(en.has(key(d[0],d[1])))a.push({t:"charge",u:u.id,x:d[0],y:d[1]})})}
  if(!cr&&!f.s)PZ.units(s,"E").forEach(t=>{if(PZ.los(s,u,t)&&PZ.bestShot(s,u,t))a.push({t:"shoot",u:u.id,tgt:t.id})});
  if(!f.f&&u.melee.length)PZ.units(s,"E").forEach(t=>{if(adj(u,t)&&PZ.los(s,u,t))a.push({t:"fight",u:u.id,tgt:t.id})});
  if(!f.x)s.obj.forEach(o=>{if(!o.secured&&adj(u,o))a.push({t:"secure",u:u.id,o:o.id})})}
 a.push({t:"end",u:u.id});return a};
PZ.cell=(x,y)=>String.fromCharCode(65+x)+(y+1);
const r1=x=>(Math.round(x*100)/100);
PZ.describe=(s,a)=>{const u=s.units[a.u]||{};return({activate:()=>`Activate ${u.label}`,move:()=>`${u.label} moves to ${PZ.cell(a.x,a.y)}`,dash:()=>`${u.label} dashes to ${PZ.cell(a.x,a.y)}`,charge:()=>`${u.label} charges to ${PZ.cell(a.x,a.y)}`,shoot:()=>`${u.label} shoots ${s.units[a.tgt].label}`,fight:()=>`${u.label} fights ${s.units[a.tgt].label}`,secure:()=>`${u.label} secures marker ${a.o+1}`,end:()=>`${u.label} ends activation`})[a.t]()};
PZ.apply=function(s0,a){
 const s=PZ.clone(s0),u=s.units[a.u],text=PZ.describe(s0,a);let note="",gain=0;
 if(a.t==="activate"){s.active=u.id;u.ap=u.apl;u.activated=true;u.f={}}
 else if(a.t==="move"||a.t==="dash"||a.t==="charge"){u.x=a.x;u.y=a.y;u.ap-=PZ.C.cost;u.f[a.t==="move"?"m":a.t==="dash"?"d":"c"]=1}
 else if(a.t==="shoot"){const t=s.units[a.tgt],b=PZ.bestShot(s0,s0.units[a.u],s0.units[a.tgt]),before=t.dist[0];u.ap-=PZ.C.cost;u.f.s=1;
  if(b.w.heavy){u.f.hs=1;if(b.w.heavy.allow)u.f.hsAllow=1}
  t.dist=PZ.applyDmg(t.dist,b.p);const dk=t.dist[0]-before;if(t.side==="E"){gain=dk*PZ.C.killVP;s.vp+=gain}
  note=`${b.w.name}: ${Math.round(t.dist[0]*100)}% incapacitated`;if(gain>0.005)s.breakdown.push([`${t.label} incapacitated (${Math.round(t.dist[0]*100)}%)`,gain])}
 else if(a.t==="fight"){const t=s.units[a.tgt],A=PZ.bestMelee(u.melee),B=t.melee.length?PZ.bestMelee(t.melee):null,wa=Math.max(1,Math.round(PZ.expW(u))),wb=Math.max(1,Math.round(PZ.expW(t)));u.ap-=PZ.C.cost;u.f.f=1;
  const before=t.dist[0];
  if(B){const r=PZ.duelPmf(A,B,wa,wb);t.dist=PZ.applyDmg(t.dist,r.toB);u.dist=PZ.applyDmg(u.dist,r.toA)}else{const r=PZ.duelPmf(A,{full:"none",atk:0,hit:6,dmg:0,crit:0},wa,wb);t.dist=PZ.applyDmg(t.dist,r.toB)}
  const dk=t.dist[0]-before;if(t.side==="E"){gain=dk*PZ.C.killVP;s.vp+=gain}
  note=`${A.name}: ${Math.round(t.dist[0]*100)}% target incapacitated${B?", "+Math.round(u.dist[0]*100)+"% you are":""}`;if(gain>0.005)s.breakdown.push([`${t.label} incapacitated (${Math.round(t.dist[0]*100)}%)`,gain])}
 else if(a.t==="secure"){u.ap-=PZ.C.cost;u.f.x=1;s.obj[a.o].secured=true;gain=PZ.C.secureVP*(1-u.dist[0]);s.vp+=gain;s.breakdown.push([`Marker ${a.o+1} secured`,gain]);note=`+${r1(gain)} VP`}
 else if(a.t==="end"){u.ap=0}
 if(s.active&&(u.ap<=0||a.t==="end"))s.active=null;
 if(!s.active&&(s.left<=0||!PZ.units(s,"F").some(x=>!x.activated)))PZ.finish(s);
 s.log.push({a,text,note,gain});return s};
PZ.finish=function(s){
 s.obj.forEach(o=>{const near=side=>Object.values(s.units).filter(x=>x.side===side&&adj(x,o));
  const pf=1-near("F").reduce((p,x)=>p*PZ.pDead(x),1),pe=near("E").reduce((p,x)=>p*PZ.pDead(x),1),p=pf*pe;
  if(p>0.001){s.vp+=PZ.C.holdVP*p;s.breakdown.push([`Marker ${o.id+1} held at the end (${Math.round(p*100)}%)`,PZ.C.holdVP*p])}});
 s.over=true};
