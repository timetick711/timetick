self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        console.log('Push received:', data);

        const options = {
            body: data.body,
            icon: data.icon || '/logo.png',
            badge: '/logo.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.data?.url || '/'
            },
            actions: [
                { action: 'view', title: 'عرض الطلبات' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const urlToOpen = event.notification.data.url;

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
