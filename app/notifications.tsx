import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, Calendar, CalendarCheck, ChevronLeft, CheckCheck } from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { Notification } from '../types';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import { colors, typography, spacing, radii } from '../constants/theme';

function timeAgo(ts: number): string {
    const diff = (Date.now() - ts) || 0;
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    return new Date(ts).toLocaleDateString();
}

type NotifMeta = { icon: React.ReactNode; color: string; label: string };
function getNotifMeta(type: Notification['type']): NotifMeta {
    const iconProps = { size: 12, color: '#fff' };
    switch (type) {
        case 'like': return { icon: <Heart {...iconProps} />, color: colors.danger, label: 'liked your post' };
        case 'comment': return { icon: <MessageCircle {...iconProps} />, color: colors.primary, label: 'commented on your post' };
        case 'friend_request': return { icon: <UserPlus {...iconProps} />, color: colors.purple, label: 'sent you a friend request' };
        case 'friend_accept': return { icon: <UserCheck {...iconProps} />, color: colors.success, label: 'accepted your friend request' };
        case 'meetup_request': return { icon: <Calendar {...iconProps} />, color: colors.orange, label: 'wants to join your meetup' };
        case 'meetup_accept': return { icon: <CalendarCheck {...iconProps} />, color: colors.teal, label: 'accepted your meetup request' };
        default: return { icon: <Bell {...iconProps} />, color: colors.textTertiary, label: 'sent a notification' };
    }
}

function getNotifLink(n: Notification): string {
    if (['like', 'comment', 'meetup_request', 'meetup_accept'].includes(n.type) && n.postId) return `/post/${n.postId}`;
    return `/profile/${n.fromUid}`;
}

const NotifCard = ({ n, onTap }: { n: Notification; onTap: () => void }) => {
    const { icon, color, label } = getNotifMeta(n.type);
    return (
        <TouchableOpacity onPress={onTap} style={[styles.card, !n.read && styles.cardUnread]} activeOpacity={0.7}>
            <View style={styles.cardInner}>
                {/* Avatar + badge */}
                <View>
                    <Avatar uri={n.fromPhoto} name={n.fromName} size="md" />
                    <View style={[styles.typeBadge, { backgroundColor: color }]}>{icon}</View>
                </View>
                {/* Text */}
                <View style={styles.cardText}>
                    <Text style={styles.cardMsg}>
                        <Text style={styles.cardName}>{n.fromName} </Text>
                        {label}
                    </Text>
                    <Text style={styles.cardTime}>{timeAgo(n.createdAt)}</Text>
                </View>
                {/* Unread dot */}
                {!n.read && <View style={styles.unreadDot} />}
            </View>
        </TouchableOpacity>
    );
};

function groupByDay(notifications: Notification[]) {
    const now = Date.now();
    const todayStart = new Date(new Date().toDateString()).getTime();
    const groups: Record<string, Notification[]> = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] };
    for (const n of notifications) {
        if (n.createdAt >= todayStart) groups['Today'].push(n);
        else if (n.createdAt >= todayStart - 86400000) groups['Yesterday'].push(n);
        else if (n.createdAt >= todayStart - 6 * 86400000) groups['This Week'].push(n);
        else groups['Earlier'].push(n);
    }
    return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

    useEffect(() => {
        if (unreadCount > 0) {
            const ids = notifications.filter(n => !n.read).map(n => n._id);
            if (ids.length) markRead(ids);
        }
    }, []);

    const groups = groupByDay(notifications);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={26} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
                {notifications.some(n => !n.read) ? (
                    <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
                        <CheckCheck size={16} color={colors.primary} />
                        <Text style={styles.markAllText}>Read all</Text>
                    </TouchableOpacity>
                ) : <View style={{ width: 72 }} />}
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
                {notifications.length === 0 ? (
                    <View style={{ marginTop: spacing.s9 }}>
                        <EmptyState
                            icon={<Bell size={36} color={colors.textTertiary} />}
                            title="All caught up!"
                            subtitle="When someone likes, comments, or sends a friend request you'll see it here."
                        />
                    </View>
                ) : groups.map(([label, items]) => (
                    <View key={label}>
                        <Text style={styles.groupLabel}>{label}</Text>
                        {items.map(n => (
                            <NotifCard key={n._id} n={n} onTap={() => { if (!n.read) markRead([n._id]); router.push(getNotifLink(n) as any); }} />
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.s4, paddingVertical: spacing.s3, borderBottomWidth: 1, borderBottomColor: colors.border0 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    title: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
    markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.s1 },
    markAllText: { color: colors.primaryText, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
    scroll: { flex: 1 },
    groupLabel: { color: colors.textTertiary, fontSize: typography.size.xs, fontWeight: typography.weight.bold, letterSpacing: typography.tracking.widest, paddingHorizontal: spacing.s4, paddingTop: spacing.s5, paddingBottom: spacing.s2 },
    card: { borderLeftWidth: 2.5, borderLeftColor: 'transparent' },
    cardUnread: { backgroundColor: 'rgba(59,130,246,0.06)', borderLeftColor: colors.primary },
    cardInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.s4, paddingVertical: spacing.s3, gap: spacing.s3 },
    typeBadge: { position: 'absolute', bottom: -2, right: -4, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.bg0 },
    cardText: { flex: 1 },
    cardMsg: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: typography.size.sm * typography.leading.normal },
    cardName: { color: colors.textPrimary, fontWeight: typography.weight.bold },
    cardTime: { color: colors.textTertiary, fontSize: typography.size.xs, marginTop: 2 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
