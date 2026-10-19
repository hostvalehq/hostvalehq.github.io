// Hostvale service worker: instant launch from the phone's copy, quiet background updates, lock-screen notifications
const C = 'hostvale-v5';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(C).then((c) => c.addAll(['/app/', '/manifest.webmanifest?v=2', '/icon-192.png?v=2']).catch(() => {}))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  // stale-while-revalidate: answer from cache at once, refresh it in the background
  e.respondWith(caches.open(C).then(async (c) => {
    const hit = await c.match(r, { ignoreSearch: r.mode === 'navigate' ? false : false });
    const net = fetch(r).then((res) => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net; if (res) return res;
    return (await c.match('/app/')) || new Response('Offline', { status: 503 });
  }));
});
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Hostvale', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Hostvale', { body: d.body || '', icon: '/icon-192.png?v=2', badge: '/icon-192.png?v=2', tag: d.tag, data: { url: d.url || '/app/' } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/app/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => { for (const w of ws) { if (w.url.includes('/app')) { w.focus(); w.postMessage({ type: 'hv-refresh' }); return; } } return self.clients.openWindow(url); }));
});
