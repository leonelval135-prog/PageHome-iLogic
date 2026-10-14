const $=s=>document.querySelector(s), CHECKOUT_URL='https://buy.stripe.com/TU_ENLACE'; // ← reemplaza con tu Payment Link
const VIEWS={edit:['✍️','Editor'],merge:['🔗','Unir PDFs'],split:['✂️','Dividir / Extraer'],img:['🖼️','Imágenes a PDF'],gen:['📝','Crear Word'],read:['👁️','Visor de documentos'],pro:['⭐','Funciones PRO']};
const nav=$('#nav');
for(const k in VIEWS){const b=document.createElement('button');b.dataset.k=k;b.className='nv';b.innerHTML=`<span>${VIEWS[k][0]}</span><span class="hidden md:inline">${VIEWS[k][1]}</span>${k==='pro'?'<span class="pro hidden md:inline">PRO</span>':''}`;b.onclick=()=>show(k);nav.append(b)}
function show(k){document.querySelectorAll('[data-view]').forEach(s=>s.classList.toggle('hidden',s.dataset.view!==k));nav.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));const t=$('#title');t.textContent=VIEWS[k][1];t.classList.remove('tt');void t.offsetWidth;t.classList.add('tt')}
const toast=(m,err)=>{const d=document.createElement('div');d.className='toast'+(err?' err':'');d.textContent=m;$('#toasts').append(d);setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),350)},3200)};
let _pj;const pdfjs=()=>_pj??=(async()=>{const t=await (await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js')).text();pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([t],{type:'text/javascript'}));return pdfjsLib})();
async function pdfDoc(f){return (await pdfjs()).getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise}
async function pdfPages(f){const d=await pdfDoc(f),o=[];for(let i=1;i<=d.numPages;i++)o.push((await (await d.getPage(i)).getTextContent()).items.map(x=>x.str+(x.hasEOL?'\n':' ')).join(''));return o}
const pdfText=async f=>(await pdfPages(f)).join('\n');
function summarize(t,n=5){const s=t.replace(/\s+/g,' ').match(/[^.!?]+[.!?]/g)||[t],W=x=>x.toLowerCase().match(/[a-záéíóúñü]{4,}/g)||[],f={};
  W(t).forEach(w=>f[w]=(f[w]||0)+1);
  return s.map((x,i)=>({x:x.trim(),i,sc:W(x).reduce((a,w)=>a+f[w],0)/Math.sqrt(x.length)})).sort((a,b)=>b.sc-a.sc).slice(0,n).sort((a,b)=>a.i-b.i).map(o=>'• '+o.x).join('\n')}
let rot=0;$('#theme').onclick=()=>{document.documentElement.classList.toggle('dark');$('#ti').style.transform=`rotate(${rot+=180}deg)`};
if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark');
$('#gDate').valueAsDate=new Date();

const busy=(on,t='Procesando…')=>{$('#loader').classList.toggle('hidden',!on);$('#ltxt').textContent=t;$('#bar').style.width='0'};
const prog=p=>$('#bar').style.width=p+'%';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const dl=(data,name,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();toast('Descarga lista ✔')};
const buf=f=>f.arrayBuffer();
const fmt=n=>n>1e6?(n/1e6).toFixed(1)+' MB':Math.round(n/1e3)+' KB';
async function run(txt,fn){busy(true,txt);try{await fn()}catch(e){toast('Error: '+e.message,1)}busy(false)}

// Drag & Drop genérico
function dropzone(el,cb){
  const multi=el.dataset.multi,inp=document.createElement('input');
  inp.type='file';inp.hidden=true;inp.accept=el.dataset.accept;inp.multiple=!!multi;el.append(inp);
  el.insertAdjacentHTML('afterbegin',`<p><span class="ic">📂</span>Arrastra ${multi?'tus archivos':'tu archivo'} aquí o haz clic<br><span class="opacity-60">${el.dataset.accept}</span></p>`);
  el.onclick=e=>{if(e.target!==inp)inp.click()};
  inp.onchange=()=>{cb([...inp.files]);inp.value=''};
  el.ondragover=e=>{e.preventDefault();el.classList.add('over')};
  el.ondragleave=()=>el.classList.remove('over');
  el.ondrop=e=>{e.preventDefault();el.classList.remove('over');cb([...e.dataTransfer.files])};
}
// Lista reordenable
function renderList(ul,arr){
  ul.innerHTML='';arr.forEach((f,i)=>{const li=document.createElement('li');
    li.className='flex items-center gap-2 glass rounded-xl px-3 py-2 text-sm';
    li.innerHTML=`<span class="flex-1 truncate">${i+1}. ${f.name.replace(/</g,'&lt;')} <span class="opacity-50">${fmt(f.size)}</span></span>
    <button data-a="u">↑</button><button data-a="d">↓</button><button data-a="x" class="text-red-500">✕</button>`;
    li.onclick=e=>{const a=e.target.dataset.a;if(!a)return;
      if(a==='x')arr.splice(i,1);
      else{const j=a==='u'?i-1:i+1;if(j>=0&&j<arr.length)[arr[i],arr[j]]=[arr[j],arr[i]]}
      renderList(ul,arr)};
    ul.append(li)})
}

// ---- Unir PDFs
const mergeFiles=[];
dropzone($('#dzMerge'),fs=>{mergeFiles.push(...fs);renderList($('#mergeList'),mergeFiles)});
const doMerge=()=>mergeFiles.length<2?toast('Sube al menos 2 PDFs'):run('Uniendo PDFs…',async()=>{
  const out=await PDFLib.PDFDocument.create();
  for(const [i,f] of mergeFiles.entries()){const src=await PDFLib.PDFDocument.load(await buf(f));
    (await out.copyPages(src,src.getPageIndices())).forEach(p=>out.addPage(p));prog((i+1)/mergeFiles.length*100)}
  dl(await out.save(),'unido.pdf','application/pdf')});

// ---- Dividir
let splitPdf=null;
dropzone($('#dzSplit'),fs=>run('Leyendo PDF…',async()=>{splitPdf=await PDFLib.PDFDocument.load(await buf(fs[0]));
  $('#splitInfo').textContent=`${fs[0].name}: ${splitPdf.getPageCount()} páginas`}));
const doSplit=()=>!splitPdf?toast('Sube un PDF'):run('Extrayendo…',async()=>{
  const n=splitPdf.getPageCount(),idx=[];
  for(const part of $('#range').value.split(',')){const m=part.trim().match(/^(\d+)(?:-(\d+))?$/);if(!m)throw Error('Rango inválido: '+part);
    const a=+m[1],b=+(m[2]||m[1]);if(a<1||b>n||a>b)throw Error('Fuera de rango (1-'+n+')');for(let i=a;i<=b;i++)idx.push(i-1)}
  const out=await PDFLib.PDFDocument.create();(await out.copyPages(splitPdf,idx)).forEach(p=>out.addPage(p));
  dl(await out.save(),'extracto.pdf','application/pdf')});

// ---- Imágenes a PDF
const imgFiles=[];
dropzone($('#dzImg'),fs=>{imgFiles.push(...fs);renderList($('#imgList'),imgFiles)});
async function webpToPng(f){const bmp=await createImageBitmap(f),c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;c.getContext('2d').drawImage(bmp,0,0);
  return new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/png'))).arrayBuffer())}
const doImg=()=>!imgFiles.length?toast('Sube imágenes'):run('Creando PDF…',async()=>{
  const pdf=await PDFLib.PDFDocument.create();
  for(const [i,f] of imgFiles.entries()){let img;
    if(/jpe?g/i.test(f.type))img=await pdf.embedJpg(await buf(f));
    else if(/png/i.test(f.type))img=await pdf.embedPng(await buf(f));
    else img=await pdf.embedPng(await webpToPng(f));
    pdf.addPage([img.width,img.height]).drawImage(img,{x:0,y:0,width:img.width,height:img.height});prog((i+1)/imgFiles.length*100)}
  dl(await pdf.save(),'imagenes.pdf','application/pdf')});

// ---- Generar DOCX
const doGen=()=>run('Generando Word…',async()=>{
  const {Document,Paragraph,TextRun,HeadingLevel,Packer,AlignmentType}=docx,v=id=>$(id).value;
  const kids=[new Paragraph({text:v('#gTitle')||'Sin título',heading:HeadingLevel.TITLE,alignment:AlignmentType.CENTER}),
    new Paragraph({children:[new TextRun({text:'Autor: ',bold:true}),new TextRun(v('#gName')),new TextRun({text:'   Fecha: ',bold:true}),new TextRun(v('#gDate'))],spacing:{after:300}}),
    ...v('#gBody').split('\n').map(t=>new Paragraph({children:[new TextRun({text:t,size:24})],spacing:{after:160}}))];
  dl(await Packer.toBlob(new Document({sections:[{children:kids}]})),'documento.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document')});

// ---- PRO
const PRO=[
{id:'p2w',i:'🔄',t:'PDF a Word',d:'Extrae el texto a un .docx. Con tu endpoint API conserva el formato completo.',
 ui:`<input id="ep" class="inp mb-3" placeholder="Endpoint API (ConvertAPI / Supabase Edge Function) — opcional">`,
 go:async f=>{const ep=$('#ep').value.trim(),name=f.name.replace(/\.pdf$/i,'')+'.docx';
  if(ep){const fd=new FormData();fd.append('file',f);const r=await fetch(ep,{method:'POST',body:fd});if(!r.ok)throw Error('HTTP '+r.status);dl(await r.blob(),name);return 'Conversión por API completada ✔'}
  const {Document,Paragraph,Packer,TextRun}=docx,pages=await pdfPages(f);
  if(!pages.join('').trim())throw Error('El PDF no tiene texto seleccionable (¿escaneado?)');
  const kids=pages.flatMap((t,i)=>t.split('\n').filter(x=>x.trim()).map((l,j)=>new Paragraph({children:[new TextRun(l.trim())],pageBreakBefore:i>0&&j===0})));
  dl(await Packer.toBlob(new Document({sections:[{children:kids}]})),name);return `Convertido localmente: ${pages.length} páginas, solo texto. Para conservar formato, añade un endpoint.`}},
{id:'ai',i:'🤖',t:'Resumen con IA',d:'Resumen local instantáneo o con tu API Key de OpenAI.',
 ui:`<input id="key" type="password" class="inp mb-3" placeholder="API Key de OpenAI (opcional; sin ella, resumen local)">`,
 go:async f=>{const t=/\.pdf$/i.test(f.name)?await pdfText(f):(await mammoth.extractRawText({arrayBuffer:await buf(f)})).value;
  if(!t.trim())throw Error('No se encontró texto en el archivo');
  const k=$('#key').value.trim();if(!k)return '📌 Resumen (local, extractivo):\n'+summarize(t);
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+k},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:'Resume en español en viñetas:\n'+t.slice(0,12000)}]})});
  const j=await r.json();if(!r.ok)throw Error(j.error?.message||r.status);return '🤖 '+j.choices[0].message.content}},
{id:'cmp',i:'📉',t:'Compresión extrema',d:'Reduce MBs rasterizando páginas a la resolución y calidad que elijas.',
 ui:`<label class="text-sm">Resolución: <b id="dpiV">110</b> DPI</label><input id="dpi" type="range" min="50" max="200" value="110" class="w-full mb-2" oninput="dpiV.textContent=this.value"><label class="text-sm">Calidad JPEG: <b id="qV">60</b>%</label><input id="qual" type="range" min="20" max="95" value="60" class="w-full mb-3" oninput="qV.textContent=this.value">`,
 go:async f=>{const d=await pdfDoc(f),dpi=+$('#dpi').value,q=+$('#qual').value/100,out=await PDFLib.PDFDocument.create();
  for(let i=1;i<=d.numPages;i++){const p=await d.getPage(i),vp=p.getViewport({scale:dpi/72}),v1=p.getViewport({scale:1}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;
   await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
   const img=await out.embedJpg(await (await new Promise(r=>c.toBlob(r,'image/jpeg',q))).arrayBuffer());
   out.addPage([v1.width,v1.height]).drawImage(img,{x:0,y:0,width:v1.width,height:v1.height});prog(i/d.numPages*100)}
  const b=await out.save();if(b.length>=f.size)return `El resultado (${fmt(b.length)}) no es menor que el original (${fmt(f.size)}). Baja DPI o calidad.`;
  dl(b,f.name.replace(/\.pdf$/i,'')+'-comprimido.pdf','application/pdf');return `${fmt(f.size)} → ${fmt(b.length)} (−${Math.round(100-b.length/f.size*100)}%). Nota: el texto pasa a imagen.`}},
{id:'enc',i:'✍️',t:'Firma y sello en PDF',d:'Estampa tu firma, fecha y hora en la última página. (El cifrado con contraseña requiere backend.)',
 ui:`<input id="sg" class="inp mb-3" placeholder="Tu nombre para la firma">`,
 go:async f=>{const nm=$('#sg').value.trim();if(!nm)throw Error('Escribe tu nombre');
  const d=await PDFLib.PDFDocument.load(await buf(f)),it=await d.embedFont(PDFLib.StandardFonts.TimesRomanItalic),sm=await d.embedFont(PDFLib.StandardFonts.Helvetica),pg=d.getPages().at(-1),x=pg.getWidth()-230,c=PDFLib.rgb(.25,.22,.8);
  pg.drawRectangle({x:x-8,y:34,width:216,height:62,borderColor:c,borderWidth:1});
  pg.drawText(nm,{x,y:62,size:22,font:it,color:PDFLib.rgb(.1,.1,.5)});
  pg.drawText('Firmado · '+new Date().toLocaleString('es'),{x,y:44,size:7,font:sm,color:c});
  dl(await d.save(),f.name.replace(/\.pdf$/i,'')+'-firmado.pdf','application/pdf');return 'Documento firmado ✔'}}];
