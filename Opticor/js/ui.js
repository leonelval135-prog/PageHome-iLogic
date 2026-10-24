/* Capa de interfaz: ajustes, filas (actualización incremental), resumen, vista previa y avisos */
window.EC = window.EC || {};

EC.ui = (() => {
  const { formatBytes, saveBlob } = EC.utils;
  const e = {};
  ['dropzone', 'fileInput', 'quality', 'qualityValue', 'qualityField', 'targetField', 'targetKB',
   'maxWidth', 'maxHeight', 'percent', 'suffix', 'background', 'auto', 'filesCard', 'fileList',
   'summary', 'convertBtn', 'zipBtn', 'folderBtn', 'shareBtn', 'clearBtn', 'progress', 'progressBar',
   'toasts', 'modal', 'mOrig', 'mNew', 'mInfo', 'mPrev', 'mNext', 'mDl', 'mClose', 'embedNotice',
   'openTabBtn', 'noticeClose', 'resetBtn', 'presets', 'themeBtn', 'pattern', 'rotate', 'flipH', 'flipV',
   'upscale', 'keepSmaller', 'wmText', 'wmPos', 'wmOpacity', 'wmOpacityValue', 'mImgs', 'mCmp', 'cOrig',
   'cNew', 'cRange', 'mMode'
  ].forEach(id => { e[id] = document.getElementById(id); });

  const radio = name => document.querySelector(`input[name="${name}"]:checked`);

  /* ---------- Ajustes ---------- */
  function readOptions() {
    return {
      format: radio('format').value,
      quality: +e.quality.value,
      targetKB: +e.targetKB.value || 0,
      resizeMode: radio('resize').value,
      maxWidth: +e.maxWidth.value || 0,
      maxHeight: +e.maxHeight.value || 0,
      percent: +e.percent.value || 100,
      suffix: e.suffix.value.trim(),
      pattern: e.pattern.value.trim(),
      background: e.background.value,
      rotate: +e.rotate.value || 0,
      flipH: e.flipH.checked,
      flipV: e.flipV.checked,
      upscale: e.upscale.checked,
      keepSmaller: e.keepSmaller.checked,
      wmText: e.wmText.value.trim(),
      wmPos: e.wmPos.value,
      wmOpacity: +e.wmOpacity.value || 50,
      auto: e.auto.checked
    };
  }

  function writeOptions(o) {
    const set = (name, v) => {
      const r = document.querySelector(`input[name="${name}"][value="${v}"]`);
      if (r && !r.disabled) r.checked = true;
    };
    if (o.format !== undefined) set('format', o.format);
    if (o.resizeMode !== undefined) set('resize', o.resizeMode);
    if (o.quality !== undefined) e.quality.value = o.quality;
    if ('targetKB' in o) e.targetKB.value = o.targetKB || '';
    ['maxWidth', 'maxHeight', 'percent', 'suffix', 'pattern', 'background', 'rotate', 'wmText', 'wmPos', 'wmOpacity']
      .forEach(k => { if (o[k] !== undefined) e[k].value = o[k]; });
    ['flipH', 'flipV', 'upscale', 'keepSmaller', 'auto'].forEach(k => { if (o[k] !== undefined) e[k].checked = !!o[k]; });
    syncControls();
  }

  function applySupport(sup) {
    document.querySelectorAll('input[name="format"]').forEach(r => {
      if (r.value.startsWith('image/') && sup[r.value] === false) { r.disabled = true; r.parentElement.hidden = true; }
    });
  }

  function syncControls() {
    const png = radio('format').value === 'image/png', mode = radio('resize').value;
    e.qualityValue.textContent = e.quality.value;
    e.wmOpacityValue.textContent = e.wmOpacity.value;
    e.qualityField.hidden = png;                      // el peso máximo sirve también para PNG (reduce dimensiones)
    document.querySelectorAll('[data-resize]').forEach(el => { el.hidden = !el.dataset.resize.split(' ').includes(mode); });
  }

  /* ---------- Avisos y números ---------- */
  function toast(msg, ms = 2800) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    e.toasts.append(t);
    setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 300); }, ms);
  }

  function countUp(el, from, to, suffix, ms = 600) {
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / ms);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Filas (se crean una vez y se actualizan en sitio) ---------- */
  function addRow(item, h, index) {
    const li = document.createElement('li');
    li.className = 'file is-new';
    li.style.setProperty('--i', Math.min(index, 10));
    li.innerHTML =
      '<span class="file__tb" title="Vista previa"><img class="file__thumb" alt="" decoding="async"></span>' +
      '<div class="file__info"><span class="file__name"></span><span class="file__meta"></span></div>' +
      '<span class="file__check" hidden>✓</span>' +
      '<button class="btn btn--sm" data-a="prev">Ver</button>' +
      '<button class="btn btn--sm" data-a="dl">Descargar</button>' +
      '<button class="btn btn--sm btn--ghost" data-a="rm" title="Quitar">✕</button>';
    const q = s => li.querySelector(s);
    item.ui = { li, img: q('img'), name: q('.file__name'), meta: q('.file__meta'), check: q('.file__check'), dl: q('[data-a=dl]'), prev: q('[data-a=prev]') };
    item.ui.name.textContent = item.file.name;
    q('.file__tb').onclick = item.ui.prev.onclick = () => h.preview(item);
    item.ui.dl.onclick = () => h.download(item);
    q('[data-a=rm]').onclick = () => h.remove(item);
    e.fileList.append(li);
    updateRow(item);
  }

  function updateRow(item) {
    const u = item.ui; if (!u) return;
    const st = item.status, r = item.result;
    u.li.classList.toggle('is-processing', st === 'processing');
    u.meta.replaceChildren();
    const txt = s => u.meta.append(document.createTextNode(s));

    if (st === 'done' && r) {
      const p = item.file.size ? Math.round((1 - r.blob.size / item.file.size) * 100) : 0;
      txt(`${formatBytes(item.file.size)} → ${formatBytes(r.blob.size)} · ${r.width}×${r.height} · `);
      const s = document.createElement('span');
      if (p > 0) s.className = 'file__saving';
      s.textContent = p > 0 ? `-${p}%` : p < 0 ? `+${-p}%` : '0%';
      u.meta.append(s);
      const note = r.kept ? 'se conservó el original (ya era más ligero)'
        : r.missedTarget ? 'no se alcanzó el peso máximo'
        : r.shrunk ? 'dimensiones reducidas para cumplir el peso'
        : r.clamped ? 'reducida por el límite de tamaño del navegador' : '';
      if (note) {
        const n = document.createElement('span');
        n.className = 'file__note'; n.textContent = ' · ' + note;
        u.meta.append(n);
      }
    } else if (st === 'error') {
      const s = document.createElement('span');
      s.className = 'file__error'; s.textContent = item.error;
      u.meta.append(s);
    } else {
      const label = { processing: 'procesando…', pending: 'en cola…', stale: 'ajustes cambiados · pulsa Convertir', idle: 'pendiente' }[st];
      txt(`${formatBytes(item.file.size)} · ${label}`);
    }

    const done = st === 'done' && r;
    u.check.hidden = !done;
    u.dl.disabled = u.prev.disabled = !done;
    if (done && !item.doneShown) {
      item.doneShown = true;
      u.li.classList.add('is-done-new');
      setTimeout(() => u.li.classList.remove('is-done-new'), 900);
    }
    setTimeout(() => u.li.classList.remove('is-new'), 900);
  }

  function setThumb(item, url) { if (item.ui) item.ui.img.src = url; }

  function removeRow(item, done) {
    if (!item.ui) return done();
    item.ui.li.classList.add('is-leaving');
    setTimeout(() => { item.ui.li.remove(); done(); }, 250);
  }

  /* ---------- Barra de herramientas, progreso y resumen ---------- */
  function setToolbar({ count, busy, todo, ready }) {
    e.filesCard.hidden = !count;
    e.dropzone.classList.toggle('is-compact', count > 0);
    e.convertBtn.textContent = busy ? 'Procesando…' : todo ? `Convertir (${todo})` : 'Reconvertir';
    e.convertBtn.disabled = busy;
    e.zipBtn.disabled = e.folderBtn.disabled = e.shareBtn.disabled = !ready;
  }

  function setProgress(done, total) {
    e.progress.hidden = !total || done >= total;
    e.progressBar.style.width = total ? (done / total * 100) + '%' : '0';
  }

  const sum = { text: document.createElement('span'), pill: document.createElement('span'), raf: 0, last: 0 };
  sum.pill.className = 'pill';
  e.summary.append(sum.text, sum.pill);

  function summary(items) {
    cancelAnimationFrame(sum.raf);
    sum.raf = requestAnimationFrame(() => {
      let before = 0, after = 0, n = 0;
      for (const i of items) if (i.status === 'done' && i.result) { before += i.file.size; after += i.result.blob.size; n++; }
      e.summary.hidden = !n;
      if (!n) { sum.last = 0; return; }
      sum.text.textContent = `${n} ${n === 1 ? 'imagen' : 'imágenes'} · ${formatBytes(before)} → ${formatBytes(after)}`;
      const saved = before ? Math.round((1 - after / before) * 100) : 0;
      sum.pill.classList.toggle('pill--bad', saved <= 0);
      if (saved > 0) countUp(sum.pill, sum.last, saved, '% menos'); else sum.pill.textContent = `+${-saved}%`;
      sum.last = Math.max(saved, 0);
    });
  }

  /* ---------- Vista previa (lado a lado o deslizador) ---------- */
  const pv = { list: [], i: 0, a: null, b: null, slider: false, from: null };
  function setMode(slider) {
    pv.slider = slider;
    e.mImgs.hidden = slider; e.mCmp.hidden = !slider;
    e.mMode.textContent = slider ? 'Lado a lado' : 'Deslizador';
  }
  function showPreview() {
    const it = pv.list[pv.i], r = it.result;
    URL.revokeObjectURL(pv.a); URL.revokeObjectURL(pv.b);
    pv.a = URL.createObjectURL(it.file); pv.b = URL.createObjectURL(r.blob);
    e.mOrig.src = e.cOrig.src = pv.a; e.mNew.src = e.cNew.src = pv.b;
    const p = it.file.size ? Math.round((1 - r.blob.size / it.file.size) * 100) : 0;
    e.mInfo.textContent = `${r.name} · ${r.fromWidth}×${r.fromHeight} → ${r.width}×${r.height} · ${formatBytes(it.file.size)} → ${formatBytes(r.blob.size)} (${p > 0 ? '-' + p : '+' + -p}%)`;
    e.mPrev.disabled = pv.i === 0; e.mNext.disabled = pv.i === pv.list.length - 1;
  }
  function openPreview(item, list) {
    pv.list = list; pv.i = Math.max(0, list.indexOf(item)); pv.from = document.activeElement;
    e.cRange.value = 50; e.mCmp.style.setProperty('--pos', '50%');
    setMode(pv.slider);
    showPreview(); e.modal.hidden = false; e.mClose.focus();
    document.body.style.overflow = 'hidden';
  }
  function closePreview() {
    e.modal.hidden = true;
    document.body.style.overflow = '';
    URL.revokeObjectURL(pv.a); URL.revokeObjectURL(pv.b);
    e.mOrig.removeAttribute('src'); e.mNew.removeAttribute('src');
    e.cOrig.removeAttribute('src'); e.cNew.removeAttribute('src');
    if (pv.from && pv.from.focus) pv.from.focus();
  }
  const move = d => { const n = pv.i + d; if (n >= 0 && n < pv.list.length) { pv.i = n; showPreview(); } };
  e.mClose.onclick = closePreview;
  e.mPrev.onclick = () => move(-1);
  e.mNext.onclick = () => move(1);
  e.mMode.onclick = () => setMode(!pv.slider);
  e.cRange.addEventListener('input', () => e.mCmp.style.setProperty('--pos', e.cRange.value + '%'));
  e.mDl.onclick = () => saveBlob(pv.list[pv.i].result.blob, pv.list[pv.i].result.name);
  e.modal.addEventListener('click', ev => { if (ev.target === e.modal) closePreview(); });
  document.addEventListener('keydown', ev => {
    if (e.modal.hidden) return;
    if (ev.key === 'Escape') closePreview();
    if (ev.target !== e.cRange && ev.key === 'ArrowLeft') move(-1);
    if (ev.target !== e.cRange && ev.key === 'ArrowRight') move(1);
    if (ev.key === 'Tab') {                         // mantiene el foco dentro del cuadro
      const f = [...e.modal.querySelectorAll('button:not([disabled]), input:not([hidden])')].filter(x => x.offsetParent);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
  });

  return { el: e, readOptions, writeOptions, applySupport, syncControls, toast, addRow, updateRow, setThumb,
           removeRow, setToolbar, setProgress, summary, openPreview };
})();
