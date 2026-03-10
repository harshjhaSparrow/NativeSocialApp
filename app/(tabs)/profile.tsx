import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Briefcase, MapPin, Navigation, Users, Eye, Edit2, UserPlus, LogOut, Check, MessageCircle, MoreVertical, Flag, Ban, X, Clock, UserCheck } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useUserLocation } from "../../components/LocationGuard";
import { calculateDistance } from "../../util/location";
import { Post, UserProfile, POPULAR_INTERESTS } from "../../types";
import PostItem from "../../components/PostItem";

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { location: myLocation } = useUserLocation();

    // Assuming this represents our own profile in the tabs.
    // We'll rename this to (tabs)/profile.tsx which means it's my profile.
    // Reusable for /profile/[uid] if parameterized but tabs index has no params.
    const uid = user?.uid;
    const isOwnProfile = true;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"regular" | "meetup">("regular");
    const [myPosts, setMyPosts] = useState<Post[]>([]);
    const filteredPosts = myPosts?.filter((post) => post?.type === activeTab);

    const [locationName, setLocationName] = useState<string>("Unknown Location");
    const [friendRequests, setFriendRequests] = useState<UserProfile[]>([]);

    // Modals
    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
    const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
    const [sentRequestsList, setSentRequestsList] = useState<UserProfile[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);

    const [viewers, setViewers] = useState<(UserProfile & { viewedAt: number })[]>([]);
    const [isViewersModalOpen, setIsViewersModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (uid) {
                try {
                    const userProfile = await api.profile.get(uid);
                    setProfile(userProfile);

                    if (userProfile?.incomingRequests && userProfile?.incomingRequests?.length > 0) {
                        const reqs = await api.profile.getBatch(userProfile?.incomingRequests);
                        setFriendRequests(reqs);
                    }

                    const posts = await api.posts.getUserPosts(uid);
                    setMyPosts(posts);

                    // Location Name logic (simplified to skip reverse geocoding if unavailable)
                    if (userProfile?.lastLocation?.name) {
                        setLocationName(userProfile?.lastLocation?.name);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [uid]);

    useEffect(() => {
        if (uid) {
            api.profile.getViewers(uid).then(setViewers).catch(console.error);
        }
    }, [uid]);

    const handleLogout = async () => {
        await logout();
        router.replace("/");
    };

    const handleAcceptRequest = async (requesterUid: string) => {
        if (!user) return;
        try {
            await api.friends.acceptRequest(user?.uid, requesterUid);
            setFriendRequests((prev) => prev.filter((r) => r?.uid !== requesterUid));
            setProfile((prev) => prev ? {
                ...prev,
                incomingRequests: prev?.incomingRequests?.filter((id) => id !== requesterUid),
                friends: [...(prev?.friends || []), requesterUid]
            } : null);
        } catch (e) {
            console.error(e);
        }
    };

    const handleRejectRequest = async (requesterUid: string) => {
        if (!user) return;
        try {
            await api.friends.rejectRequest(user?.uid, requesterUid);
            setFriendRequests((prev) => prev.filter((r) => r?.uid !== requesterUid));
            setProfile((prev) => prev ? {
                ...prev,
                incomingRequests: prev?.incomingRequests?.filter((id) => id !== requesterUid)
            } : null);
        } catch (e) {
            console.error(e);
        }
    };

    const handleOpenFriendsList = async () => {
        if (!profile) return;
        setIsFriendsModalOpen(true);
        setFriendsLoading(true);
        try {
            const friendsIds = profile?.friends || [];
            const friendsData = await api.profile.getBatch(friendsIds);
            setFriendsList(friendsData);

            const pendingIds = profile?.outgoingRequests || [];
            const pendingData = await api.profile.getBatch(pendingIds);
            setSentRequestsList(pendingData);
        } catch (e) {
            console.error(e);
        } finally {
            setFriendsLoading(false);
        }
    };

    const handleLike = async (post: Post) => {
        if (!user || !post?._id) return;
        const isLiked = post?.likedBy?.includes(user?.uid);
        const newLikes = isLiked ? post?.likes - 1 : post?.likes + 1;
        const newLikedBy = isLiked
            ? post?.likedBy?.filter((id) => id !== user?.uid) || []
            : [...(post?.likedBy || []), user?.uid];

        setMyPosts((current) => current.map((p) => p?._id === post?._id ? { ...p, likes: newLikes, likedBy: newLikedBy } : p));
        try {
            const updatedData = await api.posts.toggleLike(post?._id, user?.uid);
            setMyPosts((current) => current.map((p) => p?._id === post?._id ? { ...p, likes: updatedData?.likes, likedBy: updatedData?.likedBy } : p));
        } catch (e) {
            // revert
        }
    };

    const handleAddComment = async (postId: string, text: string) => {
        if (!user) return;
        try {
            const newComment = await api.posts.addComment(postId, user?.uid, text);
            setMyPosts((current) => current.map((p) => p?._id === postId ? { ...p, comments: [...(p?.comments || []), newComment] } : p));
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeletePost = (postId: string) => {
        Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    if (!user) return;
                    await api.posts.deletePost(postId, user?.uid);
                    setMyPosts((prev) => prev.filter((p) => p?._id !== postId));
                }
            }
        ]);
    };

    const handleEditPost = (postId: string) => {
        router.push(`/edit-post/${postId}`);
    };

    if (loading || !profile) {
        return (
            <View style={styles?.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={styles?.container}>
            <ScrollView contentContainerStyle={styles?.scrollContent}>

                {/* Header Cover */}
                <View style={styles?.coverPhoto}>
                    <TouchableOpacity style={styles?.logoutButton} onPress={handleLogout}>
                        <LogOut size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Profile Info Card */}
                <View style={styles?.profileCard}>
                    <View style={styles?.avatarContainer}>
                        {profile?.photoURL ? (
                            <Image source={{ uri: profile?.photoURL }} style={styles?.avatarImage} />
                        ) : (
                            <Text style={styles?.avatarText}>{profile?.displayName?.[0]}</Text>
                        )}
                        <View style={styles?.onlineBadge} />
                    </View>

                    <Text style={styles?.displayName}>{profile?.displayName}</Text>

                    <View style={styles?.infoRow}>
                        {profile?.jobRole && (
                            <View style={styles?.infoPill}>
                                <Briefcase size={14} color="#e2e8f0" />
                                <Text style={styles?.infoPillText}>{profile?.jobRole}</Text>
                            </View>
                        )}
                        <View style={styles?.infoPill}>
                            <MapPin size={14} color="#3b82f6" />
                            <Text style={[styles?.infoPillText, { color: '#94a3b8' }]}>{locationName}</Text>
                        </View>
                    </View>

                    <View style={styles?.statsRow}>
                        <TouchableOpacity style={styles?.statButton} onPress={handleOpenFriendsList}>
                            <Users size={16} color="#94a3b8" />
                            <Text style={styles?.statNumber}>{profile?.friends?.length || 0}</Text>
                            <Text style={styles?.statLabel}>Friends</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles?.statButton} onPress={() => setIsViewersModalOpen(true)}>
                            <Eye size={16} color="#94a3b8" />
                            <Text style={styles?.statNumber}>{viewers?.length || 0}</Text>
                            <Text style={styles?.statLabel}>Views</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles?.actionButtons}>
                        <TouchableOpacity style={styles?.editButton} onPress={() => router.push('/edit-profile')}>
                            <Edit2 size={16} color="#e2e8f0" />
                            <Text style={styles?.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Friend Requests */}
                {friendRequests?.length > 0 && (
                    <View style={styles?.requestsSection}>
                        <Text style={styles?.sectionHeader}>Friend Requests</Text>
                        {friendRequests.map(req => (
                            <View key={req?.uid} style={styles?.requestItem}>
                                <View style={styles?.requestInfo}>
                                    <View style={styles?.requestAvatar}>
                                        {req?.photoURL ? <Image source={{ uri: req?.photoURL }} style={styles?.avatarImage} /> : <Text style={{ color: '#94a3b8' }}>{req?.displayName?.[0]}</Text>}
                                    </View>
                                    <Text style={styles?.requestName}>{req?.displayName}</Text>
                                </View>
                                <View style={styles?.requestActions}>
                                    <TouchableOpacity style={styles?.acceptBtn} onPress={() => handleAcceptRequest(req?.uid)}>
                                        <Check size={16} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles?.rejectBtn} onPress={() => handleRejectRequest(req?.uid)}>
                                        <X size={16} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Bio */}
                <View style={styles?.section}>
                    <Text style={styles?.sectionHeader}>About Me</Text>
                    <Text style={styles?.bioText}>{profile?.bio || "No bio yet."}</Text>
                </View>

                {/* Interests */}
                <View style={styles?.section}>
                    <Text style={styles?.sectionHeader}>Interests</Text>
                    <View style={styles?.tagsContainer}>
                        {(profile.interests || []).map(id => {
                            const tag = POPULAR_INTERESTS.find(i => i?.id === id);
                            return (
                                <View key={id} style={styles?.tag}>
                                    <Text style={styles?.tagText}>{tag ? `${tag?.emoji} ${tag?.label}` : id}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Posts */}
                <View style={styles?.postsSection}>
                    <View style={styles?.postsHeaderRow}>
                        <Text style={styles?.postsTitle}>My Posts</Text>
                        <View style={styles?.tabsContainer}>
                            <TouchableOpacity style={[styles?.tabBtn, activeTab === 'regular' && styles?.tabBtnActive]} onPress={() => setActiveTab('regular')}>
                                <Text style={[styles?.tabText, activeTab === 'regular' && styles?.tabTextActive]}>Regular</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles?.tabBtn, activeTab === 'meetup' && styles?.tabBtnActive]} onPress={() => setActiveTab('meetup')}>
                                <Text style={[styles?.tabText, activeTab === 'meetup' && styles?.tabTextActive]}>Meetups</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {filteredPosts?.length === 0 ? (
                        <View style={styles?.emptyPostsBox}>
                            <Edit2 size={32} color="#475569" />
                            <Text style={styles?.emptyPostsText}>No {activeTab} posts yet</Text>
                        </View>
                    ) : (
                        filteredPosts.map(post => (
                            <PostItem
                                key={post?._id}
                                post={post}
                                currentUserId={user?.uid}
                                onLike={handleLike}
                                onAddComment={handleAddComment}
                                onDelete={handleDeletePost}
                                onEdit={handleEditPost}
                            />
                        ))
                    )}
                </View>

            </ScrollView>

            {/* Basic Modals mapped to Alert or full screen... for now we use simple Alerts or inline views if needed. 
          The web version has big modals for friends and viewers. Let's just create a simplified version using an absolute View.
      */}
            {isFriendsModalOpen && (
                <View style={styles?.modalOverlay}>
                    <TouchableOpacity style={styles?.modalBackdrop} onPress={() => setIsFriendsModalOpen(false)} />
                    <View style={styles?.centeredModal}>
                        <View style={styles?.modalHeader}>
                            <Text style={styles?.modalTitle}>Friends</Text>
                            <TouchableOpacity onPress={() => setIsFriendsModalOpen(false)}>
                                <X size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles?.modalBody}>
                            {friendsList.map(f => (
                                <View key={f?.uid} style={styles?.modalListItem}>
                                    <View style={styles?.modalListAvatar}>
                                        {f?.photoURL ? (
                                            <Image source={{ uri: f?.photoURL }} style={styles?.modalAvatarImage} />
                                        ) : (
                                            <Text style={styles?.modalAvatarText}>{f?.displayName?.[0]}</Text>
                                        )}
                                    </View>
                                    <Text style={{ color: '#fff', fontSize: 16 }}>{f?.displayName}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            {isViewersModalOpen && (
                <View style={styles?.modalOverlay}>
                    <TouchableOpacity style={styles?.modalBackdrop} onPress={() => setIsViewersModalOpen(false)} />
                    <View style={styles?.centeredModal}>
                        <View style={styles?.modalHeader}>
                            <Text style={styles?.modalTitle}>Profile Views</Text>
                            <TouchableOpacity onPress={() => setIsViewersModalOpen(false)}>
                                <X size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles?.modalBody}>
                            {viewers.map((v, i) => (
                                <View key={v?.uid + i} style={styles?.modalListItem}>
                                    <View style={styles?.modalListAvatar}>
                                        {v?.photoURL ? (
                                            <Image source={{ uri: v?.photoURL }} style={styles?.modalAvatarImage} />
                                        ) : (
                                            <Text style={styles?.modalAvatarText}>{v?.displayName?.[0]}</Text>
                                        )}
                                    </View>
                                    <View>
                                        <Text style={{ color: '#fff', fontSize: 16 }}>{v?.displayName}</Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>Viewed: {new Date(v.viewedAt).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    scrollContent: { paddingBottom: 100 },
    coverPhoto: { height: 160, backgroundColor: '#1e293b', position: 'relative' },
    logoutButton: { position: 'absolute', top: 50, right: 16, backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: 10, borderRadius: 20 },
    profileCard: { backgroundColor: '#0f172a', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -32, padding: 24, paddingTop: 60, alignItems: 'center', borderWidth: 1, borderColor: '#1e293b' },
    avatarContainer: { position: 'absolute', top: -50, width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#0f172a', backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
    avatarText: { color: '#3b82f6', fontSize: 32, fontWeight: 'bold' },
    onlineBadge: { position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#22c55e', borderWidth: 4, borderColor: '#0f172a' },
    displayName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoPillText: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
    statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, width: '100%', marginVertical: 16 },
    statButton: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, alignItems: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: '#334155' },
    statNumber: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    statLabel: { color: '#94a3b8', fontSize: 14 },
    actionButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
    editButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
    editButtonText: { color: '#e2e8f0', fontWeight: 'bold' },
    section: { padding: 24, borderTopWidth: 1, borderTopColor: '#1e293b' },
    sectionHeader: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    bioText: { color: '#e2e8f0', fontSize: 16, lineHeight: 24 },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    tagText: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
    postsSection: { padding: 16, backgroundColor: '#020617' },
    postsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    postsTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    tabsContainer: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
    tabBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    tabBtnActive: { backgroundColor: '#3b82f6' },
    tabText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
    tabTextActive: { color: '#fff' },
    emptyPostsBox: { backgroundColor: '#0f172a', padding: 32, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#1e293b' },
    emptyPostsText: { color: '#94a3b8', fontSize: 16, fontWeight: '500', marginTop: 12 },
    requestsSection: { padding: 16, backgroundColor: 'rgba(249, 115, 22, 0.1)' },
    requestItem: { backgroundColor: '#0f172a', padding: 12, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#1e293b' },
    requestInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    requestAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    requestName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    requestActions: { flexDirection: 'row', gap: 8 },
    acceptBtn: { backgroundColor: '#3b82f6', padding: 8, borderRadius: 12 },
    rejectBtn: { backgroundColor: '#1e293b', padding: 8, borderRadius: 12 },
    modalOverlay: { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalBackdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)' },
    centeredModal: { width: '85%', backgroundColor: '#0f172a', borderRadius: 24, maxHeight: '70%', borderWidth: 1, borderColor: '#1e293b' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    modalBody: { padding: 16, paddingBottom: 0 },
    modalListItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 8 },
    modalListAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#334155', marginRight: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    modalAvatarImage: { width: '100%', height: '100%' },
    modalAvatarText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' }
});
