import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLoading } from '../context/LoadingContext';
import { supabase } from '../supabase/client';
import Swal from 'sweetalert2';
import { Trash2, Plus, Package, Clock, Users, Bell, BellRing, Edit, Loader2 } from 'lucide-react';
import { setupNotifications } from '../utils/pushManager';
import { useAuth } from '../context/AuthContext';
import { deleteFromCloudinary } from '../utils/cloudinary';
import { Link, useNavigate } from 'react-router-dom';
import ProductStats from '../components/ProductStats';
import FilterBar from '../components/FilterBar';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalStats, setTotalStats] = useState({ total: 0, men: 0, women: 0, kids: 0 });
    const { startLoading, stopLoading } = useLoading();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Notification State
    const [isSubscribed, setIsSubscribed] = useState(false);

    // Filter States
    const [filterType, setFilterType] = useState('all');
    const [filterStyle, setFilterStyle] = useState('all');
    const [sortPrice, setSortPrice] = useState('none');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const observer = useRef();
    const lastProductRef = useCallback(node => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    const fetchStats = async () => {
        try {
            const { count: total } = await supabase.from('products').select('*', { count: 'exact', head: true });
            const { count: men } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category', 'men');
            const { count: women } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category', 'women');
            const { count: kids } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category', 'kids');

            setTotalStats({ total: total || 0, men: men || 0, women: women || 0, kids: kids || 0 });
        } catch (error) {
            console.error("Stats fetch error:", error);
        }
    };

    const fetchProducts = async (pageNum, isInitial = false) => {
        if (isInitial) {
            startLoading();
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            let query = supabase
                .from('products')
                .select('*', { count: 'exact' });

            // Apply Filters
            if (filterType !== 'all') query = query.eq('category', filterType);
            if (filterStyle !== 'all') query = query.eq('style', filterStyle);
            if (minPrice !== '') query = query.gte('price', Number(minPrice));
            if (maxPrice !== '') query = query.lte('price', Number(maxPrice));
            if (searchQuery) {
                // Search by name or displayId
                if (!isNaN(searchQuery)) {
                    query = query.or(`name.ilike.%${searchQuery}%,displayId.eq.${searchQuery}`);
                } else {
                    query = query.ilike('name', `%${searchQuery}%`);
                }
            }

            // Apply Sorting
            if (sortPrice === 'asc') query = query.order('price', { ascending: true });
            else if (sortPrice === 'desc') query = query.order('price', { ascending: false });
            else query = query.order('created_at', { ascending: false });

            const from = pageNum * 6;
            const to = from + 5;
            const { data, error, count } = await query.range(from, to);

            if (error) throw error;

            if (isInitial) {
                setProducts(data || []);
            } else {
                setProducts(prev => [...prev, ...data]);
            }

            setHasMore(count > (to + 1) || (data && data.length === 12));
            // A more robust hasMore check is to see if count > to + 1
            setHasMore(count > to + 1);
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'فشل تحميل المنتجات من قاعدة البيانات',
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

    // Filter changes
    useEffect(() => {
        setPage(0);
        fetchProducts(0, true);
        fetchStats();
    }, [filterType, filterStyle, sortPrice, minPrice, maxPrice, searchQuery]);

    // Page changes
    useEffect(() => {
        if (page > 0) {
            fetchProducts(page);
        }
    }, [page]);

    useEffect(() => {
        const subscription = supabase
            .channel('products-realtime')
            .on(
                'postgres_changes',
                { event: '*', table: 'products', schema: 'public' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setPage(0);
                        fetchProducts(0, true);
                        fetchStats();
                    } else if (payload.eventType === 'UPDATE') {
                        setProducts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
                    } else if (payload.eventType === 'DELETE') {
                        setProducts(prev => prev.filter(p => p.id !== payload.old.id));
                        fetchStats();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    useEffect(() => {
        const checkSubscription = async () => {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            }
        };
        checkSubscription();
    }, []);

    const handleTestNotification = async () => {
        const serverUrl = import.meta.env.VITE_SERVER_URL;

        if (!serverUrl || serverUrl === 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'رابط السيرفر مفقود!',
                text: 'يرجى إضافة VITE_SERVER_URL في إعدادات (Environment Variables) مشروع Dashboard في Vercel، ووضع رابط مشروع السيرفر هناك.',
                footer: '<a href="https://vercel.com" target="_blank">افتح إعدادات Vercel من هنا</a>',
                background: '#141414',
                color: '#fff'
            });
            return;
        }

        startLoading();
        try {
            const subscription = await setupNotifications(user.id);
            setIsSubscribed(!!subscription);

            if (subscription) {
                const response = await fetch(`${serverUrl}/api/test-notification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscription })
                });

                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'تم إرسال إشارة الاختبار!',
                        text: 'انتظر ثواني لتصلك الرسالة. إذا لم تصل، تأكد من إعدادات الويندوز أو المتصفح لديك، وجرب تثبيت الموقع كتطبيق (Install App).',
                        background: '#141414',
                        color: '#fff'
                    });
                } else {
                    const errorMsg = await response.text();
                    throw new Error(errorMsg || 'السيرفر رفض إرسال طلب الاختبار');
                }
            }
        } catch (error) {
            console.error("Diagnostic Error:", error);
            Swal.fire({
                icon: 'error',
                title: 'عذراً.. حدث خطأ',
                text: error.message,
                background: '#141414',
                color: '#fff'
            });
        } finally {
            stopLoading();
        }
    };

    const stats = [
        { label: 'إجمالي القطع', value: totalStats.total, color: 'var(--primary)' },
        { label: 'ساعات رجالية', value: totalStats.men },
        { label: 'ساعات نسائية', value: totalStats.women },
        { label: 'ساعات أطفال', value: totalStats.kids },
    ];

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: "لن تتمكن من التراجع عن الحذف!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء',
            background: '#141414',
            color: '#fff',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'rgba(255,255,255,0.1)'
        });

        if (result.isConfirmed) {
            startLoading();
            try {
                const { data: productToDelete, error: fetchError } = await supabase
                    .from('products')
                    .select('video, images, imageUrl')
                    .eq('id', id)
                    .single();

                if (!fetchError && productToDelete) {
                    if (productToDelete.video && productToDelete.video.includes('cloudinary')) {
                        await deleteFromCloudinary(productToDelete.video, 'video');
                    }
                    const imagesToDelete = new Set(productToDelete.images || []);
                    if (productToDelete.imageUrl) imagesToDelete.add(productToDelete.imageUrl);
                    for (const img of imagesToDelete) {
                        if (img && img.includes('cloudinary')) {
                            await deleteFromCloudinary(img, 'image');
                        }
                    }
                }

                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                setProducts(prev => prev.filter(p => p.id !== id));
                fetchStats();
                Swal.fire({ title: 'تم الحذف بنجاح', icon: 'success', background: '#141414', color: '#fff' });
            } catch (error) {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل الحذف', background: '#141414', color: '#fff' });
            } finally {
                stopLoading();
            }
        }
    };

    return (
        <div style={{ direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#fff' }}>المخزون</h1>
                    <p style={{ color: 'var(--text-muted)' }}>إدارة الساعات والمنتجات المتاحة في المتجر</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleTestNotification}
                        className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
                        title="تنشيط وإختبار الإشعارات"
                    >
                        {isSubscribed ? <BellRing size={20} /> : <Bell size={20} />}
                        <span>{isSubscribed ? 'تم الاشتراك' : 'تنشيط الإشعارات'}</span>
                    </button>
                    <button
                        onClick={() => navigate('/products/add')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus size={20} />
                        <span>إضافة منتج</span>
                    </button>
                </div>
            </div>

            <ProductStats stats={stats} />

            <FilterBar
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                filterType={filterType} setFilterType={setFilterType}
                filterStyle={filterStyle} setFilterStyle={setFilterStyle}
                minPrice={minPrice} setMinPrice={setMinPrice}
                maxPrice={maxPrice} setMaxPrice={setMaxPrice}
                sortPrice={sortPrice} setSortPrice={setSortPrice}
            />

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px', color: 'var(--primary)' }}>
                    <Loader2 className="animate-spin" style={{ margin: '0 auto 20px', width: '40px', height: '40px' }} />
                    <p style={{ fontWeight: '600' }}>جاري تحميل المخزون...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
                    {products.map((product, index) => (
                        <div
                            key={product.id}
                            ref={products.length === index + 1 ? lastProductRef : null}
                            className="glass-card"
                            style={{
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                background: 'rgba(255,255,255,0.02)'
                            }}
                        >
                            <div style={{ position: 'relative', height: '240px' }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '12px',
                                    background: 'var(--primary)',
                                    color: '#000',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: '800',
                                    zIndex: 5
                                }}>
                                    #{product.displayId || '---'}
                                </div>
                                <img
                                    src={product.imageUrl || (product.images && product.images[0]) || 'https://placehold.co/400x400/1a1a1a/ffffff?text=No+Image'}
                                    alt={product.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    background: 'rgba(0,0,0,0.6)',
                                    backdropFilter: 'blur(10px)',
                                    padding: '6px 14px',
                                    borderRadius: '50px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {product.style === 'classic' ? 'كلاسيكي' : product.style === 'formal' ? 'رسمي' : 'عرائسي'}
                                </div>
                            </div>

                            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <h3 style={{ fontSize: '1.3rem', color: '#fff' }}>{product.name}</h3>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                                        {Number(product.price).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>ر.س</span>
                                    </div>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', flex: 1, marginBottom: '24px' }}>
                                    {product.description?.length > 100 ? product.description.substring(0, 100) + '...' : product.description}
                                </p>

                                <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                    <Link
                                        to={`/products/edit/${product.id}`}
                                        className="btn-icon"
                                        style={{ flex: 1, borderRadius: '14px', gap: '8px', width: 'auto', fontWeight: '600', textDecoration: 'none', justifyContent: 'center' }}
                                    >
                                        <Edit size={18} /> تعديل
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="btn-icon"
                                        style={{ border: '1px solid rgba(239, 68, 68, 0.15)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {!loading && !loadingMore && products.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>لا توجد منتجات مطابقة للبحث</div>
                    )}
                </div>
            )}

            {loadingMore && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Loader2 className="animate-spin" style={{ width: '30px', height: '30px', color: 'var(--primary)', margin: '0 auto' }} />
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .loader { border-radius: 50%; }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default Products;
