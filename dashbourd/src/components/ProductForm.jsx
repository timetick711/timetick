import React, { useState, useEffect, useRef } from 'react';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { compressImage } from '../utils/imageCompressor';
import Swal from 'sweetalert2';
import { Plus, X, Save, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProductForm = ({ initialData, onSubmit, title, subTitle }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        displayId: '',
        name: '',
        price: '',
        old_price: '',
        category: '',
        style: 'classic',
        description: '',
        video: '',
        imageUrl: '',
        images: [],
        colors: [],
        materials: [],
        variants: []
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                displayId: initialData.displayId || '',
                name: initialData.name || '',
                price: initialData.price || '',
                old_price: initialData.old_price || '',
                category: initialData.category || '',
                style: initialData.style || 'classic',
                description: initialData.description || '',
                video: initialData.video || '',
                imageUrl: initialData.imageUrl || '',
                images: initialData.images || (initialData.imageUrl ? [initialData.imageUrl] : []),
                colors: initialData.colors || [],
                materials: initialData.materials || [],
                variants: initialData.variants || []
            });
        }
    }, [initialData]);



    const [activeUploads, setActiveUploads] = useState({}); // { taskId: { type, text, percent, total, completed } }
    const uploading = Object.keys(activeUploads).length > 0;

    const abortRefs = useRef({}); // { taskId: abortFunc }
    const cancelledRefs = useRef({}); // { taskId: bool }

    // Prevent navigation during upload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (uploading) {
                const message = "جاري رفع الملفات الآن. هل أنت متأكد من مغادرة الصفحة؟ قد يؤدي ذلك إلى توقف عملية الرفع وضياع البيانات.";
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        };

        const handlePopState = (e) => {
            if (uploading) {
                // Push current state back to prevent navigation
                window.history.pushState(null, '', window.location.href);
                Swal.fire({
                    icon: 'warning',
                    title: 'تنبيه',
                    text: 'يرجى الانتظار حتى انتهاء الرفع أو إلغاؤه قبل الخروج.',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#141414',
                    color: '#fff'
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        if (uploading) {
            // Add a temporary history entry
            window.history.pushState(null, '', window.location.href);
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [uploading]);



    const handleImagesSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const taskId = `images-${Date.now()}`;
        cancelledRefs.current[taskId] = false;

        const total = files.length;
        setActiveUploads(prev => ({
            ...prev,
            [taskId]: { type: 'images', text: `جاري التحضير لرفع ${total} صور...`, percent: 0, completed: 0, total }
        }));

        const newImages = [];
        let completed = 0;

        try {
            for (let i = 0; i < total; i++) {
                if (cancelledRefs.current[taskId]) throw new Error('UserCancelled');

                const file = files[i];
                setActiveUploads(prev => ({
                    ...prev,
                    [taskId]: { ...prev[taskId], text: `جاري رفع الصورة ${i + 1} من ${total}...`, completed: i }
                }));

                // Compress
                const compressedFile = await compressImage(file);

                if (cancelledRefs.current[taskId]) throw new Error('UserCancelled');

                // Upload
                const url = await uploadToCloudinary(
                    compressedFile,
                    'image',
                    (progress) => {
                        const totalProgress = Math.round(((i * 100) + progress) / total);
                        setActiveUploads(prev => prev[taskId] ? {
                            ...prev,
                            [taskId]: { ...prev[taskId], percent: totalProgress }
                        } : prev);
                    },
                    (abortFunc) => {
                        abortRefs.current[taskId] = abortFunc;
                    }
                );

                newImages.push(url);
                completed++;
                setActiveUploads(prev => prev[taskId] ? {
                    ...prev,
                    [taskId]: { ...prev[taskId], completed, percent: Math.round((completed / total) * 100) }
                } : prev);
            }

            // Update State
            setFormData(prev => {
                const updatedImages = [...(prev.images || []), ...newImages];
                return {
                    ...prev,
                    images: updatedImages,
                    imageUrl: updatedImages.length > 0 ? updatedImages[0] : ''
                };
            });

            const Toast = Swal.mixin({
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                background: '#141414',
                color: '#fff'
            });
            Toast.fire({ icon: 'success', title: 'تم رفع الصور بنجاح' });

        } catch (error) {
            if (error.message === 'UserCancelled') {
                // Handled in UI
            } else {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'فشل الرفع', text: error.message, background: '#141414', color: '#fff' });
            }
        } finally {
            setActiveUploads(prev => {
                const updated = { ...prev };
                delete updated[taskId];
                return updated;
            });
            delete abortRefs.current[taskId];
            delete cancelledRefs.current[taskId];
            e.target.value = null;
        }
    };

    const removeImage = async (indexToRemove, e) => {
        if (e) e.stopPropagation();

        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: "سيتم حذف الصورة نهائياً من الخادم.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'نعم، احذفها',
            cancelButtonText: 'إلغاء',
            background: '#141414',
            color: '#fff'
        });

        if (!result.isConfirmed) return;

        const imageToDelete = formData.images[indexToRemove];

        // Optimistic UI Update first (Optional) or wait for delete?
        // Let's safe delete first.
        try {
            if (imageToDelete.includes('cloudinary')) {
                const deleted = await deleteFromCloudinary(imageToDelete, 'image');
                if (!deleted) {
                    Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'تم حذف الصورة من القائمة لكن فشل حذفها من السيرفر (قد تحتاج لمفتاح سري)', background: '#141414', color: '#fff' });
                }
            }
        } catch (err) {
            console.error(err);
        }

        setFormData(prev => {
            const updatedImages = prev.images.filter((_, index) => index !== indexToRemove);
            return {
                ...prev,
                images: updatedImages,
                imageUrl: updatedImages.length > 0 ? updatedImages[0] : ''
            };
        });

        Swal.fire({
            title: 'تم الحذف',
            text: 'تم حذف الصورة بنجاح.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: '#141414',
            color: '#fff'
        });
    };

    const setMainImage = (indexToSet) => {
        if (indexToSet === 0) return; // Already main
        setFormData(prev => {
            const images = [...prev.images];
            const selectedImage = images[indexToSet];

            // Remove from current position
            images.splice(indexToSet, 1);
            // Add to front
            images.unshift(selectedImage);

            return {
                ...prev,
                images: images,
                imageUrl: images[0]
            };
        });

        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            background: '#141414',
            color: '#fff'
        });
        Toast.fire({
            icon: 'success',
            title: 'تم تحديث الصورة الرئيسية'
        });
    };

    const handleVideoFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const taskId = `video-${Date.now()}`;
        cancelledRefs.current[taskId] = false;

        setActiveUploads(prev => ({
            ...prev,
            [taskId]: { type: 'video', text: 'جاري رفع الفيديو...', percent: 0, completed: 0, total: 1 }
        }));

        try {
            if (cancelledRefs.current[taskId]) throw new Error('UserCancelled');

            const url = await uploadToCloudinary(
                file,
                'video',
                (progress) => {
                    setActiveUploads(prev => prev[taskId] ? {
                        ...prev,
                        [taskId]: { ...prev[taskId], percent: progress }
                    } : prev);
                },
                (abortFunc) => {
                    abortRefs.current[taskId] = abortFunc;
                }
            );

            setFormData(prev => ({ ...prev, video: url }));
            const toast = Swal.mixin({
                toast: true,
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                background: '#141414',
                color: '#fff'
            });
            toast.fire({ icon: 'success', title: 'تم رفع الفيديو بنجاح!' });
        } catch (error) {
            if (error.message === 'UserCancelled') {
                // Handled in UI
            } else {
                console.error(error);
                Swal.fire({ icon: 'error', title: 'فشل الرفع', text: error.message, background: '#141414', color: '#fff' });
            }
        } finally {
            setActiveUploads(prev => {
                const updated = { ...prev };
                delete updated[taskId];
                return updated;
            });
            delete abortRefs.current[taskId];
            delete cancelledRefs.current[taskId];
            e.target.value = null;
        }
    };


    const getYouTubeId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v(?:id)?\/|.*v=)|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    };

    const getTikTokId = (url) => {
        if (!url) return null;
        const match = url.match(/\/video\/(\d+)/);
        return match ? match[1] : null;
    };

    const getInstagramId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:instagram\.com\/(?:reels?|p|video|reel)\/)([A-Za-z0-9_-]+)/);
        return match ? match[1] : null;
    };

    const renderVideoPreview = () => {
        if (!formData.video) return null;

        if (formData.video.startsWith('data:video')) {
            return <video src={formData.video} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls />;
        }

        const ytId = getYouTubeId(formData.video);
        if (ytId) {
            return (
                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title="YouTube preview"
                    frameBorder="0"
                    allowFullScreen
                    style={{ border: 'none' }}
                />
            );
        }

        const igId = getInstagramId(formData.video);
        if (igId) {
            return (
                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.instagram.com/reel/${igId}/embed/`}
                    title="Instagram preview"
                    frameBorder="0"
                    allowTransparency="true"
                    style={{ border: 'none', background: '#000' }}
                />
            );
        }

        const ttId = getTikTokId(formData.video);
        if (ttId) {
            return (
                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.tiktok.com/embed/v2/${ttId}`}
                    title="TikTok preview"
                    frameBorder="0"
                    allowFullScreen
                    style={{ border: 'none' }}
                />
            );
        }

        if (formData.video.includes('collection.cloudinary.com')) {
            return (
                <div style={{ padding: '20px', fontSize: '0.85rem', color: '#ff6b6b', textAlign: 'center' }}>
                    ⚠️ هذا "رابط مجموعة" وليس رابط فيديو مباشر.<br />
                    يرجى نسخ "الرابط المباشر" الذي ينتهي بـ <b>.mp4</b>
                </div>
            );
        }

        if (formData.video.startsWith('http')) {
            return (
                <video
                    src={formData.video}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    controls
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            );
        }

        return (
            <div style={{ padding: '20px', fontSize: '0.85rem', color: 'var(--primary)' }}>
                ✅ سيتم محاولة تشغيل المقطع من الرابط المرفق
            </div>
        );
    };

    const [colorInput, setColorInput] = useState('');

    const addColor = (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            e.preventDefault();
            const val = colorInput.trim();
            if (val && !formData.colors.includes(val)) {
                setFormData(prev => ({ ...prev, colors: [...prev.colors, val] }));
                setColorInput('');
            }
        }
    };

    const removeColor = (colorToRemove) => {
        setFormData(prev => ({
            ...prev,
            colors: prev.colors.filter(c => c !== colorToRemove)
        }));
    };

    const [materialInput, setMaterialInput] = useState('');

    const addMaterial = (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            e.preventDefault();
            const val = materialInput.trim();
            if (val && !formData.materials.includes(val)) {
                setFormData(prev => ({ ...prev, materials: [...prev.materials, val] }));
                setMaterialInput('');
            }
        }
    };

    const removeMaterial = (materialToRemove) => {
        setFormData(prev => ({
            ...prev,
            materials: prev.materials.filter(m => m !== materialToRemove)
        }));
    };
    const [variantInput, setVariantInput] = useState({ color: '', material: '', price: '' });

    const addVariant = () => {
        const { color, material, price } = variantInput;
        if (!price) return;

        // Check combination
        const exists = formData.variants.find(v => v.color === color && v.material === material);
        if (exists) return;

        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, { color, material, price: Number(price) }]
        }));
        setVariantInput({ color: '', material: '', price: '' });
    };

    const removeVariant = (indexToRemove) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter((_, i) => i !== indexToRemove)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', direction: 'rtl' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2rem' }}>
                <button
                    onClick={() => {
                        if (uploading) {
                            Swal.fire({
                                icon: 'warning',
                                title: 'تنبيه',
                                text: 'يرجى الانتظار حتى انتهاء الرفع أو إلغاؤه قبل الخروج.',
                                timer: 3000,
                                showConfirmButton: false,
                                background: '#141414',
                                color: '#fff'
                            });
                            return;
                        }
                        navigate('/products');
                    }}
                    className="btn-icon"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                >
                    <ArrowRight size={20} />
                </button>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: '#fff' }}>{title}</h1>
                    {subTitle && <p style={{ color: 'var(--text-muted)' }}>{subTitle}</p>}
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '3rem', borderRadius: 'var(--radius-lg)' }}>
                <form onSubmit={handleSubmit}>
                    <div style={formGroup}>
                        <label style={labelStyle}>رقم المنتج (ID)</label>
                        <input
                            type="number"
                            placeholder={initialData ? "رقم المنتج" : "سيتم توليد الرقم تلقائياً"}
                            value={formData.displayId}
                            onChange={e => setFormData({ ...formData, displayId: e.target.value })}
                            style={{ ...inputStyle, background: initialData ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)', cursor: initialData ? 'text' : 'not-allowed' }}
                            readOnly={!initialData}
                        />
                        {!initialData && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px' }}>سيقوم النظام باختيار الرقم التالي تلقائياً</p>}
                    </div>

                    <div className="form-grid">
                        <div style={formGroup}>
                            <label style={labelStyle}>اسم الساعة</label>
                            <input type="text" placeholder="مثلاً: رويال جولد" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required style={inputStyle} />
                        </div>
                        <div style={formGroup}>
                            <label style={labelStyle}>السعر الأساسي (ر.س)</label>
                            <input type="number" placeholder="0.00" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required style={inputStyle} />
                        </div>
                        <div style={formGroup}>
                            <label style={labelStyle}>السعر السابق (اختياري - للخصم)</label>
                            <input type="number" placeholder="مثلاً: 500" value={formData.old_price} onChange={e => setFormData({ ...formData, old_price: e.target.value })} style={inputStyle} />
                        </div>
                    </div>

                    {/* Price Variants Section */}
                    {(formData.colors.length > 0 || formData.materials.length > 0) && (
                        <div style={{ ...formGroup, background: 'rgba(212, 175, 55, 0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.2)', marginBottom: '30px' }}>
                            <label style={{ ...labelStyle, color: 'var(--primary)' }}>أسعار مخصصة لمواصفات معينة</label>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>سيتم استخدام السعر الأساسي إذا لم يتطابق اختيار العميل مع أي سعر مخصص أدناه.</p>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div style={{ flex: '0 0 120px' }}>
                                    <label style={{ color: '#fff', fontSize: '0.75rem', marginBottom: '5px', display: 'block' }}>السعر:</label>
                                    <input
                                        type="number"
                                        placeholder="السعر"
                                        value={variantInput.price}
                                        onChange={e => setVariantInput({ ...variantInput, price: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>

                                {formData.colors.length > 0 && (
                                    <div style={{ flex: 1, minWidth: '140px' }}>
                                        <label style={{ color: '#fff', fontSize: '0.75rem', marginBottom: '5px', display: 'block' }}>اللون:</label>
                                        <select
                                            value={variantInput.color}
                                            onChange={e => setVariantInput({ ...variantInput, color: e.target.value })}
                                            style={{ ...inputStyle, backgroundColor: '#1a1a1a' }}
                                        >
                                            <option value="">اختر اللون</option>
                                            {formData.colors.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                )}

                                {formData.materials.length > 0 && (
                                    <div style={{ flex: 1, minWidth: '140px' }}>
                                        <label style={{ color: '#fff', fontSize: '0.75rem', marginBottom: '5px', display: 'block' }}>الخامة:</label>
                                        <select
                                            value={variantInput.material}
                                            onChange={e => setVariantInput({ ...variantInput, material: e.target.value })}
                                            style={{ ...inputStyle, backgroundColor: '#1a1a1a' }}
                                        >
                                            <option value="">اختر الخامة</option>
                                            {formData.materials.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={addVariant}
                                    className="btn-icon"
                                    style={{ background: 'var(--primary)', color: '#000', height: '48px', padding: '0 15px', borderRadius: '14px', marginBottom: '2px' }}
                                >
                                    <Plus size={18} /> إضافة
                                </button>
                            </div>

                            {formData.variants.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    {formData.variants.map((v, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            background: 'rgba(255,255,255,0.05)', padding: '8px 15px',
                                            borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                    {v.color && v.material ? `${v.color} + ${v.material}` : (v.color || v.material || 'افتراضي')}
                                                </span>
                                                <span style={{ color: '#fff', fontSize: '0.85rem' }}>{v.price} ر.س</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeVariant(i)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="form-grid">
                        <div style={formGroup}>
                            <label style={labelStyle}>الفئة</label>
                            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required style={inputStyle}>
                                <option value="" disabled>اختر الفئة</option>
                                <option value="men">رجالي</option>
                                <option value="women">نسائي</option>
                                <option value="kids">أطفال</option>
                            </select>
                        </div>
                        <div style={formGroup}>
                            <label style={labelStyle}>النمط</label>
                            <select value={formData.style} onChange={e => setFormData({ ...formData, style: e.target.value })} required style={inputStyle}>
                                <option value="classic">كلاسيكي</option>
                                <option value="formal">رسمي</option>
                                <option value="wedding">عرائسي</option>
                                <option value="smart">سمارت</option>
                                <option value="sport">سبورت</option>
                            </select>
                        </div>
                    </div>

                    <div style={formGroup}>
                        <label style={labelStyle}>خامة الساعة (المادة المصنوعة منها - اكتب النوع ثم اضغط Enter)</label>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="text"
                                placeholder="مثلاً: ستيل، جلد طبيعي، مطاط، سيراميك"
                                value={materialInput}
                                onChange={e => setMaterialInput(e.target.value)}
                                onKeyDown={addMaterial}
                                style={{ ...inputStyle, flex: 1 }}
                            />
                            <button
                                type="button"
                                onClick={addMaterial}
                                className="btn-icon"
                                style={{ background: 'var(--primary)', color: '#000', padding: '0 20px', borderRadius: '14px' }}
                            >
                                <Plus size={18} /> إضافة
                            </button>
                        </div>
                        {formData.materials && formData.materials.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                {formData.materials.map((material, index) => (
                                    <div key={index} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        background: 'rgba(255,255,255,0.05)', padding: '6px 12px',
                                        borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff', fontSize: '0.9rem'
                                    }}>
                                        {material}
                                        <button
                                            type="button"
                                            onClick={() => removeMaterial(material)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 0 }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={formGroup}>
                        <label style={labelStyle}>فيديو المنتج (رابط أو ملف قصير)</label>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="text"
                                placeholder="رابط يوتيوب أو تيك توك"
                                value={formData.video.startsWith('data:video') ? 'تم تحميل الفيديو من الجهاز 📽️' : formData.video}
                                onChange={e => setFormData({ ...formData, video: e.target.value })}
                                style={{ ...inputStyle, flex: 1 }}
                            />
                            <label className="btn-icon" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#fff', width: 'auto', padding: '0 20px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                                <Plus size={18} /> رفع فيديو
                                <input type="file" hidden accept="video/*" onChange={handleVideoFileSelect} />
                            </label>
                        </div>
                        {formData.video && (
                            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', height: '150px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)' }}>
                                {renderVideoPreview()}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const result = await Swal.fire({
                                            title: 'حذف الفيديو؟',
                                            text: "سيتم حذف الفيديو الحالي نهائياً.",
                                            icon: 'warning',
                                            showCancelButton: true,
                                            confirmButtonColor: '#ef4444',
                                            confirmButtonText: 'حذف',
                                            cancelButtonText: 'إلغاء',
                                            background: '#141414', color: '#fff'
                                        });
                                        if (!result.isConfirmed) return;

                                        if (formData.video.includes('cloudinary')) {
                                            await deleteFromCloudinary(formData.video, 'video');
                                        }
                                        setFormData(prev => ({ ...prev, video: '' }));
                                    }}
                                    style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', zIndex: 10 }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={formGroup}>
                        <label style={labelStyle}>وصف المنتج (يتوسع تلقائياً)</label>
                        <textarea 
                            placeholder="اكتب تفاصيل الساعة والمميزات هنا..." 
                            value={formData.description} 
                            onChange={e => {
                                setFormData({ ...formData, description: e.target.value });
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }} 
                            onFocus={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            style={{ 
                                ...inputStyle, 
                                minHeight: '120px', 
                                overflow: 'hidden', 
                                resize: 'none' 
                            }} 
                        />
                    </div>

                    <div style={formGroup}>
                        <label style={labelStyle}>ألوان الساعة المتاحة (اكتب اللون ثم اضغط Enter)</label>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="text"
                                placeholder="مثلاً: ذهبي، فضي، أسود رويال"
                                value={colorInput}
                                onChange={e => setColorInput(e.target.value)}
                                onKeyDown={addColor}
                                style={{ ...inputStyle, flex: 1 }}
                            />
                            <button
                                type="button"
                                onClick={addColor}
                                className="btn-icon"
                                style={{ background: 'var(--primary)', color: '#000', padding: '0 20px', borderRadius: '14px' }}
                            >
                                <Plus size={18} /> إضافة
                            </button>
                        </div>
                        {formData.colors && formData.colors.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                {formData.colors.map((color, index) => (
                                    <div key={index} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        background: 'rgba(255,255,255,0.05)', padding: '6px 12px',
                                        borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff', fontSize: '0.9rem'
                                    }}>
                                        {color}
                                        <button
                                            type="button"
                                            onClick={() => removeColor(color)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 0 }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={formGroup}>
                        <label style={labelStyle}>صور المنتج (الرئيسية والمعرض)</label>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <label className="btn-icon" style={{ cursor: 'pointer', background: 'var(--primary)', color: '#000', width: '100%', padding: '15px', borderRadius: '14px', justifyContent: 'center' }}>
                                <Plus size={20} /> إضافة صور (اختر عدة صور)
                                <input type="file" hidden accept="image/*" multiple onChange={handleImagesSelect} />
                            </label>
                        </div>

                        {/* Images Grid */}
                        {formData.images && formData.images.length > 0 && (
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px',
                                background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '16px', border: '1px solid var(--glass-border)'
                            }}>
                                {formData.images.map((img, index) => (
                                    <div
                                        key={index}
                                        onClick={() => setMainImage(index)}
                                        style={{
                                            position: 'relative', height: '100px', borderRadius: '10px', overflow: 'hidden',
                                            border: index === 0 ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s'
                                        }}
                                        title={index === 0 ? "الصورة الرئيسية" : "اضغط لتعيينها كصورة رئيسية"}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <img src={img} alt={`Img ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                            type="button"
                                            onClick={(e) => removeImage(index, e)}
                                            style={{
                                                position: 'absolute', top: '5px', right: '5px',
                                                background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: '#fff',
                                                borderRadius: '50%', width: '24px', height: '24px',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                zIndex: 10
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                        {index === 0 && <span style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--primary)', color: '#000', fontSize: '0.6rem', padding: '2px 6px', borderTopLeftRadius: '6px', fontWeight: 'bold' }}>الرئيسية</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={uploading}
                        style={{
                            width: '100%',
                            justifyContent: 'center',
                            height: '56px',
                            fontSize: '1.1rem',
                            borderRadius: '16px',
                            opacity: uploading ? 0.7 : 1,
                            cursor: uploading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {uploading ? 'جاري الرفع... يرجى الانتظار' : <><Save size={22} /> حفظ الساعة</>}
                    </button>
                </form >
            </div >

            {/* Uploading Status Overlay */}
            {
                uploading && (
                    <div style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        width: '320px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        background: '#1a1a1a',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px',
                        padding: '10px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        animation: 'slideInRight 0.3s ease'
                    }}>
                        <div style={{ padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>عمليات الرفع النشطة ({Object.keys(activeUploads).length})</span>
                        </div>
                        {Object.entries(activeUploads).map(([taskId, progress]) => (
                            <div key={taskId} style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '12px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '500' }}>
                                        {progress.type === 'video' ? '📽️ فيديو' : '🖼️ صور'}
                                    </span>
                                    <button
                                        onClick={() => {
                                            cancelledRefs.current[taskId] = true;
                                            if (abortRefs.current[taskId]) abortRefs.current[taskId]();
                                            setActiveUploads(prev => {
                                                const updated = { ...prev };
                                                delete updated[taskId];
                                                return updated;
                                            });
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', padding: '0 5px' }}
                                    >
                                        إلغاء ✕
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {progress.text}
                                </div>
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${progress.percent}%`,
                                        height: '100%',
                                        background: 'var(--primary)',
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                                <div style={{ marginTop: '5px', fontSize: '0.7rem', color: 'var(--primary)', textAlign: 'right' }}>
                                    {progress.percent}%
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div >
    );
};

const formGroup = {
    marginBottom: '1.5rem'
};

const labelStyle = {
    display: 'block',
    marginBottom: '10px',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-muted)'
};

const inputStyle = {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '14px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.03)',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)'
};

export default ProductForm;
