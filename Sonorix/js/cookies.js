/* Sonorix · js/cookies.js
   Aviso y preferencias de cookies. */
var CK="sxc";function ck(){try{return JSON.parse(localStorage.getItem(CK))}catch(x){return null}}
function setCk(v){try{localStorage.setItem(CK,JSON.stringify(v))}catch(x){}$("ckb").classList.remove("on");$("ckm").classList.remove("on")}
if(!ck())setTimeout(function(){$("ckb").classList.add("on")},1200);
$("ckAll").onclick=function(){setCk({p:1,a:1})};$("ckNec").onclick=function(){setCk({p:0,a:0})};
function openCk(){var c=ck()||{};$("ckP").checked=!!c.p;$("ckA").checked=!!c.a;$("ckm").classList.add("on")}
$("ckCfg").onclick=openCk;$("ckSave").onclick=function(){setCk({p:$("ckP").checked?1:0,a:$("ckA").checked?1:0})};
