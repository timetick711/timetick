import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';
import { useLoading } from '../context/LoadingContext';
import { uploadToCloudinary } from '../utils/cloudinary';
import { 
    Save, Image as ImageIcon, Plus, Trash2, Layout, 
    GripVertical, ChevronDown, Monitor, Rocket, Search, Flame,
    Sparkles, Settings as SettingsIcon, AlertCircle,
    ArrowUpRight, Check
} from 'lucide-react';
import {
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Swal from 'sweetalert2';

// Sub-component for a sortable slide item
const SortableSlide = ({ slide, index, isExpanded, onToggle, onRemove, onImageUpload, onFieldChange }) => {
    const isMobile = window.innerWidth < 768;
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: slide.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        background: isDragging ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.02)',
        borderRadius: '24px',
        border: isDragging ? '1px solid var(--primary)' : '1px solid var(--border-color)',
        overflow: 'hidden',
        marginBottom: '20px',
        zIndex: isDragging ? 20 : 1,
        opacity: isDragging ? 0.9 : 1,
        position: 'relative',
        backdropFilter: 'blur(10px)',
        boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.4)' : '0 10px 20px rgba(0,0,0,0.1)'
    };

    return (
        <div ref={setNodeRef} style={style}>
            {/* Slide Header */}
            <div 
                onClick={() => onToggle(slide.id)}
                style={{ 
                    padding: isMobile ? '12px 16px' : '20px 28px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                    transition: '0.3s'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px' }}>
                    {/* Drag Handle */}
                    <div 
                        {...attributes} 
                        {...listeners} 
                        style={{ cursor: 'grab', padding: '8px', color: 'var(--primary)', touchAction: 'none', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '10px' }}
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <GripVertical size={isMobile ? 18 : 20} />
                    </div>
                    {!isMobile && (
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(212, 175, 55, 0.3)' }}>
                            {index + 1}
                        </div>
                    )}
                    <div>
                        <h4 style={{ color: '#fff', fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: '800', marginBottom: '2px' }}>{slide.title || 'بدون عنوان'}</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{slide.subtitle || '---'}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(slide.id); }} 
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '10px', transition: '0.3s' }}
                    >
                        <Trash2 size={16} />
                    </button>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} style={{ color: 'var(--primary)' }}>
                        <ChevronDown size={isMobile ? 18 : 22} />
                    </motion.div>
                </div>
            </div>

            {/* Slide Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: isMobile ? '16px' : '28px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? '16px' : '28px' }}>
                                {/* Image Preview & Upload */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '700' }}>صورة الواجهة الرئيسية</label>
                                    <div style={{ 
                                        width: '100%', height: '220px', borderRadius: '20px', 
                                        border: '2px dashed var(--border-color)', display: 'flex', 
                                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                                        overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.01)',
                                        transition: '0.3s'
                                    }}>
                                        {(slide.image_url || slide.image) ? (
                                            <>
                                                <img src={slide.image_url || slide.image} alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.3s', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.opacity = 1} onMouseLeave={(e) => e.target.style.opacity = 0}>
                                                    <span style={{ fontWeight: '800', background: 'var(--primary)', color: '#000', padding: '8px 16px', borderRadius: '10px' }}>تغيير الصورة</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <ImageIcon size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                                <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>اسحب الصورة هنا أو اضغط للرفع</p>
                                            </div>
                                        )}
                                        <input 
                                            type="file" accept="image/*" 
                                            onChange={(e) => onImageUpload(slide.id, e.target.files[0])}
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: '700' }}>العنوان الرئيسي (Highlight)</label>
                                        <input 
                                            type="text" value={slide.title} 
                                            onChange={(e) => onFieldChange(slide.id, 'title', e.target.value)}
                                            placeholder="مثلاً: التشكيلة الملكية المحدودة"
                                            style={{ width: '100%', padding: '14px 18px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '14px', color: '#fff', outline: 'none', transition: '0.3s' }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: '700' }}>العنوان الفرعي (Tagline)</label>
                                        <input 
                                            type="text" value={slide.subtitle} 
                                            onChange={(e) => onFieldChange(slide.id, 'subtitle', e.target.value)}
                                            placeholder="مثلاً: لإطلالة تليق بمقامك"
                                            style={{ width: '100%', padding: '14px 18px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '14px', color: '#fff', outline: 'none', transition: '0.3s' }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: '700' }}>وصف قصير</label>
                                        <textarea 
                                            value={slide.description || ''} 
                                            onChange={(e) => onFieldChange(slide.id, 'description', e.target.value)}
                                            placeholder="اكتب وصفاً موجزاً يظهر تحت العناوين..."
                                            style={{ width: '100%', padding: '14px 18px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '14px', color: '#fff', minHeight: '100px', fontFamily: 'inherit', outline: 'none', transition: '0.3s', resize: 'vertical' }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Settings = () => {
    const { startLoading, stopLoading } = useLoading();
    const [heroSlides, setHeroSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSlides, setExpandedSlides] = useState({});
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        startLoading();
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('hero')
                .select('*')
                .order('sort_order', { ascending: true });

            if (data) {
                setHeroSlides(data);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
            stopLoading();
        }
    };

    const handleSlideChange = (id, field, value) => {
        setHeroSlides(prev => prev.map(slide => 
            slide.id === id ? { ...slide, [field]: value } : slide
        ));
    };

    const handleImageUpload = async (id, file) => {
        if (!file) return;
        
        startLoading();
        try {
            const imageUrl = await uploadToCloudinary(file, 'image');
            handleSlideChange(id, 'image_url', imageUrl);

            Swal.fire({
                icon: 'success',
                title: 'تم الرفع بنجاح',
                text: 'تم تحديث الصورة، لا تنسَ حفظ التغييرات النهائية.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000,
                background: '#141414',
                color: '#fff'
            });
        } catch (error) {
            console.error("Upload error:", error);
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل رفع الصورة: ' + (error.message || ''), background: '#141414', color: '#fff' });
        } finally {
            stopLoading();
        }
    };

    const addNewSlide = async () => {
        if (heroSlides.length >= 7) {
            Swal.fire({ 
                icon: 'warning', title: 'عفواً', text: 'الحد الأقصى هو 7 شرائح لضمان سرعة تحميل العميل للواجهة.', 
                background: '#141414', color: '#fff' 
            });
            return;
        }

        startLoading();
        try {
            const { data, error } = await supabase
                .from('hero')
                .insert([{ 
                    title: 'شريحة ملكية جديدة', 
                    subtitle: 'اكتشف الفخامة', 
                    description: 'وصف قصير لهذه الشريحة الرائعة في واجهة متجر تايم تك.', 
                    image_url: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=2070'
                }])
                .select()
                .single();

            if (error) throw error;
            setHeroSlides([...heroSlides, data]);
            setExpandedSlides(prev => ({ ...prev, [data.id]: true })); // Expand the new slide immediately

            Swal.fire({
                icon: 'success',
                title: 'تمت الإضافة',
                text: 'شريحة جديدة جاهزة للتخصيص.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                background: '#141414',
                color: '#fff'
            });
        } catch (error) {
            console.error("Add error:", error);
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل إضافة سلايد جديد', background: '#141414', color: '#fff' });
        } finally {
            stopLoading();
        }
    };

    const removeSlide = async (id) => {
        const result = await Swal.fire({
            title: 'حذف الشريحة؟',
            text: "لن تتمكن من استعادة هذه الشريحة بعد تأكيد الحذف.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'rgba(255,255,255,0.1)',
            confirmButtonText: 'نعم، احذف نهائياً',
            cancelButtonText: 'تراجع',
            background: '#141414',
            color: '#fff'
        });

        if (result.isConfirmed) {
            startLoading();
            try {
                const { error } = await supabase.from('hero').delete().eq('id', id);
                if (error) throw error;
                setHeroSlides(prev => prev.filter(s => s.id !== id));
            } catch (error) {
                console.error("Delete error:", error);
                Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل الحذف من قاعدة البيانات', background: '#141414', color: '#fff' });
            } finally {
                stopLoading();
            }
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setHeroSlides((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                
                const relocatedSlides = arrayMove(items, oldIndex, newIndex);
                return relocatedSlides.map((s, i) => ({ ...s, sort_order: i + 1 }));
            });
        }
    };

    const saveSettings = async () => {
        startLoading();
        try {
            const promises = heroSlides.map((slide, idx) => 
                supabase.from('hero').update({
                    title: slide.title,
                    subtitle: slide.subtitle,
                    description: slide.description,
                    image_url: slide.image_url || slide.image,
                    sort_order: idx + 1
                }).eq('id', slide.id)
            );

            const results = await Promise.all(promises);
            const errors = results.filter(r => r.error);

            if (errors.length > 0) throw errors[0].error;

            Swal.fire({
                icon: 'success',
                title: 'تم الحفظ بنجاح',
                text: 'تم تحديث شرائح الواجهة الرئيسية فوراً!',
                background: '#141414',
                color: '#fff',
                confirmButtonColor: 'var(--primary)',
                confirmButtonText: 'حسناً'
            });
        } catch (error) {
            console.error("Save error:", error);
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل حفظ الإعدادات في قاعدة البيانات', background: '#141414', color: '#fff' });
        } finally {
            stopLoading();
        }
    };

    const toggleExpand = (id) => {
        setExpandedSlides(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Management Hub State
    const [hubSearch, setHubSearch] = useState('');
    const [hubSearchResults, setHubSearchResults] = useState([]);
    const [isSearchingHub, setIsSearchingHub] = useState(false);
    const [hubActiveTab, setHubActiveTab] = useState('latest'); // 'latest' or 'best'

    const [latestProducts, setLatestProducts] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);

    useEffect(() => {
        loadHubData();
    }, []);

    const loadHubData = async () => {
        try {
            const { data: latestData } = await supabase
                .from('products')
                .select('*')
                .eq('is_latest', true)
                .order('created_at', { ascending: false });
            
            const { data: bestData } = await supabase
                .from('products')
                .select('*')
                .eq('is_best_seller', true)
                .order('created_at', { ascending: false });

            if (latestData) setLatestProducts(latestData);
            if (bestData) setBestSellers(bestData);
        } catch (err) { console.error(err); }
    };

    const handleHubSearch = async (query) => {
        setHubSearch(query);
        if (query.trim().length < 2) {
            setHubSearchResults([]);
            return;
        }

        setIsSearchingHub(true);
        try {
            let queryBuilder = supabase.from('products').select('*');
            if (!isNaN(query)) {
                queryBuilder = queryBuilder.or(`name.ilike.%${query}%,displayId.eq.${query}`);
            } else {
                queryBuilder = queryBuilder.ilike('name', `%${query}%`);
            }
            const { data } = await queryBuilder.limit(10);
            if (data) setHubSearchResults(data);
        } catch (err) { console.error(err); }
        finally { setIsSearchingHub(false); }
    };

    const toggleCurationStatus = async (product, type, status) => {
        startLoading();
        try {
            const column = type === 'latest' ? 'is_latest' : 'is_best_seller';
            const { error } = await supabase
                .from('products')
                .update({ [column]: status })
                .eq('id', product.id);
            
            if (error) throw error;
            
            if (type === 'latest') {
                if (status) setLatestProducts(prev => [product, ...prev]);
                else setLatestProducts(prev => prev.filter(p => p.id !== product.id));
            } else {
                if (status) setBestSellers(prev => [product, ...prev]);
                else setBestSellers(prev => prev.filter(p => p.id !== product.id));
            }

            Swal.fire({
                icon: 'success',
                title: status ? 'تمت الإضافة' : 'تمت الإزالة',
                text: `تم تحديث المنتج بنجاح`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                background: '#141414',
                color: '#fff'
            });
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل التحديث', background: '#141414', color: '#fff' });
        } finally {
            stopLoading();
        }
    };

    if (loading) return null;

    return (
        <div style={{ direction: 'rtl', padding: isMobile ? '5px' : '10px' }}>
            {/* Header Section */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'flex-end', 
                marginBottom: isMobile ? '2rem' : '3.5rem', 
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '16px' : '24px' 
            }}>
                <div>
                    <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.8rem', fontWeight: '900', color: '#fff', marginBottom: '8px', letterSpacing: isMobile ? '-0.5px' : '-1.5px' }}>
                        إعدادات الواجهة <span style={{ color: 'var(--primary)', fontSize: isMobile ? '0.8rem' : '1.2rem', verticalAlign: 'middle', opacity: 0.8 }}>| إدارة الأقسام</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>تخصيص محتوى وترتيب الأقسام المميزة.</p>
                </div>
                <div style={{ width: isMobile ? '100%' : 'auto' }}>
                    <motion.button 
                        whileHover={{ scale: 1.05 }} 
                        whileTap={{ scale: 0.95 }}
                        className="btn-primary" 
                        onClick={saveSettings} 
                        style={{ width: isMobile ? '100%' : 'auto', padding: isMobile ? '12px 20px' : '14px 28px', borderRadius: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--primary)', color: '#000', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(212, 175, 55, 0.2)', fontSize: isMobile ? '0.9rem' : '1rem' }}
                    >
                        حفظ التغييرات <Save size={isMobile ? 18 : 20} />
                    </motion.button>
                </div>
            </div>

            {/* HERO SECTION MANAGEMENT */}
            <div style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: isMobile ? '24px' : '32px', 
                padding: isMobile ? '20px' : '40px', 
                border: '1px solid var(--border-color)',
                backdropFilter: 'blur(10px)',
                marginBottom: '40px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '20px' : '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
                        <div style={{ width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layout size={isMobile ? 20 : 24} />
                        </div>
                        <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.6rem', fontWeight: '800', color: '#fff' }}>شرائح الهيرو (Slides)</h2>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={heroSlides.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {heroSlides.map((slide, index) => (
                                <SortableSlide 
                                    key={slide.id}
                                    slide={slide}
                                    index={index}
                                    isExpanded={expandedSlides[slide.id]}
                                    onToggle={toggleExpand}
                                    onRemove={removeSlide}
                                    onImageUpload={handleImageUpload}
                                    onFieldChange={handleSlideChange}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

                <motion.button 
                    whileHover={{ background: 'rgba(212, 175, 55, 0.05)', scale: 1.01 }}
                    onClick={addNewSlide}
                    style={{ 
                        width: '100%', 
                        marginTop: '10px', 
                        padding: '24px', 
                        background: 'transparent', 
                        border: '2px dashed rgba(212, 175, 55, 0.3)', 
                        color: 'var(--primary)', 
                        borderRadius: '24px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        fontSize: '1.1rem',
                        fontWeight: '800',
                        transition: '0.3s'
                    }}
                >
                    <Plus size={24} /> إضافة شريحة ملكية جديدة
                </motion.button>
            </div>

            {/* MANAGEMENT HUB SECTION */}
            <div style={{ 
                background: 'rgba(255,255,255,0.01)', 
                borderRadius: isMobile ? '24px' : '32px', 
                border: '1px solid var(--border-color)',
                backdropFilter: 'blur(30px)',
                overflow: 'hidden',
                boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                marginTop: '40px'
            }}>
                <div style={{ padding: isMobile ? '20px' : '32px', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(to right, rgba(212,175,55,0.05), transparent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
                        <div style={{ width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: '12px', background: 'var(--primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Rocket size={isMobile ? 20 : 24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.6rem', fontWeight: '900', color: '#fff' }}>إدارة المجموعات</h2>
                            {!isMobile && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>تحكم كامل في المنتجات المعروضة في الصفحة الرئيسية</p>}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', minHeight: isMobile ? 'auto' : '650px' }}>
                    {/* Sidebar: Master Control */}
                    <div style={{ borderLeft: isMobile ? 'none' : '1px solid var(--border-color)', borderBottom: isMobile ? '1px solid var(--border-color)' : 'none', padding: isMobile ? '20px' : '32px', background: 'rgba(0,0,0,0.2)' }}>
                        <h3 style={{ color: '#fff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Search size={isMobile ? 16 : 18} color="var(--primary)" /> التحكم السريع
                        </h3>
                        
                        <div style={{ position: 'relative', marginBottom: isMobile ? '20px' : '28px' }}>
                            <input 
                                type="text"
                                placeholder="ابحث باسم الساعة..."
                                value={hubSearch}
                                onChange={(e) => handleHubSearch(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', paddingRight: '40px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '14px', color: '#fff', outline: 'none', fontSize: '0.9rem', transition: '0.3s' }}
                            />
                            <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                <Search size={18} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <AnimatePresence mode="popLayout">
                                {isSearchingHub ? (
                                    <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '20px', color: 'var(--primary)' }}>جاري البحث...</motion.div>
                                ) : hubSearchResults.length > 0 ? (
                                    hubSearchResults.map(product => (
                                        <motion.div 
                                            key={product.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="admin-hub-item"
                                            style={{ 
                                                padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '18px',
                                                border: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                                <img src={product.imageUrl || product.image} alt={product.name} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                <div>
                                                    <div style={{ color: '#fff', fontWeight: '700', fontSize: '0.9rem' }}>{product.name}</div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>#{product.displayId || '---'}</div>
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <button 
                                                    onClick={() => toggleCurationStatus(product, 'latest', !latestProducts.some(p => p.id === product.id))}
                                                    style={{ 
                                                        padding: '8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', transition: '0.3s',
                                                        background: latestProducts.some(p => p.id === product.id) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                                        color: latestProducts.some(p => p.id === product.id) ? '#60a5fa' : 'var(--text-muted)',
                                                        border: latestProducts.some(p => p.id === product.id) ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)'
                                                    }}
                                                >
                                                    {latestProducts.some(p => p.id === product.id) ? '✓ وصل حديثاً' : '+ وصل حديثاً'}
                                                </button>
                                                <button 
                                                    onClick={() => toggleCurationStatus(product, 'best', !bestSellers.some(p => p.id === product.id))}
                                                    style={{ 
                                                        padding: '8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', transition: '0.3s',
                                                        background: bestSellers.some(p => p.id === product.id) ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255,255,255,0.05)',
                                                        color: bestSellers.some(p => p.id === product.id) ? '#fb923c' : 'var(--text-muted)',
                                                        border: bestSellers.some(p => p.id === product.id) ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid rgba(255,255,255,0.05)'
                                                    }}
                                                >
                                                    {bestSellers.some(p => p.id === product.id) ? '✓ الأكثر طلباً' : '+ الأكثر طلباً'}
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : hubSearch.length >= 2 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد نتائج</div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        <Monitor size={32} style={{ opacity: 0.1, marginBottom: '12px' }} />
                                        <p>ابحث عن منتج للتحكم في ظهوره</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Main Area: Active Lists */}
                    <div style={{ padding: isMobile ? '20px' : '32px', display: 'flex', flexDirection: 'column' }}>
                        {/* Tab Switcher */}
                        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '16px', marginBottom: isMobile ? '20px' : '32px', width: isMobile ? '100%' : 'fit-content' }}>
                            <button 
                                onClick={() => setHubActiveTab('latest')}
                                style={{ 
                                    flex: isMobile ? 1 : 'none',
                                    padding: isMobile ? '10px 12px' : '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: isMobile ? '0.8rem' : '0.9rem', transition: '0.3s',
                                    background: hubActiveTab === 'latest' ? 'var(--primary)' : 'transparent',
                                    color: hubActiveTab === 'latest' ? '#000' : 'var(--text-muted)'
                                }}
                            >
                                حديث ({latestProducts.length})
                            </button>
                            <button 
                                onClick={() => setHubActiveTab('best')}
                                style={{ 
                                    flex: isMobile ? 1 : 'none',
                                    padding: isMobile ? '10px 12px' : '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: isMobile ? '0.8rem' : '0.9rem', transition: '0.3s',
                                    background: hubActiveTab === 'best' ? 'var(--primary)' : 'transparent',
                                    color: hubActiveTab === 'best' ? '#000' : 'var(--text-muted)'
                                }}
                            >
                                طلب ({bestSellers.length})
                            </button>
                        </div>

                        {/* Current List Content */}
                        <div style={{ flex: 1, maxHeight: isMobile ? 'none' : '600px', overflowY: 'auto' }} className="hide-scrollbar">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={hubActiveTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}
                                >
                                    {(hubActiveTab === 'latest' ? latestProducts : bestSellers).length > 0 ? (
                                        (hubActiveTab === 'latest' ? latestProducts : bestSellers).map((product) => (
                                            <div key={product.id} className="hub-active-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <img src={product.imageUrl || product.image} alt={product.name} style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ color: '#fff', fontWeight: '800', fontSize: '0.95rem', marginBottom: '4px' }}>{product.name}</div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '0.85rem' }}>{Number(product.price).toLocaleString()} ر.س</span>
                                                            <button 
                                                                onClick={() => toggleCurationStatus(product, hubActiveTab, false)}
                                                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: '0.3s' }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
                                            <ImageIcon size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                            <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>هذه القائمة فارغة حالياً</p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Tip */}
            <div style={{ marginTop: '30px', display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '18px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                <Sparkles size={20} color="#22c55e" />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                    <strong>نصيحة:</strong> مركز الإدارة الموحد يتيح لك التحكم في الصفحة الرئيسية من مكان واحد. التغييرات تظهر لحظياً للعملاء.
                </p>
            </div>

            <style>{`
                .admin-hub-item {
                    transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .admin-hub-item:hover {
                    background: rgba(255,255,255,0.05) !important;
                    transform: translateX(-4px);
                }

                .hub-active-card {
                    transition: 0.3s;
                    animation: cardSlideIn 0.4s ease-out both;
                }
                .hub-active-card:hover {
                    background: rgba(255,255,255,0.06) !important;
                    border-color: var(--primary) !important;
                    transform: translateY(-4px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }

                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes cardSlideIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .custom-scroll::-webkit-scrollbar { width: 6px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
            `}</style>
        </div>
    );
};

export default Settings;
