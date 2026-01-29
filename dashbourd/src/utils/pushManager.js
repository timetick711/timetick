const VAPID_PUBLIC_KEY = 'BMJhbSmauKjruXLYzdbfuDLTjTdyFChC2oY8wbtaTgvx-nxlHwFwMon4w_IhfXo4nQ-AsYIhs61yQ99-TQ9JAbY';
const SERVER_URL = import.meta.env.VITE_SERVER_URL || ''; // Relative in production, or specific URL if provided

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const setupNotifications = async (userId) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications are not supported in this browser.');
        return;
    }

    try {
        // 1. Get properly defined SERVER_URL
        const serverUrl = import.meta.env.VITE_SERVER_URL || '';
        console.log('Attempting notification setup with Server:', serverUrl);

        // 2. Register Service Worker with absolute path
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });

        // Wait for it to be active
        await navigator.serviceWorker.ready;
        console.log('Service Worker is ready');

        // 3. Request Permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission denied');
            return;
        }

        // 4. Get or Create Subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            console.log('New subscription created');
        }

        // 5. Send to Server (with /api/ prefix for Vercel)
        const endpoint = `${serverUrl}/api/subscribe`;
        const response = await fetch(endpoint, {
            method: 'POST',
            body: JSON.stringify({
                subscription,
                user_id: userId
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server ignored subscription: ${errorText}`);
        }

        console.log('Successfully synced subscription with server');
        return subscription;
    } catch (error) {
        console.error('Push Setup Failed:', error);
        throw error;
    }
};
