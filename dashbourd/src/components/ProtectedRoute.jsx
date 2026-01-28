import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { setupNotifications } from '../utils/pushManager';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    useEffect(() => {
        if (user) {
            setupNotifications(user.id);
        }
    }, [user]);

    if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '20%' }}>جاري التحميل...</div>;

    if (!user) {
        return <Navigate to="/login" />;
    }

    return children;
};

export default ProtectedRoute;
