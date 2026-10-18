// CONFIGURACIÓN DEL NEGOCIO — edita aquí. Lo marcado PENDIENTE debe completarse antes de publicar.
window.AMB = {
  nombre: "A.M. Barber", responsable: "Ángel Murillo", eslogan: "Corte fino, trabajo firme.",
  whatsapp: "525616773834", email: "angel.9murillo@icloud.com",
  horario: "Lun–Sáb 11:00 a. m. a 8:00 p. m. · Dom 11:00 a. m. a 4:00 p. m.",
  supabaseUrl: "https://zcodieehnygovafjogqy.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjb2RpZWVobnlnb3ZhZmpvZ3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyODQ3MzQsImV4cCI6MjEwNzg2MDczNH0.XcY4IqgMmNk1pqcCQ-hl08cvQF9hs0lB1IRtjt5OYCU", // clave anon (pública por diseño; la protegen las reglas RLS). Nunca pongas aquí la service_role
  dominio: "https://e-onyx.com",
  direccion: "Acolman, Estado de México", // PENDIENTE (opcional): agrega calle y número exactos
  mapsUrl: "https://maps.app.goo.gl/x8RbHfCeUux5waqz6",
  mapsEmbed: "https://www.google.com/maps?q=19.638459,-98.908318&z=17&output=embed", // coordenadas del pin de tu enlace de Maps
  resenasUrl: "", // PENDIENTE: enlace de reseñas de Google Business
  ga4: "", // PENDIENTE: ID de medición G-XXXXXXXXXX
  servicios: [
    {id:"fade", n:"Corte desvanecido (Fade)", p:"$150", d:"Corte, delineado y limpieza de ceja, mascarilla de limpieza y de exfoliación con vapor."},
    {id:"clasico", n:"Corte clásico", p:"$130", d:"Corte de línea limpia y tradicional. No incluye servicio adicional."},
    {id:"taper", n:"Taper", p:"$150", d:"Transición precisa y gradual. Incluye servicio."},
    {id:"mullet", n:"Mullet", p:"$150", d:"Estructura y largo con carácter. Incluye servicio."},
    {id:"combo", n:"Corte y barba", p:"$250", d:"Delineado y limpieza de ceja, rasurado con vapor, mascarillas, succionador de puntos negros y masaje."},
    {id:"infantil", n:"Corte infantil", p:"$120", d:"$120 si va con 0; $100 si es corte clásico."},
    {id:"cejas", n:"Cejas", p:"$20", d:"Perfilado y limpieza."},
    {id:"grecas", n:"Grecas y diseños", p:"Según diseño", d:"Cotizamos el diseño por WhatsApp."},
    {id:"color", n:"Color", p:"Consultar", d:"Precio por confirmar. Pregunta por WhatsApp."},
    {id:"pigmentacion", n:"Pigmentación", p:"Consultar", d:"Precio por confirmar. Pregunta por WhatsApp."}
  ],
  productos: [
    {n:"Cera de Telaraña", d:"Fijación con textura y movimiento.", p:"$120", disp:"Consultar"},
    {n:"Polvo de Textura", d:"Volumen y acabado mate.", p:"$200", disp:"Consultar", imgs:["assets/productos/polvo-1.jpg","assets/productos/polvo-2.jpg"]}
  ],
  galeria: ["Clásico","Taper","Mullet","Fade","Barba","Grecas","Antes y después"],
  fotos: [ // fotos reales; cats = categorías donde aparece
    {src:"assets/galeria/corte-01.jpg", alt:"Mullet con taper y barba perfilada", cats:["Mullet","Taper","Barba"]},
    {src:"assets/galeria/corte-02.jpg", alt:"Grecas en degradado con color", cats:["Grecas","Fade"]},
    {src:"assets/galeria/corte-03.jpg", alt:"Mullet con grecas y degradado", cats:["Grecas","Mullet","Fade"]},
    {src:"assets/galeria/corte-04.jpg", alt:"Diseño de estrella con grecas", cats:["Grecas","Fade"]}
  ]
};
