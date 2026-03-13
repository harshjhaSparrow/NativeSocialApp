import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronLeft, MessageCircle, User as UserIcon, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import PostItem from "../../components/PostItem";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Post, UserProfile } from "../../types";

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Host Management State
    const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    useEffect(() => {
        const fetchPost = async () => {
            if (!id) return;
            try {
                const data = await api.posts.getPost(id);
                if (data) {
                    setPost(data);

                    if (user && data?.uid === user?.uid && data?.type === "meetup" && data?.pendingRequests?.length) {
                        setLoadingRequests(true);
                        const users = await api.profile.getBatch(data?.pendingRequests);
                        setPendingUsers(users);
                        setLoadingRequests(false);
                    }
                } else {
                    setError("Post not found");
                }
            } catch (e) {
                setError("Failed to load post");
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [id, user]);

    const handleLike = async (postToUpdate: Post) => {
        if (!user || !postToUpdate?._id) return;

        const isLiked = postToUpdate?.likedBy?.includes(user?.uid);
        const newLikes = isLiked ? postToUpdate?.likes - 1 : postToUpdate?.likes + 1;
        const newLikedBy = isLiked
            ? postToUpdate?.likedBy?.filter((uid) => uid !== user?.uid) || []
            : [...(postToUpdate?.likedBy || []), user?.uid];

        const updatedPost = { ...postToUpdate, likes: newLikes, likedBy: newLikedBy };
        setPost(updatedPost);

        try {
            const updatedData = await api.posts.toggleLike(postToUpdate?._id, user?.uid);
            setPost({ ...updatedPost, likes: updatedData?.likes, likedBy: updatedData?.likedBy });
        } catch (err) {
            setPost(postToUpdate);
        }
    };

    const handleAddComment = async (postId: string, text: string) => {
        if (!user) return;
        try {
            const newComment = await api.posts.addComment(postId, user?.uid, text);
            setPost((prev) => prev ? { ...prev, comments: [...(prev?.comments || []), newComment] } : null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeletePost = (postId: string) => {
        Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    if (!user) return;
                    await api.posts.deletePost(postId, user?.uid);
                    router.back();
                }
            }
        ]);
    };

    const handleEditPost = (postId: string) => {
        router.push(`/edit-post/${postId}`);
    };

    const handleAcceptRequest = async (requesterUid: string) => {
        if (!user || !post?._id) return;
        try {
            await api.meetups.accept(post?._id, user?.uid, requesterUid);
            setPendingUsers((prev) => prev.filter((u) => u?.uid !== requesterUid));
            setPost((prev) => prev ? {
                ...prev,
                pendingRequests: prev?.pendingRequests?.filter(uid => uid !== requesterUid),
                attendees: [...(prev?.attendees || []), requesterUid],
            } : null);
        } catch (e) {
            Alert.alert("Error", "Failed to accept request");
        }
    };

    const handleRejectRequest = async (requesterUid: string) => {
        if (!user || !post?._id) return;
        try {
            await api.meetups.reject(post?._id, user?.uid, requesterUid);
            setPendingUsers((prev) => prev.filter((u) => u?.uid !== requesterUid));
            setPost((prev) => prev ? {
                ...prev,
                pendingRequests: prev?.pendingRequests?.filter(uid => uid !== requesterUid),
            } : null);
        } catch (e) {
            Alert.alert("Error", "Failed to reject request");
        }
    };

    if (loading) {
        return (
            <View style={styles?.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    const isHost = user && post && user?.uid === post?.uid;
    const isMeetup = post?.type === "meetup";

    return (
        <View style={styles?.container}>
            {/* Header */}
            <View style={styles?.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles?.backButton}>
                    <ChevronLeft size={24} color="#94a3b8" />
                </TouchableOpacity>
                <Text style={styles?.headerTitle}>Post</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles?.scrollContent}>
                {error ? (
                    <Text style={styles?.errorText}>{error}</Text>
                ) : post ? (
                    <>
                        <PostItem
                            post={post}
                            currentUserId={user?.uid}
                            onLike={handleLike}
                            onAddComment={handleAddComment}
                            onDelete={isHost ? handleDeletePost : undefined}
                            onEdit={isHost ? handleEditPost : undefined}
                        />

                        {/* Host Management */}
                        {isHost && isMeetup && (
                            <View style={styles?.hostSection}>
                                <TouchableOpacity
                                    style={styles?.openChatBtn}
                                    onPress={() => router.push(`/chat/group/${post?._id}`)}
                                >
                                    <MessageCircle size={20} color="#3b82f6" />
                                    <Text style={styles?.openChatText}>Open Group Chat</Text>
                                </TouchableOpacity>

                                <View style={styles?.requestsBox}>
                                    <View style={styles?.requestsHeader}>
                                        <Text style={styles?.requestsTitle}>Pending Requests ({pendingUsers?.length})</Text>
                                    </View>

                                    {loadingRequests ? (
                                        <ActivityIndicator size="small" color="#3b82f6" style={{ padding: 24 }} />
                                    ) : pendingUsers?.length === 0 ? (
                                        <Text style={styles?.noRequestsText}>No pending requests</Text>
                                    ) : (
                                        <View>
                                            {pendingUsers.map(reqUser => (
                                                <View key={reqUser?.uid} style={styles?.requestItem}>
                                                    <TouchableOpacity
                                                        style={styles?.requestInfo}
                                                        onPress={() => router.push(`/profile/${reqUser?.uid}`)}
                                                    >
                                                        <View style={styles?.requestAvatar}>
                                                            {reqUser?.photoURL ? (
                                                                <Image source={{ uri: reqUser?.photoURL }} style={styles?.avatarImage} />
                                                            ) : (
                                                                <UserIcon size={20} color="#64748b" />
                                                            )}
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles?.requestName}>{reqUser?.displayName}</Text>
                                                            <Text style={styles?.requestBio} numberOfLines={1}>{reqUser?.bio || "No bio"}</Text>
                                                        </View>
                                                    </TouchableOpacity>

                                                    <View style={styles?.requestActions}>
                                                        <TouchableOpacity style={styles?.acceptBtn} onPress={() => handleAcceptRequest(reqUser?.uid)}>
                                                            <Check size={16} color="#22c55e" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={styles?.rejectBtn} onPress={() => handleRejectRequest(reqUser?.uid)}>
                                                            <X size={16} color="#ef4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                    </>
                ) : null}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    backButton: { padding: 4, marginLeft: -4 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    errorText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 16 },
    hostSection: { marginTop: 16, gap: 16 },
    openChatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', paddingVertical: 14, borderRadius: 16 },
    openChatText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    requestsBox: { backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', overflow: 'hidden' },
    requestsHeader: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(30, 41, 59, 0.5)', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    requestsTitle: { color: '#fff', fontWeight: 'bold' },
    noRequestsText: { color: '#64748b', textAlign: 'center', padding: 24, fontSize: 14 },
    requestItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    requestInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    requestAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    requestName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    requestBio: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    requestActions: { flexDirection: 'row', gap: 8 },
    acceptBtn: { padding: 8, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
    rejectBtn: { padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' }
});
