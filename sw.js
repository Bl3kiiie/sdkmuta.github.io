// SDK Muta Tournament Calculator - Service Worker
// This enables offline functionality and caching for the PWA

const CACHE_VERSION = 'v1';
const CACHE_NAME = `sdk-muta-kalkulator-${CACHE_VERSION}`;

// Files to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/logo.png'
];

// Install event - cache files
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching files');
      return cache.addAll(urlsToCache);
    }).catch(error => {
      console.log('[Service Worker] Cache failed:', error);
    })
  );
  // Activate immediately without waiting for other tabs to close
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('sdk-muta-kalkulator')) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim clients immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached response if available
      if (response) {
        console.log('[Service Worker] Serving from cache:', event.request.url);
        return response;
      }

      // Clone the request
      return fetch(event.request).then(response => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(error => {
        console.log('[Service Worker] Fetch failed, returning cached or offline:', error);
        // Return a cached response if available, otherwise offline page
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return a simple offline response
          return new Response(
            '<html><body><h1>Offline</h1><p>You are currently offline. The application will work with cached data.</p></body></html>',
            {
              headers: { 'Content-Type': 'text/html' },
              status: 503,
              statusText: 'Service Unavailable'
            }
          );
        });
      });
    })
  );
});

// Handle messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync (if supported)
// This can be used to sync data periodically
self.addEventListener('sync', event => {
  if (event.tag === 'sync-tournament-data') {
    console.log('[Service Worker] Background sync triggered');
    // In a real app, you would sync tournament data here
  }
});
