(()=>{const $=s=>document.querySelector(s),rm=matchMedia('(prefers-reduced-motion:reduce)').matches,fine=matchMedia('(pointer:fine)').matches;
if(/Chrome|Chromium|Edg/.test(navigator.userAgent)&&!/Mobile|Android/.test(navigator.userAgent))document.documentElement.classList.add('refract');
// ondas en botones
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('.btn');if(!b||rm)return;const r=b.getBoundingClientRect(),d=Math.max(r.width,r.height)*2,s=document.createElement('span');s.className='rip';s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;b.append(s);setTimeout(()=>s.remove(),650)});
if(!rm&&fine){
// inclinación 3D en tarjetas
document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.card.done:not(#modal .card)');if(!c)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`perspective(800px) rotateX(${-y*6}deg) rotateY(${x*6}deg) translateY(-4px)`},{passive:true});
document.addEventListener('pointerout',e=>{const c=e.target.closest&&e.target.closest('.card');if(c&&!c.contains(e.relatedTarget))c.style.transform=''});
// botones magnéticos
document.querySelectorAll('.hero .btn,.capsule .btn').forEach(b=>{b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.translate=`${(e.clientX-r.left-r.width/2)*.18}px ${(e.clientY-r.top-r.height/2)*.28}px`});b.addEventListener('pointerleave',()=>b.style.translate='')});
// parallax de la aurora
const bl=[...document.querySelectorAll('.aur i')];let q=0;addEventListener('scroll',()=>{if(q)return;q=requestAnimationFrame(()=>{bl.forEach((b,i)=>b.style.translate=`0 ${-scrollY*(.05+i*.04)}px`);q=0})},{passive:true})}
// menú: sección activa y sombra del header
const links=[...document.querySelectorAll('nav a')],hd=$('header');
new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle('act',a.getAttribute('href')==='#'+e.target.id))}),{rootMargin:'-45% 0px -50% 0px'}).observe&&document.querySelectorAll('main section[id]').forEach(s=>new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle('act',a.getAttribute('href')==='#'+s.id))}),{rootMargin:'-45% 0px -50% 0px'}).observe(s));
addEventListener('scroll',()=>hd.style.transform=scrollY>20?'scale(.985)':'',{passive:true})})();
