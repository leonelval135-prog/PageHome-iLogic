(()=>{'use strict';
const W=1000,H=500,R=11,DT=1/360,P=46,CW=W+2*P,CH=H+2*P,$=s=>document.querySelector(s);
let PRIZES=[[20,'Mascarilla de exfoliación',0],[40,'Mascarilla de Vitamina C',0],[60,'Reparador de ojeras',0],[85,'Mascarilla de Carbón Activo',0],[100,'Corte GRATIS',0]]; // [victorias, nombre, id]; Supabase (ab_premios) los reemplaza
const CFG={botBreaks:true,botAcc:.95,minutes:5,shot:30}; // botAcc = prob. de tiro exacto del bot; shot = segundos para tirar
const POCK=[[-4,-4],[W/2,-13],[W+4,-4],[-4,H+4],[W/2,H+13],[W+4,H+4]];
const JAW=[[34,0],[W/2-26,0],[W/2+26,0],[W-34,0],[34,H],[W/2-26,H],[W/2+26,H],[W-34,H],[0,34],[0,H-34],[W,34],[W,H-34]];
const COL=['','#f2c230','#1c4fa8','#d92f2a','#5a2a86','#ef7d22','#1f8a4c','#7a1f1f','#111'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
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
 tick(){tone(900,.06,.14,'square')},
 ui(){tone(620,.08,.14,'triangle',980)},
 win(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.45,.2,'triangle'),i*130))},
 lose(){[392,330,262].forEach((f,i)=>setTimeout(()=>tone(f,.5,.2,'sawtooth'),i*180))}};
const sfx=(n,a)=>{if(muted)return;try{SFX[n](a)}catch(e){}};

/* ---------- CUENTA Y SUPABASE (misma cuenta y mismo proyecto que el sitio A.M. Barber) ---------- */
const BL=window.BL||{},ON=!!(BL.url&&BL.key);
const REF=(()=>{try{return new URL(BL.url).hostname.split('.')[0]}catch(e){return''}})();
const SES=(()=>{try{const ok=x=>{x=x&&(x.currentSession||x);return x&&x.user&&x.user.id?x:null};let r=ok(JSON.parse(localStorage.getItem('sb-'+REF+'-auth-token')||'null'));if(r)return r;
 for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^sb-.+-auth-token$/.test(k)){r=ok(JSON.parse(localStorage.getItem(k)||'null'));if(r)return r}}return null}catch(e){return null}})();
const pid=SES?SES.user.id:null;let name='';
if(SES){const m=SES.user.user_metadata||{};name=String(m.name||m.full_name||(SES.user.email||'').split('@')[0]||'Jugador').slice(0,14);
 fetch(BL.url+'/rest/v1/profiles?select=name&id=eq.'+SES.user.id,{headers:{apikey:BL.key,Authorization:'Bearer '+SES.access_token}}).then(r=>r.ok?r.json():[]).then(a=>{if(a&&a[0]&&a[0].name){name=String(a[0].name).slice(0,14);me=name;$('#nm').value=name;ui()}}).catch(()=>{})}
let ST={g:0,p:0,e:0,c:[],L:null},rows=[],mi=null,online=false,pend=[],flushing=false,busy=false; // ST = estado del servidor (ganadas, perdidas, empates, premios canjeados); pend = resultados por enviar
try{const s=JSON.parse(localStorage.ab_st||'null');if(s&&s.pid===pid)ST=s.st}catch(e){}
try{const s=JSON.parse(localStorage.ab_pend||'null');if(s&&s.pid===pid)pend=s.q||[]}catch(e){}
const saveST=()=>{try{localStorage.ab_st=JSON.stringify({pid,st:ST})}catch(e){}},saveP=()=>{try{localStorage.ab_pend=JSON.stringify({pid,q:pend})}catch(e){}};
const cnt=k=>pend.filter(x=>x.r==k).length,wins=()=>ST.g+cnt('gano');
async function RPC(fn,a){if(!ON)throw new Error('config');
 const r=await fetch(BL.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:BL.key,Authorization:'Bearer '+BL.key},body:JSON.stringify(a||{})});
 if(!r.ok){let m='';try{m=(await r.json()).message||''}catch(e){}const e=new Error(m||('http '+r.status));e.http=1;throw e}return r.json()}
