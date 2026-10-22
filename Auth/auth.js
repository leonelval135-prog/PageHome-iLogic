/* ============================================================
   e-Onyx · Página de acceso: login, registro, recuperación y reseteo
   ============================================================ */
(function () {
  'use strict';
  const A = window.EonyxAuth;
  const $ = id => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));   // se lee ANTES de que supabase-js lo limpie

  const SERVICE = (qs.get('service') || '').toLowerCase();
  const SVC = A && A.CFG.SERVICES ? A.CFG.SERVICES[SERVICE] : null;
  const NEXT = qs.get('next') || '';
  const WAS_RECOVERY = hashParams.get('type') === 'recovery';
  const HASH_ERROR = hashParams.get('error_description') || (hashParams.get('error') ? 'El enlace no es válido.' : '');

  const EYE = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  const ICON_MAIL = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
  const ICON_OK = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  if (!A) { document.body.innerHTML = '<p style="margin:auto;padding:24px;text-align:center">No se pudo cargar el sistema de acceso. Revisa tu conexión y recarga la página.</p>'; return; }

  /* ---------- Marca según el servicio de origen ---------- */
  if (SVC) {
    document.documentElement.style.setProperty('--accent', SVC.accent);
    const base = A.ROOT + 'assets/logos/' + SVC.name + '/';
    $('brandLogo').src = base + 'imagotipo-oscuro.png'; $('brandLogo').alt = SVC.name;
    $('favicon').href = base + 'icon-64.png';
    $('brandSub').textContent = 'Inicia sesión para usar ' + SVC.name;
    document.title = 'Acceso a ' + SVC.name + ' | e-Onyx Technologies';
  }

  /* ---------- Utilidades UI ---------- */
  const views = [...document.querySelectorAll('[data-view]')];
  let currentView = 'login';
  function show(view) {
    currentView = view;
    views.forEach(v => { v.hidden = v.dataset.view !== view; });
    const isAuth = view === 'login' || view === 'register';
    $('tabs').hidden = !isAuth;
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.go === view)));
    clearAlert();
    const first = document.querySelector(`[data-view="${view}"] input:not([type=hidden]):not([type=file])`);
    if (first && !matchMedia('(pointer:coarse)').matches) setTimeout(() => first.focus(), 30);
  }
  function setAlert(kind, text, extra) {
    const el = $('alert'); el.className = 'alert ' + kind; el.textContent = text; el.hidden = false;
    if (extra) el.appendChild(extra);
  }
  function clearAlert() { $('alert').hidden = true; $('alert').textContent = ''; }
  function setHint(el, kind, text) { el.className = 'hint' + (kind ? ' ' + kind : ''); el.textContent = text || ''; }
  function busy(btn, on) { btn.classList.toggle('busy', on); btn.disabled = on; }
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  function inputState(input, state) { input.classList.remove('ok', 'bad', 'warn'); if (state) input.classList.add(state); }

  document.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); const v = go.dataset.go; if (v === 'forgot') $('fgEmail').value = $('liEmail').value; show(v); }
    const eye = e.target.closest('[data-eye]');
    if (eye) {
      const inp = $(eye.dataset.eye); const hide = inp.type === 'text';
      inp.type = hide ? 'password' : 'text';
      eye.innerHTML = hide ? EYE : EYE_OFF; eye.setAttribute('aria-label', hide ? 'Mostrar contraseña' : 'Ocultar contraseña');
    }
  });
  document.querySelectorAll('.eye').forEach(b => { b.innerHTML = EYE; });

  function goNext() { location.replace(A.safeNext(NEXT, SERVICE)); }
  const serviceLabel = () => (SVC ? SVC.name : 'e-Onyx');

  function showNotice({ icon, ok, title, text, primary, secondary }) {
    $('noticeIcon').className = 'icon' + (ok ? ' ok' : ''); $('noticeIcon').innerHTML = icon || ICON_MAIL;
    $('noticeTitle').textContent = title; $('noticeText').textContent = text;
    const p = $('noticePrimary'), s = $('noticeSecondary');
    p.hidden = !primary; s.hidden = !secondary;
    if (primary) { p.querySelector('.lbl').textContent = primary.label; p.onclick = primary.onClick; p.disabled = false; }
    if (secondary) { s.textContent = secondary.label; s.onclick = secondary.onClick; s.disabled = false; }
    show('notice');
  }

  /* ============================================================
     MEDIDOR DE CONTRASEÑA (registro y reseteo comparten lógica)
     ============================================================ */
  function bindMeter({ input, meter, label, list, ctx }) {
    const bars = $(meter), lab = $(label), ul = $(list);
    ul.innerHTML = A.passwordReport('', {}).checks.map(c => `<li data-id="${c.id}">${c.label}</li>`).join('');
    bars.hidden = true;
    return function update() {
      const r = A.passwordReport($(input).value, ctx());
      bars.hidden = !$(input).value;
      bars.dataset.s = String(r.score); lab.textContent = r.label;
      lab.style.color = ['#f87171', '#f87171', '#fbbf24', '#a3e635', '#4ade80'][r.score];
      r.checks.forEach(c => ul.querySelector(`[data-id="${c.id}"]`).classList.toggle('ok', c.ok));
      inputState($(input), !$(input).value ? '' : r.ok ? 'ok' : 'bad');
      return r;
    };
  }
  function bindMatch(a, b, msg) {
    return function update() {
      const pa = $(a).value, pb = $(b).value;
      if (!pb) { setHint($(msg), '', ''); inputState($(b), ''); return false; }
      const same = pa === pb;
      setHint($(msg), same ? 'ok' : 'err', same ? 'Las contraseñas coinciden.' : 'Las contraseñas no coinciden.');
      inputState($(b), same ? 'ok' : 'bad');
      return same;
    };
  }
  async function pwnedBlock(pw, msgEl) {
    setHint(msgEl, '', 'Comprobando si la contraseña apareció en filtraciones…');
    const n = await A.checkPwned(pw);
    if (n && n > 0) { setHint(msgEl, 'err', `Esta contraseña apareció en ${n.toLocaleString('es')} filtraciones de datos. Elige otra distinta.`); return true; }
    setHint(msgEl, n === 0 ? 'ok' : '', n === 0 ? 'No aparece en filtraciones conocidas.' : '');
    return false;
  }

  /* ============================================================
     LOGIN
     ============================================================ */
  let fails = 0, lockUntil = 0;
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault(); clearAlert();
    const btn = e.submitter || e.target.querySelector('.primary');
    const email = $('liEmail').value.trim(), pass = $('liPass').value;
    if (Date.now() < lockUntil) return setAlert('err', `Demasiados intentos fallidos. Espera ${Math.ceil((lockUntil - Date.now()) / 1000)} s.`);
    if (!email || !pass) return setAlert('err', 'Escribe tu correo y tu contraseña.');
    const syn = A.checkSyntax(email);
    if (!syn.ok) return setAlert('err', syn.message);
    busy(btn, true);
    try {
      await A.signIn(email, pass);
      fails = 0; goNext();
    } catch (err) {
      const f = A.friendlyError(err);
      if (f.code === 'bad_credentials' && ++fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; }
      if (f.code === 'unconfirmed') {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'link'; b.textContent = 'Reenviar correo de confirmación';
        b.onclick = async () => { b.disabled = true; try { await A.resendConfirmation(email, SERVICE); setAlert('ok', 'Te enviamos un nuevo correo de confirmación.'); } catch (e2) { setAlert('err', A.friendlyError(e2).text); } };
        setAlert('err', f.text, b);
      } else setAlert('err', f.text);
      busy(btn, false);
    }
  });

  /* ============================================================
     REGISTRO
     ============================================================ */
  let avatar = null;            // {blob, dataUrl}
  let emailResult = null;       // último resultado de validateEmail
  let emailSeq = 0;
  const regCtx = () => ({ name: $('rgName').value, email: $('rgEmail').value });
  const updPw = bindMeter({ input: 'rgPass', meter: 'rgMeter', label: 'rgMeterLabel', list: 'rgChecks', ctx: regCtx });
  const updMatch = bindMatch('rgPass', 'rgPass2', 'matchMsg');

  $('avatarBtn').onclick = () => $('avatarFile').click();
  $('avatarRemove').onclick = () => { avatar = null; $('avatarImg').hidden = true; $('avatarPh').style.display = ''; $('avatarBtn').classList.remove('has'); $('avatarRemove').hidden = true; setHint($('avatarMsg'), '', ''); refreshRegister(); };
  $('avatarFile').onchange = async () => {
    const f = $('avatarFile').files[0]; $('avatarFile').value = '';
    if (!f) return;
    try {
      avatar = await A.processAvatar(f);
      $('avatarImg').src = avatar.dataUrl; $('avatarImg').hidden = false; $('avatarPh').style.display = 'none';
      $('avatarBtn').classList.add('has'); $('avatarRemove').hidden = false;
      setHint($('avatarMsg'), 'ok', 'Foto lista.');
    } catch (err) { avatar = null; setHint($('avatarMsg'), 'err', err.message || 'No se pudo usar esa imagen.'); }
    refreshRegister();
  };

  const nameOk = () => { const n = $('rgName').value.trim(); return n.length >= 2 && n.length <= 60 && /\p{L}/u.test(n) && !/[<>]/.test(n); };
  $('rgName').addEventListener('input', () => {
    const n = $('rgName').value.trim();
    if (!n) { setHint($('nameMsg'), '', ''); inputState($('rgName'), ''); }
    else if (!nameOk()) { setHint($('nameMsg'), 'err', 'Escribe un nombre válido (mínimo 2 letras).'); inputState($('rgName'), 'bad'); }
    else { setHint($('nameMsg'), '', ''); inputState($('rgName'), 'ok'); }
    updPw(); refreshRegister();
  });

  const checkEmail = debounce(async () => {
    const seq = ++emailSeq, v = $('rgEmail').value;
    if (!v.trim()) { emailResult = null; setHint($('emailMsg'), '', ''); inputState($('rgEmail'), ''); return refreshRegister(); }
    setHint($('emailMsg'), '', 'Comprobando correo…');
    const r = await A.validateEmail(v);
    if (seq !== emailSeq) return;            // llegó una respuesta vieja
    emailResult = r;
    setHint($('emailMsg'), r.level === 'ok' ? 'ok' : r.level === 'warn' ? 'warn' : 'err', r.message);
    if (r.suggestion) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'link'; b.textContent = 'Usar ' + r.suggestion;
      b.onclick = () => { $('rgEmail').value = r.suggestion; checkEmail(); updPw(); };
      $('emailMsg').appendChild(b);
    }
    inputState($('rgEmail'), r.level === 'ok' ? 'ok' : r.level === 'warn' ? 'warn' : 'bad');
    updPw(); refreshRegister();
  }, 450);
  $('rgEmail').addEventListener('input', () => { emailResult = null; checkEmail(); });
  $('rgPass').addEventListener('input', () => { updPw(); updMatch(); setHint($('pwnedMsg'), '', ''); refreshRegister(); });
  $('rgPass2').addEventListener('input', () => { updMatch(); refreshRegister(); });

  function registerState() {
    const pr = A.passwordReport($('rgPass').value, regCtx());
    return {
      avatar: !!avatar, name: nameOk(), email: !!(emailResult && emailResult.ok),
      pass: pr.ok, match: $('rgPass').value !== '' && $('rgPass').value === $('rgPass2').value
    };
  }
  function refreshRegister() { const s = registerState(); $('regSubmit').disabled = !Object.values(s).every(Boolean); }
  refreshRegister();

  $('regForm').addEventListener('submit', async e => {
    e.preventDefault(); clearAlert();
    const btn = $('regSubmit');
    // 1) correo: validación completa (con DNS) por si el usuario envió antes del debounce
    busy(btn, true);
    const er = await A.validateEmail($('rgEmail').value);
    emailResult = er;
    setHint($('emailMsg'), er.level === 'ok' ? 'ok' : er.level === 'warn' ? 'warn' : 'err', er.message);
    const s = registerState();
    if (!avatar) { setHint($('avatarMsg'), 'err', 'Agrega una foto de perfil para continuar.'); }
    if (!s.name) setHint($('nameMsg'), 'err', 'Escribe tu nombre.');
    if (!s.pass) setAlert('err', 'Tu contraseña aún no cumple todos los requisitos de seguridad.');
    else if (!s.match) setAlert('err', 'Las contraseñas no coinciden.');
    if (!(s.avatar && s.name && s.email && s.pass && s.match)) { busy(btn, false); refreshRegister(); return; }
    // 2) la contraseña no debe estar en filtraciones públicas
    if (await pwnedBlock($('rgPass').value, $('pwnedMsg'))) { busy(btn, false); refreshRegister(); return; }
    // 3) alta
    try {
      const email = er.email || $('rgEmail').value.trim().toLowerCase();
      const res = await A.signUp({ name: $('rgName').value, email, password: $('rgPass').value, avatar, service: SERVICE });
      if (res.needsConfirm) {
        showNotice({
          icon: ICON_MAIL, title: 'Confirma tu correo',
          text: `Enviamos un enlace de confirmación a ${email}. Ábrelo para activar tu cuenta (revisa también la carpeta de spam).`,
          primary: { label: 'Ya confirmé, iniciar sesión', onClick: () => { $('liEmail').value = email; show('login'); } },
          secondary: { label: 'Reenviar correo', onClick: async function () { this.disabled = true; try { await A.resendConfirmation(email, SERVICE); this.textContent = 'Correo reenviado ✓'; } catch (e2) { this.disabled = false; setAlert('err', A.friendlyError(e2).text); } } }
        });
      } else goNext();
    } catch (err) {
      const f = A.friendlyError(err);
      show('register'); setAlert('err', f.text);
    }
    busy(btn, false); refreshRegister();
  });

  /* ============================================================
     RECUPERAR CONTRASEÑA
     ============================================================ */
  let resetCooldown = 0;
  $('forgotForm').addEventListener('submit', async e => {
    e.preventDefault(); clearAlert();
    const btn = e.submitter || e.target.querySelector('.primary');
    const syn = A.checkSyntax($('fgEmail').value);
    if (!syn.ok) return setHint($('fgMsg'), 'err', syn.message);
    if (Date.now() < resetCooldown) return setHint($('fgMsg'), 'err', `Espera ${Math.ceil((resetCooldown - Date.now()) / 1000)} s antes de pedir otro enlace.`);
    setHint($('fgMsg'), '', '');
    busy(btn, true);
    try {
      await A.sendReset(syn.email);
      resetCooldown = Date.now() + 60000;
      // Mensaje genérico: no revela si el correo tiene cuenta o no
      showNotice({
        icon: ICON_MAIL, title: 'Revisa tu correo',
        text: `Si existe una cuenta con ${syn.email}, te enviamos un enlace para crear una contraseña nueva. Puede tardar un par de minutos.`,
        primary: { label: 'Volver a iniciar sesión', onClick: () => show('login') }
      });
    } catch (err) { setHint($('fgMsg'), 'err', A.friendlyError(err).text); }
    busy(btn, false);
  });

  /* ============================================================
     NUEVA CONTRASEÑA (llegas aquí desde el enlace del correo)
     ============================================================ */
  let resetCtx = { name: '', email: '' };
  const updRsPw = bindMeter({ input: 'rsPass', meter: 'rsMeter', label: 'rsMeterLabel', list: 'rsChecks', ctx: () => resetCtx });
  const updRsMatch = bindMatch('rsPass', 'rsPass2', 'rsMatch');
  const refreshReset = () => { $('rsSubmit').disabled = !(A.passwordReport($('rsPass').value, resetCtx).ok && $('rsPass').value === $('rsPass2').value); };
  $('rsPass').addEventListener('input', () => { updRsPw(); updRsMatch(); setHint($('rsPwned'), '', ''); refreshReset(); });
  $('rsPass2').addEventListener('input', () => { updRsMatch(); refreshReset(); });
  refreshReset();

  $('resetForm').addEventListener('submit', async e => {
    e.preventDefault(); clearAlert();
    const btn = $('rsSubmit'); busy(btn, true);
    if (await pwnedBlock($('rsPass').value, $('rsPwned'))) { busy(btn, false); refreshReset(); return; }
    try {
      await A.updatePassword($('rsPass').value);
      showNotice({
        ok: true, icon: ICON_OK, title: 'Contraseña actualizada',
        text: 'Tu contraseña se cambió correctamente. Ya puedes seguir usando ' + serviceLabel() + '.',
        primary: { label: 'Continuar', onClick: goNext }
      });
      history.replaceState(null, '', location.pathname + (SERVICE ? '?service=' + encodeURIComponent(SERVICE) : ''));
    } catch (err) { setAlert('err', A.friendlyError(err).text); }
    busy(btn, false); refreshReset();
  });

  /* ============================================================
     SESIÓN ACTIVA
     ============================================================ */
  function showSession(session) {
    const u = session.user, meta = u.user_metadata || {};
    const name = meta.full_name || (u.email || '').split('@')[0];
    $('sessName').textContent = name; $('sessEmail').textContent = u.email;
    const img = $('sessAvatar'), ini = $('sessInitials');
    ini.textContent = (name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('') || '?').toUpperCase();
    if (meta.avatar_url) { img.src = meta.avatar_url; img.hidden = false; ini.hidden = true; img.onerror = () => { img.hidden = true; ini.hidden = false; }; }
    $('sessContinue').querySelector('.lbl').textContent = 'Continuar a ' + serviceLabel();
    $('sessContinue').onclick = goNext;
    $('sessSwitch').onclick = async () => { try { await A.signOut(); } catch (e) { /* ignorado */ } show('login'); };
    show('session');
    if (qs.get('confirmed') === '1') setAlert('ok', '¡Correo confirmado! Tu cuenta ya está activa.');
  }

  /* ============================================================
     ARRANQUE
     ============================================================ */
  async function start() {
    const sb = A.client();
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) { resetCtx = { name: (session.user.user_metadata || {}).full_name || '', email: session.user.email || '' }; show('reset'); }
      if (event === 'SIGNED_IN' && session) setTimeout(() => A.finalizeProfile(session.user), 0);
    });

    if (HASH_ERROR) {
      show('forgot');
      const expired = /expired|invalid/i.test(HASH_ERROR) || /otp_expired/.test(hashParams.get('error_code') || '');
      setAlert('err', expired ? 'El enlace expiró o ya fue usado. Solicita uno nuevo.' : 'No se pudo completar la acción: ' + HASH_ERROR);
      history.replaceState(null, '', location.pathname + location.search);
      return;
    }

    let session = null;
    try { session = await A.getSession(); } catch (e) { setAlert('err', A.friendlyError(e).text); }

    if (WAS_RECOVERY || qs.get('mode') === 'reset') {
      if (session) { resetCtx = { name: (session.user.user_metadata || {}).full_name || '', email: session.user.email || '' }; show('reset'); }
      else { show('forgot'); setAlert('err', 'El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.'); }
      return;
    }
    if (session) { showSession(session); return; }
    show(qs.get('view') === 'register' ? 'register' : 'login');
    if (qs.get('confirmed') === '1') setAlert('ok', '¡Correo confirmado! Ya puedes iniciar sesión.');
    else if (SVC && NEXT) setAlert('info', 'Necesitas una cuenta para usar ' + SVC.name + '. Es gratis y toma un minuto.');
  }
  start();
})();
