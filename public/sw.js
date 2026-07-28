// public/sw.js
//
// Poprzednia wersja miała PUSTY handler fetch (`return;`) — narzut na każde
// żądanie bez żadnej korzyści. Obecne strategie:
//
//  ZASOBY (app shell):
//  - /_next/static/*  -> cache-first (pliki immutable, hash w nazwie)
//  - nawigacje        -> network-first z fallbackiem do cache
//  - obrazy/fonty/audio (same-origin) -> stale-while-revalidate
//
//  DANE (Supabase REST):
//  - GET *.supabase.co/rest/v1/*  -> NETWORK-FIRST z fallbackiem do cache.
//    Świadomie NIE stale-while-revalidate: SWR zwróciłby cache natychmiast,
//    a świeża odpowiedź nigdy nie dotarłaby do aplikacji — użytkownik
//    oglądałby stare dane do następnego przeładowania. Network-first
//    zachowuje dotychczasową semantykę online (zawsze świeże), a offline
//    serwuje ostatnią znaną odpowiedź. Działa automatycznie dla wszystkich
//    hooków DB bez zmian w ich kodzie.
//  - POST/PATCH/DELETE oraz /auth/ i /realtime/ -> zawsze sieć, nigdy cache
//    (mutacje offline świadomie NIE są kolejkowane — hooki mają optimistic
//    update z rollbackiem i toastem błędu, co jest uczciwszym UX niż cicha
//    kolejka bez rozwiązywania konfliktów).
//
//  BEZPIECZEŃSTWO: cache danych (DATA_CACHE) jest czyszczony na komunikat
//  {type:'PURGE_DATA_CACHE'} wysyłany przy wylogowaniu (AuthProvider /
//  lib/offlineCache.ts) — współdzielony komputer nie serwuje danych
//  poprzedniego użytkownika.
//
// WERSJONUJ przy każdej zmianie strategii — activate czyści stare cache.
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
  if (event.data?.type === 'PURGE_DATA_CACHE') {
    event.waitUntil(caches.delete(DATA_CACHE));
  }
});

// ---------------------------------------------------------------------------
// Strategie
// ---------------------------------------------------------------------------

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
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
    // Ostatnia deska ratunku dla nawigacji offline: strona główna z cache.
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

// Network-first dla danych Supabase REST.
// Kluczem cache jest SAM URL (bez nagłówków): PostgREST może odpowiadać
// z `Vary` obejmującym nagłówki autoryzacji, co psułoby cache.match —
// dlatego odpowiedź jest przepisywana do "czystego" Response bez Vary.
// Izolacja użytkowników NIE opiera się na nagłówkach, tylko na:
//  (a) zapytania tej aplikacji filtrują po user_id w query stringu
//      (różny użytkownik => różny URL => różny klucz),
//  (b) twardym czyszczeniu DATA_CACHE przy wylogowaniu.
async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  const cacheKey = new Request(request.url);
  try {
    const response = await fetch(request);
    // Tylko pełne 200 (206 Partial z nagłówków Range/Prefer pomijamy —
    // niekompletna odpowiedź w cache byłaby gorsza niż żadna).
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

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

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

  // WARSTWA DANYCH: Supabase REST (cross-origin) — tylko odczyty.
  if (isSupabaseRestGet(request, url)) {
    event.respondWith(networkFirstData(request));
    return;
  }

  if (request.method !== 'GET') return;

  // Pozostały cross-origin (auth, realtime, functions, open-meteo, nbp,
  // kafelki mapy z własnym cache HTTP) — zawsze sieć.
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

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

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

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data.url;

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
