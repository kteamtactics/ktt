// SELF-PUBLISHING (owner mode). Saves a report / article / puzzle straight into the site's data file on GitHub (the site must be hosted from a GitHub repository).
// Settings (repository, branch, token) are stored only in this browser. Nothing is sent anywhere except to api.github.com.
window.KTT=window.KTT||{};
KTT.pub=(function(){
const K="ktt-gh",cfg=()=>{try{return JSON.parse(localStorage.getItem(K))||{}}catch(e){return{}}};
const b64=s=>{let t="";new TextEncoder().encode(s).forEach(x=>t+=String.fromCharCode(x));return btoa(t)};
const unb64=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)));
function toast(m,bad){let t=document.getElementById("pubToast");if(!t){t=document.createElement("div");t.id="pubToast";t.setAttribute("role","status");document.body.appendChild(t)}t.className=bad?"bad":"";t.textContent=m;t.hidden=false;clearTimeout(t._h);t._h=setTimeout(()=>t.hidden=true,bad?9000:6000)}
async function gh(c,path,opt){const url="https://api.github.com/repos/"+c.repo+"/contents/"+path,get=!opt;
 const r=await fetch(get?url+"?ref="+encodeURIComponent(c.branch||"main"):url,Object.assign({headers:{Authorization:"Bearer "+c.token,Accept:"application/vnd.github+json"}},opt||{}));
 if(!r.ok){const e=new Error(String(r.status));e.status=r.status;throw e}return r.json()}
const errText=e=>e.status===401?"GitHub refused the token. Check it in the publish settings.":e.status===403?"The token has no permission to write. Give it Contents: Read and write.":e.status===404?"Repository or file not found. Check the repository name and branch.":e.status===409||e.status===422?"The file changed while publishing. Try again.":"Could not reach GitHub ("+(e.message||"network")+").";
function parse(text,key){const i=text.indexOf("window.KTT"),head=i>0?text.slice(0,i):"",body=text.slice(i<0?0:i),w={};
 new Function("window","var KTT=window.KTT=window.KTT||{};"+body.replace(/window\.KTT\s*=\s*window\.KTT\s*\|\|\s*\{\};?/,""))(w);return{head,arr:(w.KTT&&w.KTT[key])||[]}}
async function publish(file,key,obj){const c=cfg();if(!c.repo||!c.token)return{setup:true};
 for(let tries=0;tries<2;tries++){try{const f=await gh(c,file),p=parse(unb64(f.content),key),i=p.arr.findIndex(x=>x.id===obj.id);if(i>=0)p.arr[i]=obj;else p.arr.unshift(obj);
   const out=p.head+"window.KTT=window.KTT||{};\nKTT."+key+"=[\n"+p.arr.map(x=>JSON.stringify(x)).join(",\n")+"\n];\n";
   await gh(c,file,{method:"PUT",headers:{Authorization:"Bearer "+c.token,Accept:"application/vnd.github+json","Content-Type":"application/json"},body:JSON.stringify({message:(i>=0?"Update ":"Publish ")+(obj.title||obj.id),content:b64(out),sha:f.sha,branch:c.branch||"main"})});
   return{ok:true,updated:i>=0}}catch(e){if((e.status===409||e.status===422)&&!tries)continue;return{err:errText(e)}}}}
function panel(){let d=document.getElementById("pubPanel");if(d){d.hidden=false;return}const c=cfg();d=document.createElement("div");d.id="pubPanel";
 d.innerHTML=`<div class="pbox"><h2>Publish settings</h2><p class="note" style="margin-top:0">One-time setup. The site must be stored in a GitHub repository (see the guide below). These values stay in this browser only.</p>
 <label for="pgRepo">Repository (owner/name)</label><input id="pgRepo" placeholder="killteamtactics/ktt" value="${esc(c.repo||"")}">
 <label for="pgBr">Branch</label><input id="pgBr" placeholder="main" value="${esc(c.branch||"main")}">
 <label for="pgTok">Access token</label><input id="pgTok" type="password" autocomplete="off" placeholder="github_pat_..." value="${esc(c.token||"")}">
 <div class="tools"><button class="btn" id="pgSave" type="button">Save</button><button class="sm" id="pgTest" type="button">Test connection</button><button class="sm" id="pgClose" type="button">Close</button><button class="sm" id="pgClear" type="button">Forget token</button></div><p class="note" id="pgMsg" role="status"></p>
 <details><summary>Step-by-step guide</summary><ol class="note"><li>Create a free account on github.com and a new repository (private is fine). Upload all the site files into it.</li><li>Host it for free: in the repository, Settings &gt; Pages, choose the main branch (or connect the repository to Netlify).</li><li>Create a token: github.com &gt; Settings &gt; Developer settings &gt; Fine-grained tokens &gt; Generate. Choose only this repository and set <b>Contents: Read and write</b>.</li><li>Paste the repository name and the token above, then press Test connection.</li></ol></details></div>`;
 document.body.appendChild(d);const $=id=>d.querySelector("#"+id),val=()=>({repo:$("pgRepo").value.trim().replace(/^https?:\/\/github\.com\//,"").replace(/\.git$/,"").replace(/\/$/,""),branch:$("pgBr").value.trim()||"main",token:$("pgTok").value.trim()});
 $("pgSave").onclick=()=>{try{localStorage.setItem(K,JSON.stringify(val()))}catch(e){}$("pgMsg").textContent="Saved."};
 $("pgClose").onclick=()=>d.hidden=true;$("pgClear").onclick=()=>{try{localStorage.removeItem(K)}catch(e){}$("pgTok").value="";$("pgMsg").textContent="Token forgotten."};
 $("pgTest").onclick=async()=>{const v=val();try{localStorage.setItem(K,JSON.stringify(v))}catch(e){}$("pgMsg").textContent="Testing...";
  try{const r=await fetch("https://api.github.com/repos/"+v.repo,{headers:{Authorization:"Bearer "+v.token,Accept:"application/vnd.github+json"}});const j=await r.json();$("pgMsg").textContent=r.ok?(j.permissions&&j.permissions.push===false?"Connected, but this token cannot write.":"Connected to "+j.full_name+". You can publish."):errText({status:r.status})}catch(e){$("pgMsg").textContent="Could not reach GitHub."}}}
async function go(btn,file,key,obj,label){if(!btn||btn._busy)return;btn._busy=1;const old=label||btn.textContent;btn.textContent="Publishing...";
 const r=await publish(file,key,obj);btn._busy=0;
 if(r.setup){btn.textContent=old;panel();toast("Set up publishing first (one time).");return}
 if(r.ok){btn.textContent="Published";toast((r.updated?"Updated":"Published")+": it will be live on the site in about a minute.");setTimeout(()=>btn.textContent=old,3000)}
 else{btn.textContent=old;toast(r.err,true)}}
return{go,panel,publish,cfg}})();
