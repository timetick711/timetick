require('dotenv').config();
const express = require('express');
const webPush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Supabase Setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Web Push Setup
webPush.setVapidDetails(
    `mailto:${process.env.EMAIL}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Health check
app.get('/api', (req, res) => {
    res.send('Notification Server is running on Vercel...');
});

// Endpoint to receive subscription and save it
app.post('/api/subscribe', async (req, res) => {
    const { subscription, user_id } = req.body;

    if (!subscription) {
        return res.status(400).json({ error: 'Subscription is required' });
    }

    try {
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: user_id || null, // Allow null for anonymous or failed auth
                subscription_json: JSON.stringify(subscription),
                updated_at: new Date()
            }, { onConflict: 'subscription_json' });

        if (error) throw error;

        res.status(201).json({ message: 'Subscribed successfully' });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Endpoint to be called by Supabase Webhook when new order arrives
app.post('/api/notify-new-order', async (req, res) => {
    const order = req.body.record;

    if (!order) {
        return res.status(400).json({ error: 'No order data provided' });
    }

    console.log('New order received via webhook:', order);

    try {
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('subscription_json');

        if (error) throw error;

        const payload = JSON.stringify({
            title: '🎉 طلب جديد!',
            body: `وصل طلب جديد بقيمة ${order.total_amount} ر.س`,
            icon: 'https://vciyuynmwdmzrmlfgpvh.supabase.co/storage/v1/object/public/logos/logo.png', // Update with a real public URL
            data: {
                url: '/orders',
                orderId: order.id
            }
        });

        const sendPromises = subscriptions.map(sub => {
            const subData = JSON.parse(sub.subscription_json);
            return webPush.sendNotification(subData, payload)
                .catch(err => {
                    console.error('Push error for sub:', err.statusCode);
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        return supabase.from('push_subscriptions').delete().eq('subscription_json', sub.subscription_json);
                    }
                });
        });

        await Promise.all(sendPromises);
        res.status(200).json({ status: 'Notifications sent' });
    } catch (error) {
        console.error('Notification trigger error:', error);
        res.status(500).json({ error: 'Failed to send notifications' });
    }
});

// For local testing (Vercel will ignore this)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Local server started on port ${PORT}`);
    });
}

module.exports = app;
