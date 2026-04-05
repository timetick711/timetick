import { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Image as ImageIcon, PlayCircle, Heart, CircleHelp } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useVideo } from '../context/VideoContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ProductOptionsModal from './ProductOptionsModal';

const ProductCard = forwardRef(({ product }, ref) => {
    const { addToCart } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const navigate = useNavigate();
    const isFav = isFavorite(product.id);
    const [mediaMode, setMediaMode] = useState(
        (product.video && product.image?.includes('placehold.co')) ? 'video' : 'image'
    );
    const [isHovered, setIsHovered] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const { activeVideoId, setActiveVideoId } = useVideo();

    useEffect(() => {
        if (activeVideoId !== product.id && mediaMode === 'video') {
            setMediaMode('image');
        }
    }, [activeVideoId, product.id, mediaMode]);



    const renderMedia = () => {
        if (mediaMode === 'image') {
            return (
                <motion.img
                    src={product.image}
                    alt={product.name}
                    animate={{ scale: isHovered ? 1.05 : 1 }}
                    transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            );
        }
        return (
            <video
                src={product.video}
                muted
                loop
                autoPlay
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
        );
    };

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="product-card glass-panel"
            style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '380px', // Standard height for desktop
                height: '100%', // Use full row height
                position: 'relative'
            }}
        >
            {/* Media Container */}
            <div style={{
                aspectRatio: '1/1',
                position: 'relative',
                background: '#050505',
                overflow: 'hidden',
                borderRadius: 'var(--radius, 12px)'
            }}>
                {renderMedia()}

                {/* Overlays - Only Favorite */}
                <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    zIndex: 10
                }}>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }}
                        style={{
                            background: isFav ? 'var(--primary)' : 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: isFav ? '#000' : '#fff',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                    >
                        <Heart size={18} fill={isFav ? "currentColor" : "none"} />
                    </motion.button>
                </div>

                {/* Media Toggles */}
                {product.video && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute', bottom: '12px', left: '50%',
                            transform: 'translateX(-50%)', display: 'flex', gap: '6px',
                            background: 'rgba(0,0,0,0.7)', padding: '4px 10px',
                            borderRadius: '20px', zIndex: 10, backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setMediaMode('image'); }}
                            style={{
                                background: mediaMode === 'image' ? 'var(--primary)' : 'transparent',
                                color: mediaMode === 'image' ? '#000' : '#fff',
                                border: 'none', padding: '4px 10px', borderRadius: '12px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '0.75rem', fontWeight: '700'
                            }}
                        >
                            <ImageIcon size={14} /> صورة
                        </button>
                        <button
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setMediaMode('video'); 
                                setActiveVideoId(product.id);
                            }}
                            style={{
                                background: mediaMode === 'video' ? 'var(--primary)' : 'transparent',
                                color: mediaMode === 'video' ? '#000' : '#fff',
                                border: 'none', padding: '4px 10px', borderRadius: '12px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '0.75rem', fontWeight: '700'
                            }}
                        >
                            <PlayCircle size={14} /> فيديو
                        </button>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div 
                style={{
                    padding: '16px', flex: 1,
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--bg-card, rgba(255,255,255,0.02))',
                    borderTop: '1px solid var(--border-color, rgba(255,255,255,0.05))'
                }}
            >
                <div>
                    {product.displayId && (
                        <div style={{
                            display: 'inline-block',
                            background: 'rgba(212, 175, 55, 0.1)',
                            color: 'var(--primary)',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            marginBottom: '8px',
                            border: '1px solid rgba(212, 175, 55, 0.2)'
                        }}>
                            #{product.displayId}
                        </div>
                    )}
                    <h3 
                        style={{
                            fontSize: '1.25rem', fontWeight: '700',
                            color: 'var(--text-main, #fff)', marginBottom: '14px',
                            fontFamily: 'cairo',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}
                    >
                        {product.name}
                    </h3>
                </div>

                <div 
                    style={{
                        marginTop: 'auto',
                        paddingTop: '12px', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.05))'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {product.old_price && Number(product.old_price) > Number(product.price) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ 
                                        fontSize: '1rem', color: 'var(--text-dim, rgba(255,255,255,0.4))', 
                                        textDecoration: 'line-through' 
                                    }}>
                                        {Number(product.old_price).toLocaleString()} ر.س
                                    </span>
                                    <span style={{
                                        background: '#ef4444', color: '#fff',
                                        padding: '2px 8px', borderRadius: '4px',
                                        fontSize: '0.8rem', fontWeight: '900'
                                    }}>
                                        {Math.round(((Number(product.old_price) - Number(product.price)) / Number(product.old_price)) * 100)}%-
                                    </span>
                                </div>
                            )}
                            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary)', lineHeight: '1' }}>
                                {(Number(product.price) || 0).toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: '400' }}>ر.س</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <motion.button
                                whileHover={{ scale: 1.05, background: '#ff3b3b' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(`/product/${product.id}`)}
                                style={{
                                    width: '42px', height: '42px', borderRadius: '12px',
                                    background: '#ef4444', color: '#fff',
                                    border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 0.3s',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                                }}
                                title="استعلام"
                            >
                                <CircleHelp size={22} />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 8px 25px rgba(212, 175, 55, 0.4)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                                className="btn-primary"
                                style={{
                                    width: '42px', height: '42px', borderRadius: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '0', fontSize: '1rem'
                                }}
                            >
                                <ShoppingCart size={22} />
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>

            <ProductOptionsModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                product={product}
                onConfirm={(options) => addToCart(product, options)}
            />

        </motion.div>
    );
});

export default ProductCard;
