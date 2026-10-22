const $=s=>document.querySelector(s);
const LANGS={json:['JSON','json'],javascript:['JavaScript','js'],css:['CSS','css'],html:['HTML','html'],xml:['XML','xml'],sql:['SQL','sql']};
const SAMPLES={
json:'{"nombre":"eCode","version":2,"tags":["dev","tools"],"config":{"tema":"auto","activo":true}}',
javascript:'// saludo\nfunction saludar(nombre){const msg="Hola, "+nombre;/* comentario */console.log(msg);return msg}\nconst r=[1,2,3].map(x=>x*2);',
css:'/* estilo */\n.card{margin:0 auto;padding:10px 20px;background:#FFFFFF}\n.card:hover{transform:scale(1.05)}',
html:'<!-- hola --><div class="a"><ul><li>Uno</li><li>Dos</li></ul><p>Texto   de   prueba</p></div>',
xml:'<?xml version="1.0"?><root><item id="1"><name>A</name></item><item id="2"><name>B</name></item></root>',
sql:'select u.id,u.name,count(o.id) as total from users u left join orders o on o.user_id=u.id where u.active=1 group by u.id,u.name order by total desc;'};
let S={lang:'json',mode:'beautify',theme:'light'};
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

// Tabs
const tabs=$('#tabs');
Object.entries(LANGS).forEach(([k,[n]])=>{const b=document.createElement('button');b.className='tab';b.textContent=n;b.dataset.l=k;b.onclick=()=>setLang(k);tabs.appendChild(b)});
function setLang(l){S.lang=l;document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.l===l));$('#sort').parentElement.style.opacity=l==='json'?1:.4;go()}
document.querySelectorAll('#mode button').forEach(b=>b.onclick=()=>{S.mode=b.dataset.m;document.querySelectorAll('#mode button').forEach(x=>x.classList.toggle('on',x===b));go()});

// Theme
function applyTheme(t){S.theme=t;document.documentElement.dataset.theme=t;$('#theme').textContent=t==='dark'?'☀️':'🌙';store.set('ecode-theme',t)}
applyTheme(store.get('ecode-theme',matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
$('#theme').onclick=()=>applyTheme(S.theme==='dark'?'light':'dark');

// Utils
const bytes=n=>n<1024?n+' B':(n/1024).toFixed(2)+' KB';
const ind=()=>{const v=$('#indent').value;return v==='tab'?'\t':' '.repeat(+v)};
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),1800)}
function animNum(el,to,fmt){const from=el._v||0;el._v=to;const t0=performance.now();(function f(t){const p=Math.min(1,(t-t0)/500),e=1-Math.pow(1-p,3);el.textContent=fmt(from+(to-from)*e);if(p<1)requestAnimationFrame(f)})(t0)}
const sortKeys=o=>Array.isArray(o)?o.map(sortKeys):o&&typeof o==='object'?Object.keys(o).sort().reduce((a,k)=>(a[k]=sortKeys(o[k]),a),{}):o;

// Minifiers (own, string-aware)
function stripJsComments(s){let o='',i=0,q=null;while(i<s.length){const c=s[i],n=s[i+1];
 if(q){o+=c;if(c==='\\'){o+=s[++i]||''}else if(c===q)q=null;i++;continue}
 if(c==='"'||c==="'"||c==='`'){q=c;o+=c;i++;continue}
 if(c==='/'&&n==='/'){while(i<s.length&&s[i]!=='\n')i++;continue}
 if(c==='/'&&n==='*'){i+=2;while(i<s.length&&!(s[i]==='*'&&s[i+1]==='/'))i++;i+=2;continue}
 o+=c;i++}return o}
