"use strict";
/* eGenerate Pass Secure - interfaz. La lógica criptográfica y de análisis vive en engine.js */
const $ = id => document.getElementById(id);
const root = document.documentElement;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const LV = [["Muy débil", "var(--s0)"], ["Débil", "var(--s1)"], ["Aceptable", "var(--s2)"], ["Fuerte", "var(--s3)"], ["Excelente", "var(--s4)"]];
const CHECKS = [["len", "12 caracteres o más"], ["U", "Incluye mayúsculas"], ["L", "Incluye minúsculas"], ["N", "Incluye números"], ["S", "Incluye símbolos"], ["dict", "Sin palabras ni claves comunes"], ["pat", "Sin secuencias ni patrones"]];
const KIND = { dict: "Palabra común", seq: "Secuencia", kbd: "Teclado", rep: "Repetición", date: "Fecha o año" };

/* ---------- Logo con respaldo ---------- */
const FALLBACK = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 3 6 10v13c0 11 7.5 19 18 22 10.5-3 18-11 18-22V10z" fill="#3a4fd7"/><rect x="16" y="22" width="16" height="12" rx="2.5" fill="#fff"/><path d="M19.5 22v-4a4.5 4.5 0 0 1 9 0v4" fill="none" stroke="#fff" stroke-width="3"/></svg>');
$("logo").addEventListener("error", e => { e.target.onerror = null; e.target.src = FALLBACK; }, { once: true });

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
  } else { root.classList.add("tt"); apply(); setTimeout(() => root.classList.remove("tt"), 450); }
}
$("theme").addEventListener("click", e => {
  const b = e.currentTarget.getBoundingClientRect();
  setTheme(root.dataset.theme === "dark" ? "light" : "dark", b.left + b.width / 2, b.top + b.height / 2, true);
});
setTheme(root.dataset.theme || "light", 0, 0, false);

/* ---------- Utilidades de interfaz ---------- */
let tt; function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 2200); }
function bump(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
function setText(el, v) { if (el.textContent !== v) { el.textContent = v; bump(el); } }
function fill(el) { el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min) * 100) + "%"); }
function countTo(el, to) {
  const from = +el.dataset.v || 0; el.dataset.v = to;
  if (reduced() || from === to) { el.textContent = Math.round(to); return; }
  const t0 = performance.now();
  (function f(now) {
    const k = Math.min((now - t0) / 450, 1), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(f);
  })(t0);
}
function meter(id, score) {
  const m = $(id); m.style.setProperty("--c", LV[score][1]);
  [...m.children].forEach((s, i) => { s.style.setProperty("--dl", i * 45 + "ms"); s.classList.toggle("on", score >= 0 && i <= score); });
}

/* ---------- Generador ---------- */
let mode = 0, current = "", curBits = 0, run = 0;
const kind = c => /\d/.test(c) ? "d" : /[A-Za-z]/.test(c) ? "" : "s";
function build() {
  if (mode === 0) {
    const o = { len: +$("len").value, U: $("oU").checked, L: $("oL").checked, N: $("oN").checked, S: $("oS").checked, amb: $("oA").checked };
    if (!o.U && !o.L && !o.N && !o.S) { $("oL").checked = true; o.L = true; toast("Activa al menos una familia de caracteres"); }
    return EGPS.password(o);
  }
  return EGPS.phrase({ wc: +$("wc").value, sep: $("sep").value, cap: $("pC").checked, num: $("pN").checked });
}
function show() {
  const g = build(); current = g.text; curBits = g.bits;
  const el = $("pw"), id = ++run, pool = EGPS.SETS.U + EGPS.SETS.L + EGPS.SETS.N + EGPS.SETS.S;
  el.textContent = ""; el.setAttribute("aria-label", current);
  const spans = [...current].map(() => { const s = document.createElement("span"); el.appendChild(s); return s; });
  const settle = i => { spans[i].textContent = current[i]; spans[i].className = kind(current[i]); };
  if (reduced()) spans.forEach((_, i) => settle(i));
  else { // efecto de "descifrado": cada carácter se fija de forma escalonada
    const t0 = performance.now(), n = current.length;
    (function frame(now) {
      if (id !== run) return;
      let pending = false;
      spans.forEach((s, i) => {
        if (now - t0 >= 240 + i * (520 / n)) { if (s.textContent !== current[i] || s.className === "x") settle(i); }
        else { pending = true; s.textContent = pool[EGPS.rnd(pool.length)]; s.className = "x"; }
      });
      if (pending) requestAnimationFrame(frame);
    })(t0);
  }
  meter("gm", EGPS.scoreOf(curBits));
  const sc = EGPS.scoreOf(curBits);
  $("gl").textContent = LV[sc][0]; $("gl").style.color = LV[sc][1];
  $("ge").textContent = "≥ " + Math.floor(curBits) + " bits · hash rápido: " + EGPS.fmt(EGPS.seconds(curBits, EGPS.RATES.fast)).toLowerCase();
}
function setMode(m) {
  mode = m; $("seg").dataset.v = m;
  $("tR").setAttribute("aria-selected", m === 0); $("tP").setAttribute("aria-selected", m === 1);
  $("pRand").hidden = m !== 0; $("pPhrase").hidden = m !== 1;
  show();
}

