import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Axios defaults
axios.defaults.baseURL = API_BASE;

axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('felicity_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('felicity_token');
        const stored = localStorage.getItem('felicity_user');
        if (token && stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (_) {
                localStorage.removeItem('felicity_token');
                localStorage.removeItem('felicity_user');
            }
        }
        setLoading(false);
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('felicity_token', token);
        localStorage.setItem('felicity_user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('felicity_token');
        localStorage.removeItem('felicity_user');
        setUser(null);
    };

    const updateUser = (data) => {
        const updated = { ...user, ...data };
        localStorage.setItem('felicity_user', JSON.stringify(updated));
        setUser(updated);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
