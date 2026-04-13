import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
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
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';

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

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
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

function App() {
  useEffect(() => {
    // Force Immersive Full Screen on Mobile
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(err => console.log('StatusBar error:', err));
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
                    <BackButtonHandler />
                    <SEOHelper />
                    <div className="app-container">
                      <Navbar />
                      <CartSidebar />
                      <AuthModal />
                      <LogoutConfirmModal />
                      <ProfileModal />
                      <FavoritesModal />
                      <AnimatedRoutes />
                      <Footer />
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
