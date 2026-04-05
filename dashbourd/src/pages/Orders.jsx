import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLoading } from '../context/LoadingContext';
import { supabase } from '../supabase/client';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, Trash2, CheckCircle, XCircle, RotateCcw, Loader2, ShoppingCart, TrendingUp, Clock, Users as UsersIcon, Box, ShoppingBag } from 'lucide-react';
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
        }
    };

    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const completedCount = orders.filter(o => o.status === 'completed').length;
    const totalRevenue = orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);

    return (
        <div style={{ direction: 'rtl', padding: '10px' }}>
            <div style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.8rem', fontWeight: '900', color: '#fff', marginBottom: '8px', letterSpacing: '-1.5px' }}>
                    إدارة الطلبات <span style={{ color: 'var(--primary)', fontSize: '1.2rem', verticalAlign: 'middle', opacity: 0.8 }}>| مركز العمليات</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>تتبع، تنظيم، وإصدار فواتير عملاء متجر تايم تك.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '3rem' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    style={{ padding: '20px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingCart size={22} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2px' }}>بانتظار المعالجة</p>
                        <h4 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>{pendingCount} طلب</h4>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    style={{ padding: '20px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2px' }}>طلبات مكتملة</p>
                        <h4 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>{completedCount} طلب</h4>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    style={{ padding: '20px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2px' }}>الإجمالي الحالي</p>
                        <h4 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>{totalRevenue.toLocaleString()} ر.س</h4>
                    </div>
                </motion.div>
            </div>

            <div style={{ padding: '24px', marginBottom: '40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '24px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', backdropFilter: 'blur(10px)', border: '1px solid var(--border-color)' }}>
                <div style={{ position: 'relative', minWidth: '320px', flex: 1.5 }}>
                    <Search size={20} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', opacity: 0.7 }} />
                    <input type="text" placeholder="البحث برقم الطلب، اسم العميل، أو الواتساب..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '14px 48px 14px 16px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '14px', color: '#fff', fontSize: '1rem', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {[{ label: 'الجميع', value: 'all' }, { label: 'بانتظار المراجعة', value: 'pending' }, { label: 'تم التسليم', value: 'completed' }, { label: 'ملغي', value: 'cancelled' }].map(status => (
                        <button key={status.value} onClick={() => setStatusFilter(status.value)} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid', borderColor: statusFilter === status.value ? 'var(--primary)' : 'rgba(255,255,255,0.05)', background: statusFilter === status.value ? 'var(--primary)' : 'rgba(255,255,255,0.02)', color: statusFilter === status.value ? '#000' : 'var(--text-muted)', cursor: 'pointer', fontWeight: '700' }}>{status.label}</button>
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
                                <OrderCard key={order.id} order={order} index={index} lastOrderRef={orders.length === index + 1 ? lastOrderRef : null} onUpdateStatus={handleUpdateStatus} onDelete={handleDeleteOrder} onInvoice={generateInvoice} />
                            ))
                        )}
                    </AnimatePresence>
                    {loadingMore && <div style={{ textAlign: 'center', padding: '20px' }}><Loader2 className="animate-spin" style={{ width: '40px', height: '40px', color: 'var(--primary)', margin: '0 auto' }} /></div>}
                </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
        </div>
    );
};

const OrderCard = ({ order, index, lastOrderRef, onUpdateStatus, onDelete, onInvoice }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const customerInfo = order.profiles || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const visibleItems = isExpanded ? items : items.slice(0, 2);
    const hasMoreItems = items.length > 2;

    return (
        <motion.div ref={lastOrderRef} layout initial={{ opacity: 0, scale: 0.98, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 30px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ padding: '8px 16px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.2)' }}><span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--primary)', letterSpacing: '1px' }}>ORD{order.order_number}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}><Clock size={16} />{new Date(order.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
                <span style={{ padding: '6px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '900', background: order.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : order.status === 'cancelled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)', color: order.status === 'completed' ? '#22c55e' : order.status === 'cancelled' ? '#ef4444' : '#eab308' }}>{order.status === 'completed' ? 'تـم التسليـم' : order.status === 'cancelled' ? 'طلب ملغـي' : 'بانتظـار المعالجـة'}</span>
            </div>
            <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
                <div>
                    <h4 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}><UsersIcon size={18} color="var(--primary)" /> بيانات العميـل</h4>
                    <div style={{ fontSize: '1rem', lineHeight: '2', color: 'var(--text-secondary)' }}>
                        <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>الاسم الكامل:</span><span style={{ fontWeight: '700', color: '#fff' }}>{customerInfo.full_name || 'غير متوفر'}</span></p>
                        <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>الواتسـاب:</span><span style={{ fontWeight: '700', color: 'var(--primary)' }}>{customerInfo.whatsapp || 'غير متوفر'}</span></p>
                        <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>العنوان:</span><span style={{ fontWeight: '700', color: '#fff' }}>{customerInfo.governorate} • {customerInfo.district}</span></p>
                    </div>
                </div>
                <div>
                    <h4 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}><Box size={18} color="var(--primary)" /> تفاصيل الشراء</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <AnimatePresence>
                            {visibleItems.map((item, idx) => (
                                <motion.div key={idx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff' }}>{item.name || item.title}</span><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{item.selectedColor || 'افتراضي'} • {item.selectedMaterial || 'افتراضي'}</span></div>
                                    <div style={{ textAlign: 'left' }}><span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--primary)' }}>{item.dp_qty || item.quantity} ×</span><br/><span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{item.price.toLocaleString()} ر.س</span></div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {hasMoreItems && (
                            <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                {isExpanded ? 'عرض أقل' : `عرض ${items.length - 2} أصناف أخرى...`} <span>▼</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div style={{ padding: '24px 30px', background: 'rgba(212, 175, 55, 0.03)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '30px' }}>
                    <div><p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>طريقة الدفع</p><p style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>{order.payment_method === 'cash_on_delivery' ? 'الدفع عند الاستلام' : order.payment_method}</p></div>
                    <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '30px' }}><p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>المبلغ الإجمالـي</p><p style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--primary)' }}>{Number(order.total_amount).toLocaleString()} <span style={{ fontSize: '0.9rem' }}>ر.س</span></p></div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onInvoice(order)} style={{ height: '45px', padding: '0 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: '700' }}><Download size={18} /> فاتورة PDF</motion.button>
                    {order.status === 'pending' ? (
                        <>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onUpdateStatus(order.id, 'completed')} style={{ height: '45px', padding: '0 24px', borderRadius: '12px', background: 'var(--primary)', color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: '800' }}><CheckCircle size={20} /> إكمال وتسليـم</motion.button>
                            <motion.button whileHover={{ scale: 1.05, background: '#ef4444', color: '#fff' }} whileTap={{ scale: 0.95 }} onClick={() => onUpdateStatus(order.id, 'cancelled')} style={{ height: '45px', width: '45px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XCircle size={20} /></motion.button>
                        </>
                    ) : (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onUpdateStatus(order.id, 'pending')} style={{ height: '45px', padding: '0 20px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: '700' }}><RotateCcw size={18} /> تراجع عن الحالة</motion.button>
                    )}
                    <motion.button whileHover={{ scale: 1.05, background: '#ef4444', color: '#fff' }} whileTap={{ scale: 0.95 }} onClick={() => onDelete(order.id)} style={{ height: '45px', width: '45px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-dim)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={18} /></motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default Orders;
