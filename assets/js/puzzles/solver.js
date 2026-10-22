// PUZZLE SOLVER: searches every legal action sequence (memoised) and returns the best expected VP.
PZ.solve=function(s0,limitMs){
 const memo=new Map(),t0=Date.now();let nodes=0;
 const go=s=>{const k=PZ.key(s);if(memo.has(k))return memo.get(k);nodes++;
  if(limitMs&&Date.now()-t0>limitMs)throw new Error("timeout");
  if(s.over){const r={vp:s.vp,len:0,next:null};memo.set(k,r);return r}
  const acts=PZ.legal(s,true);if(!acts.length){const c=PZ.clone(s);PZ.finish(c);const r={vp:c.vp,len:0,next:null};memo.set(k,r);return r}
  let best=null;
  for(const a of acts){const n=PZ.apply(s,a),r=go(n),cand={vp:r.vp,len:r.len+(a.t==="end"||a.t==="activate"?0:1),next:a};
   if(!best||cand.vp>best.vp+1e-9||(Math.abs(cand.vp-best.vp)<=1e-9&&cand.len<best.len))best=cand}
  memo.set(k,best);return best};
 const root=go(s0);const path=[];let s=s0;
 while(!s.over){const r=memo.get(PZ.key(s));if(!r||!r.next)break;path.push(r.next);s=PZ.apply(s,r.next)}
 if(!s.over)PZ.finish(s);
 return{vp:root.vp,path,final:s,nodes};
};
