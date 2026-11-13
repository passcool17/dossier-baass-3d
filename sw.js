/* Service worker manuel.
   A single VERSION, taken from the registration URL (?v=), is used for
   the cache name, the precache query strings, and the page's
   navigator.serviceWorker.register('./sw.js?v=' + VERSION).
   HTML and data.js are network-first. skipWaiting + clients.claim.
   Old caches are deleted on activate. */
const VERSION = new URL(self.location.href).searchParams.get('v') || '0';
const VER = 'dossier-baass-3d-v' + VERSION;
const PRECACHE = [
'./',
  './index.html',
  './style.css?v=' + VERSION,
  './main.js?v=' + VERSION,
  './data.js',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest',
  './vendor/detect-gpu.esm.js',
  './vendor/meshopt_decoder.module.js',
  './vendor/basis/basis_transcoder.js',
  './vendor/basis/basis_transcoder.wasm',
  './assets/barn-v1.glb',
  './assets/barrel-v1.glb',
  './assets/box-large-v1.glb',
  './assets/box-small-v1.glb',
  './assets/building-a-v1.glb',
  './assets/building-f-v1.glb',
  './assets/building-l-v1.glb',
  './assets/building-s-v1.glb',
  './assets/cabinet-v1.glb',
  './assets/chimney-v1.glb',
  './assets/container-a-v1.glb',
  './assets/container-b-v1.glb',
  './assets/corridor-wide-corner-v1.glb',
  './assets/corridor-wide-end-v1.glb',
  './assets/corridor-wide-v1.glb',
  './assets/debris-v1.glb',
  './assets/fence-v1.glb',
  './assets/folder-v1.glb',
  './assets/gate-door-v1.glb',
  './assets/machine-fortified-v1.glb',
  './assets/machine-v1.glb',
  './assets/man-v1.glb',
  './assets/metal-fence-v1.glb',
  './assets/papers-v1.glb',
  './assets/rock-sand-v1.glb',
  './assets/rock-v1.glb',
  './assets/room-small-v1.glb',
  './assets/room-wide-v1.glb',
  './assets/screen-panel-v1.glb',
  './assets/shed-v1.glb',
  './assets/tank-v1.glb',
  './assets/tree-tall-v1.glb',
  './assets/tree-v1.glb',
  './assets/truck-v1.glb',
  './assets/ufo-v1.glb',
  './assets/water-tower-v1.glb',
  './assets/tr3b-v1.glb'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VER);
    await Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const threeCdn = url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('three@0.170.0/');
  if (url.origin !== self.location.origin && !threeCdn) return;

  const isDoc = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isDoc) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(VER);
        c.put(req, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(req)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  const path = url.pathname;
  const known = /\/(assets|vendor|detect-gpu-benchmarks)\//.test(path)
    || /[?&]v=/.test(url.search)
    || threeCdn;
  if (!known) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const c = await caches.open(VER);
          c.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        return caches.match(req);
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const fresh = await fetch(req);
    if (fresh && fresh.ok) {
      const c = await caches.open(VER);
      c.put(req, fresh.clone());
    }
    return fresh;
  })());
});
