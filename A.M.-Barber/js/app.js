(()=>{const C=window.AMB,$=s=>document.querySelector(s);
const track=(e,p)=>{if(window.gtag)gtag('event',e,p||{})};
const t12=t=>{if(!t)return'';const[h,m]=t.split(':');const n=+h;return String(n%12||12)+':'+m+(n<12?' a. m.':' p. m.')};window.t12=t12;
const wa=t=>`https://wa.me/${C.whatsapp}?text=${encodeURIComponent(t)}`;
document.querySelectorAll('[data-wa]').forEach(a=>{a.href=wa(a.dataset.wa);a.target='_blank';a.rel='noopener noreferrer';a.addEventListener('click',()=>track('whatsapp_click'))});
if(C.dominio)$('#canon').href=C.dominio+'/';else $('#canon').remove();
const b=$('#burger'),m=$('#menu');b.onclick=()=>{const o=m.classList.toggle('open');b.setAttribute('aria-expanded',o)};m.onclick=()=>m.classList.remove('open');
const sel=$('#sel');C.servicios.forEach(s=>{const a=document.createElement('article');a.className='card';
a.innerHTML='<h3></h3><div class="price"></div><p></p><a class="btn sec" href="#cita">Reservar / consultar</a>';
a.querySelector('h3').textContent=s.n;a.querySelector('.price').textContent=s.p;a.querySelector('p').textContent=s.d;
const l=a.querySelector('a');l.onclick=e=>{e.preventDefault();sel.value=s.n;track('service_click',{service:s.id});document.getElementById('cita').scrollIntoView({behavior:'smooth'});const fm=document.getElementById('book');fm.classList.add('flash');setTimeout(()=>fm.classList.remove('flash'),1400)};$('#svc').append(a);sel.add(new Option(s.n+' ('+s.p+')',s.n))});
const f=$('#book'),hoy=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);f.f.min=hoy;const man=new Date(Date.now()-new Date().getTimezoneOffset()*6e4+864e5).toISOString().slice(0,10);f.f.max=man;
f.addEventListener('focusin',()=>track('booking_start'),{once:true});
f.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(f)),er=[],o=$('#bm');
if(!v.n.trim())er.push('Escribe tu nombre.');if(!v.f||v.f<hoy||v.f>man)er.push('Solo puedes agendar hoy o mañana.');
if(!v.h)er.push('Elige una hora disponible.');
if(er.length){o.className='msg err';o.textContent=er.join(' ');return}
const t=`Hola, soy ${v.n.trim()}. Quiero solicitar cita con ${v.b} para: ${v.s}. Fecha: ${v.f}. Hora: ${t12(v.h)}.`+(v.c.trim()?` Comentarios: ${v.c.trim()}`:'');
track('booking_request');o.className='msg ok';o.textContent='Abriendo WhatsApp. Tu solicitud no es una cita confirmada hasta que respondan.';window.open(wa(t),'_blank','noopener')};
const G=$('#gal'),F=$('#fl');['Todos',...C.galeria].forEach((c,i)=>{const x=document.createElement('button');x.textContent=c;x.dataset.c=c;x.setAttribute('aria-pressed',i==0);F.append(x)});
C.fotos.forEach(p=>{const x=document.createElement('button');x.className='ph pic';x.dataset.c=p.cats.join('|');const im=new Image();im.src=p.src;im.alt=p.alt;im.loading='lazy';x.append(im);x.setAttribute('aria-label','Ampliar: '+p.alt);x.onclick=()=>{const b=new Image();b.src=p.src;b.alt=p.alt;$('#lbc').replaceChildren(b);$('#lb').classList.add('on')};G.append(x)});
C.galeria.filter(c=>!C.fotos.some(p=>p.cats.includes(c))).forEach(c=>{const x=document.createElement('div');x.className='ph';x.dataset.c=c;x.innerHTML=`<span>${c}</span><small>Próximamente</small>`;G.append(x)});
const fil=c=>{F.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.c===c));G.querySelectorAll('.ph').forEach(x=>x.hidden=c!=='Todos'&&!x.dataset.c.split('|').includes(c))};
F.onclick=e=>e.target.dataset.c&&fil(e.target.dataset.c);document.querySelectorAll('[data-f]').forEach(a=>a.onclick=()=>fil(a.dataset.f));
$('#lb').onclick=()=>$('#lb').classList.remove('on');addEventListener('keydown',e=>{if(e.key==='Escape')$('#lb').classList.remove('on')});
C.productos.forEach(p=>{const a=document.createElement('article');a.className='card';a.innerHTML='<h3></h3><p></p><div class="price"></div><small class="note"></small><a class="btn sec" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>';
a.querySelector('h3').textContent=p.n;a.querySelector('p').textContent=p.d;a.querySelector('.price').textContent=p.p;a.querySelector('small').textContent='Disponibilidad: '+p.disp;
const l=a.querySelector('a');l.href=wa('Hola, me interesa: '+p.n);l.onclick=()=>track('product_click');if(p.imgs&&p.imgs.length){const m=document.createElement('div');m.className='pm';const big=new Image();big.src=p.imgs[0];big.alt=p.n;big.loading='lazy';m.append(big);if(p.imgs.length>1){const t=document.createElement('div');t.className='th';p.imgs.forEach((s,k)=>{const b=document.createElement('button');b.setAttribute('aria-label','Ver foto '+(k+1));const im=new Image();im.src=s;im.alt='';b.append(im);b.onclick=()=>big.src=s;t.append(b)});m.append(t)}a.prepend(m)}
$('#prd').append(a)});
(()=>{const s=$('#lcard'),lg=$('#llg');if(!s)return;const bx=[...s.querySelectorAll('.sg')];let run=0,vis=false;
if(matchMedia('(prefers-reduced-motion:reduce)').matches){bx.forEach(b=>b.classList.add('on'));s.classList.add('full');lg.classList.add('ok');return}
const play=()=>{const id=++run,ok=f=>setTimeout(()=>{if(id===run)f()},0);bx.forEach(b=>b.classList.remove('on'));s.classList.remove('full');lg.classList.remove('ok');
const at=(t,f)=>setTimeout(()=>{if(id===run)f()},t);bx.forEach((b,i)=>at(800+i*2000,()=>b.classList.add('on')));
at(800+5*2000+2200,()=>{s.classList.add('full');lg.classList.add('ok')});at(800+5*2000+2200+5000,()=>{if(vis)play()})};
new IntersectionObserver(es=>es.forEach(e=>{const was=vis;vis=e.isIntersecting;if(vis&&!was)play()}),{threshold:.35}).observe(s)})();
if(C.resenasUrl){$('#rv').hidden=false;$('#rv').href=C.resenasUrl;$('#rv').target='_blank';$('#rv').rel='noopener noreferrer'}
[['¿Cuánto cuesta un corte?','Desde $130 (clásico). Fade, Taper y Mullet: $150. Corte y barba: $250. Infantil: $100 a $120.'],['¿Cómo puedo reservar?','Con el formulario de Servicios (solo para hoy o mañana) o por WhatsApp. La cita queda confirmada hasta que respondan.'],['¿Atienden sin cita?','Sí, sujeto a disponibilidad.'],['¿Cuál es el horario?','Lunes a sábado de 11 a. m. a 8 p. m.; domingo de 11 a. m. a 4 p. m.'],['¿Qué estilos de corte realizan?','Clásico, Taper, Mullet, fade y barba.'],['¿Puedo solicitar un diseño personalizado?','Sí. Las grecas se cotizan según el diseño.'],['¿Cómo consulto los precios de otros servicios?','Color y pigmentación se consultan por WhatsApp.'],['¿Ofrecen cursos de barbería?','Sí. El curso cuesta $5,000 con facilidad de pagos: $2,000 de pago inicial y $500 semanales hasta cubrir el resto. Dura 4 meses, con 3 sesiones por semana (lunes, martes y jueves) en el horario que se te facilite. Pide informes por WhatsApp.'],['¿Cómo funciona el programa de lealtad?','En cada corte firmamos un recuadro de tu tarjeta. Al completar las 6 firmas, tu próximo corte es gratis.']].forEach(([q,a])=>{const x=document.createElement('details');x.innerHTML='<summary></summary><p></p>';x.firstChild.textContent=q;x.lastChild.textContent=a;$('#fq').append(x)});
$('#ct').onsubmit=e=>{e.preventDefault();const n=e.target.n.value.trim(),t=e.target.m.value.trim(),o=$('#cm');
if(!n||t.length<5){o.className='msg err';o.textContent='Completa tu nombre y un mensaje de al menos 5 caracteres.';return}
track('form_submit');o.className='msg ok';o.textContent='Abriendo WhatsApp para que envíes tu mensaje.';window.open(wa(`Hola, soy ${n}. ${t}`),'_blank','noopener')};
$('#dir').textContent=C.direccion||'Dirección por confirmar. Usa el botón para ver el establecimiento en Google Maps.';$('#mapb').href=C.mapsUrl;
if(C.mapsEmbed){const i=document.createElement('iframe');i.src=C.mapsEmbed;i.title='Mapa';i.loading='lazy';i.style.cssText='width:100%;height:320px;border:0;border-radius:8px;margin:12px 0';$('#map').append(i)}
const gaOn=()=>{if(!C.ga4)return;const s=document.createElement('script');s.async=1;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(C.ga4);document.head.append(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',C.ga4,{anonymize_ip:true})};
const cs=localStorage.getItem('amb_consent');if(cs==='1')gaOn();else if(!cs&&C.ga4)$('#consent').hidden=false;
$('#ca').onclick=()=>{localStorage.setItem('amb_consent','1');$('#consent').hidden=true;gaOn()};$('#cr').onclick=()=>{localStorage.setItem('amb_consent','0');$('#consent').hidden=true};
})();
