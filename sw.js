/* Service worker manuel.
   A single VERSION, taken from the registration URL (?v=), is used for
   the cache name, the precache query strings, and the page's
   navigator.serviceWorker.register('./sw.js?v=' + VERSION).
   HTML, CSS and all JS (including versioned ?v= URLs) are network-first,
   with cache: 'no-store', so this worker never serves stale code.
   Local modules are requested as ?v=VERSION (importmap in index.html),
   so an older already-installed SW cannot mix a new main.js with a
   cached unversioned mood.js.
   skipWaiting + clients.claim. Old caches are deleted on activate. */
const VERSION = new URL(self.location.href).searchParams.get('v') || '0';
const VER = 'dossier-baass-3d-v' + VERSION;
const PRECACHE = [
  './',
  './index.html',
  './style.css?v=' + VERSION,
  './main.js?v=' + VERSION,
  './data.js?v=' + VERSION,
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest',
  './vendor/detect-gpu.esm.js?v=' + VERSION,
  './vendor/touch-controls/touch-controls.js?v=' + VERSION,
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
  './assets/tr3b-v1.glb',
  './mood.js?v=' + VERSION,
  './props.js?v=' + VERSION,
  './character.js?v=' + VERSION,
  './camgrid.js?v=' + VERSION,
  './assets/models/detective_v1.glb?v=' + VERSION,
  './assets/sfx/ui_click.ogg',
  './assets/sfx/ui_open.ogg',
  './assets/sfx/pickup.ogg',
  './assets/sfx/tr3b_hum.ogg',
  './assets/sfx/door.ogg',
  './assets/sfx/bunker_blip.ogg',
  './assets/sfx/amb_desert.mp3',
  './assets/sfx/amb_hangar.mp3',
  './assets/sfx/amb_bunker.mp3',
  './assets/props-folder-v1.glb',
  './assets/props-folder-manilla-v1.glb',
  './assets/props-paperclip-v1.glb',
  './assets/props-cabinet-rusty-v1.glb',
  './assets/props-lab-cabinet-v1.glb',
  './assets/props-lab-things-v1.glb',
  './assets/props-server-rack-v1.glb',
  './assets/tex/concrete-wall-color.ktx2',
  './assets/tex/concrete-wall-normal.ktx2',
  './assets/tex/concrete-wall-orm.ktx2',
  './assets/tex/concrete-floor-color.ktx2',
  './assets/tex/concrete-floor-normal.ktx2',
  './assets/tex/concrete-floor-orm.ktx2',
  './assets/tex/sand-color.ktx2',
  './assets/tex/sand-normal.ktx2',
  './assets/tex/sand-orm.ktx2',
  './assets/tex/grate-color.ktx2',
  './assets/tex/grate-normal.ktx2',
  './assets/tex/grate-orm.ktx2',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VER);
    await Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

async function dropOldCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k)));
}

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    await self.clients.claim();
    await dropOldCaches();
    // A previous worker may still finish an in-flight put into its cache
    // after we first delete it; drop again once those settle.
    await new Promise((r) => setTimeout(r, 800));
    await dropOldCaches();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.waitUntil(dropOldCaches());
  const url = new URL(req.url);
  const threeCdn = url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('three@0.170.0/');
  if (url.origin !== self.location.origin && !threeCdn) return;

  const isDoc = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isCode = /\.(m?js|css)$/i.test(url.pathname);
  if (isDoc || isCode) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          const c = await caches.open(VER);
          c.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        return (await caches.match(req)) || (isDoc ? (await caches.match('./index.html')) : undefined);
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
