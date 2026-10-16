/* Tema oscuro / claro */
const THEME_KEY = 'sonorix-theme';
const cssRGB = () => getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '255,255,255';
const currentTheme = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name="theme-color"]'); if(m) m.content = t === 'light' ? '#ffffff' : '#000000';
  const b = document.getElementById('theme-toggle');
  if(b){ b.setAttribute('aria-label', t === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'); b.title = b.getAttribute('aria-label'); }
  dispatchEvent(new Event('themechange'));
}
function initTheme(){
  const btn = document.getElementById('theme-toggle');
  applyTheme(currentTheme());
  btn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
    const root = document.documentElement;
    if(document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      const r = btn.getBoundingClientRect();
      root.style.setProperty('--vt-x', (r.left + r.width/2) + 'px');
      root.style.setProperty('--vt-y', (r.top + r.height/2) + 'px');
      document.startViewTransition(() => applyTheme(next));
    } else {
      root.classList.add('theme-anim'); applyTheme(next);
      setTimeout(() => root.classList.remove('theme-anim'), 500);
    }
  });
  /* Si la persona nunca eligió, seguimos el tema del sistema */
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    let saved = null; try{ saved = localStorage.getItem(THEME_KEY); }catch(_){}
    if(!saved) applyTheme(e.matches ? 'light' : 'dark');
  });
}
