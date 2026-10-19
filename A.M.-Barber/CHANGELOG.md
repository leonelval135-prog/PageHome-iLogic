# 1.0.0
Primera versión: sitio estático con servicios, citas por WhatsApp, galería, productos, lealtad demo, FAQ, contacto, mapa, SEO y GA4 con consentimiento.
# 1.1.0
Intro animada, mapa embebido, selector de barbero y horarios por día, productos reales, estado abierto/cerrado, login/registro con Supabase, animaciones.
# 1.2.0
Corrige modal (atributo hidden), nueva intro con cuchilla que revela el logo, fotos de polvo de textura y galería real.
# 1.3.0
Intro con botón Entrar + música, botón de música, estilo liquid glass, optimizaciones (content-visibility, blur adaptable).
# 1.4.0
Reservar/consultar lleva al formulario, reseñas con Supabase, tema claro/oscuro, Supabase y dominio e-onyx.com configurados.
# 1.5.0
Nombre de cita ligado a sesión (aviso si no hay sesión), local en Acolman, ajustes móviles/tablet.
# 1.6.0
Citas guardadas en Supabase con bloqueo de horarios, expiración a 20 min, panel de aceptación y horas en formato 12 h.
# 1.7.0
Horas 12 h sin cero inicial, citas solo hoy y mañana, logo en SVG con 3D, marquesina, barra de progreso y más animaciones; cache-busting ?v=1.7.
# 1.8.0
Rediseño UI según DESIGN.md (estilo Apple): lienzo blanco, bandas #f5f5f7, tarjetas 28px sin sombras ni degradados, píldoras azules, tipografía SF Pro/Inter. Tema oscuro conservado como variante.
# 1.9.0
Nueva sección "Curso de barbería" (precio $5,000, pago inicial $2,000 + $500 semanales, 4 meses, lunes/martes/jueves), enlace en el menú, mención en Nosotros y pregunta frecuente.
# 1.10.0
Programa de lealtad rediseñado: tarjeta SVG con 6 recuadros que se firman con animación y leyenda de corte gratis al completar las 6 firmas. Se elimina la demo con localStorage.

# 1.11.0
Corrige el login (el botón Entrar del header quedaba sin acción tras cargar la sesión), cierre del modal con Esc/fondo, recuperar contraseña, intro una vez por sesión con salida de seguridad, h1 visible sin JS. Nuevo diseño liquid glass con glassmorphism (css/glass.css), aurora animada, refracción en Chrome, tilt 3D, botones magnéticos, ondas, parallax y menú activo (js/fx.js).

# 1.11.1
Corrige que no se pudiera escribir (document.onkeydown devolvía false y cancelaba todas las teclas), desborde horizontal del formulario de cuenta, paleta negro/blanco/gris y pulido profesional.
# 1.12.0
Se quita el botón "Cambiar estado de hoy" del hero. El logo del hero ahora tiene contorno neón blanco brillante que se traza de izquierda a derecha, se mantiene encendido y se apaga en bucle (respeta prefers-reduced-motion); cache-busting ?v=1.12.
# 1.13.0
Turnos en punto y :35 (domingo hasta las 5 p. m., último turno 4:35); forma de pago (efectivo o tarjeta) con tarjeta animada que detecta Visa, Mastercard, Amex, etc.; repertorio de 4 canciones en orden aleatorio con botón de siguiente. Si ya ejecutaste citas.sql, vuelve a ejecutar supabase/migracion-hoy-y-manana.sql.

# 1.14.0
Juego Penalty Cup integrado en /penalty (misma cuenta y mismo Supabase): el nombre del jugador es el del login y la cuenta identifica al jugador; nueva sección "Penalty Cup" con explicación y recompensas que enlaza al juego; enlace en el menú y en sitemap.
