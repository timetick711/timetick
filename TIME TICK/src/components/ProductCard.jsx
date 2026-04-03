import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Image as ImageIcon, PlayCircle, Heart, CircleHelp } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useVideo } from '../context/VideoContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ProductOptionsModal from './ProductOptionsModal';

export default function ProductCard({ product }) {
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
            layout
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
                minHeight: '420px', // Standard height for desktop
                height: '100%', // Use full row height
                position: 'relative'
            }}
        >
            {/* Media Container */}
            <div style={{
                aspectRatio: '1/1', // Use square aspect ratio for consistency
                position: 'relative',
                background: '#000',
                overflow: 'hidden'
            }}>
                {renderMedia()}

                {/* Overlays */}
                {product.displayId && (
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        style={{
                            position: 'absolute', top: '12px', left: '12px',
                            background: 'var(--primary)', color: '#000',
                            padding: '4px 8px', borderRadius: '6px',
                            fontSize: '0.75rem', fontWeight: '800', zIndex: 10
                        }}
                    >
                        #{product.displayId}
                    </motion.div>
                )}

                <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    display: 'flex', gap: '8px', zIndex: 10
                }}>
                    <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }}
                        style={{
                            background: isFav ? 'var(--primary)' : 'rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '50%',
                            width: '35px',
                            height: '35px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: isFav ? '#000' : '#fff',
                            boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
                        }}
                    >
                        <Heart size={18} fill={isFav ? "currentColor" : "none"} />
                    </motion.button>
                </div>

                {/* Media Toggles - Pill Style */}
                {product.video && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="media-toggles"
                        style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '5px',
                            background: 'rgba(0,0,0,0.6)',
                            padding: '4px 8px',
                            borderRadius: '20px',
                            zIndex: 10,
                            backdropFilter: 'blur(4px)'
                        }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setMediaMode('image'); }}
                            className="media-toggle-btn"
                            style={{
                                background: mediaMode === 'image' ? 'var(--primary)' : 'transparent',
                                color: mediaMode === 'image' ? '#000' : '#fff',
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
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
                            className="media-toggle-btn"
                            style={{
                                background: mediaMode === 'video' ? 'var(--primary)' : 'transparent',
                                color: mediaMode === 'video' ? '#000' : '#fff',
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                            }}
                        >
                            <PlayCircle size={14} /> فيديو
                        </button>
                    </div>
                )}


            </div>

            {/* Content */}
            <div 
                className="product-card-content"
                style={{
                    padding: '20px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: 'var(--bg-card)'
                }}
            >
                <div>
                    <h3 
                        className="product-card-title"
                        style={{
                            fontSize: '1.2rem', fontWeight: '700',
                            color: 'var(--text-main)', marginBottom: '8px',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}
                    >
                        {product.name}
                    </h3>
                    <p 
                        className="product-card-desc"
                        style={{
                            color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: '1.4',
                            display: '-webkit-box', WebkitLineClamp: 2, lineClamp: 2, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden', height: '2.8em' // Stabilize text height
                        }}
                    >
                        {product.description}
                    </p>
                </div>

                <div 
                    className="product-card-actions"
                    style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginTop: '15px', paddingTop: '15px',
                        borderTop: '1px solid var(--border-color)'
                    }}
                >
                    <span 
                        className="product-card-price"
                        style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary)' }}
                    >
                        {(Number(product.price) || 0).toLocaleString()} <span style={{ fontSize: '0.8rem' }}>ر.س</span>
                    </span>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(`/product/${product.id}`)}
                            className="btn-icon product-card-btn"
                            style={{
                                padding: '10px', borderRadius: '12px',
                                background: '#ff4b4b',
                                color: 'white',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                boxShadow: isHovered ? '0 5px 15px #ff4b4b' : '0 5px 15px #fa6c6cff'
                            }}
                            title="التفاصيل"
                        >
                            <CircleHelp size={20} />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                            className="btn-primary product-card-btn"
                            style={{
                                padding: '10px 16px', borderRadius: '12px', fontSize: '0.9rem',
                                boxShadow: isHovered ? '0 5px 15px rgba(212, 175, 55, 0.4)' : '0 5px 15px rgba(245, 214, 113, 0.4)'
                            }}
                        >
                            <ShoppingCart size={18} />
                        </motion.button>
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
}
