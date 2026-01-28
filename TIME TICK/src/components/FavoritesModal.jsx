import { X, ShoppingCart, Heart, Trash2 } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

export default function FavoritesModal() {
    const { favorites, isFavoritesOpen, setIsFavoritesOpen, toggleFavorite } = useFavorites();
    const { addToCart } = useCart();
    const navigate = useNavigate();

    if (!isFavoritesOpen) return null;

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
                maxWidth: '600px',
                padding: '40px',
                position: 'relative',
                animation: 'modalSlideIn 0.4s ease-out',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <button
                    onClick={() => setIsFavoritesOpen(false)}
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

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <Heart size={40} color="#ff4b4b" fill="#ff4b4b" style={{ marginBottom: '10px' }} />
                    <h2 style={{
                        fontSize: '2rem',
                        color: 'var(--text-main)',
                        fontFamily: 'var(--font-main)'
                    }}>
                        المفضلات
                    </h2>
                </div>

                <div style={{
                    overflowY: 'auto',
                    flex: 1,
                    paddingRight: '10px'
                }}>
                    {favorites.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 0',
                            color: 'var(--text-dim)'
                        }}>
                            <p>لا توجد منتجات في قائمة المفضلات حالياً</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {favorites.map(product => (
                                <div key={product.id} className="glass-panel" style={{
                                    display: 'flex',
                                    gap: '20px',
                                    padding: '15px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '15px',
                                    alignItems: 'center'
                                }}>
                                    <div
                                        onClick={() => { navigate(`/product/${product.id}`); setIsFavoritesOpen(false); }}
                                        style={{ width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                        <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <h4
                                            onClick={() => { navigate(`/product/${product.id}`); setIsFavoritesOpen(false); }}
                                            style={{ color: 'var(--text-main)', marginBottom: '5px', fontSize: '1.1rem', cursor: 'pointer' }}
                                        >
                                            {product.name}
                                        </h4>
                                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                                            {(Number(product.price) || 0).toLocaleString()} ر.س
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => addToCart(product)}
                                            style={{
                                                background: 'var(--primary)',
                                                border: 'none',
                                                borderRadius: '10px',
                                                padding: '8px',
                                                cursor: 'pointer',
                                                color: '#000'
                                            }}
                                            title="إضافة للسلة"
                                        >
                                            <ShoppingCart size={18} />
                                        </button>
                                        <button
                                            onClick={() => toggleFavorite(product)}
                                            style={{
                                                background: 'rgba(255, 75, 75, 0.1)',
                                                border: 'none',
                                                borderRadius: '10px',
                                                padding: '8px',
                                                cursor: 'pointer',
                                                color: '#ff4b4b'
                                            }}
                                            title="حذف من المفضلات"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes modalSlideIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