/* ---------- Portapapeles e historial ---------- */
const hist = []; let clrT;
async function copyText(text, bits) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const a = document.createElement("textarea"); a.value = text; document.body.appendChild(a); a.select();
    try { document.execCommand("copy"); } catch (_) { toast("No se pudo copiar"); a.remove(); return false; } a.remove();
  }
  clearTimeout(clrT);
  if ($("oClr").checked) clrT = setTimeout(() => { try { navigator.clipboard.writeText(" "); } catch (e) {} }, 30000);
  if (bits != null && !hist.some(h => h.text === text)) { hist.unshift({ text, bits }); if (hist.length > 5) hist.pop(); renderHist(); }
  toast($("oClr").checked ? "Copiada. Se borrará del portapapeles en 30 s" : "Contraseña copiada");
  return true;
}
function renderHist() {
  $("hc").textContent = hist.length; $("hl").textContent = "";
  hist.forEach(h => {
    const li = document.createElement("li"), b = document.createElement("button"), em = document.createElement("em");
    b.type = "button"; b.title = "Copiar de nuevo";
    b.append(h.text.slice(0, 3) + "•".repeat(Math.min(10, Math.max(h.text.length - 3, 3))));
    em.textContent = Math.floor(h.bits) + " bits"; b.appendChild(em);
    b.onclick = () => copyText(h.text, null);
    li.appendChild(b); $("hl").appendChild(li);
  });
}
$("hclr").onclick = () => { hist.length = 0; renderHist(); toast("Historial borrado"); };

