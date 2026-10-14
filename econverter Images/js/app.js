/* Controlador principal: estado y eventos */
(() => {
  const { saveBlob, uniqueName, tick } = EC.utils;
  const ui = EC.ui;
  const els = ui.els();
  const items = [];

  const handlers = {
    onDownload: item => saveBlob(item.result.blob, item.result.name),
    onRemove: item => {
      URL.revokeObjectURL(item.src);
      items.splice(items.indexOf(item), 1);
      refresh();
    }
  };

  const refresh = () => ui.renderList(items, handlers);

  function addFiles(fileList) {
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue;
      items.push({ file, src: URL.createObjectURL(file), result: null, error: null });
    }
    refresh();
  }

  async function convertAll() {
    const opts = ui.readOptions();
    els.convertBtn.disabled = true;
    for (let i = 0; i < items.length; i++) {
      els.convertBtn.textContent = `Procesando ${i + 1}/${items.length}…`;
      ui.setProgress(i, items.length);
      const item = items[i];
      try {
        item.result = await EC.converter.convert(item, opts);
        item.error = null;
      } catch (err) {
        item.result = null;
        item.error = err.message;
      }
      await tick();   // deja respirar a la interfaz
    }
    ui.setProgress(items.length, items.length);
    els.convertBtn.textContent = 'Convertir';
    els.convertBtn.disabled = false;
    refresh();
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
  }

  // --- Eventos ---
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

  [els.format, els.quality, els.resizeMode].forEach(el => el.addEventListener('input', () => ui.syncControls()));
  els.convertBtn.addEventListener('click', convertAll);
  els.zipBtn.addEventListener('click', downloadZip);
  els.clearBtn.addEventListener('click', () => {
    items.forEach(i => URL.revokeObjectURL(i.src));
    items.length = 0;
    refresh();
  });

  ui.syncControls();
})();
