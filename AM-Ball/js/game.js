(()=>{'use strict';
const W=1000,H=500,R=11,DT=1/360,P=46,CW=W+2*P,CH=H+2*P,$=s=>document.querySelector(s);
const PRIZES=[[20,'Mascarilla de exfoliación'],[40,'Mascarilla de Vitamina C'],[60,'Reparador de ojeras'],[85,'Mascarilla de Carbón Activo'],[100,'Corte GRATIS']];
const CFG={wa:'525616773834',botBreaks:true,noise:.0008,minutes:10}; // noise = error del bot (rad)
const POCK=[[-4,-4],[W/2,-13],[W+4,-4],[-4,H+4],[W/2,H+13],[W+4,H+4]];
const JAW=[[34,0],[W/2-26,0],[W/2+26,0],[W-34,0],[34,H],[W/2-26,H],[W/2+26,H],[W-34,H],[0,34],[0,H-34],[W,34],[W,H-34]];
const COL=['','#f2c230','#1c4fa8','#d92f2a','#5a2a86','#ef7d22','#1f8a4c','#7a1f1f','#111'];
let db={};try{db=JSON.parse(localStorage.amball)||{}}catch(e){}
const save=()=>{try{localStorage.amball=JSON.stringify(db)}catch(e){}};
const esc=s=>s.replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),gauss=()=>(Math.random()+Math.random()+Math.random()-1.5)*1.6;
let me='Jugador',B=[],turn='me',grp={me:null,bot:null},hand=0,state=null,ev0,snap,time=600,brk=1,over=0,aim=0,pw=.55,sinks=[],acc=0,last=0,mouse={x:0,y:0};
const other=w=>w=='me'?'bot':'me',who=w=>w=='me'?me:'e-Onyx AI';
let hl=0,hlT=0,muted=false,ac,nb;
function ctx(){if(!ac){ac=new(window.AudioContext||window.webkitAudioContext)();const l=ac.sampleRate*.5|0;nb=ac.createBuffer(1,l,ac.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<l;i++)d[i]=Math.random()*2-1}if(ac.state=='suspended')ac.resume();return ac}
function tone(f,d,v,ty='sine',f2){const a=ctx(),t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d+.02)}
function noise(d,v,fq,ty='bandpass',q=1){const a=ctx(),t=a.currentTime,s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=nb;f.type=ty;f.frequency.value=fq;f.Q.value=q;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f).connect(g).connect(a.destination);s.start(t,Math.random()*.2);s.stop(t+d+.02)}
const SFX={
 clack(v){const k=Math.min(1,v/1600);noise(.035,.15+.5*k,3600,'bandpass',2);tone(2300+Math.random()*600,.07,.04+.2*k,'sine',1700);tone(1150,.1,.12*k,'triangle')},
 rail(v){const k=Math.min(1,v/1200);noise(.12,.1+.35*k,480,'lowpass');tone(120,.14,.06+.25*k,'sine',65)},
 pot(){tone(240,.25,.3,'sine',90);noise(.3,.2,900,'bandpass',3);setTimeout(()=>{tone(1900,.04,.1);noise(.25,.14,2600,'bandpass',4);tone(140,.12,.15,'sine',80)},300)},
 cue(p){noise(.05,.35+.4*p,2200,'bandpass',1);tone(170,.12,.25+.3*p,'sine',80);tone(2100,.03,.18)},
 ui(){tone(620,.08,.14,'triangle',980)},
 win(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.45,.2,'triangle'),i*130))},
 lose(){[392,330,262].forEach((f,i)=>setTimeout(()=>tone(f,.5,.2,'sawtooth'),i*180))}};
const sfx=(n,a)=>{if(muted)return;try{SFX[n](a)}catch(e){}};

