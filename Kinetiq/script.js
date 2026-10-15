try { lucide.createIcons(); } catch (e) { console.warn('Iconos no disponibles:', e); }

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Menú móvil */
const btn = document.getElementById('mobile-menu-btn');
const menu = document.getElementById('mobile-menu');
const setMenu = open => {
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
};
btn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

/* Header + barra de progreso */
const header = document.getElementById('header');
const progress = document.getElementById('progress');
const onScroll = () => {
    header.classList.toggle('bg-black/40', window.scrollY > 10);
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* Revelado al hacer scroll */
const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            const el = e.target;
            el.classList.add('in'); io.unobserve(el);
            // Una vez revelado, se libera la clase para que los hover (tarjetas, stats) funcionen con normalidad
            if (el.classList.contains('reveal')) setTimeout(() => el.classList.remove('reveal', 'in'), 1600);
        }
    });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal, .draw-line').forEach(el => io.observe(el));

/* Terminal: las líneas aparecen una a una */
const lines = document.querySelectorAll('.term-line');
lines.forEach((l, i) => setTimeout(() => l.classList.add('on'), reduceMotion ? 0 : 900 + i * 260));

/* Foco de luz en tarjetas */
document.querySelectorAll('.spot').forEach(card => {
    card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
});

/* Inclinación 3D de la terminal (solo con mouse) */
const term = document.getElementById('terminal');
if (!reduceMotion && matchMedia('(hover: hover)').matches) {
    term.addEventListener('pointermove', e => {
        const r = term.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        term.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    });
    term.addEventListener('pointerleave', () => { term.style.transform = ''; });
}

/* Botón principal "magnético" */
const cta = document.getElementById('cta-main');
if (!reduceMotion && matchMedia('(hover: hover)').matches) {
    cta.addEventListener('pointermove', e => {
        const r = cta.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.2;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        cta.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
    });
    cta.addEventListener('pointerleave', () => { cta.style.transform = ''; });
}

/* Contadores */
const counters = document.querySelectorAll('[data-count]');
const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const end = +e.target.dataset.count;
    if (reduceMotion) return;
    const t0 = performance.now();
    const tick = t => {
        const k = Math.min((t - t0) / 1600, 1);
        e.target.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}), { threshold: .6 });
counters.forEach(c => cio.observe(c));

/* Brillo que sigue al cursor */
const glow = document.getElementById('cursor-glow');
if (matchMedia('(hover: hover)').matches && !reduceMotion) {
    addEventListener('pointermove', e => {
        glow.style.opacity = 1;
        glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }, { passive: true });
    document.addEventListener('pointerleave', () => glow.style.opacity = 0);
}

/* Botón flotante */
const fcta = document.getElementById('float-cta');
addEventListener('scroll', () => {
    fcta.classList.toggle('show', scrollY > 700 && (scrollY + innerHeight) < document.documentElement.scrollHeight - 500);
}, { passive: true });

/* Red de partículas */
(() => {
    const cv = document.getElementById('net');
    if (!cv || reduceMotion) return;
    const ctx = cv.getContext('2d');
    let w, h, pts = [], mouse = { x: -999, y: -999 };
    const resize = () => {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        w = cv.clientWidth; h = cv.clientHeight;
        cv.width = w * dpr; cv.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const n = Math.min(70, Math.floor(w * h / 22000));
        pts = Array.from({ length: n }, () => ({
            x: Math.random() * w, y: Math.random() * h,
            vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35
        }));
    };
    resize(); addEventListener('resize', resize);
    addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    const draw = () => {
        ctx.clearRect(0, 0, w, h);
        for (const p of pts) {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
            const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
            if (d < 140) { p.x += dx / d * 1.2; p.y += dy / d * 1.2; }
            ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, 6.283);
            ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
        }
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
            const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
            if (d < 130) {
                ctx.strokeStyle = `rgba(255,255,255,${.18 * (1 - d / 130)})`;
                ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
            }
        }
        requestAnimationFrame(draw);
    };
    draw();
})();

/* Volver arriba */
document.getElementById('to-top').addEventListener('click', () => {
    scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
});