const applyState=s=>{if(!s)return;ST={g:s.ganadas|0,p:s.perdidas|0,e:s.empates|0,c:s.canjeados||[],L:s.limite||null};saveST()};
async function sync(){if(!pid)return;try{applyState(await RPC('ab_estado',{p_player:pid}));online=true}catch(e){online=false}}
async function loadBoard(){if(!pid)return;try{const d=await RPC('ab_clasificacion',{p_player:pid});online=true;rows=d.top||[];mi=d.mi_pos||null}catch(e){online=false}}
async function loadPrizes(){try{const d=await RPC('ab_premios');if(Array.isArray(d)&&d.length)PRIZES=d.map(p=>[p.costo,p.nombre,p.id])}catch(e){}}
/* Cola de resultados: se envían de uno en uno y se reintentan si no hay red. */
function report(r,s){if(!pid)return;pend.push({r,s});saveP();return flush()}
async function flush(){if(flushing||!pid)return;flushing=true;
 try{while(pend.length){const it=pend[0];
  try{applyState(await RPC('ab_registrar',{p_player:pid,p_nombre:name||me,p_resultado:it.r,p_segundos:it.s}));pend.shift();saveP();online=true}
  catch(e){if(e.http&&!/rapido/.test(String(e.message))){pend.shift();saveP()}else{if(!e.http)online=false;break}}}}
 finally{flushing=false}}
setInterval(()=>{if(pend.length)flush()},12000);
function refresh(k,fn){if(!pid)return;Promise.resolve(flush()).then(()=>Promise.all([sync(),loadBoard()])).then(()=>{const m=$('#modal');if(!m.hidden&&m.dataset.k==k)fn(1)})}
const fmtDia=d=>String(d).split('-').reverse().join('/');
const fmtFecha=i=>new Date(i).toLocaleString('es-MX',{timeZone:'America/Mexico_City',dateStyle:'long',timeStyle:'short'});
const ERR={insuficiente:'Aún no alcanzas las victorias para ese premio.',premio:'Ese premio ya no está disponible.',ya_canjeado:'Ya canjeaste ese premio.',jugador:'No se pudo identificar al jugador.',sin_ip:'No pudimos verificar tu conexión. Si usas VPN o proxy, desactívalo e inténtalo de nuevo.'};
/* Límite de canje: 1 premio cada 30 días por cuenta y por conexión (IP). Seguir jugando es gratis y sin límite. */
const dLim=l=>{try{return new Date(l.hasta).toLocaleDateString('en-CA',{timeZone:'America/Mexico_City'})}catch(e){return''}};
const fmtLargo=d=>{try{return new Date(d+'T12:00:00').toLocaleDateString('es-MX',{dateStyle:'long'})}catch(e){return d}};
const limAct=()=>{const l=ST.L;return l&&l.hasta&&new Date(l.hasta)>new Date()?l:null};
const errTxt=e=>{const m=String(e&&e.message||''),k=m.split('|')[0],d=m.split('|')[1];
 if(k=='cooldown')return 'Ya canjeaste un premio este mes. Podrás canjear otro a partir del '+fmtLargo(d)+'. Mientras tanto, sigue jugando gratis.';
 if(k=='cooldown_ip')return 'Desde esta conexión ya se canjeó un premio en los últimos 30 días (con esta u otra cuenta). Podrás canjear a partir del '+fmtLargo(d)+'. Puedes seguir jugando gratis.';
 return ERR[m]||'No se pudo completar. Revisa tu conexión e inténtalo de nuevo.'};
const back=()=>over||!B.length?menu():gameMenu();

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
async function think(g){const L=[],c=B[0],t0=performance.now();
 for(const a of cands(B,g))for(const w of[.3,.45,.6,.8,1])L.push([a,w]);
 for(const t of targets(B,g))for(const w of[.22,.5,.75])L.push([Math.atan2(t.y-c.y,t.x-c.x),w]);
 for(let i=0;i<180;i++)for(const w of[.45,.8])L.push([i*Math.PI/90+.004,w]); // barrido: bandas y combinadas
 let best=L[0],bs=-1e9;
 for(let i=0;i<L.length;i++){const s=evalShot(L[i][0],L[i][1],g);if(s>bs){bs=s;best=L[i]}
  if(bs>=1e5)break;if(i%8==7){await sleep(0);if(performance.now()-t0>1800&&bs>0)break}}
 for(const d of[-.012,-.006,-.003,.003,.006,.012]){const s=evalShot(best[0]+d,best[1],g);if(s>bs+1){bs=s;best=[best[0]+d,best[1]]}} // afinado
 return best}
function bestSpot(g){let best=[W*.25,H/2],bs=-1;const c=B[0];c.a=1;
 for(let x=60;x<W-40;x+=30)for(let y=50;y<H-40;y+=30){
  if(B.some(b=>b.a&&b.id&&Math.hypot(b.x-x,b.y-y)<2*R+2))continue;c.x=x;c.y=y;const n=cands(B,g).length;if(n>bs){bs=n;best=[x,y]}}
 return best}

