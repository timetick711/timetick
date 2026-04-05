import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';
import { useLoading } from '../context/LoadingContext';
import { uploadToCloudinary } from '../utils/cloudinary';
import { 
    Save, Image as ImageIcon, Plus, Trash2, Layout, 
    GripVertical, ChevronDown, Monitor, Rocket, 
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
                    padding: '20px 28px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                    transition: '0.3s'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Drag Handle */}
                    <div 
                        {...attributes} 
                        {...listeners} 
                        style={{ cursor: 'grab', padding: '8px', color: 'var(--primary)', touchAction: 'none', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '10px' }}
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <GripVertical size={20} />
                    </div>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(212, 175, 55, 0.3)' }}>
                        {index + 1}
                    </div>
                    <div>
                        <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', marginBottom: '2px' }}>{slide.title || 'شريحة بدون عنوان'}</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{slide.subtitle || 'لا يوجد عنوان فرعي'}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(slide.id); }} 
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '10px', borderRadius: '12px', transition: '0.3s' }}
                    >
                        <Trash2 size={18} />
                    </button>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} style={{ color: 'var(--primary)' }}>
                        <ChevronDown size={22} />
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
                        <div style={{ padding: '28px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
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
                                                    <span style={{ color: '#fff', fontWeight: '800', background: 'var(--primary)', color: '#000', padding: '8px 16px', borderRadius: '10px' }}>تغيير الصورة</span>
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

    if (loading) return null;

    return (
        <div style={{ direction: 'rtl', padding: '10px' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3.5rem', flexWrap: 'wrap', gap: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '2.8rem', fontWeight: '900', color: '#fff', marginBottom: '8px', letterSpacing: '-1.5px' }}>
                        إعدادات الواجهة <span style={{ color: 'var(--primary)', fontSize: '1.2rem', verticalAlign: 'middle', opacity: 0.8 }}>| إدارة الهيرو</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>تخصيص محتوى وترتيب شرائح الواجهة الرئيسية (Hero Section) لمتجر تايم تك.</p>
                </div>
                <div>
                    <motion.button 
                        whileHover={{ scale: 1.05 }} 
                        whileTap={{ scale: 0.95 }}
                        className="btn-primary" 
                        onClick={saveSettings} 
                        style={{ padding: '14px 28px', borderRadius: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--primary)', color: '#000', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(212, 175, 55, 0.2)' }}
                    >
                        حفظ التغييرات النهائية <Save size={20} />
                    </motion.button>
                </div>
            </div>

            <div style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '32px', 
                padding: '40px', 
                border: '1px solid var(--border-color)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layout size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>تخصيص الشرائح (Slides)</h2>
                    </div>
                </div>

                {/* Hero Slides Reorderable List */}
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

                {/* Add New Trigger */}
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

            {/* Info Tip */}
            <div style={{ marginTop: '30px', display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '18px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                <Sparkles size={20} color="#22c55e" />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                    <strong>نصيحة:</strong> يمكنك إعادة ترتيب الشرائح بسهولة عن طريق سحبها من المقبض الذهبي (<GripVertical size={14} />). الترتيب الجديد سيظهر فوراً في المتجر بعد الحفظ.
                </p>
            </div>
        </div>
    );
};

export default Settings;
