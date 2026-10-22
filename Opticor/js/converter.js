/* Motor de conversión: API nativa de Canvas */
window.EC = window.EC || {};

EC.converter = {
  EXT: { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/avif': 'avif' },
  supports: { 'image/jpeg': true, 'image/png': true },

  /** Detecta qué formatos puede codificar este navegador */
  detect() {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    for (const t of ['image/webp', 'image/avif']) {
      this.supports[t] = c.toDataURL(t).startsWith('data:' + t);
    }
  },

  targetSize(w, h, o) {
    if (o.resizeMode === 'percent') {
      const s = (o.percent || 100) / 100;
      w *= s; h *= s;
    } else if (o.resizeMode === 'max') {
      const s = Math.min(1, (o.maxWidth || Infinity) / w, (o.maxHeight || Infinity) / h);
      w *= s; h *= s;
    }
    return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) };
  },

  resolveFormat(file, o) {
    if (o.format !== 'original') return this.supports[o.format] ? o.format : 'image/png';
    return this.supports[file.type] ? file.type : 'image/png';
  },

  /** Decodifica con createImageBitmap (rápido, fuera del hilo principal) o con <img> */
  async decode(file) {
    if ('createImageBitmap' in window) {
      try {
        const b = await createImageBitmap(file);
        return { source: b, width: b.width, height: b.height, close: () => b.close() };
      } catch (e) { /* cae al método clásico */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await EC.utils.loadImage(url);
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
    } catch (e) { URL.revokeObjectURL(url); throw e; }
  },

  encode: (canvas, type, q) => new Promise(r => canvas.toBlob(r, type, q)),

  /** Busca la mayor calidad que cabe en `limit` bytes (búsqueda binaria) */
  async fitToSize(canvas, type, limit, maxQ) {
    const top = await this.encode(canvas, type, maxQ);
    if (top.size <= limit) return top;
    let lo = 0.05, hi = maxQ, best = await this.encode(canvas, type, lo);
    if (best.size > limit) return best;           // ni a la calidad mínima cabe
    for (let i = 0; i < 6; i++) {
      const mid = (lo + hi) / 2, b = await this.encode(canvas, type, mid);
      if (b.size <= limit) { best = b; lo = mid; } else hi = mid;
    }
    return best;
  },

  async convert(item, o) {
    const d = await this.decode(item.file);
    try {
      const { width, height } = this.targetSize(d.width, d.height, o);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      const type = this.resolveFormat(item.file, o);

      if (type === 'image/jpeg') { ctx.fillStyle = o.background || '#ffffff'; ctx.fillRect(0, 0, width, height); }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(d.source, 0, 0, width, height);

      const q = o.quality / 100;
      const blob = (o.targetKB && type !== 'image/png')
        ? await this.fitToSize(canvas, type, o.targetKB * 1024, q)
        : await this.encode(canvas, type, q);
      canvas.width = canvas.height = 0;            // libera memoria
      if (!blob) throw new Error('El navegador no pudo codificar la imagen');

      const base = item.file.name.replace(/\.[^.]+$/, '');
      const suffix = (o.suffix || '').replace(/[\\/:*?"<>|]/g, '');
      const ext = this.EXT[blob.type] || 'png';
      return { blob, width, height, fromWidth: d.width, fromHeight: d.height, name: `${base}${suffix}.${ext}` };
    } finally { d.close(); }
  },

  /** Miniatura cuadrada (recorte centrado) como URL de objeto */
  async thumbnail(file, size = 104) {
    let d;
    try { d = await this.decode(file); } catch (e) { return null; }
    try {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const s = Math.max(size / d.width, size / d.height), w = d.width * s, h = d.height * s;
      c.getContext('2d').drawImage(d.source, (size - w) / 2, (size - h) / 2, w, h);
      const blob = await this.encode(c, 'image/jpeg', .72);
      return blob ? URL.createObjectURL(blob) : null;
    } finally { d.close(); }
  }
};
