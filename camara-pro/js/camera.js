// Motor de cámara: filtros, zoom, recorte y espejo se renderizan en un canvas,
// así foto Y video llevan exactamente lo que ves en pantalla.
const v=document.getElementById('v'),out=document.getElementById('out'),gl=out.getContext('webgl',{preserveDrawingBuffer:true,alpha:false,antialias:false});
// Render por WebGL (funciona igual en Safari/iOS y Chrome; ctx.filter de canvas no existe en Safari)
const sh=(t,c)=>{const o=gl.createShader(t);gl.shaderSource(o,c);gl.compileShader(o);return o};
const pg=gl.createProgram();
gl.attachShader(pg,sh(gl.VERTEX_SHADER,`attribute vec2 p;varying vec2 uv;uniform vec4 uC;uniform float uF;void main(){vec2 t=(p+1.)*.5;t.y=1.-t.y;if(uF>.5)t.x=1.-t.x;uv=uC.xy+t*uC.zw;gl_Position=vec4(p,0.,1.);}`));
gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 uv;uniform sampler2D T;uniform float uBr,uCo,uSa,uEv,uHue,uSep,uGr;
void main(){vec3 c=texture2D(T,uv).rgb*uEv*uBr;c=(c-.5)*uCo+.5;vec3 k=vec3(.299,.587,.114);float l=dot(c,k);c=mix(vec3(l),c,uSa);l=dot(c,k);c=mix(c,vec3(l),uGr);
vec3 s=vec3(dot(c,vec3(.393,.769,.189)),dot(c,vec3(.349,.686,.168)),dot(c,vec3(.272,.534,.131)));c=mix(c,s,uSep);
float cs=cos(uHue),sn=sin(uHue);mat3 m=mat3(.213+cs*.787-sn*.213,.213-cs*.213+sn*.143,.213-cs*.213-sn*.787,.715-cs*.715-sn*.715,.715+cs*.285+sn*.140,.715-cs*.715+sn*.715,.072-cs*.072+sn*.928,.072-cs*.072-sn*.283,.072+cs*.928+sn*.072);
gl_FragColor=vec4(clamp(m*c,0.,1.),1.);}`));
gl.linkProgram(pg);gl.useProgram(pg);
gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
const pl=gl.getAttribLocation(pg,'p');gl.enableVertexAttribArray(pl);gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]].forEach(([a,b])=>gl.texParameteri(gl.TEXTURE_2D,a,b));
const U={};['C','F','Br','Co','Sa','Ev','Hue','Sep','Gr'].forEach(n=>U[n]=gl.getUniformLocation(pg,'u'+n));
export const cam={stream:null,track:null,caps:{},facing:'environment',deviceId:null,ds:1,filter:'',ratio:4/3,res:4096,orig:true,fmt:'image/jpeg',fps:30,lenses:[],lensMult:1,zoom:1,evSoft:1,fx:{br:1,co:1,sa:1,ev:1,hue:0,sep:0,gr:0}};
let aud=null,mr=null,gen=0,started=false;
const ar=()=>v.videoHeight>v.videoWidth?1/cam.ratio:cam.ratio;
function crop(w,h){const a=w/h,vw=v.videoWidth,vh=v.videoHeight;let sw,sh;if(vw/vh>a){sh=vh;sw=vh*a}else{sw=vw;sh=vw/a}sw/=cam.ds;sh/=cam.ds;return[(vw-sw)/2,(vh-sh)/2,sw,sh]}
function render(mirror=true){
  const vw=v.videoWidth,vh=v.videoHeight,[sx,sy,sw,sh]=crop(out.width,out.height),f=cam.fx;
  gl.viewport(0,0,out.width,out.height);
  gl.uniform4f(U.C,sx/vw,sy/vh,sw/vw,sh/vh);gl.uniform1f(U.F,mirror&&cam.facing=='user'?1:0);
  gl.uniform1f(U.Br,f.br);gl.uniform1f(U.Co,f.co);gl.uniform1f(U.Sa,f.sa);gl.uniform1f(U.Ev,f.ev);gl.uniform1f(U.Hue,f.hue);gl.uniform1f(U.Sep,f.sep);gl.uniform1f(U.Gr,f.gr);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,v);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
export function sizeOut(native){const a=ar();if(native){const vw=v.videoWidth,vh=v.videoHeight;if(vw/vh>a){out.height=vh;out.width=Math.round(vh*a)}else{out.width=vw;out.height=Math.round(vw/a)}return}const L=Math.min(cam.res,1920);out.width=Math.round(a>=1?L:L*a);out.height=Math.round(a>=1?L/a:L)}
function loop(){if(v.readyState>=2&&v.videoWidth)render();(v.requestVideoFrameCallback?v.requestVideoFrameCallback.bind(v):requestAnimationFrame)(loop)}
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
  if(z){const zb=z.min>=10?z.min:1;cam.ds=1;try{await cam.track.applyConstraints({advanced:[{zoom:Math.min(Math.max(r*zb,z.min),z.max)}]})}catch{}}else cam.ds=Math.max(r,1);
}
// Rango total de zoom: del lente más ancho al máximo de hardware (cámaras con zoom óptico/digital del navegador) o 10x digital
export function zoomRange(){
  const back=cam.facing!='user',z=cam.caps.zoom,ms=back?cam.lenses.map(l=>l.mult):[],m=back?cam.lensMult:1;
  let mn=Math.min(1,...ms);if(z)mn=Math.min(mn,(z.min>=10?1:z.min)*m);
  const mx=z?Math.min(30,(z.min>=10?z.max/z.min:z.max)*Math.max(1,...ms,m)):10;
  return[Math.max(.3,mn),Math.max(mx,mn*2)];
}
// Exposición: compensación real del sensor si existe; si no, brillo por software
// Exposición en pasos (EV): se aplica en el shader, así se ve y se guarda igual en cualquier dispositivo
export function setEV(ev){cam.evSoft=Math.pow(2,ev*.8)}
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
  const sl=ms=>new Promise(r=>setTimeout(r,ms));
  if(!night){sizeOut(true);render(false);const b=blob(out);sizeOut();return b}
  sizeOut(true);const c=document.createElement('canvas');c.width=out.width;c.height=out.height;sizeOut();
  const x=c.getContext('2d'),f0=cam.fx;cam.fx={...f0,ev:f0.ev*1.35,co:f0.co*1.08};
  for(let i=0;i<8;i++){sizeOut(true);render(false);x.globalAlpha=1/(i+1);x.drawImage(out,0,0);sizeOut();await sl(110)}
  cam.fx=f0;return blob(c);
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
