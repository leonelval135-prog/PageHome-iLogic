/* ============================================================
   e-Onyx · Guard de sesión para los servicios
   Uso (en el <head>, lo antes posible):
     <script src="../assets/auth/guard.js" data-service="vitaris"></script>
   data-required="false" → modo opcional (Home): muestra el botón/chip pero no bloquea.

   AVISO: en un sitio estático (GitHub Pages) esta protección es de
   front-end: impide el uso normal sin cuenta, pero el HTML sigue siendo
   público. No guardes datos privados dentro de estas páginas.
   ============================================================ */
(function () {
  'use strict';
  var me = document.currentScript;
  if (!me) return;
  var service = me.getAttribute('data-service') || '';
  var required = me.getAttribute('data-required') !== 'false';
  var BASE = new URL('./', me.src).href;
  var ROOT = new URL('../../', me.src).href;
  var AUTH_URL = ROOT + 'Auth/index.html';
  var root = document.documentElement;

  if (required) root.style.visibility = 'hidden';

  var leaving = false;
  function goLogin() {
    if (leaving) return; leaving = true;
    var url = AUTH_URL + '?service=' + encodeURIComponent(service) + '&next=' + encodeURIComponent(location.href);
    location.replace(url);
  }

  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = res; s.onerror = function () { rej(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }

  function fail(err) {
    console.error('[e-Onyx guard]', err);
    root.style.visibility = 'visible';
    var d = document.createElement('div');
    d.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;background:#050505;color:#fff;display:grid;place-items:center;padding:24px;font:15px/1.5 system-ui,sans-serif;text-align:center');
    d.innerHTML = '<div style="max-width:380px"><h1 style="font-size:20px;margin:0 0 8px">No se pudo verificar tu sesión</h1>' +
      '<p style="color:#9ca3af;margin:0 0 20px">Revisa tu conexión a internet y vuelve a intentarlo.</p>' +
      '<button id="eo-retry" style="background:#fff;color:#000;border:0;border-radius:10px;padding:10px 18px;font-weight:600;cursor:pointer">Reintentar</button> ' +
      '<a href="' + ROOT + 'Home/index.html" style="color:#9ca3af;margin-left:12px">Ir al inicio</a></div>';
    (document.body || root).appendChild(d);
    d.querySelector('#eo-retry').onclick = function () { location.reload(); };
  }

  /* ---------- Chip de usuario (Shadow DOM: no hereda ni rompe los estilos de la página) ---------- */
  var CHIP_CSS = ':host{all:initial}*{box-sizing:border-box;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}' +
    '.wrap{position:fixed;left:16px;bottom:16px;z-index:2147483000;color:#fff}' +
    '.btn{display:flex;align-items:center;gap:8px;max-width:210px;padding:5px 12px 5px 5px;border-radius:999px;background:rgba(12,12,14,.88);border:1px solid rgba(255,255,255,.16);color:#fff;font-size:13px;font-weight:600;cursor:pointer;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 8px 28px rgba(0,0,0,.45)}' +
    '.btn:hover{border-color:rgba(255,255,255,.35)}.btn:focus-visible,.item:focus-visible{outline:2px solid #fff;outline-offset:2px}' +
    '.av{width:28px;height:28px;border-radius:50%;object-fit:cover;flex:none;display:grid;place-items:center;font-size:12px;font-weight:700;color:#fff;background:var(--acc,#6366f1)}' +
    '.nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.menu{position:absolute;left:0;bottom:calc(100% + 8px);min-width:240px;padding:8px;border-radius:16px;background:rgba(14,14,17,.97);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 50px rgba(0,0,0,.6);display:none}' +
    '.wrap.open .menu{display:block}' +
    '.who{padding:8px 10px 10px;border-bottom:1px solid rgba(255,255,255,.1);margin-bottom:6px}.who b{display:block;font-size:14px}.who small{display:block;color:#9ca3af;font-size:12px;overflow:hidden;text-overflow:ellipsis}' +
    '.item{display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;border:0;border-radius:10px;background:none;color:#e5e7eb;font-size:13px;text-align:left;cursor:pointer;text-decoration:none}' +
    '.item:hover{background:rgba(255,255,255,.08)}.item.out{color:#fca5a5}' +
    '.msg{padding:6px 10px;font-size:12px;color:#fca5a5;display:none}.login{padding:9px 16px;padding-left:16px}';

  function initials(name, email) {
    var t = (name || email || '?').trim().split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0); }).join('');
    return (t || '?').toUpperCase();
  }

  function mountChip(A, session) {
    var svc = (A.CFG.SERVICES || {})[service];
    var accent = svc ? svc.accent : '#6366f1';
    var host = document.createElement('div');
    host.id = 'eonyx-user-chip';
    var sh = host.attachShadow({ mode: 'open' });
    var st = document.createElement('style'); st.textContent = CHIP_CSS; sh.appendChild(st);
    var wrap = document.createElement('div'); wrap.className = 'wrap'; wrap.style.setProperty('--acc', accent);
    sh.appendChild(wrap);

    if (!session) { // modo opcional sin sesión
      var a = document.createElement('a');
      a.className = 'btn login'; a.textContent = 'Iniciar sesión';
      a.href = AUTH_URL + '?service=' + encodeURIComponent(service) + '&next=' + encodeURIComponent(location.href);
      a.style.textDecoration = 'none';
      wrap.appendChild(a);
      document.body.appendChild(host);
      return;
    }

    var u = session.user, meta = u.user_metadata || {};
    var name = meta.full_name || (u.email || '').split('@')[0];

    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn'; btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false');
    var av = document.createElement(meta.avatar_url ? 'img' : 'span'); av.className = 'av';
    if (meta.avatar_url) { av.src = meta.avatar_url; av.alt = ''; av.onerror = function () { var s = document.createElement('span'); s.className = 'av'; s.textContent = initials(name, u.email); av.replaceWith(s); av = s; }; }
    else av.textContent = initials(name, u.email);
    var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = name;
    btn.append(av, nm);

    var menu = document.createElement('div'); menu.className = 'menu'; menu.setAttribute('role', 'menu');
    var who = document.createElement('div'); who.className = 'who';
    var b = document.createElement('b'); b.textContent = name; var sm = document.createElement('small'); sm.textContent = u.email;
    who.append(b, sm);
    var home = document.createElement('a'); home.className = 'item'; home.setAttribute('role', 'menuitem'); home.href = A.HOME_URL; home.textContent = 'Todos los servicios';
    var photo = document.createElement('button'); photo.type = 'button'; photo.className = 'item'; photo.setAttribute('role', 'menuitem'); photo.textContent = 'Cambiar foto de perfil';
    var file = document.createElement('input'); file.type = 'file'; file.accept = 'image/jpeg,image/png,image/webp'; file.hidden = true;
    var msg = document.createElement('div'); msg.className = 'msg';
    var out = document.createElement('button'); out.type = 'button'; out.className = 'item out'; out.setAttribute('role', 'menuitem'); out.textContent = 'Cerrar sesión';
    menu.append(who, home, photo, file, msg, out);
    wrap.append(btn, menu);
    document.body.appendChild(host);

    function setOpen(v) { wrap.classList.toggle('open', v); btn.setAttribute('aria-expanded', String(v)); }
    btn.onclick = function (e) { e.stopPropagation(); setOpen(!wrap.classList.contains('open')); };
    document.addEventListener('click', function (e) { if (!host.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

    photo.onclick = function () { file.click(); };
    file.onchange = function () {
      var f = file.files && file.files[0]; if (!f) return;
      msg.style.display = 'block'; msg.style.color = '#9ca3af'; msg.textContent = 'Subiendo foto…';
      A.processAvatar(f).then(function (r) { return A.uploadAvatar(r.blob); }).then(function (url) {
        var img = document.createElement('img'); img.className = 'av'; img.src = url; img.alt = '';
        av.replaceWith(img); av = img; msg.style.display = 'none';
      }).catch(function (err) {
        msg.style.color = '#fca5a5'; msg.style.display = 'block';
        msg.textContent = (err && err.message && !err.status) ? err.message : A.friendlyError(err).text;
      });
      file.value = '';
    };
    out.onclick = function () { out.disabled = true; A.signOut().catch(function () {}).then(goLogin); };
  }

  /* ---------- Flujo principal ---------- */
  function boot() {
    var cfgSrc = BASE + 'config.js';
    return load(cfgSrc).then(function () {
      var C = window.EONYX_AUTH;
      // Atajo sin red: si nunca se ha iniciado sesión aquí, redirige de inmediato
      var hasToken = false;
      try { hasToken = !!localStorage.getItem('eonyx-auth'); } catch (e) { hasToken = true; }
      if (required && !hasToken) { goLogin(); return new Promise(function () {}); }
      return load(C.SUPABASE_JS).then(function () { return load(BASE + 'auth-core.js'); });
    }).then(function () {
      var A = window.EonyxAuth;
      return A.getSession().then(function (session) {
        if (required && !session) { goLogin(); return; }
        root.style.visibility = 'visible';
        A.client().auth.onAuthStateChange(function (event) {
          if (event === 'SIGNED_OUT' && required) goLogin();
        });
        var ready = function () { mountChip(A, session); if (session) A.finalizeProfile(session.user); };
        if (document.body) ready(); else document.addEventListener('DOMContentLoaded', ready);
      });
    });
  }

  boot().catch(fail);
})();
