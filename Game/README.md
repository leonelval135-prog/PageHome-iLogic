# MB Barber · Penalty Cup

Juego de penaltis en HTML, CSS y JavaScript puro (sin librerías).

## Cómo usarlo
1. Descomprime el zip.
2. Abre `index.html` en el navegador (Chrome, Edge, Safari o Firefox). Para publicarlo, sube la carpeta completa a cualquier hosting estático (Netlify, GitHub Pages, tu propio dominio).

## Estructura
- `index.html`: menú, tabla de premios y pantalla final.
- `css/style.css`: estilos.
- `js/game.js`: motor del juego, IA del portero, conexión a Supabase, Canjeo y certificado.
- `js/config.js`: URL y clave anon de Supabase. `js/logo-data.js`: logo embebido para el certificado.
- `supabase/penalty-cup.sql`: tablas y funciones (puntos diarios, premios, canjes).
- `assets/`: logo (monograma para camiseta y vallas, logo completo para el menú).

## Personalizar
- Premios: constante `PR` al inicio de `js/game.js`.
- Publicidad de las vallas: constante `ADS`.
- Dificultad: función `shoot()` (bloque «IA DEL PORTERO»). Valores clave: `skill` (nivel base 0.5), latencia de percepción `.2-.07*skill`, ruido `nz`, tiempo de reacción `rt`, velocidades `vx`/`vy` y alcance `54+10*skill` / `78+10*skill`.
- Velocidad de la barra de potencia: `ph+=dt*(1.5+skill*.7)`.

## IA del portero
Lee tu mira con retraso y ruido, aprende en qué zonas sueles tirar (memoria con decaimiento), calcula probabilidades por zona, decide y salta con límites físicos de velocidad y alcance. Sube de nivel con tus goles del día y tu racha. Truco para ganarle: mover la mira en el último instante y disparar con la barra en verde.

## Base de datos (Supabase): clasificación diaria, puntos y canjeo
1. En Supabase > SQL Editor ejecuta `supabase/penalty-cup.sql` (una sola vez; el mismo proyecto del sitio A.M. Barber).
2. `js/config.js` ya trae la URL y la clave **anon** del proyecto (nunca pongas la service_role).
3. Sube la carpeta completa a tu hosting. Abre el juego desde `http(s)://`, no con doble clic en `index.html`.

**Cómo funciona**
- El día corre de 12:00 a. m. a 11:59 p. m. **hora de Ciudad de México**, calculado en el servidor. Cada fila de `pc_puntos` lleva su fecha, así que a medianoche todos empiezan en 0 solos (sin cron). El historial queda guardado.
- Cada gol se registra en `pc_puntos` (`goles`). La clasificación muestra solo el top 10 de hoy. El saldo canjeable es `goles - canjeados`; canjear no baja a nadie de lugar en el ranking.
- **Canjeo:** el botón `🎁 CANJEO` lista los premios (`pc_premios`, editables desde Table Editor: nombre, costo, activo). Al canjear se descuentan los goles, se crea un folio único en `pc_canjes` y se genera una imagen-certificado (descargable/compartible). "Mis canjes" permite volver a ver los certificados y "Verificar folio" confirma si es real y si ya se entregó.
- Marcar un premio como entregado: `update public.pc_canjes set estado='entregado', entregado_en=now() where folio='MB-XXXX-XXXX';`
- Anuncio: valla "GANA PREMIOS SEGÚN TU PUNTAJE" en el estadio (constante `ADS`) y recuadro dorado en el menú.
- Sin conexión el juego sigue funcionando y los goles se envían al reconectar.

**Límites conocidos:** el juego corre en el navegador, así que el servidor solo puede validar plausibilidad (mínimo 1.5 s entre goles, tope 200 goles/día por jugador). No es a prueba de trampas decididas; por eso el premio se entrega solo tras verificar el folio. El jugador se identifica por un ID guardado en su navegador (otro dispositivo o borrar datos = jugador distinto).