const minCss=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').replace(/\s*([{}:;,>])\s*/g,'$1').replace(/;}/g,'}').trim();
const minHtml=s=>s.replace(/<!--[\s\S]*?-->/g,'').replace(/>\s+</g,'><').replace(/\s{2,}/g,' ').trim();
const minSql=s=>s.replace(/--.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').replace(/\s*([(),=])\s*/g,'$1').trim();
function braceFormat(s){let d=0,o='';const I=ind();s.replace(/\s+/g,' ').split(/([{};])/).forEach(p=>{p=p.trim();if(!p)return;if(p==='}')d=Math.max(0,d-1);o+=(p==='}'||p===';'?'':I.repeat(d))+p+(p==='{'||p==='}'||p===';'?'\n':'');if(p==='{')d++;});return o}

async function transform(code){
 const {lang,mode}=S,I=ind(),has=n=>typeof window[n]!=='undefined';
 if(lang==='json'){const o=JSON.parse(code);const v=$('#sort').checked?sortKeys(o):o;return mode==='minify'?JSON.stringify(v):JSON.stringify(v,null,I==='\t'?'\t':I.length)}
 if(lang==='javascript'){
  if(mode==='minify'){if(has('Terser')){const r=await Terser.minify(code,{compress:{drop_console:$('#dropc').checked},mangle:$('#mangle').checked});if(r.error)throw r.error;return r.code}return stripJsComments(code).split('\n').map(l=>l.trim()).filter(Boolean).join('\n')}
  return has('js_beautify')?js_beautify(code,{indent_size:I==='\t'?1:I.length,indent_with_tabs:I==='\t'}):braceFormat(code)}
 if(lang==='css'){return mode==='minify'?minCss(code):has('css_beautify')?css_beautify(code,{indent_size:I==='\t'?1:I.length,indent_with_tabs:I==='\t'}):braceFormat(code)}
 if(lang==='html'||lang==='xml'){return mode==='minify'?minHtml(code):has('html_beautify')?html_beautify(code,{indent_size:I==='\t'?1:I.length,indent_with_tabs:I==='\t'}):code}
 if(lang==='sql'){return mode==='minify'?minSql(code):has('sqlFormatter')?sqlFormatter.format(code,{tabWidth:I==='\t'?2:I.length,useTabs:I==='\t',keywordCase:'upper'}):code}
}

async function gz(s){try{return(await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()).byteLength}catch(e){return null}}
let busy=0;
async function go(){
 const code=$('#in').value,st=$('#status');
 if(!code.trim()){$('#out').value='';st.className='status';['s1','s2'].forEach(i=>animNum($('#'+i),0,bytes));$('#m').style.width=0;return}
 const t0=performance.now(),id=++busy;
 try{
  const r=await transform(code);if(id!==busy)return;
  $('#out').value=r;$('#out').classList.remove('spin');void $('#out').offsetWidth;$('#out').classList.add('spin');
  const a=new Blob([code]).size,b=new Blob([r]).size,diff=a?(b-a)/a*100:0;
  animNum($('#s1'),a,bytes);animNum($('#s2'),b,bytes);
  animNum($('#s3'),diff,v=>(v>0?'+':'')+v.toFixed(1)+'%');
  $('#m').style.width=Math.min(100,Math.abs(diff))+'%';
  $('#s4').textContent=code.split('\n').length+' → '+r.split('\n').length;
  $('#s5').textContent=Math.round(performance.now()-t0)+' ms';
  gz(r).then(n=>$('#s6').textContent=n==null?'—':bytes(n));
  st.className='status ok';st.textContent='✓ '+LANGS[S.lang][0]+' '+(S.mode==='minify'?'minificado':'embellecido')+' correctamente.';
 }catch(e){
  st.className='status bad';st.textContent='✗ Error: '+(e.message||e);void st.offsetWidth;
 }
}
let tm;$('#in').addEventListener('input',()=>{if(!$('#live').checked)return;clearTimeout(tm);tm=setTimeout(go,250)});
['indent','sort'].forEach(i=>$('#'+i).addEventListener('change',go));
$('#run').onclick=()=>{go();saveHist()};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();go();saveHist()}});
$('#in').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const t=e.target,s=t.selectionStart;t.setRangeText('  ',s,t.selectionEnd,'end')}});

