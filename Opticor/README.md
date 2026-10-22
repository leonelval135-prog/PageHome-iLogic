# eConverter Images

Convierte, comprime y redimensiona imágenes en lote con la API nativa de Canvas.

## Estructura
```
econverter-images/
├── index.html
├── css/styles.css
└── js/
    ├── utils.js      # utilidades, descarga, carpeta y compartir
    ├── zip.js        # generador de ZIP propio (sin librerías)
    ├── converter.js  # motor Canvas: decodificar, redimensionar, codificar, peso objetivo
    ├── ui.js         # ajustes, filas (actualización incremental), vista previa, avisos
    └── app.js        # estado, cola de conversión y eventos
```

## Funciones
- Formatos: Original, WebP, JPG, PNG y AVIF (solo si el navegador puede codificarlo).
- Calidad, peso máximo por imagen (KB), redimensionado (máximo / porcentaje), sufijo en el nombre y color de fondo para JPG.
- Ajustes rápidos: Web, Redes sociales, Miniaturas, Mínimo peso, Máx. calidad. Los ajustes se recuerdan.
- Conversión automática al añadir o cambiar ajustes, con cola de hasta 4 imágenes en paralelo.
- Vista previa original vs convertida (flechas del teclado para navegar).
- Descarga individual, ZIP, guardar en carpeta (Chrome/Edge) y compartir (móvil).
- Detecta imágenes repetidas, tema claro/oscuro y respeta `prefers-reduced-motion`.

## Uso
Abre `index.html` directamente en tu navegador. No necesita internet ni servidor.
Si la ves incrustada en otra página (iframe), el navegador puede bloquear las descargas: ábrela en una pestaña propia.
