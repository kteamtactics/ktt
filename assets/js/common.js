// Shared helpers + header/footer. Edit NAV to add or rename pages.
window.KTT=window.KTT||{};
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// Social links: paste a full address between the quotes to show it in the footer. Leave "" to hide it.
KTT.social={reddit:"https://www.reddit.com/user/KillTeamTactics/",patreon:"https://www.patreon.com/cw/KillTeamTactics",instagram:""};
const NAV=[["index.html","Home"],["teams.html","Teams"],["calculator.html","Calculator"],["analysis.html","Battle analysis"],["quiz.html","Quiz"],["puzzles.html","Puzzles"]];
(function(){ // favicon on every page (files: assets/img/favicon.png, assets/img/apple-touch-icon.png)
  [["icon","assets/img/favicon.png?v=2"],["apple-touch-icon","assets/img/apple-touch-icon.png?v=2"]].forEach(a=>{if(document.querySelector('link[rel="'+a[0]+'"]'))return;const l=document.createElement("link");l.rel=a[0];l.href=a[1];if(a[0]==="icon")l.type="image/png";document.head.appendChild(l)});
})();
(function(){
  const cur=(location.pathname.split("/").pop()||"index.html");
  const h=document.getElementById("site-header");
  if(h)h.innerHTML='<div class="wrap"><a class="brand" href="index.html" aria-label="KTT home"><img src="assets/img/logo.png" alt="KTT" width="48" height="37"></a><nav aria-label="Main">'+NAV.map(n=>`<a href="${n[0]}"${n[0]===cur?' class="cur" aria-current="page"':''}>${n[1]}</a>`).join("")+'</nav></div>';
  const f=document.getElementById("site-footer");
  if(f){const so=KTT.social||{},ic={reddit:'<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5.6 11.2c.1.3.1.6.1.9 0 2.6-3 4.7-6.7 4.7s-6.7-2.1-6.7-4.7c0-.3 0-.6.1-.9a1.5 1.5 0 1 1 1.6-2.4 7.4 7.4 0 0 1 3.9-1.2l.8-3.600 2.600.600a1.100 1.100 0 1 1-.1.600l-1.900-.400-.600 2.700a7.400 7.400 0 0 1 3.800 1.200 1.500 1.500 0 1 1 1.100 2.500zM9.200 13a1.100 1.100 0 1 0 0 2.200 1.100 1.100 0 0 0 0-2.200zm5.600 0a1.100 1.100 0 1 0 0 2.200 1.100 1.100 0 0 0 0-2.200zm-5 3.400c.7.600 1.500.800 2.200.800s1.500-.2 2.200-.8a.4.4 0 0 0-.5-.6c-1 .8-2.400.8-3.400 0a.4.4 0 0 0-.5.600z"/></svg>',patreon:'<svg viewBox="0 0 24 24"><circle cx="15" cy="9.500" r="6.500"/><rect x="2" y="3" width="3.500" height="18"/></svg>',instagram:'<svg viewBox="0 0 24 24"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.500a4.500 4.500 0 1 1 0 9 4.500 4.500 0 0 1 0-9zm0 2a2.500 2.500 0 1 0 0 5 2.500 2.500 0 0 0 0-5zM17.300 5.800a1.100 1.100 0 1 1 0 2.200 1.100 1.100 0 0 1 0-2.200z"/></svg>'},nm={reddit:"Reddit",patreon:"Patreon",instagram:"Instagram"},ln=Object.keys(nm).filter(k=>so[k]).map(k=>'<a href="'+so[k]+'" target="_blank" rel="noopener">'+ic[k]+nm[k]+'</a>').join("");
  f.innerHTML='<div class="wrap">'+(ln?'<div class="socband"><b>KTT also on...</b>'+ln+'</div>':'')+'KTT is a fan project and is not affiliated with Games Workshop.</div>'}
  })();