$('#proGrid').innerHTML=PRO.map(p=>`<button onclick="openPro('${p.id}')" class="text-left glass rounded-2xl p-5 hover:-translate-y-1.5 hover:shadow-2xl transition duration-300"><div class="text-3xl">${p.i}</div><h3 class="font-bold mt-2">${p.t}<span class="pro">PRO</span></h3><p class="text-sm opacity-70 mt-1">${p.d}</p></button>`).join('');
let proFile=null;
function openPro(id){const p=PRO.find(x=>x.id===id);proFile=null;
  $('#mbody').innerHTML=`<h2 class="text-xl font-bold mb-1">${p.i} ${p.t}<span class="pro">PRO</span></h2><p class="text-sm opacity-70 mb-4">${p.d}</p>${p.ui}
  <div class="dz mb-3" id="dzPro" data-accept=".pdf,.docx"></div><p id="pf" class="text-sm mb-2"></p>
  <pre id="pres" class="hidden whitespace-pre-wrap text-sm bg-slate-100 dark:bg-slate-800 rounded-lg p-3 mb-3"></pre>
  <div class="flex gap-2"><button class="btn" id="pgo">Ejecutar</button><button class="px-4" onclick="closeModal()">Cerrar</button></div>
  <p class="text-xs mt-3 opacity-60"><a href="#" class="text-indigo-500 underline" onclick="openPricing();return false">Ver planes</a></p>`;
  dropzone($('#dzPro'),fs=>{proFile=fs[0];$('#pf').textContent='📎 '+proFile.name});
  $('#pgo').onclick=()=>proFile?run('Procesando…',async()=>{const r=await p.go(proFile);$('#pres').textContent=r;$('#pres').classList.remove('hidden')}):toast('Sube un archivo');
  $('#modal').classList.remove('hidden')}
