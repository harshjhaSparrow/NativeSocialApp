import { useLocalSearchParams, useRouter } from "expo-router";
import { Ban, Briefcase, Check, ChevronRight, Clock, Edit2, Eye, LogOut, MapPin, MessageCircle, Navigation, UserCheck, UserPlus, Users, X, Instagram } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from "react-native";
import * as LocationExpo from 'expo-location';
import { useUserLocation } from "../../components/LocationGuard";
import PostItem from "../../components/PostItem";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { POPULAR_INTERESTS, Post, UserProfile } from "../../types";
import { calculateDistance } from "../../util/location";

export default function UserProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { uid: targetUid } = useLocalSearchParams<{ uid: string }>();
    const { location: myLocation } = useUserLocation();

    const myUid = user?.uid;
    const isOwnProfile = targetUid === myUid || !targetUid;
    const profileUid = targetUid || myUid;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"regular" | "meetup">("regular");
    const [myPosts, setMyPosts] = useState<Post[]>([]);
    const filteredPosts = myPosts?.filter((post) => post?.type === activeTab) || [];

    const [locationName, setLocationName] = useState<string>("");
    const [friendRequests, setFriendRequests] = useState<UserProfile[]>([]);

    // Relationship state
    const [relationship, setRelationship] = useState<"none" | "sent" | "received" | "friend" | "self">("self");
    const [actionLoading, setActionLoading] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);

    // Modals
    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
    const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
    const [sentRequestsList, setSentRequestsList] = useState<UserProfile[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);

    const [viewers, setViewers] = useState<(UserProfile & { viewedAt: number })[]>([]);
    const [isViewersModalOpen, setIsViewersModalOpen] = useState(false);

    const distance = myLocation && profile?.lastLocation
        ? calculateDistance(myLocation?.lat, myLocation?.lng, profile?.lastLocation?.lat, profile?.lastLocation?.lng)
        : null;

    useEffect(() => {
        const fetchData = async () => {
            if (!profileUid) return;
            try {
                const userProfile = await api.profile.get(profileUid);

                // Check blocks
                if (!isOwnProfile && myUid) {
                    const myProfile = await api.profile.get(myUid);
                    if (myProfile?.blockedUsers?.includes(profileUid)) {
                        setIsBlocked(true);
                        setProfile({
                            ...userProfile,
                            bio: "",
                            photoURL: "",
                            displayName: "Blocked User",
                        });
                        setLoading(false);
                        return;
                    }
                }

                setProfile(userProfile);

                if (isOwnProfile && userProfile?.incomingRequests && userProfile?.incomingRequests?.length > 0) {
                    const reqs = await api.profile.getBatch(userProfile?.incomingRequests);
                    setFriendRequests(reqs);
                }

                // Determine relationship
                if (!isOwnProfile && myUid) {
                    if (userProfile?.friends?.includes(myUid)) {
                        setRelationship("friend");
                    } else if (userProfile?.incomingRequests?.includes(myUid)) {
                        setRelationship("sent");
                    } else if (userProfile?.outgoingRequests?.includes(myUid)) {
                        setRelationship("received");
                    } else {
                        setRelationship("none");
                    }
                } else {
                    setRelationship("self");
                }

                // Only fetch posts if not blocked
                const posts = await api.posts.getUserPosts(profileUid);
                setMyPosts(posts);

                // Location name: use stored name, reverse geocode, or omit
                const loc = userProfile?.lastLocation;
                if (loc?.name) {
                    setLocationName(loc.name);
                } else if (loc?.lat && loc?.lng) {
                    try {
                        const results = await LocationExpo.reverseGeocodeAsync({ latitude: loc.lat, longitude: loc.lng });
                        if (results && results.length > 0) {
                            const addr = results[0];
                            const city = addr.city || addr.subregion || addr.district || addr.region || '';
                            const state = addr.region || '';
                            const name = (city && state && city !== state) ? `${city}, ${state}` : city || state || 'Nearby';
                            setLocationName(name);
                            // Cache it so future loads skip geocoding
                            if (profileUid) api.profile.createOrUpdate(profileUid, { lastLocation: { ...loc, name } }).catch(() => { });
                        } else {
                            setLocationName('Nearby');
                        }
                    } catch (_) {
                        setLocationName('Nearby');
                    }
                } else {
                    setLocationName('');
                }

                // Record profile view
                if (!isOwnProfile && myUid && profileUid) {
                    api.profile.recordView(myUid, profileUid);
                }

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [profileUid, isOwnProfile, myUid]);

    useEffect(() => {
        if (isOwnProfile && myUid) {
            api.profile.getViewers(myUid).then(setViewers).catch(console.error);
        }
    }, [isOwnProfile, myUid]);

    const handleLogout = async () => {
        await logout();
        router.replace("/");
    };

    const handleSendRequest = async () => {
        if (!myUid || !profileUid) return;
        setActionLoading(true);
        try {
            await api.friends.sendRequest(myUid, profileUid);
            setRelationship("sent");
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAcceptRequest = async (requesterUid?: string) => {
        const target = requesterUid || profileUid;
        if (!myUid || !target) return;
        setActionLoading(true);
        try {
            await api.friends.acceptRequest(myUid, target);
            if (requesterUid) {
                setFriendRequests((prev) => prev.filter((r) => r?.uid !== requesterUid));
            } else {
                setRelationship("friend");
                setProfile((prev) => prev ? { ...prev, friends: [...(prev?.friends || []), myUid] } : null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectRequest = async (requesterUid?: string) => {
        const target = requesterUid || profileUid;
        if (!myUid || !target) return;
        setActionLoading(true);
        try {
            await api.friends.rejectRequest(myUid, target);
            if (requesterUid) {
                setFriendRequests((prev) => prev.filter((r) => r?.uid !== requesterUid));
            } else {
                setRelationship("none");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveFriend = () => {
        Alert.alert("Remove Friend", "Are you sure you want to remove this friend?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Remove", style: "destructive", onPress: async () => {
                    if (!myUid || !profileUid) return;
                    setActionLoading(true);
                    try {
                        await api.friends.removeFriend(myUid, profileUid);
                        setRelationship("none");
                        setProfile((prev) => prev ? { ...prev, friends: prev?.friends?.filter(f => f !== myUid) } : null);
                    } catch (e) {
                        console.error(e);
                    } finally {
                        setActionLoading(false);
                    }
                }
            }
        ]);
    };

    const handleBlockUser = () => {
        Alert.alert("Block User", "They won't be able to see your posts or profile.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Block", style: "destructive", onPress: async () => {
                    if (!myUid || !profileUid) return;
                    try {
                        await api.userAction.block(myUid, profileUid);
                        router.back();
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        ]);
    };

    const handleOpenFriendsList = async () => {
        if (!profile) return;
        setFriendsList([]);
        setSentRequestsList([]);
        setIsFriendsModalOpen(true);
        setFriendsLoading(true);


        try {
            const friendsIds = profile.friends || [];
            const friendsData = await api.profile.getBatch(friendsIds);
            setFriendsList(friendsData);

            // only show sent requests on your own profile
            const pendingIds = isOwnProfile ? profile.outgoingRequests || [] : [];

            if (pendingIds.length > 0) {
                const pendingData = await api.profile.getBatch(pendingIds);
                setSentRequestsList(pendingData);
            } else {
                setSentRequestsList([]);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setFriendsLoading(false);
        }
    };
    const handleLike = async (post: Post) => {
        if (!myUid || !post?._id) return;
        const isLiked = post?.likedBy?.includes(myUid);
        const newLikes = isLiked ? post?.likes - 1 : post?.likes + 1;
        const newLikedBy = isLiked
            ? post?.likedBy?.filter((id) => id !== myUid) || []
            : [...(post?.likedBy || []), myUid];

        setMyPosts((current) => current.map((p) => p?._id === post?._id ? { ...p, likes: newLikes, likedBy: newLikedBy } : p));
        try {
            const updatedData = await api.posts.toggleLike(post?._id, myUid);
            setMyPosts((current) => current.map((p) => p?._id === post?._id ? { ...p, likes: updatedData?.likes, likedBy: updatedData?.likedBy } : p));
        } catch (e) {
            // revert
        }
    };

    const handleAddComment = async (postId: string, text: string) => {
        if (!myUid) return;
        try {
            const newComment = await api.posts.addComment(postId, myUid, text);
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
                    if (!myUid) return;
                    await api.posts.deletePost(postId, myUid);
                    setMyPosts((prev) => prev.filter((p) => p?._id !== postId));
                }
            }
        ]);
    };

    if (loading || !profile) {
        return (
            <View style={styles?.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (isBlocked) {
        return (
            <View style={styles?.center}>
                <Ban size={48} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 20, marginTop: 16 }}>You have blocked this user</Text>
            </View>
        );
    }

    return (
        <View style={styles?.container}>
            <ScrollView contentContainerStyle={styles?.scrollContent}>
                {/* Header Cover */}
                <View style={styles?.coverPhoto}>
                    {isOwnProfile && (
                        <TouchableOpacity style={styles?.logoutButton} onPress={handleLogout}>
                            <LogOut size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                    {!isOwnProfile && (
                        <TouchableOpacity style={styles?.blockButton} onPress={handleBlockUser}>
                            <Ban size={20} color="#ef4444" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Profile Info Card */}
                <View style={styles?.profileCard}>
                    <View style={styles?.avatarContainer}>
                        {profile?.photoURL ? (
                            <Image source={{ uri: profile?.photoURL }} style={styles?.avatarImage} />
                        ) : (
                            <Text style={styles?.avatarText}>{profile.displayName?.[0] || "U"}</Text>
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
                        {locationName ? (
                            <View style={styles?.infoPill}>
                                <MapPin size={14} color="#3b82f6" />
                                <Text style={[styles?.infoPillText, { color: '#94a3b8' }]}>
                                    {locationName}
                                    {!isOwnProfile && distance ? ` • ${distance} away` : ''}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles?.statsRow}>
                        <TouchableOpacity style={styles?.statButton} onPress={handleOpenFriendsList}>
                            <Users size={16} color="#94a3b8" />
                            <Text style={styles?.statNumber}>{profile?.friends?.length || 0}</Text>
                            <Text style={styles?.statLabel}>Friends</Text>
                        </TouchableOpacity>
                        {isOwnProfile && (
                            <TouchableOpacity style={styles?.statButton} onPress={() => setIsViewersModalOpen(true)}>
                                <Eye size={16} color="#94a3b8" />
                                <Text style={styles?.statNumber}>{viewers?.length || 0}</Text>
                                <Text style={styles?.statLabel}>Views</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles?.actionButtons}>
                        {isOwnProfile ? (
                            <TouchableOpacity style={styles?.editButton} onPress={() => router.push('/edit-profile')}>
                                <Edit2 size={16} color="#e2e8f0" />
                                <Text style={styles?.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                {relationship === "none" && (
                                    <TouchableOpacity style={[styles?.actionBtn, styles?.primaryBtn]} onPress={handleSendRequest} disabled={actionLoading}>
                                        {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <UserPlus size={20} color="#fff" />}
                                        <Text style={styles?.primaryBtnText}>Add Friend</Text>
                                    </TouchableOpacity>
                                )}
                                {relationship === "sent" && (
                                    <TouchableOpacity style={[styles?.actionBtn, styles?.secondaryBtn]} disabled>
                                        <Clock size={20} color="#94a3b8" />
                                        <Text style={styles?.secondaryBtnText}>Request Sent</Text>
                                    </TouchableOpacity>
                                )}
                                {relationship === "received" && (
                                    <TouchableOpacity style={[styles?.actionBtn, styles?.successBtn]} onPress={() => handleAcceptRequest()} disabled={actionLoading}>
                                        {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <UserCheck size={20} color="#fff" />}
                                        <Text style={styles?.primaryBtnText}>Accept Request</Text>
                                    </TouchableOpacity>
                                )}
                                {relationship === "friend" && (
                                    <>
                                        <TouchableOpacity style={[styles?.actionBtn, styles?.outlineBtn]} onPress={handleRemoveFriend} disabled={actionLoading}>
                                            <Check size={20} color="#3b82f6" />
                                            <Text style={styles?.outlineBtnText}>Friends</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles?.actionBtn, styles?.primaryBtn]} onPress={() => router.push(`/chat/${profileUid}`)}>
                                            <MessageCircle size={20} color="#fff" />
                                            <Text style={styles?.primaryBtnText}>Message</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </>
                        )}
                        {profile?.instagramHandle && (
                            <TouchableOpacity
                                style={[styles?.actionBtn, { backgroundColor: '#e1306c', borderColor: '#e1306c' }]}
                                onPress={() => Linking.openURL(`https://instagram.com/${profile.instagramHandle}`)}
                            >
                                <Instagram size={20} color="#fff" />
                                <Text style={styles?.primaryBtnText}>Instagram</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Friend Requests */}
                {isOwnProfile && friendRequests?.length > 0 && (
                    <View style={styles?.requestsSection}>
                        <Text style={styles?.sectionHeader}>Friend Requests</Text>
                        {friendRequests.map(req => (
                            <View key={req?.uid} style={styles?.requestItem}>
                                <TouchableOpacity style={styles?.requestInfo} onPress={() => router.push(`/profile/${req?.uid}` as any)}>
                                    <View style={styles?.requestAvatar}>
                                        {req?.photoURL ? <Image source={{ uri: req?.photoURL }} style={styles?.avatarImage} /> : <Text style={{ color: '#94a3b8' }}>{req?.displayName?.[0]}</Text>}
                                    </View>
                                    <Text style={styles?.requestName}>{req?.displayName}</Text>
                                </TouchableOpacity>
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
                        <Text style={styles?.postsTitle}>Posts</Text>
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
                                currentUserId={myUid}
                                onLike={handleLike}
                                onAddComment={handleAddComment}
                                onDelete={isOwnProfile ? handleDeletePost : undefined}
                                onEdit={isOwnProfile ? (id: string) => router.push(`/edit-post/${id}` as any) : undefined}
                            />
                        ))
                    )}
                </View>

            </ScrollView>

            {/* Modals */}
            {isFriendsModalOpen && (
                <View style={styles.modalOverlay} pointerEvents="box-none">

                    {/* Backdrop */}
                    <TouchableOpacity
                        style={styles?.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setIsFriendsModalOpen(false)}
                    />

                    <View style={styles?.centeredModal}>

                        {/* Header */}
                        <View style={styles?.modalHeader}>
                            <Text style={styles?.modalTitle}>Friends</Text>

                            <TouchableOpacity
                                onPress={() => setIsFriendsModalOpen(false)}
                                style={{ padding: 6 }}
                            >
                                <X size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        {/* Body */}
                        <ScrollView
                            style={styles.modalBody}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >
                            {friendsLoading ? (
                                <ActivityIndicator
                                    size="large"
                                    color="#3b82f6"
                                    style={{ marginTop: 30 }}
                                />
                            ) : (
                                <>
                                    {/* Pending Requests */}
                                    {isOwnProfile && sentRequestsList?.length > 0 && (
                                        <View style={{ marginBottom: 20 }}>

                                            <Text style={styles?.modalSectionLabel}>
                                                PENDING REQUESTS
                                            </Text>

                                            {sentRequestsList?.map(req => (
                                                <View key={req?.uid} style={styles?.modalListItemPending}>

                                                    <View style={styles?.modalListAvatar}>
                                                        {req?.photoURL ? (
                                                            <Image
                                                                source={{ uri: req?.photoURL }}
                                                                style={styles?.modalAvatarImage}
                                                            />
                                                        ) : (
                                                            <Text style={styles?.modalAvatarText}>
                                                                {req?.displayName?.[0]}
                                                            </Text>
                                                        )}
                                                    </View>

                                                    <Text style={styles?.modalFriendName}>
                                                        {req?.displayName}
                                                    </Text>

                                                    <Text style={styles?.sentBadgeText}>Sent</Text>

                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Friends List */}
                                    {friendsList?.length === 0 ? (
                                        <View style={styles?.modalEmptyContainer}>
                                            <Users size={42} color="#475569" />
                                            <Text style={styles?.modalEmptyText}>
                                                No friends yet
                                            </Text>
                                        </View>
                                    ) : (
                                        friendsList?.map(friend => (
                                            <TouchableOpacity
                                                key={friend?.uid}
                                                style={styles?.modalFriendCard}
                                                activeOpacity={0.9}
                                                onPress={() => {
                                                    setIsFriendsModalOpen(false);
                                                    router.push(`/profile/${friend?.uid}` as any);
                                                }}
                                            >

                                                {/* Avatar */}
                                                <View style={styles?.modalListAvatarLarge}>
                                                    {friend?.photoURL ? (
                                                        <Image
                                                            source={{ uri: friend?.photoURL }}
                                                            style={styles?.modalAvatarImage}
                                                        />
                                                    ) : (
                                                        <Text style={styles?.modalAvatarTextLarge}>
                                                            {friend?.displayName?.[0]}
                                                        </Text>
                                                    )}
                                                </View>

                                                {/* Name + Bio */}
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles?.modalFriendName}>
                                                        {friend?.displayName}
                                                    </Text>

                                                    <Text
                                                        numberOfLines={1}
                                                        style={styles?.modalFriendBio}
                                                    >
                                                        {friend?.bio || "No bio"}
                                                    </Text>
                                                </View>

                                                {/* Action */}
                                                {isOwnProfile ? (
                                                    <TouchableOpacity
                                                        style={styles?.modalMsgBtn}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            setIsFriendsModalOpen(false);
                                                            router.push(`/chat/${friend?.uid}`);
                                                        }}
                                                    >
                                                        <MessageCircle size={18} color="#fff" />
                                                    </TouchableOpacity>
                                                ) : (
                                                    <ChevronRight size={20} color="#64748b" />
                                                )}

                                            </TouchableOpacity>
                                        ))
                                    )}
                                </>
                            )}
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
                                <TouchableOpacity key={v?.uid + i} style={styles?.modalListItem} onPress={() => { setIsViewersModalOpen(false); router.push(`/profile/${v?.uid}` as any); }}>
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
                                </TouchableOpacity>
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
    blockButton: { position: 'absolute', top: 50, right: 16, backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: 10, borderRadius: 20 },
    profileCard: { backgroundColor: '#0f172a', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -32, padding: 24, paddingTop: 60, alignItems: 'center', borderWidth: 1, borderColor: '#1e293b' },
    avatarContainer: { position: 'absolute', top: -50, width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#0f172a', backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
    avatarText: { color: '#3b82f6', fontSize: 32, fontWeight: 'bold' },
    onlineBadge: { position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#22c55e', borderWidth: 4, borderColor: '#0f172a' },
    displayName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoPillText: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
    distanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)', marginBottom: 16 },
    distanceText: { color: '#60a5fa', fontSize: 12, fontWeight: 'bold' },
    statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, width: '100%', marginVertical: 16 },
    statButton: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, alignItems: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: '#334155' },
    statNumber: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    statLabel: { color: '#94a3b8', fontSize: 14 },
    actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, justifyContent: 'center' },
    editButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
    editButtonText: { color: '#e2e8f0', fontWeight: 'bold' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
    primaryBtn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    primaryBtnText: { color: '#fff', fontWeight: 'bold' },
    secondaryBtn: { backgroundColor: '#1e293b', borderColor: '#334155' },
    secondaryBtnText: { color: '#94a3b8', fontWeight: 'bold' },
    successBtn: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    outlineBtn: { backgroundColor: 'transparent', borderColor: '#3b82f6', borderWidth: 2 },
    outlineBtnText: { color: '#60a5fa', fontWeight: 'bold' },
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
    requestInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
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
    modalListItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#1e293b', borderRadius: 12, marginBottom: 8 },
    modalListAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#334155', marginRight: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    modalAvatarImage: { width: '100%', height: '100%' },
    modalAvatarText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' },
    modalFriendName: { color: '#fff', fontSize: 16, flex: 1 },
    modalMsgBtn: { backgroundColor: '#2563eb', padding: 10, borderRadius: 20, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    modalMsgBtnText: { color: '#3b82f6', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
    modalSectionDivider: { height: 1, backgroundColor: '#1e293b', marginBottom: 12 },
    modalSectionLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
    sentBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.3)' },
    sentBadgeText: { color: '#fbbf24', fontSize: 10, fontWeight: 'bold' },
    modalEmptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 20 },
    modalFriendCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 18,
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "#334155",
        marginBottom: 10
    },

    modalListItemPending: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        borderRadius: 16,
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "#334155",
        opacity: 0.7,
        marginBottom: 8
    },

    modalListAvatarLarge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#0f172a",
        marginRight: 10,
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center"
    },

    modalAvatarTextLarge: {
        color: "#94a3b8",
        fontWeight: "bold",
        fontSize: 18
    },

    modalFriendBio: {
        fontSize: 12,
        color: "#94a3b8"
    },

    modalEmptyContainer: {
        alignItems: "center",
        paddingVertical: 40
    }
});