/* ---------- FLUJO DE PARTIDA ---------- */
function rack(){const ids=[1,2,3,4,5,6,7,9,10,11,12,13,14,15].sort(()=>Math.random()-.5);ids.splice(4,0,8);
 const L=[{id:0,x:W*.25,y:H/2,vx:0,vy:0,a:1,rx:0,ry:0}];let n=0;
 for(let r=0;r<5;r++)for(let k=0;k<=r;k++)L.push({id:ids[n++],x:W*.72+r*(R*1.74+.15),y:H/2+(k-r/2)*(2*R+.2),vx:0,vy:0,a:1,rx:0,ry:0});return L}
function newGame(){B=rack();turn=CFG.botBreaks?'bot':'me';grp={me:null,bot:null};hand=0;brk=1;over=0;time=CFG.minutes*60;hints=3;sinks=[];next()}
let hints=3,stl=30,lt=0;
function late(){hand=0;turn='bot';sfx('lose');next();say('Se acabó tu tiempo: le toca tirar a e-Onyx AI')}
async function hint(){if(state!='idle'||turn!='me'||hand||over||!$('#modal').hidden)return;if(!hints)return say('Ya no te quedan pistas');
 hints--;say('Calculando pista…');state='hint';const[a,p]=await think(grp.me);if(over)return;state='idle';aim=a;pw=p;$('#fill').style.height=(1-p)*100+'%';say(`Pista: este es un buen tiro (${hints} restantes). Ajusta si quieres y tira`)}
function next(){ui();stl=CFG.shot;hlT=turn=='me'?3:0;if(turn=='bot'){botTurn();return}state='idle';say(hand?'Bola en mano: mueve la blanca y haz clic para colocarla':'Tu turno: apunta y arrastra la barra de potencia hacia arriba; suéltala para tirar')}
async function botTurn(){state='bot';say('e-Onyx AI está pensando…');await sleep(700);if(over)return;let a,p;
 if(hand){const s=bestSpot(grp.bot);B[0].x=s[0];B[0].y=s[1];B[0].vx=B[0].vy=0;hand=0}
 if(brk){a=(Math.random()-.5)*.03;p=.96}else[a,p]=await think(grp.bot);
 if(over)return;if(Math.random()>CFG.botAcc){a+=(Math.random()<.5?-1:1)*(.012+Math.random()*.03);p=Math.min(1,p*(1+gauss()*.08))}aim=a;state='baim';await sleep(650);if(over)return;shoot(a,p)}
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
function endTime(){end(null,1)}
function end(w,t){over=1;state='over';sfx(w?(w=='me'?'win':'lose'):'ui');ui();overModal(w);
 const res=!w?'empate':w=='me'?'gano':'perdio',secs=Math.max(0,Math.round(CFG.minutes*60-time));
 Promise.resolve(report(res,secs)).then(()=>loadBoard()).then(()=>{const m=$('#modal');if(!m.hidden&&m.dataset.k=='over')overModal(w,1)})}
function overModal(w,nr){modal(`<h2>${!w?'Nadie gana':w=='me'?'¡Ganaste!':'Gana e-Onyx AI'}</h2><p>${!w?'Se acabó el tiempo: es un empate, nadie suma victoria ni derrota.':w=='me'?'Sumas 1 victoria en tu cuenta.':'Sigue practicando.'}</p>${tables()}<div class="row"><button id="again">Revancha</button><button id="cj2" class="s">🎁 Canjeo</button></div>`,'over');
 $('#again').onclick=()=>{closeM();newGame()};$('#cj2').onclick=canjeo}

/* ---------- UI ---------- */
const say=t=>$('#msg').textContent=t;
function chips(g){return g?B.filter(b=>b.a&&b.id&&b.id!=8&&own(g,b.id)).map(b=>`<i class="ch" style="background:${COL[b.id>8?b.id-8:b.id]}">${b.id}</i>`).join(''):''}
function ui(){for(const w of['me','bot']){const e=$(w=='me'?'#pl':'#bt'),g=grp[w];
 e.innerHTML=`<b>${esc(who(w))}</b><small>${g?(g=='s'?'Lisas':'Rayadas'):'Mesa abierta'}</small><br>${chips(g)}`;e.classList.toggle('on',turn==w&&!over)}
 $('#tray').innerHTML=B.filter(b=>!b.a&&b.id).map(b=>`<i class="ch" style="background:${COL[b.id>8?b.id-8:b.id]}">${b.id}</i>`).join('')}
