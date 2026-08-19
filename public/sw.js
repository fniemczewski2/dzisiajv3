// public/sw.js

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PAGES_CACHE = `pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `assets-${CACHE_VERSION}`;
const DATA_CACHE = `data-${CACHE_VERSION}`;
const KNOWN_CACHES = [STATIC_CACHE, PAGES_CACHE, ASSETS_CACHE, DATA_CACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !KNOWN_CACHES.includes(key)).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.origin !== self.location.origin) {
    console.warn(`Ignored message from unauthorized origin: ${event.origin}`);
    return;
  }

  if (event.data?.type === 'PURGE_DATA_CACHE') {
    event.waitUntil(caches.delete(DATA_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    // Unlike networkFirst/staleWhileRevalidate, this had no fallback for a
    // failed fetch — offline + cache-miss (e.g. right after a deploy changes
    // a static asset's hash) surfaced as an unhandled rejection instead of a
    // clean offline response.
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    const fallback = await cache.match('/');
    if (fallback) return fallback;
    throw new Error('offline');
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return hit || (await refresh) || Response.error();
}

async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  const cacheKey = new Request(request.url);
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const body = await response.clone().blob();
      const sanitized = new Response(body, {
        status: 200,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'X-SW-Cached-At': new Date().toISOString(),
        },
      });
      await cache.put(cacheKey, sanitized);
    }
    return response;
  } catch (err) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
    throw err;
  }
}

function isSupabaseRestGet(request, url) {
  return (
    request.method === 'GET' &&
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith('/rest/v1/')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (isSupabaseRestGet(request, url)) {
    event.respondWith(networkFirstData(request));
    return;
  }

  if (request.method !== 'GET') return;

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }

  if (request.destination === 'image' || request.destination === 'font' || request.destination === 'audio') {
    event.respondWith(staleWhileRevalidate(request, ASSETS_CACHE));
  }
});


self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let data = { title: 'Dzisiaj.Fun', message: 'Masz nowe powiadomienie.' };
      try {
        if (event.data) data = { ...data, ...event.data.json() };
      } catch (err) {
        console.error('[sw] Nieprawidłowy payload push:', err);
      }

      const options = {
        body: data.message || data.body,
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: data.id || 'notification-1',
          url: data.url || '/',
        },
        actions: [
          { action: 'explore', title: 'Otwórz' },
          { action: 'close', title: 'Zamknij' },
        ],
      };

      try {
        await self.registration.showNotification(data.title, options);
      } catch (err) {
        // A malformed field in `data` (e.g. non-string title) would
        // otherwise reject inside event.waitUntil with no fallback.
        console.error('[sw] showNotification failed:', err);
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  // The push payload's `url` (see the `push` handler above) is attacker-
  // influenced data, not a trusted value — resolve it against this SW's own
  // origin and refuse to navigate/open anything cross-origin.
  const rawUrl = event.notification.data?.url || '/';
  let targetUrl;
  try {
    const resolved = new URL(rawUrl, self.location.origin);
    targetUrl = resolved.origin === self.location.origin ? resolved.href : '/';
  } catch {
    targetUrl = '/';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.focus();

          if (client.url !== targetUrl && 'navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
