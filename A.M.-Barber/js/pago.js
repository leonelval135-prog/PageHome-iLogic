// Forma de pago: efectivo o tarjeta. La tarjeta es solo una animación ilustrativa:
// los campos no tienen "name", no se envían, no se guardan y se limpian al enviar la cita.
(()=>{const $=s=>document.querySelector(s),box=$('#cardbox');if(!box)return;
const cc=$('#cc'),pn=$('#pn'),pc=$('#pc'),pe=$('#pe'),pv=$('#pv'),num=$('#cc-num'),nm=$('#cc-name'),ex=$('#cc-exp'),cv=$('#cc-cvv'),logo=$('#cc-logo');
const LOGO={
visa:'<svg viewBox="0 0 80 28" aria-hidden="true"><text x="0" y="24" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="800" font-style="italic" fill="#fff" letter-spacing="-1">VISA</text></svg>',
mastercard:'<svg viewBox="0 0 56 36" aria-hidden="true"><circle cx="20" cy="18" r="16" fill="#eb001b"/><circle cx="36" cy="18" r="16" fill="#f79e1b"/><path d="M28 5.6a16 16 0 0 1 0 24.8 16 16 0 0 1 0-24.8z" fill="#ff5f00"/></svg>',
amex:'<svg viewBox="0 0 70 30" aria-hidden="true"><rect width="70" height="30" rx="5" fill="#fff"/><text x="35" y="21" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="800" fill="#1f72cd">AMEX</text></svg>',
discover:'<svg viewBox="0 0 90 24" aria-hidden="true"><text x="0" y="18" font-family="Inter,Arial,sans-serif" font-size="16" font-weight="800" fill="#fff">DISCOVER</text><circle cx="82" cy="12" r="6" fill="#f58220"/></svg>',
diners:'<svg viewBox="0 0 90 24" aria-hidden="true"><text x="0" y="18" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="800" fill="#fff">DINERS</text></svg>',
jcb:'<svg viewBox="0 0 60 26" aria-hidden="true"><text x="0" y="21" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="800" fill="#fff">JCB</text></svg>',
unionpay:'<svg viewBox="0 0 90 24" aria-hidden="true"><text x="0" y="18" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="800" fill="#fff">UnionPay</text></svg>'};
const NAME={visa:'Visa',mastercard:'Mastercard',amex:'American Express',discover:'Discover',diners:'Diners Club',jcb:'JCB',unionpay:'UnionPay'};
const brand=d=>{if(/^3[47]/.test(d))return'amex';if(/^4/.test(d))return'visa';
if(/^5[1-5]/.test(d))return'mastercard';if(d.length>=4){const n=+d.slice(0,4);if(n>=2221&&n<=2720)return'mastercard'}
if(/^(6011|65|64[4-9])/.test(d))return'discover';if(/^(30[0-5]|36|38|39)/.test(d))return'diners';
if(d.length>=2&&+d.slice(0,2)===35&&(d.length<4||(+d.slice(0,4)>=3528&&+d.slice(0,4)<=3589)))return'jcb';if(/^62/.test(d))return'unionpay';return''};
const luhn=d=>{let s=0,a=0;for(let i=d.length-1;i>=0;i--){let n=+d[i];if(a){n*=2;if(n>9)n-=9}s+=n;a^=1}return s%10===0};
// pinta texto en la tarjeta; los caracteres nuevos "caen" con una pequeña animación
const draw=(el,str,filled,prev)=>{el.textContent='';[...str].forEach((c,i)=>{const s=document.createElement('span');s.textContent=c===' '?' ':c;if(i<filled)s.className=i>=prev?'f n':'f';el.append(s)})};
const prevLen={num:0,nm:0,ex:0,cv:0};
let bd='';
const layout=b=>b==='amex'?[4,6,5]:b==='diners'?[4,6,4]:[4,4,4,4];
const group=(d,b)=>{const L=layout(b);let o=[],p=0;for(const g of L){if(p>=d.length)break;o.push(d.slice(p,p+g));p+=g}return o.join(' ')};
const pad=(d,b)=>{const L=layout(b);let o=[],p=0;for(const g of L){const part=d.slice(p,p+g);o.push(part+'•'.repeat(g-part.length));p+=g}return o.join(' ')};
function upd(){
 let d=pn.value.replace(/\D/g,'');const b=brand(d),max=b==='amex'?15:b==='diners'?14:16;d=d.slice(0,max);
 if(b!==bd){bd=b;cc.dataset.brand=b;logo.innerHTML=b?LOGO[b]:'';logo.title=b?NAME[b]:'';logo.classList.remove('pop');void logo.offsetWidth;if(b)logo.classList.add('pop');$('#pbrand').textContent=b?NAME[b]:''}
 pn.value=group(d,b);
 const shown=pad(d,b);draw(num,shown,shown.length,0);
 // solo animamos el último dígito escrito
 [...num.children].forEach((s,i)=>{s.className=(shown[i]!=='•'&&shown[i]!==' ')?'f':'';});
 const idx=[...shown].map((c,i)=>c!=='•'&&c!==' '?i:-1).filter(i=>i>=0).pop();
 if(d.length>prevLen.num&&idx!=null&&num.children[idx])num.children[idx].className='f n';
 prevLen.num=d.length;
 pn.setAttribute('aria-invalid',d.length>=(b==='amex'?15:b==='diners'?14:16)&&!luhn(d)?'true':'false');
 pv.maxLength=b==='amex'?4:3;updCvv();
}
function updName(){const v=pc.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'-]/g,'').slice(0,26);if(v!==pc.value)pc.value=v;const u=v.toUpperCase();
 const grew=u.length>prevLen.nm;prevLen.nm=u.length;nm.textContent='';
 if(!u){nm.textContent='NOMBRE DEL TITULAR';nm.classList.add('empty');return}nm.classList.remove('empty');
 [...u].forEach((c,i)=>{const s=document.createElement('span');s.textContent=c===' '?' ':c;s.className=(grew&&i===u.length-1)?'f n':'f';nm.append(s)})}
function updExp(){let d=pe.value.replace(/\D/g,'').slice(0,4);if(d[0]>'1')d='0'+d;if(d.length>=2&&+d.slice(0,2)>12)d='12'+d.slice(2);if(d.slice(0,2)==='00')d='01'+d.slice(2);
 pe.value=d.length>2?d.slice(0,2)+'/'+d.slice(2):d;const s=(d.slice(0,2)+'/'+d.slice(2)).padEnd(5,'•').replace(/^(.{2})\/(.*)$/,(m,a,b)=>a.padEnd(2,'•')+'/'+b.padEnd(2,'•'));
 const grew=d.length>prevLen.ex;prevLen.ex=d.length;draw(ex,s,5,99);
 [...ex.children].forEach((c,i)=>{const ok=c.textContent!=='•'&&c.textContent!=='/';c.className=ok?'f':'';});
 if(grew&&d.length){const pos=d.length<=2?d.length-1:d.length;if(ex.children[pos])ex.children[pos].className='f n'}}
function updCvv(){const d=pv.value.replace(/\D/g,'').slice(0,bd==='amex'?4:3);pv.value=d;cv.textContent='•'.repeat(d.length)||'•••';cv.classList.toggle('empty',!d.length)}
pn.addEventListener('input',upd);pc.addEventListener('input',updName);pe.addEventListener('input',updExp);pv.addEventListener('input',updCvv);
pv.addEventListener('focus',()=>cc.classList.add('flip'));pv.addEventListener('blur',()=>cc.classList.remove('flip'));
[pn,pc,pe].forEach(x=>x.addEventListener('focus',()=>cc.classList.remove('flip')));
// efectivo / tarjeta
const radios=document.querySelectorAll('input[name=pago]');
const sync=()=>{const t=document.querySelector('input[name=pago]:checked').value==='Pago con tarjeta';box.hidden=!t;box.classList.toggle('show',t);if(t)setTimeout(()=>pn.focus({preventScroll:true}),450)};
radios.forEach(r=>r.addEventListener('change',sync));
window.AMBpagoReset=()=>{[pn,pc,pe,pv].forEach(x=>x.value='');bd='';prevLen.num=prevLen.nm=prevLen.ex=0;cc.dataset.brand='';logo.innerHTML='';$('#pbrand').textContent='';upd();updName();updExp();updCvv();cc.classList.remove('flip');
 document.querySelector('input[name=pago][value=Efectivo]').checked=true;sync()};
upd();updName();updExp();updCvv();sync();
})();
