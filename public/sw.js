const CACHE_NAME = 'gridxd-v3';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/Grid Neon Sin Fondo.png',
  '/LogoGridXDFAVICON.png',
  '/LogoMainGRIDXD.png',
  '/favicon.ico',
  '/manifest.json'
];

// Install: Pre-cache the shell resources
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Serve from cache or network, dynamically cache new resources
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Avoid caching Supabase auth or API calls
  if (url.pathname.startsWith('/v1/') || url.pathname.includes('/functions/') || url.hostname.includes('supabase.co') || url.pathname.includes('/auth/')) {
    return;
  }

  // Avoid caching foreign API calls/webhooks
  if (url.hostname.includes('railway.app') || url.hostname.includes('stripe.com')) {
    return;
  }

  // Strategy: Stale-While-Revalidate for same-origin assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchedResponse = fetch(event.request).then((networkResponse) => {
            // Only cache valid successful GET responses
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            console.warn('[SW] Network fetch failed:', err);
          });

          // Return cached response immediately if exists, or fall back to network fetch
          return cachedResponse || fetchedResponse;
        });
      })
    );
  }
});
