import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Animated, Image, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import { Bell, Settings, Sparkles } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { api } from "../../services/api";
import { useUserLocation } from "../../components/LocationGuard";
import { Post, UserProfile } from "../../types";
import PostItem from "../../components/PostItem";
import { calculateDistance } from "../../util/location";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { colors, typography, spacing, radii, animation } from "../../constants/theme";

const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function Feed() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location: myLocation } = useUserLocation();
  const { unreadCount: notifUnreadCount } = useNotifications();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Animated header on scroll
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerShadow = scrollY.interpolate({ inputRange: [0, 40], outputRange: [0, 1], extrapolate: 'clamp' });

  const fetchPosts = async () => {
    if (!user) return;
    try {
      const [allPosts, profile] = await Promise.all([api.posts.getAll(user.uid), api.profile.get(user.uid)]);
      setUserProfile(profile);
      let filteredPosts = allPosts;
      if (myLocation && profile?.discoveryRadius) {
        const maxDistMeters = profile.discoveryRadius * 1000;
        filteredPosts = allPosts.filter((p: any) => {
          if (p.uid === user.uid) return true;
          if (p.location) return getDistanceMeters(myLocation.lat, myLocation.lng, p.location.lat, p.location.lng) <= maxDistMeters;
          return true;
        });
      }
      setPosts(filteredPosts);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, [user, myLocation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [user, myLocation]);

  const handleLike = async (post: Post) => {
    if (!user || !post._id) return;
    const isLiked = post.likedBy?.includes(user.uid);
    const newLikes = isLiked ? post.likes - 1 : post.likes + 1;
    const newLikedBy = isLiked ? post.likedBy?.filter(id => id !== user.uid) || [] : [...(post.likedBy || []), user.uid];
    setPosts(cur => cur.map(p => p._id === post._id ? { ...p, likes: newLikes, likedBy: newLikedBy } : p));
    try {
      const updated = await api.posts.toggleLike(post._id, user.uid);
      setPosts(cur => cur.map(p => p._id === post._id ? { ...p, likes: updated.likes, likedBy: updated.likedBy } : p));
    } catch { fetchPosts(); }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!user) return;
    try {
      const newComment = await api.posts.addComment(postId, user.uid, text);
      setPosts(cur => cur.map(p => p._id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p));
    } catch (e) { console.error(e); throw e; }
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert("Delete Post", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          if (!user) return;
          try { await api.posts.deletePost(postId, user.uid); setPosts(cur => cur.filter(p => p._id !== postId)); }
          catch { Alert.alert("Error", "Could not delete the post."); }
        }
      },
    ]);
  };

  const renderHeader = () => (
    <Animated.View style={[styles.header, { paddingTop: insets.top + spacing.s2 }, {
      shadowOpacity: headerShadow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }) as any,
    }]}>
      <View style={styles.logoRow}>
        <Image source={require('../../assets/images/MainLogoONLY.png')} style={styles.logoImg} />
        <Text style={styles.logoText}>Orbyt</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')}>
          <Settings size={22} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/notifications')}>
          <Bell size={22} color={colors.textTertiary} />
          {notifUnreadCount > 0 && (
            <View style={styles.iconBadge}>
              <Text style={styles.iconBadgeText}>{notifUnreadCount > 9 ? '9+' : notifUnreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push(('/profile/' + user?.uid) as any)} style={styles.avatarBtn}>
          <Avatar uri={userProfile?.photoURL} name={userProfile?.displayName} size="sm" online />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={[styles.center, { marginTop: spacing.s9 }]}>
          <EmptyState
            icon={<Sparkles size={36} color={colors.textTertiary} />}
            title="Your feed is empty"
            subtitle="No posts found nearby. Try increasing your discovery radius in Settings!"
            actionLabel="Open Settings"
            onAction={() => router.push('/settings')}
          />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item._id || Math.random().toString()}
          renderItem={({ item }) => (
            <PostItem
              post={item}
              currentUserId={user?.uid}
              onLike={handleLike}
              onAddComment={handleAddComment}
              onDelete={item.uid === user?.uid ? () => handleDeletePost(item._id!) : undefined}
              onEdit={item.uid === user?.uid ? () => router.push(`/edit-post/${item._id}`) : undefined}
            />
          )}
          contentContainerStyle={styles.listContent}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          windowSize={5}
          maxToRenderPerBatch={4}
          initialNumToRender={4}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s3,
    backgroundColor: colors.bg1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s2 },
  logoImg: { width: 30, height: 30, borderRadius: 8 },
  logoText: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.s1 },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  iconBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.danger, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.bg1, paddingHorizontal: 2 },
  iconBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  avatarBtn: { marginLeft: spacing.s1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.s6 },
  loadingText: { color: colors.textTertiary, fontSize: typography.size.base },
  listContent: { padding: spacing.s4, paddingBottom: 120 },
});
