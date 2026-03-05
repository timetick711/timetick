import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useLoading } from '../context/LoadingContext';
import {
    ShoppingBag,
    ShoppingCart,
    Users as UsersIcon,
    TrendingUp,
    Clock,
    ChevronLeft,
    Box,
    Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Home = () => {
    const [stats, setStats] = useState({
        products: 0,
        orders: 0,
        users: 0,
        revenue: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { startLoading, stopLoading } = useLoading();

    useEffect(() => {
        const fetchDashboardData = async () => {
            startLoading();
            setLoading(true);
            try {
                // 1. Fetch Counts
                const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
                const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
                const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

                // 2. Fetch Recent Orders
                const { data: ordersData } = await supabase
                    .from('orders')
                    .select('*, profiles(full_name, email)')
                    .order('created_at', { ascending: false })
                    .limit(5);

                // 3. Calculate Total Revenue (completed orders)
                const { data: revenueData } = await supabase
                    .from('orders')
                    .select('total_amount')
                    .eq('status', 'completed');

                const totalRevenue = revenueData?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;

                setStats({
                    products: productCount || 0,
                    orders: orderCount || 0,
                    users: userCount || 0,
                    revenue: totalRevenue
                });
                setRecentOrders(ordersData || []);
            } catch (error) {
                console.error("Dashboard fetch error:", error);
            } finally {
                setLoading(false);
                stopLoading();
            }
        };

        fetchDashboardData();
    }, []);

    const statCards = [
        { label: 'إجمالي المنتجات', value: stats.products, icon: Box, color: '#d4af37', bg: 'rgba(212, 175, 55, 0.1)' },
        { label: 'إجمالي الطلبات', value: stats.orders, icon: ShoppingBag, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
        { label: 'إجمالي المستخدمين', value: stats.users, icon: UsersIcon, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
        { label: 'إجمالي المبيعات', value: `${stats.revenue.toLocaleString()} ر.س`, icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    ];

    return (
        <div style={{ direction: 'rtl' }}>
            {/* Header */}
            <div style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#fff' }}>الرئيسية</h1>
                <p style={{ color: 'var(--text-muted)' }}>مرحباً بك في لوحة تحكم تايم تك. إليك ملخص أداء متجرك اليوم.</p>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '24px',
                marginBottom: '3rem'
            }}>
                {statCards.map((card, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass-card"
                        style={{
                            padding: '24px',
                            borderRadius: '20px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px'
                        }}
                    >
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '16px',
                            background: card.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: card.color
                        }}>
                            <card.icon size={28} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>{card.label}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff' }}>{card.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Content Body */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '30px'
            }}>
                {/* Recent Orders Section */}
                <div className="glass-card" style={{
                    padding: '24px',
                    borderRadius: '24px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ color: 'var(--primary)' }}><Clock size={22} /></div>
                            <h2 style={{ fontSize: '1.3rem', color: '#fff' }}>أحدث الطلبات</h2>
                        </div>
                        <Link to="/orders" style={{
                            color: 'var(--primary)',
                            fontSize: '0.85rem',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '600'
                        }}>
                            عرض الكل <ChevronLeft size={16} />
                        </Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {recentOrders.length > 0 ? recentOrders.map((order, idx) => (
                            <div key={order.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '45px',
                                        height: '45px',
                                        borderRadius: '12px',
                                        background: 'rgba(212, 175, 55, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--primary)',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem'
                                    }}>
                                        #{order.id.substring(0, 4)}
                                    </div>
                                    <div>
                                        <p style={{ color: '#fff', fontSize: '1rem', fontWeight: '600', marginBottom: '2px' }}>
                                            {order.profiles?.full_name || 'عميل مجهول'}
                                        </p>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                            {new Date(order.created_at).toLocaleDateString('ar-EG')}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '1.1rem' }}>
                                        {Number(order.total_amount).toLocaleString()} <span style={{ fontSize: '0.7rem' }}>ر.س</span>
                                    </p>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '2px 8px',
                                        borderRadius: '50px',
                                        background: order.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : order.status === 'cancelled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                        color: order.status === 'completed' ? '#22c55e' : order.status === 'cancelled' ? '#ef4444' : '#eab308',
                                    }}>
                                        {order.status === 'completed' ? 'مكتمل' : order.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>لا توجد طلبات بعد</p>
                        )}
                    </div>
                </div>

                {/* Quick Actions Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div className="glass-card" style={{
                        padding: '24px',
                        borderRadius: '24px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)',
                        flex: 1
                    }}>
                        <h2 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '20px' }}>إجراءات سريعة</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <Link to="/products/add" style={{
                                background: 'rgba(212, 175, 55, 0.1)',
                                border: '1px solid rgba(212, 175, 55, 0.2)',
                                color: 'var(--primary)',
                                padding: '20px',
                                borderRadius: '16px',
                                textDecoration: 'none',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px',
                                transition: '0.3s'
                            }}>
                                <Plus size={24} />
                                <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>إضافة منتج</span>
                            </Link>
                            <Link to="/orders" style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border-color)',
                                color: '#fff',
                                padding: '20px',
                                borderRadius: '16px',
                                textDecoration: 'none',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <ShoppingBag size={24} />
                                <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>عرض الطلبات</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
