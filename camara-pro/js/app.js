import {onUser} from './auth.js';
import * as C from './camera.js';
import {upload,list,signed,remove} from './storage.js';
const $=id=>document.getElementById(id),cam=C.cam;
const MODES=['FOTO','VIDEO','LENTA','NOCHE','RÁFAGA'],RATIOS=[['4:3',4/3],['1:1',1],['16:9',16/9]],TIMERS=[0,3,10];
const FILTERS=[['Normal',''],['Vívido','saturate(1.4) contrast(1.1)'],['Dramático','contrast(1.4) saturate(.8)'],['Mono','grayscale(1) contrast(1.1)'],['Cálido','sepia(.3) saturate(1.2)'],['Frío','hue-rotate(-15deg) saturate(1.1)']];
let user,mode=0,ri=0,ti=0,fi=0,flashOn=false,grid=false,busy=false,recording=false,recInt,cur;
const toast=t=>{const e=$('toast');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2200)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
onUser(async u=>{user=u;if(u){drawModes();await boot();thumb()}else C.stop()});
async function boot(){
  cam.fps=mode==2?Math.max(+$('sFps').value,120):+$('sFps').value;
  try{await C.start()}catch(e){return toast('Cámara: '+e.message)}
  {const f=Math.round(cam.track.getSettings().frameRate||30);if(f!=cam.fps)toast(`El dispositivo no ofrece ${cam.fps} fps; usando ${f} fps`);else if(mode==2)toast(`Cámara lenta a ${f} fps`)}
  zoomUI();C.buildPro($('pro'));
}
const clamp=(x,a,b)=>Math.min(Math.max(x,a),b);
const toPos=z=>{const[mn,mx]=C.zoomRange();return 1000*Math.log(clamp(z,mn,mx)/mn)/Math.log(mx/mn)};
const fromPos=p=>{const[mn,mx]=C.zoomRange();return mn*Math.pow(mx/mn,p/1000)};
function updReadout(){$('zv').textContent=cam.zoom.toFixed(1)+'x';$('zs').value=toPos(cam.zoom)}
$('zs').oninput=e=>{C.setZoom(fromPos(+e.target.value),true);updReadout()};
$('zs').onchange=async()=>{await C.setZoom(cam.zoom);zoomUI()};
function zoomUI(){$('zoom').innerHTML=C.zoomLevels().map(l=>`<button data-l="${l}" class="${Math.abs(l-cam.zoom)<.05?'on':''}">${l==.5?'.5':l}x</button>`).join('');updReadout()}
$('zoom').onclick=async e=>{const l=+e.target.dataset.l;if(!l)return;await C.setZoom(l);zoomUI();C.buildPro($('pro'))};
function drawModes(){$('modes').innerHTML=MODES.map((m,i)=>`<button data-i="${i}" class="${i==mode?'on':''}">${m}</button>`).join('');$('shutter').className=mode==1||mode==2?'vid':''}
$('modes').onclick=async e=>{const i=e.target.dataset.i;if(i==null||recording||busy)return;const was=mode==2;mode=+i;drawModes();if(was||mode==2)await boot()};
$('bFlash').onclick=()=>{flashOn=!flashOn;$('bFlash').classList.toggle('on',flashOn);$('bFlash').textContent=flashOn?'⚡ On':'⚡ Flash';if(recording)C.setTorch(flashOn)};
$('bTimer').onclick=()=>{ti=(ti+1)%3;$('bTimer').textContent='⏱ '+TIMERS[ti]+'s'};
$('bRatio').onclick=()=>{ri=(ri+1)%3;cam.ratio=RATIOS[ri][1];$('bRatio').textContent=RATIOS[ri][0];if(!recording)C.sizeOut()};
$('bGrid').onclick=()=>{grid=!grid;$('grid').classList.toggle('hide',!grid);$('bGrid').classList.toggle('on',grid)};
$('bFilter').onclick=()=>{fi=(fi+1)%FILTERS.length;updFilter();$('bFilter').textContent='🎨 '+FILTERS[fi][0]};
const ADJ=[['brightness','aBr'],['contrast','aCo'],['saturate','aSa']];
function updFilter(){cam.filter=[FILTERS[fi][1],...ADJ.filter(([,i])=>$(i).value!=100).map(([f,i])=>`${f}(${$(i).value/100})`),cam.evSoft!=1?`brightness(${cam.evSoft})`:''].filter(Boolean).join(' ')}
ADJ.forEach(([,i])=>$(i).oninput=updFilter);
$('aReset').onclick=()=>{ADJ.forEach(([,i])=>$(i).value=100);updFilter()};
$('sFps').onchange=()=>{if(!recording)boot()};
$('bSet').onclick=()=>$('panel').classList.toggle('hide');
$('sFmt').onchange=e=>cam.fmt=e.target.value;
$('sRes').onchange=e=>{cam.res=+e.target.value;if(!recording)boot()};
$('sOrig').onchange=e=>cam.orig=e.target.checked;
$('flip').onclick=async()=>{if(recording)return;await C.flip();zoomUI();C.buildPro($('pro'))};
// tocar para enfocar + pellizcar para zoom continuo
let evT;const hideEV=()=>$('evBox').classList.add('hide');
$('evBox').onclick=e=>e.stopPropagation();
$('ev').oninput=e=>{cam.ev=+e.target.value;C.setEV(cam.ev);updFilter();clearTimeout(evT);evT=setTimeout(hideEV,3500)};
$('frame').addEventListener('click',e=>{const r=$('out').getBoundingClientRect(),fr=$('frame').getBoundingClientRect(),f=$('focus'),x=e.clientX-fr.left,y=e.clientY-fr.top;
  f.style.left=(x-35)+'px';f.style.top=(y-35)+'px';f.classList.add('on');setTimeout(()=>f.classList.remove('on'),1500);
  C.focusAt((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);
  const b=$('evBox');b.style.left=clamp(x+45,4,fr.width-44)+'px';b.style.top=clamp(y-80,60,fr.height-230)+'px';$('ev').value=cam.ev||0;b.classList.remove('hide');clearTimeout(evT);evT=setTimeout(hideEV,3500)});
$('frame').addEventListener('wheel',e=>{e.preventDefault();const[mn,mx]=C.zoomRange();C.setZoom(clamp(cam.zoom*(e.deltaY<0?1.08:.93),mn,mx),true);updReadout()},{passive:false});
let p0=0,z0=1;const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
$('frame').addEventListener('touchstart',e=>{if(e.touches.length==2){p0=dist(e.touches);z0=cam.zoom}},{passive:true});
$('frame').addEventListener('touchmove',e=>{if(e.touches.length==2&&p0){const[mn,mx]=C.zoomRange();C.setZoom(clamp(z0*dist(e.touches)/p0,mn,mx),true);updReadout()}},{passive:true});
$('frame').addEventListener('touchend',()=>{if(p0){p0=0;C.setZoom(cam.zoom).then(zoomUI)}});
$('shutter').onclick=async()=>{
  if(!cam.track||busy)return;if(recording)return stopRecording();
  if(TIMERS[ti]){busy=true;for(let i=TIMERS[ti];i>0;i--){$('count').textContent=i;await sleep(1000)}$('count').textContent='';busy=false}
  if(mode==1||mode==2)return startRecording();
  busy=true;
  try{const n=mode==4?10:1;for(let i=0;i<n;i++){await shoot(mode==3,mode==4?'burst':'photo');if(n>1)await sleep(120)}if(n>1)toast('Ráfaga guardada')}catch(e){toast('Error: '+e.message)}
  busy=false;
};
async function shoot(night,kind){
  let t=false;if(flashOn){if(cam.facing=='user')$('flash').style.opacity=1;else t=await C.setTorch(true);await sleep(350)}
  const b=await C.photo(night);if(t)C.setTorch(false);
  const f=$('flash');f.style.opacity=.8;setTimeout(()=>f.style.opacity=0,120);
  save(b,kind,b.type.split('/')[1].replace('jpeg','jpg'));
}
async function startRecording(){
  recording=true;$('shutter').classList.add('recording');$('rec').classList.remove('hide');if(flashOn)C.setTorch(true);
  let s=0;$('rec').textContent='00:00';recInt=setInterval(()=>{s++;$('rec').textContent=String(s/60|0).padStart(2,'0')+':'+String(s%60).padStart(2,'0')},1000);
  const fps=mode==2?Math.max(Math.round((cam.track.getSettings().frameRate||30)/30),2):1,kind=mode==2?'slomo'+fps:'video';
  const b=await C.startRec();
  save(b,kind,b.type.includes('mp4')?'mp4':'webm');
}
function stopRecording(){C.stopRec();recording=false;clearInterval(recInt);C.setTorch(false);$('shutter').classList.remove('recording');$('rec').classList.add('hide')}
async function save(b,kind,ext){
  toast('Subiendo…');
  try{const p=await upload(user.id,b,kind,ext);toast('Guardado ✓');if(!/^(video|slomo)/.test(kind)){const u=await signed(p);$('thumb').style.backgroundImage=`url(${u})`}}catch(e){toast('No se pudo subir ('+e.message+'). Se descargó una copia local.');const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${Date.now()}_${kind}.${ext}`;a.click()}
}
const isVid=n=>/\.(mp4|webm)$/.test(n);
async function thumb(){try{const p=(await list(user.id)).find(f=>!isVid(f.name));if(p)$('thumb').style.backgroundImage=`url(${p.url})`}catch{}}
$('thumb').onclick=async()=>{
  $('gal').classList.remove('hide');$('gg').innerHTML='<p style="padding:20px">Cargando…</p>';
  try{const l=await list(user.id);$('gg').innerHTML=l.length?'':'<p style="padding:20px">Aún no hay fotos ni videos.</p>';
    l.forEach(f=>{const el=document.createElement(isVid(f.name)?'video':'img');el.src=f.url;if(isVid(f.name)){el.muted=true;el.preload='metadata'}el.onclick=()=>openItem(f);$('gg').append(el)})}catch(e){toast(e.message)}
};
$('gClose').onclick=()=>$('gal').classList.add('hide');
function openItem(f){cur=f;const el=document.createElement(isVid(f.name)?'video':'img');el.src=f.url;
  if(isVid(f.name)){el.controls=el.autoplay=el.playsInline=true;const m=f.name.match(/slomo(\d+)/);if(m)el.onplay=()=>el.playbackRate=1/Math.max(+m[1],2)}
  $('vBox').replaceChildren(el);$('vDl').href=f.url;$('vDl').download=f.name;$('vShare').classList.toggle('hide',!navigator.share);$('view').classList.remove('hide')}
$('vClose').onclick=()=>{$('view').classList.add('hide');$('vBox').replaceChildren()};
$('vShare').onclick=async()=>{try{const b=await (await fetch(cur.url)).blob();await navigator.share({files:[new File([b],cur.name,{type:b.type})]})}catch{}};
$('vDel').onclick=async()=>{if(!confirm('¿Eliminar este archivo?'))return;const{error}=await remove(cur.path);if(error)return toast(error.message);$('vClose').click();$('thumb').click();thumb()};
