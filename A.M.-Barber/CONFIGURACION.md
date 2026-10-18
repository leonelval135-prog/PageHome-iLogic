# Datos que Ángel debe completar (js/config.js)
- `dominio` — ya configurado como https://e-onyx.com (también en canonical, Open Graph, sitemap y robots). Si el sitio vivirá en un subdominio, cámbialo en esos archivos.
- `direccion` — dirección exacta del local.
- `mapsEmbed` — Google Maps > Compartir > Insertar un mapa: copia el `src` del iframe. Hoy solo hay botón con el enlace de Maps proporcionado.
- `resenasUrl` — enlace de reseñas de Google Business.
- `ga4` — ID de medición G-XXXXXXXXXX. Se activa solo tras aceptar el aviso de consentimiento; no se envían datos personales.
- Precios de Color y Pigmentación, productos reales, recompensa de lealtad (`lealtad`).
- Fotos reales: sustituir los marcadores de la galería (assets/).

# Supabase (login, registro, estado abierto/cerrado)
1. Crea el proyecto y ejecuta `supabase/schema.sql` en el SQL Editor.
2. Pega `supabaseUrl` y la clave **anon** en `js/config.js` (nunca la service_role).
3. Regístrate en el sitio y marca tu usuario como admin con la última línea del SQL. Al entrar verás el botón "Cambiar estado de hoy".
4. Si tienes confirmación de correo activa, la foto se sube al primer inicio de sesión posible; desactívala en Auth si quieres foto inmediata.

# Música de la intro
Coloca tu canción en `Music/Music.mp3` (nombre exacto). Si el archivo no existe, la intro funciona sin sonido. Usa solo música con derechos de uso.

# Estado de la conexión Supabase
URL y clave anon ya están en `js/config.js`. Falta en tu proyecto: ejecutar `supabase/schema.sql` y luego `supabase/reviews.sql`; en Auth > URL Configuration pon Site URL `https://e-onyx.com`.

# Citas con bloqueo de horarios (supabase/citas.sql)
Ejecuta `citas.sql` después de `schema.sql`. Al enviar la solicitud se guarda en la BD y el horario queda apartado 20 minutos; si el admin no la acepta, se libera sola. Para aceptar/rechazar debes ser admin (ver `is_admin` en schema.sql). Para cambiar los 20 minutos edita `citas.sql` (4 lugares) y `12e5` en `js/extra.js`. Opcional: activa pg_cron para borrar pendientes cada minuto.

# Ventana de 2 días
Si ya ejecutaste `citas.sql` antes de la v1.7, corre `supabase/migracion-hoy-y-manana.sql`. El formulario solo permite hoy y mañana, y el servidor lo valida.