function modal(h,k){const m=$('#modal');m.innerHTML=`<div class="box">${h}</div>`;m.dataset.k=k||'';m.hidden=0;m.querySelectorAll('button.cj').forEach(b=>b.onclick=()=>{sfx('ui');askCanje(+b.dataset.p)})}
const closeM=()=>$('#modal').hidden=1;
function tables(){const w=wins(),g=ST.g+cnt('gano'),p=ST.p+cnt('perdio'),e=ST.e+cnt('empate');
 let r=rows.map(x=>({...x}));
 if(!online||!r.length)r=(g||p||e)?[{pos:1,nombre:name||me,g,p:p,e,yo:1}]:[];
 else if(mi&&mi>10)r.push({pos:mi,nombre:name||me,g,p,e,yo:1});
 const tr=r.map(x=>`<tr${x.yo?' class="me"':''}><td>${x.pos}</td><td>${esc(x.nombre||'Jugador')}</td><td>${x.g}</td><td>${x.p}</td><td>${x.e}</td></tr>`).join('')||'<tr><td colspan="5">Sé el primero en ganar</td></tr>';
 const L=limAct(),pr=PRIZES.map(([t,n,id])=>{const got=ST.c.includes(id),ok=w>=t;
  return `<li class="${ok?'ok':''}"><span>${t} ganadas</span><b>${esc(n)}</b>${got?'<span class="dn">Canjeado ✓</span>':ok&&id&&online&&L?`<span class="dn">Desde el ${fmtLargo(dLim(L))}</span>`:ok&&id&&online?`<button class="cj" data-p="${id}">Canjear</button>`:`<em style="--p:${Math.min(100,w/t*100)}%"></em>`}</li>`}).join('');
 const st=!ON?'Modo local: configura Supabase en js/config.js.':!online?'Sin conexión con la base de datos: tus victorias se enviarán al reconectar.':pend.length?'Enviando tus resultados…':'';
 return `<div class="cols"><div><h3>Clasificación</h3><table><tr><th>#<th>Jugador<th>G<th>P<th>E</tr>${tr}</table></div><div><h3>Premios · ${w} ganadas</h3><ul>${pr}</ul></div></div>${L?`<p class="nx">${L.por=='ip'?'Desde tu conexión ya se canjeó un premio este mes.':'Ya canjeaste un premio este mes.'} Podrás canjear otro a partir del <b>${fmtLargo(dLim(L))}</b> (30 días). Mientras tanto puedes seguir jugando gratis y sumando victorias.</p>`:''}${st?`<p class="mut">${st}</p>`:''}`}
function help(cb){modal(`<img src="assets/logo-white.png" alt=""><h2>Instrucciones</h2><div class="how">
<div><b>Apuntar</b>Mueve el mouse sobre la mesa (en celular, desliza el dedo). Con ← → afinas el ángulo.</div>
<div><b>Potencia y tiro</b>Arrastra hacia arriba la barra de potencia de la izquierda y suéltala para tirar (o usa Espacio). Para jugar mejor, ponlo en horizontal y en pantalla completa.</div>
<div><b>Objetivo</b>Emboca todas tus bolas (lisas o rayadas) y al final la bola 8. La primera que embocas define tu grupo.</div>
<div><b>Faltas</b>Si metes la blanca, tocas primero una bola que no es tuya o nada llega a banda, el rival juega con bola en mano.</div>
<div><b>Identificar bolas</b>Mientras es tu turno, tus bolas brillan en dorado sin parar y las demás se oscurecen. En el turno de e-Onyx AI se apagan.</div>
<div><b>Tiempo y premios</b>Cada ronda dura 5 minutos y tienes 30 s para tirar: si no lo haces, tira e-Onyx AI. Si se acaba el tiempo, nadie gana. Tecla H = pista (3 por partida). Suma victorias: se guardan en tu cuenta y las canjeas por mascarillas y un corte gratis. Puedes canjear un premio cada 30 días (por cuenta y por conexión); seguir jugando siempre es gratis.</div></div><button id="ok">Entendido</button>`);
 $('#ok').onclick=()=>{sfx('ui');closeM();cb&&cb()}}
function menu(nr){modal(`<img src="assets/logo-white.png" alt=""><h2>A.M. Ball</h2><p>Bola 8 contra e-Onyx AI. Cada ronda dura máximo 5 minutos. Tienes 30 s por tiro; si no tiras, le toca a e-Onyx AI. Si se acaba el tiempo, nadie gana.</p>${tables()}<div class="row"><button id="play">Jugar</button><button id="cj" class="s">🎁 Canjeo</button></div><a class="bk" href="../index.html">&larr; Volver a A.M. Barber</a>`,'menu');
 $('#play').onclick=()=>{sfx('ui');closeM();newGame()};$('#cj').onclick=()=>{sfx('ui');canjeo()};if(!nr)refresh('menu',menu)}
