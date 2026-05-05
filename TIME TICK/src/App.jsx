import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CartProvider, useCart } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavoritesProvider, useFavorites } from './context/FavoritesContext';
import { VideoProvider } from './context/VideoContext';
import { LoaderProvider } from './context/LoaderContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import BestSellers from './components/BestSellers';
import LatestProducts from './components/LatestProducts';
import ProductList from './components/ProductList';
import ProductDetails from './pages/ProductDetails';
import Orders from './pages/Orders';
import CartSidebar from './components/CartSidebar';
import AuthModal from './components/AuthModal';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import ProfileModal from './components/ProfileModal';
import FavoritesModal from './components/FavoritesModal';
import Footer from './components/Footer';
import SEOHelper from './components/SEOHelper';
import ScrollToTop from './components/ScrollToTop';
import BackButtonHandler from './components/BackButtonHandler';
import PullToRefresh from './components/PullToRefresh';
import AppDownloadBanner from './components/AppDownloadBanner';
import { StatusBar } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useRef } from 'react';

// Home Page Component
const Home = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Hero />
    <Features />
    <BestSellers />
    <LatestProducts />
    <ProductList />
  </motion.div>
);

const RedirectToApp = () => {
  useEffect(() => {
    window.location.href = '/app/index.html';
  }, []);
  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<RedirectToApp />} />
        <Route path="/product/:id" element={
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <ProductDetails />
          </motion.div>
        } />
        <Route path="/orders" element={
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <Orders />
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  );
};

// Deep Link Handler Component
const DeepLinkHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHandlingColdStart = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleUrl = (url, isColdStart = false) => {
      if (!url) return;
      
      console.log(`Handling Deep Link (${isColdStart ? 'Cold' : 'Resume'}):`, url);
      
      let path = '';
      if (url.includes('timetick.vercel.app')) {
        path = url.split('timetick.vercel.app')[1];
      } else if (url.includes('com.timetick.store://')) {
        path = url.split('com.timetick.store://')[1];
        if (path && !path.startsWith('/')) path = '/' + path;
      }

      if (path) {
        path = path.replace(/\/+/g, '/');
        
        if (path.startsWith('/product/') || path.startsWith('/orders')) {
          // If cold start, we always navigate (with delay)
          // If resume, only navigate if path is different
          if (isColdStart || location.pathname !== path) {
            const delay = isColdStart ? 600 : 0;
            setTimeout(() => {
              console.log('Deep Link Navigating to:', path);
              navigate(path, { replace: isColdStart });
            }, delay);
          }
        }
      }
    };

    // 1. Handle Cold Start (App was closed)
    if (!isHandlingColdStart.current) {
      isHandlingColdStart.current = true;
      CapApp.getLaunchUrl().then((launchUrl) => {
        if (launchUrl?.url) {
          handleUrl(launchUrl.url, true);
        }
      });
    }

    // 2. Handle Resume (App was in background)
    const urlListener = CapApp.addListener('appUrlOpen', (event) => {
      handleUrl(event.url, false);
    });

    return () => {
      urlListener.remove();
    };
  }, [navigate, location.pathname]);

  return null;
};

// Global Scroll Lock Manager
const ScrollLockManager = () => {
  const { isAuthModalOpen, isLogoutConfirmOpen, isProfileModalOpen, isMenuOpen } = useAuth();
  const { isCartOpen, isOptionsModalOpen } = useCart();
  const { isFavoritesOpen } = useFavorites();

  useEffect(() => {
    const isAnyOpen = isAuthModalOpen || isLogoutConfirmOpen || isProfileModalOpen || isMenuOpen || isCartOpen || isOptionsModalOpen || isFavoritesOpen;
    
    if (isAnyOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.classList.add('no-scroll');
      document.body.dataset.scrollY = scrollY.toString();
    } else {
      // Restore scroll position
      const scrollY = document.body.dataset.scrollY;
      
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.classList.remove('no-scroll');
      
      if (scrollY) {
        // Disable smooth scroll temporarily for instant restoration
        const originalScrollBehavior = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        
        window.scrollTo(0, parseInt(scrollY));
        
        // Restore original scroll behavior
        document.documentElement.style.scrollBehavior = originalScrollBehavior;
        delete document.body.dataset.scrollY;
      }
    }
    
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.classList.remove('no-scroll');
    };
  }, [isAuthModalOpen, isLogoutConfirmOpen, isProfileModalOpen, isMenuOpen, isCartOpen, isOptionsModalOpen, isFavoritesOpen]);

  return null;
};

function App() {
  useEffect(() => {
    // Force Immersive Full Screen on Mobile
    if (Capacitor.isNativePlatform()) {
      // Make status bar transparent and overlay content
      StatusBar.setOverlaysWebView({ overlay: true });
      StatusBar.setBackgroundColor({ color: '#00000000' });
      StatusBar.setStyle({ style: 'LIGHT' }); // Light icons for dark theme
    }
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <ThemeProvider>
        <LoaderProvider>
          <AuthProvider>
              <FavoritesProvider>
                <VideoProvider>
                  <CartProvider>
                    <DeepLinkHandler />
                    <BackButtonHandler />
                    <ScrollLockManager />
                    <SEOHelper />
                    <div className="app-container">
                      <Navbar />
                      <CartSidebar />
                      <AuthModal />
                      <LogoutConfirmModal />
                      <ProfileModal />
                      <FavoritesModal />
                      <PullToRefresh onRefresh={async () => {
                          // Force a real reload for the whole app
                          window.location.reload();
                      }}>
                        <AnimatedRoutes />
                      </PullToRefresh>
                      <Footer />
                      <AppDownloadBanner />
                    </div>
                  </CartProvider>
                </VideoProvider>
              </FavoritesProvider>
          </AuthProvider>
        </LoaderProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
