import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingCart } from 'lucide-react';

export default function ProductOptionsModal({ isOpen, onClose, product, onConfirm }) {
    const [quantity, setQuantity] = useState(1);
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedMaterial, setSelectedMaterial] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const getCurrentPrice = () => {
        if (!product.variants || product.variants.length === 0) return Number(product.price);

        // Find variant that matches BOTH selected color AND selected material 100%
        const matchingVariant = product.variants.find(v => {
            const colorMatch = v.color ? v.color === selectedColor : !selectedColor;
            const materialMatch = v.material ? v.material === selectedMaterial : !selectedMaterial;
            return colorMatch && materialMatch;
        });

        if (matchingVariant) return matchingVariant.price;

        // Fallback to Base Price if no exact match 100%
        return Number(product.price);
    };

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setSelectedColor('');
            setSelectedMaterial('');
            setError('');
            setSuccess('');
        }
    }, [isOpen, product]);

    const validateSelection = () => {
        if (product.colors && product.colors.length > 0 && !selectedColor) {
            setError('يرجى اختيار اللون');
            return false;
        }
        if (product.materials && product.materials.length > 0 && !selectedMaterial) {
            setError('يرجى اختيار مادة السوار');
            return false;
        }
        return true;
    };

    const handleConfirm = () => {
        if (!validateSelection()) return;

        onConfirm({
            quantity,
            selectedColor: selectedColor || null,
            selectedMaterial: selectedMaterial || null,
            variantPrice: getCurrentPrice()
        });
        onClose();
    };

    const handleAddAnother = () => {
        if (!validateSelection()) return;

        onConfirm({
            quantity,
            selectedColor: selectedColor || null,
            selectedMaterial: selectedMaterial || null,
            variantPrice: getCurrentPrice()
        });

        // Reset for next item
        setQuantity(1);
        setSelectedColor('');
        setSelectedMaterial('');
        setError('');
        setSuccess('تمت الإضافة بنجاح! يمكنك اختيار مواصفات أخرى الآن.');

        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
    };

    if (!isOpen || !product) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="modal-overlay"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'var(--bg-main)', // Full opaque background for full screen
                    zIndex: 9999, // High z-index to stay on top
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto'
                }}
            >
                <div style={{
                    maxWidth: '800px',
                    width: '100%',
                    margin: '0 auto',
                    padding: '40px 20px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>تخصيص الطلب</h2>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                padding: '10px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '30px', marginBottom: '40px', flexWrap: 'wrap' }}>
                        <div style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-color)',
                            flexShrink: 0,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                        }}>
                            <img
                                src={product.imageUrl || product.image}
                                alt={product.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 10px', fontSize: '1.8rem' }}>{product.name}</h3>
                            <p style={{ color: 'var(--text-dim)', marginBottom: '15px', lineHeight: '1.6' }}>
                                {product.description}
                            </p>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                {getCurrentPrice().toLocaleString()} <span style={{ fontSize: '1rem' }}>ر.س</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '20px', border: '1px solid var(--border-color)', marginBottom: '30px' }}>
                        {/* Colors */}
                        {product.colors && product.colors.length > 0 && (
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold', fontSize: '1.1rem' }}>أختر اللون</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                                    {product.colors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => { setSelectedColor(color); setError(''); setSuccess(''); }}
                                            style={{
                                                padding: '12px 24px',
                                                borderRadius: '12px',
                                                border: selectedColor === color ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                                background: selectedColor === color ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                                                color: selectedColor === color ? '#000' : 'var(--text-main)',
                                                cursor: 'pointer',
                                                transition: '0.2s',
                                                fontSize: '1rem',
                                                fontWeight: selectedColor === color ? 'bold' : 'normal'
                                            }}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Materials */}
                        {product.materials && product.materials.length > 0 && (
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold', fontSize: '1.1rem' }}>أختر مادة السوار</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                                    {product.materials.map(material => (
                                        <button
                                            key={material}
                                            onClick={() => { setSelectedMaterial(material); setError(''); setSuccess(''); }}
                                            style={{
                                                padding: '12px 24px',
                                                borderRadius: '12px',
                                                border: selectedMaterial === material ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                                background: selectedMaterial === material ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                                                color: selectedMaterial === material ? '#000' : 'var(--text-main)',
                                                cursor: 'pointer',
                                                transition: '0.2s',
                                                fontSize: '1rem',
                                                fontWeight: selectedMaterial === material ? 'bold' : 'normal'
                                            }}
                                        >
                                            {material}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quantity */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold', fontSize: '1.1rem' }}>الكمية</label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px',
                                background: 'var(--bg-main)',
                                padding: '8px',
                                borderRadius: '15px',
                                width: 'fit-content',
                                border: '1px solid var(--border-color)'
                            }}>
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-main)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex'
                                    }}
                                >
                                    <Minus size={20} />
                                </button>
                                <span style={{ fontSize: '1.4rem', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-main)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex'
                                    }}
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            color: '#ff6b6b',
                            background: 'rgba(255,107,107,0.1)',
                            padding: '15px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            fontSize: '1rem',
                            textAlign: 'center',
                            border: '1px solid #ff6b6b'
                        }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            color: '#4ecb71',
                            background: 'rgba(78, 203, 113, 0.1)',
                            padding: '15px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            fontSize: '1rem',
                            textAlign: 'center',
                            border: '1px solid #4ecb71'
                        }}>
                            {success}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '15px', flexDirection: 'column' }}>
                        <button
                            onClick={handleConfirm}
                            className="btn-primary"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                padding: '18px',
                                fontSize: '1.2rem',
                                borderRadius: '15px'
                            }}
                        >
                            <ShoppingCart size={24} />
                            <span>إضافة وإنهاء - {(getCurrentPrice() * quantity).toLocaleString()} ر.س</span>
                        </button>

                        {((product.colors && product.colors.length > 1) || (product.materials && product.materials.length > 1)) && (
                            <button
                                onClick={handleAddAnother}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    padding: '18px',
                                    fontSize: '1.1rem',
                                    background: 'transparent',
                                    border: '2px solid var(--primary)',
                                    color: 'var(--primary)',
                                    borderRadius: '15px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                <Plus size={24} />
                                <span>إضافة واختيار ساعة أخرى</span>
                            </button>
                        )}
                    </div>

                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