/* ---------- FÍSICA (idéntica para el juego y para las simulaciones del bot) ---------- */
function step(B,ev){
 for(const b of B){if(!b.a)continue;const s=Math.hypot(b.vx,b.vy);
  if(s){const n=s-(55+.55*s)*DT;if(n<5)b.vx=b.vy=0;else{b.vx*=n/s;b.vy*=n/s}
   b.x+=b.vx*DT;b.y+=b.vy*DT;if(b.rx!=null){b.rx+=b.vx*DT/R;b.ry+=b.vy*DT/R}}}
 for(let i=0;i<B.length;i++){const a=B[i];if(!a.a)continue;
  for(let j=i+1;j<B.length;j++){const c=B[j];if(!c.a||!(a.vx||a.vy||c.vx||c.vy))continue;
   const dx=c.x-a.x,dy=c.y-a.y,d2=dx*dx+dy*dy;if(d2>=4*R*R||!d2)continue;
   const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,o=(2*R-d)/2;a.x-=nx*o;a.y-=ny*o;c.x+=nx*o;c.y+=ny*o;
   const vn=(a.vx-c.vx)*nx+(a.vy-c.vy)*ny;
   if(vn>0){const k=vn*.97;a.vx-=k*nx;a.vy-=k*ny;c.vx+=k*nx;c.vy+=k*ny;ev.h(a,c,vn)}}}
 for(const b of B){if(!b.a)continue;
  const hx=(b.x>34&&b.x<W/2-26)||(b.x>W/2+26&&b.x<W-34),hy=b.y>34&&b.y<H-34;
  if(hx){if(b.y<R){b.y=R;if(b.vy<0){b.vy*=-.78;b.vx*=.98;ev.r(Math.hypot(b.vx,b.vy))}}else if(b.y>H-R){b.y=H-R;if(b.vy>0){b.vy*=-.78;b.vx*=.98;ev.r(Math.hypot(b.vx,b.vy))}}}
  if(hy){if(b.x<R){b.x=R;if(b.vx<0){b.vx*=-.78;b.vy*=.98;ev.r(Math.hypot(b.vx,b.vy))}}else if(b.x>W-R){b.x=W-R;if(b.vx>0){b.vx*=-.78;b.vy*=.98;ev.r(Math.hypot(b.vx,b.vy))}}}
  for(const j of JAW){const dx=b.x-j[0],dy=b.y-j[1],d=Math.hypot(dx,dy);
   if(d<R+4&&d){const nx=dx/d,ny=dy/d;b.x=j[0]+nx*(R+4);b.y=j[1]+ny*(R+4);const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=1.6*v*nx;b.vy-=1.6*v*ny;ev.r(Math.hypot(b.vx,b.vy))}}}
  for(const p of POCK)if(Math.hypot(b.x-p[0],b.y-p[1])<24){b.a=0;ev.p(b,p);break}
  if(b.a&&(b.x<-R||b.x>W+R||b.y<-R||b.y>H+R)){b.a=0;ev.p(b,[Math.max(0,Math.min(W,b.x)),Math.max(0,Math.min(H,b.y))])}}
}
const mkEv=real=>{const e={first:null,rails:0,pot:[],cue:0,
 h(a,c,v){if(e.first==null&&(!a.id||!c.id))e.first=a.id||c.id;real&&v>30&&sfx('clack',v)},
 r(s){if(e.first!=null)e.rails++;real&&s>30&&sfx('rail',s)},
 p(b,p){b.id?e.pot.push(b.id):e.cue=1;if(real){sfx('pot');sinks.push({id:b.id,x:b.x,y:b.y,px:p[0],py:p[1],t:0})}}};return e};
const moving=B=>B.some(b=>b.a&&(b.vx||b.vy));
function run(B,ev){let n=0;while(n++<6000&&moving(B))step(B,ev)}

/* ---------- REGLAS (bola 8) ---------- */
const own=(g,i)=>g=='s'?i<8:i>8,ow=(g,i)=>g?own(g,i):0;
const left=(B,g)=>B.filter(b=>b.a&&b.id&&b.id!=8&&own(g,b.id)).length;
function judge(B0,g,ev,brk){
 const cl=g&&!left(B0,g);
 let foul=ev.cue||ev.first==null||(!ev.rails&&!ev.pot.length);
 if(!foul&&g)foul=cl?ev.first!=8:(ev.first==8||!own(g,ev.first));
 if(!foul&&!g&&ev.first==8)foul=1;
 const r={foul:!!foul,g,keep:0,win:0,lose:0,n:0,o:0},pots=ev.pot.filter(i=>i!=8);
 if(ev.pot.includes(8)&&!brk){if(cl&&!foul)r.win=1;else r.lose=1;return r}
 if(!foul&&!g&&pots.length)r.g=pots[0]<8?'s':'o';
 for(const i of pots)ow(r.g,i)?r.n++:r.o++;
 r.keep=!foul&&(r.n>0||(brk&&pots.length>0))?1:0;return r}

/* ---------- BOT: genera tiros geométricos, los SIMULA con la física real y elige el mejor ---------- */
const targets=(B,g)=>{const cl=g&&!left(B,g);return B.filter(b=>b.a&&b.id&&(g?(cl?b.id==8:b.id!=8&&own(g,b.id)):b.id!=8))};
function clear(B,a,x,y,...ex){const dx=x-a.x,dy=y-a.y,l2=dx*dx+dy*dy||1;
 for(const b of B){if(!b.a||b===a||ex.includes(b))continue;let u=((b.x-a.x)*dx+(b.y-a.y)*dy)/l2;u=Math.max(0,Math.min(1,u));
  if(Math.hypot(a.x+u*dx-b.x,a.y+u*dy-b.y)<2*R-.5)return 0}return 1}