function gameMenu(nr){modal(`<h2>Menú</h2>${tables()}<div class="row"><button id="m1">Instrucciones</button><button id="mh">Pista (${hints})</button><button id="m2">Pantalla completa</button><button id="mc" class="s">🎁 Canjeo</button><button id="cl">Seguir jugando</button></div><a class="bk" href="../index.html">&larr; Volver a A.M. Barber</a>`,'gm');
 $('#m1').onclick=()=>help(()=>$('#menu').click());$('#mh').onclick=()=>{closeM();hint()};$('#m2').onclick=fs;$('#mc').onclick=canjeo;$('#cl').onclick=closeM;if(!nr)refresh('gm',gameMenu)}

/* ---------- CANJEO: confirmar, certificado con folio, mis canjes y verificar ---------- */
function askCanje(id){const p=PRIZES.find(x=>x[2]==id);if(!p)return;
 modal(`<h2>¿Canjear?</h2><p>«${esc(p[1])}» · ${p[0]} victorias. Se genera un certificado con folio para mostrarlo en la barbería. Cada premio se canjea una sola vez y tus victorias no se descuentan.</p><p class="nx">Solo se puede canjear <b>un premio cada 30 días</b>, por cuenta y por conexión (IP). Después podrás seguir jugando gratis y canjear otro premio al cumplirse los 30 días.</p><label class="tc"><input type="checkbox" id="ctc"><span>Acepto los <a href="../terminos.html#ball" target="_blank" rel="noopener">términos y condiciones</a> y que se use una huella cifrada de mi IP para limitar los canjes (<a href="../cookies.html" target="_blank" rel="noopener">más información</a>).</span></label><p id="cmsg" class="mut"></p><div class="row"><button id="cy" disabled>Canjear</button><button id="cn" class="s">Cancelar</button></div>`,'ask');
 $('#cn').onclick=back;$('#ctc').onchange=()=>{$('#cy').disabled=!$('#ctc').checked};
 $('#cy').onclick=async()=>{if(busy||!$('#ctc').checked)return;busy=true;$('#cy').disabled=true;$('#cmsg').textContent='Procesando tu canje…';
  try{for(let i=0;i<40&&(pend.length||flushing);i++){flush();await sleep(400)}
   const r=await RPC('ab_canjear',{p_player:pid,p_premio:id});applyState(r.estado);busy=false;showCert(r.canje,back);loadBoard()}
  catch(e){busy=false;const cd=/^cooldown/.test(String(e&&e.message)),o=$('#cmsg'),b=$('#cy');if(o)o.textContent=errTxt(e);if(b)b.disabled=cd;if(cd)sync()}}}
async function canjeo(){modal('<h2>Canjeo</h2><p class="mut">Cargando…</p>','cj0');let d=[];try{d=await RPC('ab_mis_canjes',{p_player:pid});online=true}catch(e){}
 if($('#modal').hidden||$('#modal').dataset.k!='cj0')return;
 modal(`<h2>Canjeo</h2><p class="mut">Cada premio se canjea una sola vez al llegar a su meta de victorias, y solo puedes canjear un premio cada 30 días (por cuenta y por conexión). Seguir jugando es gratis. Obtienes un certificado con folio para mostrarlo en la barbería.</p>${limAct()?`<p class="nx">Podrás canjear otro premio a partir del <b>${fmtLargo(dLim(limAct()))}</b>.</p>`:''}<h3>Mis canjes</h3>${d.length?'<ul>'+d.map((c,i)=>`<li><span>${fmtDia(c.dia)}</span><b>${esc(c.premio)}<br><small>${esc(c.folio)} · ${c.estado=='entregado'?'entregado':'pendiente de entrega'}</small></b><button class="s ver" data-i="${i}">Ver</button></li>`).join('')+'</ul>':'<p class="mut">Aún no has canjeado premios. Gana partidas y canjéalos desde el menú.</p>'}<h3>Verificar folio</h3><div class="row"><input id="fol" type="text" maxlength="14" placeholder="AB-XXXX-XXXX" autocomplete="off"><button id="fver">Verificar</button></div><p id="fres"></p><div class="row"><button id="cb" class="s">Volver</button></div>`,'cj');
 document.querySelectorAll('#modal button.ver').forEach(b=>b.onclick=()=>showCert(d[+b.dataset.i],canjeo));
 $('#fver').onclick=verify;$('#fol').onkeydown=e=>{if(e.key=='Enter')verify()};$('#cb').onclick=back}
async function verify(){const f=$('#fol').value.trim(),o=$('#fres');if(!f)return;o.textContent='Buscando…';
 try{const r=await RPC('ab_verificar',{p_folio:f});o.textContent=r?'✔ '+r.folio+' · '+r.nombre+' · '+r.premio+' · '+r.costo+' victorias · '+fmtDia(r.dia)+' · '+(r.estado==='entregado'?'YA ENTREGADO':'PENDIENTE DE ENTREGA'):'✖ Folio no encontrado.'}
 catch(e){o.textContent='No se pudo verificar. Revisa tu conexión.'}}
