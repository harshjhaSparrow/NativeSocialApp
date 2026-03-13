/* eslint-disable @typescript-eslint/no-unused-vars */
import * as LocationExpo from "expo-location";
import { useRouter, useFocusEffect } from "expo-router";
import {
  Briefcase,
  Check,
  Clock,
  Edit2,
  Eye,
  Instagram,
  LogOut,
  MapPin,
  MessageCircle,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useUserLocation } from "../../components/LocationGuard";
import PostItem from "../../components/PostItem";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { POPULAR_INTERESTS, Post, UserProfile } from "../../types";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Assuming this represents our own profile in the tabs.
  // We'll rename this to (tabs)/profile.tsx which means it's my profile.
  // Reusable for /profile/[uid] if parameterized but tabs index has no params.
  const uid = user?.uid;
  const isOwnProfile = true;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"regular" | "meetup">("regular");
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const filteredPosts = useMemo(() => {
    return myPosts?.filter((post) => post?.type === activeTab);
  }, [myPosts, activeTab]);

  const [locationName, setLocationName] = useState<string>("");
  const [friendRequests, setFriendRequests] = useState<UserProfile[]>([]);

  // Modals
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [sentRequestsList, setSentRequestsList] = useState<UserProfile[]>([]);
  const [incomingRequestsList, setIncomingRequestsList] = useState<
    UserProfile[]
  >([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<
    "friends" | "incoming" | "sent"
  >("friends");

  const [viewers, setViewers] = useState<
    (UserProfile & { viewedAt: number })[]
  >([]);
  const [isViewersModalOpen, setIsViewersModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!uid) return;

    let mounted = true;

    try {
      setLoading(true);

      const userProfile = await api.profile.get(uid);
      if (!mounted) return;

      setProfile(userProfile);

      if (userProfile?.incomingRequests?.length) {
        const reqs = await api.profile.getBatch(userProfile?.incomingRequests);
        if (mounted) setFriendRequests(reqs);
      }

      const posts = await api.posts.getUserPosts(uid);
      if (mounted) setMyPosts(posts);

      const loc = userProfile?.lastLocation;

      if (loc?.name) {
        setLocationName(loc?.name);
      } else if (loc?.lat && loc?.lng) {
        try {
          const results = await LocationExpo.reverseGeocodeAsync({
            latitude: loc?.lat,
            longitude: loc?.lng,
          });

          if (results?.length) {
            const addr = results?.[0];
            const city = addr?.city || addr?.subregion || addr?.district || "";
            const state = addr?.region || "";

            const name =
              city && state && city !== state
                ? `${city}, ${state}`
                : city || state || "Nearby";

            setLocationName(name);

            api.profile
              .createOrUpdate(uid, {
                lastLocation: { ...loc, name },
              })
              .catch(() => {});
          } else {
            setLocationName("Nearby");
          }
        } catch {
          setLocationName("Nearby");
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      if (mounted) setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

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
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              incomingRequests: prev?.incomingRequests?.filter(
                (id) => id !== requesterUid,
              ),
              friends: [...(prev?.friends || []), requesterUid],
            }
          : null,
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectRequest = async (requesterUid: string) => {
    if (!user) return;
    try {
      await api.friends.rejectRequest(user?.uid, requesterUid);
      setFriendRequests((prev) => prev.filter((r) => r?.uid !== requesterUid));
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              incomingRequests: prev?.incomingRequests?.filter(
                (id) => id !== requesterUid,
              ),
            }
          : null,
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenFriendsList = async () => {
    if (!profile) return;
    setIsFriendsModalOpen(true);
    setFriendsLoading(true);
    setActiveModalTab("friends");
    try {
      const [friendsData, incomingData, sentData] = await Promise.all([
        api.profile.getBatch(profile?.friends || []),
        api.profile.getBatch(profile?.incomingRequests || []),
        api.profile.getBatch(profile?.outgoingRequests || []),
      ]);
      setFriendsList(friendsData);
      setIncomingRequestsList(incomingData);
      setSentRequestsList(sentData);
    } catch (e) {
      console.error(e);
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleAcceptFromModal = async (requesterUid: string) => {
    if (!user) return;
    try {
      await api.friends.acceptRequest(user?.uid, requesterUid);
      const accepted = incomingRequestsList.find(
        (r) => r?.uid === requesterUid,
      );
      setIncomingRequestsList((prev) =>
        prev.filter((r) => r?.uid !== requesterUid),
      );
      setFriendRequests((prev) => prev.filter((r) => r?.uid !== requesterUid));
      if (accepted) setFriendsList((prev) => [...prev, accepted]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectFromModal = async (requesterUid: string) => {
    if (!user) return;
    try {
      await api.friends.rejectRequest(user?.uid, requesterUid);
      setIncomingRequestsList((prev) =>
        prev.filter((r) => r?.uid !== requesterUid),
      );
      setFriendRequests((prev) => prev.filter((r) => r?.uid !== requesterUid));
    } catch (e) {
      console.error(e);
    }
  };

  const handleWithdrawRequest = async (targetUid: string) => {
    if (!user) return;
    try {
      // Reuse reject endpoint — removes the request from both sides
      await api.friends.rejectRequest(targetUid, user?.uid);
      setSentRequestsList((prev) => prev.filter((r) => r?.uid !== targetUid));
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              outgoingRequests: prev?.outgoingRequests?.filter(
                (id) => id !== targetUid,
              ),
            }
          : null,
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleLike = useCallback(
    async (post: any) => {
      if (!user || !post?._id) return;

      const isLiked = post?.likedBy?.includes(user?.uid);

      const newLikes = isLiked ? post?.likes - 1 : post?.likes + 1;

      const newLikedBy = isLiked
        ? post?.likedBy.filter((id: any) => id !== user?.uid)
        : [...(post?.likedBy || []), user?.uid];

      setMyPosts((current) =>
        current.map((p) =>
          p?._id === post?._id
            ? { ...p, likes: newLikes, likedBy: newLikedBy }
            : p,
        ),
      );

      try {
        const updated = await api.posts.toggleLike(post?._id, user?.uid);

        setMyPosts((current) =>
          current.map((p) =>
            p?._id === post?._id
              ? { ...p, likes: updated?.likes, likedBy: updated?.likedBy }
              : p,
          ),
        );
      } catch (e) {
        console.error(e);
      }
    },
    [user],
  );

  const handleAddComment = async (postId: string, text: string) => {
    if (!user) return;
    try {
      const newComment = await api.posts.addComment(postId, user?.uid, text);
      setMyPosts((current) =>
        current.map((p) =>
          p?._id === postId
            ? { ...p, comments: [...(p?.comments || []), newComment] }
            : p,
        ),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!user) return;
          try {
            await api.posts.deletePost(postId, user?.uid);

            setMyPosts((prev) => prev.filter((p) => p?._id !== postId));
          } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to delete post");
          }
          setMyPosts((prev) => prev.filter((p) => p?._id !== postId));
        },
      },
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
      <ScrollView
        contentContainerStyle={styles?.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} />
        }
      >
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
              <Image
                source={{ uri: profile?.photoURL }}
                style={styles?.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles?.avatarText}>
                {profile?.displayName?.charAt(0)?.toUpperCase() || "U"}
              </Text>
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
                <Text style={[styles?.infoPillText, { color: "#94a3b8" }]}>
                  {locationName}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles?.statsRow}>
            <TouchableOpacity
              style={styles?.statButton}
              onPress={handleOpenFriendsList}
            >
              <Users size={16} color="#94a3b8" />
              <Text style={styles?.statNumber}>
                {profile?.friends?.length || 0}
              </Text>
              <Text style={styles?.statLabel}>Friends</Text>
              {friendRequests?.length > 0 && (
                <View style={styles?.requestBadge}>
                  <Text style={styles?.requestBadgeText}>
                    {friendRequests?.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles?.statButton}
              onPress={() => setIsViewersModalOpen(true)}
            >
              <Eye size={16} color="#94a3b8" />
              <Text style={styles?.statNumber}>{viewers?.length || 0}</Text>
              <Text style={styles?.statLabel}>Views</Text>
            </TouchableOpacity>
          </View>

          <View style={styles?.actionButtons}>
            <TouchableOpacity
              style={styles?.editButton}
              onPress={() => router.push("/edit-profile")}
            >
              <Edit2 size={16} color="#e2e8f0" />
              <Text style={styles?.editButtonText}>Edit</Text>
            </TouchableOpacity>

            {profile?.instagramHandle && (
              <TouchableOpacity
                style={[
                  styles?.editButton,
                  { backgroundColor: "#e1306c", borderColor: "#e1306c" },
                ]}
                onPress={() =>
                  Linking.openURL(
                    `https://instagram.com/${profile?.instagramHandle}`,
                  )
                }
              >
                <Instagram size={16} color="#fff" />
                <Text style={[styles?.editButtonText, { color: "#fff" }]}>
                  Instagram
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Friend Requests */}
        {friendRequests?.length > 0 && (
          <View style={styles?.requestsSection}>
            <Text style={styles?.sectionHeader}>Friend Requests</Text>
            {friendRequests.map((req) => (
              <View key={req?.uid} style={styles?.requestItem}>
                <View style={styles?.requestInfo}>
                  <View style={styles?.requestAvatar}>
                    {req?.photoURL ? (
                      <Image
                        source={{ uri: req?.photoURL }}
                        style={styles?.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ color: "#94a3b8" }}>
                        {req?.displayName?.[0]}
                      </Text>
                    )}
                  </View>
                  <Text style={styles?.requestName}>{req?.displayName}</Text>
                </View>
                <View style={styles?.requestActions}>
                  <TouchableOpacity
                    style={styles?.acceptBtn}
                    onPress={() => handleAcceptRequest(req?.uid)}
                  >
                    <Check size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles?.rejectBtn}
                    onPress={() => handleRejectRequest(req?.uid)}
                  >
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
            {(profile.interests || []).map((id) => {
              const tag = POPULAR_INTERESTS.find((i) => i?.id === id);
              return (
                <View key={id} style={styles?.tag}>
                  <Text style={styles?.tagText}>
                    {tag ? `${tag?.emoji} ${tag?.label}` : id}
                  </Text>
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
              <TouchableOpacity
                style={[
                  styles?.tabBtn,
                  activeTab === "regular" && styles?.tabBtnActive,
                ]}
                onPress={() => setActiveTab("regular")}
              >
                <Text
                  style={[
                    styles?.tabText,
                    activeTab === "regular" && styles?.tabTextActive,
                  ]}
                >
                  Regular
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles?.tabBtn,
                  activeTab === "meetup" && styles?.tabBtnActive,
                ]}
                onPress={() => setActiveTab("meetup")}
              >
                <Text
                  style={[
                    styles?.tabText,
                    activeTab === "meetup" && styles?.tabTextActive,
                  ]}
                >
                  Meetups
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {filteredPosts?.length === 0 ? (
            <View style={styles?.emptyPostsBox}>
              <Edit2 size={32} color="#475569" />
              <Text style={styles?.emptyPostsText}>
                No {activeTab} posts yet
              </Text>
            </View>
          ) : (
            filteredPosts.map((post) => (
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
          <TouchableOpacity
            style={styles?.modalBackdrop}
            onPress={() => setIsFriendsModalOpen(false)}
          />
          <View style={styles?.centeredModal}>
            <View style={styles?.modalHeader}>
              <Text style={styles?.modalTitle}>Friends</Text>
              <TouchableOpacity onPress={() => setIsFriendsModalOpen(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles?.modalTabs}>
              <TouchableOpacity
                style={[
                  styles?.modalTab,
                  activeModalTab === "friends" && styles?.modalTabActive,
                ]}
                onPress={() => setActiveModalTab("friends")}
              >
                <Text
                  style={[
                    styles?.modalTabText,
                    activeModalTab === "friends" && styles?.modalTabTextActive,
                  ]}
                >
                  Friends
                </Text>
                <Text style={styles?.modalTabCount}>{friendsList?.length}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles?.modalTab,
                  activeModalTab === "incoming" && styles?.modalTabActive,
                ]}
                onPress={() => setActiveModalTab("incoming")}
              >
                <Text
                  style={[
                    styles?.modalTabText,
                    activeModalTab === "incoming" && styles?.modalTabTextActive,
                  ]}
                >
                  Requests
                </Text>
                {incomingRequestsList?.length > 0 && (
                  <View style={styles?.modalTabBadge}>
                    <Text style={styles?.modalTabBadgeText}>
                      {incomingRequestsList?.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles?.modalTab,
                  activeModalTab === "sent" && styles?.modalTabActive,
                ]}
                onPress={() => setActiveModalTab("sent")}
              >
                <Text
                  style={[
                    styles?.modalTabText,
                    activeModalTab === "sent" && styles?.modalTabTextActive,
                  ]}
                >
                  Sent
                </Text>
                <Text style={styles?.modalTabCount}>
                  {sentRequestsList?.length}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles?.modalBody}>
              {friendsLoading ? (
                <ActivityIndicator color="#3b82f6" style={{ marginTop: 24 }} />
              ) : (
                <>
                  {/* FRIENDS TAB */}
                  {activeModalTab === "friends" && (
                    <>
                      {friendsList?.length === 0 ? (
                        <View style={styles?.modalEmpty}>
                          <Users size={36} color="#475569" />
                          <Text style={styles?.modalEmptyText}>
                            No friends yet
                          </Text>
                        </View>
                      ) : (
                        friendsList.map((f) => (
                          <TouchableOpacity
                            key={f?.uid}
                            style={styles?.modalListItem}
                            onPress={() => {
                              setIsFriendsModalOpen(false);
                             router.push(`/profile/${f?.uid}`);
                            }}
                          >
                            <View style={styles?.modalListAvatar}>
                              {f?.photoURL ? (
                                <Image
                                  source={{ uri: f?.photoURL }}
                                  style={styles?.modalAvatarImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <Text style={styles?.modalAvatarText}>
                                  {f?.displayName?.[0]}
                                </Text>
                              )}
                            </View>
                            <Text
                              style={{ color: "#fff", fontSize: 16, flex: 1 }}
                            >
                              {f?.displayName}
                            </Text>
                            {/* Message icon — opens DM */}
                            <TouchableOpacity
                              style={styles?.msgBtn}
                              onPress={() => {
                                setIsFriendsModalOpen(false);
                               router.push(`/chat/${f?.uid}`);
                              }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <MessageCircle size={20} color="#3b82f6" />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        ))
                      )}
                    </>
                  )}

                  {/* INCOMING REQUESTS TAB */}
                  {activeModalTab === "incoming" && (
                    <>
                      {incomingRequestsList?.length === 0 ? (
                        <View style={styles?.modalEmpty}>
                          <UserPlus size={36} color="#475569" />
                          <Text style={styles?.modalEmptyText}>
                            No incoming requests
                          </Text>
                        </View>
                      ) : (
                        incomingRequestsList.map((req) => (
                          <View key={req?.uid} style={styles?.modalRequestItem}>
                            <View style={styles?.modalListAvatar}>
                              {req?.photoURL ? (
                                <Image
                                  source={{ uri: req?.photoURL }}
                                  style={styles?.modalAvatarImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <Text style={styles?.modalAvatarText}>
                                  {req?.displayName?.[0]}
                                </Text>
                              )}
                            </View>
                            <Text
                              style={{ color: "#fff", fontSize: 15, flex: 1 }}
                            >
                              {req?.displayName}
                            </Text>
                            <TouchableOpacity
                              style={styles?.acceptSmallBtn}
                              onPress={() => handleAcceptFromModal(req?.uid)}
                            >
                              <Check size={14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles?.rejectSmallBtn}
                              onPress={() => handleRejectFromModal(req?.uid)}
                            >
                              <X size={14} color="#94a3b8" />
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </>
                  )}

                  {/* SENT REQUESTS TAB */}
                  {activeModalTab === "sent" && (
                    <>
                      {sentRequestsList?.length === 0 ? (
                        <View style={styles?.modalEmpty}>
                          <Clock size={36} color="#475569" />
                          <Text style={styles?.modalEmptyText}>
                            No pending sent requests
                          </Text>
                        </View>
                      ) : (
                        sentRequestsList.map((req) => (
                          <View key={req?.uid} style={styles?.modalListItem}>
                            <View style={styles?.modalListAvatar}>
                              {req?.photoURL ? (
                                <Image
                                  source={{ uri: req?.photoURL }}
                                  style={styles?.modalAvatarImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <Text style={styles?.modalAvatarText}>
                                  {req?.displayName?.[0]}
                                </Text>
                              )}
                            </View>
                            <Text
                              style={{ color: "#fff", fontSize: 15, flex: 1 }}
                            >
                              {req?.displayName}
                            </Text>
                            {/* Withdraw button */}
                            <TouchableOpacity
                              style={styles?.withdrawBtn}
                              onPress={() => handleWithdrawRequest(req?.uid)}
                            >
                              <X size={12} color="#ef4444" />
                              <Text style={styles?.withdrawBtnText}>
                                Withdraw
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {isViewersModalOpen && (
        <View style={styles?.modalOverlay}>
          <TouchableOpacity
            style={styles?.modalBackdrop}
            onPress={() => setIsViewersModalOpen(false)}
          />
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
                      <Image
                        source={{ uri: v?.photoURL }}
                        style={styles?.modalAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles?.modalAvatarText}>
                        {v?.displayName?.[0]}
                      </Text>
                    )}
                  </View>
                  <View>
                    <Text style={{ color: "#fff", fontSize: 16 }}>
                      {v?.displayName}
                    </Text>
                    <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                      Viewed: {new Date(v.viewedAt).toLocaleDateString()}
                    </Text>
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
  container: { flex: 1, backgroundColor: "#020617" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
  scrollContent: { paddingBottom: 100 },
  coverPhoto: { height: 160, backgroundColor: "#1e293b", position: "relative" },
  logoutButton: {
    position: "absolute",
    top: 50,
    right: 16,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    padding: 10,
    borderRadius: 20,
  },
  profileCard: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    padding: 24,
    paddingTop: 60,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  avatarContainer: {
    position: "absolute",
    top: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#0f172a",
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 50 },
  avatarText: { color: "#3b82f6", fontSize: 32, fontWeight: "bold" },
  onlineBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#22c55e",
    borderWidth: 4,
    borderColor: "#0f172a",
  },
  displayName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  infoPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoPillText: { color: "#e2e8f0", fontSize: 14, fontWeight: "500" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    width: "100%",
    marginVertical: 16,
  },
  statButton: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statNumber: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  statLabel: { color: "#94a3b8", fontSize: 14 },
  actionButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1e293b",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  editButtonText: { color: "#e2e8f0", fontWeight: "bold" },
  section: { padding: 24, borderTopWidth: 1, borderTopColor: "#1e293b" },
  sectionHeader: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  bioText: { color: "#e2e8f0", fontSize: 16, lineHeight: 24 },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  tagText: { color: "#e2e8f0", fontSize: 14, fontWeight: "500" },
  postsSection: { padding: 16, backgroundColor: "#020617" },
  postsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  postsTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tabBtnActive: { backgroundColor: "#3b82f6" },
  tabText: { color: "#94a3b8", fontSize: 14, fontWeight: "500" },
  tabTextActive: { color: "#fff" },
  emptyPostsBox: {
    backgroundColor: "#0f172a",
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  emptyPostsText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 12,
  },
  requestsSection: { padding: 16, backgroundColor: "rgba(249, 115, 22, 0.1)" },
  requestItem: {
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  requestInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1e293b",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  requestName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  requestActions: { flexDirection: "row", gap: 8 },
  acceptBtn: { backgroundColor: "#3b82f6", padding: 8, borderRadius: 12 },
  rejectBtn: { backgroundColor: "#1e293b", padding: 8, borderRadius: 12 },
  modalOverlay: {
    position: "absolute",
    inset: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalBackdrop: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  centeredModal: {
    width: "85%",
    backgroundColor: "#0f172a",
    borderRadius: 24,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  modalBody: { padding: 16, paddingBottom: 0 },
  modalListItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    marginBottom: 8,
  },
  modalListAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#334155",
    marginRight: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  modalAvatarImage: { width: "100%", height: "100%" },
  modalAvatarText: { color: "#94a3b8", fontSize: 16, fontWeight: "bold" },
  modalTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  modalTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  modalTabActive: { borderBottomWidth: 2, borderBottomColor: "#3b82f6" },
  modalTabText: { color: "#64748b", fontWeight: "600", fontSize: 13 },
  modalTabTextActive: { color: "#3b82f6" },
  modalTabCount: { color: "#64748b", fontSize: 11 },
  modalTabBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  modalTabBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  modalEmpty: { alignItems: "center", paddingVertical: 32, gap: 12 },
  modalEmptyText: { color: "#64748b", fontSize: 14 },
  modalRequestItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  acceptSmallBtn: { backgroundColor: "#22c55e", padding: 6, borderRadius: 8 },
  rejectSmallBtn: { backgroundColor: "#334155", padding: 6, borderRadius: 8 },
  pendingBadge: {
    backgroundColor: "rgba(251,191,36,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  pendingBadgeText: { color: "#fbbf24", fontSize: 11, fontWeight: "bold" },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239,68,68,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  withdrawBtnText: { color: "#ef4444", fontSize: 11, fontWeight: "700" },
  msgBtn: {
    padding: 6,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
  },
  requestBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    marginLeft: 4,
  },
  requestBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
});
