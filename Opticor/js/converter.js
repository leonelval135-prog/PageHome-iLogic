/* Motor de conversión: API nativa de Canvas */
window.EC = window.EC || {};

EC.converter = {
  EXT: { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/avif': 'avif' },
  supports: { 'image/jpeg': true, 'image/png': true },
  MAX_AREA: 268435456,          // límite de píxeles por canvas (16 MP en iOS/Safari)

  /** Detecta qué formatos puede codificar este navegador y el límite de canvas */
  detect() {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    for (const t of ['image/webp', 'image/avif']) {
      try { this.supports[t] = c.toDataURL(t).startsWith('data:' + t); } catch (e) { this.supports[t] = false; }
    }
    const ua = navigator.userAgent || '';
    const ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios) this.MAX_AREA = 16777216;
  },

  /** Tamaño final según el modo de redimensionado (nunca amplía salvo `upscale` o escala %) */
  targetSize(w, h, o) {
    let s = 1;
    const cap = v => (o.upscale ? v : Math.min(1, v));
    if (o.resizeMode === 'percent') s = (o.percent || 100) / 100;
    else if (o.resizeMode === 'max') s = Math.min(1, (o.maxWidth || Infinity) / w, (o.maxHeight || Infinity) / h);
    else if (o.resizeMode === 'width' && o.maxWidth) s = cap(o.maxWidth / w);
    else if (o.resizeMode === 'height' && o.maxHeight) s = cap(o.maxHeight / h);
    return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) };
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
      return { source: img, width: img.naturalWidth || 1024, height: img.naturalHeight || 1024, close: () => URL.revokeObjectURL(url) };
    } catch (e) {
      URL.revokeObjectURL(url);
      if (/hei[cf]/i.test(file.type + file.name)) throw new Error('HEIC/HEIF no es compatible con este navegador');
      throw e;
    }
  },

  encode: (canvas, type, q) => new Promise(r => canvas.toBlob(r, type, q)),

  /** Busca la mayor calidad que cabe en `limit` bytes (búsqueda binaria) */
  async fitToSize(canvas, type, limit, maxQ) {
    const top = await this.encode(canvas, type, maxQ);
    if (!top || top.size <= limit) return top;
    let lo = 0.05, hi = maxQ, best = await this.encode(canvas, type, lo);
    if (!best || best.size > limit) return best;   // ni a la calidad mínima cabe
    for (let i = 0; i < 6; i++) {
      const mid = (lo + hi) / 2, b = await this.encode(canvas, type, mid);
      if (b && b.size <= limit) { best = b; lo = mid; } else hi = mid;
    }
    return best;
  },

  /** Reduce a mitades sucesivas: mucho mejor calidad que un solo salto grande */
  stepDown(source, sw, sh, tw, th) {
    let cur = source, cw = sw, ch = sh;
    const made = [];
    while (cw / 2 >= tw && ch / 2 >= th) {
      const nw = Math.max(tw, Math.floor(cw / 2)), nh = Math.max(th, Math.floor(ch / 2));
      const c = document.createElement('canvas');
      c.width = nw; c.height = nh;
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(cur, 0, 0, nw, nh);
      made.push(c); cur = c; cw = nw; ch = nh;
    }
    return { src: cur, w: cw, h: ch, release: () => made.forEach(c => { c.width = c.height = 0; }) };
  },

  /** Marca de agua de texto: centro, esquina o mosaico */
  watermark(ctx, w, h, o) {
    const text = (o.wmText || '').trim();
    if (!text) return;
    const size = Math.max(12, Math.round(Math.min(w, h) * 0.05));
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0.05, (o.wmOpacity || 50) / 100));
    ctx.font = `700 ${size}px system-ui, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.65)';
    ctx.shadowBlur = size * 0.2;
    if (o.wmPos === 'tile') {
      ctx.rotate(-Math.PI / 6);
      const sw = ctx.measureText(text).width + size * 3, sh = size * 4, d = Math.hypot(w, h);
      for (let y = -d; y < d; y += sh) for (let x = -d; x < d; x += sw) ctx.fillText(text, x, y);
    } else if (o.wmPos === 'center') {
      ctx.textAlign = 'center'; ctx.fillText(text, w / 2, h / 2);
    } else {
      ctx.textAlign = 'right'; ctx.fillText(text, w - size * 0.8, h - size);
    }
    ctx.restore();
  },

  /** Nombre final: plantilla ({nombre} {n} {ancho} {alto} {fecha}) + sufijo + extensión */
  buildName(item, o, w, h, ext) {
    const clean = s => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim();
    const base = clean(item.file.name.replace(/\.[^.]+$/, '')) || 'imagen';
    const pat = clean(o.pattern) || '{nombre}';
    let out = pat
      .replace(/\{nombre\}/gi, base).replace(/\{n\}/gi, String(item.id))
      .replace(/\{ancho\}/gi, w).replace(/\{alto\}/gi, h)
      .replace(/\{fecha\}/gi, new Date().toISOString().slice(0, 10));
    out = (out + clean(o.suffix)).replace(/[. ]+$/, '').slice(0, 120) || 'imagen';
    return `${out}.${ext}`;
  },

  async convert(item, o) {
    const d = await this.decode(item.file);
    try {
      const rot = (((+o.rotate || 0) % 360) + 360) % 360, swap = rot === 90 || rot === 270;
      const bw = swap ? d.height : d.width, bh = swap ? d.width : d.height;
      let { width, height } = this.targetSize(bw, bh, o);
      let clamped = false;
      if (width * height > this.MAX_AREA) {
        const k = Math.sqrt(this.MAX_AREA / (width * height));
        width = Math.max(1, Math.floor(width * k)); height = Math.max(1, Math.floor(height * k)); clamped = true;
      }
      const type = this.resolveFormat(item.file, o);
      const q = o.quality / 100;
      const limit = o.targetKB ? o.targetKB * 1024 : 0;
      const transformed = rot !== 0 || o.flipH || o.flipV || !!(o.wmText || '').trim();

      const render = (w, h) => {
        const tw = swap ? h : w, th = swap ? w : h;     // tamaño antes de rotar
        const base = this.stepDown(d.source, d.width, d.height, tw, th);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (type === 'image/jpeg') { ctx.fillStyle = o.background || '#ffffff'; ctx.fillRect(0, 0, w, h); }
        ctx.imageSmoothingQuality = 'high';
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(rot * Math.PI / 180);
        if (o.flipH) ctx.scale(-1, 1);
        if (o.flipV) ctx.scale(1, -1);
        ctx.drawImage(base.src, 0, 0, base.w, base.h, -tw / 2, -th / 2, tw, th);
        ctx.restore();
        base.release();
        this.watermark(ctx, w, h, o);
        return canvas;
      };

      // Codifica; si hay peso máximo y no cabe ni a la calidad mínima, reduce las dimensiones
      let w = width, h = height, blob = null, shrunk = false;
      for (let tries = 0; ; tries++) {
        const canvas = render(w, h);
        blob = (limit && type !== 'image/png')
          ? await this.fitToSize(canvas, type, limit, q)
          : await this.encode(canvas, type, q);
        canvas.width = canvas.height = 0;               // libera memoria
        if (!blob) throw new Error('El navegador no pudo codificar la imagen (¿imagen demasiado grande?)');
        if (!limit || blob.size <= limit || tries >= 12 || Math.min(w, h) <= 32) break;
        const k = Math.max(0.5, Math.min(0.9, Math.sqrt(limit / blob.size) * 0.95));
        w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k)); shrunk = true;
      }

      const ext = this.EXT[blob.type] || 'png';
      const res = {
        blob, width: w, height: h, fromWidth: d.width, fromHeight: d.height,
        shrunk, clamped, missedTarget: !!limit && blob.size > limit, kept: false,
        name: this.buildName(item, o, w, h, ext)
      };

      // Si no mejora el peso y el formato es el mismo, conserva el archivo original
      if (o.keepSmaller && !transformed && !limit && blob.type === item.file.type &&
          w === d.width && h === d.height && blob.size >= item.file.size) {
        res.blob = item.file; res.kept = true;
      }
      return res;
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
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(d.source, (size - w) / 2, (size - h) / 2, w, h);
      const blob = await this.encode(c, 'image/jpeg', .72);
      return blob ? URL.createObjectURL(blob) : null;
    } finally { d.close(); }
  }
};