function nextMsg(c){let d=c.proximo;if(!d&&c.creado){try{d=new Date(new Date(c.creado).getTime()+30*864e5).toLocaleDateString('en-CA',{timeZone:'America/Mexico_City'})}catch(e){}}
 if(!d||new Date(d+'T23:59:59-06:00')<new Date())return'';
 return `<p class="nx">🎉 ¡Premio canjeado! Podrás canjear otro premio a partir del <b>${fmtLargo(d)}</b> (en 30 días). Mientras tanto, puedes seguir jugando de forma <b>gratuita</b> y sumando victorias.</p>`}
async function showCert(c,ret){let u='';try{u=await makeCert(c)}catch(e){}
 if(!u){modal(`<h2>Canje listo</h2><p>Folio: <b>${esc(c.folio)}</b></p><p class="mut">No se pudo generar la imagen. Anota el folio y muéstralo en la barbería.</p>${nextMsg(c)}<div class="row"><button id="cx">Cerrar</button></div>`,'cert');$('#cx').onclick=ret;return}
 modal(`<h2>Certificado de canje</h2>${nextMsg(c)}<img alt="Certificado de canje" style="width:auto;max-width:100%;max-height:50vh;border-radius:12px"><div class="row"><button id="cdl">Descargar imagen</button><button id="csh" class="s">Compartir</button><button id="cx" class="s">Cerrar</button></div><p class="mut">Guarda la imagen y muéstrala al barbero para recibir tu premio. Si no se descarga, mantén presionada la imagen para guardarla.</p>`,'cert');
 document.querySelector('#modal img').src=u;
 $('#cdl').onclick=()=>{const a=document.createElement('a');a.href=u;a.download='certificado-'+c.folio+'.png';document.body.appendChild(a);a.click();a.remove()};
 $('#csh').onclick=async()=>{try{const b=await(await fetch(u)).blob(),f=new File([b],'certificado-'+c.folio+'.png',{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],title:'Certificado de canje · A.M. Barber'});else $('#cdl').click()}catch(e){}};
 $('#cx').onclick=ret}
/* certificado en imagen (canvas 1080×1500) */
function wrapTxt(g,t,max){const w=t.split(' '),out=[];let cur='';w.forEach(k=>{const n=cur?cur+' '+k:k;if(g.measureText(n).width>max&&cur){out.push(cur);cur=k}else cur=n});if(cur)out.push(cur);return out}
function drawCert(g,c,lg){const GOLD='#e8c86a',CX=540,F=z=>'700 '+z+'px Cinzel,Georgia,serif';
 g.fillStyle='#070707';g.fillRect(0,0,1080,1500);
 const gl=g.createRadialGradient(CX,300,40,CX,300,760);gl.addColorStop(0,'rgba(232,200,106,.17)');gl.addColorStop(1,'rgba(232,200,106,0)');g.fillStyle=gl;g.fillRect(0,0,1080,1500);
 g.strokeStyle=GOLD;g.lineWidth=6;g.strokeRect(40,40,1000,1420);g.lineWidth=2;g.strokeStyle='rgba(232,200,106,.5)';g.strokeRect(62,62,956,1376);
 g.fillStyle=GOLD;[[40,40],[1040,40],[40,1460],[1040,1460]].forEach(q=>{g.save();g.translate(q[0],q[1]);g.rotate(Math.PI/4);g.fillRect(-11,-11,22,22);g.restore()});
 const T=(t,y,sz,col,ls,mw)=>{const L='letterSpacing' in g;g.textAlign='center';g.textBaseline='alphabetic';g.fillStyle=col;if(L)g.letterSpacing=(ls||0)+'px';g.font=F(sz);
  if(mw)while(sz>16&&g.measureText(t).width>mw){sz-=2;g.font=F(sz)}
  g.fillText(t,CX+(ls&&L?ls/2:0),y);if(L)g.letterSpacing='0px'};
 if(lg){const h=230,w=h*lg.naturalWidth/lg.naturalHeight;g.drawImage(lg,CX-w/2,105,w,h)}
 T('CERTIFICADO DE CANJE',430,64,'#fff',4,880);T('A.M. BARBER · A.M. BALL',482,28,GOLD,8,880);
 g.strokeStyle='rgba(232,200,106,.7)';g.lineWidth=2;g.beginPath();g.moveTo(180,530);g.lineTo(500,530);g.moveTo(580,530);g.lineTo(900,530);g.stroke();g.fillStyle=GOLD;g.save();g.translate(CX,530);g.rotate(Math.PI/4);g.fillRect(-8,-8,16,16);g.restore();
 T('SE CERTIFICA QUE',600,28,'#9a9a9a',6);
 let sz=96,nm=String(c.nombre||'Jugador').toUpperCase();g.font=F(sz);while(sz>40&&g.measureText(nm).width>860){sz-=4;g.font=F(sz)}
 T(nm,705,sz,'#fff',2);g.strokeStyle='rgba(255,255,255,.25)';g.beginPath();g.moveTo(240,735);g.lineTo(840,735);g.stroke();
 T('HA CANJEADO EL PREMIO',805,28,'#9a9a9a',6);
 g.font=F(66);const ln=wrapTxt(g,String(c.premio).toUpperCase(),860).slice(0,2);ln.forEach((t,i)=>T(t,905+i*84,66,GOLD,1,860));
 T('POR '+c.costo+' VICTORIAS',1070,38,'#fff',4,860);
 g.setLineDash([14,10]);g.strokeStyle=GOLD;g.lineWidth=3;g.strokeRect(190,1105,700,150);g.setLineDash([]);
 T('FOLIO',1148,24,'#9a9a9a',8);T(c.folio,1226,74,GOLD,6,640);
 T('Emitido: '+fmtFecha(c.creado)+' (hora CDMX)',1305,26,'#ddd',1,880);T('Canjeado el '+fmtDia(c.dia),1341,22,'#9a9a9a',1,880);
 T('Presenta este certificado en A.M. Barber para recibir tu premio.',1384,22,'#9a9a9a',1,880);T('Un solo uso · El folio se puede verificar en la sección Canjeo.',1412,20,'#6f6f6f',1,880);
 g.save();g.translate(900,215);g.rotate(.2);g.strokeStyle=GOLD;g.lineWidth=5;g.beginPath();g.arc(0,0,92,0,7);g.stroke();g.lineWidth=2;g.beginPath();g.arc(0,0,80,0,7);g.stroke();
 g.fillStyle=GOLD;g.font=F(24);g.textAlign='center';g.fillText('CANJEADO',0,-12);g.font='700 52px system-ui,sans-serif';g.fillText('✓',0,40);g.restore()}
