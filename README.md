# e-Onyx Technologies · Sitio del ecosistema

Sitio estático pensado para **GitHub Pages**. Todos los enlaces son relativos, así que funciona igual en
`https://<usuario>.github.io/<repositorio>/` que en un dominio propio.

## Estructura

```
/                      index.html (verificación anti-bot → Home) · 404.html · .nojekyll
Home/                  Página principal del ecosistema
Auth/                  Login · Registro · Recuperar contraseña · Nueva contraseña
assets/
  auth/                config.js · auth-core.js · guard.js   (autenticación compartida)
  logos/<Servicio>/    icon-32/64/180/192/512 · isotipo · imagotipo (oscuro/claro/blanco)
Vitaris/ CodX/ Lingram/ Sonorix/ Kinetiq/   Servicios con login obligatorio
Opticor/ Securia/ eOnyxCraft/               Servicios sin login
supabase/setup.sql     Bucket y políticas para las fotos de perfil
```

## Cómo funciona el login

- Cada servicio protegido carga `assets/auth/guard.js` en el `<head>`:
  ```html
  <script src="../assets/auth/guard.js" data-service="vitaris"></script>
  ```
  Si no hay sesión, redirige a `Auth/index.html?service=vitaris&next=<página>` y, tras iniciar sesión, vuelve a ella.
- Una sola cuenta sirve para todos los servicios (la sesión se comparte en el mismo dominio).
- Para proteger otra página: añade esa misma línea con su `data-service` (y registra el servicio en `assets/auth/config.js`).
- Registro: foto de perfil, nombre, correo, contraseña y confirmación.
  - Correo: formato estricto, errores de tipeo (`gmial.com`), dominios desechables y comprobación DNS (el dominio debe recibir correo).
  - Contraseña: mínimo 10 caracteres, mayúscula, minúscula, número y símbolo; rechaza contraseñas comunes, secuencias, repeticiones y tu nombre/correo; medidor de fortaleza; y comprobación en filtraciones públicas (Have I Been Pwned, solo se envían 5 caracteres del hash).
- Recuperación: "¿Olvidaste tu contraseña?" → correo con enlace → `Auth/index.html?mode=reset` → nueva contraseña.

## Configuración obligatoria en Supabase (una sola vez)

1. **SQL Editor** → pega y ejecuta `supabase/setup.sql` (crea el bucket `avatars` y sus políticas).
2. **Authentication → URL Configuration**
   - *Site URL*: la URL pública de tu sitio (p. ej. `https://<usuario>.github.io/<repositorio>/`).
   - *Redirect URLs*: añade `https://<usuario>.github.io/<repositorio>/Auth/index.html` (y, si usas dominio propio, el equivalente).
   - Sin esto, los enlaces de confirmación y de recuperación **no funcionarán**.
3. **Authentication → Providers → Email**: deja activado *Confirm email* y sube *Minimum password length* a **10**
   (las reglas del navegador se pueden saltar llamando a la API directamente; esto las refuerza en el servidor).
4. (Recomendado) **Authentication → SMTP Settings**: configura un SMTP propio; el correo integrado de Supabase tiene un límite muy bajo de envíos por hora.

## Despliegue en GitHub Pages

1. Sube el contenido de esta carpeta a la **raíz** del repositorio (no dentro de otra carpeta).
2. *Settings → Pages* → *Deploy from a branch* → rama `main`, carpeta `/ (root)`.
3. Espera 1–2 minutos y abre la URL.

## Notas de seguridad

- La *anon key* de `config.js` es pública por diseño. **Nunca** publiques la *service_role key*.
- GitHub Pages es hosting estático: el guard impide el uso normal sin cuenta, pero el HTML de los servicios sigue siendo descargable.
  Si algún día necesitas proteger datos o lógica privada, debe vivir en Supabase (con RLS) o en un backend, no en estas páginas.
