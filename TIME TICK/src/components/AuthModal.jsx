import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, Mail, Phone, MapPin, Lock, Save } from 'lucide-react';


export default function AuthModal() {
    const { isAuthModalOpen, closeAuthModal, register, verifyEmailOtp, resendOtp, login, loginWithGoogle, updateUser, currentUser, isVerifyingOtp: isVerifyingOtpGlobal, pendingUserData } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [isCompletingProfile, setIsCompletingProfile] = useState(false);
    const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
    const [resendCountdown, setResendCountdown] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        whatsapp: '',
        governorate: '',
        district: '',
        neighborhood: '',
        password: ''
    });

    useEffect(() => {
        let timer;
        if (resendCountdown > 0) {
            timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [resendCountdown]);

    useEffect(() => {
        if (isAuthModalOpen) {
            // Check if we need to complete profile
            if (currentUser && (!currentUser.whatsapp || !currentUser.governorate)) {
                setIsCompletingProfile(true);
            } else {
                setIsCompletingProfile(false); // Default to login/register if not needing completion
                setError('');
            }
        } else {
            // Reset when closed
            setIsCompletingProfile(false);
            setOtpArray(['', '', '', '', '', '']);
            setResendCountdown(0);
            setError('');
        }
    }, [isAuthModalOpen, currentUser]);

    if (!isAuthModalOpen) return null;

    // Google Login Removed as per request to remove Firebase

    const handleCompleteProfile = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (!formData.whatsapp || !formData.governorate || !formData.district || !formData.neighborhood) {
                setError('يرجى ملء جميع الحقول المطلوبة');
                return;
            }
            await updateUser({
                whatsapp: formData.whatsapp,
                governorate: formData.governorate,
                district: formData.district,
                neighborhood: formData.neighborhood
            });
            closeAuthModal();
        } catch (err) {
            setError('حدث خطأ أثناء حفظ البيانات');
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otpArray];
        newOtp[index] = value.slice(-1);
        setOtpArray(newOtp);

        // Auto focus next
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`).focus();
        }
    };

    const handleResendOtp = async () => {
        if (resendCountdown > 0) return;
        setError('');
        try {
            await resendOtp();
            setResendCountdown(60);
        } catch (err) {
            setError(err.message || 'فشل في إعادة إرسال الرمز');
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        const fullToken = otpArray.join('');
        try {
            if (fullToken.length !== 6) {
                setError('يرجى إدخال الرمز المكون من 6 أرقام');
                return;
            }
            setIsSubmitting(true);
            await verifyEmailOtp(fullToken);
            closeAuthModal();
        } catch (err) {
            setError(err.message || 'رمز التحقق غير صحيح');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            setIsSubmitting(true);
            if (isLogin) {
                await login(formData.email, formData.password);
                closeAuthModal();
            } else {
                // Validation
                if (!formData.name || !formData.email || !formData.whatsapp || !formData.governorate || !formData.district || !formData.neighborhood || !formData.password) {
                    setError('يرجى ملء جميع الحقول المطلوبة');
                    return;
                }
                const whatsappRegex = /^[0-9]+$/;
                if (!whatsappRegex.test(formData.whatsapp)) {
                    setError('رقم الواتساب يجب أن يحتوي على أرقام فقط');
                    return;
                }

                const result = await register(formData);
                if (result.needsConfirmation) {
                    setError(''); // Clear error to show instruction instead
                } else {
                    closeAuthModal();
                }
            }
        } catch (err) {
            console.log(err);
            setError(err.message || 'حدث خطأ');
        } finally {
            setIsSubmitting(false);
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

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '500px',
                padding: '40px',
                position: 'relative',
                animation: 'modalSlideIn 0.4s ease-out',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                {!isCompletingProfile && (
                    <button
                        onClick={closeAuthModal}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            left: '20px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={24} />
                    </button>
                )}

                <h2 style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    fontSize: '2rem',
                    color: 'var(--primary)',
                    fontFamily: 'var(--font-main)'
                }}>
                    {isVerifyingOtpGlobal ? 'تأكيد الحساب' : isCompletingProfile ? 'إكمال البيانات' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد')}
                </h2>

                {isCompletingProfile && (
                    <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginBottom: '20px', fontSize: '0.9rem' }}>
                        يرجى تزويدنا برقم الواتساب وعنوانك لإتمام عملية التسجيل ومتابعة طلباتك.
                    </p>
                )}

                {error && (
                    <div style={{
                        background: 'rgba(255, 107, 107, 0.1)',
                        color: '#ff6b6b',
                        padding: '10px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        textAlign: 'center',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                {isVerifyingOtpGlobal ? (
                    <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginBottom: '10px', fontSize: '0.9rem' }}>
                            أدخل الرمز المكون من 6 أرقام الذي أرسلناه إلى: <br />
                            <strong>{pendingUserData?.email || formData.email}</strong>
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', direction: 'ltr' }}>
                            {otpArray.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    className="otp-input"
                                    required
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>

                        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={isSubmitting}>
                            {isSubmitting ? 'جاري التحقق...' : 'تأكيد الحساب'}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            {resendCountdown > 0 ? (
                                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                                    يمكنك إعادة إرسال الرمز خلال {resendCountdown} ثانية
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    إعادة إرسال الرمز
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => { localStorage.removeItem('time-tick-pending-reg'); window.location.reload(); }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                textDecoration: 'underline'
                            }}
                        >
                            إلغاء والبدء من جديد
                        </button>
                    </form>
                ) : isCompletingProfile ? (
                    <form onSubmit={handleCompleteProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div className="input-group">
                            <Phone size={18} />
                            <input
                                type="text"
                                inputMode="numeric"
                                name="whatsapp"
                                placeholder="رقم الواتساب"
                                value={formData.whatsapp}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <MapPin size={18} />
                            <input
                                type="text"
                                name="governorate"
                                placeholder="المحافظة"
                                value={formData.governorate}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <MapPin size={18} />
                            <input
                                type="text"
                                name="district"
                                placeholder="المديرية"
                                value={formData.district}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <MapPin size={18} />
                            <input
                                type="text"
                                name="neighborhood"
                                placeholder="الحي"
                                value={formData.neighborhood}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <Save size={20} /> حفظ البيانات ومتابعة
                        </button>
                    </form>
                ) : (
                    <>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {!isLogin && (
                                <>
                                    <div className="input-group">
                                        <User size={18} />
                                        <input
                                            type="text"
                                            name="name"
                                            placeholder="الاسم الكامل باللغة العربية"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            <div className="input-group">
                                <Mail size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="الجيميل (Email)"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {!isLogin && (
                                <>
                                    <div className="input-group">
                                        <Phone size={18} />
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            name="whatsapp"
                                            placeholder="رقم الواتساب"
                                            value={formData.whatsapp}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <MapPin size={18} />
                                        <input
                                            type="text"
                                            name="governorate"
                                            placeholder="المحافظة"
                                            value={formData.governorate}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <MapPin size={18} />
                                        <input
                                            type="text"
                                            name="district"
                                            placeholder="المديرية"
                                            value={formData.district}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <MapPin size={18} />
                                        <input
                                            type="text"
                                            name="neighborhood"
                                            placeholder="الحي"
                                            value={formData.neighborhood}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            <div className="input-group">
                                <Lock size={18} />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="كلمة المرور"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={isSubmitting}>
                                {isSubmitting ? 'جاري التحميل...' : (isLogin ? 'دخول' : 'تسجيل')}
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', flex: 1 }}></div>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>أو</span>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', flex: 1 }}></div>
                            </div>

                            <button
                                type="button"
                                onClick={loginWithGoogle}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    transition: '0.3s',
                                    fontWeight: 'bold'
                                }}
                                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                {isLogin ? 'دخول باستخدام Google' : 'تسجيل باستخدام Google'}
                            </button>
                        </form>



                        <p style={{
                            textAlign: 'center',
                            marginTop: '20px',
                            color: 'var(--text-dim)',
                            fontSize: '0.9rem'
                        }}>
                            {isLogin ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
                            <span
                                onClick={() => setIsLogin(!isLogin)}
                                style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {isLogin ? 'أنشئ حساباً' : 'سجل دخولك'}
                            </span>
                        </p>
                    </>
                )}
            </div>

            <style>{`
                @keyframes modalSlideIn {
                    from { transform: translateY(-30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .input-group {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(255,255,255,0.05);
                    padding: 12px 15px;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.1);
                    transition: all 0.3s ease;
                }
                .input-group:focus-within {
                    border-color: var(--primary);
                    background: rgba(255,170,0,0.05);
                }
                .input-group input {
                    background: transparent;
                    border: none;
                    color: var(--text-main);
                    width: 100%;
                    outline: none;
                    font-family: var(--font-main);
                }
                .input-group svg {
                    color: var(--primary);
                }
                .otp-input {
                    width: 45px;
                    height: 55px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    text-align: center;
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: var(--primary);
                    outline: none;
                    transition: all 0.3s;
                }
                .otp-input:focus {
                    border-color: var(--primary);
                    background: rgba(255,170,0,0.1);
                    box-shadow: 0 0 15px rgba(255,170,0,0.1);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
}