// <option> builder with optional groups: items = [value,label,group?]
const opt=(s,items)=>{const o=([v,t])=>`<option value="${v}">${t}</option>`,g={};items.forEach(x=>{if(x[2])(g[x[2]]=g[x[2]]||[]).push(x)});s.innerHTML=items.filter(x=>!x[2]).map(o).join("")+Object.keys(g).map(k=>`<optgroup label="${k}">${g[k].map(o).join("")}</optgroup>`).join("")};
const teamOpts=blank=>(blank?[["","All teams"]]:[]).concat(KTT.teams.map((t,i)=>[i,esc(t.name),t.status==="classified"?"Classified teams":"Declassified teams"]).sort((a,b)=>(a[2]<b[2]?-1:a[2]>b[2]?1:0)||(a[1]<b[1]?-1:1)));
const title=n=>/\d/.test(n)?n:n.replace(/\w\S*/g,w=>w[0].toUpperCase()+w.slice(1).toLowerCase());
const mapOf=id=>KTT.maps.find(m=>m.id===id);
// ---- map renderer (shared by Teams? no: Analysis + puzzles preview) ----
// door types: "b" breachable (chamfered block), "n" normal (thin door leaf). Default breachable.
const doorSvg=(q,open,idx)=>{const g=s=>idx==null?s:`<g data-door="${idx}">${s}</g>`;return g(doorRaw(q,open))};
const doorRaw=(q,open)=>{const hz=q[2]==='h',x=q[0],y=q[1];if(q[3]==='n'){const l=1.1,t=.17,a=hz?[l,t]:[t,l];return open?`<rect class="dro" x="${x-a[0]}" y="${y-a[1]}" width="${a[0]*2}" height="${a[1]*2}"/>`:`<rect class="drn" x="${x-a[0]}" y="${y-a[1]}" width="${a[0]*2}" height="${a[1]*2}"/><circle class="drh" cx="${hz?x-l:x}" cy="${hz?y:y-l}" r=".14"/>`}
 const a=hz?[1.1,.4]:[.4,1.1],c=.45,pts=hz?`${x-a[0]},${y} ${x-a[0]+c},${y-a[1]} ${x+a[0]-c},${y-a[1]} ${x+a[0]},${y} ${x+a[0]-c},${y+a[1]} ${x-a[0]+c},${y+a[1]}`:`${x},${y-a[1]} ${x+a[0]},${y-a[1]+c} ${x+a[0]},${y+a[1]-c} ${x},${y+a[1]} ${x-a[0]},${y+a[1]-c} ${x-a[0]},${y-a[1]+c}`;return `<polygon class="${open?'dro':'dr'}" points="${pts}"/>`};
// deployment zone widths [for edge m.a, for the opposite edge]; on grids with a short first/last column (Gallowdark) the zones are exactly that column
const zoneD=m=>{if(!m.sa)return[m.d,m.d];const g=m.go||0,u=m.u,dim=(m.a==="l"||m.a==="r")?m.w:m.h,near=g,far=dim-(g+Math.floor((dim-g)/u+1e-9)*u)||u;return(m.a==="l"||m.a==="t")?[near,far]:[far,near]};
// a wall polyline split into pieces of one grid square, so a single piece can be breached. key = wallIndex:segment:piece
function wallPieces(m,q,wi){const out=[],g=m.go||0,u=m.u||1;for(let i=0;i+3<q.length;i+=2){const a=[q[i],q[i+1]],b=[q[i+2],q[i+3]],hz=Math.abs(a[1]-b[1])<1e-6,ax=hz?0:1,lo=Math.min(a[ax],b[ax]),hi=Math.max(a[ax],b[ax]),cuts=[lo];
  for(let t=g+Math.ceil((lo-g)/u+1e-9)*u;t<hi-1e-6;t+=u)if(t>lo+1e-6)cuts.push(+t.toFixed(3));cuts.push(hi);
  for(let k=0;k+1<cuts.length;k++){const p=hz?[[cuts[k],a[1]],[cuts[k+1],a[1]]]:[[a[0],cuts[k]],[a[0],cuts[k+1]]];out.push({k:wi+":"+(i/2)+":"+k,a:p[0],b:p[1],hz})}}return out}
