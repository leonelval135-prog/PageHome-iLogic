// Forma de pago: efectivo o tarjeta. La tarjeta se cobra de verdad con Stripe Checkout (página segura de Stripe):
// esta página NUNCA recibe ni guarda números de tarjeta; solo muestra el total y redirige tras guardar la cita.
(()=>{const $=s=>document.querySelector(s),box=$('#cardbox');if(!box)return;
const C=window.AMB||{},cc=$('#cc'),nm=$('#cc-name'),tot=$('#pay-total'),note=$('#pay-note'),bk=$('#book'),sel=$('#sel');
const card=document.querySelector('input[name=pago][value="Pago con tarjeta"]'),cash=document.querySelector('input[name=pago][value=Efectivo]');
const btn=bk.querySelector('button[type=submit]'),txt0=btn?btn.textContent:'';
const NOTE0=note.textContent;
if(C.pagos===false){card.disabled=true;const o=card.closest('.pay-opt');o.classList.add('off');o.title='No disponible por el momento';
 const sp=o.querySelector('span');sp.insertAdjacentHTML('beforeend','<small class="pay-off">No disponible por el momento</small>');box.remove();return}
const svc=()=>(C.servicios||[]).find(s=>s.n===sel.value);
const ok=()=>{const s=svc();return !!(s&&s.o)};
window.AMBpagoOk=ok;
function paint(){
 const t=card.checked,s=svc(),can=ok();
 box.hidden=!t;box.classList.toggle('show',t);
 const n=(bk.elements.n.value||'').trim().toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ .'-]/g,'').slice(0,26);nm.textContent=n||'TU NOMBRE';
 tot.textContent=can?s.p+' MXN':'—';
 note.classList.toggle('warn',t&&!can);
 note.textContent=can?NOTE0:(s?'Este servicio no se paga en línea (precio variable o por confirmar). Elige Efectivo o consúltalo por WhatsApp.':'Elige primero un servicio para ver el total a pagar.');
 if(btn)btn.textContent=(t&&can)?'Guardar cita y pagar con tarjeta':txt0;
}
document.querySelectorAll('input[name=pago]').forEach(r=>r.addEventListener('change',paint));
sel.addEventListener('change',paint);bk.elements.n.addEventListener('input',paint);
// el nombre se rellena por script al iniciar sesión (sin evento "input"): lo revisamos cuando el formulario cambia
bk.addEventListener('change',paint);setInterval(()=>{if(card.checked)paint()},1500);
window.AMBpagoReset=()=>{cash.checked=true;paint()};
paint();
})();
