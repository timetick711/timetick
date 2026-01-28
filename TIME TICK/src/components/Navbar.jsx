import { ShoppingBag, Sun, Moon, User, LogOut, Heart, Menu, X, Home, Watch } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import logo from '../assets/logo.png';

export default function Navbar() {
    const { cart, openCart } = useCart();
    const { theme, toggleTheme } = useTheme();
    const { currentUser, openLogoutConfirm, openAuthModal, openProfileModal } = useAuth();
    const { favorites, setIsFavoritesOpen } = useFavorites();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    const itemCount = cart.reduce((acc, item) => acc + item.dp_qty, 0);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth >= 1024) {
                setIsMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogoClick = () => {
        navigate('/');
        window.scrollTo(0, 0);
        setIsMenuOpen(false);
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const NavIcon = ({ icon: Icon, onClick, badge, color = "var(--text-main)" }) => (
        <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={onClick}>
            <Icon color={color} size={24} />
            {badge > 0 && (
                <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: 'var(--primary)',
                    color: 'black',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold'
                }}>
                    {badge}
                </span>
            )}
        </div>
    );

    // Sidebar Content
    const SidebarContent = () => (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent:'space-between',
            height: '100%',
            padding: '40px 25px',
            color: 'var(--text-main)',
            background: 'var(--bg-main)' // Ensure background adapts to theme
        }}>
            {/* Header: User Profile */}
            <div style={{ marginBottom: '50px', display: 'flex', alignItems: 'center', gap: '15px',cursor:'pointer',borderBottom:'1px solid var(--border-color)', paddingBottom:'15px' }}>
                {currentUser ? (
                    <>
                        <img
                            src={currentUser.image || `https://ui-avatars.com/api/?name=${currentUser.name}&background=d4af37&color=000`}
                            alt={currentUser.name}
                            style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover' }}
                            onClick={() => { openProfileModal(); setIsMenuOpen(false); }}
                        />
                        <div onClick={() => { openProfileModal(); setIsMenuOpen(false); }}>
                            <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)' }}>{currentUser.name}</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>عضو مميز</span>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => { openAuthModal(); setIsMenuOpen(false); }}>
                        <div style={{
                            width: '50px', height: '50px', borderRadius: '50%', background: 'var(--bg-card)', // Adaptive background
                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)'
                        }}>
                            <User size={24} color="var(--primary)" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)' }}>زائر</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>سجل دخولك الآن</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom: Service Icons */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-color)'
            }}>
                <div className="action-icon" onClick={() => { setIsFavoritesOpen(true); setIsMenuOpen(false); }}>
                    <Heart size={24} color={favorites.length > 0 ? "#ff4b4b" : "var(--text-main)"} />
                    <span>المفضلة</span>
                </div>

                <div className="action-icon" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
                    <span>{theme === 'dark' ? 'نهاري' : 'ليلي'}</span>
                </div>

                {currentUser && (
                    <div className="action-icon" onClick={() => { openLogoutConfirm(); setIsMenuOpen(false); }}>
                        <LogOut size={24} color="#ff4b4b" />
                        <span>خروج</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <nav className="glass-panel" style={{
                position: 'fixed',
                top: '10px',
                zIndex: 100,
                width: '100%',
                padding: '15px 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                {/* Left Side: Menu (Mobile) or Logo (Desktop) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Hamburger Menu for Mobile/Tablet */}
                    {isMobile ? (
                        <div onClick={toggleMenu} style={{ cursor: 'pointer', zIndex: 102 }}>
                            <Menu size={28} color="var(--text-main)" />
                        </div>
                    ) : (
                        // Desktop Logo (Left Side)
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={handleLogoClick}>
                            <img src={logo} alt="تايم تك" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                                <span style={{ color: 'var(--primary)' }}>تايم</span> <span style={{ color: 'var(--text-main)' }}>تك</span>
                            </h1>
                        </div>
                    )}
                </div>

                {/* Center Logo for Mobile/Tablet ONLY */}
                {isMobile && (
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                    }} onClick={handleLogoClick}>
                        <img src={logo} alt="تايم تك" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} />
                        <h1 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0 }}>
                            <span style={{ color: 'var(--primary)' }}>تايم</span> <span style={{ color: 'var(--text-main)' }}>تك</span>
                        </h1>
                    </div>
                )}

                {/* Right Side: Icons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '25px',}}>

                    {/* Desktop Icons */}
                    {!isMobile && (
                        <>
                            <NavIcon icon={Heart} onClick={() => setIsFavoritesOpen(true)} badge={favorites.length} />

                            {/* Desktop Theme Toggle */}
                            <div style={{display:'flex',cursor: 'pointer',alignItems: 'center'}} onClick={toggleTheme}>
                                {theme === 'dark' ? <Sun size={24} color="var(--text-main)" /> : <Moon size={24} color="var(--text-main)" />}
                            </div>

                            {currentUser ? (
                                <>
                                    <div className="user-pill" onClick={openProfileModal} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 12px',
                                        background: 'rgba(255,255,255,0.05)', borderRadius: '20px', cursor: 'pointer', border: '1px solid var(--border-color)'
                                    }}>
                                        <img src={currentUser.image || logo} alt="user" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                                        <span style={{ fontSize: '0.9rem' }}>{currentUser.name}</span>
                                    </div>
                                    <NavIcon icon={LogOut} onClick={openLogoutConfirm} color="#ff4b4b" />
                                </>
                            ) : (
                                <button onClick={openAuthModal} className="btn-primary" style={{ padding: '6px 18px' }}>تسجيل الدخول </button>
                            )}
                        </>
                    )}

                    {/* Cart Icon (Always Visible) */}
                    <NavIcon icon={ShoppingBag} onClick={openCart} badge={itemCount} />
                </div>
            </nav>

            {/* Sidebar Overlay */}
            <div className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}>
                {/* Logo in overlay for Tablet view as requested */}
                <div className="overlay-logo">
                    <img src={logo} alt="Time Tick" style={{ width: '80px', height: '80px', marginBottom: '10px' }} />
                    <h2 style={{ color: 'var(--primary)', margin: 0 }}>تايم تك</h2>
                </div>
            </div>

            {/* Sidebar Drawer */}
            <div className={`sidebar-drawer ${isMenuOpen ? 'open' : ''}`}>
                <SidebarContent />
            </div>
        </>
    )
}
