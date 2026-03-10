import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthStatus } from '../types';

// Simplified User type for our internal auth
interface User {
    uid: string;
    email: string | null;
}

interface AuthContextType {
    user: User | null;
    status: AuthStatus;
    login: (user: User) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    status: 'loading',
    login: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [status, setStatus] = useState<AuthStatus>('loading');

    useEffect(() => {
        const loadSession = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('socially_session');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                    setStatus('authenticated');
                } else {
                    setStatus('unauthenticated');
                }
            } catch (e) {
                setStatus('unauthenticated');
            }
        };
        loadSession();
    }, []);

    const login = async (userData: User) => {
        setUser(userData);
        await AsyncStorage.setItem('socially_session', JSON.stringify(userData));
        setStatus('authenticated');
    };

    const logout = async () => {
        await AsyncStorage.removeItem('socially_session');
        setUser(null);
        setStatus('unauthenticated');
    };

    return (
        <AuthContext.Provider value={{ user, status, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
