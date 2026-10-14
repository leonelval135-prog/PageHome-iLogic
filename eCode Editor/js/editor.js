/* eCode Editor · Módulo Editor de código (cualquier lenguaje) */
(()=>{
const E=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const JS='break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield async await of static get set null true false undefined';
const GEN='abstract as auto bool boolean break byte case catch char class const continue crate data def default defer delete do double else enum extends extern false fn final finally float for foreach fun func function go goto if impl implements import in include inline instanceof int interface let long match mod mut namespace native new nil null override package private protected pub public readonly ref return select self short signed sizeof static string struct super switch synchronized template this throw throws trait true try type typedef typeof union unsigned use using val var virtual void volatile where while yield echo isset array';
const PY='and as assert async await break class continue def del elif else except finally for from global if import in is lambda None nonlocal not or pass raise return try while with yield True False';
const SQ='select from where and or not insert into values update set delete create table alter drop index view join left right inner outer full cross on group by order having limit offset as distinct union all null is in like between exists case when then else end primary key foreign references default count sum avg min max asc desc with begin commit rollback';
// [id, nombre, extensión, familia de resaltado, palabras clave]
const LG=[['javascript','JavaScript','js','cl',JS],['typescript','TypeScript','ts','cl',JS+' interface type enum implements public private protected readonly namespace declare abstract keyof'],['json','JSON','json','cl','true false null'],['html','HTML','html','markup',''],['xml','XML / SVG','xml','markup',''],['css','CSS','css','css',''],['sql','SQL','sql','sql',SQ],['python','Python','py','hash',PY],['java','Java / Kotlin','java','cl',GEN],['csharp','C#','cs','cl',GEN],['cpp','C / C++','cpp','cl',GEN],['go','Go','go','cl',GEN],['rust','Rust','rs','cl',GEN],['php','PHP','php','cl',GEN],['ruby','Ruby','rb','hash',PY+' end do begin unless elsif puts nil'],['bash','Shell','sh','hash','if then else elif fi for while do done case esac function in echo export local return'],['yaml','YAML','yml','hash','true false null yes no'],['markdown','Markdown','md','plain',''],['text','Texto plano','txt','plain','']];
const KWS={};LG.forEach(l=>KWS[l[0]]=new Set(l[4].split(' ')));
const AL={htm:'html',mjs:'js',cjs:'js',jsx:'js',tsx:'ts',yaml:'yml',c:'cpp',h:'cpp',cc:'cpp',hpp:'cpp',kt:'java',bash:'sh',zsh:'sh',svg:'xml',vue:'html',scss:'css',less:'css',jsonc:'json',markdown:'md'};
const byExt=n=>{let x=n.split('.').pop().toLowerCase();x=AL[x]||x;return(LG.find(l=>l[2]===x)||[])[0]||'text'};
const FAM={
cl:/(\/\/.*|\/\*[\s\S]*?(?:\*\/|$))|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|`(?:\\.|[^`\\])*`?)|(\b0x[\da-f]+\b|\b\d+\.?\d*(?:e[+-]?\d+)?\b)|([A-Za-z_$][\w$]*)/gi,
hash:/(#.*)|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)/g,
sql:/(--.*|\/\*[\s\S]*?(?:\*\/|$))|('(?:''|[^'])*'?|"[^"\n]*"?)|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)/g,
css:/(\/\*[\s\S]*?(?:\*\/|$))|("[^"\n]*"?|'[^'\n]*'?)|(#[\da-f]{3,8}\b|-?\b\d*\.?\d+(?:px|r?em|%|vh|vw|s|ms|deg|fr)?)|(@[\w-]+|[.#][A-Za-z_-][\w-]*|[A-Za-z-]+)/gi,
markup:/(<!--[\s\S]*?(?:-->|$))|("[^"\n]*"?|'[^'\n]*'?)|(\x00)|(<\/?[A-Za-z][\w:-]*|\/?>|[\w:-]+(?==))/g};
const CM={cl:['// ',''],hash:['# ',''],sql:['-- ',''],markup:['<!-- ',' -->'],css:['/* ',' */']};
const PR={'(':')','[':']','{':'}','"':'"',"'":"'",'`':'`'};

function hl(code,L){
 const f=FAM[L[3]];if(!f)return E(code)+'\n';
 const kw=KWS[L[0]];let o='',last=0,m;f.lastIndex=0;
 while((m=f.exec(code))){
  if(!m[0]){f.lastIndex++;continue}
  const t=m[0],after=code.slice(f.lastIndex,f.lastIndex+40);let c='';
  if(m[1])c='c';else if(m[2])c=L[0]==='json'&&/^\s*:/.test(after)?'k':'s';else if(m[3])c='n';
  else if(L[3]==='markup')c=/^[<\/>]/.test(t)?'t':'a';
  else if(L[3]==='css')c=t[0]==='@'?'k':/^[.#]/.test(t)?'f':/^\s*:/.test(after)?'a':'';
  else c=kw.has(L[3]==='sql'?t.toLowerCase():t)?'k':/^\s*\(/.test(after)?'f':/^[A-Z]/.test(t)?'t2':'';
  o+=E(code.slice(last,m.index))+(c?`<i class="h${c}">${E(t)}</i>`:E(t));last=f.lastIndex;
 }
 return o+E(code.slice(last))+'\n';
}

// ---------- Estado ----------
const WELCOME='// Bienvenido a eCode Editor ✦\n// Escribe código en cualquier lenguaje. Se guarda solo.\n\nfunction saludar(nombre) {\n  const mensaje = `Hola, ${nombre}!`;\n  console.log(mensaje);\n  return mensaje;\n}\n\nsaludar("eCode");\n';
const uid=()=>Date.now()+Math.floor(Math.random()*1e4);
let files=store.get('ecode-files',null);
if(!Array.isArray(files)||!files.length)files=[{id:1,name:'bienvenida.js',lang:'javascript',code:WELCOME}];
let cur=store.get('ecode-cur',files[0].id);if(!files.some(f=>f.id===cur))cur=files[0].id;
const F=()=>files.find(f=>f.id===cur),L=()=>LG.find(l=>l[0]===F().lang)||LG[LG.length-1];
const ta=$('#ta'),hlEl=$('#hl'),fl=$('#fl'),gut=$('#gut'),ind=()=>' '.repeat(+$('#etab').value);
let fi=-1,pvOn=false,timer;

function render(){
 hlEl.innerHTML=hl(ta.value,L());
 const n=ta.value.split('\n').length;if(render.n!==n){gut.textContent=Array.from({length:n},(_,i)=>i+1).join('\n');render.n=n}
 paintFind();status();
}
function status(){
 const v=ta.value,s=ta.selectionStart,p=v.slice(0,s).split('\n'),sel=Math.abs(ta.selectionEnd-s);
 $('#epos').textContent=`Ln ${p.length}, Col ${p[p.length-1].length+1}`;
 $('#esel').textContent=sel?`${sel} seleccionados`:'';
 $('#einfo').textContent=`${v.split('\n').length} líneas · ${v.length} caracteres · ${bytes(new Blob([v]).size)}`;
 $('#esl').textContent=L()[1];
}
function save(){F().code=ta.value;store.set('ecode-files',files);store.set('ecode-cur',cur);$('#esave').textContent='Guardado ✓'}
function sched(){$('#esave').textContent='Guardando…';clearTimeout(timer);timer=setTimeout(save,500);if(pvOn){clearTimeout(sched.p);sched.p=setTimeout(pv,500)}}
ta.addEventListener('input',()=>{render();sched()});
ta.addEventListener('scroll',()=>{hlEl.scrollTop=fl.scrollTop=gut.scrollTop=ta.scrollTop;hlEl.scrollLeft=fl.scrollLeft=ta.scrollLeft});
['keyup','click'].forEach(e=>ta.addEventListener(e,status));
document.addEventListener('selectionchange',()=>{if(document.activeElement===ta)status()});

// Insertar texto conservando el historial de deshacer
function put(a,b,t,ns,ne){
 const act=document.activeElement;ta.focus();ta.setSelectionRange(a,b);
 const ok=t===''?document.execCommand('delete'):document.execCommand('insertText',false,t);
 if(!ok){ta.setRangeText(t,a,b,'end');ta.dispatchEvent(new Event('input'))}
 if(ns!=null)ta.setSelectionRange(ns,ne??ns);
 if(act&&act!==ta&&act.focus)act.focus();status();
}

// ---------- Archivos / pestañas ----------
function tabsR(){
 const t=$('#ftabs');t.innerHTML='';
 files.forEach(f=>{const b=document.createElement('div');b.className='ft'+(f.id===cur?' on':'');b.innerHTML=`<span>${E(f.name)}</span><b title="Cerrar">×</b>`;
  b.onclick=e=>e.target.tagName==='B'?closeF(f.id):openF(f.id);b.ondblclick=()=>rename(f);t.appendChild(b)});
 const p=document.createElement('button');p.className='ft add';p.textContent='+';p.title='Nuevo archivo';p.onclick=()=>newF();t.appendChild(p);
}
function openF(id){if(F())F().code=ta.value;cur=id;ta.value=F().code;$('#elang').value=F().lang;fi=-1;render.n=0;render();tabsR();pv();save()}
function newF(name,code,lang){
 const n=name||`sin-titulo-${files.length+1}.txt`;files.push({id:uid(),name:n,lang:lang||byExt(n),code:code||''});openF(files[files.length-1].id);
}
function closeF(id){
 const f=files.find(x=>x.id===id);if(f.code.trim()&&!confirm(`¿Cerrar «${f.name}»? Se descartará su contenido.`))return;
 files=files.filter(x=>x.id!==id);if(!files.length)files=[{id:uid(),name:'sin-titulo.txt',lang:'text',code:''}];
 if(cur===id){cur=null;openF(files[0].id)}else{tabsR();save()}
}
function rename(f){const n=prompt('Nombre del archivo (la extensión define el lenguaje):',f.name);if(!n)return;f.name=n.trim();f.lang=byExt(f.name);if(f.id===cur){$('#elang').value=f.lang;render()}tabsR();save()}
function addFiles(list){[...list].forEach(f=>{const r=new FileReader();r.onload=()=>newF(f.name,r.result);r.readAsText(f)})}
$('#eopen').onclick=()=>$('#efile').click();$('#efile').onchange=e=>{addFiles(e.target.files);e.target.value=''};
const box=$('.eed');['dragover','dragenter'].forEach(v=>box.addEventListener(v,e=>{e.preventDefault();box.classList.add('drop')}));
['dragleave','drop'].forEach(v=>box.addEventListener(v,e=>{e.preventDefault();box.classList.remove('drop')}));
box.addEventListener('drop',e=>addFiles(e.dataTransfer.files));
function dl(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ta.value],{type:'text/plain'}));a.download=F().name;a.click();toast('Descargado: '+F().name)}
$('#edl').onclick=dl;
$('#ecopy').onclick=async()=>{try{await navigator.clipboard.writeText(ta.value);toast('Código copiado ✓')}catch(e){ta.select();document.execCommand('copy')}};

// ---------- Lenguaje y opciones ----------
LG.forEach(l=>$('#elang').add(new Option(l[1],l[0])));
$('#elang').onchange=()=>{F().lang=$('#elang').value;render();pv();save()};
const opts=()=>store.set('ecode-opts',{fs:$('#efs').value,tab:$('#etab').value});
const o=store.get('ecode-opts',{fs:'14',tab:'2'});$('#efs').value=o.fs;$('#etab').value=o.tab;
const applyFs=()=>box.style.setProperty('--fs',$('#efs').value+'px');applyFs();
$('#efs').onchange=()=>{applyFs();opts();render()};$('#etab').onchange=opts;

// ---------- Herramientas de texto ----------
const TOOLS={
'Ordenar líneas A → Z':t=>t.split('\n').sort((a,b)=>a.localeCompare(b)).join('\n'),
'Ordenar líneas Z → A':t=>t.split('\n').sort((a,b)=>b.localeCompare(a)).join('\n'),
'Invertir orden de líneas':t=>t.split('\n').reverse().join('\n'),
'Quitar líneas duplicadas':t=>[...new Set(t.split('\n'))].join('\n'),
'Quitar líneas vacías':t=>t.split('\n').filter(l=>l.trim()).join('\n'),
'Recortar espacios finales':t=>t.replace(/[ \t]+$/gm,''),
'Tabulaciones → espacios':t=>t.replace(/\t/g,ind()),
'MAYÚSCULAS':t=>t.toUpperCase(),
'minúsculas':t=>t.toLowerCase(),
'camelCase':t=>t.toLowerCase().replace(/[^a-z0-9ñ]+(.)/gi,(_,c)=>c.toUpperCase()),
'snake_case':t=>t.replace(/([a-z])([A-Z])/g,'$1_$2').replace(/[\s-]+/g,'_').toLowerCase(),
'Base64 · codificar':t=>btoa(unescape(encodeURIComponent(t))),
'Base64 · decodificar':t=>decodeURIComponent(escape(atob(t.trim()))),
'URL · codificar':encodeURIComponent,
'URL · decodificar':decodeURIComponent,
'Escapar como cadena JSON':t=>JSON.stringify(t).slice(1,-1),
'Desescapar cadena JSON':t=>JSON.parse('"'+t.replace(/"/g,'\\"')+'"'),
'Escapar HTML':E};
$('#etools').add(new Option('🛠 Herramientas…',''));Object.keys(TOOLS).forEach(k=>$('#etools').add(new Option(k,k)));
$('#etools').onchange=e=>{const k=e.target.value;e.target.value='';if(!k)return;
 const v=ta.value,sel=ta.selectionStart!==ta.selectionEnd,a=sel?ta.selectionStart:0,b=sel?ta.selectionEnd:v.length;
 try{const r=TOOLS[k](v.slice(a,b));put(a,b,r,a,a+r.length);toast(k+' ✓')}catch(err){toast('No se pudo aplicar: '+String(err.message).slice(0,50))}};

// ---------- Formatear / minificar en el sitio ----------
async function fmt(mode){
 const M={javascript:'javascript',typescript:'javascript',json:'json',css:'css',html:'html',xml:'xml',sql:'sql'}[L()[0]],v=ta.value,sel=ta.selectionStart!==ta.selectionEnd,a=sel?ta.selectionStart:0,b=sel?ta.selectionEnd:v.length,t=v.slice(a,b);
 if(!t.trim())return;
 if(!M){if(mode==='minify')return toast('Minificar no está disponible para '+L()[1]);
  put(a,b,t.replace(/\r\n?/g,'\n').replace(/[ \t]+$/gm,'').replace(/\n*$/,'\n'));return toast('Espacios y saltos de línea normalizados')}
 const sv={...S};S.lang=M;S.mode=mode;
 try{const r=await transform(t);put(a,b,r,a,a+r.length);toast(mode==='minify'?'Código minificado ✓':'Código formateado ✓')}
 catch(err){toast('Error: '+String(err.message||err).slice(0,70))}finally{Object.assign(S,sv)}
}
$('#efmt').onclick=()=>fmt('beautify');$('#emin').onclick=()=>fmt('minify');

// ---------- Buscar y reemplazar ----------
function mk(){const q=$('#fq').value;if(!q)return null;try{return new RegExp($('#frx').checked?q:q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'+($('#fcs').checked?'':'i'))}catch(e){return null}}
function matches(){const r=mk(),out=[];if(!r)return out;let m;while((m=r.exec(ta.value))){if(!m[0]){r.lastIndex++;continue}out.push([m.index,m.index+m[0].length]);if(out.length>5000)break}return out}
function paintFind(){
 if($('#fbar').hidden){fl.innerHTML='';return}
 const ms=matches(),v=ta.value;let h='',p=0;
 ms.forEach(([x,y],i)=>{h+=E(v.slice(p,x))+`<mark${i===fi?' class="cur"':''}>${E(v.slice(x,y))}</mark>`;p=y});
 fl.innerHTML=h+E(v.slice(p))+'\n';
 $('#fcnt').textContent=ms.length?(fi>=0?fi+1+' / ':'')+ms.length:($('#fq').value?'Sin resultados':'');
}
function reveal(i){const ln=ta.value.slice(0,i).split('\n').length-1,lh=parseFloat(getComputedStyle(ta).lineHeight),y=ln*lh+12;if(y<ta.scrollTop||y>ta.scrollTop+ta.clientHeight-2*lh)ta.scrollTop=Math.max(0,y-ta.clientHeight/2)}
function step(d){
 const ms=matches();if(!ms.length){fi=-1;return paintFind()}
 const p=d>0?ta.selectionEnd:ta.selectionStart;
 fi=d>0?ms.findIndex(x=>x[0]>=p):ms.reduce((r,x,j)=>x[0]<p?j:r,-1);
 if(fi<0)fi=d>0?0:ms.length-1;
 const[x,y]=ms[fi];ta.setSelectionRange(x,y);reveal(x);paintFind();
}
function openFind(){
 const bar=$('#fbar');bar.hidden=false;const s=ta.value.slice(ta.selectionStart,ta.selectionEnd);
 if(s&&!s.includes('\n'))$('#fq').value=s;$('#fq').focus();$('#fq').select();paintFind();
}
function closeFind(){$('#fbar').hidden=true;fi=-1;paintFind();ta.focus()}
$('#efind').onclick=()=>$('#fbar').hidden?openFind():closeFind();
$('#fq').addEventListener('input',()=>{fi=-1;paintFind()});
$('#fq').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();step(e.shiftKey?-1:1)}if(e.key==='Escape')closeFind()});
$('#frp').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#fone').click()}if(e.key==='Escape')closeFind()});
['fcs','frx'].forEach(i=>$('#'+i).onchange=()=>{fi=-1;paintFind()});
$('#fnext').onclick=()=>step(1);$('#fprev').onclick=()=>step(-1);
$('#fone').onclick=()=>{
 const ms=matches();if(!ms.length)return;if(fi<0||!ms[fi])return step(1);
 const[x,y]=ms[fi],r=mk(),seg=ta.value.slice(x,y),rp=$('#frp').value,t=$('#frx').checked?seg.replace(new RegExp(r.source,r.flags.replace('g','')),rp):rp;
 put(x,y,t,x+t.length);fi=-1;step(1);
};
$('#fall').onclick=()=>{
 const r=mk(),n=matches().length;if(!r||!n)return;const rp=$('#frp').value;
 put(0,ta.value.length,ta.value.replace(r,$('#frx').checked?rp:()=>rp),0);fi=-1;paintFind();toast(n+' reemplazos realizados');
};
function goto(){
 const n=parseInt(prompt('Ir a la línea:'));if(!(n>0))return;
 const ls=ta.value.split('\n'),i=ls.slice(0,Math.min(n,ls.length)-1).reduce((s,x)=>s+x.length+1,0);
 ta.focus();ta.setSelectionRange(i,i);reveal(i);
}
$('#epos').onclick=goto;

// ---------- Vista previa ----------
function pv(){
 if(!pvOn)return;const l=L()[0],v=ta.value;let d;
 if(l==='html')d=v;
 else if(l==='xml'&&/<svg/i.test(v))d='<body style="margin:0;display:grid;place-items:center;height:100vh">'+v;
 else if(l==='javascript')d='<body style="font:13px ui-monospace,monospace;padding:12px;white-space:pre-wrap"><div id=o></div><script>const o=document.getElementById("o"),w=(c,a)=>o.append(Object.assign(document.createElement("div"),{style:"color:"+c,textContent:a.map(x=>typeof x=="object"?JSON.stringify(x):String(x)).join(" ")}));console.log=(...a)=>w("inherit",a);console.warn=(...a)=>w("#d97706",a);console.error=(...a)=>w("#e11d48",a);onerror=m=>w("#e11d48",["Error: "+m])<\/script><script>'+v.replace(/<\/script/gi,'<\\/script')+'<\/script>';
 else d='<body style="font:14px system-ui;padding:16px;color:#666">La vista previa está disponible para HTML, SVG y JavaScript.';
 $('#pv').srcdoc=d;
}
$('#eprev').onclick=()=>{pvOn=!pvOn;$('#pv').hidden=!pvOn;$('#egrid').classList.toggle('pv',pvOn);$('#eprev').textContent=pvOn?'■ Cerrar vista':'▶ Vista previa';pv()};

// ---------- Comentar ----------
function cmt(){
 const c=CM[L()[3]];if(!c)return;const v=ta.value,s=ta.selectionStart,en=ta.selectionEnd,a=ls0(v,s);let b=v.indexOf('\n',en);if(b<0)b=v.length;
 const ls=v.slice(a,b).split('\n'),t0=c[0].trim(),on=ls.every(x=>!x.trim()||x.trimStart().startsWith(t0));
 const n=ls.map(x=>{if(!x.trim())return x;const w=x.match(/^\s*/)[0],r=x.slice(w.length);
  if(on){let t=r.startsWith(c[0])?r.slice(c[0].length):r.slice(t0.length);if(c[1]&&t.trimEnd().endsWith(c[1].trim()))t=t.trimEnd().slice(0,-c[1].trim().length).trimEnd();return w+t}
  return w+c[0]+r+c[1]}).join('\n');
 put(a,b,n,a,a+n.length);
}
const ls0=(v,i)=>i<=0?0:v.lastIndexOf('\n',i-1)+1;

// ---------- Teclado del editor ----------
ta.addEventListener('keydown',e=>{
 const v=ta.value,s=ta.selectionStart,en=ta.selectionEnd,k=e.key,kl=k.toLowerCase(),mod=e.ctrlKey||e.metaKey,I=ind(),a=ls0(v,s);
 let b=v.indexOf('\n',en);if(b<0)b=v.length;
 if(mod&&!e.shiftKey&&!e.altKey){
  if(k==='/'){e.preventDefault();return cmt()}
  if(kl==='d'){e.preventDefault();return put(b,b,'\n'+v.slice(a,b),s+b-a+1,en+b-a+1)}
  if(kl==='f'||kl==='h'){e.preventDefault();return openFind()}
  if(kl==='g'){e.preventDefault();return goto()}
  if(kl==='s'){e.preventDefault();return dl()}
 }
 if(mod&&e.shiftKey&&kl==='k'){e.preventDefault();return b>=v.length&&a>0?put(a-1,b,'',a-1):put(a,Math.min(b+1,v.length),'',a)}
 if(e.altKey&&e.shiftKey&&kl==='f'){e.preventDefault();return fmt('beautify')}
 if(k==='F3'){e.preventDefault();return step(e.shiftKey?-1:1)}
 if(e.altKey&&!mod&&(k==='ArrowUp'||k==='ArrowDown')){
  e.preventDefault();
  if(k==='ArrowUp'){if(!a)return;const pa=ls0(v,a-1),pl=v.slice(pa,a-1),d=pl.length+1;return put(pa,b,v.slice(a,b)+'\n'+pl,s-d,en-d)}
  if(b>=v.length)return;let nb=v.indexOf('\n',b+1);if(nb<0)nb=v.length;const nl=v.slice(b+1,nb),d=nl.length+1;
  return put(a,nb,nl+'\n'+v.slice(a,b),s+d,en+d);
 }
 if(k==='Tab'&&!mod){
  e.preventDefault();if(s===en&&!e.shiftKey)return put(s,en,I);
  const n=v.slice(a,b).split('\n').map(x=>e.shiftKey?x.replace(new RegExp('^(\\t| {1,'+I.length+'})'),''):I+x).join('\n');
  return put(a,b,n,a,a+n.length);
 }
 if(k==='Enter'&&!mod&&!e.shiftKey&&!e.altKey){
  e.preventDefault();const before=v.slice(a,s),ws=before.match(/^\s*/)[0],p=v[s-1],n=v[s];
  if(p&&'{[('.includes(p)&&n===PR[p])return put(s,en,'\n'+ws+I+'\n'+ws,s+1+ws.length+I.length);
  const open=/[{\[(]\s*$/.test(before)||(L()[3]==='hash'&&/:\s*$/.test(before));
  return put(s,en,'\n'+ws+(open?I:''));
 }
 if(!mod&&!e.altKey){
  if(k==='Backspace'&&s===en&&s>0&&PR[v[s-1]]===v[s]){e.preventDefault();return put(s-1,s+1,'',s-1)}
  if(PR[k]){
   const plain=L()[3]==='plain';
   if(s!==en&&!(plain&&!'([{'.includes(k))){e.preventDefault();return put(s,en,k+v.slice(s,en)+PR[k],s+1,en+1)}
   if(k===PR[k]&&v[s]===k){e.preventDefault();return ta.setSelectionRange(s+1,s+1)}
   if(k===PR[k]&&(plain||/\w/.test(v[s-1]||'')))return;
   e.preventDefault();return put(s,en,k+PR[k],s+1);
  }
  if(')]}'.includes(k)&&s===en&&v[s]===k){e.preventDefault();return ta.setSelectionRange(s+1,s+1)}
 }
});

// ---------- Vistas y enlaces con el formateador ----------
function setView(v){
 $('#vf').hidden=v==='edit';$('#ve').hidden=v!=='edit';
 document.querySelectorAll('#view button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
 store.set('ecode-view',v);const el=$(v==='edit'?'#ve':'#vf');el.classList.remove('fade');void el.offsetWidth;el.classList.add('fade');
 if(v==='edit'){render.n=0;render();ta.focus({preventScroll:true})}
}
document.querySelectorAll('#view button').forEach(b=>b.onclick=()=>setView(b.dataset.v));
$('#toedit').onclick=()=>{const v=$('#out').value||$('#in').value;if(!v)return toast('No hay código para enviar');newF('ecode.'+(LG.find(l=>l[0]===S.lang)||[,,'txt'])[2],v,S.lang);setView('edit')};
['mangle','dropc'].forEach(i=>$('#'+i).addEventListener('change',go));
$('#keysb').onclick=()=>$('#keys').showModal();

ta.value=F().code;$('#elang').value=F().lang;tabsR();
setView(store.get('ecode-view','format'));
})();
