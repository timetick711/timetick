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
    const hasScrolledDown = useRef(false);
    const containerRef = useRef(null);
    const timeoutRefs = useRef([]);
    const activeTouchId = useRef(null);

    // Helper to clear all pending timeouts
    const clearTimeouts = () => {
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current = [];
    };

    // Helper for forced reset
    const forceReset = () => {
        clearTimeouts();
        isPulling.current = false;
        setPullY(0);
        setOverscrollY(0);
        setState(PTR_STATES.IDLE);
    };

    // Configuration
    const THRESHOLD = 90; 
    const MAX_PULL = 180;
    const isNative = Capacitor.isNativePlatform();

    // Prevent default browser "pull-to-refresh" or "overscroll"
    useEffect(() => {
        const preventDefault = (e) => {
            // If we are actively in a PTR gesture, we MUST take full control and block native scroll
            // This prevents the "jumping" behavior where the page scrolls while we pull
            if (isPulling.current || state === PTR_STATES.REFRESHING || state === PTR_STATES.READY || overscrollY > 0) {
                if (e.cancelable) e.preventDefault();
            }
        };

        document.addEventListener('touchmove', preventDefault, { passive: false });
        return () => document.removeEventListener('touchmove', preventDefault);
    }, [overscrollY, state]);

    // Added: Lock body scroll when PTR is active for a premium feel
    useEffect(() => {
        const isActive = isPulling.current || state === PTR_STATES.REFRESHING || state === PTR_STATES.READY;
        const isModalOpen = document.body.classList.contains('no-scroll');

        if (isActive) {
            // Only apply if not already locked by a modal
            if (!isModalOpen) {
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
            }
        } else {
            // IMPORTANT: Only clear styles if they weren't set by a modal (ScrollLockManager)
            if (!isModalOpen) {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
            }
        }
        return () => {
            if (!document.body.classList.contains('no-scroll')) {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
            }
        };
    }, [state, pullY]);
    
    // Use refs to keep handlers fresh for global listeners without re-attaching
    const moveHandlerRef = useRef(handleTouchMove);
    const endHandlerRef = useRef(handleTouchEnd);

    useEffect(() => {
        moveHandlerRef.current = handleTouchMove;
        endHandlerRef.current = handleTouchEnd;
    });

    // Attach global listeners ONCE to ensure they are never missed and never interrupted
    useEffect(() => {
        if (!isNative) return;

        const onWindowMove = (e) => moveHandlerRef.current(e);
        const onWindowEnd = (e) => endHandlerRef.current(e);

        window.addEventListener('touchmove', onWindowMove, { passive: false });
        window.addEventListener('touchend', onWindowEnd);
        window.addEventListener('touchcancel', onWindowEnd);

        return () => {
            window.removeEventListener('touchmove', onWindowMove);
            window.removeEventListener('touchend', onWindowEnd);
            window.removeEventListener('touchcancel', onWindowEnd);
        };
    }, []); // Empty dependency array = listeners stay attached for the lifetime of the component

    const handleTouchStart = (e) => {
        // Multi-touch safety: If already tracking a finger, ignore new touches
        if (activeTouchId.current !== null) return;

        // Safety: If we are in a stuck state or resetting, and a new touch starts, clear everything
        if (pullY > 0 || state === PTR_STATES.RESETTING || state === PTR_STATES.SUCCESS) {
            forceReset();
        }

        const touch = e.touches[0];
        activeTouchId.current = touch.identifier;
        startY.current = touch.clientY;
        isPulling.current = false;
        hasScrolledDown.current = false;
        
        // Check if we are at the top of the window
        let atTop = window.scrollY <= 0;
        if (atTop) {
            let node = e.target;
            while (node && node !== containerRef.current && node !== document.body) {
                if (node.scrollTop > 0) {
                    atTop = false;
                    break;
                }
                node = node.parentNode;
            }
        }
        startedAtTop.current = atTop;
    };

    const handleTouchMove = (e) => {
        if (activeTouchId.current === null) return;

        // Find the touch we are tracking
        const touch = Array.from(e.touches).find(t => t.identifier === activeTouchId.current);
        if (!touch) return;

        const currentY = touch.clientY;
        const diff = currentY - startY.current;

        // 1. Initial Logic: Decide if we should take control of this gesture
        if (diff < -10) hasScrolledDown.current = true;

        if (!isPulling.current && startedAtTop.current && !hasScrolledDown.current && window.scrollY <= 0 && diff > 5 && (state === PTR_STATES.IDLE || state === PTR_STATES.SUCCESS)) {
            isPulling.current = true;
        }

        // 2. Handle Spring Effect (Rubber Banding)
        if (!isPulling.current && startedAtTop.current && window.scrollY <= 0 && diff > 0) {
            const springValue = Math.pow(diff, 0.65) * 2.5;
            setOverscrollY(Math.min(40, springValue));
        } else if (overscrollY !== 0) {
            setOverscrollY(0);
        }

        // 3. If we have control, we handle EVERYTHING
        if (isPulling.current) {
            // Block native scroll while pulling
            if (e.cancelable) e.preventDefault();

            if (diff <= 0) {
                isPulling.current = false;
                setPullY(0);
                setState(PTR_STATES.IDLE);
                activeTouchId.current = null;
                return;
            }

            let finalPull = 0;
            if (diff > 0) {
                if (diff < THRESHOLD) {
                    finalPull = diff;
                } else {
                    const extra = diff - THRESHOLD;
                    finalPull = THRESHOLD + (extra * 0.4);
                }
            }
            
            const clampedPull = Math.min(MAX_PULL, finalPull);
            setPullY(clampedPull);

            if (clampedPull >= THRESHOLD) {
                if (state !== PTR_STATES.READY) setState(PTR_STATES.READY);
            } else {
                if (state !== PTR_STATES.PULLING) setState(PTR_STATES.PULLING);
            }
        }
    };

    const handleTouchEnd = async (e) => {
        if (activeTouchId.current === null) return;

        // Check if the tracked finger is gone
        const trackedFingerGone = !Array.from(e.touches).some(t => t.identifier === activeTouchId.current);
        if (!trackedFingerGone && e.type !== 'touchcancel') return;

        // Prepare to reset/trigger
        const wasPulling = isPulling.current;
        const currentState = state;
        const currentPullY = pullY;

        // Clear tracking immediately to avoid race conditions
        activeTouchId.current = null;
        isPulling.current = false;
        setOverscrollY(0);
        
        if (e.type === 'touchcancel' || !wasPulling) {
            if (currentPullY > 0 || currentState !== PTR_STATES.IDLE) forceReset();
            return;
        }
        
        if (currentState === PTR_STATES.READY) {
            setState(PTR_STATES.REFRESHING);
            setPullY(60);
            
            try {
                if (onRefresh) await onRefresh();
                else await new Promise(r => setTimeout(r, 1500));
                setState(PTR_STATES.SUCCESS);
            } catch (error) {
                console.error("PTR Error:", error);
                forceReset();
                return;
            } finally {
                const t1 = setTimeout(() => {
                    setState(PTR_STATES.RESETTING);
                    setPullY(0);
                    const t2 = setTimeout(() => setState(PTR_STATES.IDLE), 400);
                    timeoutRefs.current.push(t2);
                }, 800);
                timeoutRefs.current.push(t1);
            }
        } else {
            setState(PTR_STATES.RESETTING);
            setPullY(0);
            const t3 = setTimeout(() => setState(PTR_STATES.IDLE), 400);
            timeoutRefs.current.push(t3);
        }
    };

    // Attached global listeners logic moved to stable useEffect above

    // Derived values for animations
    const rotation = state === PTR_STATES.REFRESHING ? 0 : pullY * 2;

    return (
        <div 
            ref={containerRef}
            onTouchStart={isNative ? handleTouchStart : undefined}
            className={`ptr-wrapper state-${state}`}
            style={{ 
                position: 'relative', 
                minHeight: '100vh',
                // Important: prevent scrolling while pulling
                touchAction: (pullY > 0 || overscrollY > 0) ? 'none' : 'auto',
                overflow: (pullY > 0 || overscrollY > 0) ? 'hidden' : 'visible'
            }}
        >
            {/* 1. Pull Indicator (The Spinner/Icon) */}
            {isNative && (
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
            )}

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
