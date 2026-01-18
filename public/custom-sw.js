// public/sw.js

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/', // Link do otwarcia
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received.');
  event.notification.close();
  
  // Otwórz URL po kliknięciu
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
       const url = event.notification.data.url;
       for (let i = 0; i < clientList.length; i++) {
         const client = clientList[i];
         if (client.url === url && 'focus' in client) return client.focus();
       }
       if (clients.openWindow) return clients.openWindow(url);
    })
  );
});