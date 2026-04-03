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
                className="custom-modal-overlay"
            >
                <div className="custom-modal-container">
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>تخصيص طلبك</h2>
                            <p style={{ color: 'var(--text-dim)', margin: '5px 0 0' }}>حدد المواصفات التي تناسب ذوقك</p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                padding: '12px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: '0.3s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="custom-grid">
                        {/* Left Side: Preview */}
                        <div className="preview-pane">
                            <div className="preview-image-wrapper">
                                <img
                                    src={product.imageUrl || product.image}
                                    alt={product.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            <div style={{ marginTop: '24px', textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{product.name}</h3>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)' }}>
                                    {getCurrentPrice().toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: '400' }}>ر.س</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Controls */}
                        <div className="controls-pane">
                            <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
                                {/* Colors */}
                                {product.colors && product.colors.length > 0 && (
                                    <div className="option-group">
                                        <label className="option-label">اختر اللون</label>
                                        <div className="chips-container">
                                            {product.colors.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => { setSelectedColor(color); setError(''); setSuccess(''); }}
                                                    className={`option-chip ${selectedColor === color ? 'active' : ''}`}
                                                >
                                                    {color}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Materials */}
                                {product.materials && product.materials.length > 0 && (
                                    <div className="option-group">
                                        <label className="option-label">مادة السوار</label>
                                        <div className="chips-container">
                                            {product.materials.map(material => (
                                                <button
                                                    key={material}
                                                    onClick={() => { setSelectedMaterial(material); setError(''); setSuccess(''); }}
                                                    className={`option-chip ${selectedMaterial === material ? 'active' : ''}`}
                                                >
                                                    {material}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Quantity */}
                                <div className="option-group" style={{ marginBottom: 0 }}>
                                    <label className="option-label">الكمية</label>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '24px',
                                        background: 'rgba(255,255,255,0.03)',
                                        padding: '10px',
                                        borderRadius: '16px',
                                        width: 'fit-content',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            style={{
                                                width: '40px', height: '40px',
                                                borderRadius: '12px',
                                                background: 'var(--bg-card)',
                                                color: 'var(--text-main)',
                                                border: '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: '0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <span style={{ fontSize: '1.5rem', fontWeight: '700', minWidth: '30px', textAlign: 'center' }}>
                                            {quantity}
                                        </span>
                                        <button
                                            onClick={() => setQuantity(quantity + 1)}
                                            style={{
                                                width: '40px', height: '40px',
                                                borderRadius: '12px',
                                                background: 'var(--bg-card)',
                                                color: 'var(--text-main)',
                                                border: '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: '0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            color: '#ff6b6b', background: 'rgba(255,107,107,0.1)',
                                            padding: '16px', borderRadius: '12px', marginBottom: '20px',
                                            textAlign: 'center', border: '1px solid rgba(255,107,107,0.2)'
                                        }}
                                    >
                                        {error}
                                    </motion.div>
                                )}
                                {success && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            color: '#4ecb71', background: 'rgba(78, 203, 113, 0.1)',
                                            padding: '16px', borderRadius: '12px', marginBottom: '20px',
                                            textAlign: 'center', border: '1px solid rgba(78, 203, 113, 0.2)'
                                        }}
                                    >
                                        {success}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                                <button
                                    onClick={handleConfirm}
                                    className="btn-primary"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'center',
                                        padding: '20px',
                                        fontSize: '1.2rem',
                                        borderRadius: '16px',
                                        boxShadow: '0 10px 20px rgba(212, 175, 55, 0.2)'
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
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            gap: '12px', padding: '18px', fontSize: '1.1rem',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '2px solid var(--primary)',
                                            color: 'var(--primary)',
                                            borderRadius: '16px',
                                            cursor: 'pointer',
                                            fontWeight: '700',
                                            transition: '0.3s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <Plus size={24} />
                                        <span>إضافة واختيار ساعة أخرى</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
