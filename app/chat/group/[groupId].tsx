import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Crown, Send, Trash2, Users, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { Message, Post, UserProfile } from '../../../types';

export default function GroupChatScreen() {
    const { groupId } = useLocalSearchParams<{ groupId: string }>();
    const { user } = useAuth();
    const router = useRouter();

    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const [groupPost, setGroupPost] = useState<Post | null>(null);
    const [groupTitle, setGroupTitle] = useState('Group Chat');
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [showGroupInfo, setShowGroupInfo] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (!user || !groupId) return;
            try {
                const [history, groupData] = await Promise.all([
                    api.chat.getGroupHistory(groupId),
                    api.posts.getPost(groupId)
                ]);
                setMessages(history.reverse()); // FlatList inverted
                setGroupPost(groupData);

                if (groupData?.meetupDetails?.title) {
                    setGroupTitle(groupData?.meetupDetails?.title);
                } else if (history?.length > 0 && history?.[0]?.groupTitle) {
                    setGroupTitle(history?.[0]?.groupTitle);
                }

                if (groupData) {
                    const allMemberIds = [groupData?.uid, ...(groupData?.attendees || [])];
                    const uniqueIds = Array.from(new Set(allMemberIds));
                    const profiles = await api.profile.getBatch(uniqueIds);
                    setMembers(profiles);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [groupId, user]);

    // Real-time Subscription
    useEffect(() => {
        if (!user || !groupId) return;

        const unsubscribe = api.chat.subscribe(user?.uid, (newMsg: Message) => {
            if (newMsg?.groupId === groupId) {
                setMessages(prev => {
                    if (prev.some(m => m?._id === newMsg?._id)) return prev;
                    return [newMsg, ...prev]; // FlatList inverted
                });
            }
        });

        return () => unsubscribe();
    }, [user, groupId]);

    const handleSend = async () => {
        if (!text.trim() || !user || !groupId) return;
        setSending(true);
        const msgText = text.trim();
        setText('');

        try {
            const sentMsg = await api.chat.send(user?.uid, 'group', msgText, groupId);
            setMessages(prev => {
                if (prev.some(m => m?._id === sentMsg?._id)) return prev;
                return [sentMsg, ...prev]; // FlatList inverted
            });
        } catch (e) {
            console.error("Failed to send", e);
            setText(msgText); // Restore
        } finally {
            setSending(false);
        }
    };

    const handleRemoveMember = (targetUid: string) => {
        if (!user || !groupPost) return;

        Alert.alert(
            "Remove Member",
            "Are you sure you want to remove this user from the group?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.meetups.removeAttendee(groupPost?._id!, user?.uid, targetUid);
                            setMembers(prev => prev.filter(m => m?.uid !== targetUid));
                            setGroupPost(prev => prev ? {
                                ...prev,
                                attendees: prev?.attendees?.filter(id => id !== targetUid)
                            } : null);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles?.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles?.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Header */}
            <View style={styles?.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles?.backButton}>
                    <ChevronLeft size={24} color="#94a3b8" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles?.headerInfo}
                    onPress={() => setShowGroupInfo(true)}
                >
                    <View style={styles?.avatar}>
                        <Users size={20} color="#60a5fa" />
                    </View>
                    <View>
                        <Text style={styles?.headerName}>{groupTitle}</Text>
                        <Text style={styles?.headerSub}>Tap for Group Info</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                data={messages}
                inverted
                keyExtractor={(item) => item?._id || Math.random().toString()}
                renderItem={({ item, index }) => {
                    const isMe = item?.fromUid === user?.uid;
                    const showAvatar = !isMe && (index === 0 || messages?.[index - 1]?.fromUid !== item?.fromUid);

                    return (
                        <View style={[styles?.messageRow, isMe ? styles?.messageRowMe : styles?.messageRowThem]}>
                            {!isMe && showAvatar && (
                                <View style={styles?.messageAvatar}>
                                    {item?.authorPhoto ? (
                                        <Image source={{ uri: item?.authorPhoto }} style={styles?.avatarImage} />
                                    ) : (
                                        <Text style={styles?.messageAvatarText}>{item?.authorName?.[0] || '?'}</Text>
                                    )}
                                </View>
                            )}
                            {!isMe && !showAvatar && <View style={styles?.messageAvatarSpacer} />}

                            <View>
                                {!isMe && showAvatar && (
                                    <Text style={styles?.authorNameText}>{item?.authorName}</Text>
                                )}
                                <View style={[styles?.messageBubble, isMe ? styles?.messageBubbleMe : styles?.messageBubbleThem]}>
                                    <Text style={[styles?.messageText, isMe ? styles?.messageTextMe : styles?.messageTextThem]}>{item?.text}</Text>
                                </View>
                            </View>
                        </View>
                    );
                }}
                contentContainerStyle={styles?.messagesContent}
                ListEmptyComponent={
                    <View style={styles?.emptyContainer}>
                        <View style={styles?.emptyIconBox}>
                            <Users size={32} color="#475569" />
                        </View>
                        <Text style={styles?.emptyText}>Say hi to the group!</Text>
                    </View>
                }
            />

            {/* Input */}
            <View style={styles?.inputContainer}>
                <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message..."
                    placeholderTextColor="#64748b"
                    style={styles?.input}
                    multiline
                    maxLength={1000}
                />
                <TouchableOpacity
                    style={[styles?.sendButton, (!text.trim() || sending) && styles?.sendButtonDisabled]}
                    disabled={!text.trim() || sending}
                    onPress={handleSend}
                >
                    {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
                </TouchableOpacity>
            </View>

            {/* Group Info Modal */}
            <Modal visible={showGroupInfo} animationType="slide" transparent>
                <View style={styles?.modalOverlay}>
                    <View style={styles?.modalContent}>
                        <View style={styles?.modalHeader}>
                            <Text style={styles?.modalTitle}>Group Info</Text>
                            <TouchableOpacity onPress={() => setShowGroupInfo(false)} style={styles?.closeModalBtn}>
                                <X size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles?.modalScroll}>
                            {/* Host */}
                            <Text style={styles?.sectionTitle}>HOST</Text>
                            {members.filter(m => m.uid === groupPost?.uid).map(host => (
                                <View key={host?.uid} style={styles?.memberCard}>
                                    <View style={[styles?.memberAvatar, { borderColor: 'rgba(59, 130, 246, 0.5)', borderWidth: 2 }]}>
                                        {host?.photoURL ? (
                                            <Image source={{ uri: host?.photoURL }} style={styles?.avatarImage} />
                                        ) : (
                                            <Text style={styles?.memberAvatarText}>{host?.displayName?.[0]}</Text>
                                        )}
                                    </View>
                                    <View style={styles?.memberDetails}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles?.memberName}>{host?.displayName}</Text>
                                            <Crown size={14} color="#3b82f6" style={{ marginLeft: 6 }} />
                                        </View>
                                        <Text style={styles?.memberRole}>Event Organizer</Text>
                                    </View>
                                    <TouchableOpacity style={styles?.viewBtn} onPress={() => { setShowGroupInfo(false); router.push(`/profile/${host?.uid}`); }}>
                                        <Text style={styles?.viewBtnText}>View</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            {/* Attendees */}
                            <View style={styles?.sectionHeaderLine}>
                                <Text style={styles?.sectionTitle}>MEMBERS</Text>
                                <Text style={styles?.memberCount}>{members.filter(m => m?.uid !== groupPost?.uid)?.length}</Text>
                            </View>

                            {members.filter(m => m?.uid !== groupPost?.uid)?.length === 0 ? (
                                <Text style={styles?.emptyMembersText}>No other members yet.</Text>
                            ) : (
                                members.filter(m => m.uid !== groupPost?.uid).map(member => (
                                    <View key={member?.uid} style={styles?.memberCard}>
                                        <View style={styles?.memberAvatar}>
                                            {member?.photoURL ? (
                                                <Image source={{ uri: member?.photoURL }} style={styles?.avatarImage} />
                                            ) : (
                                                <Text style={styles?.memberAvatarText}>{member?.displayName?.[0]}</Text>
                                            )}
                                        </View>
                                        <View style={styles?.memberDetails}>
                                            <Text style={styles?.memberName}>{member?.displayName}</Text>
                                        </View>

                                        <View style={styles?.memberActions}>
                                            <TouchableOpacity style={styles?.viewBtn} onPress={() => { setShowGroupInfo(false); router.push(`/profile/${member?.uid}`); }}>
                                                <Text style={styles?.viewBtnText}>View</Text>
                                            </TouchableOpacity>

                                            {user && groupPost && user?.uid === groupPost?.uid && (
                                                <TouchableOpacity style={styles?.removeBtn} onPress={() => handleRemoveMember(member?.uid)}>
                                                    <Trash2 size={16} color="#ef4444" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    backButton: { marginRight: 16 },
    headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(30, 58, 138, 0.3)', borderWidth: 1, borderColor: '#1e3a8a', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarImage: { width: '100%', height: '100%' },
    headerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    headerSub: { color: '#64748b', fontSize: 12 },
    messagesContent: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', transform: [{ scaleY: -1 }] },
    emptyIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    emptyText: { color: '#64748b', fontSize: 14 },
    messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, maxWidth: '80%' },
    messageRowMe: { alignSelf: 'flex-end' },
    messageRowThem: { alignSelf: 'flex-start' },
    messageAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1e293b', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    messageAvatarSpacer: { width: 24, marginRight: 8 },
    messageAvatarText: { color: '#64748b', fontSize: 10, fontWeight: 'bold' },
    authorNameText: { color: '#64748b', fontSize: 10, marginBottom: 2, marginLeft: 4 },
    messageBubble: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    messageBubbleMe: { backgroundColor: '#3b82f6', borderBottomRightRadius: 4 },
    messageBubbleThem: { backgroundColor: '#1e293b', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#334155' },
    messageText: { fontSize: 15, lineHeight: 20 },
    messageTextMe: { color: '#fff' },
    messageTextThem: { color: '#e2e8f0' },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b', paddingBottom: 24 },
    input: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: '#020617', borderRadius: 20, borderWidth: 1, borderColor: '#1e293b', color: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, marginRight: 12 },
    sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    sendButtonDisabled: { opacity: 0.5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    closeModalBtn: { padding: 4, marginRight: -4 },
    modalScroll: { padding: 20 },
    sectionTitle: { color: '#64748b', fontSize: 12, fontWeight: 'bold', marginBottom: 12, marginTop: 16, letterSpacing: 1 },
    sectionHeaderLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 4 },
    memberCount: { color: '#475569', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 12, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
    memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0f172a', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    memberAvatarText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' },
    memberDetails: { flex: 1 },
    memberName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
    memberRole: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    memberActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    viewBtn: { backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    viewBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
    removeBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 8, borderRadius: 12 },
    emptyMembersText: { color: '#64748b', fontSize: 14, fontStyle: 'italic', marginTop: 4 }
});
