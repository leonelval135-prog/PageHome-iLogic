(()=>{const C=window.AMB,$=s=>document.querySelector(s);
// intro
const i=$('#intro'),B=document.body,au=new Audio('Music/Music.mp3'),mus=$('#mus');au.loop=true;au.volume=.6;
const end=()=>{i.remove();B.classList.remove('lock');B.classList.add('ready')};
mus.onclick=()=>{if(au.paused)au.play().catch(()=>{});else au.pause()};
au.onplay=()=>{mus.hidden=false;mus.classList.remove('off');mus.setAttribute('aria-pressed','true')};au.onpause=()=>{mus.classList.add('off');mus.setAttribute('aria-pressed','false')};
if(matchMedia('(prefers-reduced-motion:reduce)').matches)end();else{B.classList.add('lock');const bl=$('#blade'),stg=$('#stage');
$('#skip').onclick=end;
$('#enter').onclick=()=>{i.classList.add('go');au.play().catch(()=>{});
setTimeout(()=>{const tm=setInterval(()=>{const r=bl.getBoundingClientRect(),s=stg.getBoundingClientRect();if(r.right>s.right+20)return clearInterval(tm);
for(let k=0;k<3;k++){const h=document.createElement('i');h.className='hr';h.style.left=(r.right-s.left)+'px';h.style.top=Math.random()*s.height+'px';h.style.setProperty('--dx',(Math.random()*70-10)+'px');h.style.setProperty('--r',Math.random()*360+'deg');stg.append(h);setTimeout(()=>h.remove(),900)}},45)},350);
setTimeout(end,3950)}}
if(matchMedia('(pointer:fine)').matches){let t=0;document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.card,.btn');if(!c||t)return;t=requestAnimationFrame(()=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-r.left+'px');c.style.setProperty('--my',e.clientY-r.top+'px');t=0})},{passive:true})}
// scroll reveal
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);const t=e.target;setTimeout(()=>{t.classList.add('done');t.style.transitionDelay=''},1300)}}),{threshold:.12});
document.querySelectorAll('section .wrap>*,.card').forEach(x=>{x.classList.add('rv');io.observe(x)});
document.querySelectorAll('.grid').forEach(g=>[...g.children].forEach((c,i)=>c.style.transitionDelay=Math.min(i,7)*70+'ms'));
// horarios por fecha: L–S 11–20, D 11–16 (último turno 30 min antes del cierre)
const f=$('#book').f,hr=$('#hr');
f.addEventListener('change',()=>{hr.innerHTML='';if(!f.value){hr.add(new Option('Elige primero la fecha',''));return}
const d=new Date(f.value+'T00:00'),close=d.getDay()===0?16:20,now=new Date(),same=f.value===new Date(now-now.getTimezoneOffset()*6e4).toISOString().slice(0,10);
hr.add(new Option('Elige una hora',''));
for(let m=660;m<close*60;m+=30){if(same&&m<=now.getHours()*60+now.getMinutes())continue;const t=String(m/60|0).padStart(2,'0')+':'+(m%60?'30':'00');hr.add(new Option(t12(t),t))}
if(hr.options.length===1)hr.options[0].text='Sin horarios disponibles ese día';markBusy()});
// Supabase
const sb=C.supabaseUrl&&C.supabaseKey&&window.supabase?supabase.createClient(C.supabaseUrl,C.supabaseKey):null;
const st=$('#status'),tg=$('#tg'),am=$('#am');let open=null;
const paint=d=>{if(!d){st.textContent='Estado de hoy no disponible';st.className='status';return}open=d.is_open;st.textContent=d.is_open?'Hoy abrimos':'Hoy no hay servicio'+(d.note?' — '+d.note:'');st.className='status '+(d.is_open?'on':'off')};
const load=async()=>{if(!sb)return paint(null);const{data}=await sb.from('shop_status').select('is_open,note').eq('id',1).single();paint(data)};load();setInterval(load,6e4);
tg.onclick=async()=>{const{error}=await sb.from('shop_status').update({is_open:!open,updated_at:new Date().toISOString()}).eq('id',1);error?alert('No tienes permiso o hubo un error.'):load()};
const M=$('#modal'),show=t=>{$('#fin').hidden=t!=='in';$('#fup').hidden=t!=='up';M.querySelectorAll('.filters button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===t))};
$('#lg').onclick=()=>{M.hidden=false;am.textContent=sb?'':'Conexión a Supabase pendiente: agrega URL y clave en js/config.js.';am.className='msg err'};
$('#mx').onclick=()=>M.hidden=true;M.querySelector('.filters').onclick=e=>e.target.dataset.t&&show(e.target.dataset.t);
const say=(t,ok)=>{am.textContent=t;am.className='msg '+(ok?'ok':'err')};
$('#fin').onsubmit=async e=>{e.preventDefault();if(!sb)return say('Supabase no está configurado.');const{error}=await sb.auth.signInWithPassword({email:e.target.e.value.trim(),password:e.target.p.value});error?say('Correo o contraseña incorrectos.'):(M.hidden=true)};
$('#fup').onsubmit=async e=>{e.preventDefault();if(!sb)return say('Supabase no está configurado.');const n=e.target.n.value.trim(),p=e.target.p.value,a=e.target.a.files[0];
if(!n||p.length<8)return say('Escribe tu nombre y una contraseña de al menos 8 caracteres.');if(a&&(a.size>2e6||!a.type.startsWith('image/')))return say('La foto debe ser una imagen de máximo 2 MB.');
const{data,error}=await sb.auth.signUp({email:e.target.e.value.trim(),password:p,options:{data:{name:n}}});if(error)return say(error.message);
if(data.session&&a){const path=data.user.id+'/avatar';const up=await sb.storage.from('avatars').upload(path,a,{upsert:true,contentType:a.type});
if(!up.error){const{data:u}=sb.storage.from('avatars').getPublicUrl(path);await sb.from('profiles').update({avatar_url:u.publicUrl+'?v='+Date.now()}).eq('id',data.user.id)}}
say(data.session?'¡Cuenta creada!':'Cuenta creada. Confirma tu correo y luego inicia sesión (tu foto se podrá subir desde tu perfil).',1);if(data.session)setTimeout(()=>M.hidden=true,900)};
const sess=async s=>{const box=$('#acct');tg.hidden=true;ME=s?s.user:null;ADM=false;form();if(!s)bookUser(null);if(!s){box.innerHTML='<button class="btn sec" id="lg2">Entrar</button>';$('#lg2').onclick=$('#lg').onclick;list();loadCitas();return}
const{data:p}=await sb.from('profiles').select('name,avatar_url,is_admin').eq('id',s.user.id).single();box.innerHTML='';
if(p&&p.avatar_url){const im=new Image();im.src=p.avatar_url;im.alt='Foto de perfil';box.append(im)}
const sp=document.createElement('span');sp.textContent=p?p.name:'';const o=document.createElement('button');o.className='btn sec';o.textContent='Salir';o.onclick=()=>sb.auth.signOut();box.append(sp,o);ADM=!!(p&&p.is_admin);tg.hidden=!ADM;loadCitas();bookUser((p&&p.name)||(s.user.user_metadata&&s.user.user_metadata.name)||'');list()};
if(sb){sb.auth.onAuthStateChange((_,s)=>setTimeout(()=>sess(s),0))}

// tema claro/oscuro
const root=document.documentElement,th=$('#th'),setT=t=>{root.dataset.theme=t;try{localStorage.setItem('amb_theme',t)}catch(_){}th.textContent=t==='dark'?'☀':'☾';th.setAttribute('aria-label',t==='dark'?'Cambiar a tema claro':'Cambiar a tema oscuro');document.querySelector('meta[name=theme-color]').content=t==='dark'?'#0b0b0c':'#f2f2f5'};
th.onclick=()=>{root.classList.add('tt');setT(root.dataset.theme==='dark'?'light':'dark');setTimeout(()=>root.classList.remove('tt'),500)};setT(root.dataset.theme||'dark');
// reseñas y comentarios
var ME=null,ADM=false,SEL=0;const rs=$('#rsum'),rl=$('#rlist'),rf=$('#rform'),rlg=$('#rlog'),rm=$('#rm'),stars=$('#stars');
for(let n=1;n<=5;n++){const b=document.createElement('button');b.type='button';b.textContent='★';b.setAttribute('aria-label',n+(n>1?' estrellas':' estrella'));b.onclick=()=>{SEL=n;paintStars()};stars.append(b)}
function paintStars(){[...stars.children].forEach((b,k)=>b.classList.toggle('on',k<SEL))}
function rmsg(t,ok){rm.textContent=t;rm.className='msg '+(ok?'ok':'err')}
function form(){rf.hidden=!ME;rlg.hidden=!!ME||!sb}
rlg.onclick=()=>{M.hidden=false;show('in');am.textContent=''};
async function list(){if(!sb){rs.textContent='Las reseñas se activarán al conectar Supabase.';return}
const{data,error}=await sb.from('reviews').select('id,user_id,name,avatar_url,rating,comment,created_at').order('created_at',{ascending:false}).limit(30);
if(error){rs.textContent='No se pudieron cargar las reseñas.';return}
rl.replaceChildren();if(!data.length){rs.textContent='Aún no hay reseñas. ¡Sé el primero en opinar!';return}
rs.textContent='Promedio ★ '+(data.reduce((s,r)=>s+r.rating,0)/data.length).toFixed(1)+' · '+data.length+(data.length>1?' reseñas recientes':' reseña');
data.forEach(r=>{const a=document.createElement('article');a.className='card rv in done';const hd=document.createElement('div');hd.className='rh';
if(/^https:\/\//.test(r.avatar_url||'')){const im=new Image();im.src=r.avatar_url;im.alt='';hd.append(im)}
const w=document.createElement('div'),nm=document.createElement('strong'),st=document.createElement('div');nm.textContent=r.name;st.className='rstars';st.textContent='★'.repeat(r.rating)+'☆'.repeat(5-r.rating);st.setAttribute('aria-label',r.rating+' de 5 estrellas');w.append(nm,st);hd.append(w);
const p=document.createElement('p');p.textContent=r.comment;const d=document.createElement('small');d.className='note';d.textContent=new Date(r.created_at).toLocaleDateString('es-MX');a.append(hd,p,d);
if(ME&&(ME.id===r.user_id||ADM)){const x=document.createElement('button');x.className='btn sec';x.textContent='Eliminar';x.onclick=async()=>{await sb.from('reviews').delete().eq('id',r.id);list()};a.append(x)}
rl.append(a)})}
rf.onsubmit=async e=>{e.preventDefault();const c=rf.c.value.trim();if(!SEL)return rmsg('Elige una calificación.');if(c.length<3)return rmsg('Escribe un comentario de al menos 3 caracteres.');
const{error}=await sb.from('reviews').insert({user_id:ME.id,rating:SEL,comment:c});
if(error)return rmsg(error.code==='23505'?'Ya publicaste una reseña. Elimínala para escribir otra.':'No se pudo publicar. Intenta de nuevo.');
rmsg('¡Gracias por tu reseña!',1);rf.reset();SEL=0;paintStars();list()};
form();list();

// nombre de la cita ligado a la sesión
function bookUser(n){if(!sb)return;const bf=$('#book'),nf=bf.elements.n;$('#bnote').hidden=n!==null;if(n===null){nf.value='';nf.readOnly=true;nf.placeholder='Inicia sesión o Regístrate primero'}else{nf.value=n;nf.readOnly=!!n;nf.placeholder=''}}
const bk=$('#book'),prevSubmit=bk.onsubmit;
bk.onsubmit=async ev=>{if(!sb)return prevSubmit(ev);ev.preventDefault();const o=$('#bm');
if(!ME){o.className='msg err';o.textContent='Inicia sesión o Regístrate primero';M.hidden=false;show('in');am.textContent='';return}
const v=Object.fromEntries(new FormData(bk)),er=[],hoy=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10),man=new Date(Date.now()-new Date().getTimezoneOffset()*6e4+864e5).toISOString().slice(0,10);
if(!v.n.trim())er.push('Falta tu nombre en el perfil.');if(!v.f||v.f<hoy||v.f>man)er.push('Solo puedes agendar hoy o mañana.');if(!v.h)er.push('Elige una hora disponible.');
if(er.length){o.className='msg err';o.textContent=er.join(' ');return}
const btn=bk.querySelector('button[type=submit]');btn.disabled=true;o.className='msg';o.textContent='Guardando tu solicitud…';
const w=window.open('about:blank','_blank');
const{data,error}=await sb.rpc('reservar_cita',{p_service:v.s,p_barber:v.b,p_date:v.f,p_time:v.h,p_comments:(v.c||'').trim()});btn.disabled=false;
if(error){if(w)w.close();const m=error.message||'';o.className='msg err';o.textContent=m.includes('ocupado')?'Ese horario ya está agendado. Elige otro.':m.includes('limite')?'Ya tienes 3 solicitudes activas. Espera respuesta o cancela una.':m.includes('ventana')?'Solo puedes agendar hoy o mañana.':m.includes('pasada')?'Ese horario ya pasó.':m.includes('fuera_horario')?'Ese horario está fuera del horario de atención.':'No se pudo guardar. Intenta de nuevo.';f.dispatchEvent(new Event('change'));return}
const dia=new Date(v.f+'T00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});
const t='Hola, soy '+v.n.trim()+'. Solicito cita con '+v.b+' para: '+v.s+'. Fecha: '+dia+'. Hora: '+t12(v.h)+'. Folio #'+data+'.'+((v.c||'').trim()?' Comentarios: '+v.c.trim():'');
const url='https://wa.me/'+C.whatsapp+'?text='+encodeURIComponent(t);
o.className='msg ok';o.textContent='Solicitud guardada: tu horario queda apartado 20 minutos y se libera solo si el barbero no la acepta. Envía el mensaje por WhatsApp.';
if(w){w.opener=null;w.location.href=url}else{const l=document.createElement('a');l.href=url;l.target='_blank';l.rel='noopener noreferrer';l.textContent=' Abrir WhatsApp';o.append(l)}
if(window.gtag)gtag('event','booking_request');f.dispatchEvent(new Event('change'));loadCitas()};
bk.elements.b.addEventListener('change',()=>f.dispatchEvent(new Event('change')));
$('#bgo').onclick=()=>{M.hidden=false;show('in');am.textContent=''};bk.elements.n.addEventListener('focus',()=>{if(sb&&!ME)$('#bgo').click()});
bookUser(sb?null:'');

// horarios ocupados y lista de citas
async function markBusy(){if(!sb||!f.value)return;const{data}=await sb.rpc('horarios_ocupados',{p_date:f.value,p_barber:bk.elements.b.value});if(!data)return;
const busy=new Set(data.map(r=>String(r.t||r).slice(0,5)));[...hr.options].forEach(o=>{if(busy.has(o.value)){o.disabled=true;o.text=t12(o.value)+' — Ya agendada'}});if(hr.selectedOptions[0]&&hr.selectedOptions[0].disabled)hr.value=''}
const cl=$('#clist'),cw=$('#citas'),dday=d=>new Date(d+'T00:00').toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'});
async function loadCitas(){if(!sb||!ME){cw.hidden=true;return}await sb.rpc('limpiar_citas');
const hoy=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const{data,error}=await sb.from('appointments').select('id,name,service,fecha,hora,status,created_at').gte('fecha',hoy).order('fecha').order('hora');
if(error||!data){cw.hidden=true;return}const rows=data.filter(r=>!(r.status==='pendiente'&&new Date(r.created_at).getTime()+12e5<Date.now()));
cw.hidden=!rows.length;$('#ctit').textContent=ADM?'Panel del barbero: citas':'Mis citas';cl.replaceChildren();
rows.forEach(r=>{const a=document.createElement('article');a.className='card rv in done';const s=document.createElement('strong');s.textContent=r.service;const p=document.createElement('p');p.textContent=dday(r.fecha)+' · '+t12(r.hora.slice(0,5))+(ADM?' · '+r.name:'');
const st=document.createElement('div');st.className='cs '+(r.status==='pendiente'?'p':r.status==='aceptada'?'a':'r');
if(r.status==='pendiente'){st.append('Pendiente. Se libera en ');const sp=document.createElement('span');sp.dataset.exp=r.created_at;st.append(sp)}else st.textContent=r.status==='aceptada'?'Aceptada ✓':'Rechazada';
a.append(s,p,st);const act=(txt,fn)=>{const b=document.createElement('button');b.className='btn sec';b.textContent=txt;b.onclick=async()=>{b.disabled=true;await fn();loadCitas();f.dispatchEvent(new Event('change'))};a.append(b)};
const resp=ok=>async()=>{const{error}=await sb.rpc('responder_cita',{p_id:r.id,p_aceptar:ok});if(error){const o=$('#bm');o.className='msg err';o.textContent=error.message.includes('expirada')?'La solicitud ya expiró.':'No se pudo actualizar.'}};
if(ADM&&r.status==='pendiente'){act('Aceptar',resp(true));act('Rechazar',resp(false))}else if(ADM&&r.status==='aceptada')act('Cancelar cita',resp(false));
else if(!ADM&&r.status==='pendiente')act('Cancelar solicitud',async()=>{await sb.from('appointments').delete().eq('id',r.id)});
cl.append(a)})}
let tk=0;setInterval(()=>{document.querySelectorAll('[data-exp]').forEach(s=>{const ms=new Date(s.dataset.exp).getTime()+12e5-Date.now();if(ms<=0){s.textContent='0:00';if(!tk){tk=1;setTimeout(()=>{tk=0;loadCitas();f.dispatchEvent(new Event('change'))},800)}}else s.textContent=Math.floor(ms/6e4)+':'+String(Math.floor(ms/1e3)%60).padStart(2,'0')})},1000);
setInterval(()=>{if(sb&&ME&&!document.hidden)loadCitas()},3e4);

// logo 3D, barra de progreso
const lg=$('#l3d'),l3=lg.firstElementChild,hero=$('.hero');
if(!matchMedia('(prefers-reduced-motion:reduce)').matches){let raf=0;
hero.addEventListener('pointermove',ev=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const r=lg.getBoundingClientRect(),cl=(v)=>Math.max(-1,Math.min(1,v));
const dx=cl((ev.clientX-r.left-r.width/2)/(innerWidth/2)),dy=cl((ev.clientY-r.top-r.height/2)/(innerHeight/2));lg.classList.add('hold');l3.style.transform='rotateY('+dx*38+'deg) rotateX('+dy*-18+'deg)'})},{passive:true});
hero.addEventListener('pointerleave',()=>{cancelAnimationFrame(raf);lg.classList.remove('hold');l3.style.transform=''})}
const pg=$('#prog');let pr=0;addEventListener('scroll',()=>{if(pr)return;pr=requestAnimationFrame(()=>{const h=document.documentElement;pg.style.transform='scaleX('+(h.scrollTop/((h.scrollHeight-h.clientHeight)||1))+')';pr=0})},{passive:true});
})();
