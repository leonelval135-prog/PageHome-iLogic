/* Sonorix · js/ui.js
   Utilidades, descarga, animaciones al hacer scroll, menú móvil y progreso de scroll. */
var $=function(i){return document.getElementById(i)};
var dlUrl=(DOWNLOAD_URL||"").trim();
if(dlUrl){["dl1","dl2"].forEach(function(i){var a=$(i);a.href=dlUrl;if(/^https?:/i.test(dlUrl)){a.target="_blank";a.rel="noopener"}})}
else{var d2=$("dl2");d2.textContent="Descarga próximamente";d2.style.opacity=".6";d2.style.cursor="not-allowed";d2.setAttribute("aria-disabled","true");d2.onclick=function(e){e.preventDefault()}}
$("dl1").addEventListener("click",function(){});
var io=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){x.target.classList.add("on");io.unobserve(x.target)}})},{threshold:.15});
document.querySelectorAll(".rv").forEach(function(el,i){el.style.transitionDelay=(i%4)*70+"ms";io.observe(el)});
document.querySelector('.fi').src=document.querySelector('nav .brand img').src;
$('mb').onclick=function(){var o=$('lk').classList.toggle('open');$('mb').setAttribute('aria-expanded',o)};
document.querySelectorAll('.links a').forEach(function(a){a.addEventListener('click',function(){$('lk').classList.remove('open')})});
addEventListener('scroll',function(){var h=document.documentElement.scrollHeight-innerHeight;$('pg').style.width=(h>0?scrollY/h*100:0)+'%'},{passive:true});
var so=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting)document.querySelectorAll('.links a').forEach(function(a){a.classList.toggle('act',a.getAttribute('href')==='#'+x.target.id)})})},{rootMargin:'-45% 0px -50% 0px'});
document.querySelectorAll('section[id]').forEach(function(s){so.observe(s)});
