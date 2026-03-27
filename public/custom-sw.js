// public/custom-sw.js

globalThis.addEventListener('push', function(event) {
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
      url: data.url || '/' 
    },
    actions: [
      {
        action: 'explore',
        title: 'Otwórz',
      },
      {
        action: 'close',
        title: 'Zamknij',
      },
    ]
  }

  event.waitUntil(
    globalThis.registration.showNotification(data.title, options)
  )
})

globalThis.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data.url;

  event.waitUntil(
    globalThis.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(globalThis.registration.scope) && 'focus' in client) {
          client.focus(); 
          
          if (client.url !== targetUrl && 'navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }

      if (globalThis.clients.openWindow) {
        return globalThis.clients.openWindow(targetUrl);
      }
    })
  );
});