"use strict";
/* eGenerate Pass Secure - motor de lógica (sin DOM, sin red) */
const EGPS = (() => {
  const lg = Math.log2;
  const SETS = { U: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", L: "abcdefghijklmnopqrstuvwxyz", N: "0123456789", S: "!@#$%^&*()-_=+[]{};:,.?/" };
  const WORDS = ("abeja acero aguila alba almohada amigo ancla andar anillo arbol arena arroz astro atlas aurora avena azul balsa bambu barco bosque brisa bruma cabra cacao cactus caldo camino campo canal canto capaz carta casco cedro cerro cesta cielo cima circo clave cobre colina coral corona cuarzo cueva dado delta duna ebano eco eje encina epoca espejo estrella faro fenix fibra fiel flecha flor fosil fuente fuerte gato gema globo gota grano grillo gruta halcon hielo hogar hongo huella humo idea isla jade jaula jardin joya jungla karma lago lampara laser lava leche lente leon libro liebre lima linea llama lluvia lobo luna luz magia mango mapa marea marfil mesa meta miel mina mono monte mundo musgo nacar nave nevada niebla nido noche nube nuez oasis ola olivo onda opalo oro oso otono pajaro palma panal pasto pecera pera perla pino piedra plata playa pluma polen puente pulso quasar queso rama rayo red reloj rio roble roca rocio ruta sabio sal salto selva sendero sol sombra sonido tabla tarde techo tejo tierra tigre tinta torre trigo trueno tucan umbral valle vela velero verde viaje viento vino vista volcan yate zafiro zorro").split(" ");
  // Claves y palabras muy usadas, ordenadas por popularidad aproximada (el índice es el "rango")
  const DICT = new Map();
  ("123456 password 12345678 qwerty 123456789 12345 1234 111111 1234567 dragon 123123 baseball abc123 football monkey letmein shadow master 666666 qwertyuiop 123321 mustang 1234567890 michael 654321 superman 1qaz2wsx 7777777 121212 000000 qazwsx 123qwe killer trustno1 jordan jennifer zxcvbnm asdfgh hunter buster soccer harley batman andrew tigger sunshine iloveyou charlie robert thomas hockey ranger daniel starwars 112233 george computer michelle jessica pepper zxcvbn 555555 11111111 131313 freedom 777777 pass maggie 159753 aaaaaa ginger princess joshua cheese amanda summer love ashley nicole chelsea biteme matthew access yankees 987654321 dallas austin thunder taylor matrix admin welcome login hello secret passw0rd letmein1 qwerty123 contrasena clave hola amor teamo mexico futbol usuario secreto bienvenido familia princesa angel corazon estrella carino sol luna casa perro gato mundo fuego agua tierra cielo azul rojo negro blanco verde juan maria carlos jose luis ana pedro miguel diego sofia chivas america pumas messi barcelona madrid peru colombia argentina root user test guest default changeme administrador whatsapp facebook google netflix").split(" ")
    .forEach((w, i) => { if (!DICT.has(w)) DICT.set(w, i); });
  const LEET = { "@": "a", "4": "a", "3": "e", "0": "o", "1": "i", "$": "s", "5": "s", "7": "t", "!": "i" };
  const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "qazwsxedc"];
  const ROWS_R = ROWS.map(r => [...r].reverse().join(""));
  const RATES = { online: 100, slow: 1e4, fast: 1e10 }; // intentos por segundo

  /* Entero uniforme en [0, n) con muestreo por rechazo (sin sesgo de módulo) */
  function rnd(n) {
    const lim = Math.floor(4294967296 / n) * n, b = new Uint32Array(1);
    let x; do { crypto.getRandomValues(b); x = b[0]; } while (x >= lim);
    return x % n;
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* Contraseña aleatoria: garantiza una de cada familia activa y devuelve la entropía mínima garantizada */
  function password(o) {
    const strip = s => o.amb ? s.replace(/[Il1O0o]/g, "") : s;
    let sets = ["U", "L", "N", "S"].filter(k => o[k]).map(k => strip(SETS[k]));
    if (!sets.length) sets = [strip(SETS.L)];
    const len = Math.max(o.len, sets.length), all = sets.join("");
    const out = sets.map(s => s[rnd(s.length)]);
    let bits = sets.reduce((a, s) => a + lg(s.length), 0);
    while (out.length < len) { out.push(all[rnd(all.length)]); bits += lg(all.length); }
    return { text: shuffle(out).join(""), bits };
  }

  /* Frase de contraseña: palabras al azar + número opcional */
  function phrase(o) {
    const w = Array.from({ length: o.wc }, () => { const x = WORDS[rnd(WORDS.length)]; return o.cap ? x[0].toUpperCase() + x.slice(1) : x; });
    let bits = o.wc * lg(WORDS.length);
    if (o.num) { w.push(String(rnd(100)).padStart(2, "0")); bits += lg(100); }
    return { text: w.join(o.sep), bits };
  }

  /* Analizador por patrones: busca la segmentación de menor coste (programación dinámica) */
  function capCost(sub) {
    const k = (sub.match(/[A-Z]/g) || []).length;
    if (!k) return 0;
    return (/^[A-Z][^A-Z]*$/.test(sub) || k === sub.length) ? 1 : Math.min(sub.length, k * 2);
  }
  function isSeq(s) {
    const d = s.charCodeAt(1) - s.charCodeAt(0);
    if (Math.abs(d) !== 1) return false;
    for (let i = 2; i < s.length; i++) if (s.charCodeAt(i) - s.charCodeAt(i - 1) !== d) return false;
    return true;
  }
  function analyze(pw) {
    const head = pw.slice(0, 128), n = head.length, lo = head.toLowerCase();
    const f = { len: pw.length >= 12, U: /[A-Z]/.test(pw), L: /[a-z]/.test(pw), N: /\d/.test(pw), S: /[^A-Za-z0-9]/.test(pw) };
    let pool = 0; if (f.L) pool += 26; if (f.U) pool += 26; if (f.N) pool += 10; if (f.S) pool += 33; if (/[^\x00-\x7f]/.test(pw)) pool += 60;
    const per = lg(Math.max(pool, 2));
    const cand = Array.from({ length: n }, () => []); // cand[fin] = [{i, cost, type, text}]
    const add = (i, len, cost, type) => cand[i + len - 1].push({ i, cost, type, text: head.substr(i, len) });
    for (let i = 0; i < n; i++) {
      for (let len = 3; len <= Math.min(24, n - i); len++) {
        const s = lo.substr(i, len), sub = head.substr(i, len);
        const ln = s.replace(/[@43015$!7]/g, c => LEET[c]);
        if (DICT.has(s)) add(i, len, lg(DICT.get(s) + 2) + 1 + capCost(sub), "dict");
        else if (ln !== s && DICT.has(ln)) { let c = 0; for (let k = 0; k < len; k++) if (s[k] !== ln[k]) c++; add(i, len, lg(DICT.get(ln) + 2) + 1 + c + capCost(sub), "dict"); }
        if (isSeq(s)) add(i, len, lg(len) + 5, "seq");
        if (len >= 4 && (ROWS.some(r => r.includes(s)) || ROWS_R.some(r => r.includes(s)))) add(i, len, 6 + lg(len), "kbd");
        if (len === 4 && /^(19|20)\d\d$/.test(s)) add(i, len, 7, "date");
        if ((len === 6 || len === 8) && /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(\d\d|\d{4})$/.test(s)) add(i, len, len === 8 ? 15 : 13, "date");
      }
      for (let b = 1; b <= 8 && i + 2 * b <= n; b++) { // bloques repetidos (aaa, abcabc)
        const blk = head.substr(i, b); let k = 1;
        while (head.substr(i + b * k, b) === blk) k++;
        if (k >= 2 && b * k >= 3) add(i, b * k, b * per + lg(k) + 1, "rep");
      }
    }
    const best = Array(n + 1).fill(Infinity), back = Array(n + 1).fill(null); best[0] = 0;
    for (let j = 1; j <= n; j++) {
      best[j] = best[j - 1] + per; back[j] = null;
      for (const c of cand[j - 1]) if (best[c.i] + c.cost < best[j]) { best[j] = best[c.i] + c.cost; back[j] = c; }
    }
    const found = []; for (let j = n; j > 0;) { const c = back[j]; if (c) { found.unshift(c); j = c.i; } else j--; }
    const bits = Math.min(Math.max(best[n] + (pw.length - n) * per, 0), 1000);
    const types = [f.U, f.L, f.N, f.S].filter(Boolean).length;
    const hasDict = found.some(x => x.type === "dict"), hasPat = found.some(x => x.type !== "dict");
    let score = scoreOf(bits);
    if (pw.length < 8) score = Math.min(score, 1);
    if (DICT.has(lo)) score = 0; else if (hasDict) score = Math.min(score, 2);
    return { bits, score, f, found, hasDict, hasPat, types, len: pw.length };
  }
  function scoreOf(bits) { return bits < 28 ? 0 : bits < 40 ? 1 : bits < 64 ? 2 : bits < 90 ? 3 : 4; }

  function seconds(bits, rate) { return Math.pow(2, Math.min(bits, 1000) - 1) / rate; } // promedio: la mitad del espacio
  function fmt(s) {
    if (s < 1) return "Instantáneo";
    if (s < 60) return Math.round(s) + " segundos";
    if (s < 3600) return Math.round(s / 60) + " minutos";
    if (s < 86400) return Math.round(s / 3600) + " horas";
    const d = s / 86400; if (d < 365.25) return Math.round(d) + " días";
    const y = d / 365.25, n = v => v.toLocaleString("es-MX", { maximumFractionDigits: 0 });
    if (y < 1e3) return n(y) + " años"; if (y < 1e6) return n(y / 1e3) + " mil años";
    if (y < 1e9) return n(y / 1e6) + " millones de años"; if (y < 1.38e10) return n(y / 1e9) + " mil millones de años";
    return "Más que la edad del universo";
  }
  return { SETS, WORDS, RATES, rnd, password, phrase, analyze, scoreOf, seconds, fmt };
})();
if (typeof module !== "undefined") module.exports = EGPS;
