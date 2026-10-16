const LANGS=[["es","Español","es-ES"],["en","English","en-US"],["fr","Français","fr-FR"],["de","Deutsch","de-DE"],["it","Italiano","it-IT"],["pt","Português","pt-PT"],["ca","Català","ca-ES"],["nl","Nederlands","nl-NL"],["sv","Svenska","sv-SE"],["pl","Polski","pl-PL"],["tr","Türkçe","tr-TR"],["ru","Русский","ru-RU"],["ar","العربية","ar-SA"],["hi","हिन्दी","hi-IN"],["ja","日本語","ja-JP"],["ko","한국어","ko-KR"],["zh-CN","中文 (简体)","zh-CN"]];
const $=id=>document.getElementById(id);
const from=$("from"),to=$("to"),src=$("src"),dst=$("dst"),go=$("go");
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};

/* Tema */
const ICONS={dark:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',light:'<svg viewBox="0 0 24 24"><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></svg>'};
function setTheme(t){document.documentElement.dataset.theme=t;$("theme").innerHTML=ICONS[t];store.set("lingram-theme",t)}
setTheme(store.get("lingram-theme","dark"));
$("theme").onclick=()=>setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
$("yr").textContent=new Date().getFullYear();

/* Idiomas */
from.innerHTML='<option value="auto">Detectar idioma</option>'+LANGS.map(l=>`<option value="${l[0]}">${l[1]}</option>`).join("");
to.innerHTML=LANGS.map(l=>`<option value="${l[0]}">${l[1]}</option>`).join("");
from.value=store.get("lingram-from","auto");to.value=store.get("lingram-to","en");
const bcp=c=>(LANGS.find(l=>l[0]===c)||[])[2];
const nameOf=c=>(LANGS.find(l=>l[0]===c)||[,c])[1];

function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("show"),2600)}
src.addEventListener("input",()=>{$("cnt").textContent=src.value.length+" / 5000"});

/* Traducción (MyMemory, gratuita y sin clave) */
function chunks(text,max=450){
  const parts=text.split(/(?<=[.!?¿\n。！？])\s*/).filter(Boolean),out=[];let cur="";
  for(let p of parts){
    while(p.length>max){if(cur){out.push(cur);cur=""}out.push(p.slice(0,max));p=p.slice(max)}
    if((cur+" "+p).length>max){out.push(cur);cur=p}else cur=cur?cur+" "+p:p;
  }
  if(cur)out.push(cur);return out;
}
async function translate(){
  const text=src.value.trim();
  if(!text){toast("Escribe o dicta un texto primero.");return}
  if(from.value!=="auto"&&from.value===to.value){dst.value=text;return}
  go.disabled=true;go.textContent="Traduciendo…";$("det").textContent="";
  try{
    const pair=(from.value==="auto"?"Autodetect":from.value)+"|"+to.value;
    let result=[],detected="";
    for(const c of chunks(text)){
      const r=await fetch("https://api.mymemory.translated.net/get?q="+encodeURIComponent(c)+"&langpair="+encodeURIComponent(pair));
      if(!r.ok)throw new Error("El servicio no respondió ("+r.status+").");
      const d=await r.json();
      if(Number(d.responseStatus)!==200)throw new Error(d.responseDetails||"No se pudo traducir.");
      result.push(d.responseData.translatedText);
      if(d.responseData.detectedLanguage)detected=d.responseData.detectedLanguage;
    }
    dst.value=result.join(" ").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,"&");
    if(from.value==="auto"&&detected)$("det").textContent="Detectado: "+(nameOf(detected.split("-")[0])||detected);
    addHist(text,dst.value);
    store.set("lingram-from",from.value);store.set("lingram-to",to.value);
  }catch(e){
    toast(e.message.includes("fetch")?"Sin conexión. Revisa tu internet e inténtalo de nuevo.":e.message);
  }finally{go.disabled=false;go.textContent="Traducir"}
}
go.onclick=translate;
src.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")translate()});

