import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLoading } from '../context/LoadingContext';
import { supabase } from '../supabase/client';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users as UsersIcon, Search, Mail, Phone, MapPin, 
    Calendar, Trash2, Loader2, UserCheck, Shield, 
    Smartphone, MessageSquare, Map, Clock, ArrowUpRight
} from 'lucide-react';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const { startLoading, stopLoading } = useLoading();
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const observer = useRef();
    const lastUserRef = useCallback(node => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    const fetchUsers = async (pageNum, isInitial = false) => {
        if (isInitial) {
            startLoading();
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            let query = supabase
                .from('profiles')
                .select('*', { count: 'exact' });

            if (searchQuery) {
                query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,whatsapp.ilike.%${searchQuery}%`);
            }

            query = query.order('created_at', { ascending: false });

            const from = pageNum * 6;
            const to = from + 5;
            const { data, error, count } = await query.range(from, to);

            if (error) throw error;

            if (isInitial) {
                setUsers(data || []);
                setTotalCount(count || 0);
            } else {
                setUsers(prev => [...prev, ...data]);
            }

            setHasMore(count > to + 1);
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'فشل تحميل بيانات المستخدمين',
                background: '#141414',
                color: '#fff'
            });
        } finally {
            if (isInitial) {
                setLoading(false);
                stopLoading();
            } else {
                setLoadingMore(false);
            }
        }
    };

    // Filter/Search changes
    useEffect(() => {
        setPage(0);
        fetchUsers(0, true);
    }, [searchQuery]);

    // Page changes
    useEffect(() => {
        if (page > 0) {
            fetchUsers(page);
        }
    }, [page]);

    const handleDeleteUser = async (userId, userName) => {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: `سيتم حذف حساب "${userName}" نهائياً وسيتم تسجيل خروجه فوراً!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف المستخدم',
            cancelButtonText: 'إلغاء',
            background: '#141414',
            color: '#fff',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'rgba(255,255,255,0.1)'
        });

        if (result.isConfirmed) {
            startLoading();
            try {
                const { error } = await supabase.rpc('delete_user_by_admin', {
                    target_user_id: userId
                });

                if (error) throw error;

                setUsers(prev => prev.filter(u => u.id !== userId));
                setTotalCount(prev => prev - 1);
                Swal.fire({
                    icon: 'success',
                    title: 'تم الحذف',
                    text: 'تم حذف المستخدم بنجاح وجاري إغلاق جلسته.',
                    background: '#141414',
                    color: '#fff'
                });
            } catch (error) {
                console.error('Delete Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ',
                    text: 'فشل حذف المستخدم. تأكد من تشغيل كود SQL المطلوب.',
                    background: '#141414',
                    color: '#fff'
                });
            } finally {
                stopLoading();
            }
        }
    };

    return (
        <div style={{ direction: 'rtl', padding: isMobile ? '5px' : '10px' }}>
            {/* Header Section */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'flex-end', 
                marginBottom: isMobile ? '2rem' : '3rem', 
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '20px' : '24px' 
            }}>
                <div>
                    <h1 style={{ 
                        fontSize: isMobile ? '1.8rem' : '2.8rem', 
                        fontWeight: '900', 
                        color: '#fff', 
                        marginBottom: '8px', 
                        letterSpacing: isMobile ? '-0.5px' : '-1.5px' 
                    }}>
                        قاعدة العملاء <span style={{ color: 'var(--primary)', fontSize: isMobile ? '0.8rem' : '1.2rem', verticalAlign: 'middle', opacity: 0.8 }}>| إدارة المسجلين</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>عرض وإدارة بيانات المسجلين وهيكل العضوية.</p>
                </div>
                
                {/* Premium Summary Card */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                        background: 'rgba(212, 175, 55, 0.05)',
                        border: '1px solid rgba(212, 175, 55, 0.15)',
                        padding: isMobile ? '12px 20px' : '16px 32px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '15px' : '20px',
                        backdropFilter: 'blur(10px)',
                        width: isMobile ? '100%' : 'auto'
                    }}
                >
                    <div style={{ 
                        width: isMobile ? '40px' : '52px', 
                        height: isMobile ? '40px' : '52px', 
                        background: 'var(--primary)', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#000', 
                        boxShadow: '0 8px 20px rgba(212, 175, 55, 0.3)' 
                    }}>
                        <UsersIcon size={isMobile ? 18 : 24} />
                    </div>
                    <div>
                        <p style={{ fontSize: isMobile ? '0.7rem' : '0.85rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '2px' }}>إجمالي العملاء</p>
                        <h4 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: '950', color: '#fff', lineHeight: 1 }}>{totalCount}</h4>
                    </div>
                </motion.div>
            </div>

            {/* Control Bar */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: isMobile ? '16px' : '24px',
                borderRadius: '20px',
                marginBottom: isMobile ? '20px' : '40px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : '300px' }}>
                    <Search size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', opacity: 0.7 }} />
                    <input
                        type="text"
                        placeholder="ابحث عن عميل..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 48px 12px 16px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '0.95rem',
                            outline: 'none',
                            transition: '0.3s'
                        }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: isMobile ? '60px 0' : '120px 0', color: 'var(--primary)' }}>
                    <Loader2 className="animate-spin" style={{ margin: '0 auto 24px', width: '56px', height: '56px' }} />
                    <p style={{ fontWeight: '800', fontSize: '1.1rem' }}>جاري استرجاع السجلات...</p>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', 
                    gap: isMobile ? '15px' : '30px', 
                    paddingBottom: '60px' 
                }}>
                    <AnimatePresence mode="popLayout">
                        {users.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', opacity: 0.3 }}>
                                <Shield size={80} style={{ marginBottom: '24px' }} />
                                <p style={{ fontSize: '1.4rem', fontWeight: '700' }}>لا يوجد سجلات تطابق شروط البحث</p>
                            </motion.div>
                        ) : (
                            users.map((user, index) => (
                                <UserCard 
                                    key={user.id} 
                                    user={user} 
                                    index={index} 
                                    onDelete={() => handleDeleteUser(user.id, user.full_name || user.name)}
                                    lastUserRef={users.length === index + 1 ? lastUserRef : null}
                                />
                            ))
                        )}
                    </AnimatePresence>
                </div>
            )}

            {loadingMore && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Loader2 className="animate-spin" style={{ width: '40px', height: '40px', color: 'var(--primary)', margin: '0 auto' }} />
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

const UserCard = ({ user, index, onDelete, lastUserRef }) => {
    const isMobile = window.innerWidth < 768;
    return (
        <motion.div
            ref={lastUserRef}
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, delay: (index % 6) * 0.05 }}
            style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '24px',
                padding: isMobile ? '20px' : '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '16px' : '24px',
                backdropFilter: 'blur(10px)',
                position: 'relative'
            }}
        >
            {/* User Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px' }}>
                <div style={{ 
                    width: isMobile ? '56px' : '72px', 
                    height: isMobile ? '56px' : '72px', 
                    borderRadius: '16px', 
                    background: 'rgba(212, 175, 55, 0.1)', border: '1.5px solid var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
                    flexShrink: 0
                }}>
                    {user.image ? (
                        <img src={user.image} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <UsersIcon size={isMobile ? 24 : 32} color="var(--primary)" />
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: isMobile ? '1rem' : '1.3rem', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
                        {user.full_name || user.name || 'مستخدم مجهول'}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield size={12} color="var(--primary)" />
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '900' }}>
                            #{user.id.substring(0, 8).toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* User Info Grid */}
            <div style={{ display: 'grid', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: isMobile ? '12px' : '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: isMobile ? '0.8rem' : '0.95rem' }}>
                    <div style={{ color: 'var(--primary)', opacity: 0.7 }}><Mail size={isMobile ? 16 : 18} /></div>
                    <span style={{ opacity: 0.9, wordBreak: 'break-all' }}>{user.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: isMobile ? '0.8rem' : '0.95rem' }}>
                    <div style={{ color: 'var(--primary)', opacity: 0.7 }}><Smartphone size={isMobile ? 16 : 18} /></div>
                    <span style={{ opacity: 0.9 }}>{user.whatsapp || '---'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: isMobile ? '0.8rem' : '0.95rem' }}>
                    <div style={{ color: 'var(--primary)', opacity: 0.7 }}><MapPin size={isMobile ? 16 : 18} /></div>
                    <span style={{ opacity: 0.9 }}>{user.governorate ? `${user.governorate}, ${user.district || ''}` : 'غير محدد'}</span>
                </div>
            </div>

            {/* Meta Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Clock size={16} />
                    <span>منذ: {user.created_at ? new Date(user.created_at).toLocaleDateString('ar-EG') : '---'}</span>
                </div>
                {user.neighborhood && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '10px', fontSize: '0.8rem', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {user.neighborhood}
                    </div>
                )}
            </div>

            {/* Action Area */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onDelete}
                    style={{ 
                        flex: 1, height: isMobile ? '44px' : '52px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', 
                        background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', 
                        fontWeight: '800', cursor: 'pointer', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontSize: isMobile ? '0.8rem' : '0.9rem'
                    }}
                >
                    <Trash2 size={isMobile ? 16 : 20} /> حذف العميل
                </motion.button>
            </div>
        </motion.div>
    );
};

export default Users;
