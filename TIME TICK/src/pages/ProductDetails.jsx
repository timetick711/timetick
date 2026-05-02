import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

import { useCart } from '../context/CartContext';
import { useVideo } from '../context/VideoContext';
import { useLoader } from '../context/LoaderContext';
import { 
    ShoppingCart, PlayCircle, Image as ImageIcon, 
    Check, ShieldCheck, Truck, RotateCcw, 
    Share2, ChevronRight, Tag, Info, Award, 
    Gem, Clock, Sparkles
} from 'lucide-react';
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
    
    // Hardcoded production URL for sharing
    const shareUrl = `https://timetick.vercel.app/product/${id}`;

    useEffect(() => {
        if (activeVideoId !== id && mediaMode === 'video') {
            setMediaMode('image');
        }
    }, [activeVideoId, id, mediaMode]);

    useEffect(() => {
        showLoader('تحميل تفاصيل المنتج...');
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

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [fetchingMore, setFetchingMore] = useState(false);
    const loaderRef = React.useRef(null);

    const fetchRelated = async (pageNum, isInitial = false) => {
        if (fetchingMore && !isInitial) return;
        setFetchingMore(true);
        
        const pageSize = 8;
        const from = pageNum * pageSize;
        const to = from + pageSize - 1;

        const { data } = await supabase
            .from('products')
            .select('*')
            .neq('id', id)
            .range(from, to);

        if (data) {
            const mappedData = data.map(p => ({
                ...p,
                price: Number(p.price) || 0,
                image: p.imageUrl || p.image || 'https://placehold.co/400x500/1a1a1a/ffffff?text=No+Image',
                video: p.video || ''
            }));
            
            if (isInitial) {
                setRelatedProducts(mappedData);
            } else {
                setRelatedProducts(prev => [...prev, ...mappedData]);
            }
            
            if (data.length < pageSize) setHasMore(false);
        } else {
            setHasMore(false);
        }
        setFetchingMore(false);
    };

    useEffect(() => {
        setPage(0);
        setHasMore(true);
        fetchRelated(0, true);
    }, [id]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !fetchingMore) {
                setPage(prev => {
                    const nextPage = prev + 1;
                    fetchRelated(nextPage);
                    return nextPage;
                });
            }
        }, { threshold: 0.1 });

        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMore, fetchingMore, id]);

    const getYouTubeId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v(?:id)?\/|.*v=)|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    };

    const renderMedia = () => {
        if (!product) return null;

        if (mediaMode === 'image') {
            return (
                <motion.img
                    key={activeImage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
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

        return <video src={videoUrl} controls autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
    };

    if (loading) return <div style={{ minHeight: '80vh' }} />;

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

    const discountValue = product.old_price && Number(product.old_price) > Number(product.price)
        ? Math.round(((Number(product.old_price) - Number(product.price)) / Number(product.old_price)) * 100)
        : null;

    return (
        <div className="container" style={{ padding: '120px 0 60px', minHeight: '80vh' }}>
            {/* Minimalist Breadcrumbs */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', padding: '0 20px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>الرئيسية</span>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{product.name}</span>
            </nav>

            <div className="product-details-wrapper">
                {/* 50/50 Grid Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', padding: '0 20px' }}>
                    
                    {/* Media Gallery Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ position: 'relative', height: '520px', background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                            <AnimatePresence mode="wait">
                                {renderMedia()}
                            </AnimatePresence>
                            
                            {/* Video Overlay Toggle */}
                            {product.video && (
                                <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 10 }}>
                                    <button 
                                        onClick={() => { setMediaMode(mediaMode === 'image' ? 'video' : 'image'); setActiveVideoId(id); }}
                                        style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(212,175,55,0.4)' }}
                                    >
                                        {mediaMode === 'image' ? <PlayCircle size={18} /> : <ImageIcon size={18} />}
                                        {mediaMode === 'image' ? 'تشغيل الفيديو' : 'عرض الصور'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Thumbnails Gallery - Fixed Overlap & Duplication */}
                        {product.images && product.images.length > 0 && (
                            <div className="thumbnails-scroll-container">
                                {(() => {
                                    // Remove duplicates: Combine imageUrl and images, then filter out any that match imageUrl
                                    const allImages = [product.imageUrl, ...(product.images || [])].filter(Boolean);
                                    const uniqueImages = [...new Set(allImages)];
                                    
                                    return uniqueImages.map((img, idx) => (
                                        <motion.div 
                                            key={idx} 
                                            whileHover={{ y: -4 }}
                                            onClick={() => { setActiveImage(img); setMediaMode('image'); }}
                                            style={{ 
                                                minWidth: '80px', width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', 
                                                border: activeImage === img ? '2.5px solid var(--primary)' : '1px solid var(--border-color)', 
                                                background: 'var(--bg-card)', cursor: 'pointer', transition: '0.2s', flexShrink: 0
                                            }}
                                        >
                                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </motion.div>
                                    ));
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Information Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <div>
                            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.8 }}>
                                {product.category === 'men' ? 'ساعات رجالية' : product.category === 'women' ? 'ساعات نسائية' : 'ساعات أطفال'}
                            </div>
                            <h1 style={{ fontSize: '2.4rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px', lineHeight: '1.2' }}>{product.name}</h1>
                            <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: '600' }}>كود المنتج: #{product.displayId || '---'}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '20px', background: 'rgba(212,175,55,0.05)', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.1)' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                                    <span style={{ fontSize: '2.8rem', fontWeight: '950', color: 'var(--primary)' }}>{Number(product.price).toLocaleString()}</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-secondary)' }}> ر.س</span>
                                </div>
                                {discountValue && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '1.2rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>{Number(product.old_price).toLocaleString()} ر.س</span>
                                        <span style={{ background: '#ef4444', color: '#fff', padding: '2px 10px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '900' }}>-{discountValue}% خصم</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Extra Detail Tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            <span className="badge-premium">
                                <Tag size={14} /> موديل {
                                    product.style === 'classic' ? 'كلاسيك' :
                                    product.style === 'formal' ? 'رسمي' :
                                    product.style === 'wedding' ? 'عرائسي' :
                                    product.style === 'smart' ? 'سمارت' :
                                    product.style === 'sport' ? 'سبورت' : 'أخرى'
                                }
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h4 style={{ color: 'var(--text-main)', fontWeight: '800', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={18} color="var(--primary)" /> وصف الساعة</h4>
                            <p style={{ lineHeight: '1.8', color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>{product.description}</p>
                        </div>

                        {/* Service Cards Grid */}
                        <div className="service-cards-grid">
                            <div className="service-card-mini">
                                <Truck size={20} color="var(--primary)" />
                                <div>
                                    <h6>التوصيل</h6>
                                    <p>لجميع المحافظات الجنوبية</p>
                                </div>
                            </div>
                            <div className="service-card-mini">
                                <ShieldCheck size={20} color="var(--primary)" />
                                <div>
                                    <h6>ضمان الأصالة</h6>
                                    <p>منتجات أصلية ومضمونة 100%</p>
                                </div>
                            </div>
                            <div className="service-card-mini">
                                <RotateCcw size={20} color="var(--primary)" />
                                <div>
                                    <h6>استرجاع مرن</h6>
                                    <p>خلال 7 أيام من الاستلام للساعات الغير المضمونه في حال حدوث عطل</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                            <motion.button 
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={() => setShowModal(true)} 
                                className="btn-primary" 
                                style={{ 
                                    flex: 1, height: '52px', 
                                    padding: '0 20px', fontSize: '1.1rem', borderRadius: '14px', fontWeight: '900', justifyContent: 'center' 
                                }}
                            >
                                <ShoppingCart size={22} /> أضف إلى السلة
                            </motion.button>
                            <motion.button 
                                whileHover={{ background: 'var(--border-color)' }}
                                onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                style={{ width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', border: `1.5px solid ${copied ? '#10B981' : 'var(--border-color)'}`, color: copied ? '#10B981' : 'var(--text-main)', background: 'transparent', cursor: 'pointer', transition: '0.3s' }}
                            >
                                {copied ? <Check size={22} /> : <Share2 size={22} />}
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
                <div style={{ marginTop: '100px', padding: '0 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                        <h2 className="related-title">
                            قطع <span style={{ color: 'var(--primary)' }}>قد تعجبك</span> أيضاً
                        </h2>
                        <div style={{ height: '3px', background: 'var(--primary)', width: '80px', borderRadius: '50px' }} />
                    </div>
                    <div className="product-grid">
                        {relatedProducts.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>

                    {/* Infinite Scroll Loader Trigger */}
                    {hasMore && (
                        <div ref={loaderRef} style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                            <div className="loading-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <ProductOptionsModal isOpen={showModal} onClose={() => setShowModal(false)} product={product} onConfirm={(options) => addToCart(product, options)} />

            <style>{`
                .loading-dots {
                    display: flex;
                    gap: 8px;
                }
                .loading-dots span {
                    width: 10px;
                    height: 10px;
                    background-color: var(--primary);
                    border-radius: 50%;
                    display: inline-block;
                    animation: dots 1.4s infinite ease-in-out both;
                }
                .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
                .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
                @keyframes dots {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1.0); }
                }

                .badge-premium {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 14px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 50px;
                    font-size: 0.85rem;
                    color: var(--text-main);
                    font-weight: 700;
                }

                .thumbnails-scroll-container {
                    display: flex;
                    gap: 12px;
                    overflow-x: auto;
                    padding: 8px 0;
                    width: 100%;
                    max-width: 100%;
                    scrollbar-width: thin;
                    scrollbar-color: var(--primary) transparent;
                }

                .thumbnails-scroll-container::-webkit-scrollbar {
                    height: 5px;
                }

                .thumbnails-scroll-container::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }

                .thumbnails-scroll-container::-webkit-scrollbar-thumb {
                    background: var(--primary);
                    border-radius: 10px;
                }

                .service-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 12px;
                    margin: 10px 0;
                }

                .service-card-mini {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    padding: 14px;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    transition: 0.3s;
                }

                .service-card-mini:hover {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                }

                .service-card-mini h6 {
                    margin: 0;
                    font-size: 0.9rem;
                    color: var(--text-main);
                    font-weight: 800;
                }

                .service-card-mini p {
                    margin: 0;
                    font-size: 0.75rem;
                    color: var(--text-dim);
                    line-height: 1.4;
                }

                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                .related-title {
                    font-size: 2.4rem;
                    color: var(--text-main);
                    font-weight: 900;
                    letter-spacing: -1px;
                    margin: 0;
                }

                @media (max-width: 768px) {
                    .product-details-wrapper { padding: 0 !important; }
                    .service-cards-grid { grid-template-columns: 1fr; }
                    h1 { font-size: 1.8rem !important; }
                    .related-title { font-size: 1.6rem !important; }
                }
            `}</style>
        </div>
    );
};

export default ProductDetails;
