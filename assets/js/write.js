// Article editor (owner mode). Draft is kept in localStorage; "Publish" copies the article text so it can be added to data/articles.js
(function(){
const $=id=>document.getElementById(id),Q=new URLSearchParams(location.search);
const st={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
if(!KTT.own.on){$("gate").hidden=false;return}
if(!Q.get("edit")&&Q.get("type")!=="article"){$("pick").hidden=false;return}
$("ed").hidden=false;
const IDX="ktt-articles-index",KEY=i=>"ktt-article:"+i;
const today=()=>new Date().toISOString().slice(0,10),newId=()=>"a"+Date.now().toString(36);
let A=null;
if(Q.get("edit")){try{A=JSON.parse(st.get(KEY(Q.get("edit"))))}catch(e){}}
if(!A){A={id:newId(),tag:"Analysis",date:today(),title:"",chapo:"",img:"",body:[{p:""}]};try{history.replaceState(null,"","write.html?edit="+A.id)}catch(e){}}
const msg=t=>{$("msg").textContent=t||""};
function save(){const ok=st.set(KEY(A.id),JSON.stringify(A));let ix=[];try{ix=JSON.parse(st.get(IDX)||"[]")}catch(e){}ix=ix.filter(x=>x.id!==A.id);ix.unshift({id:A.id,title:A.title,updated:Date.now()});st.set(IDX,JSON.stringify(ix));
 msg(ok?"":"Draft too large for this browser's storage: remove or shrink some photos.");$("prev").href="article.html?draft="+A.id}
// image helper: resize and compress to a JPEG data URL
function pic(file,maxW,crop){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{let w=im.width,h=im.height,sx=0,sy=0,sw=w,sh=h,dw,dh;
 if(crop){const r=crop;if(w/h>r){sw=h*r;sx=(w-sw)/2}else{sh=w/r;sy=(h-sh)/2}dw=Math.min(maxW,Math.round(sw));dh=Math.round(dw/r)}else{const k=Math.min(1,maxW/w);dw=Math.round(w*k);dh=Math.round(h*k)}
 const c=document.createElement("canvas");c.width=dw;c.height=dh;const x=c.getContext("2d");x.fillStyle="#000";x.fillRect(0,0,dw,dh);x.drawImage(im,sx,sy,sw,sh,0,0,dw,dh);res(c.toDataURL("image/jpeg",.82))};im.src=fr.result};fr.readAsDataURL(file)})}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function fields(){$("aTitle").value=A.title;$("aTag").value=A.tag;$("aDate").value=A.date;$("aChapo").value=A.chapo;cover()}
