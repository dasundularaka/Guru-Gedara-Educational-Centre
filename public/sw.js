const CACHE_NAME = 'gurugedara-academy-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico'
];

// Install Service Worker and cache essential static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching static assets shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate and remove old caches to avoid obsolete assets
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old static asset cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch assets with optimized Stale-While-Revalidate strategy for static resources
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and local/static origins (exclude Auth/Firestore APIs)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Do not intercept or cache external auth requests, firestore queries, or standard API routes
  if (
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firebase') ||
    url.pathname.includes('/api') ||
    url.pathname.includes('/firestore')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background to silently update the cache (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Safe ignore background fetch failures when offline
          });
        return cachedResponse;
      }

      // Fetch from network and dynamically cache assets
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Cache Vite assets, fonts, icons, and image representations dynamically
          if (
            url.pathname.includes('/assets/') ||
            event.request.destination === 'image' ||
            event.request.destination === 'font' ||
            event.request.destination === 'style' ||
            event.request.destination === 'script'
          ) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }

          return networkResponse;
        })
        .catch((err) => {
          // If offline and request is document navigation, serve cached HTML shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          throw err;
        });
    })
  );
});
