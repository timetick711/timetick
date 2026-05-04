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
    const [overscrollY, setOverscrollY] = useState(0);
    
    // Refs for gesture tracking
    const startY = useRef(0);
    const isPulling = useRef(false);
    const startedAtTop = useRef(false);
    const containerRef = useRef(null);

    // Configuration
    const THRESHOLD = 90; 
    const MAX_PULL = 180;
    const isNative = Capacitor.isNativePlatform();

    // Prevent default browser "pull-to-refresh" or "overscroll"
    useEffect(() => {
        const preventDefault = (e) => {
            // If we are at the top and pulling down, we take control
            if (window.scrollY === 0 && (isPulling.current || overscrollY > 0)) {
                if (e.cancelable) e.preventDefault();
            }
        };

        document.addEventListener('touchmove', preventDefault, { passive: false });
        return () => document.removeEventListener('touchmove', preventDefault);
    }, [overscrollY]);

    const handleTouchStart = (e) => {
        // Record starting position and state
        startY.current = e.touches[0].pageY;
        isPulling.current = false;
        startedAtTop.current = window.scrollY <= 0;
    };

    const handleTouchMove = (e) => {
        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        // 1. Initial Logic: Decide if we should take control of this gesture
        // IMPORTANT: Only allow PTR if the gesture STARTED at the top
        if (!isPulling.current && startedAtTop.current && window.scrollY <= 0 && diff > 5 && (state === PTR_STATES.IDLE || state === PTR_STATES.SUCCESS)) {
            isPulling.current = true;
        }

        // 2. Handle Spring Effect (Rubber Banding) when not pulling PTR
        if (!isPulling.current && !startedAtTop.current && window.scrollY <= 0 && diff > 0) {
            // High resistance for the spring effect
            const springValue = Math.pow(diff, 0.65) * 2.5;
            setOverscrollY(Math.min(40, springValue));
        } else {
            if (overscrollY !== 0) setOverscrollY(0);
        }

        // 3. If we have control, we handle EVERYTHING and block native behavior
        if (isPulling.current) {
            // We only care about diff >= 0 for the visual movement, but we keep control even if diff < 0
            // Apply 1:1 movement with slight resistance as it gets very deep
            let finalPull = 0;
            if (diff > 0) {
                // 1:1 movement initially, then some resistance after threshold
                if (diff < THRESHOLD) {
                    finalPull = diff;
                } else {
                    const extra = diff - THRESHOLD;
                    finalPull = THRESHOLD + (extra * 0.4); // Resistance after threshold
                }
            }
            
            const clampedPull = Math.min(MAX_PULL, finalPull);
            setPullY(clampedPull);

            // Update state based on threshold for visual feedback
            if (clampedPull >= THRESHOLD) {
                if (state !== PTR_STATES.READY) setState(PTR_STATES.READY);
            } else {
                if (state !== PTR_STATES.PULLING) setState(PTR_STATES.PULLING);
            }
            
            // Note: preventDefault is handled by the useEffect listener which checks isPulling.current
        }
    };

    const handleTouchEnd = async () => {
        setOverscrollY(0);
        if (!isPulling.current) return;
        // Keep isPulling true if we are refreshing, otherwise reset on end
        
        if (state === PTR_STATES.READY) {
            setState(PTR_STATES.REFRESHING);
            setPullY(THRESHOLD); // Snap to threshold position
            // Keep isPulling = true during refresh to block scroll? 
            // The user says "طالما الدائرة ظاهرة -> الاسكرول معزول"
            // Usually while refreshing, you can still scroll down, but the user wants isolation.

            try {
                if (onRefresh) {
                    await onRefresh();
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1500));
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
                    setTimeout(() => {
                        setState(PTR_STATES.IDLE);
                        isPulling.current = false;
                    }, 400);
                }, 800);
            }
        } else {
            // Cancel pull: animate back
            setState(PTR_STATES.RESETTING);
            setPullY(0);
            setTimeout(() => {
                setState(PTR_STATES.IDLE);
                isPulling.current = false;
            }, 400);
        }
    };

    // Derived values for animations
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
                touchAction: (pullY > 0 || overscrollY > 0) ? 'none' : 'auto',
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
                zIndex: 999999,
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
                    y: state === PTR_STATES.REFRESHING || state === PTR_STATES.SUCCESS ? 60 : (pullY * 0.4) + overscrollY,
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
