// TEAM DATABASE + ROLE PICKING. Reads data/teams.js; any of the 47 teams can be used.
PZ.heavy=n=>{const m=n.match(/\bHvy\b\s*\(?\s*(Dash|Reposition)?|Heavy\s*\((Dash|Reposition)/i);return m?{allow:((m[1]||m[2]||"")+"").toLowerCase()||null}:null};
PZ.rng=n=>{const r=n.match(/Rng\s*(\d+)/);return r?+r[1]:null};
PZ.wdef=w=>{const p=KTTDice.parse(w.n);return Object.assign({name:w.n.split(" (")[0],full:w.n,atk:w.atk,hit:w.hit,dmg:w.dmg,crit:w.crit,lethal:p.leth,acc:p.acc,bal:p.bal,cea:p.cea,brutal:p.bru,rend:p.rnd,pun:p.pun,sev:p.sev,dev:p.dev,pierce:p.prc,pcrit:p.pcr,rngv:PZ.rng(w.n),heavy:PZ.heavy(w.n)})};
PZ.ev=(w,save)=>{ // quick expected damage per attack action (for picking roles)
 const hit=(7-w.hit)/6,c=1/6;return w.atk*((hit-c)*w.dmg+c*w.crit)*(save>=5?1.1:save<=3?.8:.95)};
PZ.opData=(team,o)=>{const ws=o.weapons.map(PZ.wdef);return{team,name:o.name,apl:o.apl,move:o.move,save:o.save,max:o.wounds,ranged:ws.filter(w=>!KTTDice.isMelee({n:w.full})),melee:ws.filter(w=>KTTDice.isMelee({n:w.full}))}};
PZ.roster=team=>KTT.teams.find(t=>t.name===team).operatives.map(o=>PZ.opData(team,o));
PZ.pick=function(team,role,used){ // returns operative data for a role, avoiding already used names when possible
 const r=PZ.roster(team),best=w=>w.reduce((m,x)=>Math.max(m,PZ.ev(x,4)),0);
 const free=r.filter(o=>!used.includes(o.name)),pool=free.length?free:r;
 const score={gunner:o=>best(o.ranged)+(o.ranged.length?0:-99),fighter:o=>best(o.melee)+(o.melee.length?0:-99),runner:o=>o.move*10+best(o.ranged.concat(o.melee)),any:o=>o.max+o.move}[role]||(()=>0);
 const o=pool.slice().sort((a,b)=>score(b)-score(a))[0];used.push(o.name);return o};
