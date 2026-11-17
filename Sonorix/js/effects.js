/* Sonorix · js/effects.js
   Efectos: notas flotantes, marquesina, foco del cursor, contador de precios,
   botón de subir y bloqueo del scroll con diálogos abiertos. */
(function () {
  var rm = matchMedia('(prefers-reduced-motion:reduce)').matches;

  Array.prototype.forEach.call(document.querySelectorAll('.feat > div'), function (c, i) { c.style.setProperty('--i', i); });

  document.querySelectorAll('.plan,.feat>div,.steps>div').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  if (!rm) {
    var h = document.querySelector('.hero');
    for (var i = 0; i < 9; i++) {
      var n = document.createElement('i');
      n.className = 'nt'; n.setAttribute('aria-hidden', 'true');
      n.textContent = i % 2 ? '\u266a' : '\u266b';
      n.style.cssText = 'left:' + (5 + i * 11) + '%;font-size:' + (16 + i % 3 * 8) + 'px;animation-duration:' + (9 + i % 4 * 3) + 's;animation-delay:' + (-i * 1.7) + 's';
      h.appendChild(n);
    }
    var cnt = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (!x.isIntersecting) return;
        cnt.unobserve(x.target);
        var t = x.target.firstChild, m = /\$(\d+)/.exec(t.nodeValue);
        if (!m) return;
        var to = +m[1], s = performance.now();
        (function f(now) {
          var p = Math.min((now - s) / 900, 1);
          t.nodeValue = '$' + Math.round(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(f);
        })(s);
      });
    }, { threshold: .6 });
    document.querySelectorAll('.pr').forEach(function (p) { cnt.observe(p); });
  }

  var mq = document.createElement('div');
  mq.className = 'mq'; mq.setAttribute('aria-hidden', 'true');
  var row = ['Letras sincronizadas', 'Sono3D', 'Automix', 'SonParty', 'Karaoke', 'SonoAI', 'Comunidad', 'Descargas offline'].map(function (t) { return '<span>' + t + '</span>'; }).join('');
  mq.innerHTML = '<div class="mt">' + row + row + '</div>';
  document.querySelector('.strip').after(mq);

  var up = document.createElement('button');
  up.className = 'up'; up.setAttribute('aria-label', 'Volver arriba'); up.textContent = '\u2191';
  up.onclick = function () { scrollTo({ top: 0, behavior: 'smooth' }); };
  document.body.appendChild(up);
  addEventListener('scroll', function () { up.classList.toggle('on', scrollY > 700); }, { passive: true });

  new MutationObserver(function () {
    document.body.classList.toggle('lock', !!document.querySelector('.ov.on'));
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
})();
