// Pruebas: node tests/check.js
const fs=require('fs'),vm=require('vm');let ok=1;const t=(n,c)=>{console.log((c?'OK   ':'FAIL ')+n);if(!c)ok=0};
const w={};vm.runInNewContext(fs.readFileSync('js/config.js','utf8'),{window:w});const C=w.AMB;
['js/app.js','js/extra.js'].forEach(f=>new vm.Script(fs.readFileSync(f,'utf8')));t('app.js sintaxis válida',1);
t('WhatsApp 525616773834',C.whatsapp==='525616773834');t('10 servicios',C.servicios.length===10);t('fade $150',C.servicios[0].p==='$150');
const h=fs.readFileSync('index.html','utf8');['css/styles.css','js/config.js','js/app.js','js/extra.js','assets/logo.jpg','assets/logo.svg'].forEach(f=>t('existe y enlazado '+f,fs.existsSync(f)&&h.includes(f)));
['nosotros','servicios','galeria','productos','lealtad','faq','contacto','svc','sel','gal','fl','prd','fq','lbc','consent','cita','rlist','rform','stars','th','citas','clist','l3d','prog'].forEach(a=>t('id '+a,h.includes('id="'+a+'"')));
['robots.txt','sitemap.xml','404.html'].forEach(f=>t('existe '+f,fs.existsSync(f)));(fs.readFileSync('js/config.js','utf8').match(/assets\/[\w\/.-]+/g)||[]).forEach(f=>t('imagen existe '+f,fs.existsSync(f)));
process.exit(ok?0:1);
