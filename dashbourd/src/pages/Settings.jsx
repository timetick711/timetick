import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useLoading } from '../context/LoadingContext';
import { uploadToCloudinary } from '../utils/cloudinary';
import { Save, Image as ImageIcon, Plus, Trash2, Layout } from 'lucide-react';
import Swal from 'sweetalert2';

const Settings = () => {
    const { startLoading, stopLoading } = useLoading();
    const [heroSlides, setHeroSlides] = useState([]);
    const [loading, setLoading] = useState(true);

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
                .order('created_at', { ascending: true });

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
            const imageUrl = await uploadToCloudinary(file, 'banners');
            handleSlideChange(id, 'image_url', imageUrl);
            Swal.fire({
                icon: 'success',
                title: 'تم الرفع',
                text: 'تم رفع الصورة بنجاح!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                background: '#141414',
                color: '#fff'
            });
        } catch (error) {
            console.error("Upload error:", error);
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل رفع الصورة', background: '#141414', color: '#fff' });
        } finally {
            stopLoading();
        }
    };

    const addNewSlide = async () => {
        if (heroSlides.length >= 7) {
            Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'الحد الأقصى هو 7 سلايدات للحفاظ على الأداء', background: '#141414', color: '#fff' });
            return;
        }

        startLoading();
        try {
            const { data, error } = await supabase
                .from('hero')
                .insert([{ 
                    title: 'عنوان جديد', 
                    subtitle: 'عنوان فرعي', 
                    description: '', 
                    image_url: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=2070' // Placeholder
                }])
                .select()
                .single();

            if (error) throw error;
            setHeroSlides([...heroSlides, data]);
        } catch (error) {
            console.error("Add error:", error);
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل إضافة سلايد جديد', background: '#141414', color: '#fff' });
        } finally {
            stopLoading();
        }
    };

    const removeSlide = async (id) => {
        const result = await Swal.fire({
            title: 'حذف السلايد؟',
            text: "سيتم حذف هذا السلايد نهائياً من المتجر",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء',
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
                Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل الحذف', background: '#141414', color: '#fff' });
            } finally {
                stopLoading();
            }
        }
    };

    const saveSettings = async () => {
        startLoading();
        try {
            // Bulk update title, subtitle, description for all currently loaded slides
            // Since they existing rows, we can map through and update
            const promises = heroSlides.map(slide => 
                supabase.from('hero').update({
                    title: slide.title,
                    subtitle: slide.subtitle,
                    description: slide.description,
                    image_url: slide.image_url || slide.image // handle both naming conventions if any
                }).eq('id', slide.id)
            );

            const results = await Promise.all(promises);
            const errors = results.filter(r => r.error);

            if (errors.length > 0) throw errors[0].error;

            Swal.fire({
                icon: 'success',
                title: 'تم الحفظ',
                text: 'تم تحديث الواجهة الرئيسية بنجاح!',
                background: '#141414',
                color: '#fff'
            });
        } catch (error) {
            console.error("Save error:", error);
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل حفظ الإعدادات', background: '#141414', color: '#fff' });
        } finally {
            stopLoading();
        }
    };

    if (loading) return null;

    return (
        <div style={{ direction: 'rtl', padding: '20px' }}>
            <div style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#fff' }}>الإعدادات</h1>
                <p style={{ color: 'var(--text-muted)' }}>التحكم في محتوى المتجر والواجهة الرئيسية</p>
            </div>

            <div className="glass-card" style={{ padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '15px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Layout color="var(--primary)" /> التحكم في الهيرو (الواجهة الرئيسية)
                    </h2>
                    <button className="btn-primary" onClick={saveSettings} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        حفظ التغييرات <Save size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {heroSlides.map((slide, index) => (
                        <div key={slide.id} style={{ 
                            padding: '20px', 
                            background: 'rgba(255,255,255,0.01)', 
                            borderRadius: '12px', 
                            border: '1px solid var(--border-color)',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>سلايد #{index + 1}</span>
                                {heroSlides.length > 1 && (
                                    <button onClick={() => removeSlide(slide.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                {/* Image Upload */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>صورة الخلفية</label>
                                    <div style={{ 
                                        width: '100%', 
                                        height: '150px', 
                                        borderRadius: '10px', 
                                        border: '2px dashed var(--border-color)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}>
                                        {(slide.image_url || slide.image) ? (
                                            <img src={slide.image_url || slide.image} alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <ImageIcon size={40} color="var(--border-color)" />
                                        )}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={(e) => handleImageUpload(slide.id, e.target.files[0])}
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                        />
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>انقر للرفع (يفضل صور عريضة عالية الجودة)</p>
                                </div>

                                {/* Text Fields */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>العنوان الرئيسي</label>
                                        <input 
                                            type="text" 
                                            value={slide.title} 
                                            onChange={(e) => handleSlideChange(slide.id, 'title', e.target.value)}
                                            style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                                            placeholder="مثلاً: كلاسيك"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>العنوان الفرعي</label>
                                        <input 
                                            type="text" 
                                            value={slide.subtitle} 
                                            onChange={(e) => handleSlideChange(slide.id, 'subtitle', e.target.value)}
                                            style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }}
                                            placeholder="مثلاً: الزمن بمنظور فني"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>الوصف</label>
                                        <textarea 
                                            value={slide.description || ''} 
                                            onChange={(e) => handleSlideChange(slide.id, 'description', e.target.value)}
                                            style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', minHeight: '60px', fontFamily: 'inherit' }}
                                            placeholder="مثلاً: مجموعة حصرية تجمع بين أصالة الماضي..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={addNewSlide}
                    style={{ 
                        width: '100%', 
                        marginTop: '25px', 
                        padding: '15px', 
                        background: 'transparent', 
                        border: '1px dashed var(--primary)', 
                        color: 'var(--primary)', 
                        borderRadius: '12px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                    }}
                >
                    <Plus size={20} /> إضافة سلايد جديد
                </button>
            </div>
        </div>
    );
};

export default Settings;