async function makeCert(c){try{await document.fonts.load('700 40px Cinzel')}catch(e){}
 for(const lg of[logo,null]){const cv=document.createElement('canvas');cv.width=1080;cv.height=1500;
  try{drawCert(cv.getContext('2d'),c,lg&&lg.complete&&lg.naturalWidth?lg:null);return cv.toDataURL('image/png')}catch(e){}}
 throw new Error('cert')}

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
 {const l=g.createRadialGradient(P+W*.5,P+H*.4,20,P+W*.5,P+H*.5,W*.62);l.addColorStop(0,'rgba(255,255,235,.17)');l.addColorStop(.5,'rgba(255,255,235,.03)');l.addColorStop(1,'rgba(0,0,0,.4)');g.fillStyle=l;g.fillRect(P,P,W,H);
 for(let i=0;i<2600;i++){g.globalAlpha=.07;g.strokeStyle=i%2?'#7fd1b0':'#02281c';g.lineWidth=.5;const x=P+Math.random()*W,y=P+Math.random()*H,a=Math.random()*6.28;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*3,y+Math.sin(a)*3);g.stroke()}g.globalAlpha=1}
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
 const sh=cx.createRadialGradient(4,7,R*.2,4,7,R*1.7);sh.addColorStop(0,'rgba(0,0,0,.7)');sh.addColorStop(.55,'rgba(0,0,0,.28)');sh.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=sh;cx.beginPath();cx.arc(4,7,R*1.7,0,7);cx.fill();
 cx.save();cx.beginPath();cx.arc(0,0,R,0,7);cx.clip();
 cx.fillStyle=id>8?'#f6f4ee':c;cx.fillRect(-R,-R,2*R,2*R);
 if(id>8){const hh=R*.56*Math.max(.3,Math.abs(Math.cos(ry)));cx.fillStyle=c;cx.fillRect(-R,R*.9*Math.sin(ry)-hh,2*R,2*hh)}
 const v=Math.cos(rx)*Math.cos(ry),sg=v<0?-1:1,bx=sg*R*.68*Math.sin(rx),by=sg*R*.68*Math.sin(ry),r=(id?4.7:1.9)*(.5+.5*Math.abs(v));
 cx.fillStyle=id?'#f6f4ee':'#c8262b';cx.beginPath();cx.arc(bx,by,r,0,7);cx.fill();
 if(id){cx.fillStyle='#111';cx.font='700 5.6px sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(id,bx,by+.3)}
 let g=cx.createRadialGradient(-R*.4,-R*.45,1,-R*.1,-R*.1,R*1.25);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(.35,'rgba(255,255,255,0)');g.addColorStop(.65,'rgba(0,0,0,.08)');g.addColorStop(1,'rgba(0,0,0,.68)');cx.fillStyle=g;cx.fillRect(-R,-R,2*R,2*R);
 g=cx.createRadialGradient(R*.45,R*.55,1,R*.45,R*.55,R*.9);g.addColorStop(0,'rgba(255,255,255,.16)');g.addColorStop(1,'rgba(255,255,255,0)');cx.fillStyle=g;cx.fillRect(-R,-R,2*R,2*R);
 if(dim){cx.fillStyle='rgba(0,0,0,.5)';cx.fillRect(-R,-R,2*R,2*R)}
 cx.restore();cx.fillStyle='rgba(255,255,255,.95)';cx.beginPath();cx.ellipse(-R*.36,-R*.46,R*.22,R*.1,-.62,0,7);cx.fill();cx.fillStyle='rgba(255,255,255,.3)';cx.beginPath();cx.ellipse(R*.42,R*.52,R*.16,R*.06,-.62,0,7);cx.fill();cx.strokeStyle='rgba(0,0,0,.35)';cx.lineWidth=.6;cx.beginPath();cx.arc(0,0,R-.3,0,7);cx.stroke();cx.restore()}
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
 if(e.code=='KeyH')hint();
 if(state=='idle'&&turn=='me'){if(e.code=='ArrowLeft')aim-=.003;if(e.code=='ArrowRight')aim+=.003}});
