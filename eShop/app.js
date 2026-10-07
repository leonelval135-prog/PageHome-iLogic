/* ==========================================================
   app.js — Lógica de eShop (estado, carrito, catálogo, UI)
   Script clásico en un IIFE: funciona abriendo index.html sin servidor.
   ========================================================== */
(() => {
  'use strict';

  /* ---------- Utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const { products, categories, banners, coupons } = window.mockData;
  const byId = id => products.find(p => p.id === Number(id));
  const discount = p => Math.round((1 - p.price / p.oldPrice) * 100);
  const stars = r => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

  /* ---------- Estado (persistido en localStorage) ---------- */
  const Store = {
    key: 'eshop_state_v1',
    state: { cart: [], wishlist: [], coupon: null, zip: '06600', user: null },
    load() {
      try { Object.assign(this.state, JSON.parse(localStorage.getItem(this.key) || '{}')); } catch (e) { /* estado corrupto: se ignora */ }
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.state)); } catch (e) { /* almacenamiento no disponible */ }
      UI.renderBadges();
    }
  };

  /* ---------- Carrito ---------- */
  const Cart = {
    add(id, qty = 1) {
      const p = byId(id); if (!p) return;
      const line = Store.state.cart.find(l => l.id === p.id);
      const next = (line ? line.qty : 0) + qty;
      if (next > p.stock) return UI.toast(`Solo hay ${p.stock} piezas disponibles`, 'err');
      line ? (line.qty = next) : Store.state.cart.push({ id: p.id, qty });
      Store.save(); UI.renderCart(); UI.toast('Agregado al carrito');
    },
    setQty(id, qty) {
      const p = byId(id), line = Store.state.cart.find(l => l.id === Number(id));
      if (!line) return;
      if (qty <= 0) return this.remove(id);
      if (qty > p.stock) return UI.toast(`Máximo ${p.stock} piezas`, 'err');
      line.qty = qty; Store.save(); UI.renderCart();
    },
    remove(id) {
      Store.state.cart = Store.state.cart.filter(l => l.id !== Number(id));
      Store.save(); UI.renderCart();
    },
    count: () => Store.state.cart.reduce((n, l) => n + l.qty, 0),
    totals() {
      const subtotal = Store.state.cart.reduce((n, l) => n + byId(l.id).price * l.qty, 0);
      const rate = Store.state.coupon ? coupons[Store.state.coupon] : 0;
      const disc = Math.round(subtotal * rate);
      const shipping = subtotal === 0 || subtotal - disc >= 999 ? 0 : 99; // envío gratis desde $999
      const total = subtotal - disc + shipping;
      return { subtotal, disc, shipping, total, iva: Math.round(total - total / 1.16) }; // IVA incluido (estimado)
    },
    applyCoupon(code) {
      code = code.trim().toUpperCase();
      if (!coupons[code]) return UI.toast('Cupón no válido', 'err');
      Store.state.coupon = code; Store.save(); UI.renderCart(); UI.toast(`Cupón ${code} aplicado`);
    }
  };

  /* ---------- Catálogo: búsqueda, filtros y orden ---------- */
  const Catalog = {
    f: { q: '', cat: '', min: null, max: null, brands: new Set(), rating: 0, free: false, express: false, sort: 'relevance', view: 'grid', wishOnly: false },
    reset() { Object.assign(this.f, { min: null, max: null, brands: new Set(), rating: 0, free: false, express: false }); },
    score(p, q) { // relevancia simple: coincidencias en título, marca y categoría
      return norm(q).split(/\s+/).filter(Boolean).reduce((s, w) =>
        s + (norm(p.title).includes(w) ? 2 : 0) + (norm(p.brand).includes(w) ? 2 : 0) + (norm(p.category).includes(w) ? 1 : 0), 0);
    },
    base() { // productos que cumplen consulta/categoría (sin filtros laterales)
      const { q, cat, wishOnly } = this.f;
      return products.filter(p =>
        (!cat || p.category === cat) &&
        (!wishOnly || Store.state.wishlist.includes(p.id)) &&
        (!q || this.score(p, q) > 0));
    },
    run() {
      const f = this.f;
      let list = this.base().filter(p =>
        (f.min == null || p.price >= f.min) && (f.max == null || p.price <= f.max) &&
        (!f.brands.size || f.brands.has(p.brand)) && p.rating >= f.rating &&
        (!f.free || p.shipping === 'free') && (!f.express || p.shipping === 'express'));
      const sorters = {
        relevance: (a, b) => (f.q ? this.score(b, f.q) - this.score(a, f.q) : 0) || b.sold - a.sold,
        sold: (a, b) => b.sold - a.sold,
        priceAsc: (a, b) => a.price - b.price,
        priceDesc: (a, b) => b.price - a.price
      };
      return list.sort(sorters[f.sort]);
    }
  };

  /* ---------- UI ---------- */
  const UI = {
    view: 'home',
    toast(msg, type = 'ok') {
      const el = document.createElement('div');
      el.className = `toast toast--${type}`; el.textContent = msg;
      $('#toasts').append(el); setTimeout(() => el.remove(), 2600);
    },
    renderBadges() {
      const cc = $('#cartCount'), n = String(Cart.count());
      if (cc.textContent !== n) { cc.textContent = n; cc.classList.remove('bump'); void cc.offsetWidth; cc.classList.add('bump'); }
      $('#wishCount').textContent = Store.state.wishlist.length;
      $('#locText').textContent = `CP ${Store.state.zip}`;
    },
    show(view) { // navegación SPA: muestra una vista y oculta las demás
      this.view = view;
      $$('.view').forEach(v => (v.hidden = v.id !== `view-${view}`));
      window.scrollTo({ top: 0 });
    },
    card(p, i = 0) {
      const wished = Store.state.wishlist.includes(p.id);
      return `<article class="card" style="--i:${Math.min(i, 12)}">
        ${discount(p) >= 20 ? `<span class="badge">-${discount(p)}%</span>` : ''}
        <button class="wish ${wished ? 'is-on' : ''}" data-action="wish" data-id="${p.id}" aria-label="Lista de deseos" aria-pressed="${wished}">${wished ? '♥' : '♡'}</button>
        <div class="card__img" aria-hidden="true"><span>${p.emoji}</span></div>
        <div class="card__body">
          <span class="card__brand">${p.brand}</span>
          <h3 class="card__title">${p.title}</h3>
          <div class="stars" title="${p.rating}">${stars(p.rating)} <small>(${p.reviews.toLocaleString('es-MX')})</small></div>
          <div class="price">${money(p.price)}<span class="old">${money(p.oldPrice)}</span></div>
          ${p.shipping === 'free' ? '<span class="ship">Envío gratis</span>' : p.shipping === 'express' ? '<span class="ship">Llega mañana</span>' : ''}
          <button class="btn btn--primary" data-action="add" data-id="${p.id}">Agregar al carrito</button>
        </div></article>`;
    },
    grid(el, list) {
      el.innerHTML = list.length ? list.map((p, i) => this.card(p, i)).join('') : '<p class="empty">No encontramos productos. Prueba con otras palabras o quita algunos filtros.</p>';
    },
    renderHome() {
      $('#catTiles').innerHTML = categories.map(c => `<button class="tile" data-action="cat" data-cat="${c}"><b>${c}</b><small>${products.filter(p => p.category === c).length} productos</small></button>`).join('');
      this.grid($('#flashGrid'), products.filter(p => p.flash).slice(0, 4));
      this.grid($('#featuredGrid'), [...products].sort((a, b) => b.sold - a.sold).slice(0, 4));
      this.grid($('#recoGrid'), [...products].sort((a, b) => b.rating - a.rating).slice(0, 4));
    },
    renderSerp() {
      const f = Catalog.f, list = Catalog.run();
      $('#resultsTitle').textContent = f.wishOnly ? 'Tu lista de deseos' : f.q ? `Resultados para “${f.q}”` : f.cat || 'Todos los productos';
      $('#resultsCount').textContent = `${list.length} producto${list.length === 1 ? '' : 's'}`;
      const g = $('#resultsGrid');
      g.className = `grid grid--cards ${f.view === 'list' ? 'grid--list' : ''}`;
      this.grid(g, list);
      // Marcas disponibles según la consulta actual
      const brands = [...new Set(Catalog.base().map(p => p.brand))].sort();
      $('#fBrands').innerHTML = brands.map(b => `<label><input type="checkbox" value="${b}" ${f.brands.has(b) ? 'checked' : ''}> ${b}</label>`).join('');
      $$('#catNav button').forEach(b => b.classList.toggle('is-active', b.dataset.cat === f.cat));
    },
    renderCart() {
      const lines = Store.state.cart, box = $('#cartItems'), sum = $('#cartSummary');
      if (!lines.length) {
        box.innerHTML = '<p class="empty">Tu carrito está vacío. Agrega productos para verlos aquí.</p>'; sum.innerHTML = ''; return;
      }
      box.innerHTML = lines.map(l => { const p = byId(l.id); return `
        <div class="line">
          <div class="line__img">${p.emoji}</div>
          <div><div class="line__title">${p.title}</div>
            <div class="qty"><button data-action="dec" data-id="${p.id}" aria-label="Menos">−</button><span>${l.qty}</span><button data-action="inc" data-id="${p.id}" aria-label="Más">+</button></div>
            <button class="link-btn" data-action="remove" data-id="${p.id}">Eliminar</button></div>
          <strong>${money(p.price * l.qty)}</strong>
        </div>`; }).join('');
      const t = Cart.totals();
      sum.innerHTML = `
        <div class="coupon"><input id="couponInput" placeholder="Código de cupón" value="${Store.state.coupon || ''}" aria-label="Cupón"><button class="btn btn--ghost" data-action="coupon">Aplicar</button></div>
        <div class="sum"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
        ${t.disc ? `<div class="sum"><span>Descuento (${Store.state.coupon})</span><span>−${money(t.disc)}</span></div>` : ''}
        <div class="sum"><span>Envío estimado</span><span>${t.shipping ? money(t.shipping) : 'Gratis'}</span></div>
        <div class="sum muted"><span>IVA incluido (16%)</span><span>${money(t.iva)}</span></div>
        <div class="sum sum--total"><span>Total</span><span>${money(t.total)}</span></div>
        <button class="btn btn--primary btn--block" data-action="checkout" style="margin-top:10px">Continuar con la compra</button>`;
    },
    openCart(open) {
      $('#cartDrawer').hidden = !open; $('#cartOverlay').hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) this.renderCart();
    }
  };

  /* ---------- Navegación de catálogo ---------- */
  function openCatalog(opts = {}) {
    Catalog.reset();
    Object.assign(Catalog.f, { q: '', cat: '', wishOnly: false }, opts);
    $('#fMin').value = $('#fMax').value = ''; $('#fFree').checked = $('#fExpress').checked = false;
    $('#searchInput').value = Catalog.f.q;
    UI.show('search'); UI.renderSerp();
  }

  /* ---------- Autocompletado ---------- */
  const Suggest = {
    el: null, idx: -1,
    update(q) {
      q = q.trim(); this.idx = -1;
      if (q.length < 2) return this.hide();
      const opts = [...new Set(products.filter(p => Catalog.score(p, q) > 0).map(p => p.title))].slice(0, 6);
      if (!opts.length) return this.hide();
      this.el.innerHTML = opts.map(o => `<li role="option" data-q="${o}">${o}</li>`).join('');
      this.el.hidden = false;
    },
    hide() { this.el.hidden = true; },
    move(d) {
      const items = $$('li', this.el); if (!items.length) return;
      this.idx = (this.idx + d + items.length) % items.length;
      items.forEach((li, i) => li.classList.toggle('is-active', i === this.idx));
      $('#searchInput').value = items[this.idx].dataset.q;
    }
  };

  /* ---------- Carousel ---------- */
  const Carousel = {
    i: 0, timer: null,
    init() {
      $('#carTrack').innerHTML = banners.map(b => `<div class="slide" style="background:${b.bg}"><h2>${b.title}</h2><p>${b.text}</p><button class="btn btn--primary" data-action="cat" data-cat="${b.cat}">${b.cta}</button></div>`).join('');
      $('#carDots').innerHTML = banners.map((_, i) => `<button data-action="car-go" data-i="${i}" aria-label="Banner ${i + 1}"></button>`).join('');
      const c = $('#carousel');
      c.addEventListener('mouseenter', () => this.stop()); c.addEventListener('mouseleave', () => this.start());
      this.go(0); this.start();
    },
    go(i) {
      this.i = (i + banners.length) % banners.length;
      $('#carTrack').style.transform = `translateX(-${this.i * 100}%)`;
      $$('#carDots button').forEach((d, k) => d.classList.toggle('is-active', k === this.i));
    },
    start() { this.stop(); this.timer = setInterval(() => this.go(this.i + 1), 5000); },
    stop() { clearInterval(this.timer); }
  };

  /* ---------- Countdown de ofertas (hasta medianoche) ---------- */
  function startCountdown() {
    const el = $('#countdown');
    const tick = () => {
      const end = new Date(); end.setHours(23, 59, 59, 0);
      const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      el.textContent = [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':');
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- Eventos (delegación) ---------- */
  const actions = {
    'go-home': () => { UI.show('home'); },
    'toggle-theme': () => Theme.toggle(),
    'tab': id => { Account.tab = id; Account.render(); },
    'tab-orders': () => Account.open('orders'),
    'save-profile': () => Account.saveProfile(),
    'save-addr': () => Account.saveAddr(),
    'del-addr': id => { Store.state.addresses.splice(Number(id), 1); Store.save(); Account.render(); },
    'logout': () => { Store.state.user = null; Store.save(); UI.toast('Sesión cerrada'); Account.render(); },
    'reorder': id => Account.reorder(id),
    'co-next': () => Checkout.next(),
    'co-back': () => { Checkout.step--; Checkout.render(); },
    'co-confirm': () => Checkout.confirm(),
    'card-type': id => Checkout.setType(id),
    'add': id => Cart.add(id),
    'wish': (id, el) => {
      const w = Store.state.wishlist, i = w.indexOf(Number(id));
      i >= 0 ? w.splice(i, 1) : w.push(Number(id)); Store.save();
      if (UI.view === 'profile') Account.render();
      else if (Catalog.f.wishOnly && UI.view === 'search') UI.renderSerp(); // en la lista de deseos, quitar = desaparecer
      else { const on = i < 0; el.classList.toggle('is-on', on); el.textContent = on ? '♥' : '♡'; el.setAttribute('aria-pressed', on); }
      UI.toast(i >= 0 ? 'Quitado de tu lista de deseos' : 'Guardado en tu lista de deseos');
    },
    'show-wishlist': () => openCatalog({ wishOnly: true }),
    'cat': (_, el) => openCatalog({ cat: el.dataset.cat }),
    'open-cart': () => UI.openCart(true), 'close-cart': () => UI.openCart(false),
    'inc': id => Cart.setQty(id, Store.state.cart.find(l => l.id === Number(id)).qty + 1),
    'dec': id => Cart.setQty(id, Store.state.cart.find(l => l.id === Number(id)).qty - 1),
    'remove': id => Cart.remove(id),
    'coupon': () => Cart.applyCoupon($('#couponInput').value),
    'checkout': () => { if (!Store.state.cart.length) return UI.toast('Tu carrito está vacío', 'err'); UI.openCart(false); Checkout.start(); },
    'car-prev': () => Carousel.go(Carousel.i - 1), 'car-next': () => Carousel.go(Carousel.i + 1),
    'car-go': (_, el) => Carousel.go(Number(el.dataset.i)),
    'view-grid': () => setView('grid'), 'view-list': () => setView('list'),
    'toggle-filters': () => $('#filters').classList.toggle('is-open'),
    'clear-filters': () => openCatalog({ q: Catalog.f.q, cat: Catalog.f.cat, wishOnly: Catalog.f.wishOnly }),
    'set-location': () => {
      const zip = prompt('Ingresa tu código postal (5 dígitos):', Store.state.zip);
      if (zip && /^\d{5}$/.test(zip)) { Store.state.zip = zip; Store.save(); UI.toast('Ubicación actualizada'); }
      else if (zip) UI.toast('Código postal no válido', 'err');
    },
    'open-auth': () => { if (Store.state.user) return Account.open(); $('#authModal').hidden = false; $('#authEmail').focus(); },
    'close-auth': () => { $('#authModal').hidden = true; }
  };
  function setView(v) {
    Catalog.f.view = v;
    $$('.viewtoggle button').forEach(b => b.classList.toggle('is-active', b.dataset.action === `view-${v}`));
    UI.renderSerp();
  }

  function bindEvents() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-action]');
      if (el && actions[el.dataset.action]) { e.preventDefault(); actions[el.dataset.action](el.dataset.id, el); }
      const li = e.target.closest('#suggest li');
      if (li) { Suggest.hide(); openCatalog({ q: li.dataset.q }); }
      if (!e.target.closest('.search')) Suggest.hide();
    });
    const input = $('#searchInput'); Suggest.el = $('#suggest');
    input.addEventListener('input', () => Suggest.update(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); Suggest.move(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); Suggest.move(-1); }
      if (e.key === 'Enter') { Suggest.hide(); openCatalog({ q: input.value.trim() }); }
      if (e.key === 'Escape') Suggest.hide();
    });
    $('#searchBtn').addEventListener('click', () => { Suggest.hide(); openCatalog({ q: input.value.trim() }); });

    // Filtros laterales y orden
    const f = Catalog.f, refresh = () => UI.renderSerp();
    $('#fMin').addEventListener('input', e => { f.min = e.target.value === '' ? null : +e.target.value; refresh(); });
    $('#fMax').addEventListener('input', e => { f.max = e.target.value === '' ? null : +e.target.value; refresh(); });
    $('#fBrands').addEventListener('change', e => { e.target.checked ? f.brands.add(e.target.value) : f.brands.delete(e.target.value); refresh(); });
    $$('input[name=fRating]').forEach(r => r.addEventListener('change', () => { f.rating = +r.value; refresh(); }));
    $('#fFree').addEventListener('change', e => { f.free = e.target.checked; refresh(); });
    $('#fExpress').addEventListener('change', e => { f.express = e.target.checked; refresh(); });
    $('#sortSel').addEventListener('change', e => { f.sort = e.target.value; refresh(); });

    // Login/registro simulado
    $('#authForm').addEventListener('submit', e => {
      e.preventDefault();
      const email = $('#authEmail').value.trim(), pass = $('#authPass').value;
      if (!/^\S+@\S+\.\S+$/.test(email) || pass.length < 6) return UI.toast('Revisa el correo y usa al menos 6 caracteres', 'err');
      Account.login(email); actions['close-auth'](); UI.toast(`Sesión iniciada: ${email}`); Account.open();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { UI.openCart(false); actions['close-auth'](); } });
  }

  /* ---------- Utilidades de cuenta y checkout ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const val = id => ($('#' + id)?.value || '').trim();
  const fmtDate = iso => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const STEPS = ['Confirmado', 'Preparando', 'En camino', 'Entregado'];
  // Formulario de dirección reutilizable (pre = prefijo de ids: "a" checkout, "b" perfil)
  const addrFields = (a = {}, pre) => `<div class="form-grid">
    <label>Nombre completo<input id="${pre}Name" value="${esc(a.name)}" autocomplete="name"></label>
    <label>Teléfono<input id="${pre}Phone" inputmode="tel" value="${esc(a.phone)}" placeholder="10 dígitos" autocomplete="tel"></label>
    <label class="span2">Calle y número<input id="${pre}Street" value="${esc(a.street)}" autocomplete="street-address"></label>
    <label>Ciudad<input id="${pre}City" value="${esc(a.city)}"></label>
    <label>Estado<input id="${pre}State" value="${esc(a.state)}"></label>
    <label>Código postal<input id="${pre}Zip" inputmode="numeric" maxlength="5" value="${esc(a.zip || Store.state.zip)}"></label></div>`;
  const readAddr = pre => {
    const a = { name: val(pre + 'Name'), phone: val(pre + 'Phone').replace(/\D/g, ''), street: val(pre + 'Street'), city: val(pre + 'City'), state: val(pre + 'State'), zip: val(pre + 'Zip') };
    if (!a.name || !a.street || !a.city || !a.state) { UI.toast('Completa todos los campos de la dirección', 'err'); return null; }
    if (!/^\d{10}$/.test(a.phone)) { UI.toast('El teléfono debe tener 10 dígitos', 'err'); return null; }
    if (!/^\d{5}$/.test(a.zip)) { UI.toast('El código postal debe tener 5 dígitos', 'err'); return null; }
    return a;
  };
  const addrText = a => `${esc(a.name)} · ${esc(a.street)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.zip)}`;

  /* ---------- Perfil: datos, compras con rastreo, direcciones, deseos ---------- */
  const Account = {
    tab: 'orders',
    seed() {
      const s = Store.state, ago = d => new Date(Date.now() - d * 864e5).toISOString();
      s.profile = Object.assign({ username: 'invitado', name: 'Invitado', email: '', avatar: null }, s.profile);
      s.addresses = s.addresses || [];
      s.orders = s.orders || [ // pedidos de ejemplo
        { id: 'ES-10482', date: ago(12), items: [{ id: 1, qty: 1 }, { id: 4, qty: 1 }], total: 1998, status: 3, pay: 'Visa •••• 4242 (crédito)' },
        { id: 'ES-10517', date: ago(2), items: [{ id: 8, qty: 1 }], total: 1099, status: 2, pay: 'PayPal' }];
    },
    login(email) {
      const s = Store.state, p = s.profile, base = email.split('@')[0];
      s.user = { email }; p.email = email;
      if (p.username === 'invitado') p.username = base.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'usuario';
      if (p.name === 'Invitado') p.name = base.charAt(0).toUpperCase() + base.slice(1);
      Store.save();
    },
    open(tab) { if (tab) this.tab = tab; this.render(); UI.show('profile'); },
    avatar(p) {
      return p.avatar && p.avatar.startsWith('data:image/') ? `<img src="${p.avatar}" alt="Foto de perfil">`
        : `<span>${esc(p.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?')}</span>`;
    },
    render() {
      const s = Store.state, p = s.profile, spent = s.orders.reduce((n, o) => n + o.total, 0);
      const tabs = [['orders', 'Mis compras'], ['wish', 'Lista de deseos'], ['addr', 'Direcciones'], ['data', 'Mi perfil']];
      $('#view-profile').innerHTML = `<div class="container">
        <section class="profile-head glass">
          <label class="avatar" title="Cambiar foto">${this.avatar(p)}<small>Cambiar</small><input type="file" id="avatarInput" accept="image/*" hidden></label>
          <div class="profile-id"><h1>${esc(p.name)}</h1><p class="muted">@${esc(p.username)}${p.email ? ' · ' + esc(p.email) : ''}</p></div>
          <div class="stats"><div><b>${s.orders.length}</b><small>Compras</small></div><div><b>${money(spent)}</b><small>Gastado</small></div><div><b>${s.wishlist.length}</b><small>Deseos</small></div></div>
        </section>
        <nav class="tabs" role="tablist">${tabs.map(([id, l]) => `<button role="tab" aria-selected="${id === this.tab}" class="${id === this.tab ? 'is-active' : ''}" data-action="tab" data-id="${id}">${l}</button>`).join('')}</nav>
        <div class="tab-body">${this['t_' + this.tab]()}</div></div>`;
    },
    t_orders() {
      const list = Store.state.orders;
      if (!list.length) return '<p class="empty">Aún no tienes compras. Cuando compres, aparecerán aquí con su rastreo.</p>';
      return list.map(o => `<article class="order glass">
        <header><div><b>Pedido ${esc(o.id)}</b><small class="muted">${fmtDate(o.date)} · ${esc(o.pay)}</small></div><div class="order__total">${money(o.total)}</div></header>
        <ol class="track" aria-label="Rastreo del pedido">${STEPS.map((st, i) => `<li class="${i <= o.status ? 'is-done' : ''} ${i === o.status ? 'is-now' : ''}"><i></i><span>${st}</span></li>`).join('')}</ol>
        <div>${o.items.map(l => { const p = byId(l.id); return `<span class="chip">${p.emoji} ${esc(p.title)} ×${l.qty}</span>`; }).join('')}</div>
        <div><button class="btn btn--ghost" data-action="reorder" data-id="${esc(o.id)}">Volver a comprar</button></div></article>`).join('');
    },
    t_wish() {
      const l = products.filter(p => Store.state.wishlist.includes(p.id));
      return l.length ? `<div class="grid grid--cards">${l.map((p, i) => UI.card(p, i)).join('')}</div>` : '<p class="empty">Tu lista está vacía. Toca el corazón de cualquier producto para guardarlo.</p>';
    },
    t_addr() {
      const l = Store.state.addresses;
      return `<div class="glass box"><h3>Mis direcciones</h3>${l.length ? l.map((a, i) => `<div class="addr"><span>${addrText(a)}</span><button class="link-btn" data-action="del-addr" data-id="${i}">Eliminar</button></div>`).join('') : '<p class="muted">Aún no tienes direcciones guardadas.</p>'}
        <h3 style="margin-top:20px">Agregar dirección</h3>${addrFields({}, 'b')}<button class="btn btn--primary" data-action="save-addr">Guardar dirección</button></div>`;
    },
    t_data() {
      const p = Store.state.profile;
      return `<div class="glass box"><h3>Datos personales</h3><div class="form-grid">
        <label>Nombre<input id="pName" value="${esc(p.name)}"></label><label>Nombre de usuario<input id="pUser" value="${esc(p.username)}"></label>
        <label class="span2">Correo<input id="pMail" type="email" value="${esc(p.email)}"></label></div>
        <div class="row"><button class="btn btn--primary" data-action="save-profile">Guardar cambios</button>
        ${Store.state.user ? '<button class="btn btn--ghost" data-action="logout">Cerrar sesión</button>' : '<button class="btn btn--ghost" data-action="open-auth">Iniciar sesión</button>'}</div></div>`;
    },
    saveProfile() {
      const name = val('pName'), user = val('pUser'), mail = val('pMail');
      if (name.length < 2) return UI.toast('Escribe tu nombre', 'err');
      if (!/^[a-z0-9_]{3,20}$/i.test(user)) return UI.toast('Usuario: 3 a 20 letras, números o _', 'err');
      if (mail && !/^\S+@\S+\.\S+$/.test(mail)) return UI.toast('Correo no válido', 'err');
      Object.assign(Store.state.profile, { name, username: user, email: mail }); Store.save(); this.render(); UI.toast('Perfil actualizado');
    },
    saveAddr() { const a = readAddr('b'); if (!a) return; Store.state.addresses.push(a); Store.save(); this.render(); UI.toast('Dirección guardada'); },
    reorder(id) { const o = Store.state.orders.find(x => x.id === id); if (!o) return; o.items.forEach(l => Cart.add(l.id, l.qty)); UI.openCart(true); },
    bind() { // foto de perfil: se recorta a cuadrado y se reduce antes de guardarla
      document.addEventListener('change', e => {
        if (e.target.id !== 'avatarInput' || !e.target.files[0]) return;
        const img = new Image(), url = URL.createObjectURL(e.target.files[0]);
        img.onload = () => {
          const cv = document.createElement('canvas'), n = 192, m = Math.min(img.width, img.height);
          cv.width = cv.height = n; cv.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, n, n);
          Store.state.profile.avatar = cv.toDataURL('image/jpeg', .85); URL.revokeObjectURL(url); Store.save(); this.render(); UI.toast('Foto de perfil actualizada');
        };
        img.onerror = () => UI.toast('No pudimos leer esa imagen', 'err');
        img.src = url;
      });
    }
  };

  /* ---------- Checkout de 3 pasos con tarjeta animada ---------- */
  const Checkout = {
    step: 1, pay: 'card', ctype: 'credit', addr: null, addrSel: 'new', card: {}, placed: null, ref: '', prev: null,
    start() {
      Object.assign(this, { step: 1, pay: 'card', ctype: 'credit', addr: null, card: {}, placed: null, prev: null,
        addrSel: Store.state.addresses.length ? 0 : 'new', ref: 'ESHOP-' + Math.random().toString(36).slice(2, 8).toUpperCase() });
      this.render(); UI.show('checkout');
    },
    render() {
      const v = $('#view-checkout');
      if (this.placed) { v.innerHTML = `<div class="container">${this.success()}</div>`; return; }
      const labels = ['Dirección', 'Pago', 'Confirmar'];
      v.innerHTML = `<div class="container"><h1>Finalizar compra</h1>
        <ol class="steps">${labels.map((l, i) => `<li class="${i + 1 < this.step ? 'is-done' : ''} ${i + 1 === this.step ? 'is-now' : ''}"><i>${i + 1 < this.step ? '✓' : i + 1}</i><span>${l}</span></li>`).join('')}</ol>
        <div class="co-grid"><div class="co-main">${this['s' + this.step]()}</div>${this.summary()}</div></div>`;
      if (this.step === 2) this.fillCard();
    },
    summary() {
      const t = Cart.totals();
      return `<aside class="co-sum glass"><h3>Resumen</h3>
        ${Store.state.cart.map(l => { const p = byId(l.id); return `<div class="sum"><span class="trunc">${p.emoji} ${esc(p.title)} ×${l.qty}</span><span>${money(p.price * l.qty)}</span></div>`; }).join('')}
        <div class="sum"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
        ${t.disc ? `<div class="sum"><span>Descuento</span><span>−${money(t.disc)}</span></div>` : ''}
        <div class="sum"><span>Envío</span><span>${t.shipping ? money(t.shipping) : 'Gratis'}</span></div>
        <div class="sum sum--total"><span>Total</span><span>${money(t.total)}</span></div></aside>`;
    },
    s1() { // Paso 1: dirección
      const saved = Store.state.addresses, p = Store.state.profile;
      return `<div class="glass box"><h3>Dirección de envío</h3>
        ${saved.length ? `<div>${saved.map((a, i) => `<label class="opt"><input type="radio" name="addrSel" value="${i}" ${this.addrSel === i ? 'checked' : ''}><span>${addrText(a)}</span></label>`).join('')}
          <label class="opt"><input type="radio" name="addrSel" value="new" ${this.addrSel === 'new' ? 'checked' : ''}><span>Usar una dirección nueva</span></label></div>` : ''}
        <div id="newAddr" ${saved.length && this.addrSel !== 'new' ? 'hidden' : ''}>${addrFields(this.addr || { name: p.name !== 'Invitado' ? p.name : '' }, 'a')}
          <label class="opt"><input type="checkbox" id="aSave" checked><span>Guardar en mi perfil</span></label></div>
        <div class="row"><button class="btn btn--primary" data-action="co-next">Continuar al pago</button></div></div>`;
    },
    s2() { // Paso 2: método de pago
      const m = [['card', 'Tarjeta de crédito o débito'], ['paypal', 'PayPal'], ['transfer', 'Transferencia bancaria'], ['cash', 'Efectivo (OXXO / 7-Eleven)']];
      return `<div class="glass box"><h3>Método de pago</h3>
        <div class="methods">${m.map(([id, l]) => `<label class="method ${this.pay === id ? 'is-on' : ''}"><input type="radio" name="pay" value="${id}" ${this.pay === id ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
        <div class="pane" data-pane="card" ${this.pay !== 'card' ? 'hidden' : ''}><div class="card-pay">
          <div class="ccard-wrap"><div class="ccard" id="ccard"><div class="ccard__inner">
            <div class="ccard__face"><div class="ccard__top"><i class="chip-ico"></i><span id="ccBrand">TARJETA</span></div>
              <div class="ccard__num" id="ccNum"></div>
              <div class="ccard__row"><div><small>Titular</small><b id="ccName">NOMBRE APELLIDO</b></div><div><small>Vence</small><b id="ccExp">MM/AA</b></div><span class="ccard__type" id="ccType">CRÉDITO</span></div></div>
            <div class="ccard__face ccard__back"><div class="stripe"></div><div class="cvv"><small>CVV</small><b id="ccCvv">•••</b></div></div>
          </div></div></div>
          <div class="card-form">
            <div class="seg"><button type="button" data-action="card-type" data-id="credit">Crédito</button><button type="button" data-action="card-type" data-id="debit">Débito</button></div>
            <label>Número de tarjeta<input id="cNum" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000"></label>
            <label>Nombre del titular<input id="cName" autocomplete="cc-name" placeholder="Como aparece en la tarjeta"></label>
            <div class="form-grid"><label>Vencimiento<input id="cExp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" maxlength="5"></label>
              <label>CVV<input id="cCvv" type="password" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4"></label></div>
            <p class="muted">Demo: no se procesa ningún cobro y los datos de la tarjeta no se guardan. Prueba con 4242 4242 4242 4242.</p></div></div></div>
        <div class="pane" data-pane="paypal" ${this.pay !== 'paypal' ? 'hidden' : ''}><label>Correo de PayPal<input id="ppMail" type="email" value="${esc(Store.state.profile.email)}" placeholder="tu@correo.com"></label></div>
        <div class="pane" data-pane="transfer" ${this.pay !== 'transfer' ? 'hidden' : ''}><p>Transfiere el total a la CLABE <b>0123 4567 8901 2345 67</b> (demo) con la referencia <b>${this.ref}</b>. El pedido se confirma al recibir el pago.</p></div>
        <div class="pane" data-pane="cash" ${this.pay !== 'cash' ? 'hidden' : ''}><p>Generaremos una ficha con la referencia <b>${this.ref}</b>. Paga en OXXO o 7-Eleven durante las próximas 48 horas.</p></div>
        <div class="row"><button class="btn btn--ghost" data-action="co-back">Atrás</button><button class="btn btn--primary" data-action="co-next">Revisar pedido</button></div></div>`;
    },
    s3() { // Paso 3: confirmación
      return `<div class="glass box"><h3>Confirma tu pedido</h3><div class="review">
        <div><small class="muted">Enviar a</small><p>${addrText(this.addr)}</p></div><div><small class="muted">Pago</small><p>${esc(this.payLabel())}</p></div></div>
        <div class="row"><button class="btn btn--ghost" data-action="co-back">Atrás</button><button class="btn btn--primary" id="payBtn" data-action="co-confirm">Pagar ${money(Cart.totals().total)}</button></div></div>`;
    },
    success() {
      const o = this.placed;
      return `<div class="success glass"><svg class="check" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l8 8 14-16"/></svg>
        <h2>¡Gracias por tu compra!</h2><p class="muted">Pedido ${esc(o.id)} · ${money(o.total)}</p>
        <div class="row" style="justify-content:center"><button class="btn btn--primary" data-action="tab-orders">Ver mis compras</button><button class="btn btn--ghost" data-action="go-home">Seguir comprando</button></div></div>`;
    },
    /* --- tarjeta --- */
    cardBrand: n => /^4/.test(n) ? 'VISA' : /^(5[1-5]|2[2-7])/.test(n) ? 'MASTERCARD' : /^3[47]/.test(n) ? 'AMEX' : 'TARJETA',
    group(d, brand) { const sz = brand === 'AMEX' ? [4, 6, 5] : [4, 4, 4, 4], out = []; let i = 0; for (const n of sz) { if (i >= d.length) break; out.push(d.slice(i, i + n)); i += n; } return out.join(' '); },
    luhn(d) { let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; } return d.length > 0 && s % 10 === 0; },
    fillCard() {
      const c = this.card; this.prev = null;
      $('#cNum').value = this.group(c.num || '', this.cardBrand(c.num || '')); $('#cName').value = c.name || ''; $('#cExp').value = c.exp || ''; $('#cCvv').value = c.cvv || '';
      $$('.seg button').forEach(b => b.classList.toggle('is-active', b.dataset.id === this.ctype));
      this.updateCard();
    },
    setType(id) { this.ctype = id; $$('.seg button').forEach(b => b.classList.toggle('is-active', b.dataset.id === id)); this.updateCard(); },
    setTxt(id, t) { const el = $('#' + id); if (el.textContent !== t) { el.textContent = t; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } },
    updateCard() { // refleja los datos escritos en la tarjeta animada
      const c = this.card, d = c.num || '', brand = this.cardBrand(d), tpl = brand === 'AMEX' ? '•••• •••••• •••••' : '•••• •••• •••• ••••';
      let k = 0; const disp = [...tpl].map(ch => ch === '•' ? (d[k++] || '•') : ch), prev = this.prev || [];
      $('#ccNum').innerHTML = disp.map((ch, i) => `<span class="${ch !== prev[i] && ch !== '•' && ch !== ' ' ? 'in' : ''}">${ch}</span>`).join('');
      this.prev = disp;
      $('#ccBrand').textContent = brand;
      $('#ccType').textContent = this.ctype === 'credit' ? 'CRÉDITO' : 'DÉBITO';
      this.setTxt('ccName', (c.name || '').trim().toUpperCase() || 'NOMBRE APELLIDO');
      this.setTxt('ccExp', c.exp || 'MM/AA');
      $('#ccCvv').textContent = c.cvv ? '•'.repeat(c.cvv.length) : '•••';
    },
    validPay() {
      const bad = m => (UI.toast(m, 'err'), false);
      if (this.pay === 'card') {
        const c = this.card, d = c.num || '', brand = this.cardBrand(d), m = /^(\d{2})\/(\d{2})$/.exec(c.exp || '');
        if (d.length < (brand === 'AMEX' ? 15 : 13) || !this.luhn(d)) return bad('Número de tarjeta no válido');
        if ((c.name || '').trim().length < 3) return bad('Escribe el nombre del titular');
        if (!m || +m[1] < 1 || +m[1] > 12) return bad('Fecha de vencimiento no válida');
        if (new Date(2000 + +m[2], +m[1], 1) <= new Date()) return bad('La tarjeta está vencida');
        if ((c.cvv || '').length !== (brand === 'AMEX' ? 4 : 3)) return bad('CVV no válido');
      } else if (this.pay === 'paypal') {
        this.ppMail = val('ppMail'); if (!/^\S+@\S+\.\S+$/.test(this.ppMail)) return bad('Escribe un correo de PayPal válido');
      }
      return true;
    },
    payLabel() { // nunca se guarda el número completo: solo marca y últimos 4 dígitos
      const names = { VISA: 'Visa', MASTERCARD: 'Mastercard', AMEX: 'American Express', TARJETA: 'Tarjeta' };
      if (this.pay === 'card') return `${names[this.cardBrand(this.card.num || '')]} •••• ${(this.card.num || '').slice(-4)} (${this.ctype === 'credit' ? 'crédito' : 'débito'})`;
      return { paypal: `PayPal · ${this.ppMail || ''}`, transfer: 'Transferencia bancaria', cash: 'Efectivo en tienda' }[this.pay];
    },
    next() {
      if (this.step === 1) {
        const saved = Store.state.addresses;
        if (saved.length && this.addrSel !== 'new') this.addr = saved[this.addrSel];
        else { const a = readAddr('a'); if (!a) return; this.addr = a; if ($('#aSave').checked) { saved.push(a); this.addrSel = saved.length - 1; Store.save(); } }
      } else if (this.step === 2 && !this.validPay()) return;
      this.step++; this.render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    confirm() {
      const btn = $('#payBtn'); btn.classList.add('is-loading'); btn.textContent = 'Procesando…';
      setTimeout(() => {
        const s = Store.state, t = Cart.totals();
        const o = { id: 'ES-' + (10000 + Math.floor(Math.random() * 89999)), date: new Date().toISOString(), items: s.cart.map(l => ({ ...l })), total: t.total, status: 0, pay: this.payLabel() };
        s.orders.unshift(o); s.cart = []; s.coupon = null; Store.save(); UI.renderCart();
        this.placed = o; this.card = {}; this.render(); window.scrollTo({ top: 0 });
      }, 1500);
    },
    bind() {
      const root = $('#view-checkout');
      root.addEventListener('input', e => {
        const id = e.target.id, c = this.card, v = e.target.value;
        if (id === 'cNum') { const b = this.cardBrand(v.replace(/\D/g, '')), d = v.replace(/\D/g, '').slice(0, b === 'AMEX' ? 15 : 16); e.target.value = this.group(d, b); c.num = d; }
        else if (id === 'cName') c.name = v;
        else if (id === 'cExp') { const d = v.replace(/\D/g, '').slice(0, 4); e.target.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; c.exp = e.target.value; }
        else if (id === 'cCvv') { e.target.value = v.replace(/\D/g, '').slice(0, 4); c.cvv = e.target.value; }
        else return;
        this.updateCard();
      });
      root.addEventListener('change', e => {
        if (e.target.name === 'addrSel') { this.addrSel = e.target.value === 'new' ? 'new' : Number(e.target.value); $('#newAddr').hidden = this.addrSel !== 'new'; }
        if (e.target.name === 'pay') {
          this.pay = e.target.value;
          $$('.pane', root).forEach(p => (p.hidden = p.dataset.pane !== this.pay));
          $$('.method', root).forEach(m => m.classList.toggle('is-on', m.querySelector('input').checked));
        }
      });
      // La tarjeta se voltea al escribir el CVV
      root.addEventListener('focusin', e => { if (e.target.id === 'cCvv') $('#ccard').classList.add('is-flipped'); });
      root.addEventListener('focusout', e => { if (e.target.id === 'cCvv') $('#ccard').classList.remove('is-flipped'); });
    }
  };

  /* ---------- Tema claro / oscuro ---------- */
  const Theme = {
    key: 'eshop_theme',
    init() { this.set(document.documentElement.dataset.theme || 'light', false); },
    set(t, animate = true) {
      const root = document.documentElement;
      if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) { // transición suave entre temas
        root.classList.add('theming'); setTimeout(() => root.classList.remove('theming'), 600);
      }
      root.dataset.theme = t;
      try { localStorage.setItem(this.key, t); } catch (e) { /* sin almacenamiento */ }
      $('#themeBtn').setAttribute('aria-pressed', t === 'dark');
    },
    toggle() { this.set(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); }
  };

  /* ---------- Arranque ---------- */
  function init() {
    Store.load(); Account.seed(); Account.bind(); Checkout.bind(); Theme.init();
    $('#catNav').innerHTML = `<button data-action="cat" data-cat="">Todo</button>` + categories.map(c => `<button data-action="cat" data-cat="${c}">${c}</button>`).join('');
    bindEvents(); Carousel.init(); startCountdown();
    UI.renderBadges(); UI.renderHome(); UI.renderCart(); UI.show('home');
  }
  document.addEventListener('DOMContentLoaded', init);
})();