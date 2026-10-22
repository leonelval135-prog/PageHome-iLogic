/* Renderiza la lista de versiones a partir de VERSIONS (config.js) */
function versionCard(v){
  const latest = v.status === 'latest', soon = v.status === 'soon';
  const badge = latest
    ? '<span class="text-[11px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-bold px-2.5 py-1 rounded-full">Nueva versión</span>'
    : `<span class="text-[11px] bg-[var(--surface-2)] text-[var(--muted)] font-semibold px-2.5 py-1 rounded-full border border-[var(--border)]">${soon ? 'Próximamente' : 'Bloqueada'}</span>`;
  const action = latest
    ? '<button onclick="openDownloadModal()" class="magnetic w-full sm:w-auto shrink-0 px-6 py-3.5 rounded-xl btn-primary font-bold text-sm flex items-center justify-center gap-2 focus-ring"><i data-lucide="download" class="w-4 h-4"></i> Descargar</button>'
    : `<button disabled class="lock-shake w-full sm:w-auto shrink-0 px-6 py-3.5 rounded-xl btn-locked font-semibold text-sm flex items-center justify-center gap-2"><i data-lucide="${soon ? 'clock' : 'lock'}" class="w-4 h-4"></i> ${soon ? 'Próximamente' : 'Bloqueada'}</button>`;
  return `<div class="card ver ${latest ? 'latest' : 'locked'}">
    <div class="icon-box shrink-0"><i data-lucide="${v.icon}" class="w-6 h-6"></i></div>
    <div class="flex-1">
      <div class="flex items-center gap-3 mb-1 flex-wrap"><h3 class="text-xl">${v.name}</h3>${badge}</div>
      <p class="text-[var(--muted)] text-sm mb-1">${v.meta}</p>
      ${v.file ? `<p class="text-[var(--dim)] text-xs font-mono">${v.file}</p>` : ''}
      ${latest ? '<p class="text-[var(--accent)] text-xs font-mono mt-3 flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Disponible ahora</p>' : ''}
    </div>${action}</div>`;
}
function renderVersions(){
  const el = document.getElementById('versions-list');
  if(el) el.innerHTML = VERSIONS.map(versionCard).join('');
}
