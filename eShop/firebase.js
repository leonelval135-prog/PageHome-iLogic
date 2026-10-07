/* ==========================================================
   firebase.js — Auth + Realtime Database (SDK "compat", script clásico)
   Expone window.Fb. Estructura en la base de datos:
     users/{uid}/account = { status, reason, suspendedUntil, deactivatedBy, updatedAt }
         status: "active" | "suspended" | "banned" | "deactivated"
     users/{uid}/data    = { cart, wishlist, coupon, zip, profile, addresses, orders }
   ========================================================== */
(() => {
  'use strict';
  const cfg = window.FIREBASE_CONFIG || {};
  const enabled = !!(window.firebase && cfg.apiKey && !/^TU_/.test(cfg.apiKey));
  const Fb = window.Fb = {
    enabled, user: null, account: { status: 'active' }, synced: false,
    support: window.SUPPORT_EMAIL || '', onUser() {}, onAccount() {}
  };
  if (!enabled) return;

  firebase.initializeApp(cfg);
  const auth = firebase.auth(), db = firebase.database();
  const acc = uid => db.ref(`users/${uid}/account`);
  let off = null, expiry = null, push = null, raw = {};

  // Una suspensión cuyo plazo ya venció cuenta como cuenta activa
  const effective = a => {
    a = a || {};
    const s = a.status || 'active';
    return s === 'suspended' && a.suspendedUntil && a.suspendedUntil <= Date.now() ? { ...a, status: 'active' } : { ...a, status: s };
  };
  const publish = () => {
    Fb.account = effective(raw); Fb.onAccount(Fb.account);
    clearTimeout(expiry);
    if (raw.status === 'suspended' && Fb.account.status === 'suspended') // se reactiva solo al vencer
      expiry = setTimeout(publish, Math.min(raw.suspendedUntil - Date.now() + 500, 2147483647));
  };

  Fb.start = () => auth.onAuthStateChanged(u => {
    off && off(); clearTimeout(expiry);
    Fb.user = u; Fb.synced = false; raw = {};
    Fb.account = { status: 'active' };
    Fb.onUser(u);
    if (!u) return Fb.onAccount(Fb.account);
    const ref = acc(u.uid), cb = ref.on('value', s => { raw = s.val() || {}; publish(); }, () => {});
    off = () => ref.off('value', cb); // escucha en tiempo real: si un admin banea, el aviso aparece al instante
  });

  Fb.isActive = () => Fb.account.status === 'active';
  Fb.register = async (email, pass) => {
    const { user } = await auth.createUserWithEmailAndPassword(email, pass);
    await acc(user.uid).child('status').set('active');
    // Registro de aceptación de términos (no bloquea el alta si las reglas aún no incluyen este nodo)
    db.ref(`users/${user.uid}/terms`).set({ acceptedAt: firebase.database.ServerValue.TIMESTAMP, version: '1' }).catch(() => {});
  };
  Fb.login = (email, pass) => auth.signInWithEmailAndPassword(email, pass);
  Fb.logout = () => auth.signOut();
  // Desactivar / reactivar: autoservicio del usuario (las reglas impiden saltarse un ban o una suspensión)
  Fb.deactivate = async () => { const r = acc(Fb.user.uid); await r.child('deactivatedBy').set('user'); await r.child('status').set('deactivated'); };
  Fb.reactivate = async () => { const r = acc(Fb.user.uid); await r.child('status').set('active'); await r.child('deactivatedBy').remove(); };

  Fb.pull = async () => (await db.ref(`users/${Fb.user.uid}/data`).get()).val();
  Fb.push = st => { // sincroniza con retardo; solo si la cuenta está activa
    if (!Fb.user || !Fb.synced || !Fb.isActive()) return;
    clearTimeout(push);
    push = setTimeout(() => {
      const { cart, wishlist, coupon, zip, profile, addresses, orders } = st;
      db.ref(`users/${Fb.user.uid}/data`).set(JSON.parse(JSON.stringify({ cart, wishlist, coupon: coupon || null, zip, profile, addresses, orders }))).catch(() => {});
    }, 700);
  };

  Fb.errMsg = e => ({
    'auth/invalid-credential': 'Correo o contraseña incorrectos', 'auth/wrong-password': 'Correo o contraseña incorrectos',
    'auth/user-not-found': 'Correo o contraseña incorrectos', 'auth/email-already-in-use': 'Ese correo ya tiene una cuenta',
    'auth/weak-password': 'La contraseña es muy débil', 'auth/too-many-requests': 'Demasiados intentos, espera un momento',
    'auth/network-request-failed': 'Sin conexión, inténtalo de nuevo'
  }[e && e.code] || 'No se pudo completar la acción');
})();
