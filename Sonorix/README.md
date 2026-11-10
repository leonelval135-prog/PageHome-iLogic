# Sonorix · Página oficial y de descarga

Sitio estático (HTML + CSS + JS, sin dependencias ni build). Súbelo tal cual a tu hosting.

## Estructura

```
sonorix-web/
├── index.html            Página completa
├── site.webmanifest      Metadatos del sitio
├── css/
│   ├── base.css          Colores, tipografía, reset (modo oscuro/claro)
│   ├── components.css    Navegación, botones, barra de progreso
│   ├── hero.css          Portada y teléfono animado (PlayerScreen)
│   ├── sections.css      Funciones, demo, planes, tabla, pasos, seguridad, FAQ
│   ├── footer.css        Pie de página
│   ├── modals.css        Login/registro, foto de perfil, términos, cookies
│   └── responsive.css    Media queries y reducción de movimiento
├── js/
│   ├── config.js         DOWNLOAD_URL, Supabase (URL + anon key), versión de términos
│   ├── ui.js             Animaciones de scroll, menú móvil, progreso
│   ├── auth.js           Login, registro, sesión, plan, foto de perfil (Supabase)
│   ├── cookies.js        Aviso y preferencias de cookies
│   ├── legal.js          Términos y Condiciones de la app y aceptación
│   ├── showcase.js       Demo por pestañas, QR ilustrativo, tabla de planes
│   └── player-demo.js    Animación del teléfono
└── assets/
    ├── img/              Icono de la app y favicon
    └── downloads/        Coloca aquí tu APK
```

El orden de los `<script>` en `index.html` importa (comparten variables globales): no lo cambies.

## Antes de publicar

1. **Enlace de descarga:** abre `js/config.js` y pega tu enlace entre las comillas de `DOWNLOAD_URL` (Drive, Mega, GitHub Releases, tu hosting, o una ruta como `assets/downloads/sonorix.apk`). Si lo dejas vacío, el botón dice «Descarga próximamente».
2. **Supabase:** la web usa el mismo proyecto que la app. Necesitas haber ejecutado `supabase/avatars.sql` (bucket `avatars`) y las funciones `username_available`, `device_blocked` y `get_my_plan`.
3. **Términos:** si cambias la versión en la app (`TermsContent.VERSION`), actualiza `TV` en `js/config.js` y el texto en `js/legal.js`.
4. **Hosting:** súbelo a tu dominio, Netlify, Vercel o GitHub Pages. Los textos de privacidad y términos son los de la app; revísalos con un abogado.
