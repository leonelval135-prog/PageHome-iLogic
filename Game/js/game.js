const MONO='assets/logo-monograma.jpg',FULL='assets/logo-completo.jpg';
const W=960,H=540,$=s=>document.querySelector(s),c=$('#c'),x=c.getContext('2d');
let PR=[[50,'Mascarilla de exfoliación'],[60,'Mascarilla de Vitamina C'],[70,'Reparador de ojeras'],[75,'Mascarilla de Carbón Activo'],[100,'Corte GRATIS']];
const pid=(()=>{try{let v=localStorage.getItem('mb_pid');if(!v){v=(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:r&3|8).toString(16)}));localStorage.setItem('mb_pid',v)}return v}catch(e){return'00000000-0000-4000-8000-'+String(Date.now()).padStart(12,'0')}})();
const mono=new Image();mono.src=MONO;$('#logoM').src=FULL;
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),ease=t=>1-Math.pow(1-t,3);
/* ---------- estado ---------- */
let st='intro',it=0,time=0,name='',total=0,sess=0,lives=3,day=today(),rows=[],mi=null,spent=0,online=false,resetAt=0,pend=0,flushing=false;
try{const s=JSON.parse(localStorage.getItem('mb_pc')||'{}');name=s.name||'';if(s.date===day)total=s.goals||0}catch(e){}
$('#nm').value=name;
const aim={x:480,y:290},K={x:480,y:300,a:0,arm:0},B={x:480,y:428,s:1,on:true};
let pw=0,ph=0,down=false,shot=null,resT=0,banner=null,shake=0,parts=[],hint=1;
let hist=[.5,.5,.5,.5,.5,.5],skill=.5,streak=0,trail=[];
/* ---------- audio ---------- */
let ac;const aud=()=>{if(!ac)try{ac=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}};
function snd(f,d,ty='sine',v=.12,sl=0){if(!ac)return;const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+sl),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(ac.destination);o.start();o.stop(t+d)}
/* ---------- fondo estático (gradas, césped, portería) ---------- */
const bg=document.createElement('canvas');bg.width=W;bg.height=H;
(function(){const g=bg.getContext('2d');
let gr=g.createLinearGradient(0,0,0,175);gr.addColorStop(0,'#030303');gr.addColorStop(1,'#141414');g.fillStyle=gr;g.fillRect(0,0,W,210);
const cols=['#262626','#333','#444','#666','#888','#bbb','#e6e6e6'];
for(let r=0;r<11;r++)for(let i=0;i<88;i++){g.fillStyle=cols[Math.random()*7|0];g.globalAlpha=.55+r*.04;g.beginPath();g.arc(6+i*11+(r%2)*5,16+r*14,3.6,0,7);g.fill();g.fillRect(2+i*11+(r%2)*5,21+r*14,8,4)}
g.globalAlpha=1;[[70,14],[890,14],[480,6]].forEach(p=>{const l=g.createRadialGradient(p[0],p[1],2,p[0],p[1],210);l.addColorStop(0,'rgba(255,255,255,.55)');l.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=l;g.fillRect(0,0,W,210)});
let y=208,ws=[...Array(10)].map((_,i)=>1+i*.4),S=ws.reduce((a,b)=>a+b);
ws.forEach((w,i)=>{const h=332*w/S;g.fillStyle=i%2?'#1c6a2c':'#227a34';g.fillRect(0,y,W,h+1);y+=h});
g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=3;
const poly=p=>{g.beginPath();p.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke()};
poly([[60,338],[900,338]]);poly([[170,338],[80,452],[880,452],[790,338]]);poly([[290,338],[240,392],[720,392],[670,338]]);
g.beginPath();g.ellipse(480,452,100,26,0,0,Math.PI);g.stroke();g.fillStyle='#fff';g.beginPath();g.ellipse(480,426,5,3,0,0,7);g.fill();
/* red */
g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=1;
for(let i=0;i<=20;i++){const px=340+i*14;g.beginPath();g.moveTo(px,238);g.lineTo(px,336);g.stroke()}
for(let i=0;i<=7;i++){const py=238+i*14;g.beginPath();g.moveTo(340,py);g.lineTo(620,py);g.stroke()}
g.fillStyle='rgba(255,255,255,.06)';g.fillRect(340,238,280,98);
g.strokeStyle='#f4f4f4';g.lineWidth=7;g.shadowColor='#fff';g.shadowBlur=10;g.lineCap='round';g.beginPath();g.moveTo(340,338);g.lineTo(340,236);g.lineTo(620,236);g.lineTo(620,338);g.stroke();
g.shadowBlur=0;const v=g.createRadialGradient(480,270,200,480,270,640);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=v;g.fillRect(0,0,W,H);
})();
/* ---------- vallas publicitarias ---------- */
const ADS=['MB BARBER','L','GANA PREMIOS SEGÚN TU PUNTAJE','L','CORTE & BARBA','L','MASCARILLAS FACIALES','L','RESERVA TU CITA','L','100 GOLES = CORTE GRATIS','L'];
const bw={};
function board(y,h,off){x.save();x.fillStyle='#060606';x.fillRect(0,y,W,h);x.font='700 '+(h*.52|0)+'px Oswald,Impact,sans-serif';x.textBaseline='middle';
if(!bw[h])bw[h]=ADS.map(a=>a==='L'?h*.8+50:x.measureText(a).width+50);
const L=bw[h].reduce((a,b)=>a+b);let px=-(off%L);
for(let n=0;n<2;n++)ADS.forEach((a,i)=>{if(px<W&&px+bw[h][i]>0){if(a==='L'){x.globalCompositeOperation='lighten';x.drawImage(mono,px+25,y+h*.1,h*.8*.82,h*.8)}else{x.fillStyle=a.startsWith('GANA')?'#e8c86a':i%4===0?'#fff':'#bdbdbd';x.fillText(a,px+25,y+h/2+1)}x.globalCompositeOperation='source-over'}px+=bw[h][i]});
x.fillStyle='#ddd';x.fillRect(0,y,W,2);x.fillRect(0,y+h-2,W,2);x.restore()}
/* ---------- dibujo ---------- */
function drawKeeper(){x.save();x.translate(K.x,K.y);x.rotate(K.a);x.scale(1.1,1.1);
x.fillStyle='#555';x.fillRect(-13,40,10,17);x.fillRect(3,40,10,17);x.fillStyle='#111';x.fillRect(-14,22,12,20);x.fillRect(2,22,12,20);x.fillStyle='#ddd';x.fillRect(-14,56,12,4);x.fillRect(2,56,12,4);
x.lineCap='round';x.lineWidth=9;x.strokeStyle='#1b1b20';[-1,1].forEach(s=>{const hx=s*(36+K.arm*2),hy=-2-K.arm*52;x.beginPath();x.moveTo(s*19,-22);x.lineTo(hx,hy);x.stroke();x.fillStyle='#f0f0f0';x.beginPath();x.arc(hx,hy,7,0,7);x.fill()});
x.fillStyle='#17171c';x.strokeStyle='#e8e8e8';x.lineWidth=2;x.beginPath();x.roundRect(-20,-30,40,56,8);x.fill();x.stroke();
x.globalCompositeOperation='lighten';x.drawImage(mono,-15,-25,30,37);x.globalCompositeOperation='source-over';
x.fillStyle='#c9a27e';x.beginPath();x.arc(0,-41,11,0,7);x.fill();x.fillStyle='#111';x.beginPath();x.arc(0,-44,11,Math.PI,0);x.fill();x.restore()}
function drawBall(bx,by,s){const r=12*s;x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(bx,lerp(432,340,shot?shot.p:0)+r*.3,r*.9,r*.3,0,0,7);x.fill();
const g=x.createRadialGradient(bx-r*.3,by-r*.3,1,bx,by,r);g.addColorStop(0,'#fff');g.addColorStop(1,'#bbb');x.fillStyle=g;x.beginPath();x.arc(bx,by,r,0,7);x.fill();
x.fillStyle='#222';const a=time*(shot?9:0);x.beginPath();for(let i=0;i<5;i++){const q=a+i*1.2566;x.lineTo(bx+Math.cos(q)*r*.42,by+Math.sin(q)*r*.42)}x.fill();x.strokeStyle='#999';x.lineWidth=1;x.beginPath();x.arc(bx,by,r,0,7);x.stroke()}
function txt(t,px,py,sz,col,al='center'){x.font='700 '+sz+'px Oswald,Impact,sans-serif';x.textAlign=al;x.fillStyle=col;x.fillText(t,px,py)}
function scene(){x.drawImage(bg,0,0);board(172,34,time*70);board(500,40,time*110);
for(let i=0;i<6;i++){if(Math.random()<.5){x.fillStyle='rgba(255,255,255,'+rnd(.4,1)+')';x.fillRect(rnd(0,W),rnd(15,165),3,3)}}
drawKeeper();if(B.on)drawBall(B.x,B.y,B.s);
parts.forEach(p=>{x.fillStyle=p.c;x.globalAlpha=clamp(p.l,0,1);x.fillRect(p.x,p.y,p.w,p.w*.6)});x.globalAlpha=1}
function hud(){
txt('GOLES HOY',24,34,14,'#aaa','left');txt(String(total),24,70,40,'#fff','left');
txt('PARTIDA',W-24,34,14,'#aaa','right');txt(String(sess),W-24,70,40,'#fff','right');
for(let i=0;i<3;i++){x.globalAlpha=i<lives?1:.25;x.fillStyle='#fff';x.beginPath();x.arc(W/2-24+i*24,28,8,0,7);x.fill()}x.globalAlpha=1;
const sd=saldo(),n=PR.find(p=>sd<p[0]);txt(n?'SIGUIENTE: '+n[1].toUpperCase()+'  '+sd+'/'+n[0]:'¡TODOS LOS PREMIOS DESBLOQUEADOS!',W/2,60,15,'#e8c86a');
if(st==='aim'){x.fillStyle='#0008';x.fillRect(330,482,300,12);x.fillStyle='#2fbf5b';x.fillRect(330+300*.6,482,300*.28,12);x.fillStyle='#fff';x.fillRect(328+300*pw,478,5,20);
const a=aim,p=1+Math.sin(time*8)*.08;x.strokeStyle='#fff';x.lineWidth=2.5;x.shadowColor='#000';x.shadowBlur=6;x.beginPath();x.arc(a.x,a.y,16*p,0,7);x.moveTo(a.x-24,a.y);x.lineTo(a.x-8,a.y);x.moveTo(a.x+8,a.y);x.lineTo(a.x+24,a.y);x.moveTo(a.x,a.y-24);x.lineTo(a.x,a.y-8);x.moveTo(a.x,a.y+8);x.lineTo(a.x,a.y+24);x.stroke();x.shadowBlur=0;
if(hint>0)txt('Apunta, y suelta con la barra en verde',W/2,470,17,'#fff')}
if(banner){x.save();x.translate(W/2,250);const s=1+Math.max(0,.4-banner.t)*2;x.scale(s,s);x.globalAlpha=clamp(banner.life*2,0,1);x.shadowColor='#000';x.shadowBlur=20;txt(banner.text,0,0,banner.big?84:64,banner.col);x.restore()}}
/* ---------- juego ---------- */
const clampAim=p=>({x:clamp(p.x,315,645),y:clamp(p.y,215,352)});
/* ===== IA DEL PORTERO =====
   1) Percepción: ve tu mira con retraso (200 ms - 70 ms*skill) y con ruido; si mueves la mira al final, lo engañas.
   2) Memoria: histograma de 6 zonas con decaimiento (aprende dónde sueles tirar).
   3) Inferencia: posterior ~ prior^0.7 x verosimilitud gaussiana de la mira percibida.
   4) Decisión: elige la zona más probable (con error epsilon que baja con skill) y compromete el salto.
   5) Física: tiempo de reacción, velocidad máxima de salto y alcance elíptico; los tiros muy rápidos a las esquinas son imparables.
   6) Dificultad dinámica: skill sube con tus goles del día y con tu racha. */
