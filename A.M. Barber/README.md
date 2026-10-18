# A.M. Barber — sitio web
Sitio estático (HTML/CSS/JS, sin compilación ni dependencias). Citas, contacto y pedidos abren WhatsApp (+52 56 1677 3834); no hay backend.

## Ejecutar local
`python3 -m http.server 8000` y abre http://localhost:8000. Pruebas: `node tests/check.js`.

## Publicar
Sube la carpeta a Netlify, Cloudflare Pages o GitHub Pages. En el panel agrega tu dominio y crea en tu proveedor de DNS los registros que indique la plataforma (CNAME o A). El HTTPS/SSL lo emite la plataforma automáticamente tras apuntar el DNS. 404.html se usa como página de error.

## Correo empresarial
Contrata un proveedor (Google Workspace, Zoho, iCloud+ con dominio propio) y agrega los registros MX, SPF (TXT) y DKIM que él indique. Los valores exactos dependen del proveedor.

## Configuración
Ver CONFIGURACION.md. Todo se edita en `js/config.js`.

## Limitaciones
- Lealtad: DEMO en localStorage (solo ese navegador). Producción: base de datos + autenticación (p. ej. Supabase/Firebase).
- Formularios: no envían correo; abren WhatsApp. Para correo real, usar un servicio como Formspree.
- Galería y productos: marcadores de muestra, sin fotos reales.
