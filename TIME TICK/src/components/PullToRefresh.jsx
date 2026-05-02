import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RefreshCcw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef(null);
    const startY = useRef(0);
    const controls = useAnimation();

    const THRESHOLD = 80; // Distance to trigger refresh
    const MAX_PULL = 150;

    const handleTouchStart = (e) => {
        if (window.scrollY === 0) {
            startY.current = e.touches[0].pageY;
        } else {
            startY.current = -1; // Not at top
        }
    };

    const handleTouchMove = (e) => {
        if (startY.current === -1 || isRefreshing) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            // Pulling down
            const distance = Math.min(diff * 0.5, MAX_PULL); // Resistance factor
            setPullDistance(distance);
            
            // Prevent default browser scroll if pulling down at top
            if (e.cancelable) e.preventDefault();
        }
    };

    const handleTouchEnd = async () => {
        if (startY.current === -1 || isRefreshing) return;

        if (pullDistance >= THRESHOLD) {
            setIsRefreshing(true);
            setPullDistance(THRESHOLD);
            
            // Spin animation
            await controls.start({ rotate: 360, transition: { repeat: Infinity, duration: 1, ease: "linear" } });
            
            if (onRefresh) {
                await onRefresh();
            } else {
                // Default action: reload page
                window.location.reload();
            }
            
            setIsRefreshing(false);
            setPullDistance(0);
        } else {
            setPullDistance(0);
        }
        startY.current = -1;
    };

    return (
        <div 
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}
        >
            {/* Pull Indicator */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: -40,
                    left: '50%',
                    x: '-50%',
                    y: pullDistance,
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 3000,
                    opacity: pullDistance > 10 ? 1 : 0
                }}
                animate={{ 
                    rotate: isRefreshing ? 360 : pullDistance * 2 
                }}
                transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { type: 'spring', damping: 20 }}
            >
                <RefreshCcw size={20} strokeWidth={3} />
            </motion.div>

            {/* Main Content */}
            <motion.div
                animate={{ y: pullDistance > 0 ? pullDistance * 0.3 : 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
                {children}
            </motion.div>
        </div>
    );
}
