const $=s=>document.querySelector(s), CHECKOUT_URL='https://buy.stripe.com/TU_ENLACE'; // ← reemplaza con tu Payment Link
const VIEWS={merge:['🔗','Unir PDFs'],split:['✂️','Dividir / Extraer'],img:['🖼️','Imágenes a PDF'],gen:['📝','Crear Word'],read:['👁️','Leer Word'],pro:['⭐','Funciones PRO']};
const nav=$('#nav');
for(const k in VIEWS){const b=document.createElement('button');b.dataset.k=k;b.className='w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left';b.innerHTML=`<span>${VIEWS[k][0]}</span><span class="hidden md:inline">${VIEWS[k][1]}</span>${k==='pro'?'<span class="pro hidden md:inline">PRO</span>':''}`;b.onclick=()=>show(k);nav.append(b)}
function show(k){document.querySelectorAll('[data-view]').forEach(s=>s.classList.toggle('hidden',s.dataset.view!==k));nav.querySelectorAll('button').forEach(b=>b.classList.toggle('bg-indigo-50',b.dataset.k===k)||b.classList.toggle('dark:bg-slate-800',b.dataset.k===k));$('#title').textContent=VIEWS[k][1]}
$('#theme').onclick=()=>document.documentElement.classList.toggle('dark');
if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark');
$('#gDate').valueAsDate=new Date();

const busy=(on,t='Procesando…')=>{$('#loader').classList.toggle('hidden',!on);$('#ltxt').textContent=t;$('#bar').style.width='0'};
const prog=p=>$('#bar').style.width=p+'%';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const dl=(data,name,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click()};
const buf=f=>f.arrayBuffer();
const fmt=n=>n>1e6?(n/1e6).toFixed(1)+' MB':Math.round(n/1e3)+' KB';
async function run(txt,fn){busy(true,txt);try{await fn()}catch(e){alert('Error: '+e.message)}busy(false)}

