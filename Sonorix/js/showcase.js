/* Sonorix · js/showcase.js
   Demo de funciones por pestañas, QR ilustrativo y tabla comparativa de planes. */
var ts=document.querySelectorAll('.st button'),ps=document.querySelectorAll('.pn'),au,n=0;
function tab(i){ts.forEach(function(b,j){b.classList.toggle('on',i===j);ps[j].classList.toggle('on',i===j)})}
ts.forEach(function(b,i){b.onclick=function(){clearInterval(au);n=i;tab(i)}});
if(!matchMedia('(prefers-reduced-motion:reduce)').matches)au=setInterval(function(){n=(n+1)%ts.length;tab(n)},5500);
var q=$('qr');for(var i=0;i<81;i++){var c=document.createElement('i'),r=Math.floor(i/9),k=i%9,f=(r<3&&(k<3||k>5))||(r>5&&k<3);if(!f&&(i*7+r*5)%3===0)c.className='o';q.appendChild(c)}
var Y='✓',N='—',R=[['Precio mensual','$0','$50','$130','$150'],['Anuncios','Con anuncios','Sin anuncios','Sin anuncios','Sin anuncios'],['Descargas offline','Hasta 100','Sin límite fijo','Sin límite fijo','Sin límite fijo'],['Playlists','Hasta 10','Ilimitadas','Ilimitadas','Ilimitadas'],['Posts, mensajes y amigos',Y,Y,Y,Y],['Sono3D y ecualizador',N,Y,Y,Y],['Automix y calidad configurable',N,Y,Y,Y],['Personalización completa',N,Y,Y,Y],['SonParty',N,Y,Y,Y],['Letras sincronizadas y Canvas',N,Y,Y,Y],['Estadísticas avanzadas',N,Y,Y,Y],['Hasta 4 perfiles',N,N,Y,Y],['Playlists colaborativas y escucha sincronizada',N,N,Y,Y],['Karaoke',N,N,Y,Y],['SonoAI y playlists con IA',N,N,N,Y]];
$('tb').innerHTML=R.map(function(r){return '<tr>'+r.map(function(c,i){return i?'<td class="'+(c===Y?'y':c===N?'n':'')+'">'+c+'</td>':'<td>'+c+'</td>'}).join('')+'</tr>'}).join('');
