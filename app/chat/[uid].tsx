import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send, Users, User as UserIcon } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Message, UserProfile } from '../../types';

export default function ChatScreen() {
    const { uid } = useLocalSearchParams<{ uid: string }>();
    const { user } = useAuth();
    const router = useRouter();

    const [friend, setFriend] = useState<UserProfile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        const init = async () => {
            if (!user || !uid) return;
            try {
                const friendProfile = await api.profile.get(uid);
                if (!friendProfile) {
                    router.back();
                    return;
                }
                setFriend(friendProfile);
                const history = await api.chat.getHistory(user.uid, uid);
                setMessages(history.reverse()); // FlatList inverted
                await api.chat.markRead(user.uid, uid);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [uid, user]);

    // Real-time Subscription
    useEffect(() => {
        if (!user || !uid) return;

        const unsubscribe = api.chat.subscribe(user.uid, (newMsg: Message) => {
            const isRelevant =
                (newMsg.fromUid === uid && newMsg.toUid === user.uid) ||
                (newMsg.fromUid === user.uid && newMsg.toUid === uid);

            if (isRelevant) {
                setMessages(prev => {
                    if (prev.some(m => m._id === newMsg._id)) return prev;
                    return [newMsg, ...prev]; // FlatList inverted
                });

                if (newMsg.fromUid === uid) {
                    api.chat.markRead(user.uid, uid).catch(console.error);
                }
            }
        });

        return () => unsubscribe();
    }, [user, uid]);

    const handleSend = async () => {
        if (!text.trim() || !user || !uid) return;
        setSending(true);
        const msgText = text.trim();
        setText('');

        try {
            const sentMsg = await api.chat.send(user.uid, uid, msgText);
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

    if (!friend) return null;

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
                    onPress={() => router.push(`/profile/${uid}` as any)}
                >
                    <View style={styles.avatar}>
                        {friend.photoURL ? (
                            <Image source={{ uri: friend.photoURL }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarText}>{friend.displayName?.[0]}</Text>
                        )}
                    </View>
                    <View>
                        <Text style={styles.headerName}>{friend.displayName}</Text>
                        <Text style={styles.headerSub}>Tap to view profile</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
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
                                    {friend.photoURL ? (
                                        <Image source={{ uri: friend.photoURL }} style={styles.avatarImage} />
                                    ) : (
                                        <Text style={styles.messageAvatarText}>{friend.displayName?.[0]}</Text>
                                    )}
                                </View>
                            )}
                            {!isMe && !showAvatar && <View style={styles.messageAvatarSpacer} />}

                            <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
                                <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>{item.text}</Text>
                            </View>
                        </View>
                    );
                }}
                contentContainerStyle={styles.messagesContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <UserIcon size={32} color="#475569" />
                        </View>
                        <Text style={styles.emptyText}>Start the conversation!</Text>
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
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: '#64748b', fontWeight: 'bold', fontSize: 16 },
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
