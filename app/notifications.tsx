import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, Calendar, CalendarCheck, ChevronLeft, CheckCheck } from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { Notification } from '../types';

/* ---------- Helpers ---------- */

function timeAgo(ts: number): string {
    const diff = (Date.now() - ts) || 0;
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(ts).toLocaleDateString();
}

function getNotifMeta(type: Notification['type']) {
    switch (type) {
        case 'like':
            return { icon: <Heart size={14} color="#fff" />, color: '#ef4444', label: 'liked your post' };
        case 'comment':
            return { icon: <MessageCircle size={14} color="#fff" />, color: '#3b82f6', label: 'commented on your post' };
        case 'friend_request':
            return { icon: <UserPlus size={14} color="#fff" />, color: '#a855f7', label: 'sent you a friend request' };
        case 'friend_accept':
            return { icon: <UserCheck size={14} color="#fff" />, color: '#22c55e', label: 'accepted your friend request' };
        case 'meetup_request':
            return { icon: <Calendar size={14} color="#fff" />, color: '#f97316', label: 'wants to join your meetup' };
        case 'meetup_accept':
            return { icon: <CalendarCheck size={14} color="#fff" />, color: '#14b8a6', label: 'accepted your meetup request' };
        default:
            return { icon: <Bell size={14} color="#fff" />, color: '#64748b', label: 'sent you a notification' };
    }
}

function getNotifLink(n: Notification): string {
    if (['like', 'comment', 'meetup_request', 'meetup_accept'].includes(n.type) && n.postId) {
        return `/post/${n.postId}`;
    }
    return `/profile/${n.fromUid}`;
}

/* ---------- Card ---------- */

const NotifCard = ({ n, onTap }: { n: Notification; onTap: () => void }) => {
    const { icon, color, label } = getNotifMeta(n.type);

    return (
        <TouchableOpacity
            onPress={onTap}
            style={[styles.card, !n.read && styles.cardUnread]}
        >
            <View style={styles.cardContent}>
                <View style={styles.avatarContainer}>
                    {n.fromPhoto ? (
                        <Image source={{ uri: n.fromPhoto }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{n.fromName?.[0]?.toUpperCase() ?? '?'}</Text>
                        </View>
                    )}
                    <View style={[styles.typeBadge, { backgroundColor: color }]}>
                        {icon}
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.messageText}>
                        <Text style={styles.boldName}>{n.fromName}</Text>{' '}
                        {label}
                    </Text>
                    <Text style={styles.timeText}>{timeAgo(n.createdAt)}</Text>
                </View>

                {!n.read && <View style={styles.unreadDot} />}
            </View>
        </TouchableOpacity>
    );
};

/* ---------- Grouped sections ---------- */

function groupByDay(notifications: Notification[]) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 6 * 86400000;

    const groups: Record<string, Notification[]> = {
        Today: [],
        Yesterday: [],
        'This Week': [],
        Earlier: [],
    };

    for (const n of notifications) {
        if (n.createdAt >= todayStart) groups['Today'].push(n);
        else if (n.createdAt >= yesterdayStart) groups['Yesterday'].push(n);
        else if (n.createdAt >= weekStart) groups['This Week'].push(n);
        else groups['Earlier'].push(n);
    }

    return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export default function NotificationsScreen() {
    const router = useRouter();
    const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

    useEffect(() => {
        if (unreadCount > 0) {
            const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
            if (unreadIds.length > 0) markRead(unreadIds);
        }
    }, []);

    const groups = groupByDay(notifications);

    const handleTap = (n: Notification) => {
        if (!n.read) markRead([n._id]);
        router.push(getNotifLink(n) as any);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={28} color="#94a3b8" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>

                {notifications.some(n => !n.read) ? (
                    <TouchableOpacity onPress={markAllRead} style={styles.markAllReadBtn}>
                        <CheckCheck size={16} color="#3b82f6" />
                        <Text style={styles.markAllReadText}>All read</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 80 }} />
                )}
            </View>

            {/* Content */}
            <ScrollView style={styles.scrollArea}>
                {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconBox}>
                            <Bell size={40} color="#475569" />
                        </View>
                        <Text style={styles.emptyTitle}>All caught up!</Text>
                        <Text style={styles.emptySubtitle}>
                            When someone likes your post, comments, or sends a friend request, you'll see it here.
                        </Text>
                    </View>
                ) : (
                    <View style={{ paddingBottom: 40 }}>
                        {groups.map(([label, items]) => (
                            <View key={label}>
                                <Text style={styles.groupLabel}>{label.toUpperCase()}</Text>
                                {items.map(n => (
                                    <NotifCard key={n._id} n={n} onTap={() => handleTap(n)} />
                                ))}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    backButton: { width: 80, justifyContent: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    markAllReadBtn: { width: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    markAllReadText: { color: '#3b82f6', fontSize: 12, fontWeight: 'bold' },
    scrollArea: { flex: 1 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 100 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    emptySubtitle: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
    groupLabel: { color: '#64748b', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, letterSpacing: 1 },
    card: { borderLeftWidth: 2, borderLeftColor: 'transparent', backgroundColor: '#020617' },
    cardUnread: { backgroundColor: 'rgba(59, 130, 246, 0.05)', borderLeftColor: '#3b82f6' },
    cardContent: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16 },
    avatarContainer: { position: 'relative', marginRight: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1e293b' },
    avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    typeBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#020617' },
    textContainer: { flex: 1 },
    messageText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
    boldName: { fontWeight: 'bold', color: '#fff' },
    timeText: { color: '#64748b', fontSize: 12, marginTop: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6', marginLeft: 8 }
});
