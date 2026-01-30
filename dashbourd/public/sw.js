/* sw.js - Enhanced Deep Tracking and Background Logic */
console.log('[SW] Service Worker File Loaded');

self.addEventListener('push', function (event) {
    console.log('[SW] Push Event Received');

    let data;
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        console.error('[SW] Failed to parse push data', e);
        data = { title: 'Notification Error', body: 'Could not parse message' };
    }

    const title = data.title || 'طلب جديد من تايم تك! 🔔';
    const options = {
        body: data.body || 'توجد طلبات جديدة بانتظارك في لوحة التحكم.',
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'order-notif',
        renotify: true,
        requireInteraction: true, // Device stays awake/notif stays until dismissed
        data: {
            url: data.data?.url || '/orders'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow(event.notification.data.url);
        })
    );
});

// Immediately active the SW
self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});
