(function(){
const T=()=>KTT.teams,D=KTTDice;
const isMelee=KTTDice.isMelee,parse=KTTDice.parse;
// ---- shooting
opt($("aT"),teamOpts());opt($("dT"),teamOpts());
const ops=(sel,t)=>opt(sel,T()[t].operatives.map((o,i)=>[i,esc(o.name)]));
function fillAO(){ops($("aO"),$("aT").value);fillAW()}
function fillAW(){const o=T()[$("aT").value].operatives[$("aO").value];const rng=o.weapons.map((w,i)=>[i,esc(w.n),isMelee(w)?"Melee":"Ranged"]).sort((a,b)=>a[2]<b[2]?1:-1);opt($("aW"),rng);if(o.weapons.length)$("aW").value=rng[0][0];fillW()}
function fillW(){const w=T()[$("aT").value].operatives[$("aO").value].weapons[$("aW").value];if(!w){["atk","hit","dmg","crit","acc","leth","prc","pcr","dev"].forEach(i=>$(i).value=0);["bal","cea","rnd","pun","sev","sat"].forEach(i=>$(i).checked=false);return sim()}
 $("atk").value=w.atk;$("hit").value=w.hit;$("dmg").value=w.dmg;$("crit").value=w.crit;const p=parse(w.n);
 ["acc","leth","prc","pcr","dev"].forEach(k=>$(k).value=p[k]);["bal","cea","rnd","pun","sev","sat"].forEach(k=>$(k).checked=p[k]);$("dist").value="";autoDice();sim()}
function fillDO(){ops($("dO"),$("dT").value);fillD()}
function fillD(){const o=T()[$("dT").value].operatives[$("dO").value];$("sv").value=o.save;$("wd").value=o.wounds;hint();autoDice();sim()}
// Defence dice start at 3 and drop by the effective Piercing as soon as the weapon or rule changes. The field stays editable.
function effPrc(){const m=+$("pmod").value||0,p=+$("prc").value||0;return m>=9?0:Math.max(0,p-m)}
function autoDice(){$("dd").value=Math.max(0,3-effPrc())}
function hint(){const t=T()[$("dT").value],R=(window.KTT.rules||{});const key=Object.keys(R).find(k=>k.toLowerCase()===t.name.toLowerCase());const out=[];
 if(key){const r=R[key];Object.keys(r).forEach(sec=>(r[sec]||[]).forEach(x=>{const s=x.text||"";if(/ignore the Piercing weapon rule/i.test(s))out.push(x.name+": ignore Piercing");else if(/worsen the x of the Piercing/i.test(s))out.push(x.name+": worsen Piercing by 1")}))}
 $("phint").innerHTML=out.length?"Team rules: "+out.map(esc).join(" · "):""}
$("pmod").addEventListener("input",()=>{autoDice();sim()});$("prc").addEventListener("input",autoDice);
function rangeOf(){const w=T()[$("aT").value].operatives[$("aO").value].weapons[$("aW").value];const m=w&&w.n.match(/Rng\s*(\d+)/);return m?+m[1]:0}
$("aT").onchange=fillAO;$("aO").onchange=fillAW;$("aW").onchange=fillW;$("dT").onchange=fillDO;$("dO").onchange=fillD;
const IDS=["atk","hit","dmg","crit","acc","leth","prc","pcr","dev","bal","cea","rnd","pun","sev","sat","sv","wd","dd","cov","dist"];
IDS.forEach(i=>$(i).addEventListener("input",sim));
function sim(){
 const g=i=>+$(i).value||0,c=i=>$(i).checked;
 const w={atk:g("atk"),hit:Math.min(6,Math.max(2,g("hit")||6)),dmg:g("dmg"),crit:g("crit"),acc:g("acc"),lethal:g("leth"),bal:c("bal"),cea:c("cea"),rend:c("rnd"),pun:c("pun"),sev:c("sev"),dev:g("dev")};
 const t={save:Math.min(6,Math.max(2,g("sv")||6)),dice:Math.max(0,g("dd")),cover:c("cov"),sat:c("sat"),pierce:0,pcrit:g("pcr")};
 const W=Math.max(1,g("wd"));
 const rg=rangeOf(),ds=$("dist").value===""?null:+$("dist").value,out=rg&&ds!==null&&ds>rg;
 $("rng").innerHTML=rg?rg+'" max'+(out?' <b style="color:#ff6a3a">- target out of range</b>':''):"No limit";
 w.atk=Math.max(0,w.atk);w.acc=Math.min(w.acc,w.atk);
 const R=30000,freq={};let tot=0,kill=0;
 for(let r=0;r<R;r++){const dmg=out?0:D.shoot(w,t);tot+=dmg;if(dmg>=W)kill++;freq[dmg]=(freq[dmg]||0)+1}
 $("rE").textContent=(tot/R).toFixed(1);$("rK").textContent=Math.round(kill/R*100)+"%";
 const ks=Object.keys(freq).map(Number).sort((a,b)=>a-b),mx=Math.max(...ks.map(k=>freq[k]));
 $("bars").innerHTML=ks.filter(k=>freq[k]/R>=.005).slice(0,14).map(k=>`<div><span>${k}</span><i style="width:${freq[k]/mx*100}%"></i><span>${(freq[k]/R*100).toFixed(0)}%</span></div>`).join("")}
// ---- melee duel
["x","y"].forEach(p=>{opt($(p+"T"),teamOpts());
 const fo=()=>{ops($(p+"O"),$(p+"T").value);fw()},fw=()=>{const o=T()[$(p+"T").value].operatives[$(p+"O").value];const m=o.weapons.map((w,i)=>[i,esc(w.n)]).filter(x=>isMelee(o.weapons[x[0]]));opt($(p+"W"),m.length?m:o.weapons.map((w,i)=>[i,esc(w.n)]));$(p+"wd").value=o.wounds;ff()},
 ff=()=>{const o=T()[$(p+"T").value].operatives[$(p+"O").value],w=o.weapons[$(p+"W").value];if(w){$(p+"a").value=w.atk;$(p+"h").value=w.hit;$(p+"d").value=w.dmg;$(p+"c").value=w.crit;const q=parse(w.n);$(p+"l").value=q.leth;$(p+"bal").checked=q.bal;$(p+"cea").checked=q.cea;$(p+"bru").checked=q.bru;$(p+"rnd").checked=q.rnd;$(p+"sev").checked=q.sev}duel()};
 $(p+"T").onchange=fo;$(p+"O").onchange=fw;$(p+"W").onchange=ff;
 ["a","h","d","c","l","wd","bal","cea","bru","rnd","sev"].forEach(k=>$(p+k).addEventListener("input",duel));window["fo_"+p]=fo});
function wp(p){const g=k=>+$(p+k).value||0,c=k=>$(p+k).checked;return{atk:g("a"),hit:Math.min(6,Math.max(2,g("h")||6)),dmg:g("d"),crit:g("c"),lethal:g("l"),bal:c("bal"),cea:c("cea"),brutal:c("bru"),rend:c("rnd"),sev:c("sev")}}
function duel(){const A=wp("x"),B=wp("y"),wa=+$("xwd").value||1,wb=+$("ywd").value||1,R=12000;
 let aK=0,bK=0,both=0,dA=0,dB=0;
 for(let i=0;i<R;i++){const r=D.duel(A,B,wa,wb,true);if(r.bDead&&!r.aDead)bK++;else if(r.aDead&&!r.bDead)aK++;else if(r.aDead&&r.bDead)both++;dA+=r.dA;dB+=r.dB}
 const pc=x=>Math.round(x/R*100)+"%";
 $("dres").innerHTML=`<div class="res"><div><div class="big">${pc(bK)}</div><small>Attacker kills defender</small></div><div><div class="big">${pc(aK)}</div><small>Defender kills attacker</small></div><div><div class="big">${pc(R-aK-bK-both)}</div><small>Both survive</small></div></div><div class="stats"><span>Avg damage to defender <b>${(dB/R).toFixed(1)}</b></span><span>Avg damage to attacker <b>${(dA/R).toFixed(1)}</b></span></div>`}
$("mode").onclick=e=>{const b=e.target.closest("button[data-m]");if(!b)return;document.querySelectorAll("#mode button").forEach(x=>x.setAttribute("aria-selected",x===b));$("m-shoot").hidden=b.dataset.m!=="shoot";$("m-melee").hidden=b.dataset.m!=="melee";if(b.dataset.m==="melee")duel()};
fillAO();fillDO();fo_x();fo_y();hint();autoDice();sim();
const q=new URLSearchParams(location.search);
if(q.has("t")){$("aT").value=q.get("t");fillAO();$("aO").value=q.get("o");fillAW();$("aW").value=q.get("w");fillW()}
})();
