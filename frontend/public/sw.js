// Progressive Web App Service Worker for FPMS

// Listen to push events dispatched from the backend Web Push server
self.addEventListener('push', function (event) {
  let data = {
    title: 'Pond Alert',
    body: 'Telemetry anomaly detected in your pond.',
    url: '/dashboard/updates',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/dashboard/updates',
    },
    actions: [
      { action: 'open', title: 'Open Dashboard' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Listen to notification clicks (user taps the alert on their device)
self.addEventListener('notificationclick', function (event) {
  event.notification.close(); // Close the notification sheet

  const targetUrl = event.notification.data?.url || '/dashboard/updates';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If a window is already open, focus it
      for (const client of clientList) {
        const url = new URL(client.url);
        if (url.pathname === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window/PWA shell
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
