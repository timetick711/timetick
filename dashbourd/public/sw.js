// Version: 1.1 (Force update)
self.addEventListener('push', function (event) {
    console.log('[Service Worker] Push Received.');

    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: '🎉 طلب جديد!', body: 'وصل طلب جديد للمتجر' };
        }
    }

    const title = data.title || 'تنبيه من Time Tick';
    const options = {
        body: data.body || 'لديك تحديث جديد في المتجر',
        icon: 'https://vciyuynmwdmzrmlfgpvh.supabase.co/storage/v1/object/public/logos/logo.png',
        badge: 'https://vciyuynmwdmzrmlfgpvh.supabase.co/storage/v1/object/public/logos/logo.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'new-order',
        renotify: true,
        data: {
            url: data.data?.url || '/orders'
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
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
