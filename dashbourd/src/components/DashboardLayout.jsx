import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/client';
import Swal from 'sweetalert2';
import {
    LayoutDashboard,
    LogOut,
    User,
    Menu,
    X,
    ShoppingBag,
    Users,
    Bell
} from 'lucide-react';

const logo = '/logo.png';

// Simple notification sound (Base64)
const notificationSound = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"); // Placeholder short beep (needs real base64 or file)
// Better real sound:
const playNotificationSound = () => {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio play failed (interaction needed first):", e));
    } catch (e) {
        console.error("Audio error", e);
    }
};

const DashboardLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Request Notification Permission
    useEffect(() => {
        if ("Notification" in window) {
            Notification.requestPermission();
        }
    }, []);

    const fetchPendingCount = async () => {
        const { count, error } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (!error) {
            setPendingCount(count || 0);
        }
    };

    // Global Order Listener
    useEffect(() => {
        fetchPendingCount();

        const channel = supabase
            .channel('global-orders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                (payload) => {
                    // Update count on any change
                    fetchPendingCount();

                    // Handle New Order Notification
                    if (payload.eventType === 'INSERT') {
                        console.log('New Order Received!', payload);

                        // 1. Play Sound
                        playNotificationSound();

                        // 2. Show System Notification (if allowed)
                        if (Notification.permission === "granted") {
                            new Notification("طلب جديد!", {
                                body: `رقم الطلب: ${payload.new.id.substring(0, 8)}\nالمبلغ: ${payload.new.total_amount}`,
                                icon: logo
                            });
                        }

                        // 3. Show In-App Toast
                        Swal.fire({
                            title: 'طلب جديد!',
                            text: `تم استلام طلب بقيمة ${payload.new.total_amount}`,
                            icon: 'success',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 5000,
                            timerProgressBar: true,
                            background: '#141414',
                            color: '#fff'
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const menuItems = [
        { path: '/', label: 'المنتجات', icon: LayoutDashboard },
        { path: '/orders', label: 'الطلبات', icon: ShoppingBag, badge: pendingCount > 0 ? pendingCount : null },
        { path: '/users', label: 'المستخدمين', icon: Users },
    ];

    return (
        <div className="dashboard-container">
            {/* Mobile Menu Button */}
            <button className="mobile-menu-btn" onClick={toggleSidebar}>
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    className="sidebar-overlay open"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`glass-panel sidebar ${isSidebarOpen ? 'open' : ''}`}>
                {/* Brand */}
                <div style={{ marginBottom: '3rem', padding: '0 1rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px'
                    }}>
                        <img
                            src={logo} alt="Time Tick" style={{
                                width: '45px',
                                height: '45px',
                                borderRadius: '50%',
                                boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)',
                                border: '1px solid var(--primary)'
                            }}
                        />
                        <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: '800', letterSpacing: '1px' }}>
                            <span style={{ color: 'var(--primary)' }}>تايم</span> تك
                        </h2>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                            نظام إدارة المتجر
                        </p>
                        <button
                            onClick={() => {
                                if ("Notification" in window) {
                                    Notification.requestPermission().then(permission => {
                                        if (permission === 'granted') {
                                            new Notification("تم تفعيل التنبيهات بنجاح!");
                                        }
                                    });
                                }
                            }}
                            title="تفعيل التنبيهات"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                padding: '4px'
                            }}
                        >
                            <Bell size={16} />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1 }}>
                    <ul style={{ listStyle: 'none' }}>
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                            return (
                                <li key={item.path} style={{ marginBottom: '0.75rem' }}>
                                    <Link
                                        to={item.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '14px',
                                            padding: '14px 18px',
                                            color: isActive ? '#fff' : 'var(--text-muted)',
                                            textDecoration: 'none',
                                            borderRadius: '16px',
                                            transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            background: isActive ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                            fontWeight: isActive ? '700' : '500',
                                            border: isActive ? '1px solid rgba(212, 175, 55, 0.2)' : '1px solid transparent',
                                            position: 'relative'
                                        }}
                                    >
                                        <item.icon size={22} style={{ color: isActive ? 'var(--primary)' : 'inherit' }} />
                                        <span>{item.label}</span>
                                        {item.badge && (
                                            <span style={{
                                                background: '#ef4444',
                                                color: '#fff',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                padding: '2px 8px',
                                                borderRadius: '20px',
                                                marginRight: 'auto', // Pushes to the left in RTL
                                                boxShadow: '0 2px 5px rgba(239, 68, 68, 0.3)'
                                            }}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer / User */}
                <div style={{
                    marginTop: 'auto',
                    padding: '1.5rem 0 0',
                    borderTop: '1px solid var(--border-color)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '1.5rem',
                        padding: '0 0.8rem'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--glass-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <User size={20} color="var(--primary)" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.9rem', fontWeight: '700' }}>المدير</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email || 'متصل الآن'}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '14px 18px',
                            color: '#ef4444',
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid transparent',
                            cursor: 'pointer',
                            borderRadius: '16px',
                            width: '100%',
                            fontWeight: '600'
                        }}
                    >
                        <LogOut size={20} /> تسجيل الخروج
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <div
                    className="glass-panel main-panel"
                >
                    {/* Decorative Background for Main Content */}
                    <div style={{
                        position: 'absolute',
                        top: '-150px',
                        right: '-150px',
                        width: '300px',
                        height: '300px',
                        background: 'var(--primary)',
                        filter: 'blur(150px)',
                        opacity: '0.05',
                        zIndex: 0
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;

