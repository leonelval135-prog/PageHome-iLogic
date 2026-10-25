import {sb} from './config.js';
const $=id=>document.getElementById(id),msg=t=>$('msg').textContent=t||'';
$('lf').onsubmit=async e=>{e.preventDefault();msg();const{error}=await sb.auth.signInWithPassword({email:$('em').value,password:$('pw').value});if(error)msg(error.message)};
$('signup').onclick=async()=>{msg();if(!$('lf').reportValidity())return;const{data,error}=await sb.auth.signUp({email:$('em').value,password:$('pw').value});if(error)return msg(error.message);if(!data.session)msg('Revisa tu correo para confirmar la cuenta.')};
$('bOut').onclick=()=>sb.auth.signOut();
export const onUser=cb=>sb.auth.onAuthStateChange((_,s)=>{const u=s?.user||null;$('login').classList.toggle('hide',!!u);$('app').classList.toggle('hide',!u);cb(u)});
