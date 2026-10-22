// Pruebas: node tests/check.js
const fs=require('fs'),vm=require('vm');let ok=1;const t=(n,c)=>{console.log((c?'OK   ':'FAIL ')+n);if(!c)ok=0};
const w={};vm.runInNewContext(fs.readFileSync('js/config.js','utf8'),{window:w});const C=w.AMB;
['js/app.js','js/extra.js','js/pago.js'].forEach(f=>new vm.Script(fs.readFileSync(f,'utf8')));t('app.js sintaxis válida',1);
t('WhatsApp 525616773834',C.whatsapp==='525616773834');t('10 servicios',C.servicios.length===10);t('fade $150',C.servicios[0].p==='$150');
const h=fs.readFileSync('index.html','utf8');['css/styles.css','js/config.js','js/app.js','js/extra.js','css/glass.css','js/fx.js','js/pago.js','css/pago.css','assets/logo.jpg','assets/logo.svg'].forEach(f=>t('existe y enlazado '+f,fs.existsSync(f)&&h.includes(f)));
['nosotros','curso','servicios','galeria','productos','lealtad','faq','contacto','svc','sel','gal','fl','prd','fq','lbc','consent','cita','rlist','rform','stars','th','citas','clist','l3d','prog'].forEach(a=>t('id '+a,h.includes('id="'+a+'"')));
['robots.txt','sitemap.xml','404.html'].forEach(f=>t('existe '+f,fs.existsSync(f)));(fs.readFileSync('js/config.js','utf8').match(/assets\/[\w\/.-]+/g)||[]).forEach(f=>t('imagen existe '+f,fs.existsSync(f)));
const ex=fs.readFileSync('js/extra.js','utf8');t('login: #lg2 usa openLogin',ex.includes("$('#lg2').onclick=openLogin")&&!ex.includes("=$('#lg').onclick"));new vm.Script(fs.readFileSync('js/fx.js','utf8'));
t('ball/index.html existe',fs.existsSync('ball/index.html'));t('sección #ball',h.includes('id="ball"')&&h.includes('href="ball/index.html"'));t('ya no existe penalty/',!fs.existsSync('penalty')&&!/penalty/i.test(h));
const bw={};vm.runInNewContext(fs.readFileSync('ball/js/config.js','utf8'),{window:bw});t('ball: mismo Supabase que el sitio',bw.BL.url===C.supabaseUrl&&bw.BL.key===C.supabaseKey);new vm.Script(fs.readFileSync('ball/js/game.js','utf8'));t('ball/game.js sintaxis válida',1);
['ball/js/config.js','ball/js/game.js','ball/css/styles.css','ball/assets/logo-white.png','ball/supabase/a-m-ball.sql'].forEach(f=>t('existe '+f,fs.existsSync(f)));
['supabase/pagos.sql','supabase/functions/crear-pago/index.ts','supabase/functions/stripe-webhook/index.ts'].forEach(f=>t('existe '+f,fs.existsSync(f)));
t('6 servicios pagables en línea',C.servicios.filter(s=>s.o).length===6);
t('infantil/grecas/color no se pagan en línea',C.servicios.filter(s=>['infantil','grecas','color','pigmentacion'].includes(s.id)).every(s=>!s.o));
const cp=fs.readFileSync('supabase/functions/crear-pago/index.ts','utf8');
C.servicios.filter(s=>s.o).forEach(s=>t('precio servidor coincide: '+s.n,new RegExp('"'+s.n.replace(/[()]/g,'\\$&')+'": '+s.p.replace('$','')+'[,\\s]').test(cp)));
t('el HTML ya no pide número de tarjeta',!/id="pn"|id="pv"|id="pe"/.test(h));

// v1.17: cookies, términos y límite de canje por IP/30 días
['cookies.html','terminos.html','css/legal.css','ball/supabase/a-m-ball-limite-ip.sql'].forEach(f=>t('existe '+f,fs.existsSync(f)));
t('index enlaza legal.css, cookies y términos',h.includes('css/legal.css')&&h.includes('href="cookies.html"')&&h.includes('href="terminos.html"'));
['ckt','ckrows','ckan','ca','cr','cp','ckprefs'].forEach(a=>t('cartel de cookies: id '+a,h.includes('id="'+a+'"')));
const ap=fs.readFileSync('js/app.js','utf8');t('cookies: guarda amb_consent y activa GA solo con permiso',ap.includes("amb_consent")&&/if\(cs==='1'\)gaOn\(\)/.test(ap));
const ck=fs.readFileSync('cookies.html','utf8'),tm=fs.readFileSync('terminos.html','utf8');
t('cookies.html explica la IP cifrada y los 30 días',ck.includes('id="ip"')&&/30 días/.test(ck)&&/hash|huella/i.test(ck));
t('terminos.html: regla de 30 días, IP y seguir jugando gratis',tm.includes('id="ball"')&&/un premio cada 30 días/.test(tm)&&/dirección IP/.test(tm)&&/gratuita/.test(tm));
const bi=fs.readFileSync('ball/index.html','utf8');t('ball: aviso de cookies y enlaces legales',bi.includes('id="ckb"')&&bi.includes('terminos.html#ball')&&bi.includes('cookies.html'));
const gj=fs.readFileSync('ball/js/game.js','utf8');
t('ball: errores cooldown/cooldown_ip/sin_ip',/cooldown_ip/.test(gj)&&/sin_ip/.test(gj));
t('ball: mensaje de próximo canje (30 días) y juego gratis',/podrás canjear otro premio a partir del/i.test(gj)&&/gratuita/.test(gj));
t('ball: exige aceptar términos antes de canjear',gj.includes('id="ctc"')&&gj.includes('$(\'#ctc\').checked'));
const sq=fs.readFileSync('ball/supabase/a-m-ball-limite-ip.sql','utf8');
t('sql: IP leída del servidor (request.headers) y guardada como hash',sq.includes("request.headers")&&sq.includes('sha256')&&sq.includes('ip_hash'));
t('sql: bloqueo de 30 días por cuenta y por IP',sq.includes("interval '30 days'")&&sq.includes('cooldown_ip')&&sq.includes('player_id=p_player')&&sq.includes('ip_hash=v_hash'));
t('sql: no guarda la IP en claro',!/insert into public\.ab_canjes\([^)]*\bip\b[,)]/.test(sq));
t('sitemap incluye cookies y términos',fs.readFileSync('sitemap.xml','utf8').includes('cookies.html')&&fs.readFileSync('sitemap.xml','utf8').includes('terminos.html'));
process.exit(ok?0:1);