function aimAt(t){for(let i=trail.length-1;i>=0;i--)if(trail[i].t<=t)return trail[i];return trail[0]||aim}
function shoot(){hint=0;let m=pw,tx=aim.x+rnd(-5,5),ty=aim.y+rnd(-5,5);
if(m<.6){tx=lerp(tx,480,(.6-m)*1.5);ty=Math.max(ty,300-m*40)}
if(m>.88)ty-=(m-.88)*rnd(300,900);
const dur=lerp(.95,.42,m);let res,fx=480,fy=300;
if(tx<333||tx>627||ty<229)res='fuera';else if(Math.abs(tx-340)<8||Math.abs(tx-620)<8||Math.abs(ty-236)<8)res='poste';
else{ty=Math.min(ty,334);skill=clamp(.5+Math.min(.25,total/200)+streak*.04,.4,1);
const q=aimAt(time-(.2-.07*skill)),nz=60-30*skill,pa={x:q.x+rnd(-1,1)*nz,y:q.y+rnd(-1,1)*nz*.6},cx=[385,480,575],cy=[258,315],sg=95-45*skill,po=[],hs=hist.reduce((a,b)=>a+b);let su=0;
for(let i=0;i<6;i++){const d2=(pa.x-cx[i%3])**2+(pa.y-cy[i/3|0])**2;po[i]=Math.pow(hist[i]/hs,.7)*(Math.exp(-d2/(2*sg*sg))+.03);su+=po[i]}
let z=0;if(Math.random()<.2-.12*skill){let r=Math.random()*su;while(z<5&&(r-=po[z])>0)z++}else z=po.indexOf(Math.max(...po));
const kx=lerp(cx[z%3],pa.x,.45),ky=lerp(cy[z/3|0],pa.y,.45),rt=.17-.05*skill,ta=Math.max(0,dur-rt),vx=430+160*skill,vy=330+120*skill;
fx=K.x+clamp(kx-K.x,-vx*ta,vx*ta);fy=clamp(300+clamp(ky-300,-vy*ta,vy*ta),262,318);
if(m<.4){fx=tx;fy=clamp(ty,262,318)}
const d=Math.hypot((tx-fx)/(54+10*skill),(ty-fy)/(78+10*skill));res=d<1.08?'atajada':'gol';
hist=hist.map(v=>v*.82);hist[(ty<285?0:3)+(tx<433?0:tx<527?1:2)]+=1}
K.tx=fx;K.ty=fy;if(res==='fuera'||res==='poste'){K.tx=480+rnd(-80,80);K.ty=300}
shot={t:0,dur,sx:480,sy:428,tx,ty,res,p:0,k0:K.x};st='shot';snd(220,.09,'triangle',.25,-120)}
function burst(){for(let i=0;i<120;i++)parts.push({x:480,y:300,vx:rnd(-380,380),vy:rnd(-520,-120),w:rnd(5,10),l:rnd(1,2),c:['#fff','#ccc','#999','#e8c86a'][i%4]})}
function resolve(){const r=shot.res;resT=1.7;st='result';streak=r==='gol'?Math.min(streak+1,8):r==='atajada'?Math.max(0,streak-2):streak;
if(r==='gol'){sess++;total++;burst();shake=14;banner={text:'¡GOOOL!',col:'#fff',t:0,life:1.6,big:1};snd(523,.15);setTimeout(()=>snd(659,.15),120);setTimeout(()=>snd(784,.35),240);
const u=PR.find(p=>p[0]===saldo());if(u)setTimeout(()=>{banner={text:'🎁 '+u[1].toUpperCase(),col:'#e8c86a',t:0,life:2.2};snd(880,.5)},900);queueGoal()}
else{lives--;banner={text:r==='atajada'?'¡ATAJADA!':r==='poste'?'¡AL POSTE!':'¡FUERA!',col:'#f66',t:0,life:1.5};snd(r==='atajada'?140:300,.25,'square',.1,-60);shake=r==='atajada'?6:3}}
function next(){shot=null;B.x=480;B.y=428;B.s=1;B.on=true;if(lives<=0){over();return}st='aim'}
function update(dt){time+=dt;
if(st==='intro'){it+=dt;if(it>1.5)$('#it').classList.add('on');if(it>4.6){st='menu';$('#it').classList.remove('on');openMenu()}}
if(st==='aim'||st==='menu'){const t=480+Math.sin(time*2.3)*(st==='aim'?34:20)+(st==='aim'?(aim.x-480)*.1:0);K.x+=(t-K.x)*Math.min(1,dt*6);K.y+=(300-K.y)*Math.min(1,dt*6);K.a+=(0-K.a)*Math.min(1,dt*6);K.arm+=(0-K.arm)*Math.min(1,dt*6)}
if(st==='aim'){ph+=dt*(1.5+skill*.7);pw=Math.abs(((ph%2)+2)%2-1);trail.push({t:time,x:aim.x,y:aim.y});while(trail.length>2&&trail[0].t<time-1.5)trail.shift()}
if(st==='shot'){const s=shot;s.t+=dt;s.p=Math.min(1,s.t/s.dur);const p=s.p;B.x=lerp(s.sx,s.tx,p);B.y=lerp(s.sy,s.ty,p)-Math.sin(Math.PI*p)*26;B.s=lerp(1,.5,p);
const q=ease(clamp((s.t-.1)/(s.dur*.8),0,1));K.x=lerp(s.k0,K.tx,q);K.y=lerp(300,K.ty,q);K.a=clamp((K.tx-s.k0)/150,-1,1)*1.15*q;K.arm=q;if(p>=1)resolve()}
if(st==='result'){resT-=dt;if(shot.res==='atajada'){B.x+=(K.x-B.x)*dt*8;B.y+=(K.y-B.y)*dt*8}if(shot.res==='fuera'&&B.y<229){B.on=B.s>.1;B.s*=.97;B.y-=60*dt}if(resT<=0)next()}
parts.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=900*dt;p.l-=dt});parts=parts.filter(p=>p.l>0);if(banner){banner.t+=dt;banner.life-=dt;if(banner.life<=0)banner=null}shake*=.9}
function intro(){const e=ease(clamp(it/4.2,0,1));x.save();x.fillStyle='#000';x.fillRect(0,0,W,H);x.translate(W/2,H/2-(1-e)*30);x.rotate(-(1-e)*.2+Math.sin(time*.8)*.004);const s=.5+.5*e;x.scale(s,s);x.translate(-W/2,-H/2);x.filter='blur('+((1-e)*5).toFixed(1)+'px)';scene();x.restore();x.filter='none';
x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=2;[[24,24,1,1],[W-24,24,-1,1],[24,H-24,1,-1],[W-24,H-24,-1,-1]].forEach(q=>{x.beginPath();x.moveTo(q[0]+q[2]*40,q[1]);x.lineTo(q[0],q[1]);x.lineTo(q[0],q[1]+q[3]*40);x.stroke()});
txt((Math.sin(time*5)>0?'● ':'○ ')+'REC  DRON-01',44,52,16,'#fff','left');txt('ALT '+Math.round(140*(1-e)+2)+' m',W-44,52,16,'#fff','right');txt('VEL '+Math.round(38*(1-e))+' km/h',W-44,76,13,'#aaa','right');
x.fillStyle='rgba(0,0,0,.12)';for(let i=0;i<H;i+=4)x.fillRect(0,i,W,1)}
function render(){x.save();if(shake>.5)x.translate(rnd(-shake,shake),rnd(-shake,shake));
if(st==='intro')intro();else{if(st==='menu'){x.translate(W/2,H/2);x.scale(1.02+Math.sin(time*.5)*.01,1.02+Math.sin(time*.5)*.01);x.translate(-W/2,-H/2)}scene();if(st!=='menu')hud()}x.restore()}
let last=performance.now();(function loop(n){const dt=Math.min(.05,(n-last)/1000);last=n;update(dt);render();requestAnimationFrame(loop)})(last);
/* ---------- entrada ---------- */
const pos=e=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}};
c.addEventListener('pointerdown',e=>{if(st!=='aim')return;aud();Object.assign(aim,clampAim(pos(e)));down=true;try{c.setPointerCapture(e.pointerId)}catch(_){}});
c.addEventListener('pointermove',e=>{if(st==='aim'&&(e.pointerType==='mouse'||down))Object.assign(aim,clampAim(pos(e)))});
c.addEventListener('pointerup',()=>{if(st==='aim'&&down){down=false;shoot()}});
$('#intro').parentNode.addEventListener('click',()=>{if(st==='intro'&&it>.8)it=4.6});
/* ---------- datos: Supabase (clasificación diaria, puntos y canjeo) ---------- */
const PC=window.PC||{},CFG=!!(PC.url&&PC.key);
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function saldo(){return Math.max(0,total-spent)}
async function RPC(fn,args){if(!CFG)throw new Error('config');
const r=await fetch(PC.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:PC.key,Authorization:'Bearer '+PC.key},body:JSON.stringify(args||{})});
if(!r.ok){let m='';try{m=(await r.json()).message||''}catch(e){}const e=new Error(m||('http '+r.status));e.http=true;throw e}return r.json()}
function persist(){try{localStorage.setItem('mb_pc',JSON.stringify({name,date:day,goals:total}))}catch(e){}}
/* El servidor manda: día (hora CDMX), goles, goles canjeados y segundos que faltan para el reinicio. */
function applyState(s){if(!s)return;if(s.dia&&s.dia!==day){day=s.dia;rows=[];mi=null}
if(pend===0)total=s.goles;spent=s.canjeados;resetAt=Date.now()+s.segundos*1000;online=true;persist()}
async function sync(){try{applyState(await RPC('pc_estado',{p_player:pid}))}catch(e){online=false}refreshUI()}
/* Cola de goles: se envían de uno en uno (el servidor exige 1.5 s entre goles) y se reintentan si no hay red. */
function queueGoal(){pend++;persist();flush()}
async function flush(){if(flushing)return;flushing=true;
while(pend>0){try{const s=await RPC('pc_registrar_gol',{p_player:pid,p_nombre:name});pend--;applyState(s);await sleep(1700)}
catch(e){const m=String(e.message);if(e.http&&!m.includes('rapido')){pend=m.includes('limite')?0:pend-1}else await sleep(m.includes('rapido')?1700:5000)}}
flushing=false;await sync();loadBoard()}
async function loadBoard(){try{const d=await RPC('pc_clasificacion',{p_player:pid});online=true;
if(d.dia!==day){day=d.dia;total=0;spent=0;persist();sync()}
resetAt=Date.now()+d.segundos*1000;rows=d.top||[];mi=d.mi_pos||null}catch(e){online=false}lb();refreshUI()}
async function loadPrizes(){try{const d=await RPC('pc_premios');if(Array.isArray(d)&&d.length){PR=d.map(p=>[p.costo,p.nombre,p.id]);refreshUI()}}catch(e){}}
function lb(){let r=rows.slice();
if(!online)r=total>0?[{pos:1,nombre:name||'Tú',goles:total,yo:true}]:[];
else if(mi&&mi>10)r.push({pos:mi,nombre:name||'Tú',goles:total,yo:true});
['#lb','#lb2'].forEach(s=>{const o=$(s);o.textContent='';if(!r.length){const l=document.createElement('li');l.textContent='Sé el primero en marcar hoy';o.appendChild(l)}
r.forEach(q=>{const l=document.createElement('li'),a=document.createElement('em'),n=document.createElement('span'),g=document.createElement('b');a.textContent=q.pos;n.textContent=q.nombre||'Jugador';g.textContent=q.goles;if(q.yo)l.className='me';l.append(a,n,g);o.appendChild(l)})})}
function prizes(){const o=$('#pz');o.textContent='';const sd=saldo();PR.forEach(p=>{const l=document.createElement('li'),d=document.createElement('div'),a=document.createElement('span'),b=document.createElement('b'),ba=document.createElement('div'),i=document.createElement('i'),ok=sd>=p[0];l.className='pz'+(ok?' ok':'');a.textContent=p[1];b.textContent=ok?'✓ LISTO PARA CANJEAR':p[0]+' goles';d.append(a,b);ba.className='bar';i.style.width=Math.min(100,sd/p[0]*100)+'%';ba.appendChild(i);l.append(d,ba);o.appendChild(l)})}
function refreshUI(){prizes();paintCanje()}
/* cuenta regresiva hasta las 12:00 a. m. (hora de Ciudad de México) */
let rolling=false;const p2=n=>String(n).padStart(2,'0');
function tickReset(){let t;if(!CFG)t='Modo local: configura Supabase en js/config.js para la clasificación compartida.';
else if(!online)t='Sin conexión con la base de datos. Tus goles se enviarán al reconectar.';
else{const s=Math.max(0,Math.round((resetAt-Date.now())/1000));t='La tabla se reinicia a las 12:00 a. m. (hora CDMX) · faltan '+p2(s/3600|0)+':'+p2(s%3600/60|0)+':'+p2(s%60);
if(s===0&&!rolling){rolling=true;sync().then(loadBoard).finally(()=>setTimeout(()=>{rolling=false},3000))}}
document.querySelectorAll('.rst').forEach(e=>{e.textContent=t})}
function rollDay(){if(online)return;const t=today();if(t!==day){day=t;total=0;spent=0;persist()}}
function openMenu(){rollDay();$('#over').classList.remove('on');$('#canje').classList.remove('on');$('#menu').classList.add('on');st='menu';refreshUI();lb();loadBoard()}
function begin(){aud();rollDay();name=$('#nm').value.trim().slice(0,14)||name||'Jugador'+(Math.random()*900+100|0);$('#nm').value=name;persist();sync();
$('#menu').classList.remove('on');$('#over').classList.remove('on');lives=3;sess=0;parts=[];banner=null;shot=null;B.on=true;B.x=480;B.y=428;B.s=1;hint=1;st='aim'}
function over(){st='over';flush();
$('#ov').textContent='Marcaste '+sess+' gol'+(sess===1?'':'es')+' en esta partida. Total de hoy: '+total+'.';
const v=$('#vc');v.textContent='';if(PR.length&&saldo()>=Math.min(...PR.map(p=>p[0]))){const d=document.createElement('div');d.className='voucher';d.textContent='🎁 Tienes '+saldo()+' goles para canjear';v.appendChild(d)}
lb();$('#over').classList.add('on')}
/* ---------- Canjeo ---------- */
let busy=false,certUrl='',certFolio='',canjeFrom='menu';
const fmtDia=d=>String(d).split('-').reverse().join('/');
const fmtFecha=i=>new Date(i).toLocaleString('es-MX',{timeZone:'America/Mexico_City',dateStyle:'long',timeStyle:'short'});
const ERR={insuficiente:'No te alcanzan los goles de hoy para ese premio.',premio:'Ese premio ya no está disponible.',sin_puntos:'Aún no tienes goles hoy.',jugador:'No se pudo identificar al jugador.'};
const errTxt=e=>ERR[String(e&&e.message)]||'No se pudo completar. Revisa tu conexión e inténtalo de nuevo.';
function cmsg(t){$('#cmsg').textContent=t||''}
function openCanje(){canjeFrom=st;$('#menu').classList.remove('on');$('#over').classList.remove('on');$('#canje').classList.add('on');cmsg('');$('#fres').textContent='';paintCanje();loadMine();loadBoard()}
function closeCanje(){$('#canje').classList.remove('on');if(canjeFrom==='over')$('#over').classList.add('on');else openMenu()}
function paintCanje(){if(!$('#canje').classList.contains('on'))return;
$('#cgol').textContent=total;$('#cspent').textContent=spent;$('#csal').textContent=saldo();
const o=$('#cpz');o.textContent='';const sd=saldo();
PR.forEach(p=>{const l=document.createElement('li'),L=document.createElement('div'),d=document.createElement('div'),a=document.createElement('span'),b=document.createElement('b'),ba=document.createElement('div'),i=document.createElement('i'),bt=document.createElement('button'),ok=sd>=p[0];
l.className='pz cj'+(ok?' ok':'');L.className='pl';d.style.display='flex';d.style.justifyContent='space-between';a.textContent=p[1];b.textContent=p[0]+' goles';d.append(a,b);ba.className='bar';i.style.width=Math.min(100,sd/p[0]*100)+'%';ba.appendChild(i);L.append(d,ba);
bt.textContent='CANJEAR';bt.disabled=!(ok&&p[2]&&online&&!busy);bt.onclick=()=>canjear(p);l.append(L,bt);o.appendChild(l)})}
async function loadMine(){const o=$('#cmine');let d=[];try{d=await RPC('pc_mis_canjes',{p_player:pid})}catch(e){}
o.textContent='';if(!d.length){const l=document.createElement('li');l.textContent='Aún no has canjeado premios';o.appendChild(l);return}
d.forEach(c=>{const l=document.createElement('li'),s=document.createElement('span'),sm=document.createElement('small'),bt=document.createElement('button');l.className='mine';
s.textContent=c.premio;sm.textContent=c.folio+' · '+fmtDia(c.dia)+' · '+(c.estado==='entregado'?'entregado':'pendiente de entrega');s.appendChild(sm);
bt.className='g';bt.textContent='VER';bt.onclick=()=>showCert(c);l.append(s,bt);o.appendChild(l)})}
function ask(t,s){return new Promise(res=>{$('#cft').textContent=t;$('#cfs').textContent=s;$('#conf').classList.add('on');const done=v=>{$('#conf').classList.remove('on');res(v)};$('#cfy').onclick=()=>done(true);$('#cfn').onclick=()=>done(false)})}
async function canjear(p){if(busy||!p[2])return;
if(!(await ask('¿Canjear «'+p[1]+'»?','Se descontarán '+p[0]+' goles de tu saldo de hoy ('+saldo()+'). Esto no se puede deshacer.')))return;
busy=true;paintCanje();cmsg('Procesando tu canje…');
try{for(let i=0;i<40&&(pend>0||flushing);i++)await sleep(400);
const r=await RPC('pc_canjear',{p_player:pid,p_premio:p[2]});applyState(r.estado);cmsg('');await showCert(r.canje);loadMine();loadBoard()}
catch(e){cmsg(errTxt(e))}busy=false;refreshUI()}
async function showCert(c){try{certUrl=await makeCert(c);certFolio=c.folio;$('#certImg').src=certUrl;$('#cert').classList.add('on')}catch(e){cmsg('No se pudo generar la imagen. Folio: '+c.folio)}}
/* ---------- certificado en imagen (canvas 1080×1500) ---------- */
const certLogo=new Image();if(window.MONO_DATA)certLogo.src=window.MONO_DATA;
function wrapTxt(g,t,max){const w=t.split(' '),out=[];let cur='';w.forEach(k=>{const n=cur?cur+' '+k:k;if(g.measureText(n).width>max&&cur){out.push(cur);cur=k}else cur=n});if(cur)out.push(cur);return out}
function drawCert(g,c,logo){const GOLD='#e8c86a',CX=540;
g.fillStyle='#070707';g.fillRect(0,0,1080,1500);
const gl=g.createRadialGradient(CX,300,40,CX,300,760);gl.addColorStop(0,'rgba(232,200,106,.17)');gl.addColorStop(1,'rgba(232,200,106,0)');g.fillStyle=gl;g.fillRect(0,0,1080,1500);
g.strokeStyle=GOLD;g.lineWidth=6;g.strokeRect(40,40,1000,1420);g.lineWidth=2;g.strokeStyle='rgba(232,200,106,.5)';g.strokeRect(62,62,956,1376);
g.fillStyle=GOLD;[[40,40],[1040,40],[40,1460],[1040,1460]].forEach(q=>{g.save();g.translate(q[0],q[1]);g.rotate(Math.PI/4);g.fillRect(-11,-11,22,22);g.restore()});
const T=(t,y,sz,col,ls,mw)=>{const L='letterSpacing' in g,F=z=>'700 '+z+'px Oswald,Impact,system-ui,sans-serif';g.textAlign='center';g.textBaseline='alphabetic';g.fillStyle=col;if(L)g.letterSpacing=(ls||0)+'px';g.font=F(sz);
if(mw)while(sz>16&&g.measureText(t).width>mw){sz-=2;g.font=F(sz)}
g.fillText(t,CX+(ls&&L?ls/2:0),y);if(L)g.letterSpacing='0px'};
if(logo){g.save();g.globalCompositeOperation='lighten';g.drawImage(logo,CX-95,105,190,230);g.restore()}
T('CERTIFICADO DE CANJE',430,72,'#fff',6,880);T('MB BARBER · PENALTY CUP',482,28,GOLD,8);
g.strokeStyle='rgba(232,200,106,.7)';g.lineWidth=2;g.beginPath();g.moveTo(180,530);g.lineTo(500,530);g.moveTo(580,530);g.lineTo(900,530);g.stroke();g.fillStyle=GOLD;g.save();g.translate(CX,530);g.rotate(Math.PI/4);g.fillRect(-8,-8,16,16);g.restore();
T('SE CERTIFICA QUE',600,28,'#9a9a9a',6);
let sz=96,nm=String(c.nombre||'Jugador').toUpperCase();g.font='700 '+sz+'px Oswald,Impact,sans-serif';while(sz>40&&g.measureText(nm).width>860){sz-=4;g.font='700 '+sz+'px Oswald,Impact,sans-serif'}
T(nm,705,sz,'#fff',2);g.strokeStyle='rgba(255,255,255,.25)';g.beginPath();g.moveTo(240,735);g.lineTo(840,735);g.stroke();
T('HA CANJEADO EL PREMIO',805,28,'#9a9a9a',6);
g.font='700 70px Oswald,Impact,sans-serif';const ln=wrapTxt(g,String(c.premio).toUpperCase(),860).slice(0,2);ln.forEach((t,i)=>T(t,905+i*84,70,GOLD,1));
T('POR '+c.costo+' GOLES',1070,40,'#fff',4);
g.setLineDash([14,10]);g.strokeStyle=GOLD;g.lineWidth=3;g.strokeRect(190,1105,700,150);g.setLineDash([]);
T('FOLIO',1148,24,'#9a9a9a',8);T(c.folio,1226,78,GOLD,6,640);
T('Emitido: '+fmtFecha(c.creado)+' (hora CDMX)',1305,26,'#ddd',1,880);T('Goles de la jornada del '+fmtDia(c.dia),1341,22,'#9a9a9a',1,880);
T('Presenta este certificado en MB Barber para recibir tu premio.',1384,22,'#9a9a9a',1,880);T('Un solo uso · El folio se puede verificar en la sección Canjeo.',1412,20,'#6f6f6f',1,880);
g.save();g.translate(900,215);g.rotate(.2);g.strokeStyle=GOLD;g.lineWidth=5;g.beginPath();g.arc(0,0,92,0,7);g.stroke();g.lineWidth=2;g.beginPath();g.arc(0,0,80,0,7);g.stroke();
g.fillStyle=GOLD;g.font='700 26px Oswald,sans-serif';g.textAlign='center';g.fillText('CANJEADO',0,-12);g.font='700 52px system-ui,sans-serif';g.fillText('✓',0,40);g.restore()}
async function makeCert(c){try{await document.fonts.load('700 40px Oswald')}catch(e){}
for(const lg of[certLogo,null]){const cv=document.createElement('canvas');cv.width=1080;cv.height=1500;
try{drawCert(cv.getContext('2d'),c,lg&&lg.complete&&lg.naturalWidth?lg:null);return cv.toDataURL('image/png')}catch(e){}}
throw new Error('cert')}
/* ---------- eventos ---------- */
$('#play').onclick=begin;$('#again').onclick=begin;$('#tomenu').onclick=openMenu;
$('#goCanje').onclick=openCanje;$('#goCanje2').onclick=openCanje;$('#cback').onclick=closeCanje;$('#certX').onclick=()=>$('#cert').classList.remove('on');
$('#nm').addEventListener('keydown',e=>{if(e.key==='Enter')begin()});
$('#certDl').onclick=()=>{const a=document.createElement('a');a.href=certUrl;a.download='certificado-'+certFolio+'.png';document.body.appendChild(a);a.click();a.remove()};
$('#certSh').onclick=async()=>{try{const b=await(await fetch(certUrl)).blob(),f=new File([b],'certificado-'+certFolio+'.png',{type:'image/png'});
if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:'Certificado de canje · MB Barber'});else $('#certDl').click()}catch(e){}};
$('#fver').onclick=async()=>{const f=$('#fol').value.trim(),o=$('#fres');if(!f)return;o.textContent='Buscando…';
try{const r=await RPC('pc_verificar',{p_folio:f});o.textContent=r?'✔ '+r.folio+' · '+r.nombre+' · '+r.premio+' · '+r.costo+' goles · '+fmtDia(r.dia)+' · '+(r.estado==='entregado'?'YA ENTREGADO':'PENDIENTE DE ENTREGA'):'✖ Folio no encontrado.'}catch(e){o.textContent='No se pudo verificar. Revisa tu conexión.'}};
$('#fol').addEventListener('keydown',e=>{if(e.key==='Enter')$('#fver').click()});
setInterval(tickReset,1000);tickReset();
setInterval(()=>{if(st==='menu'||st==='over'||$('#canje').classList.contains('on'))loadBoard()},10000);
(async()=>{await loadPrizes();await sync();loadBoard()})();