const closeModal=()=>$('#modal').classList.add('hidden');

// ---- Precios
let annual=false;
function openPricing(){
  const price=annual?'$99':'$12',per=annual?'/año':'/mes';
  const li=a=>a.map(x=>`<li>✓ ${x}</li>`).join('');
  $('#mbody').innerHTML=`<h2 class="text-2xl font-bold text-center">Elige tu plan</h2>
  <div class="flex justify-center my-4"><div class="rounded-full bg-slate-100 dark:bg-slate-800 p-1 text-sm">
   <button onclick="annual=false;openPricing()" class="px-4 py-1 rounded-full ${annual?'':'bg-indigo-600 text-white'}">Mensual</button>
   <button onclick="annual=true;openPricing()" class="px-4 py-1 rounded-full ${annual?'bg-indigo-600 text-white':''}">Anual <span class="text-emerald-500 font-bold">-31%</span></button></div></div>
  <div class="grid md:grid-cols-2 gap-4">
   <div class="rounded-2xl border border-slate-200 dark:border-slate-700 p-5"><h3 class="font-bold">Free</h3><p class="text-4xl font-extrabold my-2">$0</p>
    <ul class="text-sm space-y-1 mb-4">${li(['Unir, dividir, imágenes a PDF','Crear y leer Word','100% local y privado'])}</ul><button class="w-full rounded-lg border py-2" onclick="closeModal()">Plan actual</button></div>
   <div class="rounded-2xl border-2 border-indigo-600 p-5 shadow-xl relative"><span class="pro absolute -top-3 right-4">POPULAR</span><h3 class="font-bold">PRO</h3><p class="text-4xl font-extrabold my-2">${price}<span class="text-base font-normal opacity-60">${per}</span></p>
    <ul class="text-sm space-y-1 mb-4">${li(['PDF a Word avanzado','Resumen con IA','Compresión extrema','Firma y sello en PDF','Soporte prioritario'])}</ul>
    <button class="btn w-full" onclick="window.open(CHECKOUT_URL+'?plan='+(annual?'annual':'monthly'),'_blank')">Pagar con Stripe</button></div></div>
  <button class="mx-auto block mt-4 text-sm opacity-60" onclick="closeModal()">Cerrar</button>`;
  $('#modal').classList.remove('hidden')}

