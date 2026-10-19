// Pruebas: node tests/check.js
const fs=require('fs'),vm=require('vm');let ok=1;const t=(n,c)=>{console.log((c?'OK   ':'FAIL ')+n);if(!c)ok=0};
const w={};vm.runInNewContext(fs.readFileSync('js/config.js','utf8'),{window:w});const C=w.AMB;
['js/app.js','js/extra.js','js/pago.js'].forEach(f=>new vm.Script(fs.readFileSync(f,'utf8')));t('app.js sintaxis válida',1);
t('WhatsApp 525616773834',C.whatsapp==='525616773834');t('10 servicios',C.servicios.length===10);t('fade $150',C.servicios[0].p==='$150');
const h=fs.readFileSync('index.html','utf8');['css/styles.css','js/config.js','js/app.js','js/extra.js','css/glass.css','js/fx.js','js/pago.js','css/pago.css','assets/logo.jpg','assets/logo.svg'].forEach(f=>t('existe y enlazado '+f,fs.existsSync(f)&&h.includes(f)));
['nosotros','curso','servicios','galeria','productos','lealtad','faq','contacto','svc','sel','gal','fl','prd','fq','lbc','consent','cita','rlist','rform','stars','th','citas','clist','l3d','prog'].forEach(a=>t('id '+a,h.includes('id="'+a+'"')));
['robots.txt','sitemap.xml','404.html'].forEach(f=>t('existe '+f,fs.existsSync(f)));(fs.readFileSync('js/config.js','utf8').match(/assets\/[\w\/.-]+/g)||[]).forEach(f=>t('imagen existe '+f,fs.existsSync(f)));
const ex=fs.readFileSync('js/extra.js','utf8');t('login: #lg2 usa openLogin',ex.includes("$('#lg2').onclick=openLogin")&&!ex.includes("=$('#lg').onclick"));new vm.Script(fs.readFileSync('js/fx.js','utf8'));
t('penalty/index.html existe',fs.existsSync('penalty/index.html'));t('sección #penalty',h.includes('id="penalty"'));
['supabase/pagos.sql','supabase/functions/crear-pago/index.ts','supabase/functions/stripe-webhook/index.ts'].forEach(f=>t('existe '+f,fs.existsSync(f)));
t('6 servicios pagables en línea',C.servicios.filter(s=>s.o).length===6);
t('infantil/grecas/color no se pagan en línea',C.servicios.filter(s=>['infantil','grecas','color','pigmentacion'].includes(s.id)).every(s=>!s.o));
const cp=fs.readFileSync('supabase/functions/crear-pago/index.ts','utf8');
C.servicios.filter(s=>s.o).forEach(s=>t('precio servidor coincide: '+s.n,new RegExp('"'+s.n.replace(/[()]/g,'\\$&')+'": '+s.p.replace('$','')+'[,\\s]').test(cp)));
t('el HTML ya no pide número de tarjeta',!/id="pn"|id="pv"|id="pe"/.test(h));
process.exit(ok?0:1);
