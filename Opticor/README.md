# eConverter Images

Convierte, comprime y redimensiona imágenes en lote con la API nativa de Canvas.

## Estructura
```
Opticor/
├── index.html
├── manifest.webmanifest   # instalable como app (PWA)
(los iconos se cargan de la carpeta externa ../assets/logos/Opticor/)
├── sw.js                  # modo sin conexión (solo con http/https)
├── css/styles.css
└── js/
    ├── utils.js      # utilidades, descarga, carpetas, nombres únicos
    ├── zip.js        # generador de ZIP propio (sin librerías)
    ├── converter.js  # motor Canvas: decodificar, girar, redimensionar, marca de agua, peso objetivo
    ├── ui.js         # ajustes, filas, vista previa (lado a lado y deslizador), avisos
    └── app.js        # estado, cola de conversión y eventos
```

## Funciones
- Formatos: Original, WebP, JPG, PNG y AVIF (solo si el navegador puede codificarlo). SVG, GIF, BMP e ICO como entrada.
- Calidad y **peso máximo por imagen (KB)**: ajusta la calidad y, si aun así no cabe (o es PNG), reduce las dimensiones.
- Tamaño: original, máximo (ancho × alto), escala %, **ancho fijo** y **alto fijo** (con opción de ampliar). Reducción por pasos para mejor nitidez.
- **Girar y voltear**, **marca de agua de texto** (esquina, centro o mosaico) y color de fondo para JPG.
- **Plantilla de nombre**: `{nombre}`, `{n}`, `{ancho}`, `{alto}`, `{fecha}` + sufijo.
- **Conserva el original** si la conversión no reduce el peso (mismo formato y tamaño).
- Ajustes rápidos: Web, Redes sociales, Miniaturas, Mínimo peso, Máx. calidad. Los ajustes se recuerdan.
- Conversión automática, cola en paralelo (se adapta a la memoria del equipo).
- Carga por clic, arrastrar, pegar (Ctrl+V) o **soltar carpetas completas**.
- Vista previa **lado a lado o con deslizador**, navegación con flechas y foco controlado.
- Descarga individual, ZIP, guardar en carpeta (Chrome/Edge) y compartir (móvil).
- Detecta imágenes repetidas, tema claro/oscuro, `prefers-reduced-motion` y funciona sin conexión.

## Correcciones respecto a la versión anterior
- Pegar texto en cualquier campo mostraba el aviso "Solo se admiten archivos de imagen".
- Pulsar ✕ dos veces rápido podía borrar otra imagen de la lista.
- Imágenes quitadas o "Limpiar" podían seguir convirtiéndose en segundo plano.
- Al desactivar la conversión automática, las imágenes en cola se convertían igual.
- El peso máximo se ignoraba en PNG y, si no cabía a calidad mínima, se superaba en silencio.
- Imágenes enormes podían salir en blanco por el límite de canvas (16 MP en iOS): ahora se ajustan y se avisa.
- SVG sin dimensiones y HEIC/HEIF dan un mensaje claro; se aceptan archivos por extensión aunque el sistema no informe el tipo.
- Nombres duplicados distintos solo en mayúsculas ya no se pisan en el ZIP; se limpian caracteres inválidos del nombre.
- Arrastrar texto ya no activa la zona de carga; división por cero con archivos vacíos.

## Uso
Abre `index.html` directamente en tu navegador. No necesita internet ni servidor.
El modo sin conexión/instalable solo se activa si la sirves por http(s) (por ejemplo, en tu hosting).
Si la ves incrustada en otra página (iframe), el navegador puede bloquear las descargas: ábrela en una pestaña propia.
