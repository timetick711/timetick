/* sw.js - Service Worker for Push Notifications */

self.addEventListener('push', function (event) {
    console.log('[Service Worker] Push Received.');

    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            console.error('[Service Worker] Error parsing push data:', e);
            data = { title: 'إشعار جديد', body: event.data.text() };
        }
    }

    const title = data.title || 'تايم تك - طلب جديد! 📦';
    const options = {
        body: data.body || 'لديك طلب جديد في المتجر، يرجى التحقق.',
        icon: '/logo.png', // Ensure this exists in /public
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        tag: 'new-order', // Prevents multiple notifications for the same thing
        renotify: true,
        data: {
            url: data.data?.url || '/orders'
        },
        actions: [
            { action: 'open', title: 'فتح لوحة التحكم' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();

    const targetUrl = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
