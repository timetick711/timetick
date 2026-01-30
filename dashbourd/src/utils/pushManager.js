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
        // 1. Register Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');

        // 2. Request Permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission denied');
            return;
        }

        // 3. Get or Create Subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        // 4. Send to Server
        await fetch(`${SERVER_URL}/subscribe`, {
            method: 'POST',
            body: JSON.stringify({
                subscription,
                user_id: userId
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('User is subscribed for push notifications');
    } catch (error) {
        console.error('Failed to setup push notifications:', error);
    }
};
