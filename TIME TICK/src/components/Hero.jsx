import { useState, useEffect } from 'react';
import heroImage1 from '../assets/hero-watch.png';
import heroImage2 from '../assets/hero-watch-2.png';
import heroImage3 from '../assets/hero-watch-3.png';

const slides = [
    { id: 1, image: heroImage1, title: 'كلاسيك', subtitle: 'الزمن .. بمنظور فني' },
    { id: 2, image: heroImage2, title: 'أناقة', subtitle: 'تميز بلا حدود' },
    { id: 3, image: heroImage3, title: 'عصرية', subtitle: 'تكنولوجيا المستقبل' },
];

export default function Hero() {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000); // Slower transition for background
        return () => clearInterval(timer);
    }, []);

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100vh',
            minHeight: '600px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '0px', // Pull behind flush navbar (approx height)
            paddingTop: '0px'
        }}>

            {/* Background Slideshow */}
            {slides.map((slide, index) => (
                <div key={slide.id} style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: currentSlide === index ? 1 : 0,
                    transition: 'opacity 1.5s ease-in-out',
                    zIndex: 0
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#000', // Fallback
                        backgroundImage: `url(${slide.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'brightness(0.7)' // Slight dim for text pop
                    }} />
                    {/* Gradient Overlay */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent 60%)',
                    }} />
                </div>
            ))}

            {/* Content */}
            <div className="container" style={{
                position: 'relative',
                zIndex: 10,
                textAlign: 'center',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px'
            }}>
                {slides.map((slide, index) => (
                    <div key={slide.id} style={{
                        display: currentSlide === index ? 'block' : 'none',
                        animation: 'slideUp 1s ease-out'
                    }}>
                        <h1 style={{
                            fontSize: '5rem',
                            fontWeight: '700',
                            marginBottom: '10px',
                            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                            fontFamily: 'var(--font-main)'
                        }}>
                            {slide.title}
                            <br />
                            <span style={{
                                color: 'var(--primary)',
                                fontSize: '2.5rem',
                                fontWeight: '300',
                                display: 'block',
                                marginTop: '10px'
                            }}>
                                {slide.subtitle}
                            </span>
                        </h1>
                    </div>
                ))}

                <p style={{
                    fontSize: '1.2rem',
                    color: '#e0e0e0',
                    maxWidth: '600px',
                    textShadow: '0 2px 5px rgba(0,0,0,0.8)',
                    marginBottom: '30px'
                }}>
                    مجموعة حصرية تجمع بين أصالة الماضي وتقنيات المستقبل
                </p>

                <div style={{ display: 'flex', gap: '20px' }}>
                    <button
                        className="btn-primary"
                        onClick={() => document.getElementById('products').scrollIntoView({ behavior: 'smooth' })}
                    >
                        تسوق الآن
                    </button>
                </div>

                {/* Indicators */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '50px',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '10px 20px',
                    borderRadius: '30px',
                    backdropFilter: 'blur(5px)'
                }}>
                    {slides.map((_, index) => (
                        <div
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            style={{
                                width: currentSlide === index ? '12px' : '8px',
                                height: currentSlide === index ? '12px' : '8px',
                                borderRadius: '50%',
                                background: currentSlide === index ? 'var(--primary)' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    ))}
                </div>
            </div>

            <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