// Drag & Drop genérico
function dropzone(el,cb){
  const multi=el.dataset.multi,inp=document.createElement('input');
  inp.type='file';inp.hidden=true;inp.accept=el.dataset.accept;inp.multiple=!!multi;el.append(inp);
  el.insertAdjacentHTML('afterbegin',`<p>📂 Arrastra ${multi?'tus archivos':'tu archivo'} aquí o haz clic<br><span class="opacity-60">${el.dataset.accept}</span></p>`);
  el.onclick=e=>{if(e.target!==inp)inp.click()};
  inp.onchange=()=>{cb([...inp.files]);inp.value=''};
  el.ondragover=e=>{e.preventDefault();el.classList.add('over')};
  el.ondragleave=()=>el.classList.remove('over');
  el.ondrop=e=>{e.preventDefault();el.classList.remove('over');cb([...e.dataTransfer.files])};
}
// Lista reordenable
function renderList(ul,arr){
  ul.innerHTML='';arr.forEach((f,i)=>{const li=document.createElement('li');
    li.className='flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 shadow-sm border border-slate-200 dark:border-slate-800 text-sm';
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
const doMerge=()=>mergeFiles.length<2?alert('Sube al menos 2 PDFs'):run('Uniendo PDFs…',async()=>{
  const out=await PDFLib.PDFDocument.create();
  for(const [i,f] of mergeFiles.entries()){const src=await PDFLib.PDFDocument.load(await buf(f));
    (await out.copyPages(src,src.getPageIndices())).forEach(p=>out.addPage(p));prog((i+1)/mergeFiles.length*100)}
  dl(await out.save(),'unido.pdf','application/pdf')});

// ---- Dividir
let splitPdf=null;
dropzone($('#dzSplit'),fs=>run('Leyendo PDF…',async()=>{splitPdf=await PDFLib.PDFDocument.load(await buf(fs[0]));
  $('#splitInfo').textContent=`${fs[0].name}: ${splitPdf.getPageCount()} páginas`}));
const doSplit=()=>!splitPdf?alert('Sube un PDF'):run('Extrayendo…',async()=>{
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
const doImg=()=>!imgFiles.length?alert('Sube imágenes'):run('Creando PDF…',async()=>{
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

// ---- Leer DOCX
let rawTxt='';
dropzone($('#dzRead'),fs=>run('Leyendo Word…',async()=>{const ab=await buf(fs[0]);
  const h=await mammoth.convertToHtml({arrayBuffer:ab});rawTxt=(await mammoth.extractRawText({arrayBuffer:ab})).value;
  $('#docOut').innerHTML=h.value||'<em>Documento vacío</em>';$('#docOut').classList.remove('hidden');$('#copyTxt').classList.remove('hidden')}));
$('#copyTxt').onclick=()=>navigator.clipboard.writeText(rawTxt).then(()=>alert('Texto copiado'));

// ---- PRO
const PRO=[
 {id:'p2w',i:'🔄',t:'PDF a Word avanzado',d:'Conversión que preserva tablas, fuentes y diseño.',
  ui:`<input id="ep" class="inp mb-3" placeholder="Endpoint webhook (ConvertAPI / Supabase Edge Function) — opcional">`,
  go:async f=>{const ep=$('#ep').value.trim();if(!ep){await fake();return 'Demo: conversión simulada. Con endpoint, se enviaría el PDF (POST multipart "file") y se descargaría el .docx devuelto.'}
    const fd=new FormData();fd.append('file',f);const r=await fetch(ep,{method:'POST',body:fd});if(!r.ok)throw Error('HTTP '+r.status);
    dl(await r.blob(),f.name.replace(/\.pdf$/i,'')+'.docx');return 'Conversión completada ✔'}},
 {id:'ai',i:'🤖',t:'Resumen con IA',d:'Resume cualquier PDF o Word en segundos.',
  ui:`<input id="key" type="password" class="inp mb-3" placeholder="API Key OpenAI / Claude (opcional, no se guarda)">`,
  go:async f=>{await fake();return `📌 Resumen de demostración de "${f.name}":\n• Idea principal del documento.\n• Tres puntos clave extraídos.\n• Conclusión y siguientes pasos.\n\n(Con API Key, conecta aquí callLLM(texto): extrae el texto con mammoth/pdf.js y envíalo a tu proveedor. Recomendado: proxy en Edge Function para no exponer la clave.)`}},
 {id:'cmp',i:'📉',t:'Compresión extrema',d:'Reduce MBs ajustando la calidad (DPI).',
  ui:`<label class="text-sm">Calidad: <b id="dpiV">150</b> DPI</label><input id="dpi" type="range" min="72" max="300" value="150" class="w-full mb-3" oninput="dpiV.textContent=this.value">`,
  go:async f=>{await fake();return `Demo: ${fmt(f.size)} → ~${fmt(f.size*(+$('#dpi').value/400))} estimado. La compresión real requiere re-muestreo de imágenes en servidor (Ghostscript).`}},
 {id:'enc',i:'🔐',t:'Cifrado y firma digital',d:'Protege con contraseña y firma tus PDFs.',
  ui:`<input id="pw" type="password" class="inp mb-3" placeholder="Contraseña">`,
  go:async f=>{await fake();return 'Demo: cifrado AES-256 y firma X.509 se ejecutarían en backend seguro con tu certificado.'}}];
const fake=async()=>{for(let i=0;i<=100;i+=10){prog(i);await sleep(120)}};
$('#proGrid').innerHTML=PRO.map(p=>`<button onclick="openPro('${p.id}')" class="text-left bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-200 dark:border-slate-800 hover:-translate-y-1 transition"><div class="text-3xl">${p.i}</div><h3 class="font-bold mt-2">${p.t}<span class="pro">PRO</span></h3><p class="text-sm opacity-70 mt-1">${p.d}</p></button>`).join('');
let proFile=null;
function openPro(id){const p=PRO.find(x=>x.id===id);proFile=null;
  $('#mbody').innerHTML=`<h2 class="text-xl font-bold mb-1">${p.i} ${p.t}<span class="pro">PRO</span></h2><p class="text-sm opacity-70 mb-4">${p.d}</p>${p.ui}
  <div class="dz mb-3" id="dzPro" data-accept=".pdf,.docx"></div><p id="pf" class="text-sm mb-2"></p>
  <pre id="pres" class="hidden whitespace-pre-wrap text-sm bg-slate-100 dark:bg-slate-800 rounded-lg p-3 mb-3"></pre>
  <div class="flex gap-2"><button class="btn" id="pgo">Ejecutar</button><button class="px-4" onclick="closeModal()">Cerrar</button></div>
  <p class="text-xs mt-3 opacity-60">Función de demostración · <a href="#" class="text-indigo-500 underline" onclick="openPricing();return false">Ver planes</a></p>`;
  dropzone($('#dzPro'),fs=>{proFile=fs[0];$('#pf').textContent='📎 '+proFile.name});
  $('#pgo').onclick=()=>proFile?run('Procesando…',async()=>{const r=await p.go(proFile);$('#pres').textContent=r;$('#pres').classList.remove('hidden')}):alert('Sube un archivo');
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
    <ul class="text-sm space-y-1 mb-4">${li(['PDF a Word avanzado','Resumen con IA','Compresión extrema','Cifrado y firma digital','Soporte prioritario'])}</ul>
    <button class="btn w-full" onclick="window.open(CHECKOUT_URL+'?plan='+(annual?'annual':'monthly'),'_blank')">Pagar con Stripe</button></div></div>
  <button class="mx-auto block mt-4 text-sm opacity-60" onclick="closeModal()">Cerrar</button>`;
  $('#modal').classList.remove('hidden')}
show('merge');