function cands(B,g){const c=B[0],out=[];
 for(const t of targets(B,g))for(const p of POCK){
  const px=p[0]<0?p[0]+9:p[0]>W?p[0]-9:p[0],py=p[1]<0?p[1]+9:p[1]>H?p[1]-9:p[1];
  let dx=px-t.x,dy=py-t.y;const d=Math.hypot(dx,dy);dx/=d;dy/=d;
  const gx=t.x-dx*2*R,gy=t.y-dy*2*R,ax=gx-c.x,ay=gy-c.y,al=Math.hypot(ax,ay);
  if(al<1||(ax*dx+ay*dy)/al<.2)continue;
  if(clear(B,c,gx,gy,t)&&clear(B,t,px,py,c))out.push(Math.atan2(ay,ax))}
 return out}
function evalShot(a,pw,g){
 const S=B.map(b=>({...b,rx:null})),v=300+2700*pw;S[0].vx=Math.cos(a)*v;S[0].vy=Math.sin(a)*v;
 const ev=mkEv(0);run(S,ev);const r=judge(B,g,ev,brk);
 if(r.win)return 1e5;if(r.lose)return -1e5;
 let sc=r.n*120-r.o*80-(r.foul?500:0);const ng=r.g||g;
 if(r.keep){sc+=Math.min(6,cands(S,ng).length)*14+(ng&&!left(S,ng)?60:0)}
 else if(!r.foul)sc-=12*Math.min(6,cands(S,ng?(ng=='s'?'o':'s'):null).length);
 return sc}
async function think(){const g=grp.bot,L=[];
 for(const a of cands(B,g))for(const w of[.3,.55,.85])L.push([a,w]);
 for(const t of targets(B,g))for(const w of[.22,.5])L.push([Math.atan2(t.y-B[0].y,t.x-B[0].x),w]);
 if(!L.length)for(let i=0;i<24;i++)L.push([i*.26,.4]);
 let best=L[0],bs=-1e9;
 for(let i=0;i<L.length;i++){const s=evalShot(L[i][0],L[i][1],g);if(s>bs){bs=s;best=L[i]}if(i%5==4)await sleep(0)}
 return best}
function bestSpot(g){let best=[W*.25,H/2],bs=-1;const c=B[0];c.a=1;
 for(let x=60;x<W-40;x+=45)for(let y=50;y<H-40;y+=45){
  if(B.some(b=>b.a&&b.id&&Math.hypot(b.x-x,b.y-y)<2*R+2))continue;c.x=x;c.y=y;const n=cands(B,g).length;if(n>bs){bs=n;best=[x,y]}}
 return best}

/* ---------- FLUJO DE PARTIDA ---------- */
function rack(){const ids=[1,2,3,4,5,6,7,9,10,11,12,13,14,15].sort(()=>Math.random()-.5);ids.splice(4,0,8);
 const L=[{id:0,x:W*.25,y:H/2,vx:0,vy:0,a:1,rx:0,ry:0}];let n=0;
 for(let r=0;r<5;r++)for(let k=0;k<=r;k++)L.push({id:ids[n++],x:W*.72+r*(R*1.74+.15),y:H/2+(k-r/2)*(2*R+.2),vx:0,vy:0,a:1,rx:0,ry:0});return L}
function newGame(){B=rack();turn=CFG.botBreaks?'bot':'me';grp={me:null,bot:null};hand=0;brk=1;over=0;time=CFG.minutes*60;sinks=[];next()}
function next(){ui();hlT=turn=='me'?3:0;if(turn=='bot'){botTurn();return}state='idle';say(hand?'Bola en mano: mueve la blanca y haz clic para colocarla':'Tu turno: apunta y arrastra la barra de potencia hacia arriba; suéltala para tirar')}
async function botTurn(){state='bot';say('e-Onyx AI está pensando…');await sleep(700);if(over)return;let a,p;
 if(hand){const s=bestSpot(grp.bot);B[0].x=s[0];B[0].y=s[1];B[0].vx=B[0].vy=0;hand=0}
 if(brk){a=(Math.random()-.5)*.03;p=.96}else[a,p]=await think();
 if(over)return;a+=gauss()*CFG.noise;p=Math.min(1,p*(1+gauss()*.01));aim=a;state='baim';await sleep(650);if(over)return;shoot(a,p)}
