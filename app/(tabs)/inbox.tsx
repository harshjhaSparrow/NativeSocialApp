/* eslint-disable react-hooks/exhaustive-deps */
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from "expo-router";
import { Calendar, Edit, MessageCircle, Users } from "lucide-react-native";
import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from "../../components/ui/Avatar";
import EmptyState from "../../components/ui/EmptyState";
import { colors, radii, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Message, UserProfile } from "../../types";

interface InboxItem { type: "direct" | "group"; partner?: UserProfile; groupId?: string; lastMessage: Message; unreadCount?: number; }

export default function InboxScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [conversations, setConversations] = useState<InboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchInbox = async (isRefresh = false) => {
        if (!user) return;
        if (isRefresh) { setRefreshing(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
        try { const data = await api.chat.getInbox(user.uid); setConversations(data); }
        catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useFocusEffect(
        useCallback(() => {
            fetchInbox();
        }, [user])
    );

    useEffect(() => {
        if (!user) return;
        const unsub = api.chat.subscribe(user.uid, (newMsg: Message) => {
            setConversations(prev => {
                const existingIndex = prev.findIndex(conv => {
                    if (newMsg.groupId) {
                        return conv.type === "group" && conv.groupId === newMsg.groupId;
                    } else {
                        return conv.type === "direct" && conv.partner && (newMsg.fromUid === conv.partner.uid || newMsg.toUid === conv.partner.uid);
                    }
                });

                if (existingIndex > -1) {
                    const existingConv = prev[existingIndex];
                    const isIncoming = newMsg.fromUid !== user.uid;
                    const updatedConv = {
                        ...existingConv,
                        lastMessage: newMsg,
                        unreadCount: isIncoming ? (existingConv.unreadCount || 0) + 1 : existingConv.unreadCount,
                    };
                    const nextConvs = [...prev];
                    nextConvs.splice(existingIndex, 1);
                    nextConvs.unshift(updatedConv);
                    return nextConvs;
                } else {
                    // New conversation, let's fetch from the server
                    fetchInbox();
                    return prev;
                }
            });
        });
        return () => unsub();
    }, [user]);

    const formatTime = (ts: number) => {
        const date = new Date(ts), now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const days = (now.getTime() - date.getTime()) / 86400000;
        if (days < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const renderConvRow = (conv: InboxItem) => {
        const isGroup = conv.type === "group";
        const isUnread = (conv.unreadCount || 0) > 0;
        const link = isGroup ? `/chat/group/${conv.groupId}` : `/chat/${conv.partner?.uid}`;
        if (!isGroup && !conv.partner) return null;
        const displayName = isGroup ? conv.lastMessage.groupTitle || "Group Chat" : conv.partner!.displayName;
        const preview = conv.lastMessage.text;

        return (
            <TouchableOpacity key={isGroup ? conv.groupId : conv.partner!.uid} onPress={() => router.push(link as any)} style={[styles.convRow, isUnread && styles.convRowUnread]} activeOpacity={0.75}>
                {/* Avatar */}
                <View style={styles.convAvatar}>
                    {isGroup ? (
                        <View style={styles.groupAvatarBox}><Users size={22} color={colors.primaryText} /></View>
                    ) : (
                        <Avatar uri={conv.partner!.photoURL} name={conv.partner!.displayName} size="md" />
                    )}
                    {isUnread && <View style={styles.unreadDot} />}
                </View>
                {/* Body */}
                <View style={styles.convBody}>
                    <View style={styles.convTop}>
                        <Text style={[styles.convName, isUnread && styles.convNameUnread]} numberOfLines={1}>{displayName}</Text>
                        <Text style={[styles.convTime, isUnread && styles.convTimeUnread]}>{formatTime(conv.lastMessage.createdAt)}</Text>
                    </View>
                    <View style={styles.convBottom}>
                        <Text style={[styles.convPreview, isUnread && styles.convPreviewUnread]} numberOfLines={1}>
                            {conv.lastMessage.fromUid === user?.uid && <Text style={styles.youLabel}>You: </Text>}
                            {preview}
                        </Text>
                        {isUnread && (
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{conv.unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const meetupChats = conversations.filter(c => c.type === "group");
    const friendChats = conversations.filter(c => c.type === "direct");

    if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
                <TouchableOpacity style={styles.composeBtn} onPress={() => router.push('/discover')}>
                    <Edit size={20} color={colors.primaryText} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchInbox(true)} tintColor={colors.primary} />}>
                {conversations.length === 0 ? (
                    <View style={{ marginTop: spacing.s9 }}>
                        <EmptyState icon={<MessageCircle size={36} color={colors.textTertiary} />} title="No messages yet" subtitle="Add friends from Discover and start chatting!" />
                    </View>
                ) : (
                    <>
                        {meetupChats.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Calendar size={14} color={colors.primaryText} />
                                    <Text style={styles.sectionTitle}>MEETUPS</Text>
                                </View>
                                {meetupChats.map(renderConvRow)}
                            </View>
                        )}
                        {friendChats.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Users size={14} color={colors.primaryText} />
                                    <Text style={styles.sectionTitle}>FRIENDS</Text>
                                </View>
                                {friendChats.map(renderConvRow)}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.s4, paddingVertical: spacing.s3, borderBottomWidth: 1, borderBottomColor: colors.border0 },
    title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.extrabold },
    composeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryGlow, justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: spacing.s4, paddingBottom: 120, gap: spacing.s6 },
    section: { gap: spacing.s2 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.s2, paddingHorizontal: spacing.s1, marginBottom: spacing.s1 },
    sectionTitle: { color: colors.textTertiary, fontSize: typography.size.xs, fontWeight: typography.weight.bold, letterSpacing: typography.tracking.widest },
    convRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.s3, backgroundColor: colors.bg2, borderRadius: radii.r4, borderWidth: 1, borderColor: colors.border0, gap: spacing.s3 },
    convRowUnread: { backgroundColor: colors.bg3, borderColor: colors.border1 },
    convAvatar: { position: 'relative' },
    groupAvatarBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    unreadDot: { position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.bg0 },
    convBody: { flex: 1 },
    convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
    convName: { color: colors.textSecondary, fontSize: typography.size.base, fontWeight: typography.weight.medium, flex: 1 },
    convNameUnread: { color: colors.textPrimary, fontWeight: typography.weight.bold },
    convTime: { color: colors.textTertiary, fontSize: typography.size.xs },
    convTimeUnread: { color: colors.primaryText, fontWeight: typography.weight.semibold },
    convBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.s2 },
    convPreview: { color: colors.textTertiary, fontSize: typography.size.sm, flex: 1 },
    convPreviewUnread: { color: colors.textSecondary },
    youLabel: { color: colors.textTertiary },
    countBadge: { backgroundColor: colors.primary, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
    countText: { color: colors.white, fontSize: typography.size.xs, fontWeight: typography.weight.bold },
});
