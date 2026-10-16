/* FAQ, modal de descarga y efecto ripple */
function toggleFaq(btn){
  const item = btn.closest('.faq-item'), was = item.classList.contains('open');
  document.querySelectorAll('#faq-container .faq-item').forEach(el => {
    el.classList.remove('open'); el.querySelector('.faq-answer').style.maxHeight = '';
    el.querySelector('button').setAttribute('aria-expanded','false');
  });
  if(!was){
    item.classList.add('open'); btn.setAttribute('aria-expanded','true');
    const a = item.querySelector('.faq-answer'); a.style.maxHeight = a.scrollHeight + 'px';
  }
}

let modalTimer = null, modalOpener = null;
const $m = id => document.getElementById(id);

function openDownloadModal(){
  const modal = $m('download-modal');
  if(modalTimer || modal.classList.contains('open')) return;   // evita aperturas duplicadas
  modalOpener = document.activeElement;
  const fill = $m('modal-progress-fill'), msg = $m('modal-status-msg');
  fill.style.width = '0%'; msg.textContent = 'Verificando paquete de instalación…';
  $m('modal-state-loading').classList.remove('hidden'); $m('modal-state-success').classList.add('hidden');
  modal.classList.remove('hidden'); document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { modal.classList.add('open'); modal.querySelector('button').focus(); });

  let p = 0;
  modalTimer = setInterval(() => {
    p = Math.min(100, p + Math.floor(Math.random()*25) + 15);
    fill.style.width = p + '%';
    msg.textContent = p >= 80 ? 'Generando enlace de descarga…' : p > 40 ? 'Verificando firmas digitales…' : msg.textContent;
    if(p >= 100){
      clearInterval(modalTimer);
      setTimeout(() => {
        modalTimer = null;
        if(!modal.classList.contains('open')) return;       // se cerró mientras cargaba
        $m('modal-state-loading').classList.add('hidden'); $m('modal-state-success').classList.remove('hidden');
        lucide.createIcons(); triggerDownload(); confetti();
      }, 300);
    }
  }, 180);
}
function closeDownloadModal(){
  const modal = $m('download-modal');
  if(!modal.classList.contains('open')) return;
  clearInterval(modalTimer); modalTimer = null;
  modal.classList.remove('open'); document.body.style.overflow = '';
  setTimeout(() => { if(!modal.classList.contains('open')) modal.classList.add('hidden'); }, 250);
  if(modalOpener && modalOpener.focus) modalOpener.focus();
}
function triggerDownload(){
  const a = document.createElement('a'); a.href = APK_URL; a.download = APK_FILE; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}
function initModal(){
  const modal = $m('download-modal');
  $m('manual-link').href = APK_URL;
  modal.addEventListener('click', e => { if(e.target === modal) closeDownloadModal(); });
  document.addEventListener('keydown', e => {
    if(!modal.classList.contains('open')) return;
    if(e.key === 'Escape') return closeDownloadModal();
    if(e.key === 'Tab'){                                      // mantiene el foco dentro del modal
      const f = [...modal.querySelectorAll('button:not(.hidden *),a[href]')].filter(el => el.offsetParent !== null);
      if(!f.length) return;
      const first = f[0], last = f[f.length-1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });
}

function initRipple(){
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn-primary'); if(!b) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, d = document.createElement('span');
    d.className = 'ripple'; d.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;
    b.appendChild(d); setTimeout(() => d.remove(), 750);
  });
}
