// Motor de cámara: filtros, zoom, recorte y espejo se renderizan en un canvas,
// así foto Y video llevan exactamente lo que ves en pantalla.
const v=document.getElementById('v'),out=document.getElementById('out'),octx=out.getContext('2d');
export const cam={stream:null,track:null,caps:{},facing:'environment',deviceId:null,ds:1,filter:'',ratio:4/3,res:4096,orig:true,fmt:'image/jpeg',fps:30,lenses:[],lensMult:1,zoom:1};
let aud=null,mr=null,gen=0,started=false;
const ar=()=>v.videoHeight>v.videoWidth?1/cam.ratio:cam.ratio;
function crop(w,h){const a=w/h,vw=v.videoWidth,vh=v.videoHeight;let sw,sh;if(vw/vh>a){sh=vh;sw=vh*a}else{sw=vw;sh=vw/a}sw/=cam.ds;sh/=cam.ds;return[(vw-sw)/2,(vh-sh)/2,sw,sh]}
function draw(c,w,h,m=true){c.save();c.filter=cam.filter||'none';if(m&&cam.facing=='user'){c.translate(w,0);c.scale(-1,1)}c.drawImage(v,...crop(w,h),0,0,w,h);c.restore()}
export function sizeOut(native){const a=ar();if(native){const vw=v.videoWidth,vh=v.videoHeight;if(vw/vh>a){out.height=vh;out.width=Math.round(vh*a)}else{out.width=vw;out.height=Math.round(vw/a)}return}const L=Math.min(cam.res,1920);out.width=Math.round(a>=1?L:L*a);out.height=Math.round(a>=1?L/a:L)}
function loop(){if(v.readyState>=2&&v.videoWidth)draw(octx,out.width,out.height);(v.requestVideoFrameCallback?v.requestVideoFrameCallback.bind(v):requestAnimationFrame)(loop)}
export async function start(){
  stop();const my=++gen;
  const W=cam.fps>60?1280:cam.res,vid={width:{ideal:W},height:{ideal:W==4096?3072:Math.round(W*9/16)},frameRate:{ideal:cam.fps}};
  if(cam.deviceId)vid.deviceId={exact:cam.deviceId};else vid.facingMode={ideal:cam.facing};
  let s;try{s=await navigator.mediaDevices.getUserMedia({video:{...vid,frameRate:{exact:cam.fps}},audio:false})}catch{s=await navigator.mediaDevices.getUserMedia({video:vid,audio:false})}
  if(my!=gen){s.getTracks().forEach(t=>t.stop());return}
  cam.stream=s;cam.track=s.getVideoTracks()[0];cam.caps=cam.track.getCapabilities?.()||{};
  v.srcObject=s;await v.play().catch(()=>{});
  await new Promise(r=>v.videoWidth?r():v.onloadedmetadata=r);
  sizeOut();if(!started){started=true;loop()}
  await findLenses();
}
export function stop(){cam.stream?.getTracks().forEach(t=>t.stop());cam.stream=null}
async function findLenses(){
  const d=(await navigator.mediaDevices.enumerateDevices()).filter(x=>x.kind=='videoinput'&&x.label);
  cam.lenses=d.filter(x=>/back|rear|environment|tras|posterior/i.test(x.label)).map(x=>({id:x.deviceId,mult:/ultra/i.test(x.label)?.5:/tele/i.test(x.label)?3:1}));
  const me=cam.lenses.find(l=>l.id==cam.track.getSettings().deviceId);cam.lensMult=cam.facing=='user'?1:me?.mult||1;
}
export function zoomLevels(){const s=new Set([1,2,3]);if(cam.facing!='user')cam.lenses.forEach(l=>s.add(l.mult));return[...s].sort((a,b)=>a-b)}
export async function setZoom(l,noLens){
  cam.zoom=l;
  if(!noLens&&cam.facing!='user'&&cam.lenses.length>1){
    const best=cam.lenses.filter(x=>x.mult<=l+.01).sort((a,b)=>b.mult-a.mult)[0]||cam.lenses[0];
    if(best.mult!=cam.lensMult){cam.deviceId=best.id;await start()}
  }
  const r=Math.max(l/(cam.facing=='user'?1:cam.lensMult),.5),z=cam.caps.zoom;
  if(z){cam.ds=1;try{await cam.track.applyConstraints({advanced:[{zoom:Math.min(Math.max(r,z.min),z.max)}]})}catch{}}else cam.ds=Math.max(r,1);
}
export async function setTorch(on){try{await cam.track.applyConstraints({advanced:[{torch:on}]});return true}catch{return false}}
export const apply=c=>cam.track.applyConstraints({advanced:[c]}).catch(()=>{});
export const focusAt=(x,y)=>apply({pointsOfInterest:[{x,y}],focusMode:'single-shot'});
export async function flip(){cam.facing=cam.facing=='user'?'environment':'user';cam.deviceId=null;cam.ds=1;cam.zoom=1;await start()}
const blob=(c,q=1)=>new Promise(r=>c.toBlob(r,cam.fmt,q));
const sameAR=()=>Math.abs(v.videoWidth/v.videoHeight-ar())<.02;
// FOTO: archivo original del sensor (sin recompresión) cuando es posible; si no, canvas a resolución nativa
// con calidad 100% (JPEG/WebP) o PNG sin pérdida. NOCHE = promedio de 8 fotogramas.
export async function photo(night){
  if(cam.orig&&!night&&!cam.filter&&cam.ds==1&&Math.abs(cam.ratio-4/3)<.01&&cam.fmt=='image/jpeg'&&window.ImageCapture){
    try{const ic=new ImageCapture(cam.track),pc=await ic.getPhotoCapabilities(),o={};
      if(pc.imageWidth?.max){o.imageWidth=pc.imageWidth.max;o.imageHeight=pc.imageHeight.max}
      return await ic.takePhoto(o)}catch{}
  }
  const vw=v.videoWidth,vh=v.videoHeight,a=ar(),c=document.createElement('canvas');
  if(vw/vh>a){c.height=vh;c.width=Math.round(vh*a)}else{c.width=vw;c.height=Math.round(vw/a)}
  const x=c.getContext('2d');x.imageSmoothingQuality='high';
  if(night){for(let i=0;i<8;i++){x.globalAlpha=1/(i+1);draw(x,c.width,c.height,false);await new Promise(r=>setTimeout(r,110))}
    const t=document.createElement('canvas');t.width=c.width;t.height=c.height;const y=t.getContext('2d');y.filter='brightness(1.35) contrast(1.08)';y.drawImage(c,0,0);return blob(t)}
  draw(x,c.width,c.height,false);return blob(c);
}
// VIDEO: con "Calidad original" y sin filtros/recorte/zoom digital se graba el stream directo de la cámara
// (sin pasar por canvas), con bitrate alto y audio estéreo 48 kHz sin procesar.
export async function startRec(){
  const raw=cam.orig&&!cam.filter&&cam.ds==1&&sameAR();
  let ms;if(raw)ms=new MediaStream(cam.stream.getVideoTracks());else{sizeOut(true);ms=out.captureStream()}
  try{aud=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:2,sampleRate:48000}});aud.getAudioTracks().forEach(t=>ms.addTrack(t))}catch{aud=null}
  const st=cam.track.getSettings(),w=raw?st.width:out.width,h=raw?st.height:out.height,bps=Math.min(1e8,Math.round(w*h*(st.frameRate||30)*.25));
  const mt=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
  const ch=[];mr=new MediaRecorder(ms,{...(mt&&{mimeType:mt}),videoBitsPerSecond:bps,audioBitsPerSecond:256000});
  mr.ondataavailable=e=>e.data.size&&ch.push(e.data);
  const done=new Promise(r=>mr.onstop=()=>{aud?.getTracks().forEach(t=>t.stop());if(!raw)sizeOut();r(new Blob(ch,{type:mr.mimeType||'video/webm'}))});
  mr.start(1000);return done;
}
export const stopRec=()=>mr?.stop();
// Controles manuales reales: solo aparecen los que el dispositivo expone
export function buildPro(el){
  const keys={iso:['ISO','manual','exposureMode'],exposureTime:['Obturador','manual','exposureMode'],exposureCompensation:['Exposición'],focusDistance:['Enfoque manual','manual','focusMode'],colorTemperature:['Temp. color','manual','whiteBalanceMode'],brightness:['Brillo'],contrast:['Contraste'],saturation:['Saturación'],sharpness:['Nitidez']};
  el.innerHTML='';let n=0;
  for(const k in keys){const c=cam.caps[k];if(!c||c.max==null)continue;n++;
    const l=document.createElement('label'),i=document.createElement('input');l.append(keys[k][0]);i.type='range';i.min=c.min;i.max=c.max;i.step=c.step||(c.max-c.min)/100;i.value=cam.track.getSettings()[k]??c.min;
    i.oninput=()=>apply({...(keys[k][1]&&{[keys[k][2]]:keys[k][1]}),[k]:+i.value});l.append(i);el.append(l)}
  if(!n)el.textContent='Este dispositivo/navegador no expone controles manuales (Chrome en Android suele hacerlo).';
  else{const b=document.createElement('button');b.className='btn alt';b.textContent='Restablecer automático';b.onclick=()=>{apply({exposureMode:'continuous',focusMode:'continuous',whiteBalanceMode:'continuous'});buildPro(el)};el.append(b)}
}