function mapInner(m,lab,nd,env){let h="";const w=m.w,H=m.h,a=m.a,zd=zoneD(m),dA=zd[0],dB=zd[1];
 const R=(x,y,ww,hh,c)=>`<rect class="${c}" x="${x}" y="${y}" width="${ww}" height="${hh}"/>`;
 if(a==="b"||a==="t"){const my=H/2;h+=R(0,0,w,H,"tB")+R(0,a==="b"?my:0,w,my,"tA")+R(0,a==="b"?H-dA:0,w,dA,"dA")+R(0,a==="b"?0:H-dB,w,dB,"dB")}
 else{const mx=w/2;h+=R(0,0,w,H,"tB")+R(a==="r"?mx:0,0,mx,H,"tA")+R(a==="r"?w-dA:0,0,dA,H,"dA")+R(a==="r"?0:w-dB,0,dB,H,"dB")}
 if(lab){const u=m.u,g=m.go||0,sa=m.sa?1:0;for(let x=g+(g?0:u);x<w;x+=u)h+=`<line class="gl" x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;for(let y=g+(g?0:u);y<H;y+=u)h+=`<line class="gl" x1="0" y1="${y}" x2="${w}" y2="${y}"/>`;
  const cs=(n,max)=>{const r=[];if(sa)r.push(g/2);for(let i=0;g+i*u<max;i++)r.push(g+i*u+u/2);return r};
  cs(0,w).forEach((c,i)=>h+=`<text class="gt" x="${c}" y="-.5">${String.fromCharCode(65+i)}</text>`);cs(0,H).forEach((c,j)=>h+=`<text class="gt" x="-.7" y="${c+.2}">${j+1}</text>`)}
 if(lab)h+=`<line class="ml" x1="${w/2}" y1="0" x2="${w/2}" y2="${H}"/><line class="ml" x1="0" y1="${H/2}" x2="${w}" y2="${H/2}"/>`;
 m.t.forEach(t=>{h+=R(t[0],t[1],t[2],t[3],"k"+t[5]);if(lab&&t[5]!=="w")h+=`<text class="tl" x="${t[0]+t[2]/2}" y="${t[1]+t[3]/2+.25}">${esc(t[4])}</text>`});
 (m.gr||[]).forEach(q=>h+=`<line class="gg" x1="${q[0]}" y1="${q[1]}" x2="${q[2]}" y2="${q[3]}"/>`);
 (m.wl||[]).forEach((q,wi)=>{if(env){wallPieces(m,q,wi).forEach(p=>{const br=env.br&&env.br.has(p.k);h+=br?`<line class="wbr" x1="${p.a[0]}" y1="${p.a[1]}" x2="${p.b[0]}" y2="${p.b[1]}"/>`:`<line class="wl" stroke-linecap="round" x1="${p.a[0]}" y1="${p.a[1]}" x2="${p.b[0]}" y2="${p.b[1]}"/>`;h+=`<line class="wh" data-w="${p.k}" x1="${p.a[0]}" y1="${p.a[1]}" x2="${p.b[0]}" y2="${p.b[1]}"/>`})}
  else{let pts=[];for(let i=0;i<q.length;i+=2)pts.push(q[i]+","+q[i+1]);h+=`<polyline class="wl" points="${pts.join(" ")}"/>`}
  for(let i=0;i<q.length;i+=2)h+=`<rect class="wp" x="${q[i]-.3}" y="${q[i+1]-.3}" width=".6" height=".6"/>`});
 (m.xs||[]).forEach(q=>h+=`<rect class="wp" x="${q[0]-.3}" y="${q[1]-.3}" width=".6" height=".6"/><path class="xm" d="M${q[0]-.2} ${q[1]-.2}l.4 .4m0 -.4l-.4 .4"/>`);
 (m.ci||[]).forEach(q=>h+=`<circle class="ci" cx="${q[0]}" cy="${q[1]}" r="${q[2]}"/>`+(lab?`<text class="tl" x="${q[0]}" y="${q[1]+.25}">${q[3]}</text>`:""));
 if(!nd)(m.dr||[]).forEach((q,i)=>h+=doorSvg(q,env&&env.open&&env.open.has(i),env?i:null));
 m.o.forEach(o=>{h+=`<circle class="ob ob${o[0]}" cx="${o[1]}" cy="${o[2]}" r="${lab?1:1.3}"/>`+(o[0]==="c"?`<path class="ob" d="M${o[1]-1.6} ${o[2]}h3.2M${o[1]} ${o[2]-1.6}v3.2"/>`:"")});
 return h}
// cell name of a point: columns A,B.. from left, rows 1,2.. from top
const cell=(m,p)=>{const g=m.go||0,sa=m.sa?1:0,f=v=>v<g?0:Math.floor((v-g)/m.u)+sa;return String.fromCharCode(65+f(p[0]))+(f(p[1])+1)};
// centre of a cell name
const cellPos=(m,name)=>{const g=m.go||0,sa=m.sa?1:0,c=name.charCodeAt(0)-65,r=+name.slice(1)-1;const ctr=i=>(sa&&i===0)?g/2:g+(i-sa)*m.u+m.u/2;return[ctr(c),ctr(r)]};

// ---- Owner mode (shared by all pages). Cosmetic and local to this browser: it hides items for the owner only.
// To remove something for everyone, delete it in the data files (data/articles.js, data/news.js, data/reports.js, data/games.js, assets quizbank).
KTT.own=(function(){
 const g=k=>{try{return localStorage.getItem(k)}catch(e){return null}},st=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}};
 const q=new URLSearchParams(location.search);
 if(q.get("owner")==="1"){st("ktt-owner","1");window.name="ktt-owner"}
 if(q.get("owner")==="0"){st("ktt-owner",null);window.name=""}
 const on=g("ktt-owner")==="1"||window.name==="ktt-owner";
 let H=[];try{H=JSON.parse(g("ktt-hidden")||"[]")}catch(e){}
 const save=()=>st("ktt-hidden",JSON.stringify(H));
 const o={on,list:()=>H.slice(),has:id=>H.includes(id),visible:id=>on||!H.includes(id),
  hide(id,label){if(!H.includes(id)){H.push(id);save()}if(label){let L={};try{L=JSON.parse(g("ktt-hidden-lbl")||"{}")}catch(e){}L[id]=String(label).slice(0,140);st("ktt-hidden-lbl",JSON.stringify(L))}},label(id){try{return JSON.parse(g("ktt-hidden-lbl")||"{}")[id]||""}catch(e){return ""}},restore(id){H=H.filter(x=>x!==id);save()},
  set(v){st("ktt-owner",v?"1":null);window.name=v?"ktt-owner":"";},
  // adds a two-step remove / restore button to a card or any element
  btn(el,id,label){const hidden=H.includes(id),b=document.createElement("button");b.type="button";b.className="own-del"+(hidden?" restore":"");b.textContent=hidden?"Restore":"Remove";let sure=0;
   b.onclick=e=>{e.preventDefault();e.stopPropagation();if(hidden){o.restore(id);location.reload();return}if(!sure){sure=1;b.textContent="Sure? Click again";b.classList.add("sure");setTimeout(()=>{sure=0;b.textContent="Remove";b.classList.remove("sure")},3500);return}o.hide(id,label||(el.querySelector("h1,h2,h3,.t")||el).textContent.trim().replace(/\s+/g," ").replace(/(Remove|Restore)$/,"").slice(0,100));location.reload()};
   el.classList.add("own-host");if(hidden)el.classList.add("own-hidden");el.appendChild(b);return b}};
 return o})();
(function(){const f=document.getElementById("site-footer");if(!f)return;const w=f.firstElementChild;
 if(w)w.insertAdjacentHTML("beforeend",' &middot; <a href="#" id="ownTogF" class="muted-link">'+(KTT.own.on?"Exit owner mode":"Owner mode")+'</a>');
 const t=document.getElementById("ownTogF");if(t)t.onclick=e=>{e.preventDefault();KTT.own.set(!KTT.own.on);location.reload()};
 if(!KTT.own.on)return;
 const bar=document.createElement("div");bar.className="own-bar";const n=KTT.own.list().length;
 bar.innerHTML='<b>Owner mode</b><span>Removed here (only in your browser): '+n+'</span><button type="button" id="ownCopy">Removal list</button>'+(n?'<button type="button" id="ownRst">Restore all</button><button type="button" id="ownClr" title="Forget the list (use once I have deleted the items for real)">Clear list</button>':'')+'<button type="button" id="ownOff">Exit</button><textarea id="ownTa" readonly hidden></textarea>';
 document.body.prepend(bar);
 document.getElementById("ownOff").onclick=()=>{KTT.own.set(false);location.reload()};
 document.getElementById("ownCopy").onclick=()=>{const ta=document.getElementById("ownTa");ta.hidden=false;ta.value=KTT.own.list().length?"Please delete for everyone:\n"+KTT.own.list().map(i=>"- "+i+(KTT.own.label(i)?"  ("+KTT.own.label(i)+")":"")).join("\n"):"Nothing removed yet.";ta.select()};
 const cl=document.getElementById("ownClr");let cs=0;if(cl)cl.onclick=()=>{if(!cs){cs=1;cl.textContent="Sure? Items not deleted from the data will show again";return}try{localStorage.removeItem("ktt-hidden");localStorage.removeItem("ktt-hidden-lbl")}catch(e){}location.reload()};
 const r=document.getElementById("ownRst");if(r)r.onclick=()=>{KTT.own.list().forEach(KTT.own.restore);location.reload()}})();