// ---- Editor de documentos
const ed=$('#ed'),sv=m=>$('#sv').textContent=m;let sel,tmr;
try{ed.innerHTML=localStorage.getItem('ed_html')||'';$('#docName').value=localStorage.getItem('ed_name')||'Documento sin título'}catch{}
if(!ed.innerHTML.trim())ed.innerHTML='<h1>Documento sin título</h1><p>Empieza a escribir aquí…</p>';
document.addEventListener('selectionchange',()=>{const s=getSelection();if(s.rangeCount&&ed.contains(s.anchorNode))sel=s.getRangeAt(0)});
function upd(){const t=ed.innerText.trim();$('#wc').textContent=(t?t.split(/\s+/).length:0)+' palabras · '+t.length+' caracteres · '+Math.max(1,Math.ceil(ed.scrollHeight/1123))+' pág.';sv('Guardando…');clearTimeout(tmr);
  tmr=setTimeout(()=>{try{localStorage.setItem('ed_html',ed.innerHTML);localStorage.setItem('ed_name',$('#docName').value)}catch{}sv('Guardado ✓')},500)}
const cmd=(c,v=null)=>{ed.focus();if(sel){const s=getSelection();s.removeAllRanges();s.addRange(sel)}document.execCommand(c,false,v);upd()};
ed.addEventListener('input',upd);$('#docName').oninput=upd;
ed.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();edDocx()}});
document.querySelectorAll('#tb [data-c]').forEach(b=>b.onmousedown=e=>{e.preventDefault();cmd(b.dataset.c)});
$('#blk').onchange=e=>cmd('formatBlock','<'+e.target.value+'>');
$('#fsz').onchange=e=>e.target.value&&cmd('fontSize',e.target.value);
$('#fc').oninput=e=>cmd('foreColor',e.target.value);
$('#bc').oninput=e=>cmd('hiliteColor',e.target.value);
$('#imgBtn').onclick=()=>$('#imgIn').click();
$('#imgIn').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();r.onload=()=>cmd('insertImage',r.result);r.readAsDataURL(f)};
$('#edFile').onchange=e=>{const f=e.target.files[0];e.target.value='';f&&run('Abriendo…',async()=>{ed.innerHTML=(await mammoth.convertToHtml({arrayBuffer:await buf(f)})).value||'<p><br></p>';$('#docName').value=f.name.replace(/\.docx$/i,'');upd();toast('Documento abierto')})};
const edNew=()=>{if(confirm('¿Crear un documento nuevo? Se perderá el contenido actual.')){ed.innerHTML='<h1>Documento sin título</h1><p><br></p>';$('#docName').value='Documento sin título';upd()}};
const fname=()=>($('#docName').value||'documento').replace(/[^\w\- áéíóúñÁÉÍÓÚÑ]/g,'_');
function blocks(){const o=[];ed.childNodes.forEach(n=>{
  if(n.nodeType===3){if(n.textContent.trim())o.push({tag:'P',n,text:n.textContent})}
  else if(/^(UL|OL)$/.test(n.tagName))[...n.children].forEach((li,i)=>o.push({tag:'LI',n:li,text:(n.tagName==='OL'?(i+1)+'. ':'• ')+li.innerText,ol:n.tagName==='OL',i}));
  else o.push({tag:n.tagName,n,text:n.innerText||''})});return o}
