import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLoading } from '../context/LoadingContext';
import { supabase } from '../supabase/client';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { Users as UsersIcon, Search, Mail, Phone, MapPin, Calendar, Trash2, Loader2 } from 'lucide-react';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const { startLoading, stopLoading } = useLoading();
    const [searchQuery, setSearchQuery] = useState('');

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
        <div style={{ direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#fff' }}>المستخدمين</h1>
                    <p style={{ color: 'var(--text-muted)' }}>عرض وإدارة بيانات المسجلين في المتجر</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(212, 175, 55, 0.1)',
                    padding: '8px 16px',
                    borderRadius: '50px',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    marginBottom: '2rem'
                }}
            >
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000'
                }}>
                    <UsersIcon size={18} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600' }}>المسجلين:</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--primary)' }}>{totalCount}</span>
                </div>
            </motion.div>

            <div className="glass-card" style={{
                padding: '20px',
                marginBottom: '30px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-md)'
            }}>
                <div style={{ position: 'relative', minWidth: '300px', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="ابحث بالاسم، البريد الإلكتروني، رقم الواتساب..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 45px 12px 12px',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '1rem',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px', color: 'var(--primary)' }}>
                    <Loader2 className="animate-spin" style={{ margin: '0 auto 20px', width: '40px', height: '40px' }} />
                    <p style={{ fontWeight: '600' }}>جاري تحميل المستخدمين...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
                    <AnimatePresence mode="popLayout">
                        {users.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="glass-panel"
                                style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}
                            >
                                <p>لا يوجد مستخدمين متاحين حالياً أو يطابقون بحثك</p>
                            </motion.div>
                        ) : (
                            users.map((user, index) => (
                                <motion.div
                                    key={user.id}
                                    ref={users.length === index + 1 ? lastUserRef : null}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                    className="glass-card"
                                    style={{
                                        padding: '25px',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border-color)',
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '15px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{
                                            width: '60px',
                                            height: '60px',
                                            borderRadius: '50%',
                                            background: 'rgba(212, 175, 55, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid var(--primary)',
                                            overflow: 'hidden'
                                        }}>
                                            {user.image ? (
                                                <img src={user.image} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <UsersIcon size={24} color="var(--primary)" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '4px' }}>{user.full_name || user.name || 'مستخدم بدون اسم'}</h3>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>#{user.id.substring(0, 8)}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <Mail size={16} />
                                            <span style={{ wordBreak: 'break-all' }}>{user.email}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <Phone size={16} />
                                            <span>{user.whatsapp || 'غير متوفر'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <MapPin size={16} />
                                            <span>
                                                {user.governorate ? `${user.governorate} - ${user.district || ''}` : 'العنوان غير متوفر'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <Calendar size={16} />
                                            <span>تاريخ التسجيل: {(() => {
                                                if (!user.created_at) return 'غير معروف';
                                                const date = new Date(user.created_at);
                                                if (isNaN(date.getTime())) return 'تاريخ غير صالح';
                                                return date.toLocaleDateString('ar-EG', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                });
                                            })()}</span>
                                        </div>
                                    </div>

                                    {user.neighborhood && (
                                        <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            <strong>الحي:</strong> {user.neighborhood}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleDeleteUser(user.id, user.full_name || user.name)}
                                        style={{
                                            marginTop: 'auto',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '12px',
                                            background: 'rgba(239, 68, 68, 0.05)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.1)',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            transition: '0.3s'
                                        }}
                                        className="btn-delete"
                                    >
                                        <Trash2 size={18} />
                                        حذف المستخدم نهائياً
                                    </button>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            )}

            {loadingMore && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Loader2 className="animate-spin" style={{ width: '30px', height: '30px', color: 'var(--primary)', margin: '0 auto' }} />
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default Users;
