  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    renderVersions();
    buildBars();
    buildMarquee();
    initTheme();
    initRipple();
    initModal();
    lucide.createIcons();
    initScroll();
    initReveal();
    initMobileMenu();
    initRotator();
    initCounters();
    initCardEffects();
    initMagnetic();
    initCursorGlow();
    initPhoneTilt();
    initNotes();
    initSectionSpy();
    document.getElementById('manual-link').href = APK_URL;
  });

  /* ---------- Generadores de barras ---------- */
  function buildBars(){
    const mini = document.getElementById('mini-eq');
    for(let i=0;i<16;i++){ const s=document.createElement('span'); s.style.animationDelay=(-Math.random()*1.2)+'s'; s.style.animationDuration=(.6+Math.random()*.9)+'s'; mini.appendChild(s); }
    const flag = document.getElementById('eq-flagship');
    for(let i=0;i<6;i++){ const s=document.createElement('span'); s.style.animationDelay=(-i*.18)+'s'; flag.appendChild(s); }
    const wave = document.getElementById('wave');
    for(let i=0;i<64;i++){ const s=document.createElement('span'); s.style.animationDelay=(-i*.045)+'s'; s.style.animationDuration=(1.1+Math.random()*1)+'s'; wave.appendChild(s); }
    const sl = document.getElementById('eq-sliders');
    for(let i=0;i<10;i++){ const s=document.createElement('span'); s.style.animationDelay=(-i*.32)+'s'; s.style.animationDuration=(2.6+Math.random()*1.6)+'s'; sl.appendChild(s); }
  }

  function buildMarquee(){
    const items = ['Lossless 32-bit','Dolby Atmos','Ecualizador 10 bandas','Canvas interactivos','Sin publicidad','Bajo consumo','FLAC · WAV · ALAC','Privado por diseño'];
    const html = items.map(t => `<span><i data-lucide="music-2" class="w-5 h-5"></i>${t}</span>`).join('');
    document.getElementById('marquee-track').innerHTML = html + html;
  }

  /* ---------- Scroll: progreso, header, to-top ---------- */
  function initScroll(){
    const bar = document.getElementById('progress');
    const header = document.getElementById('site-header');
    const top = document.getElementById('to-top');
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
      header.classList.toggle('scrolled', scrollY > 12);
      top.classList.toggle('show', scrollY > 700);
    };
    document.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  /* ---------- Reveal ---------- */
  function initReveal(){
    const targets = document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.stagger');
    const io = new IntersectionObserver(es => es.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    }), {threshold:.12, rootMargin:'0px 0px -50px 0px'});
    targets.forEach(t => io.observe(t));
    const steps = document.getElementById('steps');
    if(steps){ const so = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ steps.classList.add('in'); so.disconnect(); }}), {threshold:.4}); so.observe(steps); }
  }

  /* ---------- Menú móvil ---------- */
  function initMobileMenu(){
    const btn = document.getElementById('menu-btn');
    const menu = document.getElementById('mobile-menu');
    const set = open => {
      menu.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
      btn.innerHTML = `<i data-lucide="${open?'x':'menu'}" class="w-5 h-5"></i>`;
      lucide.createIcons();
    };
    btn.addEventListener('click', () => set(!menu.classList.contains('open')));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
  }

  /* ---------- Rotador de palabras ---------- */
  function initRotator(){
    const r = document.getElementById('rotator');
    if(!r || reduceMotion) return;
    const n = r.children.length; let i = 0;
    const widest = () => Math.max(...[...r.children].map(c => { const s=document.createElement('span'); s.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font:inherit'; s.textContent=c.textContent; r.appendChild(s); const w=s.offsetWidth; s.remove(); return w; }));
    r.style.display='inline-block';
    const setW = () => r.style.minWidth = (widest()+4)+'px';
    document.fonts && document.fonts.ready.then(setW); setW();
    setInterval(() => { i = (i+1) % n; [...r.children].forEach(c => c.style.transform = `translateY(-${i*100}%)`); }, 2600);
  }

  /* ---------- Contadores ---------- */
  function initCounters(){
    const els = document.querySelectorAll('[data-count]');
    const io = new IntersectionObserver(es => es.forEach(e => {
      if(!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, dur = 1600, t0 = performance.now();
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(end * eased);
        if(p < 1 && !reduceMotion) requestAnimationFrame(tick); else el.textContent = end;
      };
      requestAnimationFrame(tick); io.unobserve(el);
    }), {threshold:.6});
    els.forEach(el => io.observe(el));
  }

  /* ---------- Cards: spotlight + tilt 3D ---------- */
  function initCardEffects(){
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        if(card.classList.contains('tilt') && !reduceMotion && !isTouch){
          const rx = ((y / r.height) - .5) * -7, ry = ((x / r.width) - .5) * 7;
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
        }
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- Botones magnéticos ---------- */
  function initMagnetic(){
    if(reduceMotion || isTouch) return;
    document.querySelectorAll('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width/2) * .22, y = (e.clientY - r.top - r.height/2) * .3;
        b.style.transform = `translate(${x}px,${y}px)`;
      });
      b.addEventListener('pointerleave', () => b.style.transform = '');
    });
  }

  /* ---------- Resplandor que sigue al cursor ---------- */
  function initCursorGlow(){
    const g = document.getElementById('cursor-glow');
    if(isTouch || reduceMotion) return;
    let tx=0,ty=0,x=0,y=0;
    document.addEventListener('pointermove', e => { tx=e.clientX; ty=e.clientY; g.style.opacity=1; });
    (function loop(){ x+=(tx-x)*.12; y+=(ty-y)*.12; g.style.left=x+'px'; g.style.top=y+'px'; requestAnimationFrame(loop); })();
  }

  /* ---------- Parallax del teléfono ---------- */
  function initPhoneTilt(){
    const stage = document.getElementById('stage');
    const phone = document.getElementById('phone');
    if(!stage || isTouch || reduceMotion) return;
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      const px = (e.clientX - r.left)/r.width - .5, py = (e.clientY - r.top)/r.height - .5;
      stage.querySelectorAll('.chip').forEach((c,i) => c.style.translate = `${px*(24+i*10)}px ${py*(24+i*10)}px`);
      phone.style.translate = `${px*-14}px ${py*-14}px`;
    });
    stage.addEventListener('pointerleave', () => {
      stage.querySelectorAll('.chip').forEach(c => c.style.translate = '');
      phone.style.translate = '';
    });
  }

  /* ---------- Notas musicales flotando ---------- */
  function initNotes(){
    const canvas = document.getElementById('notes-canvas');
    if(!canvas || reduceMotion) return;
    const ctx = canvas.getContext('2d');
    const glyphs = ['♪','♫','♩','♬'];
    let w,h,dpr,notes=[],rgb=cssRGB();
    addEventListener('themechange',()=>{rgb=cssRGB();});
    function resize(){
      dpr = Math.min(devicePixelRatio||1,2); w=innerWidth; h=innerHeight;
      canvas.width=w*dpr; canvas.height=h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      const n = Math.max(10, Math.round(w/70));
      notes = Array.from({length:n}, () => spawn(true));
    }
    function spawn(initial){
      return { x:Math.random()*w, y: initial ? Math.random()*h : h+30, s:14+Math.random()*26, v:.18+Math.random()*.45,
               sway:Math.random()*Math.PI*2, a:.05+Math.random()*.12, g:glyphs[Math.floor(Math.random()*glyphs.length)], rot:(Math.random()-.5)*.6 };
    }
    addEventListener('resize', resize); resize();
    (function loop(){
      if(document.hidden){requestAnimationFrame(loop);return;}
      ctx.clearRect(0,0,w,h);
      notes.forEach((n,i) => {
        n.y -= n.v; n.sway += .012; n.x += Math.sin(n.sway)*.35;
        if(n.y < -40) notes[i] = spawn(false);
        ctx.save(); ctx.translate(n.x,n.y); ctx.rotate(n.rot+Math.sin(n.sway)*.2);
        ctx.font = `${n.s}px serif`; ctx.fillStyle = `rgba(${rgb},${n.a})`; ctx.fillText(n.g,0,0); ctx.restore();
      });
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Sección activa en el menú ---------- */
  function initSectionSpy(){
    const links = [...document.querySelectorAll('header nav .nav-link')];
    const map = links.map(l => [l, document.querySelector(l.getAttribute('href'))]).filter(x => x[1]);
    const io = new IntersectionObserver(es => es.forEach(e => {
      if(e.isIntersecting){ links.forEach(l => l.classList.remove('active')); const f = map.find(m => m[1] === e.target); if(f) f[0].classList.add('active'); }
    }), {rootMargin:'-45% 0px -50% 0px'});
    map.forEach(m => io.observe(m[1]));
  }

  /* ---------- Confeti ---------- */
  function confetti(){
    if(reduceMotion) return;
    const cs = getComputedStyle(document.documentElement);
    const colors = ['--accent','--accent-2','--accent-3','--muted'].map(v => cs.getPropertyValue(v).trim());
    for(let i=0;i<48;i++){
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random()*100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (1.8 + Math.random()*1.6) + 's';
      c.style.animationDelay = (Math.random()*.4) + 's';
      c.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4200);
    }
  }
