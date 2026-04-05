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
        <div style={{ direction: 'rtl', padding: '10px' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '2.8rem', fontWeight: '900', color: '#fff', marginBottom: '8px', letterSpacing: '-1.5px' }}>
                        قاعدة العملاء <span style={{ color: 'var(--primary)', fontSize: '1.2rem', verticalAlign: 'middle', opacity: 0.8 }}>| إدارة المسجلين</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>عرض وإدارة بيانات المسجلين وهيكل العضوية في متجر تايم تك.</p>
                </div>
                
                {/* Premium Summary Card */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                        background: 'rgba(212, 175, 55, 0.05)',
                        border: '1px solid rgba(212, 175, 55, 0.15)',
                        padding: '16px 32px',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <div style={{ width: '52px', height: '52px', background: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', boxShadow: '0 8px 20px rgba(212, 175, 55, 0.3)' }}>
                        <UsersIcon size={24} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '2px' }}>إجمالي العملاء</p>
                        <h4 style={{ fontSize: '1.8rem', fontWeight: '950', color: '#fff', lineHeight: 1 }}>{totalCount}</h4>
                    </div>
                </motion.div>
            </div>

            {/* Control Bar */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '24px',
                borderRadius: '24px',
                marginBottom: '40px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                    <Search size={20} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', opacity: 0.7 }} />
                    <input
                        type="text"
                        placeholder="ابحث عن عميل: الاسم، البريد، أو الواتساب..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '14px 52px 14px 20px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            color: '#fff',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: '0.3s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '120px 0', color: 'var(--primary)' }}>
                    <Loader2 className="animate-spin" style={{ margin: '0 auto 24px', width: '56px', height: '56px' }} />
                    <p style={{ fontWeight: '800', fontSize: '1.1rem' }}>جاري استرجاع سجلات العملاء...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '30px', paddingBottom: '60px' }}>
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
    return (
        <motion.div
            ref={lastUserRef}
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, delay: (index % 6) * 0.05 }}
            whileHover={{ y: -5 }}
            style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '28px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                backdropFilter: 'blur(10px)',
                position: 'relative'
            }}
        >
            {/* User Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ 
                    width: '72px', height: '72px', borderRadius: '22px', 
                    background: 'rgba(212, 175, 55, 0.1)', border: '2px solid var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                }}>
                    {user.image ? (
                        <img src={user.image} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <UsersIcon size={32} color="var(--primary)" />
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
                        {user.full_name || user.name || 'مستخدم مجهول'}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield size={14} color="var(--primary)" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '900', letterSpacing: '1px' }}>
                            #{user.id.substring(0, 8).toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* User Info Grid */}
            <div style={{ display: 'grid', gap: '14px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontSize: '0.95rem' }}>
                    <div style={{ color: 'var(--primary)', opacity: 0.7 }}><Mail size={18} /></div>
                    <span style={{ opacity: 0.9, wordBreak: 'break-all' }}>{user.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontSize: '0.95rem' }}>
                    <div style={{ color: 'var(--primary)', opacity: 0.7 }}><Smartphone size={18} /></div>
                    <span style={{ opacity: 0.9 }}>{user.whatsapp || 'غير مسجل'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontSize: '0.95rem' }}>
                    <div style={{ color: 'var(--primary)', opacity: 0.7 }}><MapPin size={18} /></div>
                    <span style={{ opacity: 0.9 }}>{user.governorate ? `${user.governorate}, ${user.district || ''}` : 'العنوان غير محدد'}</span>
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
                    whileHover={{ scale: 1.02, background: 'rgba(239, 68, 68, 0.15)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onDelete}
                    style={{ 
                        flex: 1, height: '52px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', 
                        background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', 
                        fontWeight: '800', cursor: 'pointer', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', gap: '10px',
                        transition: '0.3s'
                    }}
                >
                    <Trash2 size={20} /> حذف العميل نهائياً
                </motion.button>
            </div>
        </motion.div>
    );
};

export default Users;
