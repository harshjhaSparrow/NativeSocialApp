import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send, Users } from 'lucide-react-native';
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
                    setGroupTitle(groupData.meetupDetails.title);
                } else if (history.length > 0 && history[0].groupTitle) {
                    setGroupTitle(history[0].groupTitle);
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

        const unsubscribe = api.chat.subscribe(user.uid, (newMsg: Message) => {
            if (newMsg.groupId === groupId) {
                setMessages(prev => {
                    if (prev.some(m => m._id === newMsg._id)) return prev;
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
            const sentMsg = await api.chat.send(user.uid, 'group', msgText, groupId);
            setMessages(prev => {
                if (prev.some(m => m._id === sentMsg._id)) return prev;
                return [sentMsg, ...prev]; // FlatList inverted
            });
        } catch (e) {
            console.error("Failed to send", e);
            setText(msgText); // Restore
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color="#94a3b8" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.headerInfo}
                    onPress={() => alert('Group info modal not implemented')}
                >
                    <View style={styles.avatar}>
                        <Users size={20} color="#60a5fa" />
                    </View>
                    <View>
                        <Text style={styles.headerName}>{groupTitle}</Text>
                        <Text style={styles.headerSub}>Tap for Group Info</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                data={messages}
                inverted
                keyExtractor={(item) => item._id || Math.random().toString()}
                renderItem={({ item, index }) => {
                    const isMe = item.fromUid === user?.uid;
                    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.fromUid !== item.fromUid);

                    return (
                        <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
                            {!isMe && showAvatar && (
                                <View style={styles.messageAvatar}>
                                    {item.authorPhoto ? (
                                        <Image source={{ uri: item.authorPhoto }} style={styles.avatarImage} />
                                    ) : (
                                        <Text style={styles.messageAvatarText}>{item.authorName?.[0] || '?'}</Text>
                                    )}
                                </View>
                            )}
                            {!isMe && !showAvatar && <View style={styles.messageAvatarSpacer} />}

                            <View>
                                {!isMe && showAvatar && (
                                    <Text style={styles.authorNameText}>{item.authorName}</Text>
                                )}
                                <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
                                    <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>{item.text}</Text>
                                </View>
                            </View>
                        </View>
                    );
                }}
                contentContainerStyle={styles.messagesContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <Users size={32} color="#475569" />
                        </View>
                        <Text style={styles.emptyText}>Say hi to the group!</Text>
                    </View>
                }
            />

            {/* Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message..."
                    placeholderTextColor="#64748b"
                    style={styles.input}
                    multiline
                    maxLength={1000}
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
                    disabled={!text.trim() || sending}
                    onPress={handleSend}
                >
                    {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
                </TouchableOpacity>
            </View>
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
    sendButtonDisabled: { opacity: 0.5 }
});
