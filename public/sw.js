const CACHE_NAME = 'gurugedara-academy-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json'
];

// Essential font domains and CDNs to cache for reliable offline rendering
const CACHE_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'api.dicebear.com',
  'images.unsplash.com'
];

// Install Service Worker and cache essential static assets shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching critical UI assets shell');
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[Service Worker] Non-blocking pre-cache warning:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate and clean up previous cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Evicting outdated cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch assets with optimized Stale-While-Revalidate and Offline Fallback strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Exclude real-time auth endpoints, firestore websockets, or internal API proxies
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.pathname.includes('/api/auth')
  ) {
    return;
  }

  const isCacheableOrigin = 
    url.origin === self.location.origin ||
    CACHE_DOMAINS.some(domain => url.hostname.includes(domain));

  if (!isCacheableOrigin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If we have a cached copy, return it immediately and fetch update in background
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network failed and request is a navigation, fallback to root index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return null;
        });

      // Return cached version if available, otherwise wait for network
      return cachedResponse || fetchPromise.then((res) => {
        if (res) return res;
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline Content Unavailable', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

