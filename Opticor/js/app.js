/* Controlador: estado, cola de conversión y eventos */
(() => {
  document.documentElement.classList.add('js');

  const { $, $$, saveBlob, uniqueName, debounce } = EC.utils;
  const ui = EC.ui, el = ui.el;
  const KEY = 'ec-settings';
  // Menos conversiones en paralelo en equipos con poca memoria (evita que se cierre la pestaña)
  const LIMIT = (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 2 : Math.max(1, Math.min(4, navigator.hardwareConcurrency || 2));
  const DEFAULTS = { format: 'image/webp', quality: 80, resizeMode: 'none', maxWidth: 1920, maxHeight: 1080,
                     percent: 50, targetKB: 0, suffix: '', pattern: '', background: '#ffffff', rotate: 0, flipH: false,
                     flipV: false, upscale: false, keepSmaller: true, wmText: '', wmPos: 'corner', wmOpacity: 50, auto: true };
  const PRESETS = {
    web:    { format: 'image/webp', quality: 80, resizeMode: 'max', maxWidth: 1920, maxHeight: 1920, targetKB: 0 },
    social: { format: 'image/jpeg', quality: 85, resizeMode: 'max', maxWidth: 1080, maxHeight: 1080, targetKB: 0 },
    thumb:  { format: 'image/webp', quality: 70, resizeMode: 'max', maxWidth: 400, maxHeight: 400, targetKB: 0 },
    best:   { format: 'original', quality: 95, resizeMode: 'none', targetKB: 0 },
    tiny:   { format: 'image/webp', quality: 60, resizeMode: 'percent', percent: 50, targetKB: 0 }
  };

  const items = [];
  let seq = 0, active = 0, announce = false, thumbChain = Promise.resolve();

  // ---------- Ajustes ----------
  EC.converter.detect();
  ui.applySupport(EC.converter.supports);
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) ui.writeOptions(s); } catch (e) {}
  ui.syncControls();
  let opts = ui.readOptions();

  // ---------- Cola de conversión ----------
  const count = st => items.filter(i => st.includes(i.status)).length;

  function refreshToolbar() {
    const busy = active > 0 || count(['pending']) > 0;
    ui.setToolbar({ count: items.length, busy, todo: count(['idle', 'stale']), ready: count(['done']) });
    const total = count(['pending', 'processing', 'done', 'error']), done = count(['done', 'error']);
    ui.setProgress(busy ? done : 0, busy ? total : 0);
    ui.summary(items);
  }

  function pump() {
    while (active < LIMIT) {
      const item = items.find(i => i.status === 'pending');
      if (!item) break;
      item.status = 'processing';
      active++;
      const gen = item.gen, snapshot = opts;
      ui.updateRow(item);
      EC.converter.convert(item, snapshot)
        .then(r => { if (item.gen === gen) { item.result = r; item.error = null; item.status = 'done'; } })
        .catch(err => { if (item.gen === gen) { item.result = null; item.error = err.message; item.status = 'error'; } })
        .finally(() => { active--; ui.updateRow(item); afterWork(); pump(); });
    }
    refreshToolbar();
  }

  function afterWork() {
    refreshToolbar();
    if (active === 0 && count(['pending']) === 0 && announce) {
      announce = false;
      const ok = count(['done']), bad = count(['error']);
      let b = 0, a = 0;
      items.forEach(i => { if (i.status === 'done') { b += i.file.size; a += i.result.blob.size; } });
      if (ok) ui.toast(`✓ ${ok} ${ok === 1 ? 'imagen lista' : 'imágenes listas'}` + (b > a ? ` · ${Math.round((1 - a / b) * 100)}% menos peso` : ''));
      if (bad) ui.toast(`${bad} no se ${bad === 1 ? 'pudo' : 'pudieron'} convertir`);
    }
  }

  function queue(list) {
    list.forEach(i => { i.gen++; i.status = 'pending'; ui.updateRow(i); });
    if (list.length) announce = true;
    pump();
  }

  // ---------- Archivos ----------
  const handlers = {
    preview: item => ui.openPreview(item, items.filter(i => i.status === 'done' && i.result)),
    download: item => {
      try { saveBlob(item.result.blob, item.result.name); }
      catch (e) { ui.toast('No se pudo descargar. Prueba "Guardar en carpeta" o abre la página en una pestaña.'); }
    },
    remove: item => {
      if (item.removed) return;                     // evita quitar dos veces (y borrar otra imagen por error)
      item.gen++; item.removed = true; item.status = 'removed';
      ui.removeRow(item, () => {
        if (item.thumb) URL.revokeObjectURL(item.thumb);
        const k = items.indexOf(item);
        if (k > -1) items.splice(k, 1);
        refreshToolbar();
      });
    }
  };

  function addFiles(fileList) {
    const seen = new Set(items.map(i => i.key));
    let added = 0, skipped = 0;
    const fresh = [];
    const all = [...fileList];
    if (!all.length) return;                        // p. ej. pegar texto en un campo: no es un error
    for (const file of all) {
      if (!EC.utils.isImage(file)) continue;
      const key = `${file.name}|${file.size}|${file.lastModified}`;
      if (seen.has(key)) { skipped++; continue; }
      seen.add(key);
      const item = { id: ++seq, key, file, status: opts.auto ? 'pending' : 'idle', result: null, error: null, gen: 0 };
      items.push(item); fresh.push(item); added++;
      ui.addRow(item, handlers, fresh.length - 1);
      thumbChain = thumbChain.then(() => EC.converter.thumbnail(file)).then(url => {
        if (!url) return;
        if (item.removed) URL.revokeObjectURL(url); else { item.thumb = url; ui.setThumb(item, url); }
      }).catch(() => {});
    }
    if (!added && !skipped) { ui.toast('Solo se admiten archivos de imagen'); return; }
    ui.toast(added ? `${added} ${added === 1 ? 'imagen añadida' : 'imágenes añadidas'}` + (skipped ? ` · ${skipped} repetida${skipped === 1 ? '' : 's'}` : '') : 'Esas imágenes ya estaban en la lista');
    if (opts.auto) { announce = true; pump(); } else refreshToolbar();
  }

  // ---------- Cambios de ajustes ----------
  function optionsChanged() {
    const next = ui.readOptions();
    if (JSON.stringify(next) === JSON.stringify(opts)) return;
    opts = next;
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
    items.forEach(i => {
      if (i.removed || (i.status === 'idle' && !next.auto)) return;
      i.gen++;
      i.status = next.auto ? 'pending' : (['done', 'error', 'processing', 'pending'].includes(i.status) ? 'stale' : i.status);
      ui.updateRow(i);
    });
    if (next.auto && items.length) announce = true;
    pump();
  }
  const optionsChangedSoon = debounce(optionsChanged, 300);
  $$('.settings input, .settings select').forEach(c => c.addEventListener('input', () => { ui.syncControls(); optionsChangedSoon(); }));

  el.presets.addEventListener('click', e => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    ui.writeOptions(PRESETS[b.dataset.preset]);
    optionsChanged();
    ui.toast(`Ajuste "${b.textContent.trim()}" aplicado`);
  });
  el.resetBtn.addEventListener('click', () => { ui.writeOptions(DEFAULTS); optionsChanged(); });

  // ---------- Exportar ----------
  const readyFiles = () => {
    const used = {};
    return items.filter(i => i.status === 'done').map(i => ({ name: uniqueName(i.result.name, used), blob: i.result.blob }));
  };
  const guard = async (btn, label, fn) => {
    const old = btn.textContent; btn.disabled = true; btn.textContent = label;
    try { await fn(); } catch (err) { if (err.name !== 'AbortError') ui.toast('No se pudo completar: ' + err.message); }
    btn.textContent = old; refreshToolbar();
  };

  el.convertBtn.addEventListener('click', () => {
    const todo = items.filter(i => i.status === 'idle' || i.status === 'stale');
    queue(todo.length ? todo : items);
  });
  el.zipBtn.addEventListener('click', () => guard(el.zipBtn, 'Creando ZIP…', async () => {
    saveBlob(await EC.zip.create(readyFiles()), 'econverter-images.zip');
    ui.toast('ZIP listo');
  }));
  if (EC.utils.canFolder()) el.folderBtn.hidden = false;
  el.folderBtn.addEventListener('click', () => guard(el.folderBtn, 'Guardando…', async () => {
    const files = readyFiles();
    await EC.utils.saveToFolder(files);
    ui.toast(`${files.length} archivos guardados en la carpeta`);
  }));
  if (EC.utils.canShare()) el.shareBtn.hidden = false;
  el.shareBtn.addEventListener('click', () => guard(el.shareBtn, 'Compartiendo…', () => EC.utils.share(readyFiles())));
  el.clearBtn.addEventListener('click', () => [...items].forEach(handlers.remove));

  // ---------- Carga ----------
  el.dropzone.addEventListener('click', () => el.fileInput.click());
  el.dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.fileInput.click(); } });
  el.fileInput.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
  const hasFiles = ev => [...(ev.dataTransfer?.types || [])].includes('Files');
  ['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => {
    if (!hasFiles(e)) return;
    e.preventDefault(); el.dropzone.classList.add('is-over');
  }));
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) el.dropzone.classList.remove('is-over'); });
  document.addEventListener('drop', async e => {
    if (!hasFiles(e)) return;
    e.preventDefault(); el.dropzone.classList.remove('is-over');
    addFiles(await EC.utils.filesFromDrop(e.dataTransfer));   // admite también carpetas
  });
  document.addEventListener('paste', e => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) addFiles(files);
  });

  // ---------- Aviso si la página está incrustada (las descargas suelen bloquearse) ----------
  try {
    if (window.top !== window.self) {
      el.embedNotice.hidden = false;
      el.openTabBtn.onclick = () => window.open(location.href, '_blank');
      el.noticeClose.onclick = () => { el.embedNotice.hidden = true; };
    }
  } catch (e) { el.embedNotice.hidden = false; }

  // ---------- Efectos ----------
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (!btn || btn.disabled) return;
    const r = btn.getBoundingClientRect(), d = Math.max(r.width, r.height), s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    btn.append(s);
    setTimeout(() => s.remove(), 600);
  });

  document.addEventListener('mousemove', e => {
    const t = e.target.closest('[data-glow], .dropzone');
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    }), { threshold: .12 });
    revealEls.forEach(x => io.observe(x));
  } else revealEls.forEach(x => x.classList.add('is-visible'));

  el.themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ec-theme', next); } catch (e) {}
    el.themeBtn.classList.remove('spin'); void el.themeBtn.offsetWidth; el.themeBtn.classList.add('spin');
  });

  // ---------- Modo sin conexión (solo si se sirve por http/https) ----------
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  refreshToolbar();
})();