const edPdf=()=>run('Creando PDF…',async()=>{
  const doc=await PDFLib.PDFDocument.create(),F=await doc.embedFont(PDFLib.StandardFonts.Helvetica),B=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold),W=595,H=842,M=56;
  let pg=doc.addPage([W,H]),y=H-M;
  const cl=s=>s.replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/[^\x20-\x7E\xA1-\xFF]/g,'?');
  for(const b of blocks()){const hs={H1:26,H2:20,H3:16}[b.tag],sz=hs||12,f=hs?B:F,ind=b.tag==='LI'?14:b.tag==='BLOCKQUOTE'?20:0,max=W-2*M-ind;
    y-=hs?sz*.4:0;
    for(const para of cl(b.text).split('\n')){let line='';const out=[];
      for(const w of para.split(/\s+/).filter(Boolean)){const t=line?line+' '+w:w;if(f.widthOfTextAtSize(t,sz)>max&&line){out.push(line);line=w}else line=t}
      out.push(line);
      for(const l of out){if(y<M+sz){pg=doc.addPage([W,H]);y=H-M}pg.drawText(l,{x:M+ind,y:y-sz,size:sz,font:f});y-=sz*1.4}}
    y-=sz*.5}
  dl(await doc.save(),fname()+'.pdf','application/pdf')});
