import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export default function PullToRefresh({ onRefresh, children }) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const startY = useRef(0);
    const isPulling = useRef(false);
    
    // Check if we are on native mobile platform
    const isNative = Capacitor.isNativePlatform();

    const THRESHOLD = 70; // Trigger refresh at this distance
    const MAX_PULL = 120; // Max visual pull distance

    const handleTouchStart = (e) => {
        if (!isNative) return;
        
        // Only allow pulling if at the very top of the page
        if (window.scrollY === 0) {
            startY.current = e.touches[0].pageY;
            isPulling.current = true;
        } else {
            isPulling.current = false;
        }
    };
    const handleTouchMove = (e) => {
        if (!isNative || !isPulling.current || isRefreshing) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        // Apply a resistance curve for a natural feel
        const distance = Math.max(0, Math.min(diff * 0.4, MAX_PULL));
        
        // If we have any pull distance, we MUST lock the scroll
        if (distance > 0 || pullDistance > 0) {
            setPullDistance(distance);
            
            // Crucial: Prevent default scrolling behavior to stop the page from moving
            if (e.cancelable) {
                e.preventDefault();
            }
        }
    };

    const handleTouchEnd = async () => {
        if (!isNative || !isPulling.current || isRefreshing) return;

        if (pullDistance >= THRESHOLD) {
            setIsRefreshing(true);
            setPullDistance(THRESHOLD); // Keep it at threshold while refreshing
            
            try {
                if (onRefresh) {
                    await onRefresh();
                } else {
                    // Default fallback
                    window.location.reload();
                }
            } catch (error) {
                console.error("Refresh failed:", error);
            } finally {
                // Smoothly close after a short delay to show completion
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }, 500);
            }
        } else {
            // Snap back if not triggered
            setPullDistance(0);
        }
        isPulling.current = false;
    };

    // If not on mobile app, just render children without any extra logic
    if (!isNative) {
        return <>{children}</>;
    }

    return (
        <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ 
                position: 'relative', 
                minHeight: '100vh',
                // Ensure the touch container doesn't block normal interactions
                touchAction: pullDistance > 0 ? 'none' : 'auto' 
            }}
        >
            {/* Pull Indicator Layer */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '0',
                display: 'flex',
                justifyContent: 'center',
                zIndex: 99999, // Highest possible priority
                pointerEvents: 'none' // Don't block clicks below
            }}>
                <motion.div
                    style={{
                        width: '45px',
                        height: '45px',
                        borderRadius: '50%',
                        background: 'rgba(20, 20, 20, 0.9)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        marginTop: '20px',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    }}
                    animate={{ 
                        y: pullDistance,
                        opacity: pullDistance > 10 ? 1 : 0,
                        scale: Math.min(1, pullDistance / THRESHOLD),
                        rotate: isRefreshing ? 360 : pullDistance * 3 
                    }}
                    transition={isRefreshing ? { 
                        rotate: { repeat: Infinity, duration: 1, ease: "linear" },
                        y: { type: 'spring', damping: 25, stiffness: 300 }
                    } : { 
                        type: 'spring', 
                        damping: 25, 
                        stiffness: 300 
                    }}
                >
                    <RefreshCcw 
                        size={22} 
                        strokeWidth={3} 
                        style={{ 
                            opacity: isRefreshing ? 1 : Math.min(1, pullDistance / THRESHOLD) 
                        }} 
                    />
                </motion.div>
            </div>

            {/* Content Layer with subtle parallax */}
            <motion.div
                style={{
                    y: isRefreshing ? THRESHOLD * 0.4 : pullDistance * 0.4
                }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
                {children}
            </motion.div>
        </div>
    );
}
