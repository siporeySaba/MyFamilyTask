const CACHE_NAME = 'kids-tasks-v2';
const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/db.js',
  './js/auth.js',
  './js/firebaseInit.js',
  './js/taskCatalog.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Network-first רק לקבצי האפליקציה עצמה (כדי שעדכונים יגיעו מהר לטאבלט),
// עם נפילה למטמון בלי אינטרנט. בקשות של Firebase/Google עוברות ישירות לרשת.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
