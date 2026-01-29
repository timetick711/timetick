// SW Version: 2.0 (Force Refresh)
const CACHE_NAME = 'time-tick-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('push', function (event) {
    console.log('[Service Worker] Push Received.');

    let data = {
        title: '🎉 طلب جديد!',
        body: 'وصل طلب جديد لمتجر Time Tick',
        url: '/orders'
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            console.warn('Push data not JSON, using text');
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: 'https://vciyuynmwdmzrmlfgpvh.supabase.co/storage/v1/object/public/logos/logo.png',
        badge: 'https://vciyuynmwdmzrmlfgpvh.supabase.co/storage/v1/object/public/logos/logo.png',
        vibrate: [200, 100, 200],
        tag: 'new-order-alert',
        renotify: true,
        requireInteraction: true, // يبقى الإشعار ظاهراً حتى يغلقه المستخدم
        data: {
            url: data.data?.url || data.url || '/orders'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'تنبه جديد', options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            const urlToOpen = event.notification.data.url;
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