function shoot(a,p){const v=300+2700*p;snap=B.map(b=>({id:b.id,a:b.a}));B[0].vx=Math.cos(a)*v;B[0].vy=Math.sin(a)*v;ev0=mkEv(1);state='run';acc=0;hand=0;sfx('cue',p)}
function respot8(){const b=B.find(b=>b.id==8);let x=W*.8;while(B.some(o=>o.a&&o!==b&&Math.hypot(o.x-x,o.y-H/2)<2*R))x+=2*R;Object.assign(b,{a:1,x,y:H/2,vx:0,vy:0})}
function settle(){state='done';const w=turn,g=grp[w],r=judge(snap,g,ev0,brk);
 if(ev0.pot.includes(8)&&brk)respot8();
 if(r.win||r.lose)return end(r.win?w:other(w));
 if(!brk&&r.g&&!g){grp[w]=r.g;grp[other(w)]=r.g=='s'?'o':'s'}
 if(!B[0].a){Object.assign(B[0],{a:1,x:W*.25,y:H/2,vx:0,vy:0})}
 hand=r.foul?1:0;brk=0;if(!r.keep)turn=other(turn);
 if(time<=0)return endTime();
 next();if(r.foul)say(`Falta de ${who(w)}: bola en mano para ${who(turn)}`)}
function endTime(){const a=grp.me?left(B,grp.me):7,b=grp.bot?left(B,grp.bot):7;end(a<b?'me':'bot',1)}
function end(w,t){over=1;state='over';sfx(w=='me'?'win':'lose');const s=db[me]=db[me]||{w:0,l:0};w=='me'?s.w++:s.l++;save();ui();
 modal(`<h2>${w=='me'?'¡Ganaste!':'Gana e-Onyx AI'}</h2><p>${t?'Se acabó el tiempo. ':''}${w=='me'?'Sumas 1 victoria.':'Sigue practicando.'}</p>${tables()}<button id="again">Revancha</button>`);
 $('#again').onclick=()=>{closeM();newGame()}}

/* ---------- UI ---------- */
const say=t=>$('#msg').textContent=t;
function chips(g){return g?B.filter(b=>b.a&&b.id&&b.id!=8&&own(g,b.id)).map(b=>`<i class="ch" style="background:${COL[b.id>8?b.id-8:b.id]}">${b.id}</i>`).join(''):''}
function ui(){for(const w of['me','bot']){const e=$(w=='me'?'#pl':'#bt'),g=grp[w];
 e.innerHTML=`<b>${esc(who(w))}</b><small>${g?(g=='s'?'Lisas':'Rayadas'):'Mesa abierta'}</small><br>${chips(g)}`;e.classList.toggle('on',turn==w&&!over)}
 $('#tray').innerHTML=B.filter(b=>!b.a&&b.id).map(b=>`<i class="ch" style="background:${COL[b.id>8?b.id-8:b.id]}">${b.id}</i>`).join('')}
function modal(h){const m=$('#modal');m.innerHTML=`<div class="box">${h}</div>`;m.hidden=0}
const closeM=()=>$('#modal').hidden=1;
function tables(){const rows=Object.entries(db).sort((a,b)=>b[1].w-a[1].w||a[1].l-b[1].l).slice(0,10)
  .map(([n,s],i)=>`<tr${n==me?' class="me"':''}><td>${i+1}</td><td>${esc(n)}</td><td>${s.w}</td><td>${s.l}</td></tr>`).join('');
 const w=db[me]?db[me].w:0;
 const pr=PRIZES.map(([t,n])=>`<li class="${w>=t?'ok':''}"><span>${t} ganadas</span><b>${n}</b>${w>=t?`<a target="_blank" rel="noopener" href="https://wa.me/${CFG.wa}?text=${encodeURIComponent(`Hola, soy ${me}. Gané ${t} partidas en A.M. Ball y quiero reclamar: ${n}`)}">Reclamar</a>`:`<em style="--p:${Math.min(100,w/t*100)}%"></em>`}</li>`).join('');
 return `<div class="cols"><div><h3>Clasificación</h3><table><tr><th>#<th>Jugador<th>G<th>P</tr>${rows}</table></div><div><h3>Premios · ${w} ganadas</h3><ul>${pr}</ul></div></div>`}
