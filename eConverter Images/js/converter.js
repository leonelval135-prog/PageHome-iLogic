/* Motor de conversión: usa la API nativa de Canvas */
window.EC = window.EC || {};

EC.converter = {
  EXTENSIONS: { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' },

  /** Calcula el tamaño final según el modo de redimensionado (conserva proporción). */
  targetSize(width, height, opts) {
    let w = width, h = height;
    if (opts.resizeMode === 'percent') {
      const scale = (opts.percent || 100) / 100;
      w *= scale; h *= scale;
    } else if (opts.resizeMode === 'max') {
      const scale = Math.min(1, (opts.maxWidth || Infinity) / w, (opts.maxHeight || Infinity) / h);
      w *= scale; h *= scale;
    }
    return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) };
  },

  /** Convierte un elemento { file, src } y devuelve { blob, width, height, name }. */
  async convert(item, opts) {
    const img = await EC.utils.loadImage(item.src);
    const { width, height } = this.targetSize(img.naturalWidth, img.naturalHeight, opts);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (opts.format === 'image/jpeg') {      // JPG no admite transparencia
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, opts.format, opts.quality / 100));
    if (!blob) throw new Error('El navegador no pudo codificar la imagen');

    const ext = this.EXTENSIONS[blob.type] || 'png';   // por si el navegador cae a PNG
    const base = item.file.name.replace(/\.[^.]+$/, '');
    return { blob, width, height, name: `${base}.${ext}` };
  }
};
