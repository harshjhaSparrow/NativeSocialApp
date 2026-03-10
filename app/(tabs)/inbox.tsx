import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { MessageCircle, ChevronRight, Users, Calendar } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { UserProfile, Message } from "../../types";

interface InboxItem {
    type: "direct" | "group";
    partner?: UserProfile;
    groupId?: string;
    lastMessage: Message;
    unreadCount?: number;
}

export default function InboxScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [conversations, setConversations] = useState<InboxItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInbox = async () => {
        if (!user) return;
        try {
            const data = await api.chat.getInbox(user.uid);
            setConversations(data);
        } catch (e) {
            console.error("Failed to load inbox", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInbox();
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = api.chat.subscribe(user.uid, (newMsg: Message) => {
            setConversations((prev) => {
                let exists = false;
                let updated = prev.map((conv) => {
                    let isMatch = false;
                    if (newMsg.groupId) {
                        isMatch = conv.type === "group" && conv.groupId === newMsg.groupId;
                    } else {
                        const partnerId = conv.partner?.uid;
                        isMatch = conv.type === "direct" && !!partnerId && (newMsg.fromUid === partnerId || newMsg.toUid === partnerId);
                    }

                    if (isMatch) {
                        exists = true;
                        const isIncoming = newMsg.fromUid !== user.uid;
                        return {
                            ...conv,
                            lastMessage: newMsg,
                            unreadCount: isIncoming ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
                        };
                    }
                    return conv;
                });

                if (exists) {
                    return updated.sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
                } else {
                    fetchInbox();
                    return prev;
                }
            });
        });

        return () => unsubscribe();
    }, [user]);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday =
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }

        const diff = now.getTime() - date.getTime();
        const days = diff / (1000 * 3600 * 24);
        if (days < 7) {
            return date.toLocaleDateString(undefined, { weekday: "short" });
        }

        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    const meetupChats = conversations.filter((c) => c.type === "group");
    const friendChats = conversations.filter((c) => c.type === "direct");

    const renderChatList = (chats: InboxItem[]) => {
        if (chats.length === 0) return <Text style={styles.emptyText}>No conversations yet.</Text>;

        return (
            <View style={styles.list}>
                {chats.map((conv) => {
                    const isGroup = conv.type === "group";
                    const isUnread = (conv.unreadCount || 0) > 0;
                    const link = isGroup ? `/chat/group/${conv.groupId}` : `/chat/${conv.partner?.uid}`;

                    if (!isGroup && !conv.partner) return null;

                    return (
                        <TouchableOpacity
                            key={isGroup ? conv.groupId : conv.partner!.uid}
                            onPress={() => router.push(link as any)}
                            style={[styles.chatItem, isUnread ? styles.chatItemUnread : null]}
                            activeOpacity={0.8}
                        >
                            <View style={styles.avatarContainer}>
                                <View style={[styles.avatar, isGroup ? styles.avatarGroup : null]}>
                                    {isGroup ? (
                                        <Users size={24} color="#60a5fa" />
                                    ) : conv.partner!.photoURL ? (
                                        <Image source={{ uri: conv.partner!.photoURL }} style={styles.avatarImage} />
                                    ) : (
                                        <Text style={styles.avatarText}>{conv.partner!.displayName?.[0]}</Text>
                                    )}
                                </View>
                                {isUnread && <View style={styles.unreadBadgeSmall} />}
                            </View>

                            <View style={styles.chatInfo}>
                                <View style={styles.chatHeader}>
                                    <Text style={[styles.chatTitle, isUnread && styles.textWhite]}>
                                        {isGroup ? conv.lastMessage.groupTitle || "Group Chat" : conv.partner!.displayName || "Unknown User"}
                                    </Text>
                                    <Text style={[styles.chatTime, isUnread && styles.textBlue]}>{formatTime(conv.lastMessage.createdAt)}</Text>
                                </View>

                                <View style={styles.chatFooter}>
                                    <Text style={[styles.chatPreview, isUnread && styles.textWhiteMedium]} numberOfLines={1}>
                                        {conv.lastMessage.fromUid === user?.uid && <Text style={styles.youText}>You: </Text>}
                                        {isGroup && conv.lastMessage.fromUid !== user?.uid && conv.lastMessage.fromUid !== "system" && (
                                            <Text style={styles.youText}>{conv.lastMessage.authorName}: </Text>
                                        )}
                                        {conv.lastMessage.text}
                                    </Text>
                                    {isUnread && (
                                        <View style={styles.unreadCountBadge}>
                                            <Text style={styles.unreadCountText}>{conv.unreadCount}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <ChevronRight size={20} color={isUnread ? "#3b82f6" : "#475569"} />
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {conversations.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <MessageCircle size={32} color="#475569" />
                        </View>
                        <Text style={styles.emptyTitle}>No messages yet.</Text>
                        <Text style={styles.emptySubtitle}>Join a meetup or start a chat from a profile!</Text>
                    </View>
                ) : (
                    <View style={styles.sections}>
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Calendar size={16} color="#3b82f6" />
                                <Text style={styles.sectionTitle}>MeetUps</Text>
                            </View>
                            {renderChatList(meetupChats)}
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Users size={16} color="#3b82f6" />
                                <Text style={styles.sectionTitle}>Friends</Text>
                            </View>
                            {renderChatList(friendChats)}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    header: { padding: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyIconBox: { width: 64, height: 64, backgroundColor: '#0f172a', borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#1e293b' },
    emptyTitle: { color: '#94a3b8', fontSize: 16, fontWeight: '500' },
    emptySubtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
    sections: { gap: 24 },
    section: {},
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 4 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
    list: { gap: 8 },
    emptyText: { color: '#64748b', fontSize: 14, fontStyle: 'italic', paddingHorizontal: 16, paddingVertical: 8 },
    chatItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b' },
    chatItemUnread: { backgroundColor: '#1e293b', borderColor: '#334155' },
    avatarContainer: { position: 'relative' },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1e293b', overflow: 'hidden', borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
    avatarGroup: { backgroundColor: 'rgba(30, 58, 138, 0.3)' },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: '#64748b', fontWeight: 'bold', fontSize: 18 },
    unreadBadgeSmall: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, backgroundColor: '#3b82f6', borderRadius: 8, borderWidth: 2, borderColor: '#0f172a' },
    chatInfo: { flex: 1, marginHorizontal: 12 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
    chatTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold', flex: 1 },
    textWhite: { color: '#fff', fontWeight: '900' as any },
    chatTime: { color: '#64748b', fontSize: 10, marginLeft: 8 },
    textBlue: { color: '#60a5fa', fontWeight: 'bold' },
    chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chatPreview: { color: '#94a3b8', fontSize: 14, flex: 1, paddingRight: 8 },
    textWhiteMedium: { color: '#fff', fontWeight: '500' },
    youText: { color: '#64748b', fontWeight: 'normal' },
    unreadCountBadge: { backgroundColor: '#3b82f6', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    unreadCountText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});
