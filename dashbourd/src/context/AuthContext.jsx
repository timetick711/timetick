import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('dash_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (email) => {
        const mockUser = {
            email: email,
            uid: 'mock-user-' + Date.now(),
            role: 'admin'
        };
        localStorage.setItem('dash_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return true;
    };

    const logout = () => {
        localStorage.removeItem('dash_user');
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
