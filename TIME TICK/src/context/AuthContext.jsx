import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/client';
import emailjs from '@emailjs/browser';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [pendingUserData, setPendingUserData] = useState(null);
    const [hashedOtp, setHashedOtp] = useState(null);

    // Secure hashing helper
    const hashString = async (string) => {
        const utf8 = new TextEncoder().encode(string + 'TIME_TICK_SALT_2024'); // Salted
        const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Initial check for pending registration on load
    useEffect(() => {
        const pending = localStorage.getItem('time-tick-pending-reg');
        if (pending) {
            const data = JSON.parse(pending);
            setPendingUserData(data.userData);
            setHashedOtp(data.hashedOtp);
            setIsVerifyingOtp(true);
            setIsAuthModalOpen(true);
        }
    }, []);

    useEffect(() => {
        // Check for local storage user first (for legacy/manual login support)
        const savedUser = localStorage.getItem('time-tick-user');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            // Migration: photoURL -> image
            if (parsedUser.photoURL && !parsedUser.image) {
                parsedUser.image = parsedUser.photoURL;
                delete parsedUser.photoURL;
                localStorage.setItem('time-tick-user', JSON.stringify(parsedUser));
            }
            setCurrentUser(parsedUser);
        }

        // Listen for Supabase Auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') && session?.user) {
                // If running in a popup (Google Login), close it after login
                if (window.opener) {
                    window.close();
                }

                // Map Supabase user to our app user format
                const user = {
                    uid: session.user.id,
                    name: session.user.user_metadata.full_name || session.user.user_metadata.name || session.user.email.split('@')[0],
                    email: session.user.email,
                    image: session.user.user_metadata.avatar_url || session.user.user_metadata.image || '',
                    createdAt: session.user.created_at,
                    provider: session.user.app_metadata?.provider || 'email',
                    // Fields from manual registration or profile completion
                    whatsapp: session.user.user_metadata.whatsapp || '',
                    governorate: session.user.user_metadata.governorate || '',
                    district: session.user.user_metadata.district || '',
                    neighborhood: session.user.user_metadata.neighborhood || ''
                };

                // Update local storage and state
                localStorage.setItem('time-tick-user', JSON.stringify(user));
                setCurrentUser(user);

                // Check if profile completion is needed
                if (!user.whatsapp || !user.governorate) {
                    setIsAuthModalOpen(true);
                } else {
                    setIsAuthModalOpen(false);
                }
            } else if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                localStorage.removeItem('time-tick-user');
            }
            setLoading(false);
        });

        // FORCE LOGOUT LISTENER: Listen for profile deletion
        const channel = supabase
            .channel('public:profiles')
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'profiles' },
                (payload) => {
                    const deletedUserId = payload.old.id;
                    const savedUser = localStorage.getItem('time-tick-user');
                    const parsedUser = savedUser ? JSON.parse(savedUser) : null;

                    if (parsedUser && parsedUser.uid === deletedUserId) {
                        // User match found, trigger logout
                        alert('تم حذف حسابك بواسطة الإدارة.');
                        supabase.auth.signOut().then(() => {
                            setCurrentUser(null);
                            localStorage.removeItem('time-tick-user');
                            window.location.href = '/';
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, []);

    const login = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return true;
    };

    const loginWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                skipBrowserRedirect: true,
            }
        });

        if (error) throw error;

        if (data?.url) {
            // Calculate popup position to center it
            const width = 500;
            const height = 600;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            window.open(
                data.url,
                'Google Login',
                `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
            );
        }
    };

    const checkEmailExists = async (email) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('email')
                .eq('email', email)
                .maybeSingle();

            if (error) {
                console.error("Error checking email existence:", error);
                return false; // Assume not exists on error to avoid blocking, or handle as needed
            }

            return !!data;
        } catch (err) {
            console.error("Unexpected error checking email:", err);
            return false;
        }
    };

    const register = async (userData) => {
        // STEP 0: Check if email already exists
        const exists = await checkEmailExists(userData.email);
        if (exists) {
            throw new Error("هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.");
        }

        // STEP 1: Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // STEP 2: Hash it for security
        const hashed = await hashString(otp);

        // STEP 3: Send via EmailJS
        const templateParams = {
            to_name: userData.name,
            to_email: userData.email,
            otp_code: otp,
            reply_to: 'support@timetick.com'
        };

        try {
            await emailjs.send(
                'service_1vqdphn', // Placeholder: User should change this
                'template_iexfmcr', // Placeholder: User should change this
                templateParams,
                '2JIIXxpkDMqS52njE' // Placeholder: User should change this
            );
        } catch (emailError) {
            console.error("EmailJS Error:", emailError);
            throw new Error("فشل إرسال بريد التحقق. يرجى المحاولة لاحقاً.");
        }

        // STEP 4: Save state
        setPendingUserData(userData);
        setHashedOtp(hashed);
        setIsVerifyingOtp(true);

        // PERSIST: Save to localStorage to survive refreshes
        localStorage.setItem('time-tick-pending-reg', JSON.stringify({
            userData,
            hashedOtp: hashed
        }));

        return { needsConfirmation: true };
    };

    const verifyEmailOtp = async (enteredToken) => {
        if (!hashedOtp || !pendingUserData) {
            throw new Error("لا توجد بيانات تسجيل قيد التحقق");
        }

        const enteredHash = await hashString(enteredToken);

        if (enteredHash !== hashedOtp) {
            throw new Error("رمز التحقق غير صحيح");
        }

        // STEP 5: Code is correct -> ONLY NOW call Supabase
        const { data, error } = await supabase.auth.signUp({
            email: pendingUserData.email,
            password: pendingUserData.password,
            options: {
                data: {
                    full_name: pendingUserData.name,
                    whatsapp: pendingUserData.whatsapp,
                    governorate: pendingUserData.governorate,
                    district: pendingUserData.district,
                    neighborhood: pendingUserData.neighborhood
                }
            }
        });

        if (error) throw error;

        // Cleanup
        localStorage.removeItem('time-tick-pending-reg');
        setPendingUserData(null);
        setHashedOtp(null);
        setIsVerifyingOtp(false);

        return data;
    };

    const resendOtp = async () => {
        if (!pendingUserData) return;
        return register(pendingUserData);
    };

    const logout = async () => {
        await supabase.auth.signOut(); // Sign out from Supabase
        setCurrentUser(null);
        localStorage.removeItem('time-tick-user');
        setIsLogoutConfirmOpen(false);
        setIsProfileModalOpen(false);
    };

    const updateUser = async (updatedData) => {
        if (!currentUser) return;

        // Update Supabase Auth Metadata (persists across devices)
        const { error } = await supabase.auth.updateUser({
            data: updatedData
        });

        if (error) {
            console.error("Error updating Supabase user metadata:", error);
            throw error;
        }

        const updatedUser = { ...currentUser, ...updatedData };
        localStorage.setItem('time-tick-user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
    };

    const openAuthModal = () => setIsAuthModalOpen(true);
    const closeAuthModal = () => setIsAuthModalOpen(false);
    const openLogoutConfirm = () => setIsLogoutConfirmOpen(true);
    const closeLogoutConfirm = () => setIsLogoutConfirmOpen(false);
    const openProfileModal = () => setIsProfileModalOpen(true);
    const closeProfileModal = () => setIsProfileModalOpen(false);

    return (
        <AuthContext.Provider value={{
            currentUser,
            loading,
            isAuthModalOpen,
            isLogoutConfirmOpen,
            isProfileModalOpen,
            isVerifyingOtp,
            pendingUserData,
            register,
            verifyEmailOtp,
            resendOtp,
            login,
            loginWithGoogle,
            logout,
            updateUser,
            openAuthModal,
            closeAuthModal,
            openLogoutConfirm,
            closeLogoutConfirm,
            openProfileModal,
            closeProfileModal
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
