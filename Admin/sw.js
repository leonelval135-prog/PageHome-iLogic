/* Service worker del panel A.M. Barber: recibe los avisos push aunque la pestaña o el navegador estén cerrados.
   Debe estar en la MISMA carpeta que index.html y servirse por https. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const tab = d.tab || 'cit', tag = 'amb-' + tab;

  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const enPantalla = wins.some(c => c.visibilityState === 'visible' && c.focused);

    // Safari/Chrome exigen mostrar una notificación por cada push.
    await self.registration.showNotification(d.title || 'A.M. Barber', {
      body: d.body || '',
      tag,
      renotify: true,
      data: { tab }
    });

    // Si ya estás mirando el panel, el panel avisa por su cuenta: cierra la del sistema a los pocos segundos.
    if (enPantalla) {
      await new Promise(r => setTimeout(r, 3500));
      (await self.registration.getNotifications({ tag })).forEach(n => n.close());
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const tab = (e.notification.data && e.notification.data.tab) || 'cit';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) {
      try { await c.focus(); } catch (_) {}
      c.postMessage({ type: 'open', tab });
      return;
    }
    await self.clients.openWindow(self.registration.scope + '?tab=' + encodeURIComponent(tab));
  })());
});
