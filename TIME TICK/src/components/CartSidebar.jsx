import { Trash2, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useEffect, useRef, useState } from 'react';
import ClearCartConfirmModal from './ClearCartConfirmModal';
import CheckoutSuccessModal from './CheckoutSuccessModal';
import CheckoutConfirmModal from './CheckoutConfirmModal';
import { useAuth } from '../context/AuthContext';

export default function CartSidebar() {
    const { cart, removeFromCart, updateQuantity, total, prepareWhatsAppCheckout, isCartOpen, closeCart, clearCart } = useCart();
    const { currentUser, openAuthModal } = useAuth();
    const sidebarRef = useRef(null);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false);
    const [whatsappUrl, setWhatsappUrl] = useState('');

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                closeCart();
            }
        };
        if (isCartOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isCartOpen, closeCart]);

    const handleClearCart = () => {
        clearCart();
        setIsClearConfirmOpen(false);
    };

    const handleCheckoutClick = () => {
        if (!currentUser) {
            openAuthModal();
            return;
        }
        if (cart.length === 0) return;

        setIsCheckoutConfirmOpen(true);
    };

    const handleConfirmCheckout = async () => {
        setIsCheckoutConfirmOpen(false); // Close confirm modal first

        const result = await prepareWhatsAppCheckout();
        if (result && result.success) {
            setWhatsappUrl(result.url);
            setIsSuccessModalOpen(true);
            clearCart();
        }
    };

    const handleProceedToWhatsApp = () => {
        if (whatsappUrl) {
            window.open(whatsappUrl, '_blank');
            setIsSuccessModalOpen(false);
            closeCart();
        }
    };

    return (
        <>
            <ClearCartConfirmModal
                isOpen={isClearConfirmOpen}
                onClose={() => setIsClearConfirmOpen(false)}
                onConfirm={handleClearCart}
            />

            <CheckoutConfirmModal
                isOpen={isCheckoutConfirmOpen}
                onClose={() => setIsCheckoutConfirmOpen(false)}
                onConfirm={handleConfirmCheckout}
            />

            <CheckoutSuccessModal
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)}
                onProceed={handleProceedToWhatsApp}
            />

            {/* Overlay */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.5)',
                zIndex: 999,
                opacity: isCartOpen ? 1 : 0,
                pointerEvents: isCartOpen ? 'auto' : 'none',
                transition: 'opacity 0.3s ease',
                backdropFilter: 'blur(2px)'
            }} />

            <div ref={sidebarRef} style={{
                position: 'fixed',
                top: 0,
                right: isCartOpen ? 0 : '-400px', // Slide in from Right
                width: '350px',
                maxWidth: '90%',
                height: '100%',
                background: 'var(--bg-card)',
                zIndex: 1000,
                boxShadow: '-5px 0 15px rgba(0,0,0,0.3)',
                transition: 'right 0.3s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                borderLeft: '1px solid var(--glass-border)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)' }}>
                        <ShoppingBag /> سلة المشتريات
                    </h2>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        {cart.length > 0 && (
                            <button
                                onClick={() => setIsClearConfirmOpen(true)}
                                style={{
                                    background: 'rgba(255, 75, 75, 0.1)',
                                    border: '1px solid #ff4b4b',
                                    cursor: 'pointer',
                                    color: '#ff4b4b',
                                    borderRadius: '5px',
                                    padding: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title="حذف الكل"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button onClick={closeCart} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {cart.length === 0 ? (
                        <p style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-dim)' }}>السلة فارغة حالياً</p>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} style={{
                                display: 'flex',
                                gap: '10px',
                                marginBottom: '15px',
                                borderBottom: '1px solid var(--glass-border)',
                                paddingBottom: '15px'
                            }}>
                                <img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h4 style={{ fontSize: '0.9rem', marginBottom: '5px' }}>{item.name}</h4>
                                        <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>#{item.displayId || '---'}</span>
                                    </div>
                                    <p style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>{item.price.toLocaleString()} ر.س</p>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '5px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                            <button onClick={() => updateQuantity(item.id, -1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '2px 8px', cursor: 'pointer' }}>-</button>
                                            <span style={{ fontSize: '0.9rem' }}>{item.dp_qty}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '2px 8px', cursor: 'pointer' }}>+</button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} style={{ color: '#ff4444', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {cart.length > 0 && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontWeight: 'bold' }}>
                            <span>الإجمالي:</span>
                            <span style={{ color: 'var(--primary)' }}>{total.toLocaleString()} ر.س</span>
                        </div>
                        <button
                            className="btn-primary"
                            onClick={handleCheckoutClick}
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            إتمام الطلب عبر واتساب
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
