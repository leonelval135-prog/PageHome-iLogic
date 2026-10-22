/* ============================================================
   e-Onyx · Núcleo de autenticación compartido
   Requiere: config.js y la librería supabase-js (UMD) cargadas antes.
   Expone: window.EonyxAuth
   ============================================================ */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api; // pruebas en Node
  else root.EonyxAuth = api;
})(typeof window !== 'undefined' ? window : globalThis, function (w) {
  'use strict';

  const CFG = w.EONYX_AUTH || {};
  const SCRIPT_SRC = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';

  /* ---------- Rutas (funcionan en github.io/<repo>/ y en dominio propio) ---------- */
  const ROOT = SCRIPT_SRC ? new URL('../../', SCRIPT_SRC).href : '/';
  const AUTH_URL = ROOT + 'Auth/index.html';
  const HOME_URL = ROOT + 'Home/index.html';

  /* ============================================================
     VALIDACIÓN DE CORREO
     1) sintaxis estricta  2) errores de tipeo  3) dominios desechables
     4) el dominio debe existir y recibir correo (DNS-over-HTTPS)
     ============================================================ */
  const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

  const POPULAR = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com', 'proton.me', 'protonmail.com', 'yahoo.com.mx', 'hotmail.es', 'outlook.es'];
  const TYPOS = {
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmal.com': 'gmail.com',
    'gmail.co': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
    'hotmail.con': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'outlook.con': 'outlook.com',
    'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com', 'live.con': 'live.com'
  };
  const DISPOSABLE = new Set(['mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz', 'guerrillamail.de', 'guerrillamailblock.com',
    'sharklasers.com', 'grr.la', 'spam4.me', '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'tempr.email',
    'tempail.com', 'tempinbox.com', 'throwawaymail.com', 'yopmail.com', 'yopmail.net', 'yopmail.fr', 'trashmail.com', 'trashmail.net', 'getnada.com', 'nada.email',
    'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'fakemail.net', 'emailfake.com', 'mintemail.com', 'spamgourmet.com', 'mailnesia.com', 'emailondeck.com',
    'mohmal.com', 'burnermail.io', 'discard.email', 'moakt.com', 'tmpmail.org', 'tmpmail.net', 'mytemp.email', 'inboxkitten.com', 'anonbox.net', 'mailcatch.com',
    'dropmail.me', '1secmail.com', '1secmail.net', '1secmail.org', 'byom.de', 'mail.tm', 'mailtemp.info', 'tempm.com', 'minuteinbox.com', 'luxusmail.org']);

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 3;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }

  /** Errores de tipeo conocidos (bloquean) */
  const exactTypo = domain => TYPOS[domain] || null;
  /** Dominios parecidos a uno popular (solo avisan, el dominio podría ser real) */
  function fuzzySuggest(domain) {
    if (POPULAR.includes(domain) || TYPOS[domain]) return null;
    let best = null, bestD = 2;
    for (const p of POPULAR) { const d = levenshtein(domain, p); if (d < bestD) { bestD = d; best = p; } }
    return best;
  }

  function checkSyntax(raw) {
    const email = String(raw || '').trim().toLowerCase();
    if (!email) return { ok: false, message: 'Escribe tu correo electrónico.', empty: true };
    if (email.length > 254) return { ok: false, message: 'El correo es demasiado largo.' };
    if (!email.includes('@')) return { ok: false, message: 'Falta el símbolo @ en el correo.' };
    const [local, domain] = [email.slice(0, email.lastIndexOf('@')), email.slice(email.lastIndexOf('@') + 1)];
    if (!local || !domain) return { ok: false, message: 'El correo está incompleto.' };
    if (local.length > 64) return { ok: false, message: 'La parte anterior a @ es demasiado larga.' };
    if (/\.\./.test(email) || local.startsWith('.') || local.endsWith('.')) return { ok: false, message: 'El correo tiene puntos mal colocados.' };
    if (!domain.includes('.')) return { ok: false, message: 'Al dominio le falta la extensión (por ejemplo .com).' };
    if (!EMAIL_RE.test(email)) return { ok: false, message: 'Ese correo no tiene un formato válido.' };
    const tld = domain.split('.').pop();
    if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(tld)) return { ok: false, message: 'La extensión del dominio no es válida.' };
    return { ok: true, email, local, domain };
  }

  async function fetchJSON(url, ms) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), ms || 4500) : null;
    try {
      const r = await fetch(url, { headers: { accept: 'application/dns-json' }, signal: ctrl && ctrl.signal });
      if (!r.ok) throw new Error('http ' + r.status);
      return await r.json();
    } finally { if (t) clearTimeout(t); }
  }

  const dnsCache = new Map();
  /** 'mx' | 'a' | 'nx' | 'nomail' | 'unknown' */
  async function domainMailStatus(domain) {
    if (dnsCache.has(domain)) return dnsCache.get(domain);
    const providers = [
      q => `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${q}`,
      q => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${q}`
    ];
    let result = 'unknown';
    for (const p of providers) {
      try {
        const mx = await fetchJSON(p('MX'));
        if (mx.Status === 3) { result = 'nx'; break; }
        const recs = (mx.Answer || []).filter(a => a.type === 15);
        if (recs.length) {
          const real = recs.filter(a => !/^\s*0\s+\.?\s*$/.test(a.data || ''));
          result = real.length ? 'mx' : 'nomail'; // "0 ." = el dominio declara que NO recibe correo
          break;
        }
        const a = await fetchJSON(p('A'));
        result = (a.Answer || []).some(r => r.type === 1) ? 'a' : 'nomail';
        break;
      } catch (e) { /* probar el siguiente proveedor */ }
    }
    if (result !== 'unknown') dnsCache.set(domain, result);
    return result;
  }

  /** @returns {Promise<{ok:boolean, level:'ok'|'warn'|'error', message:string, email?:string, suggestion?:string}>} */
  async function validateEmail(raw, opts) {
    const s = checkSyntax(raw);
    if (!s.ok) return { ok: false, level: 'error', message: s.message, empty: !!s.empty };
    const { email, domain } = s;
    if (DISPOSABLE.has(domain)) return { ok: false, level: 'error', message: 'No se permiten correos temporales o desechables.' };
    const typo = exactTypo(domain);
    if (typo) return { ok: false, level: 'error', email, suggestion: s.local + '@' + typo, message: `¿Quisiste decir ${s.local}@${typo}?` };
    const fuzzy = fuzzySuggest(domain);
    const hint = fuzzy ? { suggestion: s.local + '@' + fuzzy } : {};
    if (opts && opts.skipDns) return fuzzy
      ? { ok: true, level: 'warn', email, ...hint, message: `¿Quisiste decir ${hint.suggestion}? Si es correcto, puedes continuar.` }
      : { ok: true, level: 'ok', email, message: 'Formato de correo válido.' };
    const st = await domainMailStatus(domain);
    if (st === 'nx') return { ok: false, level: 'error', email, ...hint, message: `El dominio "${domain}" no existe.` + (fuzzy ? ` ¿Quisiste decir ${hint.suggestion}?` : '') };
    if (st === 'nomail') return { ok: false, level: 'error', email, ...hint, message: `El dominio "${domain}" no recibe correos.` };
    if (fuzzy) return { ok: true, level: 'warn', email, ...hint, message: `¿Quisiste decir ${hint.suggestion}? Si es correcto, puedes continuar.` };
    if (st === 'unknown') return { ok: true, level: 'warn', email, message: 'Formato válido (no se pudo comprobar el dominio ahora).' };
    return { ok: true, level: 'ok', email, message: 'Correo válido.' };
  }

  /* ============================================================
     SEGURIDAD DE CONTRASEÑA
     ============================================================ */
  const MIN_LEN = 10;
  const COMMON = new Set(['123456', '1234567', '12345678', '123456789', '1234567890', '12345', '111111', '000000', '123123', '654321', '666666', '121212', '112233', 'password', 'password1',
    'passw0rd', 'qwerty', 'qwerty123', 'qwertyuiop', 'abc123', 'abcd1234', 'iloveyou', 'admin', 'admin123', 'welcome', 'welcome1', 'letmein', 'monkey', 'dragon', 'master', 'login',
    'princess', 'sunshine', 'football', 'baseball', 'superman', 'batman', 'trustno1', 'shadow', 'michael', 'jordan', 'hello123', 'contrasena', 'contraseña', 'contrasena1',
    'hola1234', 'holamundo', 'bienvenido', 'teamo', 'tequiero', 'futbol', 'estrella', 'mexico', 'mexico123', 'chivas', 'america', 'cruzazul', 'pumas', 'barcelona', 'realmadrid',
    '1q2w3e4r', '1qaz2wsx', 'zaq12wsx', 'asdfgh', 'asdfghjkl', 'zxcvbnm', 'qazwsx', 'changeme', 'pass1234', 'eonyx', 'eonyx123', 'onyx1234']);
  const WORDS = ['password', 'contrasena', 'contraseña', 'passw0rd', 'qwerty', 'admin', 'letmein', 'welcome', 'bienvenid', 'iloveyou', 'tequiero', 'teamo', 'monkey', 'dragon', 'futbol', 'football', 'eonyx', 'onyx', 'vitaris', 'sonorix', 'kinetiq', 'lingram', 'codx'];
  const SEQS = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx', 'abcdefghijklmnñopqrstuvwxyz'];

  const deLeet = s => s.toLowerCase().replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/4|@/g, 'a').replace(/5|\$/g, 's').replace(/7/g, 't');
  function hasSequence(p) {
    const s = p.toLowerCase();
    for (const seq of SEQS) {
      for (let i = 0; i + 4 <= seq.length; i++) {
        const chunk = seq.slice(i, i + 4);
        if (s.includes(chunk) || s.includes([...chunk].reverse().join(''))) return true;
      }
    }
    return false;
  }
  const hasRepeats = p => /(.)\1{2,}/.test(p) || /(.{2,3})\1{2,}/.test(p);
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function personalParts(ctx) {
    const parts = new Set();
    const name = norm(ctx && ctx.name);
    name.split(/[^a-z0-9]+/).filter(x => x.length >= 4).forEach(x => parts.add(x));
    const mail = norm(ctx && ctx.email);
    if (mail.includes('@')) mail.split('@')[0].split(/[^a-z0-9]+/).filter(x => x.length >= 4).forEach(x => parts.add(x));
    return [...parts];
  }

  /**
   * Evalúa una contraseña.
   * @returns {{score:0|1|2|3|4,label:string,bits:number,checks:Array,ok:boolean}}
   */
  function passwordReport(pw, ctx) {
    pw = String(pw || '');
    const lower = /[a-zñáéíóúü]/.test(pw), upper = /[A-ZÑÁÉÍÓÚÜ]/.test(pw), digit = /\d/.test(pw), symbol = /[^A-Za-z0-9ñÑáéíóúüÁÉÍÓÚÜ\s]/.test(pw);
    const lowered = pw.toLowerCase(), plain = norm(pw), leet = deLeet(plain);
    const isCommon = COMMON.has(lowered) || COMMON.has(plain) || COMMON.has(leet);
    const hasWord = !isCommon && WORDS.some(wd => leet.includes(wd));
    const mine = personalParts(ctx);
    const hasPersonal = mine.some(x => plain.includes(x) || leet.includes(x));
    const seq = hasSequence(pw), rep = hasRepeats(pw);

    const checks = [
      { id: 'len',     label: `Al menos ${MIN_LEN} caracteres`,                  ok: pw.length >= MIN_LEN, required: true },
      { id: 'lower',   label: 'Una letra minúscula',                              ok: lower,  required: true },
      { id: 'upper',   label: 'Una letra MAYÚSCULA',                              ok: upper,  required: true },
      { id: 'digit',   label: 'Un número',                                        ok: digit,  required: true },
      { id: 'symbol',  label: 'Un símbolo (por ejemplo ! ? # $ %)',               ok: symbol, required: true },
      { id: 'common',  label: 'No es una contraseña común ni contiene palabras típicas', ok: pw.length > 0 && !isCommon && !hasWord, required: true },
      { id: 'pattern', label: 'Sin secuencias (1234, abcd) ni caracteres repetidos',     ok: pw.length > 0 && !seq && !rep, required: true },
      { id: 'personal',label: 'No contiene tu nombre ni parte de tu correo',      ok: pw.length > 0 && !hasPersonal, required: true }
    ];

    let bits = 0;
    if (pw.length && !isCommon) {
      const pool = (lower ? 26 : 0) + (upper ? 26 : 0) + (digit ? 10 : 0) + (symbol ? 33 : 0) || 1;
      const unique = new Set(pw).size;
      bits = Math.min(pw.length, unique * 1.6) * Math.log2(pool);
      if (seq || rep) bits *= 0.6;
      if (hasWord) bits *= 0.5;
      if (hasPersonal) bits *= 0.5;
    }
    const score = bits < 35 ? 0 : bits < 50 ? 1 : bits < 65 ? 2 : bits < 80 ? 3 : 4;
    const labels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Excelente'];
    const allRequired = checks.every(c => !c.required || c.ok);
    return { score: pw ? score : 0, label: pw ? labels[score] : '', bits: Math.round(bits), checks, ok: allRequired && score >= 3 };
  }

  /** Comprueba si la contraseña aparece en filtraciones (Have I Been Pwned, k-anonimato: solo se envían 5 caracteres del hash). */
  async function checkPwned(pw) {
    try {
      if (!(w.crypto && w.crypto.subtle)) return null;
      const buf = await w.crypto.subtle.digest('SHA-1', new TextEncoder().encode(pw));
      const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const prefix = hex.slice(0, 5), suffix = hex.slice(5);
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 4500);
      const r = await fetch('https://api.pwnedpasswords.com/range/' + prefix, { headers: { 'Add-Padding': 'true' }, signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) return null;
      const line = (await r.text()).split('\n').find(l => l.startsWith(suffix));
      return line ? parseInt(line.split(':')[1], 10) || 1 : 0;
    } catch (e) { return null; }
  }

  /* ============================================================
     IMAGEN DE PERFIL
     ============================================================ */
  const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const AVATAR_MAX_INPUT = 8 * 1024 * 1024;
  const AVATAR_SIZE = 256;

  /** Valida, recorta a cuadrado y reduce a 256×256. Devuelve {blob, dataUrl}. */
  async function processAvatar(file) {
    if (!file) throw new Error('Selecciona una imagen.');
    if (!AVATAR_TYPES.includes(file.type)) throw new Error('Usa una imagen JPG, PNG o WebP.');
    if (file.size > AVATAR_MAX_INPUT) throw new Error('La imagen pesa más de 8 MB.');
    let bmp;
    try {
      bmp = await createImageBitmap(file);
    } catch (e) {
      bmp = await new Promise((res, rej) => {
        const img = new Image(); const url = URL.createObjectURL(file);
        img.onload = () => { URL.revokeObjectURL(url); res(img); };
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen.')); };
        img.src = url;
      });
    }
    const sw = bmp.width, sh = bmp.height, side = Math.min(sw, sh);
    if (side < 64) throw new Error('La imagen es demasiado pequeña (mínimo 64×64 px).');
    const c = document.createElement('canvas'); c.width = c.height = AVATAR_SIZE;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, (sw - side) / 2, (sh - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    const toBlob = (type, q) => new Promise(r => c.toBlob(r, type, q));
    let blob = await toBlob('image/webp', 0.86);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', 0.88);
    if (!blob) throw new Error('No se pudo procesar la imagen.');
    const dataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    return { blob, dataUrl };
  }

  /* ============================================================
     CLIENTE SUPABASE
     ============================================================ */
  let sb = null;
  function client() {
    if (sb) return sb;
    if (!w.supabase || !w.supabase.createClient) throw new Error('supabase-js no está cargado');
    sb = w.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'eonyx-auth' }
    });
    return sb;
  }

  const PENDING_PREFIX = 'eonyx_pending_avatar:';
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignorado */ } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { /* ignorado */ } }
  };
  const dataUrlToBlob = async d => (await fetch(d)).blob();

  async function uploadAvatar(blob) {
    const { data: { user } } = await client().auth.getUser();
    if (!user) throw new Error('Inicia sesión primero.');
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await client().storage.from(CFG.AVATAR_BUCKET).upload(path, blob, { upsert: true, contentType: blob.type, cacheControl: '3600' });
    if (error) throw error;
    const { data } = client().storage.from(CFG.AVATAR_BUCKET).getPublicUrl(path);
    const url = data.publicUrl + '?v=' + Date.now();
    const { error: e2 } = await client().auth.updateUser({ data: { avatar_url: url } });
    if (e2) throw e2;
    return url;
  }

  /** Si el registro dejó una foto pendiente (correo sin confirmar), se sube en el primer inicio de sesión. */
  async function finalizeProfile(user) {
    try {
      if (!user || !user.email) return;
      const key = PENDING_PREFIX + user.email.toLowerCase();
      const pending = store.get(key);
      if (!pending) return;
      if (!(user.user_metadata && user.user_metadata.avatar_url)) await uploadAvatar(await dataUrlToBlob(pending));
      store.del(key);
    } catch (e) { console.warn('[e-Onyx] No se pudo subir la foto pendiente:', e); }
  }

  /* ---------- Operaciones ---------- */
  function friendlyError(err) {
    const msg = String((err && (err.message || err.error_description)) || err || '');
    const code = String((err && (err.code || err.error_code)) || '');
    const status = err && err.status;
    const m = msg.toLowerCase();
    if (m.includes('invalid login credentials')) return { text: 'Correo o contraseña incorrectos.', code: 'bad_credentials' };
    if (m.includes('email not confirmed') || code === 'email_not_confirmed') return { text: 'Aún no confirmas tu correo. Revisa tu bandeja de entrada (y la carpeta de spam).', code: 'unconfirmed' };
    if (m.includes('already registered') || code === 'user_already_exists') return { text: 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.', code: 'exists' };
    if (status === 429 || m.includes('rate limit') || code.includes('rate_limit')) return { text: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.', code: 'rate' };
    if (code === 'weak_password' || m.includes('password should') || m.includes('weak')) return { text: 'El servidor rechazó la contraseña por ser débil. Usa una más larga y variada.', code: 'weak' };
    if (m.includes('same password') || code === 'same_password') return { text: 'La nueva contraseña debe ser distinta de la actual.', code: 'same' };
    if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) return { text: 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', code: 'network' };
    if (m.includes('bucket not found')) return { text: 'Falta crear el bucket "avatars" en Supabase (ejecuta supabase/setup.sql).', code: 'bucket' };
    if (m.includes('row-level security') || m.includes('not authorized') || status === 403) return { text: 'Supabase no permite esta acción todavía (revisa las políticas de supabase/setup.sql).', code: 'rls' };
    if (m.includes('expired') || m.includes('invalid') && m.includes('token')) return { text: 'El enlace expiró o ya fue usado. Solicita uno nuevo.', code: 'expired' };
    console.error('[e-Onyx auth]', err);
    return { text: 'Ocurrió un error inesperado. Inténtalo de nuevo.', code: 'unknown' };
  }

  async function getSession() {
    const { data, error } = await client().auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function signIn(email, password) {
    const { data, error } = await client().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
    finalizeProfile(data.user);
    return data;
  }

  /** @returns {{needsConfirm:boolean, session:object|null}} */
  async function signUp({ name, email, password, avatar, service }) {
    email = email.trim().toLowerCase();
    const redirect = AUTH_URL + '?confirmed=1' + (service ? '&service=' + encodeURIComponent(service) : '');
    const { data, error } = await client().auth.signUp({ email, password, options: { data: { full_name: name.trim() }, emailRedirectTo: redirect } });
    if (error) throw error;
    // Supabase devuelve un usuario "vacío" cuando el correo ya existe (evita enumeración de cuentas)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const e = new Error('User already registered'); e.code = 'user_already_exists'; throw e;
    }
    if (data.session) {
      if (avatar) { try { await uploadAvatar(avatar.blob); } catch (e) { console.warn('[e-Onyx] avatar:', e); } }
      return { needsConfirm: false, session: data.session };
    }
    if (avatar) store.set(PENDING_PREFIX + email, avatar.dataUrl);
    return { needsConfirm: true, session: null };
  }

  async function resendConfirmation(email, service) {
    const { error } = await client().auth.resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: AUTH_URL + '?confirmed=1' + (service ? '&service=' + encodeURIComponent(service) : '') } });
    if (error) throw error;
  }

  async function sendReset(email) {
    const { error } = await client().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: AUTH_URL + '?mode=reset' });
    if (error) throw error;
  }

  async function updatePassword(password) {
    const { error } = await client().auth.updateUser({ password });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await client().auth.signOut();
    if (error) throw error;
  }

  /** Redirige solo a URLs del propio sitio (evita "open redirect"). */
  function safeNext(next, service) {
    try {
      if (next) {
        const u = new URL(next, location.href);
        if (u.origin === location.origin && u.href.startsWith(ROOT)) return u.href;
      }
    } catch (e) { /* ignorado */ }
    const s = CFG.SERVICES && CFG.SERVICES[service];
    return s ? ROOT + s.path : HOME_URL;
  }

  return {
    ROOT, AUTH_URL, HOME_URL, CFG, MIN_LEN,
    client, getSession, signIn, signUp, signOut, resendConfirmation, sendReset, updatePassword,
    uploadAvatar, processAvatar, finalizeProfile, friendlyError, safeNext,
    validateEmail, checkSyntax, passwordReport, checkPwned
  };
});
