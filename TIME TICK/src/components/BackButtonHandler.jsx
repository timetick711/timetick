import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';

const BackButtonHandler = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const { 
        isMenuOpen, setIsMenuOpen, 
        isAuthModalOpen, closeAuthModal,
        isLogoutConfirmOpen, closeLogoutConfirm,
        isProfileModalOpen, closeProfileModal
    } = useAuth();
    
    const { isCartOpen, closeCart } = useCart();
    const { isFavoritesOpen, setIsFavoritesOpen } = useFavorites();

    useEffect(() => {
        const handleBackButton = async () => {
            // 1. Check for open UI layers in order of priority
            if (isCartOpen) {
                closeCart();
            } else if (isMenuOpen) {
                setIsMenuOpen(false);
            } else if (isFavoritesOpen) {
                setIsFavoritesOpen(false);
            } else if (isAuthModalOpen) {
                closeAuthModal();
            } else if (isProfileModalOpen) {
                closeProfileModal();
            } else if (isLogoutConfirmOpen) {
                closeLogoutConfirm();
            } else {
                // 2. Handle Page Navigation
                if (location.pathname === '/') {
                    // We are at home, exit the app
                    await App.exitApp();
                } else {
                    // Navigate back within React Router
                    navigate(-1);
                }
            }
        };

        const listener = App.addListener('backButton', (data) => {
            // data.canGoBack is true if the native stack has items, but 
            // since we use a SPA, we handle the logic ourselves.
            handleBackButton();
        });

        return () => {
            listener.remove();
        };
    }, [
        location, navigate, 
        isCartOpen, closeCart,
        isMenuOpen, setIsMenuOpen,
        isFavoritesOpen, setIsFavoritesOpen,
        isAuthModalOpen, closeAuthModal,
        isProfileModalOpen, closeProfileModal,
        isLogoutConfirmOpen, closeLogoutConfirm
    ]);

    return null; // This component doesn't render anything
};

export default BackButtonHandler;
