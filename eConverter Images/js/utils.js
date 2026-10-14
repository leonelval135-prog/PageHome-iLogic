/* Utilidades generales de eConverter Images */
window.EC = window.EC || {};

EC.utils = {
  $: (selector, root = document) => root.querySelector(selector),
  $$: (selector, root = document) => [...root.querySelectorAll(selector)],

  formatBytes(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(1) + ' KB';
  },

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = src;
    });
  },

  saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  /** Evita nombres repetidos dentro del ZIP: foto.webp, foto-2.webp… */
  uniqueName(name, used) {
    if (!used[name]) { used[name] = 1; return name; }
    const n = ++used[name];
    return name.replace(/(\.\w+)$/, `-${n}$1`);
  },

  tick: () => new Promise(resolve => setTimeout(resolve))
};
