/* Controlador principal: estado, eventos y efectos */
(() => {
  document.documentElement.classList.add('js');

  const { saveBlob, uniqueName, tick, $, $$ } = EC.utils;
  const ui = EC.ui;
  const els = ui.els();
  const items = [];

  const refresh = () => ui.renderList(items, handlers);

  const handlers = {
    onDownload: item => saveBlob(item.result.blob, item.result.name),
    onRemove: item => {
      if (item.removing) return;
      item.removing = true;
      item.el && item.el.classList.add('is-leaving');
      setTimeout(() => {
        URL.revokeObjectURL(item.src);
        const i = items.indexOf(item);
        if (i > -1) items.splice(i, 1);
        refresh();
      }, 250);
    }
  };

  function addFiles(fileList) {
    let added = 0;
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue;
      items.push({ file, src: URL.createObjectURL(file), result: null, error: null });
      added++;
    }
    if (added) { refresh(); ui.toast(`${added} ${added === 1 ? 'imagen añadida' : 'imágenes añadidas'}`); }
  }

  async function convertAll() {
    if (!items.length) return;
    const opts = ui.readOptions();
    els.convertBtn.disabled = true;
    items.forEach(i => { i.doneShown = false; });
    let ok = 0, fail = 0, before = 0, after = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      els.convertBtn.textContent = `Procesando ${i + 1}/${items.length}…`;
      ui.setProgress(i, items.length);
      item.processing = true;
      refresh();
      await tick();
      try {
        item.result = await EC.converter.convert(item, opts);
        item.error = null;
        ok++; before += item.file.size; after += item.result.blob.size;
      } catch (err) {
        item.result = null;
        item.error = err.message;
        fail++;
      }
      item.processing = false;
      refresh();
      await new Promise(r => setTimeout(r, 120));   // pausa corta para que se vea la animación
    }

    ui.setProgress(items.length, items.length);
    els.convertBtn.textContent = 'Convertir';
    els.convertBtn.disabled = false;
    refresh();

    if (ok) {
      const saved = Math.round((1 - after / before) * 100);
      ui.toast(`✓ ${ok} ${ok === 1 ? 'imagen convertida' : 'imágenes convertidas'}` + (saved > 0 ? ` · ${saved}% menos peso` : ''));
    }
    if (fail) ui.toast(`${fail} no se pudo${fail === 1 ? '' : 'ieron'} convertir`);
  }

  async function downloadZip() {
    const ready = items.filter(i => i.result);
    if (!window.JSZip) {   // sin JSZip (p. ej. sin internet): descargas sueltas
      ready.forEach((i, n) => setTimeout(() => handlers.onDownload(i), n * 300));
      return;
    }
    const zip = new JSZip(), used = {};
    ready.forEach(i => zip.file(uniqueName(i.result.name, used), i.result.blob));
    saveBlob(await zip.generateAsync({ type: 'blob' }), 'econverter-images.zip');
    ui.toast('ZIP descargado');
  }

  // ---------- Carga de archivos ----------
  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.dropzone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
  });
  els.fileInput.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });

  ['dragenter', 'dragover'].forEach(ev =>
    els.dropzone.addEventListener(ev, e => { e.preventDefault(); els.dropzone.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(ev =>
    els.dropzone.addEventListener(ev, e => { e.preventDefault(); els.dropzone.classList.remove('is-over'); }));
  els.dropzone.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  document.addEventListener('paste', e => addFiles(e.clipboardData?.files || []));

  // ---------- Opciones y botones ----------
  [els.format, els.quality, els.resizeMode].forEach(el => el.addEventListener('input', () => ui.syncControls()));
  els.convertBtn.addEventListener('click', convertAll);
  els.zipBtn.addEventListener('click', downloadZip);
  els.clearBtn.addEventListener('click', () => {
    items.forEach(i => { i.removing = true; i.el && i.el.classList.add('is-leaving'); });
    setTimeout(() => {
      items.forEach(i => URL.revokeObjectURL(i.src));
      items.length = 0;
      refresh();
    }, 250);
  });

  // ---------- Efectos ----------
  // Ondas al pulsar botones
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (!btn || btn.disabled) return;
    const r = btn.getBoundingClientRect();
    const d = Math.max(r.width, r.height);
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    btn.append(s);
    setTimeout(() => s.remove(), 600);
  });

  // Brillo que sigue al cursor
  document.addEventListener('mousemove', e => {
    const t = e.target.closest('[data-glow], .dropzone');
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  // Aparición al hacer scroll
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    }), { threshold: .12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // Tema claro/oscuro
  const themeBtn = $('#themeBtn');
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ec-theme', next); } catch (e) {}
    themeBtn.classList.remove('spin'); void themeBtn.offsetWidth; themeBtn.classList.add('spin');
  });

  ui.syncControls();
})();
