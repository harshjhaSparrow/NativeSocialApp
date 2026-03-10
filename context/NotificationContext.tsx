import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Notification } from '../types';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markRead: (ids: string[]) => Promise<void>;
    markAllRead: () => Promise<void>;
    addNotification: (n: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    unreadCount: 0,
    markRead: async () => { },
    markAllRead: async () => { },
    addNotification: () => { },
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const keepAliveRef = useRef<any>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Load initial notifications from server
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await api.notifications.get(user.uid);
            setNotifications(data);
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Real-time WebSocket subscription for incoming notifications
    useEffect(() => {
        if (!user) return;

        const wsUrl = `wss://backend.strangerchat.space?uid=${user.uid}`;

        const connect = () => {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                keepAliveRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'notification' && data.notification) {
                        setNotifications(prev => [data.notification as Notification, ...prev]);
                    }
                } catch (e) {
                    // non-JSON or unrelated message
                }
            };

            ws.onclose = () => {
                clearInterval(keepAliveRef.current);
            };
        };

        connect();

        return () => {
            clearInterval(keepAliveRef.current);
            wsRef.current?.close();
        };
    }, [user]);

    const markRead = useCallback(async (ids: string[]) => {
        if (!ids.length) return;
        setNotifications(prev =>
            prev.map(n => ids.includes(n._id) ? { ...n, read: true } : n)
        );
        await api.notifications.markRead(ids);
    }, []);

    const markAllRead = useCallback(async () => {
        if (!user) return;
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        await api.notifications.markAllRead(user.uid);
    }, [user]);

    const addNotification = useCallback((n: Notification) => {
        setNotifications(prev => [n, ...prev]);
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, addNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};
