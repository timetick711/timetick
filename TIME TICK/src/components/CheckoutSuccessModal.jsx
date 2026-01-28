import { CheckCircle, MessageCircle } from 'lucide-react';

export default function CheckoutSuccessModal({ isOpen, onClose, onProceed }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(5px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="glass-panel" style={{
                width: '90%',
                maxWidth: '400px',
                padding: '30px',
                textAlign: 'center',
                border: '1px solid rgba(75, 255, 75, 0.3)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
                <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: 'rgba(75, 255, 75, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    border: '1px solid #4bff4b'
                }}>
                    <CheckCircle size={32} color="#4bff4b" />
                </div>

                <h2 style={{ color: 'white', marginBottom: '10px', fontSize: '1.4rem' }}>تم تجهيز طلبك بنجاح!</h2>
                <p style={{ color: 'var(--text-dim)', marginBottom: '10px', lineHeight: '1.6' }}>
                    تم تحميل فاتورة طلبك (PDF) بنجاح.
                </p>
                <p style={{ color: '#d4af37', marginBottom: '30px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    يرجى إرسال الرسالة وإرفاق الفاتورة في المحادثة لإكمال الطلب.
                </p>

                <button
                    onClick={onProceed}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        padding: '12px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '1rem',
                        marginBottom: '15px'
                    }}
                >
                    <span>الانتقال إلى واتساب</span>
                    <MessageCircle size={20} />
                </button>

                <button
                    onClick={onClose}
                    // style={{
                    //     background: 'transparent',
                    //     border: 'none',
                    //     color: 'var(--text-dim)',
                    //     cursor: 'pointer',
                    //     fontSize: '0.9rem',
                    //     textDecoration: 'underline'
                    // }}
                    className="btn-primary cancel-btn"
                    style={{
                        background: '#ff4b4b',
                        width: '100%',
                        padding: '12px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '1rem',
                        marginBottom: '15px',
                        color:'white',
                    }}
                >
                   <span>إغلاق</span>
                </button>
            </div>
        </div>
    );
}
