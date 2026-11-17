/* Sonorix · js/player-demo.js
   Animación del teléfono: reproducción, progreso y me gusta. */
var pla=$('pla'),plp=$('plp'),plf=$('plf'),plt=$('plt'),plh=$('plh'),playing=false,tt=42,man=false,PLA="<svg viewBox='0 0 24 24' width='30' height='30'><path d='M8 5v14l11-7z'/></svg>",PAU="<svg viewBox='0 0 24 24' width='30' height='30'><path d='M6 5h4v14H6zM14 5h4v14h-4z'/></svg>";
function setPlay(p){playing=p;pla.classList.toggle('on',p);plp.innerHTML=p?PAU:PLA;plp.setAttribute('aria-label',p?'Pausar':'Reproducir')}
function fmt(s){return Math.floor(s/60)+':'+('0'+Math.floor(s%60)).slice(-2)}
function like(v){plh.classList.remove('on');void plh.offsetWidth;plh.classList.toggle('on',v);plh.textContent=v?'♥':'♡'}
setInterval(function(){if(!playing)return;tt=tt>=204?0:tt+.25;plf.style.width=tt/204*100+'%';plt.textContent=fmt(tt)},250);
plp.onclick=function(){man=true;setPlay(!playing)};plh.onclick=function(){man=true;like(!plh.classList.contains('on'))};
setPlay(false);plf.style.width='20%';setTimeout(function(){setPlay(true)},900);setTimeout(function(){if(!man)like(true)},3200);
if(!matchMedia('(prefers-reduced-motion:reduce)').matches)setInterval(function(){if(!man)setPlay(!playing)},7000);
