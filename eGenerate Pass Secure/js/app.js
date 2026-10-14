"use strict";
/* eGenerate Pass Secure - lógica 100 % local, sin peticiones de red */
const $ = id => document.getElementById(id);
const root = document.documentElement;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const SETS = { U: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", L: "abcdefghijklmnopqrstuvwxyz", N: "0123456789", S: "!@#$%^&*()-_=+[]{};:,.?/" };
const LV = [["Muy débil", "var(--s0)"], ["Débil", "var(--s1)"], ["Aceptable", "var(--s2)"], ["Fuerte", "var(--s3)"], ["Excelente", "var(--s4)"]];
const COMMON = ["password", "passw0rd", "123456", "12345678", "123456789", "qwerty", "qwertyuiop", "abc123", "111111", "000000", "123123", "iloveyou", "admin", "welcome", "monkey", "dragon", "letmein", "football", "sunshine", "princess", "login", "master", "hello", "freedom", "whatever", "trustno1", "azerty", "superman", "batman", "michael", "contrasena", "bienvenido", "hola", "futbol", "mexico", "teamo", "usuario", "secreto", "amor", "asdf", "zxcv", "1qaz", "qaz"];
const LEET = { "@": "a", "4": "a", "3": "e", "0": "o", "1": "i", "$": "s", "5": "s", "7": "t", "!": "i" };
const CHECKS = [["len", "12 caracteres o más"], ["U", "Incluye mayúsculas"], ["L", "Incluye minúsculas"], ["N", "Incluye números"], ["S", "Incluye símbolos"], ["common", "Sin palabras ni claves comunes"], ["runs", "Sin repeticiones ni secuencias"]];

/* ---------- Tema claro / oscuro ---------- */
function setTheme(t, x, y, animate) {
  const apply = () => {
    root.dataset.theme = t;
    try { localStorage.setItem("egps-theme", t); } catch (e) {}
    const dark = t === "dark";
    $("tlabel").textContent = dark ? "Modo claro" : "Modo oscuro";
    $("theme").setAttribute("aria-label", dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  };
  if (!animate || reduced()) return apply();
  if (document.startViewTransition) {
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() =>
      root.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 600, easing: "cubic-bezier(.4,0,.2,1)", pseudoElement: "::view-transition-new(root)" }));
  } else {
    root.classList.add("tt"); apply(); setTimeout(() => root.classList.remove("tt"), 450);
  }
}
$("theme").addEventListener("click", e => {
  const b = e.currentTarget.getBoundingClientRect();
  setTheme(root.dataset.theme === "dark" ? "light" : "dark", b.left + b.width / 2, b.top + b.height / 2, true);
});
setTheme(root.dataset.theme || "light", 0, 0, false);

