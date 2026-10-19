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
3. Regístrate en el sitio y marca tu usuario como admin con la última línea del SQL. El botón "Cambiar estado de hoy" ya no está en la página; para abrir/cerrar el día edita la fila id=1 de la tabla shop_status en Supabase.
4. Si tienes confirmación de correo activa, la foto se sube al primer inicio de sesión posible; desactívala en Auth si quieres foto inmediata.

# Música de la intro
Coloca tu canción en `Music/Music.mp3` (nombre exacto). Si el archivo no existe, la intro funciona sin sonido. Usa solo música con derechos de uso.

# Estado de la conexión Supabase
URL y clave anon ya están en `js/config.js`. Falta en tu proyecto: ejecutar `supabase/schema.sql` y luego `supabase/reviews.sql`; en Auth > URL Configuration pon Site URL `https://e-onyx.com`.

# Citas con bloqueo de horarios (supabase/citas.sql)
Ejecuta `citas.sql` después de `schema.sql`. Al enviar la solicitud se guarda en la BD y el horario queda apartado 20 minutos; si el admin no la acepta, se libera sola. Para aceptar/rechazar debes ser admin (ver `is_admin` en schema.sql). Para cambiar los 20 minutos edita `citas.sql` (4 lugares) y `12e5` en `js/extra.js`. Opcional: activa pg_cron para borrar pendientes cada minuto.

# Ventana de 2 días
Si ya ejecutaste `citas.sql` antes de la v1.7, corre `supabase/migracion-hoy-y-manana.sql`. El formulario solo permite hoy y mañana, y el servidor lo valida.

# Diseño
La guía visual está en `DESIGN.md` y los tokens en `css/styles.css` (:root). El tema oscuro es una variante; el predeterminado es el claro.

# Pagos con tarjeta (Stripe) — v1.15
La web cobra con **Stripe Checkout**: el cliente paga en la página segura de Stripe y el dinero llega a tu cuenta bancaria mediante depósitos automáticos de Stripe. La web nunca ve ni guarda números de tarjeta, y tu número de cuenta/CLABE **no va en el código**: se registra solo en el panel de Stripe.

1. **Cuenta de Stripe:** crea una en https://dashboard.stripe.com/register (país México) y completa la verificación del negocio (identidad y RFC).
2. **Tu cuenta bancaria:** Stripe > Configuración > Pagos (Payouts) > agrega tu CLABE de 18 dígitos. Ahí también eliges la frecuencia de depósitos.
3. **Base de datos:** en Supabase > SQL Editor ejecuta `supabase/pagos.sql` (después de citas.sql). Es seguro ejecutarlo varias veces.
4. **Secretos** (con la CLI de Supabase, en la carpeta del proyecto; usa primero las llaves de PRUEBA `sk_test_...`):
   `supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx SITE_URL=https://e-onyx.com`
5. **Funciones:**
   `supabase functions deploy crear-pago`
   `supabase functions deploy stripe-webhook --no-verify-jwt`
6. **Webhook:** Stripe > Desarrolladores > Webhooks > Agregar endpoint: `https://zcodieehnygovafjogqy.supabase.co/functions/v1/stripe-webhook`, evento `checkout.session.completed`. Copia el "Signing secret" (`whsec_...`) y ejecuta `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx`.
7. **Prueba:** con llaves de prueba reserva una cita con "Pago con tarjeta" y paga con la tarjeta 4242 4242 4242 4242 (cualquier fecha futura y CVC). La cita debe verse como "Pagada con tarjeta ✓".
8. **Producción:** cambia a las llaves reales (`sk_live_...`), crea el webhook también en modo producción y vuelve a ejecutar `supabase secrets set` con los nuevos valores.

Cómo funciona: al enviar el formulario se guarda la cita; la función `crear-pago` calcula el monto en el servidor (precios en `supabase/functions/crear-pago/index.ts`, deben coincidir con `js/config.js`) y abre Stripe. Al pagar, `stripe-webhook` (verifica la firma de Stripe) marca la cita como pagada y ya no se libera a los 20 minutos; el barbero la acepta o rechaza.
- **Si rechazas una cita pagada**, el panel muestra "Pagada: reembolsa desde Stripe": haz el reembolso en Stripe > Pagos.
- **Si el horario se libera antes de completar el pago**, o si se paga dos veces la misma cita, el webhook reembolsa automáticamente.
- Solo se pagan en línea los servicios de precio fijo (campo `o:1` en config.js). Infantil, grecas, color y pigmentación se pagan en efectivo o se cotizan por WhatsApp.
- Interruptor en js/config.js: `pagos: false` muestra la opción como "No disponible por el momento" (estado actual); cambia a `pagos: true` cuando Stripe esté configurado.
- Comisión de Stripe: la cobra Stripe por cada pago (consulta la tarifa vigente en su sitio); el monto depositado es el pago menos esa comisión.
