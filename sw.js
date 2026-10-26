// Keeps the app working offline. Bump VERSION whenever any file changes.
// The page itself is fetched from the network first, so phones pick up a new
// version as soon as they are online; the copies here are the offline fallback.
const VERSION = 'digitalizador-v8';
const FILES = ['./', 'index.html', 'jspdf.umd.min.js', 'ocr/tesseract.min.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's own HTTP cache, so the new files are really new
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const save = (req, res) => { if (res.ok){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; };
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin){
    // the page: network first (with a short wait), cached copy when offline
    if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')){
      e.respondWith(new Promise(resolve => {
        let done = false;
        const fallback = () => caches.match('index.html').then(r => { if (!done){ done = true; resolve(r || fetch(req)); } });
        const timer = setTimeout(fallback, 4000);
        fetch(req, { cache: 'no-store' }).then(res => { clearTimeout(timer); if (!done){ done = true; resolve(save(new Request('index.html'), res)); } }).catch(() => { clearTimeout(timer); fallback(); });
      }));
      return;
    }
    // everything else (scripts, icons, OCR data): cache first, then network
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => save(req, res))));
    return;
  }
  // fonts: network when possible, cached copy offline
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')){
    e.respondWith(fetch(req).then(res => save(req, res)).catch(() => caches.match(req)));
  }
});