/* Acciones */
$("swap").onclick=()=>{
  const f=from.value==="auto"?to.value:from.value;
  from.value=to.value;to.value=f;
  const t=src.value;src.value=dst.value;dst.value=t;src.dispatchEvent(new Event("input"));
};
$("clear").onclick=()=>{src.value="";dst.value="";$("det").textContent="";src.dispatchEvent(new Event("input"));src.focus()};
$("copy").onclick=async()=>{
  if(!dst.value)return toast("No hay traducción para copiar.");
  try{await navigator.clipboard.writeText(dst.value);toast("Traducción copiada.")}
  catch{dst.select();document.execCommand("copy");toast("Traducción copiada.")}
};

/* Voz: texto a voz */
function speak(text,code){
  if(!("speechSynthesis" in window))return toast("Tu navegador no admite voz de salida.");
  if(!text.trim())return toast("No hay texto para escuchar.");
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  const lang=bcp(code);
  if(lang){u.lang=lang;const v=speechSynthesis.getVoices().find(v=>v.lang.replace("_","-").startsWith(lang.split("-")[0]));if(v)u.voice=v}
  speechSynthesis.speak(u);
}
$("spkDst").onclick=()=>speak(dst.value,to.value);
$("spkSrc").onclick=()=>speak(src.value,from.value==="auto"?"":from.value);
if("speechSynthesis" in window)speechSynthesis.onvoiceschanged=()=>{};

/* Voz: dictado */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let rec=null,base="";
$("mic").onclick=()=>{
  if(!SR)return toast("Tu navegador no admite dictado. Prueba con Chrome, Edge o Safari.");
  if(rec){rec.stop();return}
  rec=new SR();rec.lang=bcp(from.value)||navigator.language||"es-ES";
  rec.interimResults=true;rec.continuous=false;
  base=src.value&&!src.value.endsWith(" ")?src.value+" ":src.value;
  rec.onstart=()=>{$("mic").classList.add("listening");toast("Escuchando…")};
  rec.onresult=e=>{let t="";for(const r of e.results)t+=r[0].transcript;src.value=base+t;src.dispatchEvent(new Event("input"))};
  rec.onerror=e=>toast(e.error==="not-allowed"?"Permite el acceso al micrófono para dictar.":e.error==="no-speech"?"No se escuchó nada. Inténtalo de nuevo.":"Error de voz: "+e.error);
  rec.onend=()=>{$("mic").classList.remove("listening");rec=null;if(src.value.trim())translate()};
  rec.start();
};

/* Historial */
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function addHist(a,b){
  let h=store.get("lingram-hist",[]).filter(x=>x.a!==a||x.b!==b);
  h.unshift({a,b,f:from.value,t:to.value});store.set("lingram-hist",h.slice(0,8));renderHist();
}
function renderHist(){
  const h=store.get("lingram-hist",[]),el=$("hist");
  if(!h.length){el.innerHTML='<p class="empty">Aún no hay traducciones. Tus últimas 8 aparecerán aquí.</p>';return}
  el.innerHTML=h.map((x,i)=>`<button class="item" data-i="${i}"><small>${x.f==="auto"?"Auto":nameOf(x.f)} → ${nameOf(x.t)}</small><span>${esc(x.a)}</span><span style="color:var(--mut)">${esc(x.b)}</span></button>`).join("");
}
$("hist").onclick=e=>{
  const b=e.target.closest(".item");if(!b)return;
  const x=store.get("lingram-hist",[])[b.dataset.i];if(!x)return;
  from.value=x.f;to.value=x.t;src.value=x.a;dst.value=x.b;src.dispatchEvent(new Event("input"));window.scrollTo({top:0,behavior:"smooth"});
};
$("clearHist").onclick=()=>{store.set("lingram-hist",[]);renderHist()};
renderHist();