function cover(){$("coverImg").hidden=!A.img;if(A.img)$("coverImg").src=A.img;$("coverDel").hidden=!A.img}
[["aTitle","title"],["aTag","tag"],["aDate","date"],["aChapo","chapo"]].forEach(([i,k])=>$(i).oninput=()=>{A[k]=$(i).value;save()});
$("coverBtn").onclick=()=>$("coverFile").click();
$("coverFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{A.img=await pic(f,960,16/10);cover();save()}catch(x){msg("This photo could not be read.")}e.target.value=""};
$("coverDel").onclick=()=>{A.img="";cover();save()};
const LBL={p:"Paragraph",h:"Subtitle",q:"Quote",img:"Photo",link:"Button link"};
const kind=b=>b.p!=null?"p":b.h!=null?"h":b.q!=null?"q":b.img?"img":"link";
function blocks(){$("blocks").innerHTML=A.body.map((b,i)=>{const k=kind(b);let f="";
 if(k==="p")f=`<textarea data-i="${i}" rows="4" placeholder="Write your paragraph...">${esc(b.p)}</textarea>`;
 else if(k==="h")f=`<input data-i="${i}" value="${esc(b.h)}" placeholder="Subtitle">`;
 else if(k==="q")f=`<textarea data-i="${i}" rows="2" placeholder="Quote">${esc(b.q)}</textarea>`;
 else if(k==="img")f=`<img class="bimg" src="${b.img[0]}" alt=""><input data-i="${i}" data-j="1" value="${esc(b.img[1]||"")}" placeholder="Caption (optional)">`;
 else f=`<input data-i="${i}" data-j="0" value="${esc(b.link[0])}" placeholder="Button text"><input data-i="${i}" data-j="1" value="${esc(b.link[1])}" placeholder="https://..." style="margin-top:.4rem">`;
 return `<div class="blk"><div class="bh"><b>${LBL[k]}</b><span><button class="sm" type="button" data-mv="${i}:-1" ${i?"":"disabled"} aria-label="Move up">&uarr;</button> <button class="sm" type="button" data-mv="${i}:1" ${i<A.body.length-1?"":"disabled"} aria-label="Move down">&darr;</button> <button class="sm" type="button" data-rm="${i}" aria-label="Delete block">Delete</button></span></div>${f}</div>`}).join("")}
$("blocks").addEventListener("input",e=>{const t=e.target,i=+t.dataset.i;if(isNaN(i))return;const b=A.body[i],k=kind(b),j=t.dataset.j;
 if(k==="p")b.p=t.value;else if(k==="h")b.h=t.value;else if(k==="q")b.q=t.value;else if(k==="img")b.img[1]=t.value;else b.link[+j]=t.value;save()});
$("blocks").addEventListener("click",e=>{const m=e.target.closest("[data-mv]"),r=e.target.closest("[data-rm]");
 if(m){const[i,d]=m.dataset.mv.split(":").map(Number);const [x]=A.body.splice(i,1);A.body.splice(i+d,0,x);blocks();save()}
 else if(r){A.body.splice(+r.dataset.rm,1);blocks();save()}});
document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const k=b.dataset.add;if(k==="img"){$("blkFile").click();return}
 A.body.push(k==="p"?{p:""}:k==="h"?{h:""}:k==="q"?{q:""}:{link:["",""]});blocks();save();const t=$("blocks").querySelector(".blk:last-child textarea,.blk:last-child input");if(t)t.focus()});
$("blkFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{A.body.push({img:[await pic(f,1100),""]});blocks();save()}catch(x){msg("This photo could not be read.")}e.target.value=""};
function outObj(feat){const o={id:A.id,tag:A.tag||"Article",date:A.date||today(),status:"published",img:A.img||"assets/img/art-news.svg",alt:A.title,title:A.title.trim(),chapo:A.chapo.trim(),body:A.body.filter(b=>{const k=kind(b);return k==="img"?true:k==="link"?b.link[0]&&b.link[1]:(b[k]||"").trim()})};if(feat)o.feat=true;return o}
function copyOut(text,btn,label){const o=$("out");o.hidden=false;o.value=text;o.focus();o.select();let ok=false;try{ok=document.execCommand("copy")}catch(e){}
 const done=m=>{btn.textContent=m;setTimeout(()=>btn.textContent=label,2200)};done(ok?"Copied":"Select all + copy below");
 try{navigator.clipboard&&navigator.clipboard.writeText(text).then(()=>done("Copied"),()=>{})}catch(e){}}
function pubGo(btn,label,feat){if(!A.title.trim()){msg("Add a title first.");$("aTitle").focus();return}msg("");copyOut(JSON.stringify(outObj(feat))+",",btn,label)}
const goPub=(btn,feat)=>{if(!A.title.trim()){msg("Add a title first.");$("aTitle").focus();return}msg("");KTT.pub.go(btn,"data/articles.js","articles",outObj(feat))};
$("go").onclick=()=>goPub($("go"),false);$("goF").onclick=()=>goPub($("goF"),true);$("goS").onclick=()=>KTT.pub.panel();
$("pub").onclick=()=>pubGo($("pub"),"Copy for publication",false);
$("feat").onclick=()=>pubGo($("feat"),"Copy for front page",true);
fields();blocks();save();if(A.published)msg("You are editing an article that is already published. Press \"Copy for publication\" and send me the text: it replaces the published version.");
})();
