const VAPID_PUBLIC_KEY = 'BMJhbSmauKjruXLYzdbfuDLTjTdyFChC2oY8wbtaTgvx-nxlHwFwMon4w_IhfXo4nQ-AsYIhs61yQ99-TQ9JAbY';
const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const setupNotifications = async (userId) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[Push] Browser not supported');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        // --- CRITICAL CONFIG CHECK ---
        if (!SERVER_URL) {
            console.error('[Push] ERROR: Missing VITE_SERVER_URL environment variable in Vercel settings!');
            return;
        }

        const baseUrl = SERVER_URL.replace(/\/+$/, '');
        const endpoint = `${baseUrl}/api/subscribe`;

        console.log('[Push] Registering at:', endpoint);

        const response = await fetch(endpoint, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription, user_id: userId })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Server ${response.status}: ${errBody}`);
        }

        console.log('[Push] SUCCESS: Registered successfully for background notifications!');
    } catch (error) {
        console.error('[Push] FAILED:', error.message);
    }
};
