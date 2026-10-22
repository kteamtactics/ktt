// Shared dice maths (Kill Team Lite rules). Used by the calculator; keep rule logic here.
(function(){
let rnd=Math.random;const d6=()=>1+Math.floor(rnd()*6);
function seeded(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function withSeed(seed,fn){const old=rnd;rnd=seeded(seed);try{return fn()}finally{rnd=old}}
// Roll attack successes. w = {atk,hit,acc,lethal,bal,cea,rend,pun,sev}. Returns {c,n,f} (critical, normal, fail)
function attack(w){
 const rolled=Math.max(0,w.atk-(w.acc||0));let a=[];for(let i=0;i<rolled;i++)a.push(d6());
 const fail=x=>x<w.hit&&x!==6;
 if(w.cea){const cnt={};a.forEach(x=>{if(fail(x))cnt[x]=(cnt[x]||0)+1});let best=0,bc=0;for(const k in cnt)if(cnt[k]>bc){bc=cnt[k];best=+k}if(bc)a=a.map(x=>x===best?d6():x)}
 if(w.bal){const i=a.findIndex(fail);if(i>=0)a[i]=d6()}
 let c=0,n=(w.acc||0),f=0;
 a.forEach(x=>{if(x===6||(w.lethal&&x>=w.lethal&&x>=w.hit))c++;else if(x>=w.hit&&x!==1)n++;else f++});
 if(c>0){if(w.rend&&n>0){n--;c++}if(w.pun&&f>0){f--;n++}}else if(w.sev&&n>0){n--;c++}
 return{c,n,f}}
// Defender's best allocation of saves against hits. Returns the damage still inflicted.
function block(hc,hn,sc,sn,dN,dC,brutal){
 if(brutal)sn=0;let best=Infinity;
 for(let a=0;a<=Math.min(sc,hc);a++){const b=Math.min(sc-a,hn),hc2=hc-a,hn2=hn-b;
  for(let p=0;p<=Math.min(Math.floor(sn/2),hc2);p++){const left=Math.max(0,hn2-(sn-2*p)),dmg=(hc2-p)*dC+left*dN;if(dmg<best)best=dmg}}
 return best}
function defend(ar,d){ // d = {save,dice,cover,sat,pierce,pcrit,brutal}
 let dice=Math.max(0,d.dice-(d.pierce||0)-(ar.c>0?(d.pcrit||0):0)),sc=0,sn=0;
 if(d.cover&&!d.sat&&dice>0){sn++;dice--}
 for(let i=0;i<dice;i++){const x=d6();if(x===6)sc++;else if(x>=d.save&&x!==1)sn++}
 return{sc,sn}}
// One shooting sequence -> damage
function shoot(w,t){const ar=attack(w),s=defend(ar,t);let dmg=block(ar.c,ar.n,s.sc,s.sn,w.dmg,w.crit,t.brutal||w.brutal)+(w.dev||0)*ar.c;return dmg}
// Fight sequence between two weapons. Returns damage to each side and survivors.
function duel(A,B,wa,wb,firstA){
 const ra=attack(A),rb=attack(B);const mine=[],theirs=[];
 const mk=(r,w)=>{const L=[];for(let i=0;i<r.c;i++)L.push({crit:1,dmg:w.crit});for(let i=0;i<r.n;i++)L.push({crit:0,dmg:w.dmg});return L.sort((x,y)=>y.dmg-x.dmg)};
 let la=mk(ra,A),lb=mk(rb,B),wA=wa,wB=wb,turnA=firstA!==false;
 const canBlock=(d,t,opp)=>opp.brutal?d.crit:(d.crit||!t.crit);
 while(wA>0&&wB>0&&(la.length||lb.length)){
  const my=turnA?la:lb,op=turnA?lb:la,myW=turnA?wA:wB,opW=turnA?wB:wA,opRule=turnA?B:A;
  if(!my.length){turnA=!turnA;if(!la.length&&!lb.length)break;if(!(turnA?la:lb).length){/* opponent also done */}continue}
  // choose best option: strike (gain = damage, capped) or block (gain = blocked die damage, capped by own wounds)
  let bestG=-1,bestI=-1,bestAct=null,bestT=-1;
  my.forEach((d,i)=>{const sg=Math.min(d.dmg,opW)+(d.dmg>=opW?100:0);if(sg>bestG||(sg===bestG&&bestAct==="block")){bestG=sg;bestI=i;bestAct="strike";bestT=-1}
   op.forEach((t,j)=>{if(opRule.brutal&&!d.crit)return;if(!(d.crit||!t.crit))return;const bg=Math.min(t.dmg,myW)+(t.dmg>=myW?90:0)-0.01*d.dmg;if(bg>bestG){bestG=bg;bestI=i;bestAct="block";bestT=j}})});
  const used=my.splice(bestI,1)[0];
  if(bestAct==="strike"){if(turnA)wB-=used.dmg;else wA-=used.dmg}else op.splice(bestT,1);
  // if opponent has nothing left to resolve, the active player keeps resolving
  if(op.length)turnA=!turnA;
 }
 return{dA:wa-Math.max(0,wA),dB:wb-Math.max(0,wB),aDead:wA<=0,bDead:wB<=0}}
const MEL=/(fist|blade|claw|sword|axe|maul|knife|knux|dagger|chain|power |bayonet|butt|talon|hammer|mace|club|ram\b|staff|stave|flail|fang|teeth|scythe|spear|lance|whip|cleaver|cutter|shiv|crowbar|gauntlet|weapon|scalpel|sabre|rapier|knuckle|tail|tentacle|bite|horn|choppa|boot|goad|baton|mattock|halberd|glaive|cudgel|pick|hook|lash|cestus|tendril|pincer|stinger|sting\b|mandible|pole|sledge|brand|cane|rod\b|smash|bash|crush|pike|saw)/i;
const isMelee=w=>MEL.test(w.n.replace(/\(.*/,""));
const mm=(n,r)=>(n.match(r)||[])[1];
function parse(n){return{acc:+mm(n,/Acc(?:urate)?\s*(\d)/)||0,leth:+mm(n,/Lethal\s*(\d)\+/)||0,prc:+mm(n,/(?:Prc|Piercing)\s*(\d)(?!\s*Crit)/)||0,pcr:+mm(n,/(?:PrcCrit|Piercing Crits)\s*(\d)/)||+mm(n,/Prc\s*Crit\s*(\d)/)||0,dev:+mm(n,/(?:Dev|Devastating)\s*(\d)/)||0,
 bal:/Bal/.test(n),cea:/Ceaseless/.test(n),bru:/Brutal/.test(n),rnd:/\bRnd\b|Rending/.test(n),pun:/Punishing|\bPun\b/.test(n),sev:/Sev(ere)?\b/.test(n),sat:/\bSat\b|Saturate/.test(n)}}

window.KTTDice={d6,attack,block,defend,shoot,duel,withSeed,isMelee,parse};
})();
