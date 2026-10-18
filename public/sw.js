// public/sw.js
//
// Service worker: pamięć podręczna wyłącznie dla zasobów aplikacji (skrypty,
// style, obrazy, strony). Danych użytkownika z Supabase NIE zapisujemy –
// kopię do pracy offline trzyma IndexedDB z kluczami per konto
// (lib/offlineCache.ts), czyszczona przy wylogowaniu.
// Zmiana CACHE_VERSION usuwa przy aktywacji wszystkie starsze pamięci, także
// dawną „data-v2” z odpowiedziami API.

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PAGES_CACHE = `pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `assets-${CACHE_VERSION}`;
const KNOWN_CACHES = new Set([STATIC_CACHE, PAGES_CACHE, ASSETS_CACHE]);

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !KNOWN_CACHES.has(key)).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.origin !== self.location.origin) {
    console.warn(`[sw] Zignorowano wiadomość z nieznanego źródła: ${event.origin}`);
    return;
  }

  // Wylogowanie: strony z pamięci mogły zawierać stan konta – usuwamy je.
  if (event.data?.type === 'PURGE_USER_DATA') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key !== STATIC_CACHE && key !== ASSETS_CACHE).map((key) => caches.delete(key)));
      })()
    );
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const response = await fetch(request);
    // Zapis do cache nie blokuje odpowiedzi; błąd (np. brak miejsca) pomijamy.
    if (response.ok) cache.put(request, response.clone()).catch(() => undefined);
    return response;
  } catch {
    return Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    // Zapis do cache nie blokuje odpowiedzi; błąd (np. brak miejsca) pomijamy.
    if (response.ok) cache.put(request, response.clone()).catch(() => undefined);
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
      // Zapis do cache nie blokuje odpowiedzi; błąd (np. brak miejsca) pomijamy.
    if (response.ok) cache.put(request, response.clone()).catch(() => undefined);
      return response;
    })
    .catch(() => undefined);
  return hit || (await refresh) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

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
        lang: 'pl',
        tag: data.tag || data.id || undefined,
        timestamp: Date.now(),
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
        console.error('[sw] showNotification failed:', err);
      }
    })()
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const options = event.oldSubscription?.options;
      if (!options?.applicationServerKey) return;
      try {
        const subscription = await self.registration.pushManager.subscribe(options);
        const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientsList) {
          client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', subscription: subscription.toJSON() });
        }
      } catch (err) {
        console.error('[sw] Odnowienie subskrypcji push nie powiodło się:', err);
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;
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
