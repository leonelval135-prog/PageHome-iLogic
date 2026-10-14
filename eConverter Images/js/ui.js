/* Capa de interfaz: opciones, lista, avisos y animaciones */
window.EC = window.EC || {};

EC.ui = {
  els() {
    const { $ } = EC.utils;
    return {
      dropzone: $('#dropzone'), fileInput: $('#fileInput'),
      format: $('#format'), quality: $('#quality'), qualityValue: $('#qualityValue'),
      qualityField: $('#qualityField'), resizeMode: $('#resizeMode'),
      maxWidth: $('#maxWidth'), maxHeight: $('#maxHeight'), percent: $('#percent'),
      filesCard: $('#filesCard'), fileList: $('#fileList'), summary: $('#summary'),
      convertBtn: $('#convertBtn'), zipBtn: $('#zipBtn'), clearBtn: $('#clearBtn'),
      progress: $('#progress'), progressBar: $('#progressBar'), toasts: $('#toasts')
    };
  },

  readOptions() {
    const e = this.els();
    return {
      format: e.format.value,
      quality: +e.quality.value,
      resizeMode: e.resizeMode.value,
      maxWidth: +e.maxWidth.value,
      maxHeight: +e.maxHeight.value,
      percent: +e.percent.value
    };
  },

  syncControls() {
    const e = this.els();
    e.qualityValue.textContent = e.quality.value;
    e.qualityField.hidden = e.format.value === 'image/png';
    EC.utils.$$('[data-resize]').forEach(el => {
      const show = el.dataset.resize === e.resizeMode.value;
      if (show && el.hidden) { el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
      el.hidden = !show;
    });
  },

  setProgress(done, total) {
    const e = this.els();
    e.progress.hidden = done >= total;
    e.progressBar.style.width = total ? (done / total * 100) + '%' : '0';
  },

  toast(message, ms = 2800) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    this.els().toasts.append(t);
    setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 300); }, ms);
  },

  /** Anima un número de 0 al valor final */
  countUp(el, to, suffix = '%', ms = 700) {
    const start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  /** handlers: { onDownload(item), onRemove(item) } */
  renderList(items, handlers) {
    const e = this.els();
    const { formatBytes } = EC.utils;
    e.filesCard.hidden = items.length === 0;
    e.fileList.innerHTML = '';

    let before = 0, after = 0, done = 0, newIndex = 0;

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'file';
      item.el = li;

      if (!item.shown) {                       // entrada escalonada solo la primera vez
        li.classList.add('is-new');
        li.style.setProperty('--i', Math.min(newIndex++, 10));
        item.shown = true;
      }
      if (item.processing) li.classList.add('is-processing');
      if (item.result && !item.doneShown) { li.classList.add('is-done-new'); item.doneShown = true; }
      if (item.removing) li.classList.add('is-leaving');

      const thumb = document.createElement('img');
      thumb.className = 'file__thumb';
      thumb.src = item.src;
      thumb.alt = '';

      const info = document.createElement('div');
      info.className = 'file__info';
      const name = document.createElement('span');
      name.className = 'file__name';
      name.textContent = item.file.name;
      const meta = document.createElement('span');
      meta.className = 'file__meta';

      if (item.error) {
        const s = document.createElement('span');
        s.className = 'file__error';
        s.textContent = item.error;
        meta.append(s);
      } else if (item.processing) {
        meta.textContent = `${formatBytes(item.file.size)} · procesando…`;
      } else if (item.result) {
        const r = item.result;
        const pct = Math.round((1 - r.blob.size / item.file.size) * 100);
        meta.textContent = `${formatBytes(item.file.size)} → ${formatBytes(r.blob.size)} · ${r.width}×${r.height} · `;
        const s = document.createElement('span');
        if (pct > 0) s.className = 'file__saving';
        s.textContent = pct > 0 ? `-${pct}%` : `+${-pct}%`;
        meta.append(s);
        before += item.file.size; after += r.blob.size; done++;
      } else {
        meta.textContent = `${formatBytes(item.file.size)} · pendiente`;
      }
      info.append(name, meta);
      li.append(thumb, info);

      if (item.result && !item.processing) {
        const ok = document.createElement('span');
        ok.className = 'file__check';
        ok.textContent = '✓';
        li.append(ok);
      }

      const dl = document.createElement('button');
      dl.className = 'btn btn--sm';
      dl.textContent = 'Descargar';
      dl.disabled = !item.result || item.processing;
      dl.onclick = () => handlers.onDownload(item);

      const rm = document.createElement('button');
      rm.className = 'btn btn--sm btn--ghost';
      rm.textContent = '✕';
      rm.title = 'Quitar';
      rm.onclick = () => handlers.onRemove(item);

      li.append(dl, rm);
      e.fileList.append(li);
    });

    e.zipBtn.disabled = done === 0;

    // Resumen con porcentaje animado
    e.summary.textContent = '';
    if (done) {
      const total = document.createElement('span');
      total.textContent = `${formatBytes(before)} → ${formatBytes(after)}`;
      const saved = Math.round((1 - after / before) * 100);
      const pill = document.createElement('span');
      pill.className = 'pill' + (saved > 0 ? '' : ' pill--bad');
      e.summary.append(total, pill);
      if (saved > 0) this.countUp(pill, saved, '% menos');
      else pill.textContent = `+${-saved}%`;
    }
  }
};
