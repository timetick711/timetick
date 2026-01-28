import { Phone, Mail, MapPin, Instagram, Facebook, Twitter, ShieldCheck, Truck, Clock } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Footer() {
    return (
        <footer style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid var(--glass-border)',
            padding: '60px 20px 20px',
            marginTop: '80px',
            color: 'var(--text-main)',
            fontFamily: 'var(--font-main)',
            direction: 'rtl'
        }}>
            <div className="container" style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '40px',
                marginBottom: '40px'
            }}>
                {/* Brand Section */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                        <img src={logo} alt="Time Tick" style={{ width: '50px', height: '50px', borderRadius: '50%' }} />
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                            <span style={{ color: 'var(--primary)' }}>تايم</span> تك
                        </h2>
                    </div>
                    <p style={{ color: 'var(--text-dim)', lineHeight: '1.8', fontSize: '1rem' }}>
                        نحن في تايم تك نؤمن أن الساعة ليست مجرد أداة لمعرفة الوقت، بل هي قطعة فنية تعبر عن شخصيتك وفخامتك. نوفر لك أرقى الساعات العالمية بأفضل الأسعار.
                    </p>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                        <a target='_blank'
                            href="https://www.instagram.com/timetick7?utm_source=qr&igsh=NW42djFucDJxOGVn"
                            className="social-icon"
                            title="Instagram"
                        >
                            <Instagram size={22} />
                        </a>
                        <a target='_blank'
                            href="https://www.facebook.com/timetick7?mibextid=ZbWKwL"
                            className="social-icon"
                            title="Facebook"
                        >
                            <Facebook size={22} />
                        </a>
                    </div>
                </div>

                {/* Quick Links */}
                <div>
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '25px', position: 'relative', paddingBottom: '10px' }}>
                        روابط سريعة
                        <span style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '2px', background: 'var(--primary)' }}></span>
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li><a href="#" style={{ color: 'var(--text-dim)', textDecoration: 'none', transition: '0.3s' }}>الرئيسية</a></li>
                        <li><a href="#products" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>تسوق الساعات</a></li>
                    </ul>
                </div>

                {/* Contact Info */}
                <div>
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '25px', position: 'relative', paddingBottom: '10px' }}>
                        تواصل معنا
                        <span style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '2px', background: 'var(--primary)' }}></span>
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-dim)' }}>
                            <Phone size={20} color="var(--primary)" />
                            <span dir="ltr">+967 770 822 310</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-dim)' }}>
                            <Mail size={20} color="var(--primary)" />
                            <span>timetick711@gmail.com</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-dim)' }}>
                            <MapPin size={20} color="var(--primary)" />
                            <span>اليمن \ حضرموت \ المكلا</span>
                        </li>
                    </ul>
                </div>

                {/* Trust Section */}
                <div>
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '25px', position: 'relative', paddingBottom: '10px' }}>
                        لماذا تايم تك؟
                        <span style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '2px', background: 'var(--primary)' }}></span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                            <ShieldCheck size={18} color="var(--primary)" />
                            <span>ضمان ذهبي حقيقي</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                            <Truck size={18} color="var(--primary)" />
                            <span>توصيل سريع لكافة المحافظات</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                            <Clock size={18} color="var(--primary)" />
                            <span>دعم فني على مدار الساعة</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div style={{
                borderTop: '1px solid var(--glass-border)',
                paddingTop: '20px',
                textAlign: 'center',
                color: 'var(--text-dim)',
                fontSize: '0.9rem'
            }}>
                <p>© 2026 متجر تايم تك - جميع الحقوق محفوظة لـ متجر تايم تك</p>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.8rem' }}>
                </div>
            </div>

            <style>{`
                footer a:not(.social-icon):hover {
                    color: var(--primary) !important;
                    transform: translateX(-5px);
                }
                .social-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--glass-border);
                    color: var(--primary);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    text-decoration: none;
                }
                .social-icon:hover {
                    background: var(--primary);
                    color: black !important;
                    transform: translateY(-8px) rotate(360deg) scale(1.1);
                    box-shadow: 0 10px 20px rgba(212, 175, 55, 0.4);
                    border-color: var(--primary);
                }
                @media (max-width: 768px) {
                    footer { padding: 40px 20px 20px; }
                    .container { gap: 30px; }
                }
            `}</style>
        </footer>
    );
}
