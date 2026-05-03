import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLoading } from '../context/LoadingContext';
import { supabase } from '../supabase/client';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, Trash2, CheckCircle, XCircle, RotateCcw, Loader2, ShoppingCart, TrendingUp, Clock, Users as UsersIcon, Box, ShoppingBag } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const { startLoading, stopLoading } = useLoading();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const observer = useRef();
    const lastOrderRef = useCallback(node => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    const fetchOrders = async (pageNum, isInitial = false) => {
        if (isInitial) {
            startLoading();
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            let query = supabase.from('orders');

            if (searchQuery) {
                const isUUID = searchQuery.length === 36 && /^[0-9a-f-]+$/i.test(searchQuery);
                const isNumericSearch = /^\d+$/.test(searchQuery.replace(/^ord/i, ''));

                if (isUUID) {
                    query = query.select('*, profiles(full_name, email, whatsapp, governorate, district, neighborhood)', { count: 'exact' })
                        .eq('id', searchQuery);
                } else if (isNumericSearch) {
                    const orderNum = parseInt(searchQuery.replace(/^ord/i, ''));
                    query = query.select('*, profiles(full_name, email, whatsapp, governorate, district, neighborhood)', { count: 'exact' })
                        .eq('order_number', orderNum);
                } else {
                    query = query.select('*, profiles!inner(full_name, email, whatsapp, governorate, district, neighborhood)', { count: 'exact' })
                        .or(`full_name.ilike.%${searchQuery}%,whatsapp.ilike.%${searchQuery}%`, { foreignTable: 'profiles' });
                }
            } else {
                query = query.select('*, profiles(full_name, email, whatsapp, governorate, district, neighborhood)', { count: 'exact' });
            }

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            query = query.order('created_at', { ascending: false });

            const from = pageNum * 6;
            const to = from + 5;
            const { data, error, count } = await query.range(from, to);

            if (error) throw error;

            if (isInitial) {
                setOrders(data || []);
            } else {
                setOrders(prev => [...prev, ...data]);
            }

            setHasMore(count > to + 1);
        } catch (error) {
            console.error("Critical Error fetching orders:", error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: `فشل تحميل الطلبات: ${error.message || 'خطأ غير معروف'}`,
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

    useEffect(() => {
        setPage(0);
        fetchOrders(0, true);
    }, [statusFilter, searchQuery]);

    useEffect(() => {
        if (page > 0) {
            fetchOrders(page);
        }
    }, [page]);

    useEffect(() => {
        const playNotificationSound = () => {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.error("Error playing sound:", e));
        };

        const channel = supabase
            .channel('orders_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        playNotificationSound();
                        const { data: newOrder, error } = await supabase
                            .from('orders')
                            .select('*, profiles(full_name, email, whatsapp, governorate, district, neighborhood)')
                            .eq('id', payload.new.id)
                            .single();

                        if (!error && newOrder) {
                            setOrders(prev => [newOrder, ...prev]);
                            Swal.fire({
                                title: 'طلب جديد!',
                                text: `تم استلام طلب جديد من ${newOrder.profiles?.full_name || 'عميل'}`,
                                icon: 'info',
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 5000,
                                background: '#141414',
                                color: '#fff'
                            });
                        } else {
                            setPage(0);
                            fetchOrders(0, true);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
                    } else if (payload.eventType === 'DELETE') {
                        setOrders(prev => prev.filter(o => o.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;

            if (statusFilter !== 'all' && statusFilter !== newStatus) {
                setOrders(prev => prev.filter(o => o.id !== orderId));
            } else {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            }

            Swal.fire({
                icon: 'success',
                title: 'تم التحديث',
                text: `تم تغيير حالة الطلب إلى ${newStatus === 'completed' ? 'مكتمل' : newStatus === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                background: '#141414',
                color: '#fff'
            });
        } catch (error) {
            console.error("Update status error:", error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'فشل تحديث حالة الطلب',
                background: '#141414',
                color: '#fff'
            });
        }
    };

    const handleDeleteOrder = async (orderId) => {
        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: "لن تتمكن من استرجاع هذا الطلب!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'نعم، احذف الطلب',
            cancelButtonText: 'إلغاء',
            background: '#141414',
            color: '#fff'
        });

        if (result.isConfirmed) {
            startLoading();
            try {
                const { error } = await supabase
                    .from('orders')
                    .delete()
                    .eq('id', orderId);

                if (error) throw error;

                setOrders(prev => prev.filter(order => order.id !== orderId));
                Swal.fire({
                    title: 'تم الحذف!',
                    text: 'تم حذف الطلب بنجاح.',
                    icon: 'success',
                    background: '#141414',
                    color: '#fff'
                });
            } catch (error) {
                console.error("Delete error:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ',
                    text: 'فشل حذف الطلب',
                    background: '#141414',
                    color: '#fff'
                });
            } finally {
                stopLoading();
            }
        }
    };

    const generateInvoice = async (order) => {
        startLoading('جاري إنشاء الفاتورة وتحميل البيانات...');
        const invoiceId = `ORD${order.order_number}`;
        const dateStr = new Date(order.created_at).toLocaleDateString('ar-SA');
        const profiles = order.profiles || {};
        const logo = '/logo.png';

        const items = Array.isArray(order.items) ? order.items : [];
        const itemsPerPageFirst = 7;
        const itemsPerPageNext = 12;
        const pages = [];
        let remainingItems = [...items];

        if (remainingItems.length === 0) {
            pages.push({ isFirst: true, items: [], isLast: true });
        } else {
            const firstPageItems = remainingItems.splice(0, itemsPerPageFirst);
            pages.push({ isFirst: true, items: firstPageItems, isLast: remainingItems.length === 0 });
            while (remainingItems.length > 0) {
                const nextItems = remainingItems.splice(0, itemsPerPageNext);
                pages.push({ isFirst: false, items: nextItems, isLast: remainingItems.length === 0 });
            }
        }

        const invoiceDiv = document.createElement('div');
        invoiceDiv.id = 'temp-invoice';
        invoiceDiv.style.position = 'absolute';
        invoiceDiv.style.left = '-9999px';
        invoiceDiv.style.top = '-9999px';
        invoiceDiv.style.width = '800px';

        invoiceDiv.innerHTML = pages.map((page, index) => `
            <div class="pdf-page" style="width: 800px; min-height: 1120px; padding: 40px; background: #ffffff; color: #000; font-family: 'Cairo', sans-serif; direction: rtl; box-sizing: border-box; position: relative; display: flex; flex-direction: column;">
                ${page.isFirst ? `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 30px;">
                        <div style="flex: 1; text-align: right;">
                            <h1 style="color: #d4af37; font-size: 28px; margin: 0 0 10px 0; font-weight: 700;letter-spacing: 0px;">تايم تك</h1>
                            <div style="font-size: 13px; color: #444; line-height: 1.8;">
                                 <p style="margin: 0;"><strong>تواصل : </strong> 770822310</p>
                                 <p style="margin: 0;"><strong>الإيميل : </strong> saeedbinmeslem@gmail.com</p>
                                 <p style="margin: 0;"><strong>العنوان : </strong> اليمن - حضرموت - المكلا</p>
                            </div>
                        </div>
                        <div style="flex: 1; text-align: center;">
                            <img src="${logo}" style="width: 100px; height: 100px;" />
                        </div>
                        <div style="flex: 1; text-align: left; display: flex; flex-direction: column; justify-content: space-between; height: 100px;">
                            <div>
                                <p style="margin: 0; font-size: 15px; color: #d4af37; font-weight: bold; font-style: italic;">"الفخامة ... في كل ثانية"</p>
                                <p style="margin: 5px 0 0; color: #888; font-size: 11px;">نصنع التميز، لنهديه إليكم</p>
                            </div>
                            <div style="font-size: 12px; color: #666;">
                                <span style="display: block; margin-bottom: 3px;">رقم الفاتورة: <strong>${invoiceId}</strong></span>
                                <span>التاريخ: ${dateStr}</span>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 40px; margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eee;">
                        <div style="flex: 1;">
                            <h3 style="color: #d4af37; margin-bottom: 10px; font-size: 16px;letter-spacing: 0px">بيانات العميل</h3>
                            <p style="margin: 5px 0;"><strong> الاسم : </strong> ${profiles.full_name || 'غير معروف'}</p>
                            <p style="margin: 5px 0;"><strong> واتساب : </strong> ${profiles.whatsapp || 'غير متوفر'}</p>
                            <p style="margin: 5px 0;"><strong>الإيميل : </strong> ${profiles.email || 'غير متوفر'}</p>
                        </div>
                        <div style="flex: 1;">
                            <h3 style="color: #d4af37; margin-bottom: 10px; font-size: 16px;letter-spacing: 0px">عنوان التوصيل</h3>
                            <p style="margin: 5px 0;"><strong> المحافظة : </strong> ${profiles.governorate || ''}</p>
                            <p style="margin: 5px 0;"><strong>المديرية : </strong> ${profiles.district || ''}</p>
                            <p style="margin: 5px 0;"><strong>الحي : </strong> ${profiles.neighborhood || ''}</p>
                        </div>
                    </div>
                ` : `
                    <div style="margin-bottom: 20px; border-bottom: 2px solid #d4af37; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #d4af37; font-weight: bold; font-size: 14px;">فاتورة رقم: ${invoiceId} (يتبع)</span>
                        <span style="color: #666; font-size: 12px;">صفحة ${index + 1}</span>
                    </div>
                `}
                <div style="flex: 1;">
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                        <thead>
                            <tr style="background: rgba(212, 175, 55, 0.1); color: #000;">
                                <th style="padding: 15px; text-align: right; border-bottom: 2px solid #d4af37;">رقم الموديل</th>
                                <th style="padding: 15px; text-align: right; border-bottom: 2px solid #d4af37;">المنتج</th>
                                <th style="padding: 15px; text-align: center; border-bottom: 2px solid #d4af37;">السعر</th>
                                <th style="padding: 15px; text-align: center; border-bottom: 2px solid #d4af37;">الكمية</th>
                                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #d4af37;">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${page.items.map(item => `
                                <tr style="border-bottom: 1px solid #eee; page-break-inside: avoid;">
                                    <td style="padding: 15px; text-align: right; color: #555; font-size: 13px; font-weight: bold;">#${item.displayId || '---'}</td>
                                    <td style="padding: 15px; text-align: right; color: #000; font-weight: 600;">${item.name || item.title}</td>
                                    <td style="padding: 15px; text-align: center; color: #333;">${(item.price || 0).toLocaleString()} ر.س</td>
                                    <td style="padding: 15px; text-align: center; color: #333;">${item.dp_qty || item.quantity || 1}</td>
                                    <td style="padding: 15px; text-align: left; color: #d4af37; font-weight: bold;">${((item.price || 0) * (item.dp_qty || item.quantity || 1)).toLocaleString()} ر.س</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${page.isLast ? `
                    <div style="display: flex; flex-direction: column; align-items: flex-start; margin-top: auto; padding: 20px; background: #fcfcfc; border: 1px solid #eee; border-radius: 8px;">
                        <div style="width: 100%; display: flex; justify-content: space-between; font-size: 22px; font-weight: bold;">
                            <span style="color: #000;">الإجمالي الكلي:</span>
                            <span style="color: #d4af37;">${order.total_amount.toLocaleString()} ر.س</span>
                        </div>
                    </div>
                ` : ''}
                <div style="margin-top: ${page.isLast ? '30px' : 'auto'}; text-align: center; color: #888; font-size: 13px; border-top: 1px solid #eee; padding-top: 20px;">
                    <p style="margin-bottom: 5px;">نشكركم على اختياركم متجر تايم تك - الفخامة في كل ثانية</p>
                </div>
            </div>
        `).join('');

        document.body.appendChild(invoiceDiv);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageElements = invoiceDiv.querySelectorAll('.pdf-page');

            for (let i = 0; i < pageElements.length; i++) {
                if (i > 0) pdf.addPage();
                const el = pageElements[i];
                const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pageWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            }
            pdf.save(`invoice_${invoiceId}.pdf`);
        } catch (error) {
            console.error('Invoice Generation Error:', error);
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل إنشاء الفاتورة', background: '#141414', color: '#fff' });
        } finally {
            if (document.body.contains(invoiceDiv)) document.body.removeChild(invoiceDiv);
            stopLoading();
        }
    };

    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const completedCount = orders.filter(o => o.status === 'completed').length;
    const totalRevenue = orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);

    return (
        <div style={{ direction: 'rtl', padding: '10px' }}>
            <div style={{ marginBottom: isMobile ? '2rem' : '3rem' }}>
                <h1 style={{ 
                    fontSize: isMobile ? '1.8rem' : '2.8rem', 
                    fontWeight: '900', 
                    color: '#fff', 
                    marginBottom: '8px', 
                    letterSpacing: '-1.5px' 
                }}>
                    إدارة الطلبات <span style={{ color: 'var(--primary)', fontSize: isMobile ? '0.9rem' : '1.2rem', verticalAlign: 'middle', opacity: 0.8 }}>| مركز العمليات</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>تتبع، تنظيم، وإصدار فواتير عملاء متجر تايم تك.</p>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', 
                gap: isMobile ? '12px' : '20px', 
                marginBottom: isMobile ? '2rem' : '3rem' 
            }}>
                {[
                    { label: 'بانتظار المعالجة', value: `${pendingCount} طلب`, icon: <ShoppingCart size={isMobile ? 18 : 22} />, color: 'var(--primary)', bg: 'rgba(212, 175, 55, 0.15)', delay: 0.1 },
                    { label: 'طلبات مكتملة', value: `${completedCount} طلب`, icon: <CheckCircle size={isMobile ? 18 : 22} />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', delay: 0.2 },
                    { label: 'الإجمالي الحالي', value: `${totalRevenue.toLocaleString()} ر.س`, icon: <TrendingUp size={isMobile ? 18 : 22} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', delay: 0.3 }
                ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: stat.delay }}
                        style={{ 
                            padding: isMobile ? '16px' : '20px', 
                            borderRadius: '20px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid var(--border-color)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: isMobile ? '12px' : '15px' 
                        }}>
                        <div style={{ 
                            width: isMobile ? '40px' : '45px', 
                            height: isMobile ? '40px' : '45px', 
                            borderRadius: '12px', 
                            background: stat.bg, 
                            color: stat.color, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            {stat.icon}
                        </div>
                        <div>
                            <p style={{ fontSize: isMobile ? '0.7rem' : '0.85rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{stat.label}</p>
                            <h4 style={{ fontSize: isMobile ? '1.1rem' : '1.4rem', fontWeight: '800', color: '#fff' }}>{stat.value}</h4>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div style={{ 
                padding: isMobile ? '16px' : '24px', 
                marginBottom: '40px', 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                gap: '20px', 
                alignItems: isMobile ? 'stretch' : 'center', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '24px', 
                backdropFilter: 'blur(10px)', 
                border: '1px solid var(--border-color)' 
            }}>
                <div style={{ position: 'relative', minWidth: isMobile ? '100%' : '320px', flex: 1.5 }}>
                    <Search size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', opacity: 0.7 }} />
                    <input type="text" placeholder="البحث برقم الطلب، الاسم، الواتساب..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px 48px 12px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '14px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', overflowX: 'auto', paddingBottom: isMobile ? '5px' : '0' }}>
                    {[{ label: 'الجميع', value: 'all' }, { label: 'انتظار', value: 'pending' }, { label: 'مكتمل', value: 'completed' }, { label: 'ملغي', value: 'cancelled' }].map(status => (
                        <button key={status.value} onClick={() => setStatusFilter(status.value)} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid', borderColor: statusFilter === status.value ? 'var(--primary)' : 'rgba(255,255,255,0.05)', background: statusFilter === status.value ? 'var(--primary)' : 'rgba(255,255,255,0.02)', color: statusFilter === status.value ? '#000' : 'var(--text-muted)', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{status.label}</button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px', color: 'var(--primary)' }}><Loader2 className="animate-spin" style={{ margin: '0 auto 20px', width: '50px', height: '50px' }} /><p style={{ fontWeight: '700' }}>جاري تحميل البيانات الفاخرة...</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '50px' }}>
                    <AnimatePresence mode="popLayout">
                        {orders.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '100px', opacity: 0.5 }}><ShoppingBag size={80} style={{ marginBottom: '20px', opacity: 0.2 }} /><p style={{ fontSize: '1.2rem' }}>لا توجد طلبات متوافقة مع هذا البحث</p></motion.div>
                        ) : (
                            orders.map((order, index) => (
                                <OrderCard 
                                    key={order.id} 
                                    order={order} 
                                    index={index} 
                                    lastOrderRef={orders.length === index + 1 ? lastOrderRef : null} 
                                    onUpdateStatus={handleUpdateStatus} 
                                    onDelete={handleDeleteOrder} 
                                    onInvoice={generateInvoice} 
                                    onImageClick={setSelectedImage}
                                />
                            ))
                        )}
                    </AnimatePresence>
                    {loadingMore && <div style={{ textAlign: 'center', padding: '20px' }}><Loader2 className="animate-spin" style={{ width: '40px', height: '40px', color: 'var(--primary)', margin: '0 auto' }} /></div>}
                </div>
            )}
            <ImagePreviewModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
        </div>
    );
};

const ImagePreviewModal = ({ imageUrl, onClose }) => {
    if (typeof window === 'undefined') return null;
    
    return createPortal(
        <AnimatePresence>
            {imageUrl && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        cursor: 'zoom-out'
                    }}
                >
                    <motion.img
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        src={imageUrl}
                        style={{
                            maxWidth: '100%',
                            width: 'auto',
                            maxHeight: '75vh',
                            objectFit: 'contain',
                            borderRadius: '16px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                            border: '2px solid rgba(212, 175, 55, 0.3)',
                            background: '#0a0a0a'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button 
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '25px',
                            right: '25px',
                            background: 'rgba(20,20,20,0.8)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff',
                            width: '45px',
                            height: '45px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s'
                        }}
                    >
                        <XCircle size={28} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

const OrderCard = ({ order, index, lastOrderRef, onUpdateStatus, onDelete, onInvoice, onImageClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isMobile = window.innerWidth < 768;
    const customerInfo = order.profiles || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const visibleItems = isExpanded ? items : items.slice(0, 2);
    const hasMoreItems = items.length > 2;

    return (
        <motion.div ref={lastOrderRef} layout initial={{ opacity: 0, scale: 0.98, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ 
                padding: isMobile ? '12px 16px' : '20px 30px', 
                background: 'rgba(255,255,255,0.02)', 
                borderBottom: '1px solid var(--border-color)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexDirection: 'row',
                gap: '10px' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '20px' }}>
                    <div style={{ padding: '6px 12px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                        <span style={{ fontSize: isMobile ? '0.85rem' : '1.1rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '0.5px' }}>ORD{order.order_number}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: isMobile ? '0.7rem' : '0.9rem' }}>
                        <Clock size={14} />{new Date(order.created_at).toLocaleString('ar-EG', { dateStyle: isMobile ? 'short' : 'medium', timeStyle: 'short' })}
                    </div>
                </div>
                <span style={{ 
                    padding: isMobile ? '4px 10px' : '6px 14px', 
                    borderRadius: '8px', 
                    fontSize: isMobile ? '0.65rem' : '0.75rem', 
                    fontWeight: '900', 
                    background: order.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : order.status === 'cancelled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)', 
                    color: order.status === 'completed' ? '#22c55e' : order.status === 'cancelled' ? '#ef4444' : '#eab308',
                    whiteSpace: 'nowrap'
                }}>
                    {order.status === 'completed' ? 'مكتمل' : order.status === 'cancelled' ? 'ملغي' : 'بانتظار'}
                </span>
            </div>
            <div style={{ padding: isMobile ? '16px' : '30px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? '24px' : '40px' }}>
                <div>
                    <h4 style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', color: '#fff', marginBottom: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}><UsersIcon size={16} color="var(--primary)" /> بيانات العميـل</h4>
                    <div style={{ fontSize: isMobile ? '0.85rem' : '1rem', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px', marginBottom: '4px' }}><span>الاسم الكامل:</span><span style={{ fontWeight: '700', color: '#fff' }}>{customerInfo.full_name || '---'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px', marginBottom: '4px' }}><span>الواتسـاب:</span><span style={{ fontWeight: '700', color: 'var(--primary)' }}>{customerInfo.whatsapp || '---'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>العنوان:</span><span style={{ fontWeight: '700', color: '#fff', textAlign: 'left' }}>{customerInfo.governorate} • {customerInfo.district}</span></div>
                    </div>
                </div>
                <div>
                    <h4 style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', color: '#fff', marginBottom: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}><Box size={16} color="var(--primary)" /> تفاصيل الشراء</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <AnimatePresence>
                            {visibleItems.map((item, idx) => (
                                <motion.div key={idx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <motion.img 
                                            src={item.image || item.imageUrl || (item.images && item.images[0]) || (item.variants && item.variants[0]?.image)} 
                                            onClick={() => onImageClick(item.image || item.imageUrl || (item.images && item.images[0]) || (item.variants && item.variants[0]?.image))}
                                            style={{ 
                                                width: isMobile ? '40px' : '50px', 
                                                height: isMobile ? '40px' : '50px', 
                                                borderRadius: '8px', 
                                                objectFit: 'cover',
                                                cursor: 'zoom-in'
                                            }} 
                                            whileHover={{ scale: 1.15, zIndex: 1 }}
                                            transition={{ type: 'spring', stiffness: 300 }}
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: isMobile ? '0.8rem' : '0.9rem', fontWeight: '700', color: '#fff' }}>{item.name || item.title}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{item.displayId ? `#${item.displayId}` : 'ساعة راقية'}</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'left' }}><span style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--primary)' }}>{item.dp_qty || item.quantity} ×</span><br/><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.price.toLocaleString()}</span></div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {hasMoreItems && (
                            <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                {isExpanded ? 'عرض أقل' : `+ ${items.length - 2} قطع أخرى`} <span>▼</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div style={{ 
                padding: isMobile ? '16px' : '24px 30px', 
                background: 'rgba(212, 175, 55, 0.03)', 
                borderTop: '1px solid var(--border-color)', 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'stretch' : 'center', 
                gap: isMobile ? '12px' : '20px' 
            }}>
                <div style={{ 
                    display: 'flex', 
                    gap: isMobile ? '10px' : '30px',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isMobile ? 'rgba(255,255,255,0.02)' : 'transparent',
                    padding: isMobile ? '10px 12px' : '0',
                    borderRadius: isMobile ? '12px' : '0',
                    border: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none'
                }}>
                    <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '2px' }}>الدفع</p>
                        <p style={{ fontSize: isMobile ? '0.85rem' : '0.9rem', fontWeight: '800', color: '#fff' }}>{order.payment_method === 'cash_on_delivery' ? 'كاش' : order.payment_method}</p>
                    </div>
                    <div style={{ borderRight: isMobile ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-color)', paddingRight: isMobile ? '10px' : '30px', textAlign: 'left' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '2px' }}>الإجمالـي</p>
                        <p style={{ fontSize: isMobile ? '1.1rem' : '1.6rem', fontWeight: '900', color: 'var(--primary)' }}>{Number(order.total_amount).toLocaleString()} <span style={{ fontSize: '0.75rem' }}>ر.س</span></p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: isMobile ? '6px' : '10px', flexDirection: 'row', width: isMobile ? '100%' : 'auto', flexWrap: 'nowrap' }}>
                    <motion.button 
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.98 }} 
                        onClick={() => onInvoice(order)} 
                        style={{ flex: 1, padding: isMobile ? '0 6px' : '0 15px', height: isMobile ? '38px' : '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '4px' : '8px', fontSize: isMobile ? '0.7rem' : '0.85rem', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        <Download size={isMobile ? 14 : 16} /> فاتورة
                    </motion.button>
                    
                    {order.status === 'pending' ? (
                        <>
                            <motion.button 
                                whileHover={{ scale: 1.02 }} 
                                whileTap={{ scale: 0.98 }} 
                                onClick={() => onUpdateStatus(order.id, 'completed')} 
                                style={{ flex: 1, padding: isMobile ? '0 6px' : '0 15px', height: isMobile ? '38px' : '44px', borderRadius: '12px', background: 'var(--primary)', color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '4px' : '8px', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '800', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)' }}>
                                <CheckCircle size={isMobile ? 14 : 18} /> إتمام
                            </motion.button>
                            <motion.button 
                                whileHover={{ scale: 1.05, background: '#ef4444', color: '#fff' }} 
                                whileTap={{ scale: 0.95 }} 
                                onClick={() => onUpdateStatus(order.id, 'cancelled')} 
                                title="إلغاء الطلب"
                                style={{ width: isMobile ? '38px' : '44px', height: isMobile ? '38px' : '44px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <XCircle size={isMobile ? 14 : 18} />
                            </motion.button>
                        </>
                    ) : (
                        <motion.button 
                            whileHover={{ scale: 1.02 }} 
                            whileTap={{ scale: 0.98 }} 
                            onClick={() => onUpdateStatus(order.id, 'pending')} 
                            style={{ flex: 1, padding: isMobile ? '0 6px' : '0 15px', height: isMobile ? '38px' : '44px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '4px' : '8px', fontSize: isMobile ? '0.7rem' : '0.85rem', fontWeight: '700', whiteSpace: 'nowrap' }}>
                            <RotateCcw size={isMobile ? 14 : 16} /> تراجع
                        </motion.button>
                    )}
                    
                    <motion.button 
                        whileHover={{ scale: 1.05, background: '#ef4444', color: '#fff' }} 
                        whileTap={{ scale: 0.95 }} 
                        onClick={() => onDelete(order.id)} 
                        title="حذف نهائي"
                        style={{ width: isMobile ? '38px' : '44px', height: isMobile ? '38px' : '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-dim)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trash2 size={isMobile ? 14 : 16} />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default Orders;
