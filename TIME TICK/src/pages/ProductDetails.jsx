import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

import { useCart } from '../context/CartContext';
import { useVideo } from '../context/VideoContext';
import { useLoader } from '../context/LoaderContext';
import { 
    ShoppingCart, ArrowRight, PlayCircle, Image as ImageIcon, 
    Link, Check, ShieldCheck, Truck, RotateCcw, Award, 
    HelpCircle, Tag, Package, ChevronRight, Share2 
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
                <motion.img
                    key={activeImage}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
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
            {/* Breadcrumbs Navigation */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '30px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                <span onClick={() => navigate('/')} style={{ cursor: 'pointer', transition: '0.2s' }} onMouseEnter={(e) => e.target.style.color = 'var(--primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}>الرئيسية</span>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{product.name}</span>
            </nav>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel" 
                style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1.2fr 1.8fr', // Fixed Desktop Split
                    gap: '60px', 
                    padding: '40px', 
                    overflow: 'hidden', 
                    background: 'var(--bg-card)',
                    borderRadius: '30px'
                }}
            >
                {/* Media Section Wrapper */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'relative', height: '560px', background: 'var(--bg-main)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        {renderMedia()}
                        {product.video && (
                            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '25px', zIndex: 10, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <button onClick={() => setMediaMode('image')} style={{ background: mediaMode === 'image' ? 'var(--primary)' : 'transparent', color: mediaMode === 'image' ? '#000' : '#fff', border: 'none', padding: '5px 15px', borderRadius: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700' }}><ImageIcon size={16} /> صورة</button>
                                <button onClick={() => { setMediaMode('video'); setActiveVideoId(id); }} style={{ background: mediaMode === 'video' ? 'var(--primary)' : 'transparent', color: mediaMode === 'video' ? '#000' : '#fff', border: 'none', padding: '5px 15px', borderRadius: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700' }}><PlayCircle size={16} /> فيديو</button>
                            </div>
                        )}
                    </div>
                    {product.images && product.images.length > 0 && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
                            {product.images.map((img, idx) => (
                                <motion.div key={idx} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setActiveImage(img); setMediaMode('image'); }}
                                    style={{ minWidth: '94px', height: '94px', borderRadius: '15px', overflow: 'hidden', border: activeImage === img ? '2.5px solid var(--primary)' : '1px solid var(--border-color)', background: 'var(--bg-main)', cursor: 'pointer', transition: '0.2s', boxShadow: activeImage === img ? '0 0 20px rgba(212, 175, 55, 0.2)' : 'none' }}>
                                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Section - Now Multi-column Subgrid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {/* Header Group */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                        <div style={{ flex: '1 1 400px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <span style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--primary)', padding: '4px 14px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: '800', border: '1px solid rgba(212,175,55,0.2)' }}>
                                    {product.category === 'men' ? 'رجالي' : product.category === 'women' ? 'نسائي' : 'أطفال'}
                                </span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: '600' }}>#{product.displayId || '---'}</span>
                            </div>
                            <h1 style={{ fontSize: '3.2rem', color: 'var(--text-main)', lineHeight: '1.1', fontWeight: '900', letterSpacing: '-1px' }}>{product.name}</h1>
                        </div>
                        
                        {/* Price & Highlight Area */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                            {product.old_price && Number(product.old_price) > Number(product.price) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.4rem', color: 'var(--text-dim)', textDecoration: 'line-through', fontWeight: '500' }}>{Number(product.old_price).toLocaleString()} ر.س</span>
                                    <span style={{ background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: '8px', fontSize: '1rem', fontWeight: '900' }}>خصم {Math.round(((Number(product.old_price) - Number(product.price)) / Number(product.old_price)) * 100)}%</span>
                                </div>
                            )}
                            <div style={{ fontSize: '2.8rem', fontWeight: '950', color: 'var(--primary)', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                {product.variants && product.variants.length > 0 ? (
                                    <span style={{ fontSize: '2rem' }}>{Math.min(...[Number(product.price), ...product.variants.map(v => v.price)]).toLocaleString()} - {Math.max(...[Number(product.price), ...product.variants.map(v => v.price)]).toLocaleString()}</span>
                                ) : (
                                    Number(product.price).toLocaleString()
                                )}
                                <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-secondary)' }}> ر.س</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ height: '1.5px', background: 'linear-gradient(to left, var(--primary), transparent)', margin: '5px 0' }} />

                    {/* Subgrid for Description and Support info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Award size={20} color="var(--primary)" /> تفاصيل الساعة
                            </h3>
                            <p style={{ lineHeight: '1.8', color: 'var(--text-secondary)', fontSize: '1.15rem' }}>{product.description}</p>
                            
                            {/* Feature Pills */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px' }}>
                                <div className="glass-panel" style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                    <Tag size={16} color="var(--primary)" /> الستايل: {product.style === 'classic' ? 'كلاسيك' : 'رسمي'}
                                </div>
                                <div className="glass-panel" style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                    <Package size={16} color="var(--primary)" /> متوفر للتوصيل
                                </div>
                            </div>
                        </div>

                        {/* Service & Trust Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {[
                                { icon: <Truck size={22} />, title: 'التوصيل', desc: 'توصيل الى جميع المحافظات الجنوبية', bg: 'rgba(212,175,55,0.08)' },
                                { icon: <ShieldCheck size={22} />, title: 'ضمان أصالة 100%', desc: 'جميع منتجاتنا أصلية ومضمونة', bg: 'rgba(59,130,246,0.08)' },
                                { icon: <RotateCcw size={22} />, title: 'استرجاع مرن', desc: 'خلال 7 أيام من تاريخ الاستلام', bg: 'rgba(16,185,129,0.08)' },
                            ].map((item, idx) => (
                                <motion.div key={idx} whileHover={{ scale: 1.02 }} style={{ background: item.bg, padding: '15px 20px', borderRadius: '18px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                                    <div style={{ background: 'var(--bg-main)', padding: '10px', borderRadius: '12px', color: 'var(--primary)', border: '1px solid var(--border-color)' }}>{item.icon}</div>
                                    <div>
                                        <h4 style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: '800', marginBottom: '4px' }}>{item.title}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>{item.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Action Area */}
                    <div style={{ marginTop: 'auto', paddingTop: '30px', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowModal(true)} className="btn-primary" 
                                style={{ flex: 1, justifyContent: 'center', padding: '20px', fontSize: '1.3rem', borderRadius: '54px', fontWeight: '900', boxShadow: '0 15px 30px rgba(212,175,55,0.2)' }}>
                                <ShoppingCart size={26} /> اضف إلى السلة
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.1, background: 'var(--border-color)' }} onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                style={{ width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '22px', border: `1.5px solid ${copied ? '#10B981' : 'var(--border-color)'}`, color: copied ? '#10B981' : 'var(--text-main)', background: copied ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)', cursor: 'pointer', transition: '0.3s' }}>
                                {copied ? <Check size={30} /> : <Share2 size={30} />}
                            </motion.button>
                        </div>
                        <ProductOptionsModal isOpen={showModal} onClose={() => setShowModal(false)} product={product} onConfirm={(options) => addToCart(product, options)} />
                    </div>
                </div>
            </motion.div>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
                <div style={{ marginTop: '120px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '2.8rem', color: 'var(--text-main)', fontWeight: '900', letterSpacing: '-1px' }}>
                             قطع <span style={{ color: 'var(--primary)' }}>قد تعجبك</span> أيضاً
                        </h2>
                        <div style={{ height: '3px', background: 'var(--primary)', width: '100px', borderRadius: '50px' }} />
                    </div>
                    <div className="product-grid">
                        {relatedProducts.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </div>
            )}
            
            <style>{`
                @media (max-width: 1024px) {
                    .glass-panel { grid-template-columns: 1fr !important; gap: 40px !important; }
                    .glass-panel > div:nth-child(2) > div:nth-child(3) { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};

export default ProductDetails;
