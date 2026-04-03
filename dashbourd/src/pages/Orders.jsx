import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLoading } from '../context/LoadingContext';
import { supabase } from '../supabase/client';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, Trash2, Eye, CheckCircle, XCircle, RotateCcw, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const { startLoading, stopLoading } = useLoading();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

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
                // If it's a full UUID, search by ID. Otherwise, search by profile name/whatsapp.
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
                    // Use !inner to filter the main table based on the join
                    query = query.select('*, profiles!inner(full_name, email, whatsapp, governorate, district, neighborhood)', { count: 'exact' })
                        .or(`full_name.ilike.%${searchQuery}%,whatsapp.ilike.%${searchQuery}%`, { foreignTable: 'profiles' });
                }
            } else {
                query = query.select('*, profiles(full_name, email, whatsapp, governorate, district, neighborhood)', { count: 'exact' });
            }

            // Apply Status Filter
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

    // Filter changes
    useEffect(() => {
        setPage(0);
        fetchOrders(0, true);
    }, [statusFilter, searchQuery]);

    // Page changes
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

                        // Fetch the full order with profiles for the new insertion
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
                            // Fallback to reload first page if single fetch fails
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
        const invoiceId = `ORD${order.order_number}`;
        const dateStr = new Date(order.created_at).toLocaleDateString('ar-SA');
        const profiles = order.profiles || {};

        const logo = '/logo.png';

        // --- Pagination Logic ---
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
                                <th style="padding: 15px; text-align: right; border-bottom: 2px solid #d4af37;">مواصفات الساعة</th>
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
                                    <td style="padding: 15px; text-align: right; color: #555; font-size: 14px;">
                                        <div style="display:flex; flex-direction:column; gap:4px;">
                                        <span>${item.selectedColor ? 'اللون: ' + item.selectedColor : '---'}</span>
                                        <span>${item.selectedMaterial ? 'السوار: ' + item.selectedMaterial : '---'}</span>
                                        </div>
                                    </td>
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
            const pageHeightA4 = pdf.internal.pageSize.getHeight();

            const pageElements = invoiceDiv.querySelectorAll('.pdf-page');

            for (let i = 0; i < pageElements.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }

                // Temporary set height logic to ensure html2canvas paints the full height needed
                const el = pageElements[i];

                const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
                const imgData = canvas.toDataURL('image/png');

                // Map the HTML width (800) exactly to the A4 width (210)
                const imgWidth = pageWidth;
                // Calculate height proportionally from canvas
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            }

            pdf.save(`invoice_${invoiceId}.pdf`);
        } catch (error) {
            console.error('Invoice Generation Error:', error);
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل إنشاء الفاتورة', background: '#141414', color: '#fff' });
        } finally {
            if (document.body.contains(invoiceDiv)) document.body.removeChild(invoiceDiv);
        }
    };

    return (
        <div style={{ direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#fff' }}>الطلبات</h1>
                    <p style={{ color: 'var(--text-muted)' }}>إدارة الطلبات، الفواتير، وبيانات العملاء</p>
                </div>
            </div>

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
                <div style={{ position: 'relative', minWidth: '250px', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="بحث باسم العميل أو الواتساب..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 40px 10px 10px',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontFamily: 'var(--font-main)'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {[
                        { label: 'الكل', value: 'all' },
                        { label: 'قيد الانتظار', value: 'pending' },
                        { label: 'مكتمل', value: 'completed' },
                        { label: 'ملغي', value: 'cancelled' }
                    ].map(status => (
                        <button
                            key={status.value}
                            onClick={() => setStatusFilter(status.value)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: statusFilter === status.value ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                background: statusFilter === status.value ? 'var(--primary)' : 'transparent',
                                color: statusFilter === status.value ? '#000' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                fontSize: '0.9rem'
                            }}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px', color: 'var(--primary)' }}>
                    <Loader2 className="animate-spin" style={{ margin: '0 auto 20px', width: '40px', height: '40px' }} />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <AnimatePresence mode="popLayout">
                        {orders.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>لا توجد طلبات</div>
                        ) : (
                            orders.map((order, index) => {
                                const customerInfo = order.profiles || {};
                                return (
                                    <motion.div
                                        key={order.id}
                                        ref={orders.length === index + 1 ? lastOrderRef : null}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="glass-card"
                                        style={{
                                            borderRadius: 'var(--radius-md)',
                                            padding: '24px',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid var(--border-color)',
                                            transition: '0.3s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                                    <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)' }}>ORD{order.order_number}</span>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '50px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '700',
                                                        background: order.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : order.status === 'cancelled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                                        color: order.status === 'completed' ? '#22c55e' : order.status === 'cancelled' ? '#ef4444' : '#eab308',
                                                        border: `1px solid ${order.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : order.status === 'cancelled' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`
                                                    }}>
                                                        {order.status === 'completed' ? 'مكتمل' : order.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}
                                                    </span>
                                                </div>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                    {new Date(order.created_at).toLocaleString('ar-EG')}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    onClick={() => generateInvoice(order)}
                                                    className="btn-icon"
                                                    style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--primary)', border: '1px solid rgba(212, 175, 55, 0.2)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                                    title="تحميل الفاتورة"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className="btn-icon"
                                                    style={{ background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                                    title="حذف الطلب"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                            <div>
                                                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Eye size={16} /> بيانات العميل
                                                </h4>
                                                <div style={{ fontSize: '0.95rem', lineHeight: '1.8' }}>
                                                    <p><strong style={{ color: '#fff' }}>الاسم:</strong> {customerInfo.full_name || 'غير معروف'}</p>
                                                    <p><strong style={{ color: '#fff' }}>واتساب:</strong> {customerInfo.whatsapp || 'غير متوفر'}</p>
                                                    <p><strong style={{ color: '#fff' }}>العنوان:</strong> {customerInfo.governorate || ''} - {customerInfo.district || ''}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '12px' }}>المنتجات ({Array.isArray(order.items) ? order.items.length : 0})</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {Array.isArray(order.items) && order.items.slice(0, 3).map((item, idx) => (
                                                        <div key={idx} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                                            <span>{item.name || item.title} (x{item.dp_qty || item.quantity})</span>
                                                            <span style={{ color: 'var(--text-muted)' }}>{item.price.toLocaleString()} ر.س</span>
                                                        </div>
                                                    ))}
                                                    {Array.isArray(order.items) && order.items.length > 3 && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>وعلى {order.items.length - 3} أصناف أخرى...</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div style={{ textAlign: 'left' }}>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>وسيلة الدفع: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{order.payment_method || 'غير محددة'}</span></p>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>الإجمالي الكلي</p>
                                                    <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>{order.total_amount} <span style={{ fontSize: '0.9rem' }}>ر.س</span></p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                                                    {order.status !== 'completed' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(order.id, 'completed')}
                                                            style={{
                                                                padding: '6px 14px',
                                                                borderRadius: '8px',
                                                                background: 'rgba(34, 197, 94, 0.1)',
                                                                color: '#22c55e',
                                                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                                                fontSize: '0.8rem',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '5px'
                                                            }}
                                                        >
                                                            <CheckCircle size={14} /> إكمال الطلب
                                                        </button>
                                                    )}
                                                    {order.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                                            style={{
                                                                padding: '6px 14px',
                                                                borderRadius: '8px',
                                                                background: 'rgba(239, 68, 68, 0.05)',
                                                                color: '#ef4444',
                                                                border: '1px solid rgba(239, 68, 68, 0.1)',
                                                                fontSize: '0.8rem',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '5px'
                                                            }}
                                                        >
                                                            <XCircle size={14} /> إلغاء
                                                        </button>
                                                    )}
                                                    {order.status !== 'pending' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(order.id, 'pending')}
                                                            style={{
                                                                padding: '6px 14px',
                                                                borderRadius: '8px',
                                                                background: 'rgba(234, 179, 8, 0.1)',
                                                                color: '#eab308',
                                                                border: '1px solid rgba(234, 179, 8, 0.2)',
                                                                fontSize: '0.8rem',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '5px'
                                                            }}
                                                        >
                                                            <RotateCcw size={14} /> رجوع
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            )
            }

            {
                loadingMore && (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Loader2 className="animate-spin" style={{ width: '30px', height: '30px', color: 'var(--primary)', margin: '0 auto' }} />
                    </div>
                )
            }

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div >
    );
};

export default Orders;
