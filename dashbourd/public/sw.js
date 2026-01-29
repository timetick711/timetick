self.addEventListener('push', function (event) {
    console.log('Push Event received');
    let data = { title: 'تنبيه جديد', body: 'لديك إشعار من Time Tick Store' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: '🎉 طلب جديد!', body: event.data.text() };
        }
    }

    const options = {
        body: data.body,
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        tag: 'new-order-notification',
        renotify: true,
        data: {
            url: data.data?.url || '/orders'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
