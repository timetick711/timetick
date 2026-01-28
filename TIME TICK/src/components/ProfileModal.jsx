import { useState, useEffect } from 'react';
import { X, User, Save, Edit2, Camera, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ToastNotification from './ToastNotification';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';

export default function ProfileModal() {
    const { isProfileModalOpen, closeProfileModal, currentUser, updateUser } = useAuth();

    // Form & UI State
    const [isEditing, setIsEditing] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        whatsapp: '',
        governorate: '',
        district: '',
        neighborhood: '',
        image: ''
    });

    // Cropper State
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name || '',
                email: currentUser.email || '',
                whatsapp: currentUser.whatsapp || '',
                governorate: currentUser.governorate || '',
                district: currentUser.district || '',
                neighborhood: currentUser.neighborhood || '',
                image: currentUser.image || ''
            });
        }
    }, [currentUser, isProfileModalOpen]);

    if (!isProfileModalOpen || !currentUser) return null;

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result);
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const confirmCrop = async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            setFormData(prev => ({ ...prev, image: croppedImage }));
            setIsCropping(false);
            setImageSrc(null);
            setZoom(1);
        } catch (e) {
            console.error('Crop failed', e);
            alert('حدث خطأ أثناء قص الصورة');
        }
    };

    const cancelCrop = () => {
        setIsCropping(false);
        setImageSrc(null);
        setZoom(1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateUser(formData);
            setIsEditing(false);
            setToastMessage('تم حفظ التعديلات بنجاح! ✅');
        } catch (error) {
            alert('حدث خطأ أثناء الحفظ');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'whatsapp') {
            const numericValue = value.replace(/[^0-9]/g, '');
            setFormData({ ...formData, [name]: numericValue });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 15px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: 'var(--text-main)',
        fontSize: '1rem',
        fontFamily: "'Cairo', sans-serif",
        outline: 'none',
        transition: 'all 0.3s'
    };

    const textStyle = {
        width: '100%',
        border: 'none',
        background: 'transparent',
        padding: '0',
        color: 'var(--text-main)',
        fontSize: '1.1rem',
        fontFamily: "'Cairo', sans-serif",
        fontWeight: '600'
    };

    // Render Cropper Overlay
    if (isCropping) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: '#000',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div style={{ position: 'relative', width: '100%', height: '80%', background: '#333' }}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        showGrid={false}
                        cropShape="round"
                    />
                </div>

                <div style={{ padding: '20px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', background: '#141414' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '90%', maxWidth: '400px' }}>
                        <ZoomOut size={20} color="#fff" />
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(e.target.value)}
                            className="zoom-range"
                            style={{ flex: 1, cursor: 'pointer' }}
                        />
                        <ZoomIn size={20} color="#fff" />
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                        <button onClick={cancelCrop} style={{ padding: '10px 30px', borderRadius: '10px', border: '1px solid #666', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
                            إلغاء
                        </button>
                        <button onClick={confirmCrop} style={{ padding: '10px 30px', borderRadius: '10px', background: 'var(--primary)', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Check size={18} /> تأكيد وقص
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Render Normal Modal
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isProfileModalOpen ? 1 : 0,
            pointerEvents: isProfileModalOpen ? 'auto' : 'none',
            transition: 'opacity 0.3s ease'
        }}>
            {toastMessage && (
                <ToastNotification
                    message={toastMessage}
                    onClose={() => setToastMessage(null)}
                />
            )}

            <div className="glass-panel" style={{
                width: '90%',
                maxWidth: '500px',
                padding: '40px',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto',
                borderRadius: '16px',
                border: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
                <button
                    onClick={() => { closeProfileModal(), isEditing ? setIsEditing(!isEditing) : isEditing }}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px', // RTL
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        transition: 'color 0.3s'
                    }}
                >
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '30px', position: 'relative' }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        background: 'rgba(212, 175, 55, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 15px',
                        border: '2px solid var(--primary)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {formData.image ? (
                            <img src={formData.image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={50} color="var(--primary)" />
                        )}

                        {isEditing && (
                            <label style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                width: '100%',
                                height: '30px',
                                background: 'rgba(0,0,0,0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}>
                                <Camera size={16} color="white" />
                                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                            </label>
                        )}
                    </div>

                    <h2 style={{ color: 'var(--primary)', marginBottom: '5px', fontSize: '1.5rem' }}>{currentUser.name}</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>عضو مميز في تايم تك</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '25px' }}>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        style={{
                            background: isEditing ? 'rgba(255, 75, 75, 0.1)' : 'rgba(212, 175, 55, 0.1)',
                            border: `1px solid ${isEditing ? '#ff4b4b' : 'var(--primary)'}`,
                            color: isEditing ? '#ff4b4b' : 'var(--primary)',
                            padding: '8px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.9rem',
                            transition: 'all 0.3s'
                        }}
                    >
                        {isEditing ? <p style={{ fontFamily: 'cairo' }}> الغاء التعديل</p> : <p style={{ fontFamily: 'cairo' }}> تعديل البيانات</p>}
                        <Edit2 size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} dir="rtl">
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-dim)', marginBottom: '8px', fontSize: '0.9rem' }}>الاسم الكامل</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={!isEditing}
                                style={isEditing ? inputStyle : textStyle}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-dim)', marginBottom: '8px', fontSize: '0.9rem' }}>رقم الواتساب</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                name="whatsapp"
                                value={formData.whatsapp}
                                onChange={handleChange}
                                disabled={!isEditing}
                                style={isEditing ? inputStyle : textStyle}
                                placeholder="07700000000"
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'var(--text-dim)', marginBottom: '8px', fontSize: '0.9rem' }}>البريد الإلكتروني</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={!isEditing}
                                style={isEditing ? inputStyle : textStyle}
                            />
                        </div>

                        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '25px', marginTop: '10px' }}>
                            <h3 style={{ color: 'var(--primary)', fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                                عنوان التوصيل
                            </h3>
                            <div style={{ display: 'grid', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-dim)', marginBottom: '8px', fontSize: '0.9rem' }}>المحافظة</label>
                                    <input
                                        type="text"
                                        name="governorate"
                                        value={formData.governorate}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        style={isEditing ? inputStyle : textStyle}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', color: 'var(--text-dim)', marginBottom: '8px', fontSize: '0.9rem' }}>المديرية</label>
                                        <input
                                            type="text"
                                            name="district"
                                            value={formData.district}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            style={isEditing ? inputStyle : textStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: 'var(--text-dim)', marginBottom: '8px', fontSize: '0.9rem' }}>الحي</label>
                                        <input
                                            type="text"
                                            name="neighborhood"
                                            value={formData.neighborhood}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            style={isEditing ? inputStyle : textStyle}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isEditing && (
                            <button
                                type="submit"
                                className="btn-primary"
                                style={{
                                    width: '100%',
                                    marginTop: '30px',
                                    padding: '12px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontSize: '1.1rem'
                                }}
                            >
                                <span>حفظ التغييرات</span>
                                <Save size={20} />
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
