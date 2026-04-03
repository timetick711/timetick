import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

import { useCart } from '../context/CartContext';
import { useVideo } from '../context/VideoContext';
import { useLoader } from '../context/LoaderContext';
import { ShoppingCart, ArrowRight, PlayCircle, Image as ImageIcon, Link, Check } from 'lucide-react';
import { subscribeToProducts, subscribeToProduct } from '../services/productService';
import ProductCard from '../components/ProductCard';
import ProductOptionsModal from '../components/ProductOptionsModal';

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { showLoader, hideLoader } = useLoader();
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mediaMode, setMediaMode] = useState('image'); // 'image' or 'video'
    const [activeImage, setActiveImage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const { activeVideoId, setActiveVideoId } = useVideo();

    useEffect(() => {
        if (activeVideoId !== id && mediaMode === 'video') {
            setMediaMode('image');
        }
    }, [activeVideoId, id, mediaMode]);

    useEffect(() => {
        showLoader('جاري تحميل تفاصيل المنتج...');
        setLoading(true);
        const unsubscribe = subscribeToProduct(id, (data) => {
            if (data) {
                setProduct(data);
                if (data.video && data.imageUrl?.includes('placehold.co')) {
                    setMediaMode('video');
                }
                const firstImage = data.imageUrl || (data.images && data.images.length > 0 ? data.images[0] : '');
                setActiveImage(firstImage);
                setLoading(false);
                hideLoader();
            } else {
                setProduct(null);
                setLoading(false);
                hideLoader();
            }
        });

        return () => unsubscribe();
    }, [id]);

    useEffect(() => {
        const fetchRelated = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .neq('id', id)
                .limit(10);

            if (data) {
                const shuffled = data.sort(() => 0.5 - Math.random());
                const mappedData = shuffled.slice(0, 4).map(p => ({
                    ...p,
                    price: Number(p.price) || 0,
                    image: p.imageUrl || p.image || 'https://placehold.co/400x500/1a1a1a/ffffff?text=No+Image',
                    video: p.video || ''
                }));
                setRelatedProducts(mappedData);
            }
        };

        fetchRelated();

        const unsubscribe = subscribeToProducts(() => fetchRelated());
        return () => unsubscribe();
    }, [id]);

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

    const renderMedia = () => {
        if (!product) return null;

        if (mediaMode === 'image') {
            return (
                <img
                    src={activeImage || product.imageUrl || product.image}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
            );
        }

        const videoUrl = product.video;
        if (!videoUrl) return null;

        if (videoUrl.startsWith('data:video')) {
            return <video src={videoUrl} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
        }

        const ytId = getYouTubeId(videoUrl);
        if (ytId) {
            return <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} frameBorder="0" allowFullScreen style={{ border: 'none' }} />;
        }

        const ttId = getTikTokId(videoUrl);
        if (ttId) {
            return <iframe width="100%" height="100%" src={`https://www.tiktok.com/embed/v2/${ttId}`} frameBorder="0" allowFullScreen style={{ border: 'none' }} />;
        }

        const igId = getInstagramId(videoUrl);
        if (igId) {
            return <iframe width="100%" height="100%" src={`https://www.instagram.com/reel/${igId}/embed/`} frameBorder="0" allowTransparency="true" style={{ border: 'none' }} />;
        }

        return <video src={videoUrl} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
    };

    if (loading) {
        return <div style={{ minHeight: '80vh' }}></div>;
    }

    if (!product) {
        return (
            <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-dim)' }}>
                <h2>المنتج غير موجود</h2>
                <button onClick={() => navigate('/')} className="btn-primary" style={{ marginTop: '20px' }}>
                    العودة للمتجر
                </button>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '120px 20px 40px', minHeight: '80vh' }}>
            <button
                onClick={() => navigate('/')}
                className="back-btn glass-panel"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 24px',
                    borderRadius: '50px',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'cairo',
                    marginBottom: '30px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: 'rgba(255, 255, 255, 0.03)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(5px)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
            >
                <ArrowRight size={20} color="var(--primary)" />
                <span>العودة للمتجر</span>
            </button>

            <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', padding: '30px', overflow: 'hidden' }}>

                {/* Media Section Wrapper */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'relative', height: '500px', background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                        {renderMedia()}

                        {/* Media Toggles */}
                        {product.video && (
                            <div style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                gap: '10px',
                                background: 'rgba(0,0,0,0.6)',
                                padding: '5px 10px',
                                borderRadius: '20px',
                                zIndex: 10
                            }}>
                                <button
                                    onClick={() => setMediaMode('image')}
                                    style={{
                                        background: mediaMode === 'image' ? 'var(--primary)' : 'transparent',
                                        color: mediaMode === 'image' ? '#000' : '#fff',
                                        border: 'none',
                                        padding: '5px 15px',
                                        borderRadius: '15px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    <ImageIcon size={16} /> صورة
                                </button>
                                <button
                                    onClick={() => { 
                                        setMediaMode('video'); 
                                        setActiveVideoId(id);
                                    }}
                                    style={{
                                        background: mediaMode === 'video' ? 'var(--primary)' : 'transparent',
                                        color: mediaMode === 'video' ? '#000' : '#fff',
                                        border: 'none',
                                        padding: '5px 15px',
                                        borderRadius: '15px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    <PlayCircle size={16} /> فيديو
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Thumbnails Gallery */}
                    {product.images && product.images.length > 0 && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto', paddingBottom: '5px' }}>
                            {product.images.map((img, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => { setActiveImage(img); setMediaMode('image'); }}
                                    style={{
                                        minWidth: '70px', height: '70px', borderRadius: '10px', overflow: 'hidden',
                                        border: activeImage === img ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                        cursor: 'pointer', transition: '0.2s'
                                    }}
                                >
                                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem', letterSpacing: '1px' }}>
                            {product.category === 'men' ? 'رجالي' : product.category === 'women' ? 'نسائي' : 'أطفال'} • {product.style === 'classic' ? 'كلاسيك' : 'رسمي'}
                        </span>
                        <h1 style={{ fontSize: '2.5rem', marginTop: '10px', lineHeight: '1.2' }}>{product.name}</h1>
                        {product.displayId && (
                            <div style={{
                                display: 'inline-block',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '4px 12px',
                                borderRadius: '8px',
                                marginTop: '10px',
                                fontSize: '0.9rem',
                                color: 'var(--text-dim)'
                            }}>
                                الرقم المميز: <span style={{ color: '#fff', fontWeight: 'bold' }}>#{product.displayId}</span>
                            </div>
                        )}
                    </div>

                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>
                        {product.variants && product.variants.length > 0 ? (
                            <>
                                {Math.min(...[Number(product.price), ...product.variants.map(v => v.price)]).toLocaleString()} - {Math.max(...[Number(product.price), ...product.variants.map(v => v.price)]).toLocaleString()}
                            </>
                        ) : (
                            Number(product.price).toLocaleString()
                        )}
                        <span style={{ fontSize: '1rem', fontWeight: '400' }}> ر.س</span>
                    </div>

                    <div style={{ height: '1px', background: 'var(--border-color)' }} />

                    <p style={{ lineHeight: '1.8', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                        {product.description}
                    </p>

                    <div style={{ marginTop: 'auto' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setShowModal(true)}
                                className="btn-primary"
                                style={{ flex: 1, justifyContent: 'center', padding: '16px', fontSize: '1.1rem' }}
                            >
                                <ShoppingCart size={22} /> إضافة للسلة
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                style={{
                                    width: '60px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 'var(--radius, 12px)',
                                    border: `1px solid ${copied ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
                                    color: copied ? '#10B981' : 'var(--text-main)',
                                    background: copied ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                onMouseEnter={(e) => {
                                    if (!copied) {
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                        e.currentTarget.style.color = 'var(--primary)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!copied) {
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                        e.currentTarget.style.color = 'var(--text-main)';
                                    }
                                }}
                                title="نسخ رابط المنتج"
                            >
                                {copied ? <Check size={22} /> : <Link size={22} />}
                            </button>
                        </div>
                        <ProductOptionsModal
                            isOpen={showModal}
                            onClose={() => setShowModal(false)}
                            product={product}
                            onConfirm={(options) => addToCart(product, options)}
                        />
                        <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                            شحن سريع • ضمان أصالة المنتج • استرجاع مجاني
                        </p>
                    </div>
                </div>
            </div>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
                <div style={{ marginTop: '80px' }}>
                    <h2 style={{
                        fontSize: '2rem',
                        marginBottom: '30px',
                        borderRight: '4px solid var(--primary)',
                        paddingRight: '15px',
                        color: 'var(--text-main)'
                    }}>
                        منتجات أخرى قد تعجبك
                    </h2>
                    <div className="product-grid">
                        {relatedProducts.map(p => (
                            <div key={p.id} >
                                <ProductCard product={p} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetails;