function fs(){const d=document.documentElement;try{if(document.fullscreenElement){document.exitFullscreen();return}
 Promise.resolve((d.requestFullscreen||d.webkitRequestFullscreen).call(d)).then(()=>screen.orientation.lock('landscape')).catch(()=>{})}catch(e){}}
$('#menu').onclick=()=>gameMenu();
$('#mu').onclick=e=>{muted=!muted;e.currentTarget.classList.toggle('off',muted)};
addEventListener('resize',resize);new ResizeObserver(()=>{$('#app').hidden||resize()}).observe($('#wrap'));
$('#go').onclick=()=>{if(!pid)return;if(matchMedia('(pointer:coarse)').matches)fs();me=name||'Jugador';
 const i=$('#intro');i.classList.add('out');setTimeout(()=>i.remove(),700);$('#app').hidden=0;resize();ui();help(menu)};
/* inicio de sesión dentro del juego (misma cuenta del sitio) */
if(pid)$('#nm').value=name;else{$('#go').disabled=true;$('#nm').placeholder='Inicia sesión';$('#lnote').hidden=false}
$('#glog').onclick=async()=>{const e=$('#gem').value.trim(),p=$('#gpw').value,o=$('#gms');if(!e||!p){o.textContent='Escribe tu correo y contraseña.';return}o.textContent='Entrando…';
 try{const r=await fetch(BL.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:BL.key,'Content-Type':'application/json'},body:JSON.stringify({email:e,password:p})});const d=await r.json();
  if(!r.ok||!d.access_token||!d.user)throw new Error('Correo o contraseña incorrectos.');d.expires_at=Math.floor(Date.now()/1000)+(d.expires_in||3600);localStorage.setItem('sb-'+REF+'-auth-token',JSON.stringify(d));location.reload()}
 catch(x){o.textContent=String(x.message||'No se pudo iniciar sesión.')}};
$('#gpw').addEventListener('keydown',e=>{if(e.key==='Enter')$('#glog').click()});
if(pid){loadPrizes();sync();loadBoard();flush()}


function frame(t){const dt=Math.min(.05,(t-last)/1000||0);last=t;
 if(B.length){
  if(!over&&$('#modal').hidden&&state)time-=dt;
  {const sh=$('#shot'),mine=state=='idle'&&turn=='me'&&!over;
   if(mine&&$('#modal').hidden){stl-=dt;if(stl<=0)late();else if(stl<=5&&Math.ceil(stl)!=lt){lt=Math.ceil(stl);sfx('tick')}}
   sh.hidden=!mine;sh.textContent='⏱ '+Math.max(0,Math.ceil(stl))+' s';sh.classList.toggle('low',stl<=5)}
  if(state=='run'){acc+=dt;while(acc>=DT){step(B,ev0);acc-=DT}if(!moving(B))settle()}
  for(const s of sinks)s.t+=dt*4;sinks=sinks.filter(s=>s.t<1);hlT=Math.max(0,hlT-dt);
  if(time<=0&&!over&&state!='run'&&state)endTime();
  const tt=Math.max(0,Math.ceil(time)),ck=$('#clock');ck.textContent=String(tt/60|0).padStart(2,'0')+':'+String(tt%60).padStart(2,'0');ck.classList.toggle('low',tt<60);
  draw()}
 requestAnimationFrame(frame)}
requestAnimationFrame(frame);
})();