/* ---------- Generador (CSPRNG) ---------- */
function rnd(n) { // muestreo por rechazo: sin sesgo de módulo
  const lim = Math.floor(4294967296 / n) * n, b = new Uint32Array(1);
  let x; do { crypto.getRandomValues(b); x = b[0]; } while (x >= lim);
  return x % n;
}
function generate() {
  const amb = $("oA").checked, strip = s => amb ? s.replace(/[Il1O0o]/g, "") : s;
  let sets = ["U", "L", "N", "S"].filter(k => $("o" + k).checked).map(k => strip(SETS[k]));
  if (!sets.length) { $("oL").checked = true; sets = [strip(SETS.L)]; toast("Activa al menos una familia de caracteres"); }
  const len = Math.max(+$("len").value, sets.length), all = sets.join("");
  const out = sets.map(s => s[rnd(s.length)]);
  while (out.length < len) out.push(all[rnd(all.length)]);
  for (let i = out.length - 1; i > 0; i--) { const j = rnd(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join("");
}
let current = "", run = 0;
const kind = c => /\d/.test(c) ? "d" : /[A-Za-z]/.test(c) ? "" : "s";
function show() {
  current = generate();
  const el = $("pw"), id = ++run, pool = SETS.U + SETS.L + SETS.N + SETS.S;
  el.textContent = ""; el.setAttribute("aria-label", current);
  const spans = [...current].map(c => { const s = document.createElement("span"); el.appendChild(s); return s; });
  const finish = () => [...current].forEach((c, i) => { spans[i].textContent = c; spans[i].className = kind(c); });
  if (reduced()) finish();
  else { // efecto de "descifrado": cada carácter se fija escalonadamente
    const t0 = performance.now(), n = current.length;
    (function frame(now) {
      if (id !== run) return;
      const t = now - t0;
      let pending = false;
      spans.forEach((s, i) => {
        if (t >= 260 + i * (520 / n)) { if (s.textContent !== current[i] || !s.className && kind(current[i])) { s.textContent = current[i]; s.className = kind(current[i]); } }
        else { pending = true; s.textContent = pool[rnd(pool.length)]; s.className = "x"; }
      });
      if (pending) requestAnimationFrame(frame); else finish();
    })(t0);
  }
  const r = analyze(current);
  paint(r, "gm", "gl"); $("ge").textContent = Math.round(r.bits) + " bits";
}

/* ---------- Analizador ---------- */
function analyze(p) {
  const f = { len: p.length >= 12, U: /[A-Z]/.test(p), L: /[a-z]/.test(p), N: /\d/.test(p), S: /[^A-Za-z0-9]/.test(p) };
  let pool = 0; if (f.L) pool += 26; if (f.U) pool += 26; if (f.N) pool += 10; if (f.S) pool += 33; if (/[^\x00-\x7f]/.test(p)) pool += 60;
  const per = Math.log2(Math.max(pool, 2)); let bits = 0, runs = false;
  for (let i = 0; i < p.length; i++) {
    const d = i ? Math.abs(p.charCodeAt(i) - p.charCodeAt(i - 1)) : 9;
    if (i && d <= 1) { bits += 1; runs = true; } else bits += per;
  }
  const norm = p.toLowerCase().replace(/[@43015$!7]/g, c => LEET[c]);
  let common = false;
  if (COMMON.includes(norm)) { bits = Math.min(bits, 8); common = true; }
  else for (const w of COMMON) if (w.length >= 4 && norm.includes(w)) { bits -= Math.max(0, w.length * per - 10); common = true; }
  const year = /(19|20)\d{2}/.test(p);
  bits = Math.min(Math.max(bits, 0), 1000);
  let score = bits < 28 ? 0 : bits < 36 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
  if (p.length < 8) score = Math.min(score, 1); if (common) score = Math.min(score, 2);
  const secs = Math.pow(2, bits - 1);
  return { bits, score, f, common, runs, year, off: secs / 1e10, on: secs / 100, len: p.length, types: [f.U, f.L, f.N, f.S].filter(Boolean).length };
}
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

/* ---------- Presentación ---------- */
function paint(r, meter, label) {
  const m = $(meter); m.style.setProperty("--c", LV[r.score][1]);
  [...m.children].forEach((s, i) => { s.style.setProperty("--dl", i * 45 + "ms"); s.classList.toggle("on", i <= r.score); });
  $(label).textContent = LV[r.score][0]; $(label).style.color = LV[r.score][1];
}
function bump(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
function countTo(el, to) {
  const from = +el.dataset.v || 0; el.dataset.v = to;
  if (reduced() || from === to) { el.textContent = Math.round(to) + " bits"; return; }
  const t0 = performance.now(), dur = 450;
  (function f(now) {
    const k = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e) + " bits";
    if (k < 1) requestAnimationFrame(f);
  })(t0);
}
function setText(el, v) { if (el.textContent !== v) { el.textContent = v; bump(el); } }

$("list").innerHTML = CHECKS.map(([k, t]) => `<li data-k="${k}">${t}</li>`).join("");
let lastTips = "";
function validate() {
  const p = $("chk").value, items = [...$("list").children];
  if (!p) {
    [...$("vm").children].forEach(s => s.classList.remove("on"));
    $("vl").textContent = "Sin evaluar"; $("vl").style.color = ""; $("vs").textContent = "";
    $("sb").textContent = $("sc").textContent = $("so").textContent = "—"; $("sb").dataset.v = 0;
    items.forEach(li => li.className = ""); $("tips").innerHTML = ""; lastTips = ""; return;
  }
  const r = analyze(p); paint(r, "vm", "vl");
  $("vs").textContent = r.len + " caracteres";
  countTo($("sb"), r.bits); setText($("sc"), fmt(r.off)); setText($("so"), fmt(r.on));
  items.forEach(li => { const k = li.dataset.k, ok = (k === "common" || k === "runs") ? !r[k] : r.f[k]; li.className = ok ? "ok" : "bad"; });
  const tips = [];
  if (r.common) tips.push("Contiene una palabra o clave muy usada. Cambiar letras por números (como a→4) no engaña a los atacantes.");
  if (r.runs) tips.push("Hay repeticiones o secuencias (aaa, 123, abc) que reducen mucho el esfuerzo de adivinarla.");
  if (r.year) tips.push("Incluye algo parecido a un año; fechas y cumpleaños son lo primero que se prueba.");
  if (!r.f.len) tips.push("Súbela a 12 caracteres o más: la longitud es lo que más aumenta la seguridad.");
  if (r.types < 3 && r.f.len) tips.push("Combina más tipos de caracteres o añade longitud para ampliar el alfabeto.");
  if (!tips.length) tips.push("Buena elección. Úsala solo en una cuenta y guárdala en un gestor de contraseñas.");
  const html = tips.map(t => `<p>${t}</p>`).join("");
  if (html !== lastTips) { $("tips").innerHTML = html; lastTips = html; }
}

/* ---------- Interfaz ---------- */
let tt; function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 1800); }
async function copy() {
  try { await navigator.clipboard.writeText(current); }
  catch (e) {
    const a = document.createElement("textarea"); a.value = current; document.body.appendChild(a); a.select();
    try { document.execCommand("copy"); } catch (_) { toast("No se pudo copiar"); a.remove(); return; } a.remove();
  }
  const b = $("copy"); b.textContent = "Copiada"; b.classList.add("done"); toast("Contraseña copiada");
  setTimeout(() => { b.textContent = "Copiar"; b.classList.remove("done"); }, 1500);
}
function fill() { $("len").style.setProperty("--p", (($("len").value - 8) / 56 * 100) + "%"); $("lenv").textContent = $("len").value; }

document.querySelectorAll(".btn,.ghost").forEach(b => b.addEventListener("pointerdown", e => { // efecto onda
  if (reduced()) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height), s = document.createElement("span");
  s.className = "rip"; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.appendChild(s); setTimeout(() => s.remove(), 650);
}));
$("gen").onclick = show; $("copy").onclick = copy;
$("send").onclick = () => { $("chk").value = current; validate(); $("chk").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" }); };
$("len").oninput = () => { fill(); show(); };
["oU", "oL", "oN", "oS", "oA"].forEach(i => $(i).onchange = show);
$("chk").oninput = validate;
$("eye").onclick = () => { const h = $("chk").type === "password"; $("chk").type = h ? "text" : "password"; $("eye").textContent = h ? "Ocultar" : "Mostrar"; $("eye").setAttribute("aria-pressed", h); };

// Aparición de la sección informativa al hacer scroll
const rv = document.querySelectorAll(".rv");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .15 });
  rv.forEach(el => io.observe(el));
} else rv.forEach(el => el.classList.add("in"));

fill(); show();
