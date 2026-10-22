/* Utilidades generales de eConverter Images */
window.EC = window.EC || {};

EC.utils = {
  $: (s, r = document) => r.querySelector(s),
  $$: (s, r = document) => [...r.querySelectorAll(s)],
  tick: () => new Promise(r => setTimeout(r)),

  formatBytes(b) {
    return b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB';
  },

  debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },

  loadImage(src) {
    return new Promise((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error('No se pudo leer la imagen (formato no compatible)'));
      i.src = src;
    });
  },

  /** Descarga un Blob. La URL se libera tras 60 s para no cortar descargas lentas. */
  saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  /** foto.webp, foto-2.webp… cuando hay nombres repetidos */
  uniqueName(name, used) {
    if (!used[name]) { used[name] = 1; return name; }
    return name.replace(/(\.\w+)$/, `-${++used[name]}$1`);
  },

  canFolder: () => 'showDirectoryPicker' in window && window.isSecureContext,
  async saveToFolder(files) {
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
    const used = {};
    for (const f of files) {
      const fh = await dir.getFileHandle(EC.utils.uniqueName(f.name, used), { create: true });
      const w = await fh.createWritable();
      await w.write(f.blob);
      await w.close();
    }
  },

  canShare() {
    try { return !!navigator.canShare && navigator.canShare({ files: [new File([''], 'a.png', { type: 'image/png' })] }); }
    catch (e) { return false; }
  },
  async share(files) {
    const list = files.map(f => new File([f.blob], f.name, { type: f.blob.type }));
    await navigator.share({ files: list, title: 'eConverter Images' });
  }
};