function help(cb){modal(`<img src="assets/logo-white.png" alt=""><h2>Instrucciones</h2><div class="how">
<div><b>Apuntar</b>Mueve el mouse sobre la mesa (en celular, desliza el dedo). Con ← → afinas el ángulo.</div>
<div><b>Potencia y tiro</b>Arrastra hacia arriba la barra de potencia de la izquierda y suéltala para tirar (o usa Espacio). Para jugar mejor, ponlo en horizontal y en pantalla completa.</div>
<div><b>Objetivo</b>Emboca todas tus bolas (lisas o rayadas) y al final la bola 8. La primera que embocas define tu grupo.</div>
<div><b>Faltas</b>Si metes la blanca, tocas primero una bola que no es tuya o nada llega a banda, el rival juega con bola en mano.</div>
<div><b>Identificar bolas</b>Mientras es tu turno, tus bolas brillan en dorado sin parar y las demás se oscurecen. En el turno de e-Onyx AI se apagan.</div>
<div><b>Tiempo y premios</b>Cada ronda dura 10 minutos. Suma victorias para ganar mascarillas y un corte gratis.</div></div><button id="ok">Entendido</button>`);
 $('#ok').onclick=()=>{sfx('ui');closeM();cb&&cb()}}
function menu(){modal(`<img src="assets/logo-white.png" alt=""><h2>A.M. Ball</h2><p>Bola 8 contra e-Onyx AI. Cada ronda dura máximo 10 minutos. Si se acaba el tiempo gana quien tenga menos bolas por embocar (empate: gana el bot).</p>${tables()}<button id="play">Jugar</button>`);$('#play').onclick=()=>{sfx('ui');closeM();newGame()}}

/* ---------- RENDER ---------- */
const cv=$('#cv'),cx=cv.getContext('2d'),logo=new Image();let S=1,bg;logo.src='assets/logo-white.png';logo.onload=()=>bg&&build();
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function resize(){const w=$('#wrap'),s=Math.min(w.clientWidth/CW,w.clientHeight/CH),d=devicePixelRatio||1;if(s<=0)return;
 cv.style.width=CW*s+'px';cv.style.height=CH*s+'px';cv.width=CW*s*d;cv.height=CH*s*d;S=s*d;build()}
function build(){bg=document.createElement('canvas');bg.width=cv.width;bg.height=cv.height;const g=bg.getContext('2d');g.scale(S,S);
 let w=g.createLinearGradient(0,0,CW,CH);w.addColorStop(0,'#4d2c19');w.addColorStop(.5,'#25120a');w.addColorStop(1,'#44251a');rr(g,0,0,CW,CH,34);g.fillStyle=w;g.fill();
 g.save();rr(g,0,0,CW,CH,34);g.clip();
 for(let i=0;i<150;i++){g.globalAlpha=.05+Math.random()*.08;g.fillStyle=i%3?'#000':'#c98a52';g.fillRect(0,Math.random()*CH,CW,.6+Math.random()*1.4)}
 g.globalAlpha=1;w=g.createLinearGradient(0,0,0,CH*.5);w.addColorStop(0,'rgba(255,255,255,.17)');w.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=w;g.fillRect(0,0,CW,CH*.5);g.restore();
 w=g.createLinearGradient(0,P-18,0,P+H+18);w.addColorStop(0,'#eceef2');w.addColorStop(.5,'#6d7178');w.addColorStop(1,'#d5d8dd');rr(g,P-17,P-17,W+34,H+34,15);g.strokeStyle=w;g.lineWidth=3;g.stroke();
 w=g.createLinearGradient(0,P-12,0,P+H+12);w.addColorStop(0,'#16684d');w.addColorStop(1,'#073423');g.fillStyle=w;rr(g,P-12,P-12,W+24,H+24,10);g.fill();
 const f=g.createRadialGradient(P+W/2,P+H*.42,30,P+W/2,P+H/2,W*.62);f.addColorStop(0,'#239675');f.addColorStop(.55,'#157052');f.addColorStop(1,'#09412f');g.fillStyle=f;g.fillRect(P,P,W,H);
 g.save();g.beginPath();g.rect(P,P,W,H);g.clip();g.lineWidth=1;
 for(let i=-H;i<W;i+=3){g.strokeStyle=i%6?'rgba(255,255,255,.022)':'rgba(0,0,0,.03)';g.beginPath();g.moveTo(P+i,P);g.lineTo(P+i+H,P+H);g.stroke()}
 for(let i=0;i<5000;i++){g.globalAlpha=.045;g.fillStyle=i%2?'#fff':'#000';g.fillRect(P+Math.random()*W,P+Math.random()*H,1.4,1.4)}g.globalAlpha=1;
 for(const [a,b,c,d,x,y,ww,hh] of [[0,P,0,P+28,P,P,W,28],[0,P+H,0,P+H-28,P,P+H-28,W,28],[P,0,P+28,0,P,P,28,H],[P+W,0,P+W-28,0,P+W-28,P,28,H]]){const q=g.createLinearGradient(a,b,c,d);q.addColorStop(0,'rgba(0,0,0,.5)');q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(x,y,ww,hh)}
 g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=1.2;g.beginPath();g.moveTo(P+W*.25,P);g.lineTo(P+W*.25,P+H);g.stroke();
 g.fillStyle='rgba(255,255,255,.25)';for(const x of[.25,.72]){g.beginPath();g.arc(P+W*x,P+H/2,2.4,0,7);g.fill()}
 if(logo.naturalWidth){const lh=170,lw=lh*logo.naturalWidth/logo.naturalHeight;g.globalAlpha=.3;g.drawImage(logo,P+W/2-lw/2,P+H/2-lh/2-10,lw,lh);g.globalAlpha=1;
  g.font='700 15px Cinzel,Georgia,serif';g.textAlign='center';g.fillStyle='rgba(255,255,255,.22)';g.letterSpacing='6px';g.fillText('A.M. BALL',P+W/2,P+H/2+lh/2+14);g.letterSpacing='0px'}
 g.restore();
 w=g.createLinearGradient(0,P+H+14,0,P+H+42);w.addColorStop(0,'#1d120b');w.addColorStop(1,'#0a0604');rr(g,P+W/2-62,P+H+14,124,28,7);g.fillStyle=w;g.fill();g.strokeStyle='#b9bdc3';g.lineWidth=1.2;g.stroke();
 if(logo.naturalWidth){const lh=22;g.drawImage(logo,P+W/2-52,P+H+17,lh*logo.naturalWidth/logo.naturalHeight,lh)}
 g.font='700 11px Cinzel,Georgia,serif';g.textAlign='left';g.textBaseline='middle';g.fillStyle='#e7e9ec';g.fillText('A.M. BARBER',P+W/2-34,P+H+29);g.textBaseline='alphabetic';
 for(let k=1;k<8;k++)if(k!=4)for(const y of[P-28,P+H+28]){g.fillStyle='#e9dfc2';g.beginPath();g.arc(P+W*k/8,y,3.2,0,7);g.fill();g.fillStyle='#fff8';g.beginPath();g.arc(P+W*k/8-.8,y-.8,1,0,7);g.fill()}
 for(let k=1;k<4;k++)for(const x of[P-28,P+W+28]){g.fillStyle='#e9dfc2';g.beginPath();g.arc(x,P+H*k/4,3.2,0,7);g.fill()}
 for(const p of POCK){const q=g.createRadialGradient(P+p[0],P+p[1],8,P+p[0],P+p[1],33);q.addColorStop(0,'#000');q.addColorStop(.82,'#000');q.addColorStop(.88,'#22120a');q.addColorStop(1,'#4a2d1b');g.fillStyle=q;g.beginPath();g.arc(P+p[0],P+p[1],33,0,7);g.fill();g.strokeStyle='rgba(205,209,215,.75)';g.lineWidth=2;g.beginPath();g.arc(P+p[0],P+p[1],28,0,7);g.stroke()}}
