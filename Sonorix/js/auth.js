/* Sonorix · js/auth.js
   Login, registro, recuperación de contraseña, sesión, plan y foto de perfil (Supabase). */
function msg(t,ok){$("msg").textContent=t||"";$("msg").className="msg"+(ok?" ok":"")}
function setMode(m){mode=m;document.querySelectorAll(".tabs button").forEach(function(b){b.classList.toggle("on",b.dataset.t===m)});
$("fUser").style.display=$("fConf").style.display=m==="up"?"block":"none";$("go").textContent=m==="up"?"Crear cuenta":"Iniciar sesión";
$("pw").autocomplete=m==="up"?"new-password":"current-password";$("fg").style.display=m==="in"?"inline":"none";msg("")}
function openM(m){setMode(m||"in");$("ov").classList.add("on");setTimeout(function(){$("em").focus()},250)}
function closeM(){$("ov").classList.remove("on");$("pw").value=$("pc").value=""}
$("loginBtn").onclick=function(){openM("in")};$("cl").onclick=closeM;
$("ov").addEventListener("click",function(e){if(e.target===$("ov"))closeM()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!document.querySelector("#inf.on,#ckm.on"))closeM()});
document.querySelectorAll(".tabs button").forEach(function(b){b.onclick=function(){setMode(b.dataset.t)}});
document.querySelectorAll("[data-auth]").forEach(function(b){b.onclick=function(){openM(S?"in":b.dataset.auth)}});
function api(path,body,tok,method){return fetch(SB+path,{method:method||"POST",headers:{"apikey":KEY,"Content-Type":"application/json","Authorization":"Bearer "+(tok||KEY)},body:body?JSON.stringify(body):undefined}).then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(!r.ok)throw j;return j})})}
function err(e){var m=((e&&(e.msg||e.error_description||e.message))||"").toLowerCase();
if(m.indexOf('username_taken')>-1)return'Ese nombre de usuario ya está en uso.';if(m.indexOf('device_banned')>-1)return'Este dispositivo no puede crear cuentas.';if(m.indexOf("invalid login")>-1)return"Correo o contraseña incorrectos.";if(m.indexOf("already")>-1)return"Ese correo ya tiene una cuenta. Inicia sesión.";
if(m.indexOf("confirm")>-1)return"Confirma tu correo antes de iniciar sesión.";if(m.indexOf("rate")>-1)return"Demasiados intentos. Espera un momento.";
if(m.indexOf("password")>-1)return"La contraseña no cumple los requisitos.";return"No se pudo completar. Revisa tu conexión e inténtalo de nuevo."}
function save(s){S=s;setTimeout(function(){post(s)},0);try{localStorage.setItem("sx",JSON.stringify({a:s.access_token,r:s.refresh_token,e:s.user&&s.user.email}))}catch(x){}render()}
function render(){var on=!!S;$("loginBtn").style.display=on?"none":"";$("acc").classList.toggle("on",on);
if(on){var um=S.user&&S.user.user_metadata;$("accMail").textContent=um&&um.username||"";plan()}}
var NAMES={freemium:"Freemium",personal:"Personal",amigos:"Amigos",pro:"Pro"};
function plan(){$("accPlan").textContent="";api("/rest/v1/rpc/get_my_plan",{},S.access_token).then(function(j){var r=Array.isArray(j)?j[0]:j;var id=String(r&&(r.plan_id||r.plan||r.id)||"freemium").toLowerCase();
$("accPlan").textContent=NAMES[id]||id;if(r&&r.is_trial)$("accPlan").textContent+=" · prueba"}).catch(function(){$("accPlan").textContent="Freemium"})}
$("go").onclick=function(){var em=$("em").value.trim().toLowerCase(),pw=$("pw").value;
if(!/^\S+@\S+\.\S+$/.test(em)||!pw){msg("Escribe un correo válido y tu contraseña.");return}
if(mode==="up"){var un=$("un").value.trim();if(un.length<3){msg("El usuario necesita al menos 3 caracteres.");return}
if(pw.length<8){msg("La contraseña necesita al menos 8 caracteres.");return}if(pw!==$("pc").value){msg("Las contraseñas no coinciden.");return}if(!$('tck').checked){msg('Debes aceptar los Términos y Condiciones para crear tu cuenta.');var tl=$('tcl');tl.classList.remove('er');void tl.offsetWidth;tl.classList.add('er');return}if(!/^[A-Za-z0-9_.]{3,24}$/.test(un)){msg('El usuario debe tener de 3 a 24 caracteres: letras, números, _ o .');return}}
$("go").disabled=true;msg("Un momento…",true);
var p=mode==="up"?signup(em,pw,$("un").value.trim()):api("/auth/v1/token?grant_type=password",{email:em,password:pw});
p.then(function(j){if(j.access_token){if(mode==='up'&&avBlob){var bb=avBlob;up(bb,j.user.id,j.access_token).then(function(){ldAv(j.user.id,j.access_token)}).catch(function(){})}save(j);msg("");closeM();avSet(null)}else{var nm="Te enviamos un correo: confírmalo y luego inicia sesión.";if(mode==='up'&&avBlob){var fr=new FileReader();fr.onload=function(){try{localStorage.setItem('sxa',JSON.stringify({e:em,d:fr.result}))}catch(x){}};fr.readAsDataURL(avBlob);nm+=" Tu foto se subirá en tu primer inicio de sesión."}msg(nm,true);setMode("in")}})
.catch(function(e){msg(err(e))}).then(function(){$("go").disabled=false})};
$("fg").onclick=function(){var em=$("em").value.trim();if(!em){msg("Escribe tu correo arriba y vuelve a tocar aquí.");return}
api("/auth/v1/recover",{email:em}).then(function(){msg("Si el correo existe, recibirás un enlace para restablecer tu contraseña.",true)}).catch(function(){msg("No se pudo enviar el enlace.")})};
$("outBtn").onclick=function(){var t=S&&S.access_token;S=null;try{localStorage.removeItem("sx")}catch(x){}render();if(t)api("/auth/v1/logout",{},t).catch(function(){})};
try{var o=JSON.parse(localStorage.getItem("sx")||"null");if(o&&o.r){api("/auth/v1/token?grant_type=refresh_token",{refresh_token:o.r}).then(save).catch(function(){try{localStorage.removeItem("sx")}catch(x){}})}}catch(x){}
var PERSON="<svg viewBox='0 0 24 24' width='46' height='46' fill='currentColor'><path d='M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5z'/></svg>",avBlob=null,avUrl=null;
$('avi').innerHTML=PERSON;
function avSet(b){avBlob=b;var i=$('avi');if(avUrl)URL.revokeObjectURL(avUrl);avUrl=b?URL.createObjectURL(b):null;i.style.backgroundImage=b?'url('+avUrl+')':'';i.innerHTML=b?'':PERSON;$('avx').style.display=b?'inline':'none';$('avt').textContent=b?'Toca la foto para cambiarla':'Añade tu foto (opcional)';var a=$('avb');a.classList.remove('pop');void a.offsetWidth;a.classList.add('pop')}
$('avb').onclick=function(){$('avf').click()};$('avx').onclick=function(){avSet(null)};
$('avf').onchange=function(){var f=this.files[0];this.value='';if(!f)return;if(!/^image\/(jpeg|png|webp)$/.test(f.type)){msg('Elige una imagen JPG, PNG o WebP.');return}
var im=new Image(),u=URL.createObjectURL(f);im.onload=function(){var s=Math.min(im.width,im.height),o=Math.min(512,s),c=document.createElement('canvas');c.width=c.height=o;c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,o,o);c.toBlob(function(b){URL.revokeObjectURL(u);if(b){msg('');avSet(b)}else msg('No se pudo leer esa imagen. Prueba con otra.')},'image/jpeg',.88)};im.onerror=function(){URL.revokeObjectURL(u);msg('No se pudo leer esa imagen. Prueba con otra.')};im.src=u};
function up(b,id,tok){return fetch(SB+'/storage/v1/object/avatars/'+id+'/avatar.jpg',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+tok,'x-upsert':'true','Content-Type':'image/jpeg'},body:b}).then(function(r){if(!r.ok)throw r;return api('/rest/v1/profiles?user_id=eq.'+id,{avatar_url:SB+'/storage/v1/object/public/avatars/'+id+'/avatar.jpg?v='+Date.now()},tok,'PATCH')})}
function showAv(u){var t=new Image();t.onload=function(){$('accImg').src=u;$('accImg').style.display='block'};t.src=u}
function ldName(id,tok){api('/rest/v1/profiles?select=username&user_id=eq.'+id,null,tok,'GET').then(function(j){var n=j&&j[0]&&j[0].username;if(n)$('accMail').textContent=n;else if(!$('accMail').textContent&&S&&S.user&&S.user.email)$('accMail').textContent=S.user.email.split('@')[0]}).catch(function(){if(!$('accMail').textContent&&S&&S.user&&S.user.email)$('accMail').textContent=S.user.email.split('@')[0]})}
function ldAv(id,tok){ldName(id,tok);api('/rest/v1/profiles?select=avatar_url&user_id=eq.'+id,null,tok,'GET').then(function(j){var a=j&&j[0]&&j[0].avatar_url;if(a)showAv(a)}).catch(function(){})}
function post(s){var u=s.user||{},tok=s.access_token;$('accImg').style.display='none';if(!u.id)return;try{var p=JSON.parse(localStorage.getItem('sxa')||'null');if(p&&u.email&&p.e===u.email.toLowerCase()){fetch(p.d).then(function(r){return r.blob()}).then(function(b){return up(b,u.id,tok)}).then(function(){localStorage.removeItem('sxa');ldAv(u.id,tok)}).catch(function(){})}}catch(x){}ldAv(u.id,tok)}
function devId(){var d;try{d=localStorage.getItem('sxd');if(!d){d='web-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+Math.random().toString(16).slice(2));localStorage.setItem('sxd',d)}}catch(x){d='web-'+Date.now()}return d}
function signup(em,pw,un){var d=devId();
return api('/rest/v1/rpc/username_available',{p_username:un}).then(function(v){return v===false?Promise.reject({msg:'USERNAME_TAKEN'}):0},function(){return 0})
.then(function(){return api('/rest/v1/rpc/device_blocked',{p_device_id:d}).then(function(b){return b===true?Promise.reject({msg:'DEVICE_BANNED'}):0},function(){return 0})})
.then(function(){return api('/auth/v1/signup',{email:em,password:pw,data:{username:un,accepted_terms_version:TV,accepted_terms_at:new Date().toISOString(),device_id:d}})})}