// Actions
$('#sample').onclick=()=>{$('#in').value=SAMPLES[S.lang];go()};
$('#clear').onclick=()=>{$('#in').value='';go()};
$('#copy').onclick=async()=>{const v=$('#out').value;if(!v)return;try{await navigator.clipboard.writeText(v)}catch(e){$('#out').select();document.execCommand('copy')}toast('Copiado al portapapeles ✓')};
$('#swap').onclick=()=>{if(!$('#out').value)return;$('#in').value=$('#out').value;go();toast('Resultado movido a la entrada')};
$('#dl').onclick=()=>{const v=$('#out').value;if(!v)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([v]));a.download='ecode-'+(S.mode==='minify'?'min':'pretty')+'.'+LANGS[S.lang][1];a.click();toast('Descarga iniciada')};
$('#upload').onclick=()=>$('#file').click();
function readFile(f){if(!f)return;const ext=f.name.split('.').pop().toLowerCase();const map={json:'json',js:'javascript',mjs:'javascript',css:'css',html:'html',htm:'html',xml:'xml',sql:'sql'};const r=new FileReader();r.onload=()=>{$('#in').value=r.result;setLang(map[ext]||S.lang);toast('Archivo cargado: '+f.name)};r.readAsText(f)}
$('#file').onchange=e=>readFile(e.target.files[0]);
const dz=$('#dz');['dragover','dragenter'].forEach(v=>dz.addEventListener(v,e=>{e.preventDefault();dz.classList.add('drop')}));
['dragleave','drop'].forEach(v=>dz.addEventListener(v,e=>{e.preventDefault();dz.classList.remove('drop')}));
dz.addEventListener('drop',e=>readFile(e.dataTransfer.files[0]));

// Autodetect
function detect(c){c=c.trim();if(!c)return null;if(/^[\[{]/.test(c)){try{JSON.parse(c);return'json'}catch(e){}}
 if(/^<\?xml/i.test(c))return'xml';if(/^<[a-z!]/i.test(c))return/<(div|p|html|body|span|ul|a)\b/i.test(c)?'html':'xml';
 if(/^\s*(select|insert|update|delete|create|alter|with|drop)\b/i.test(c))return'sql';
 if(/[^{};]+\{[^{}]*:[^{}]*;?[^{}]*\}/.test(c)&&!/\b(function|const|let|var|=>)\b/.test(c))return'css';return'javascript'}
$('#auto').onclick=()=>{const d=detect($('#in').value);if(!d)return toast('Pega código primero');setLang(d);toast('Detectado: '+LANGS[d][0])};
$('#in').addEventListener('paste',()=>setTimeout(()=>{const d=detect($('#in').value);if(d&&d!==S.lang){setLang(d);toast('Detectado: '+LANGS[d][0])}},0));

// History
function renderHist(){const h=store.get('ecode-hist',[]);const el=$('#hist');el.innerHTML='';if(!h.length){el.innerHTML='<span class="sub">Aún no hay elementos. Pulsa “Procesar” para guardar.</span>';return}
 h.forEach(x=>{const c=document.createElement('div');c.className='chip';c.textContent=LANGS[x.l][0]+' · '+x.c.slice(0,28).replace(/\s+/g,' ');c.onclick=()=>{$('#in').value=x.c;setLang(x.l)};el.appendChild(c)})}
function saveHist(){const c=$('#in').value;if(!c.trim())return;let h=store.get('ecode-hist',[]).filter(x=>x.c!==c);h.unshift({l:S.lang,c:c.slice(0,20000)});store.set('ecode-hist',h.slice(0,8));renderHist()}
$('#hclr').onclick=()=>{store.set('ecode-hist',[]);renderHist()};
renderHist();

$('#in').value=SAMPLES.json;setLang('json');