function ball(b,x,y,k,dim){const id=b.id,c=id?COL[id>8?id-8:id]:'#f6f4ee',rx=b.rx||0,ry=b.ry||0;
 cx.save();cx.translate(x,y);cx.scale(k,k);
 const sh=cx.createRadialGradient(3,5,R*.3,3,5,R*1.5);sh.addColorStop(0,'rgba(0,0,0,.55)');sh.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=sh;cx.beginPath();cx.arc(3,5,R*1.5,0,7);cx.fill();
 cx.save();cx.beginPath();cx.arc(0,0,R,0,7);cx.clip();
 cx.fillStyle=id>8?'#f6f4ee':c;cx.fillRect(-R,-R,2*R,2*R);
 if(id>8){const hh=R*.56*Math.max(.3,Math.abs(Math.cos(ry)));cx.fillStyle=c;cx.fillRect(-R,R*.9*Math.sin(ry)-hh,2*R,2*hh)}
 const v=Math.cos(rx)*Math.cos(ry),sg=v<0?-1:1,bx=sg*R*.68*Math.sin(rx),by=sg*R*.68*Math.sin(ry),r=(id?4.7:1.9)*(.5+.5*Math.abs(v));
 cx.fillStyle=id?'#f6f4ee':'#c8262b';cx.beginPath();cx.arc(bx,by,r,0,7);cx.fill();
 if(id){cx.fillStyle='#111';cx.font='700 5.6px sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(id,bx,by+.3)}
 let g=cx.createRadialGradient(-R*.4,-R*.45,1,-R*.1,-R*.1,R*1.25);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(.35,'rgba(255,255,255,0)');g.addColorStop(.65,'rgba(0,0,0,.08)');g.addColorStop(1,'rgba(0,0,0,.68)');cx.fillStyle=g;cx.fillRect(-R,-R,2*R,2*R);
 g=cx.createRadialGradient(R*.45,R*.55,1,R*.45,R*.55,R*.9);g.addColorStop(0,'rgba(255,255,255,.16)');g.addColorStop(1,'rgba(255,255,255,0)');cx.fillStyle=g;cx.fillRect(-R,-R,2*R,2*R);
 if(dim){cx.fillStyle='rgba(0,0,0,.5)';cx.fillRect(-R,-R,2*R,2*R)}
 cx.restore();cx.fillStyle='rgba(255,255,255,.9)';cx.beginPath();cx.ellipse(-R*.38,-R*.44,R*.2,R*.1,-.6,0,7);cx.fill();cx.restore()}
function ray(){const c=B[0],dx=Math.cos(aim),dy=Math.sin(aim);let t=1e9,hit=null;
 for(const b of B){if(!b.a||b===c)continue;const ox=b.x-c.x,oy=b.y-c.y,pr=ox*dx+oy*dy;if(pr<=0)continue;const d2=ox*ox+oy*oy-pr*pr;if(d2>4*R*R)continue;const tt=pr-Math.sqrt(4*R*R-d2);if(tt<t){t=tt;hit=b}}
 const tx=dx>0?(W-R-c.x)/dx:dx<0?(R-c.x)/dx:1e9,ty=dy>0?(H-R-c.y)/dy:dy<0?(R-c.y)/dy:1e9,tw=Math.min(tx,ty);if(tw<t){t=tw;hit=null}return{t,hit,dx,dy}}
function cueStick(a,pull){const c=B[0],dx=Math.cos(a),dy=Math.sin(a),s=R+6+pull*70,e=s+300;
 cx.lineCap='round';cx.strokeStyle='#0005';cx.lineWidth=5;cx.beginPath();cx.moveTo(c.x-dx*s+3,c.y-dy*s+4);cx.lineTo(c.x-dx*e+3,c.y-dy*e+4);cx.stroke();
 const g=cx.createLinearGradient(c.x-dx*s,c.y-dy*s,c.x-dx*e,c.y-dy*e);g.addColorStop(0,'#eadcbc');g.addColorStop(.1,'#c79a5b');g.addColorStop(.7,'#6b3f1d');g.addColorStop(1,'#150c08');
 cx.strokeStyle=g;cx.lineWidth=4.5;cx.beginPath();cx.moveTo(c.x-dx*s,c.y-dy*s);cx.lineTo(c.x-dx*e,c.y-dy*e);cx.stroke();
 cx.strokeStyle='#f4f1e8';cx.lineWidth=4.7;cx.beginPath();cx.moveTo(c.x-dx*(s+3),c.y-dy*(s+3));cx.lineTo(c.x-dx*(s+13),c.y-dy*(s+13));cx.stroke();cx.strokeStyle='#6fb1d6';cx.lineWidth=4.8;cx.beginPath();cx.moveTo(c.x-dx*s,c.y-dy*s);cx.lineTo(c.x-dx*(s+3),c.y-dy*(s+3));cx.stroke()}
function draw(){if(!bg)return;cx.setTransform(1,0,0,1,0,0);cx.drawImage(bg,0,0);cx.setTransform(S,0,0,S,P*S,P*S);
 const gl=state=='idle'&&turn=='me'&&!over,tg=gl?targets(B,grp.me):[],pu=.65+.35*Math.sin(performance.now()/160);
 for(const b of B)if(b.a){const t=gl&&tg.includes(b);
  if(t){const q=cx.createRadialGradient(b.x,b.y,R*.6,b.x,b.y,R*2.8);q.addColorStop(0,`rgba(255,226,138,${.9*pu})`);q.addColorStop(1,'rgba(255,226,138,0)');cx.fillStyle=q;cx.beginPath();cx.arc(b.x,b.y,R*2.8,0,7);cx.fill()}
  ball(b,b.x,b.y,1,gl&&b.id&&!t);
  if(t){cx.strokeStyle=`rgba(255,240,180,${pu})`;cx.lineWidth=1.6;cx.beginPath();cx.arc(b.x,b.y,R+3,0,7);cx.stroke()}}
 for(const s of sinks)ball({id:s.id},s.x+(s.px-s.x)*s.t,s.y+(s.py-s.y)*s.t,1-s.t*.7);
 const mine=state=='idle'&&turn=='me'&&!over&&!hand;
 if(mine){const g=ray();cx.setLineDash([4,6]);cx.strokeStyle='#ffffffaa';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(B[0].x,B[0].y);cx.lineTo(B[0].x+g.dx*g.t,B[0].y+g.dy*g.t);cx.stroke();cx.setLineDash([]);
  const ex=B[0].x+g.dx*g.t,ey=B[0].y+g.dy*g.t;cx.strokeStyle='#fff';cx.beginPath();cx.arc(ex,ey,R,0,7);cx.stroke();
  if(g.hit){const hx=g.hit.x-ex,hy=g.hit.y-ey,hl=Math.hypot(hx,hy)||1;cx.strokeStyle='#ffe28a';cx.beginPath();cx.moveTo(g.hit.x,g.hit.y);cx.lineTo(g.hit.x+hx/hl*60,g.hit.y+hy/hl*60);cx.stroke()}}
 if(mine)cueStick(aim,pw);else if(state=='baim')cueStick(aim,.5)}

/* ---------- ENTRADA ---------- */
function pt(e){const r=cv.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*CW-P;mouse.y=(e.clientY-r.top)/r.height*CH-P}
const okAt=(x,y)=>x>R&&x<W-R&&y>R&&y<H-R&&!B.some(b=>b.a&&b.id&&Math.hypot(b.x-x,b.y-y)<2*R);
function mv(e){pt(e);if(state!='idle'||turn!='me'||over)return;
 if(hand){B[0].x=Math.max(R,Math.min(W-R,mouse.x));B[0].y=Math.max(R,Math.min(H-R,mouse.y))}else aim=Math.atan2(mouse.y-B[0].y,mouse.x-B[0].x)}
cv.addEventListener('pointermove',mv);
cv.addEventListener('pointerdown',e=>{mv(e);if(state=='idle'&&turn=='me'&&!over&&hand&&okAt(B[0].x,B[0].y)){hand=0;say('Apunta y tira (Espacio)')}});
const fireMe=()=>{if(state=='idle'&&turn=='me'&&!hand&&!over&&$('#modal').hidden)shoot(aim,pw)};
let drag=0;const pwr=$('#pwr');
function setP(e){const r=pwr.getBoundingClientRect();pw=Math.max(.1,Math.min(1,1-(e.clientY-r.top)/r.height));$('#fill').style.height=(1-pw)*100+'%'}
pwr.onpointerdown=e=>{if(state!='idle'||turn!='me'||hand||over)return;pwr.setPointerCapture(e.pointerId);drag=1;setP(e)};
pwr.onpointermove=e=>{if(drag)setP(e)};
pwr.onpointerup=()=>{if(drag){drag=0;fireMe()}};
addEventListener('keydown',e=>{if(e.code=='Space'||e.code=='Enter'){if(e.target.tagName!='BUTTON'){e.preventDefault();fireMe()}}
 if(state=='idle'&&turn=='me'){if(e.code=='ArrowLeft')aim-=.003;if(e.code=='ArrowRight')aim+=.003}});
function fs(){const d=document.documentElement;try{if(document.fullscreenElement){document.exitFullscreen();return}
 Promise.resolve((d.requestFullscreen||d.webkitRequestFullscreen).call(d)).then(()=>screen.orientation.lock('landscape')).catch(()=>{})}catch(e){}}
$('#menu').onclick=()=>{modal(`<h2>Menú</h2>${tables()}<div class="row"><button id="m1">Instrucciones</button><button id="m2">Pantalla completa</button><button id="cl">Seguir jugando</button></div>`);
 $('#m1').onclick=()=>help(()=>$('#menu').click());$('#m2').onclick=fs;$('#cl').onclick=closeM};
$('#mu').onclick=e=>{muted=!muted;e.currentTarget.classList.toggle('off',muted)};
addEventListener('resize',resize);new ResizeObserver(()=>{$('#app').hidden||resize()}).observe($('#wrap'));
$('#go').onclick=()=>{if(matchMedia('(pointer:coarse)').matches)fs();me=($('#nm').value.trim()||'Jugador').slice(0,14);db[me]=db[me]||{w:0,l:0};save();
 const i=$('#intro');i.classList.add('out');setTimeout(()=>i.remove(),700);$('#app').hidden=0;resize();ui();help(menu)};

function frame(t){const dt=Math.min(.05,(t-last)/1000||0);last=t;
 if(B.length){
  if(!over&&$('#modal').hidden&&state)time-=dt;
  if(state=='run'){acc+=dt;while(acc>=DT){step(B,ev0);acc-=DT}if(!moving(B))settle()}
  for(const s of sinks)s.t+=dt*4;sinks=sinks.filter(s=>s.t<1);hlT=Math.max(0,hlT-dt);
  if(time<=0&&!over&&state!='run'&&state)endTime();
  const tt=Math.max(0,Math.ceil(time)),ck=$('#clock');ck.textContent=String(tt/60|0).padStart(2,'0')+':'+String(tt%60).padStart(2,'0');ck.classList.toggle('low',tt<60);
  draw()}
 requestAnimationFrame(frame)}
requestAnimationFrame(frame);
})();
