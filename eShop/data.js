/* ==========================================================
   data.js — Datos ficticios (mockData). Se expone en window.mockData
   para funcionar abriendo index.html directamente (file://).
   Campos: shipping = "free" | "standard" | "express"
   ========================================================== */
window.mockData = {
  categories: ["Electrónica", "Hogar", "Moda", "Deportes", "Juguetes", "Belleza"],
  banners: [
    { title: "Ofertas de temporada", text: "Hasta 40% de descuento en electrónica", cta: "Ver ofertas", cat: "Electrónica", bg: "linear-gradient(120deg,#050505,#3a3a3f)" },
    { title: "Renueva tu casa", text: "Envío gratis en artículos de hogar", cta: "Ir a Hogar", cat: "Hogar", bg: "linear-gradient(120deg,#1c1c1f,#6b6b72)" },
    { title: "Muévete más", text: "Equipo deportivo desde $199", cta: "Ver deportes", cat: "Deportes", bg: "linear-gradient(120deg,#2b2b30,#85858d)" }
  ],
  products: [
    { id: 1,  title: "Audífonos Bluetooth con cancelación de ruido", brand: "SonoMax",  category: "Electrónica", price: 1299, oldPrice: 1999, rating: 4.6, reviews: 1284, sold: 5400, shipping: "free",     stock: 24, emoji: "🎧", flash: true },
    { id: 2,  title: "Smartwatch deportivo con GPS y monitor cardíaco", brand: "PulsoFit", category: "Electrónica", price: 2499, oldPrice: 3199, rating: 4.4, reviews: 862,  sold: 3100, shipping: "free",     stock: 12, emoji: "⌚", flash: true },
    { id: 3,  title: "Laptop 15.6\" 16 GB RAM 512 GB SSD",              brand: "NovaTech", category: "Electrónica", price: 13999, oldPrice: 16499, rating: 4.7, reviews: 540, sold: 980,  shipping: "free",     stock: 6,  emoji: "💻", flash: false },
    { id: 4,  title: "Bocina portátil resistente al agua",              brand: "SonoMax",  category: "Electrónica", price: 699,  oldPrice: 999,  rating: 4.3, reviews: 2210, sold: 8800, shipping: "standard", stock: 40, emoji: "🔊", flash: true },
    { id: 5,  title: "Cafetera de cápsulas automática",                 brand: "CasaViva", category: "Hogar",       price: 1599, oldPrice: 1899, rating: 4.5, reviews: 730,  sold: 2200, shipping: "free",     stock: 15, emoji: "☕", flash: false },
    { id: 6,  title: "Set de sartenes antiadherentes (3 piezas)",       brand: "CasaViva", category: "Hogar",       price: 849,  oldPrice: 1199, rating: 4.2, reviews: 415,  sold: 1700, shipping: "standard", stock: 31, emoji: "🍳", flash: true },
    { id: 7,  title: "Lámpara de escritorio LED regulable",             brand: "LumiHome", category: "Hogar",       price: 329,  oldPrice: 449,  rating: 4.1, reviews: 198,  sold: 950,  shipping: "standard", stock: 52, emoji: "💡", flash: false },
    { id: 8,  title: "Tenis para correr ligeros",                       brand: "Veloz",    category: "Deportes",    price: 1099, oldPrice: 1599, rating: 4.5, reviews: 1630, sold: 6100, shipping: "free",     stock: 18, emoji: "👟", flash: true },
    { id: 9,  title: "Tapete de yoga antiderrapante 6 mm",              brand: "Veloz",    category: "Deportes",    price: 299,  oldPrice: 399,  rating: 4.0, reviews: 320,  sold: 2700, shipping: "standard", stock: 70, emoji: "🧘", flash: false },
    { id: 10, title: "Chamarra impermeable unisex",                     brand: "Nórdica",  category: "Moda",        price: 1249, oldPrice: 1699, rating: 4.4, reviews: 505,  sold: 1400, shipping: "express",  stock: 9,  emoji: "🧥", flash: false },
    { id: 11, title: "Bloques de construcción 500 piezas",              brand: "Ingenio",  category: "Juguetes",    price: 549,  oldPrice: 749,  rating: 4.8, reviews: 940,  sold: 3900, shipping: "free",     stock: 27, emoji: "🧱", flash: true },
    { id: 12, title: "Set de cuidado facial con vitamina C",            brand: "Aura",     category: "Belleza",     price: 459,  oldPrice: 599,  rating: 4.3, reviews: 612,  sold: 2500, shipping: "express",  stock: 35, emoji: "🧴", flash: false }
  ],
  coupons: { DESCUENTO10: 0.10, BIENVENIDO: 0.05 }
};