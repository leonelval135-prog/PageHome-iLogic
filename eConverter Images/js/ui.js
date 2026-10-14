/* Capa de interfaz: lee opciones y pinta la lista */
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
      progress: $('#progress'), progressBar: $('#progressBar')
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
      el.hidden = el.dataset.resize !== e.resizeMode.value;
    });
  },

  setProgress(done, total) {
    const e = this.els();
    e.progress.hidden = done >= total;
    e.progressBar.style.width = total ? (done / total * 100) + '%' : '0';
  },

  /** handlers: { onDownload(item), onRemove(item) } */
  renderList(items, handlers) {
    const e = this.els();
    const { formatBytes } = EC.utils;
    e.filesCard.hidden = items.length === 0;
    e.fileList.innerHTML = '';

    let before = 0, after = 0, done = 0;

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'file';

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
        meta.innerHTML = '<span class="file__error"></span>';
        meta.firstChild.textContent = item.error;
      } else if (item.result) {
        const r = item.result;
        const pct = Math.round((1 - r.blob.size / item.file.size) * 100);
        const saving = pct > 0 ? `-${pct}%` : `+${-pct}%`;
        meta.textContent = `${formatBytes(item.file.size)} → ${formatBytes(r.blob.size)} · ${r.width}×${r.height} · `;
        const s = document.createElement('span');
        if (pct > 0) s.className = 'file__saving';
        s.textContent = saving;
        meta.append(s);
        before += item.file.size; after += r.blob.size; done++;
      } else {
        meta.textContent = `${formatBytes(item.file.size)} · pendiente`;
      }
      info.append(name, meta);

      const dl = document.createElement('button');
      dl.className = 'btn btn--sm';
      dl.textContent = 'Descargar';
      dl.disabled = !item.result;
      dl.onclick = () => handlers.onDownload(item);

      const rm = document.createElement('button');
      rm.className = 'btn btn--sm btn--ghost';
      rm.textContent = '✕';
      rm.title = 'Quitar';
      rm.onclick = () => handlers.onRemove(item);

      li.append(thumb, info, dl, rm);
      e.fileList.append(li);
    });

    e.zipBtn.disabled = done === 0;
    e.summary.textContent = done ? `Total: ${formatBytes(before)} → ${formatBytes(after)}` : '';
  }
};
