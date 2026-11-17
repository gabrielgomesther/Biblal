// Service Worker Offline — Suíte Bíblica Unificada (Bíblia 365 + Teologia Bíblica)
const CACHE_NAME = 'suite-biblica-unificada-pwa-v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './Biblia_365_e_Teologia_Unificado_PWA.html',
  './Biblia_Cronologica_365_Dias_PWA.html',
  './Curriculo_Teologia_Biblica_PWA.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        CORE_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res && res.ok) {
              await cache.put(url, res.clone());
              if (url.endsWith('index.html')) {
                await cache.put('./', res.clone());
              }
            }
          } catch (e) {}
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_CURRENT_PAGE' && event.data.url) {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const res = await fetch(event.data.url);
          if (res && res.ok) {
            await cache.put(event.data.url, res.clone());
            await cache.put('./', res.clone());
          }
        } catch (e) {}
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const netRes = await fetch(req);
          if (netRes && netRes.ok) {
            cache.put(req, netRes.clone());
            cache.put('./', netRes.clone());
            return netRes;
          }
        } catch (e) {}
        return (
          (await cache.match(req)) ||
          (await cache.match('./')) ||
          (await cache.match('./index.html')) ||
          (await cache.match('./Biblia_365_e_Teologia_Unificado_PWA.html')) ||
          (await cache.match('./Biblia_Cronologica_365_Dias_PWA.html')) ||
          (await cache.match('./Curriculo_Teologia_Biblica_PWA.html'))
        );
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const netPromise = fetch(req)
        .then((netRes) => {
          if (netRes && netRes.ok) {
            cache.put(req, netRes.clone());
          }
          return netRes;
        })
        .catch(() => cached);
      return cached || netPromise;
    })()
  );
});
