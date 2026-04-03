import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/client';
import emailjs from '@emailjs/browser';
import { useLoader } from './LoaderContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const { showLoader, hideLoader } = useLoader();
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
                // Determine if it was an OAuth login to show the loader
                const isOAuth = session.user.app_metadata?.provider === 'google';
                const isGooglePending = sessionStorage.getItem('isGoogleLoginPending') === 'true';
                if (event === 'SIGNED_IN' && isOAuth && isGooglePending) {
                     showLoader('جاري تسجيل الدخول وحفظ البيانات...');
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

                if (event === 'SIGNED_IN' && isOAuth && isGooglePending) {
                     sessionStorage.removeItem('isGoogleLoginPending');
                     // Hide loader after a short delay for smooth transition
                     setTimeout(hideLoader, 1000);
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
        sessionStorage.setItem('isGoogleLoginPending', 'true');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) throw error;
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
        showLoader('جاري تسجيل الخروج...');
        await supabase.auth.signOut(); // Sign out from Supabase
        setCurrentUser(null);
        localStorage.removeItem('time-tick-user');
        setIsLogoutConfirmOpen(false);
        setIsProfileModalOpen(false);
        setTimeout(hideLoader, 800);
    };

    const updateUser = async (updatedData) => {
        if (!currentUser) return;

        // Ensure full_name is updated because onAuthStateChange prioritizes full_name
        const payloadData = { ...updatedData };
        if (payloadData.name) {
            payloadData.full_name = payloadData.name;
        }
        
        // Ensure email isn't updated via metadata
        delete payloadData.email;

        // Update Supabase Auth Metadata (persists across devices)
        const { error } = await supabase.auth.updateUser({
            data: payloadData
        });

        if (error) {
            console.error("Error updating Supabase user metadata:", error);
            throw error;
        }

        // Also update the 'profiles' table explicitly so the dashboard can see the data
        const profileUpdateData = {};
        if (payloadData.name) profileUpdateData.full_name = payloadData.name;
        if (payloadData.image) profileUpdateData.image = payloadData.image;
        if (payloadData.whatsapp !== undefined) profileUpdateData.whatsapp = payloadData.whatsapp;
        if (payloadData.governorate !== undefined) profileUpdateData.governorate = payloadData.governorate;
        if (payloadData.district !== undefined) profileUpdateData.district = payloadData.district;
        if (payloadData.neighborhood !== undefined) profileUpdateData.neighborhood = payloadData.neighborhood;

        const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdateData)
            .eq('id', currentUser.uid);

        if (profileError) {
            console.error("Error updating profiles table:", profileError);
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
