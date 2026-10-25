# Cámara Pro (Supabase)

## Estructura
- index.html · css/styles.css · js/{config,auth,camera,storage,app}.js · sql/setup.sql

## Puesta en marcha
1. Supabase > SQL Editor: ejecuta `sql/setup.sql` (bucket privado `media` + permisos por usuario).
2. (Pruebas) Authentication > Providers > Email: desactiva "Confirm email".
3. Sirve la carpeta por HTTPS o localhost (la cámara y los módulos JS no funcionan con file://):
   `python3 -m http.server 8080` y abre http://localhost:8080
   Para usarlo en el celular, súbelo a un hosting con HTTPS (Netlify, Vercel, GitHub Pages...).
4. Credenciales en `js/config.js` (solo la key `anon`; nunca la `service_role`).

## Funciones
Foto, video con audio, cámara lenta (fps reales del dispositivo), noche (promedio de 8 fotogramas), ráfaga x10,
cambio de cámara y de lente (0.5x/1x/3x si el dispositivo los expone), zoom por botones y pellizco, flash/linterna,
temporizador, cuadrícula, formatos 4:3/1:1/16:9, filtros (también en video), enfoque táctil, controles manuales
(ISO, obturador, exposición, enfoque, balance de blancos, brillo, contraste, saturación, nitidez: solo los que el
navegador exponga), formato JPEG/PNG/WebP, video 720p/1080p/4K, galería con ver/compartir/descargar/eliminar.

## Calidad
- Foto: con "Calidad original" y formato JPEG se guarda el archivo original del sensor (ImageCapture, resolución máxima) sin recompresión. Con filtros, recorte, zoom digital, noche o PNG/WebP se renderiza a resolución nativa con calidad 100% (PNG = sin pérdida).
- Video: sin filtros/recorte/zoom digital se graba el stream directo de la cámara (sin canvas), bitrate alto y audio estéreo 48 kHz.
- Supabase limita el tamaño por archivo (50 MB en plan gratuito). En Storage > Settings sube el límite (plan Pro). Si una subida falla, se descarga una copia local para no perder nada.
