import React, { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { RefreshCw, ArrowDown, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

/**
 * Custom Pull-to-Refresh Component for Mobile Apps
 * Optimized for Premium Native Feel (Android/iOS)
 */

const PTR_STATES = {
    IDLE: 'idle',           // Resting state
    PULLING: 'pulling',     // Finger down, moving
    READY: 'ready',         // Past threshold, ready to trigger
    REFRESHING: 'refreshing', // Doing work
    SUCCESS: 'success',     // Work done
    RESETTING: 'resetting'  // Animating back
};

export default function PullToRefresh({ onRefresh, children }) {
    const [state, setState] = useState(PTR_STATES.IDLE);
    const [pullY, setPullY] = useState(0);
    
    // Refs for gesture tracking
    const startY = useRef(0);
    const lastY = useRef(0);
    const isPulling = useRef(false);
    const containerRef = useRef(null);

    // Configuration
    const THRESHOLD = 90; 
    const MAX_PULL = 180;
    const isNative = Capacitor.isNativePlatform();

    // Prevent default browser "pull-to-refresh" or "overscroll"
    useEffect(() => {
        const preventDefault = (e) => {
            // If we are at the top and pulling down, we take control
            if (window.scrollY === 0 && isPulling.current) {
                if (e.cancelable) e.preventDefault();
            }
        };

        document.addEventListener('touchmove', preventDefault, { passive: false });
        return () => document.removeEventListener('touchmove', preventDefault);
    }, []);

    const handleTouchStart = (e) => {
        // Only allow pull if at the very top of the scroll
        if (window.scrollY <= 0 && (state === PTR_STATES.IDLE || state === PTR_STATES.SUCCESS)) {
            startY.current = e.touches[0].pageY;
            lastY.current = e.touches[0].pageY;
            isPulling.current = true;
            // No setState here to keep it snappy
        }
    };

    const handleTouchMove = (e) => {
        if (!isPulling.current || state === PTR_STATES.REFRESHING) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        // If pulling up, don't trigger PTR logic
        if (diff <= 0) {
            if (pullY !== 0) {
                setPullY(0);
                setState(PTR_STATES.IDLE);
            }
            return;
        }

        // Apply a "Resistance" formula
        // Every pixel of actual movement results in less visual movement as we pull further
        const resistance = 0.45;
        const exponentialDiff = Math.pow(diff, 0.85) * resistance * 2;
        const finalPull = Math.min(MAX_PULL, exponentialDiff);
        
        setPullY(finalPull);

        // Update state based on threshold
        if (finalPull >= THRESHOLD) {
            if (state !== PTR_STATES.READY) setState(PTR_STATES.READY);
        } else {
            if (state !== PTR_STATES.PULLING) setState(PTR_STATES.PULLING);
        }

        // Lock scroll while we have an active pull
        if (finalPull > 5) {
            isPulling.current = true;
        }
    };

    const handleTouchEnd = async () => {
        if (!isPulling.current) return;
        isPulling.current = false;

        if (state === PTR_STATES.READY) {
            setState(PTR_STATES.REFRESHING);
            setPullY(THRESHOLD); // Snap to threshold position

            try {
                if (onRefresh) {
                    await onRefresh();
                } else {
                    // Default fallback
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    window.location.reload();
                }
                
                setState(PTR_STATES.SUCCESS);
            } catch (error) {
                console.error("PTR Error:", error);
                setState(PTR_STATES.IDLE);
            } finally {
                // Success pause then reset
                setTimeout(() => {
                    setState(PTR_STATES.RESETTING);
                    setPullY(0);
                    setTimeout(() => setState(PTR_STATES.IDLE), 400);
                }, 1000);
            }
        } else {
            // Cancel pull
            setState(PTR_STATES.RESETTING);
            setPullY(0);
            setTimeout(() => setState(PTR_STATES.IDLE), 400);
        }
    };

    // Derived values for animations
    const progress = Math.min(1, pullY / THRESHOLD);
    const rotation = state === PTR_STATES.REFRESHING ? 0 : pullY * 2;

    return (
        <div 
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`ptr-wrapper state-${state}`}
            style={{ 
                position: 'relative', 
                minHeight: '100vh',
                // Important: prevent scrolling while pulling
                touchAction: pullY > 0 ? 'none' : 'auto',
                overflow: 'hidden'
            }}
        >
            {/* 1. Pull Indicator (The Spinner/Icon) */}
            <div className="ptr-indicator-layer" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                zIndex: 9999,
                pointerEvents: 'none',
                height: 0
            }}>
                <motion.div
                    className="ptr-circle"
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        background: state === PTR_STATES.READY ? 'var(--primary)' : 'rgba(20, 20, 20, 0.95)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        boxShadow: state === PTR_STATES.READY 
                            ? '0 0 25px rgba(212, 175, 55, 0.5)' 
                            : '0 10px 25px rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: state === PTR_STATES.READY ? '#000' : 'var(--primary)',
                        marginTop: 40,
                        backdropFilter: 'blur(10px)',
                    }}
                    animate={{ 
                        y: pullY, 
                        scale: state === PTR_STATES.IDLE ? 0.5 : 1,
                        opacity: pullY > 5 ? 1 : 0,
                    }}
                    transition={{
                        type: 'spring',
                        damping: 25,
                        stiffness: 300
                    }}
                >
                    {state === PTR_STATES.REFRESHING && (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                            <RefreshCw size={24} strokeWidth={2.5} />
                        </motion.div>
                    )}
                    
                    {state === PTR_STATES.SUCCESS && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <Check size={24} strokeWidth={3} />
                        </motion.div>
                    )}

                    {(state === PTR_STATES.PULLING || state === PTR_STATES.READY) && (
                        <motion.div
                            style={{ rotate: rotation }}
                            animate={{ 
                                scale: state === PTR_STATES.READY ? 1.2 : 1,
                                rotate: state === PTR_STATES.READY ? 180 : rotation
                            }}
                        >
                            <ArrowDown size={24} strokeWidth={2.5} />
                        </motion.div>
                    )}
                </motion.div>
                
                {/* Visual Feedback Text (Optional but premium) */}
                <motion.span
                    style={{
                        position: 'absolute',
                        top: 100,
                        color: 'var(--primary)',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}
                    animate={{ 
                        y: pullY,
                        opacity: pullY > THRESHOLD * 0.7 ? 1 : 0,
                        scale: state === PTR_STATES.READY ? 1.1 : 1
                    }}
                >
                    {state === PTR_STATES.READY ? 'اترك للتحديث' : state === PTR_STATES.REFRESHING ? 'جاري التحديث...' : state === PTR_STATES.SUCCESS ? 'تم بنجاح' : 'اسحب للتحديث'}
                </motion.span>
            </div>

            {/* 2. Content Layer (The actual app) */}
            <motion.div
                className="ptr-content-layer"
                animate={{ 
                    y: state === PTR_STATES.REFRESHING || state === PTR_STATES.SUCCESS ? 60 : pullY * 0.4,
                    filter: (state === PTR_STATES.REFRESHING || state === PTR_STATES.READY) ? 'grayscale(0.2)' : 'grayscale(0)'
                }}
                transition={{ 
                    type: 'spring', 
                    damping: 30, 
                    stiffness: 200 
                }}
            >
                {children}
            </motion.div>

            <style>{`
                .ptr-wrapper {
                    -webkit-overflow-scrolling: touch;
                }
                /* Ensure children don't capture events we need if they have overflow */
                .ptr-content-layer {
                    will-change: transform;
                    transform-origin: top center;
                }
            `}</style>
        </div>
    );
}