/* ---------- Validador ---------- */
$("list").innerHTML = CHECKS.map(([k, t]) => `<li data-k="${k}">${t}</li>`).join("");
let lastTips = "";
function validate() {
  const p = $("chk").value, items = [...$("list").children], ring = $("ring");
  if (!p) {
    meter("vm", -1); ring.style.strokeDashoffset = 263.9;
    $("vl").textContent = "Sin evaluar"; $("vl").style.color = ""; $("vs").textContent = "Escribe una contraseña para empezar.";
    $("sb").textContent = "—"; $("sb").dataset.v = 0; ["s1", "s2", "s3"].forEach(i => $(i).textContent = "—");
    items.forEach(li => li.className = ""); $("chips").textContent = ""; $("tips").textContent = ""; lastTips = ""; return;
  }
  const r = EGPS.analyze(p), c = LV[r.score][1];
  ring.style.setProperty("--c", c); ring.style.strokeDashoffset = 263.9 * (1 - Math.min(r.bits / 128, 1));
  $("vl").textContent = LV[r.score][0]; $("vl").style.color = c;
  $("vs").textContent = r.len + " caracteres · entropía estimada";
  countTo($("sb"), r.bits);
  setText($("s1"), EGPS.fmt(EGPS.seconds(r.bits, EGPS.RATES.online)));
  setText($("s2"), EGPS.fmt(EGPS.seconds(r.bits, EGPS.RATES.slow)));
  setText($("s3"), EGPS.fmt(EGPS.seconds(r.bits, EGPS.RATES.fast)));
  const st = { dict: !r.hasDict, pat: !r.hasPat };
  items.forEach(li => { const k = li.dataset.k, ok = k in st ? st[k] : r.f[k]; li.className = ok ? "ok" : "bad"; });
  const chips = $("chips"); chips.textContent = "";
  r.found.forEach(x => {
    const s = document.createElement("span"), code = document.createElement("code");
    s.className = "chip"; s.append(KIND[x.type] + " "); code.textContent = x.text; s.appendChild(code); chips.appendChild(s);
  });
  const tips = [];
  if (r.hasDict) tips.push("Contiene palabras o claves muy usadas. Cambiar letras por números (a→4, o→0) no engaña a los atacantes.");
  if (r.found.some(x => x.type === "seq" || x.type === "kbd")) tips.push("Hay secuencias o recorridos de teclado (abc, 1234, qwerty) que se prueban al principio.");
  if (r.found.some(x => x.type === "rep")) tips.push("Las repeticiones (aaa, abcabc) casi no añaden seguridad.");
  if (r.found.some(x => x.type === "date")) tips.push("Fechas y años son lo primero que se intenta; evita cumpleaños y años recientes.");
  if (!r.f.len) tips.push("Súbela a 12 caracteres o más: la longitud es lo que más aumenta la seguridad.");
  else if (r.types < 3 && !r.hasDict && !r.hasPat) tips.push("Combina más tipos de caracteres o añade longitud para ampliar el alfabeto.");
  if (!tips.length) tips.push("Buena elección. Úsala solo en una cuenta y guárdala en un gestor de contraseñas.");
  const html = tips.map(t => `<p>${t}</p>`).join("");
  if (html !== lastTips) { $("tips").innerHTML = html; lastTips = html; }
}

/* ---------- Eventos ---------- */
document.querySelectorAll(".btn,.ghost").forEach(b => b.addEventListener("pointerdown", e => { // efecto onda
  if (reduced()) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height), s = document.createElement("span");
  s.className = "rip"; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.appendChild(s); setTimeout(() => s.remove(), 650);
}));
$("gen").onclick = show;
$("copy").onclick = async () => {
  if (!await copyText(current, curBits)) return;
  const b = $("copy"); b.textContent = "Copiada"; b.classList.add("done");
  setTimeout(() => { b.textContent = "Copiar"; b.classList.remove("done"); }, 1500);
};
$("send").onclick = () => { $("chk").value = current; validate(); $("chk").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" }); };
$("hide").onclick = () => { const h = $("pw").classList.toggle("hide"); $("hide").textContent = h ? "Mostrar" : "Ocultar"; $("hide").setAttribute("aria-pressed", h); };
$("tR").onclick = () => mode !== 0 && setMode(0);
$("tP").onclick = () => mode !== 1 && setMode(1);
[["len", "lenv"], ["wc", "wcv"]].forEach(([i, o]) => { const el = $(i); el.oninput = () => { fill(el); $(o).textContent = el.value; show(); }; fill(el); });
["oU", "oL", "oN", "oS", "oA", "sep", "pC", "pN"].forEach(i => $(i).onchange = show);
$("chk").oninput = validate;
$("eye").onclick = () => { const h = $("chk").type === "password"; $("chk").type = h ? "text" : "password"; $("eye").textContent = h ? "Ocultar" : "Mostrar"; $("eye").setAttribute("aria-pressed", h); };
document.addEventListener("keydown", e => { // atajo: G genera una nueva fuera de los campos de texto
  if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) show();
});

const rv = document.querySelectorAll(".rv");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .15 });
  rv.forEach(el => io.observe(el));
} else rv.forEach(el => el.classList.add("in"));

show();