const edDocx=()=>run('Creando Word…',async()=>{
  const {Document,Paragraph,TextRun,HeadingLevel,Packer,AlignmentType:A}=docx,SZ={1:16,2:20,3:24,4:28,5:36,6:48,7:72};
  const hx=c=>c.startsWith('#')?c.slice(1):(c.match(/\d+/g)||[]).slice(0,3).map(v=>(+v).toString(16).padStart(2,'0')).join('');
  const runs=(n,s={})=>{
    if(n.nodeType===3)return n.textContent?[new TextRun({text:n.textContent,bold:s.b,italics:s.i,underline:s.u?{}:undefined,strike:s.s,color:s.c,size:s.z})]:[];
    if(n.nodeName==='BR')return[new TextRun({break:1})];
    if(n.nodeType!==1)return[];
    const t=n.nodeName,x={...s};
    if(/^(B|STRONG|H[1-3])$/.test(t))x.b=1;if(/^(I|EM)$/.test(t))x.i=1;if(t==='U')x.u=1;if(/^(S|STRIKE|DEL)$/.test(t))x.s=1;
    if(t==='FONT'){if(n.getAttribute('color'))x.c=hx(n.getAttribute('color'));if(n.size)x.z=SZ[n.size]}
    if(n.style&&n.style.color)x.c=hx(n.style.color);
    return[...n.childNodes].flatMap(c=>runs(c,x))};
  const HL={H1:HeadingLevel.HEADING_1,H2:HeadingLevel.HEADING_2,H3:HeadingLevel.HEADING_3},AL={left:A.LEFT,center:A.CENTER,right:A.RIGHT,justify:A.JUSTIFIED};
  const kids=blocks().map(b=>{const o={children:runs(b.n),spacing:{after:140},alignment:AL[b.n.style&&b.n.style.textAlign]};
    if(HL[b.tag])o.heading=HL[b.tag];
    if(b.tag==='LI'){if(b.ol)o.children=[new TextRun((b.i+1)+'. '),...o.children];else o.bullet={level:0}}
    if(b.tag==='BLOCKQUOTE')o.indent={left:500};
    return new Paragraph(o)});
  dl(await Packer.toBlob(new Document({sections:[{children:kids.length?kids:[new Paragraph('')]}]})),fname()+'.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document')});

