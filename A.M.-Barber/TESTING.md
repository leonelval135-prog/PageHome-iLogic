# Pruebas ejecutadas
`node tests/check.js` re-ejecutado en v1.2 (sintaxis, archivos, imágenes referenciadas). Navegador, Supabase y animaciones NO verificados visualmente.
NO ejecutadas: pruebas visuales en navegador/móvil, envío real a WhatsApp, GA4, lealtad en varios dispositivos.
`node tests/check.js` re-ejecutado en v1.2 (sintaxis, archivos, imágenes referenciadas). Navegador, Supabase y animaciones NO verificados visualmente.
v1.3: `node tests/check.js` y sintaxis JS. Audio, glass y animaciones NO verificados en navegador; Music/Music.mp3 no está incluido (lo aporta el cliente).
v1.4: check.js y sintaxis JS. Reseñas, login y SQL NO probados contra el Supabase real (sin red en este entorno).
v1.5: check.js y sintaxis JS. Diseño móvil NO verificado en dispositivo real/emulador (sin navegador en este entorno).
v1.6: check.js y sintaxis JS. Citas/SQL NO probados contra el Supabase real (sin red); revisar tras ejecutar citas.sql.
v1.7: check.js, sintaxis JS y comparación del SVG contra el logo original. 3D/animaciones/SQL no verificados en navegador ni en Supabase real.
v1.8: check.js y sintaxis JS tras el rediseño. Apariencia NO verificada visualmente en navegador.

## Pagos (v1.15)
- Con llaves de prueba de Stripe: elige servicio de precio fijo + "Pago con tarjeta" > el botón dice "Guardar cita y pagar con tarjeta" y se muestra el total.
- Paga con 4242 4242 4242 4242: al volver aparece "¡Pago recibido!" y la cita sale "Pagada con tarjeta ✓".
- Tarjeta rechazada 4000 0000 0000 0002: Stripe muestra el error y no se marca como pagada.
- Cierra Stripe sin pagar: al volver, mensaje de pago cancelado y botón "Pagar con tarjeta" en Mis citas.
- Servicio infantil/grecas/color con tarjeta: mensaje de que no se paga en línea.