// ---- Visor de documentos (estructura de páginas como Word)
const zm={ed:1,vw:1};let cur=1,vFile=null,vTxt='';
const pages=()=>[...document.querySelectorAll('#vw .pg,#vw section.docx')];
function zoomSet(k,v){zm[k]=Math.min(2.5,Math.max(.3,+v.toFixed(2)));$(k==='ed'?'#edWrap':'#vw').style.zoom=zm[k];$('#z'+k).textContent=Math.round(zm[k]*100)+'%'}
const zoom=(k,d)=>zoomSet(k,zm[k]+d);
function fitW(){const p=pages()[0];if(!p)return;zoomSet('vw',1);zoomSet('vw',Math.min(1.25,($('#vs').clientWidth-48)/p.offsetWidth))}
function gotoPg(n){const p=pages();if(!p.length)return;cur=Math.min(p.length,Math.max(1,n|0));const y=scrollY;p[cur-1].scrollIntoView({block:'start'});scrollTo(scrollX,y);$('#pgIn').value=cur}
$('#pgIn').onchange=e=>gotoPg(+e.target.value);
$('#vs').onscroll=()=>{let c=1;const t=$('#vs').getBoundingClientRect();pages().forEach((p,i)=>{if(p.getBoundingClientRect().top-t.top<=t.height/3)c=i+1});if(c!==cur){cur=c;$('#pgIn').value=c}};
dropzone($('#dzRead'),fs=>run('Abriendo documento…',async()=>{
  const f=fs[0],vw=$('#vw');vFile=f;vw.innerHTML='';zoomSet('vw',1);
  if(/\.pdf$/i.test(f.name)){const d=await pdfDoc(f),q=Math.min(2,Math.max(1.5,devicePixelRatio||1));
    for(let i=1;i<=d.numPages;i++){const p=await d.getPage(i),rv=p.getViewport({scale:1.333*q}),div=document.createElement('div'),c=document.createElement('canvas');
      div.className='pg';c.width=rv.width;c.height=rv.height;c.style.width=rv.width/q+'px';c.style.height=rv.height/q+'px';div.append(c);vw.append(div);
      await p.render({canvasContext:c.getContext('2d'),viewport:rv}).promise;prog(i/d.numPages*100)}
    vTxt=''}
  else{const ab=await buf(f);
    if(window.docxPreview&&docxPreview.renderAsync)await docxPreview.renderAsync(ab,vw,null,{className:'docx',inWrapper:true,breakPages:true,renderHeaders:true,renderFooters:true,renderFootnotes:true,renderEndnotes:true});
    else vw.innerHTML='<div class="pg paper" style="padding:2.5rem">'+(await mammoth.convertToHtml({arrayBuffer:ab})).value+'</div>';
    vTxt=vw.innerText}
  $('#vname').textContent=f.name;$('#vbar').classList.remove('hidden');$('#vs').classList.remove('hidden');
  const n=pages().length;$('#pgN').textContent=n;$('#pgIn').max=n;cur=1;$('#pgIn').value=1;setTimeout(fitW,60);toast(n+(n>1?' páginas cargadas':' página cargada'))}));
const copyView=()=>run('Extrayendo texto…',async()=>{const t=vTxt||await pdfText(vFile);await navigator.clipboard.writeText(t);toast('Texto copiado')});
const edFromView=()=>{if(!vFile||/\.pdf$/i.test(vFile.name))return toast('Solo los .docx se pueden abrir en el editor',1);
  run('Abriendo en el editor…',async()=>{ed.innerHTML=(await mammoth.convertToHtml({arrayBuffer:await buf(vFile)})).value||'<p><br></p>';$('#docName').value=vFile.name.replace(/\.docx$/i,'');upd();show('edit');toast('Documento abierto en el editor')})};
upd();sv('');
show('edit');
setTimeout(()=>{const f=($('.ws').clientWidth-48)/794;if(f<1)zoomSet('ed',Math.max(.4,f));upd()},100);


// ---- Efectos: ripple, nav escalonado, estado de la barra del editor
nav.querySelectorAll('.nv').forEach((b,i)=>b.style.animationDelay=i*.07+'s');
document.addEventListener('click',e=>{const b=e.target.closest('.btn,.vb,.nv');if(!b)return;const r=b.getBoundingClientRect(),d=Math.max(r.width,r.height),s=document.createElement('span');
  s.className='rip';s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;b.append(s);setTimeout(()=>s.remove(),600)});
const ST=['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList','justifyLeft','justifyCenter','justifyRight','justifyFull'];
document.addEventListener('selectionchange',()=>{const s=getSelection();if(!s.rangeCount||!ed.contains(s.anchorNode))return;
  document.querySelectorAll('#tb [data-c]').forEach(b=>b.classList.toggle('on',ST.includes(b.dataset.c)&&document.queryCommandState(b.dataset.c)))});
